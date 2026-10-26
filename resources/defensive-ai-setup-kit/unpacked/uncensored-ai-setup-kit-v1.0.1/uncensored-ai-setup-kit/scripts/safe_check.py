#!/usr/bin/env python3
"""One GET to the synthetic loopback lab; refuses remote hosts and redirects."""
import argparse,datetime,json,sys,urllib.parse,urllib.request
from pathlib import Path
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*a,**kw):return None

def validate(scope,target,now=None):
    p=urllib.parse.urlsplit(target)
    # Numeric loopback avoids DNS rebinding; only the included lab's root path.
    if p.scheme!='http' or p.hostname!='127.0.0.1' or p.username or p.password or p.query or p.fragment or p.path not in ('','/'):raise ValueError('Only the synthetic numeric-loopback HTTP root is accepted.')
    if scope.get('authorization_status')!='AUTHORIZED_LOCAL_LAB':raise ValueError('Local lab authorization is required.')
    if scope.get('allowed_targets')!=[target] or scope.get('data')!='synthetic only':raise ValueError('Target and data scope do not match.')
    now=now or datetime.datetime.now(datetime.timezone.utc)
    window=scope.get('testing_window',{})
    start=datetime.datetime.fromisoformat(window['start']);end=datetime.datetime.fromisoformat(window['end'])
    if start.tzinfo is None or end.tzinfo is None or not start<=now<end:raise ValueError('Scope needs a current timezone-aware testing window.')
    if scope.get('limits',{}).get('max_requests')!=1:raise ValueError('This exercise permits exactly one request.')
    return target

def run(scope,target):
    validate(scope,target)
    with urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect()).open(target,timeout=5) as r:
        body=r.read(4096)
        if b'Synthetic local lab' not in body:raise ValueError('The endpoint is not the included synthetic lab.')
        missing=r.headers.get('X-Content-Type-Options','').lower()!='nosniff'
        return {'target':target,'requests':1,'synthetic_lab':True,'missing_nosniff':missing,'interpretation':'Hardening observation only; not proof of compromise.'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--target',default='http://127.0.0.1:8765');p.add_argument('--scope');p.add_argument('--authorize-local-lab',action='store_true');a=p.parse_args()
    try:
        if a.authorize_local_lab:
            now=datetime.datetime.now(datetime.timezone.utc);scope={'authorization_status':'AUTHORIZED_LOCAL_LAB','allowed_targets':[a.target],'data':'synthetic only','limits':{'max_requests':1},'testing_window':{'start':now.isoformat(),'end':(now+datetime.timedelta(minutes=5)).isoformat()}}
        elif a.scope:scope=json.loads(Path(a.scope).read_text())
        else:raise ValueError('Use a scope file or explicitly authorize your own local synthetic lab.')
        print(json.dumps(run(scope,a.target),indent=2));return 0
    except Exception as e:print(json.dumps({'blocked':True,'reason':str(e)}));return 2
if __name__=='__main__':sys.exit(main())
