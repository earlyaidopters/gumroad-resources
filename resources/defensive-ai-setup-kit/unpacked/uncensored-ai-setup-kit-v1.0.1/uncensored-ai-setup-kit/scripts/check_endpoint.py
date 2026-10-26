#!/usr/bin/env python3
"""Synthetic OpenAI Chat Completions checks; no shell execution or app scans."""
import argparse,base64,json,os,sys,time,urllib.request,urllib.error,urllib.parse
from pathlib import Path

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def validate_base(url):
    p=urllib.parse.urlsplit(url)
    if p.username or p.password or p.query or p.fragment or not p.hostname:raise ValueError('Use a plain endpoint URL without embedded credentials, query or fragment.')
    if p.scheme!='https' and not (p.scheme=='http' and p.hostname in ('127.0.0.1','localhost','::1')):raise ValueError('Use HTTPS, or HTTP on loopback only.')
    return url.rstrip('/')

def read_key(env_name):
    path=os.environ.get(env_name)
    if not path:return None
    p=Path(path).expanduser()
    if os.name!='nt' and p.stat().st_mode & 0o077:raise ValueError('Key file must not be readable by group/others. Set chmod 600.')
    s=p.read_text().strip()
    if not s or '\n' in s or '\r' in s:raise ValueError('Expected one key in the private file.')
    return s

def run(base,model,key=None,tools=False,image=None,timeout=180):
    base=validate_base(base);opener=urllib.request.build_opener(NoRedirect())
    headers={'Content-Type':'application/json'}
    if key:headers['Authorization']='Bearer '+key
    def call(path,payload=None):
        req=urllib.request.Request(base+path,data=json.dumps(payload).encode() if payload is not None else None,headers=headers)
        with opener.open(req,timeout=timeout) as r:return json.load(r)
    report={'model':model,'checks':{},'kind':'synthetic smoke test, not a benchmark'}
    listing=call('/models');report['checks']['model_list']=any(m.get('id')==model for m in listing.get('data',[]))
    messages=[{'role':'user','content':'Remember this code for our next message: Cedar-47. Reply only OK.'}]
    start=time.monotonic();first=call('/chat/completions',{'model':model,'messages':messages,'max_tokens':256,'temperature':0})
    reply=first['choices'][0]['message'];messages.append({'role':'assistant','content':reply.get('content') or ''});messages.append({'role':'user','content':'What was the code? Reply only with the code.'})
    second=call('/chat/completions',{'model':model,'messages':messages,'max_tokens':256,'temperature':0})
    report['checks']['two_turn_memory']='Cedar-47' in (second['choices'][0]['message'].get('content') or '')
    report['two_turn_elapsed_seconds']=round(time.monotonic()-start,2)
    if tools:
        tool={'type':'function','function':{'name':'add_numbers','description':'Add two test numbers.','parameters':{'type':'object','properties':{'a':{'type':'integer'},'b':{'type':'integer'}},'required':['a','b'],'additionalProperties':False}}}
        msg=[{'role':'user','content':'Use add_numbers with a=19 and b=23 to compute their sum.'}]
        r=call('/chat/completions',{'model':model,'messages':msg,'tools':[tool],'tool_choice':'required','max_tokens':512,'temperature':0})
        answer=r['choices'][0]['message'];calls=answer.get('tool_calls',[])
        passed=False
        if len(calls)==1 and calls[0]['function'].get('name')=='add_numbers':
            args=json.loads(calls[0]['function']['arguments'])
            if args=={'a':19,'b':23}:
                msg.extend([answer,{'role':'tool','tool_call_id':calls[0]['id'],'content':'{"sum":42}'}])
                r=call('/chat/completions',{'model':model,'messages':msg,'tools':[tool],'max_tokens':512,'temperature':0})
                passed='42' in (r['choices'][0]['message'].get('content') or '')
        report['checks']['harmless_function_roundtrip']=passed
    if image:
        b=Path(image).read_bytes()
        if len(b)>2_000_000:raise ValueError('Synthetic image must be below 2 MB.')
        r=call('/chat/completions',{'model':model,'messages':[{'role':'user','content':[{'type':'text','text':'Read the large four digit code in the image. Reply only those digits.'},{'type':'image_url','image_url':{'url':'data:image/png;base64,'+base64.b64encode(b).decode()}}]}],'max_tokens':1024,'temperature':0})
        report['checks']['synthetic_image']='7319' in (r['choices'][0]['message'].get('content') or '')
    report['pass']=all(report['checks'].values())
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',required=True);p.add_argument('--model',required=True);p.add_argument('--tools',action='store_true');p.add_argument('--image');p.add_argument('--output');a=p.parse_args()
    try:r=run(a.base_url,a.model,read_key('MODEL_API_KEY_FILE'),a.tools,a.image)
    except Exception as e:
        # Do not echo HTTP bodies, URLs with auth, secret files, or model messages.
        r={'pass':False,'error':type(e).__name__,'hint':'Check endpoint, credentials, model ID and supported capabilities. No secret or response body was logged.'}
    s=json.dumps(r,indent=2);print(s)
    if a.output:Path(a.output).write_text(s+'\n')
    return 0 if r['pass'] else 1
if __name__=='__main__':sys.exit(main())
