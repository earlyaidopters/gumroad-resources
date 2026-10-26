"""Offline safety and HTTP behavior checks. No real cloud keys or targets."""
import datetime,importlib.util,json,sys,threading,unittest,urllib.request,urllib.error
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import safe_check,local_lab,idle_proxy,check_endpoint

class OfflineTests(unittest.TestCase):
    def setUp(self):
        self.server=ThreadingHTTPServer(('127.0.0.1',0),local_lab.Lab)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.url=f'http://127.0.0.1:{self.server.server_port}'
        now=datetime.datetime.now(datetime.timezone.utc)
        self.scope={'authorization_status':'AUTHORIZED_LOCAL_LAB','allowed_targets':[self.url],'data':'synthetic only','limits':{'max_requests':1},'testing_window':{'start':now.isoformat(),'end':(now+datetime.timedelta(minutes=2)).isoformat()}}
    def tearDown(self):self.server.shutdown();self.server.server_close();local_lab.Lab.hardened=False
    def test_lab_finding_then_fix(self):
        self.assertTrue(safe_check.run(self.scope,self.url)['missing_nosniff'])
        local_lab.Lab.hardened=True
        self.assertFalse(safe_check.run(self.scope,self.url)['missing_nosniff'])
    def test_default_authorization_blocked(self):
        s=json.loads((ROOT/'examples/authorized-test-scope.example.json').read_text())
        with self.assertRaises(ValueError):safe_check.validate(s,self.url)
    def test_remote_target_blocked(self):
        for u in ['https://example.com','http://localhost:8765','http://127.0.0.1.evil.test','http://127.0.0.1@evil.test','http://127.0.0.1/?secret=x']:
            with self.assertRaises(ValueError):safe_check.validate(self.scope,u)
    def test_expired_scope_blocked(self):
        self.scope['testing_window']['end']='2000-01-01T00:00:00+00:00'
        with self.assertRaises(ValueError):safe_check.validate(self.scope,self.url)
    def test_mismatch_and_request_limit_blocked(self):
        self.scope['limits']['max_requests']=2
        with self.assertRaises(ValueError):safe_check.validate(self.scope,self.url)
    def test_endpoint_transport_rules(self):
        self.assertEqual(check_endpoint.validate_base('http://127.0.0.1:1234/v1/'),'http://127.0.0.1:1234/v1')
        for u in ['http://example.com/v1','https://key@example.com/v1','https://example.com/v1?key=test']:
            with self.assertRaises(ValueError):check_endpoint.validate_base(u)

class IdleTests(unittest.TestCase):
    def test_active_stream_prevents_stop(self):
        t=[0];calls=[];s=idle_proxy.IdleState(30,lambda:calls.append(True) or True,lambda:t[0]);s.begin();t[0]=100
        self.assertIsNone(s.tick());self.assertFalse(calls);s.end();t[0]=129;self.assertIsNone(s.tick());t[0]=131
        self.assertEqual(s.tick(),'stopped_verified');self.assertEqual(len(calls),1);self.assertFalse(s.begin())
    def test_dry_run_and_new_activity(self):
        t=[0];s=idle_proxy.IdleState(30,clock=lambda:t[0]);t[0]=31;self.assertEqual(s.tick(),'dry_run_would_stop');self.assertIsNone(s.tick());self.assertTrue(s.begin());s.end();t[0]=62;self.assertEqual(s.tick(),'dry_run_would_stop')
    def test_stop_failure_not_reported_as_success(self):
        t=[0];s=idle_proxy.IdleState(30,lambda:False,lambda:t[0]);t[0]=31;self.assertEqual(s.tick(),'stop_failed_or_unverified');self.assertFalse(s.stopped);self.assertTrue(s.begin());s.end()

class ProxyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Upstream(BaseHTTPRequestHandler):
            def log_message(self,*a):pass
            def do_GET(self):
                self.send_response(200);self.end_headers();self.wfile.write(b'{"data": [{"id":"synthetic"}]}')
        cls.up=ThreadingHTTPServer(('127.0.0.1',0),Upstream);threading.Thread(target=cls.up.serve_forever,daemon=True).start()
        idle_proxy.Proxy.upstream=f'http://127.0.0.1:{cls.up.server_port}/v1';idle_proxy.Proxy.local_key='synthetic-local-token';idle_proxy.Proxy.upstream_key=None;idle_proxy.Proxy.state=idle_proxy.IdleState(900)
        cls.proxy=ThreadingHTTPServer(('127.0.0.1',0),idle_proxy.Proxy);threading.Thread(target=cls.proxy.serve_forever,daemon=True).start();cls.base=f'http://127.0.0.1:{cls.proxy.server_port}'
    @classmethod
    def tearDownClass(cls):cls.proxy.shutdown();cls.proxy.server_close();cls.up.shutdown();cls.up.server_close()
    def test_auth_required_and_allowed_route(self):
        with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(self.base+'/v1/models')
        self.assertEqual(e.exception.code,401)
        r=urllib.request.Request(self.base+'/v1/models',headers={'Authorization':'Bearer synthetic-local-token'})
        with urllib.request.urlopen(r) as res:self.assertEqual(json.load(res)['data'][0]['id'],'synthetic')
    def test_browser_origin_and_arbitrary_path_blocked(self):
        for path,extra,code in [('/v1/models',{'Origin':'https://example.com'},403),('/private',{},404)]:
            r=urllib.request.Request(self.base+path,headers={'Authorization':'Bearer synthetic-local-token',**extra})
            with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(r)
            self.assertEqual(e.exception.code,code)
if __name__=='__main__':unittest.main()
