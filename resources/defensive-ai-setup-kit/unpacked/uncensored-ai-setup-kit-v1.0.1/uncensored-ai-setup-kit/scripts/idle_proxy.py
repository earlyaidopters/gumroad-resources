#!/usr/bin/env python3
"""Loopback-only OpenAI proxy with an opt-in RunPod idle stop. Dry-run by default.
All inference traffic must use this proxy. It is not a provider-side billing cap.
"""
import argparse,hmac,http.client,json,os,re,sys,threading,time,urllib.parse,urllib.request
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from check_endpoint import validate_base,read_key,NoRedirect

class IdleState:
    def __init__(self,seconds,stopper=None,clock=time.monotonic):
        self.seconds=seconds;self.stopper=stopper;self.clock=clock;self.last=clock();self.active=0;self.stopping=False;self.stopped=False;self.reported=False;self.lock=threading.Lock()
    def begin(self):
        with self.lock:
            if self.stopping or self.stopped:return False
            self.active+=1;self.last=self.clock();self.reported=False;return True
    def end(self):
        with self.lock:self.active-=1;self.last=self.clock()
    def tick(self):
        with self.lock:
            if self.active or self.stopping or self.stopped or self.reported or self.clock()-self.last<self.seconds:return None
            self.stopping=True
        try:
            if self.stopper:
                ok=self.stopper()
                with self.lock:
                    self.stopped=ok;self.reported=ok
                    if not ok:self.last=self.clock()
                return 'stopped_verified' if ok else 'stop_failed_or_unverified'
            with self.lock:self.reported=True
            return 'dry_run_would_stop'
        except Exception:
            with self.lock:self.last=self.clock()
            return 'stop_failed_or_unverified'
        finally:
            with self.lock:self.stopping=False

def stop_pod(pod_id,expected_name,key):
    # Exact id/name readback prevents a typo from stopping an unrelated Pod.
    if not re.fullmatch(r'[A-Za-z0-9_-]+',pod_id):raise ValueError('Invalid Pod ID')
    opener=urllib.request.build_opener(NoRedirect())
    root='https://rest.runpod.io/v1/pods/'+pod_id
    def call(method,url):
        r=urllib.request.Request(url,method=method,headers={'Authorization':'Bearer '+key})
        with opener.open(r,timeout=30) as res:
            data=res.read();return json.loads(data) if data else {}
    before=call('GET',root)
    if before.get('id')!=pod_id or before.get('name')!=expected_name:raise ValueError('Pod identity mismatch')
    if before.get('desiredStatus')=='EXITED':return True
    call('POST',root+'/stop')
    for _ in range(10):
        after=call('GET',root)
        if after.get('id')==pod_id and after.get('desiredStatus')=='EXITED':return True
        time.sleep(2)
    return False

class Proxy(BaseHTTPRequestHandler):
    state=None;upstream=None;upstream_key=None;local_key=None
    def log_message(self,*a):pass
    def do_GET(self):self.forward()
    def do_POST(self):self.forward()
    def forward(self):
        if self.headers.get('Origin'):self.send_error(403,'Browser-origin requests are disabled');return
        wanted='Bearer '+self.local_key
        if not hmac.compare_digest(self.headers.get('Authorization',''),wanted):self.send_error(401);return
        route=urllib.parse.urlsplit(self.path)
        if route.query or route.fragment or self.path not in ('/v1/models','/v1/chat/completions','/v1/responses'):
            self.send_error(404);return
        if (self.command=='GET')!=(self.path=='/v1/models'):self.send_error(405);return
        try:n=int(self.headers.get('Content-Length','0'))
        except ValueError:self.send_error(400);return
        if self.headers.get('Transfer-Encoding') or n<0 or n>4_000_000:self.send_error(413);return
        if self.command=='POST' and not self.headers.get('Content-Type','').lower().startswith('application/json'):
            self.send_error(415);return
        if not self.state.begin():self.send_error(503,'Pod stop is pending or complete');return
        conn=None
        try:
            body=self.rfile.read(n) if n else None
            p=urllib.parse.urlsplit(self.upstream)
            cls=http.client.HTTPSConnection if p.scheme=='https' else http.client.HTTPConnection
            conn=cls(p.hostname,p.port,timeout=300)
            headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'}
            if self.upstream_key:headers['Authorization']='Bearer '+self.upstream_key
            path=p.path.rstrip('/')+self.path.removeprefix('/v1')
            conn.request(self.command,path,body,headers);r=conn.getresponse()
            # Never follow redirects with an inference key.
            if 300<=r.status<400:self.send_error(502,'Upstream redirect refused');return
            self.send_response(r.status)
            self.send_header('Content-Type',r.getheader('Content-Type','application/json'))
            self.send_header('Cache-Control','no-store');self.send_header('Connection','close');self.end_headers()
            while True:
                chunk=r.read1(16384)
                if not chunk:break
                self.wfile.write(chunk);self.wfile.flush()
        except Exception:
            # No payload, key or upstream error body is printed to local logs.
            self.close_connection=True
        finally:
            if conn:conn.close()
            self.state.end()

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--upstream',required=True);p.add_argument('--port',type=int,default=8766);p.add_argument('--idle-seconds',type=int,default=900);p.add_argument('--enable-stop',action='store_true');p.add_argument('--pod-id');p.add_argument('--pod-name');a=p.parse_args()
    if a.idle_seconds<30:p.error('Use at least 30 seconds for a real idle guard.')
    try:
        upstream=validate_base(a.upstream)
        local_key=read_key('LOCAL_PROXY_TOKEN_FILE')
        if not local_key:raise ValueError('Set LOCAL_PROXY_TOKEN_FILE to a private token file first.')
        key=read_key('MODEL_API_KEY_FILE')
        stopper=None
        if a.enable_stop:
            if not a.pod_id or not a.pod_name:raise ValueError('Exact --pod-id and --pod-name required.')
            control=read_key('RUNPOD_API_KEY_FILE')
            if not control:raise ValueError('Private RunPod control key file required.')
            stopper=lambda:stop_pod(a.pod_id,a.pod_name,control)
        state=IdleState(a.idle_seconds,stopper)
        Proxy.state=state;Proxy.upstream=upstream;Proxy.upstream_key=key;Proxy.local_key=local_key
        server=ThreadingHTTPServer(('127.0.0.1',a.port),Proxy);server.daemon_threads=True
    except Exception as e:print('Configuration rejected: '+str(e),file=sys.stderr);return 2
    done=threading.Event()
    def watch():
        while not done.wait(2):
            event=state.tick()
            if event:print(json.dumps({'idle_guard':event}),flush=True)
    threading.Thread(target=watch,daemon=True).start()
    print(json.dumps({'listen':f'http://127.0.0.1:{a.port}/v1','mode':'stop enabled' if a.enable_stop else 'DRY RUN','idle_seconds':a.idle_seconds}),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:done.set();server.server_close()
    return 0
if __name__=='__main__':sys.exit(main())
