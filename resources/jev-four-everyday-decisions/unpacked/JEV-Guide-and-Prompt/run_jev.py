"""Preview a synthetic Jev request; --live explicitly makes one paid API call."""
import argparse, json, math, os, urllib.request

def decision_result(example, response, threshold=.80):
    review = {'status': 'review', 'reason': 'invalid_response'}
    try:
        a = response['answers']['decision']
        options = example['request']['questions']['decision']['criteria']
        p, confidence = a['probabilities'], a['confidence']
        finite = lambda n: type(n) in (int, float) and math.isfinite(n) and 0 <= n <= 1
        if a['type'] != 'choice' or a['choice'] not in options or set(p) != set(options): return review
        if not finite(confidence) or not all(finite(n) for n in p.values()) or abs(sum(p.values())-1)>1e-5: return review
        if p[a['choice']] < max(p.values()): return review
        reason = 'human_review_required' if example.get('always_review') else 'unknown' if a['choice'] in ('unknown','review') else 'low_confidence' if confidence < threshold else None
        return {'status':'review' if reason else 'suggestion', 'reason':reason, 'choice':a['choice'], 'confidence':confidence, 'probabilities':p, 'model':response.get('model')}
    except (KeyError, TypeError, ValueError): return review

def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('example');ap.add_argument('--live',action='store_true');ap.add_argument('--threshold',type=float,default=.8);args=ap.parse_args()
    if not math.isfinite(args.threshold) or not 0<=args.threshold<=1: ap.error('threshold must be between zero and one')
    with open(args.example) as f: example=json.load(f)
    request=example['request']
    if not args.live:
        print(json.dumps({'mode':'preview_no_network','request':request,'expected_choice':example['expected_choice'],'threshold_note':'0.80 is an unvalidated demo setting'},indent=2));return
    key=os.environ.get('TYPESAFE_API_KEY')
    if not key: raise SystemExit('Set TYPESAFE_API_KEY privately before using --live. Never put the key in these files.')
    req=urllib.request.Request('https://api.typesafe.ai/v1/systemone',json.dumps(request).encode(),{'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=30) as r: response=json.load(r)
        print(json.dumps(decision_result(example,response,args.threshold),indent=2))
    except Exception:
        print(json.dumps({'status':'review','reason':'service_error','note':'No automatic action taken. Check service status and credentials privately before an explicit retry.'}))
if __name__=='__main__': main()
