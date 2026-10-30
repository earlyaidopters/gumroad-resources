"""Portable structural checks. Does not scan or contact any application."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parents[1]
checks=[]
def ok(name,condition):
    if not condition:raise AssertionError(name)
    checks.append(name)
required=['README.md','START-HERE.md','DISCLAIMER.md','DEFENSIVE-USE.md','LICENSE','SECURITY.md','THIRD-PARTY-NOTICES.md','ALL-PROMPTS.md','CHECKLIST.md','report/risk-report.html','downloads/APP-SECURITY-FIELD-GUIDE.pdf','downloads/TEST-WORKSHEETS.pdf']
for name in required:ok('present: '+name,(R/name).is_file())
for p in list((R/'guides').glob('*.md'))+[R/'README.md',R/'START-HERE.md',R/'ALL-PROMPTS.md',R/'CHECKLIST.md']:
    ok('notice: '+str(p.relative_to(R)),'authorized defensive' in p.read_text().lower())
for p in R.rglob('*.md'):
    if '.git' in p.parts:continue
    content=p.read_text()
    links=re.findall(r'\]\(([^)]+)\)',content)+re.findall(r'(?:href|src)="([^"]+)"',content)
    for href in links:
        if '://' in href or href.startswith('#'):continue
        target=(p.parent/href.split('#')[0]).resolve()
        ok('local link: '+str(p.relative_to(R))+' -> '+href,target.exists() and target.is_relative_to(R))
items=[i for g in json.loads((R/'data/checklist.json').read_text()) for i in g['items']]
ok('50 unique checklist items',len(items)==50==len({i['id'] for i in items})==len({i['text'] for i in items}))
ok('six prompts',len(list((R/'prompts').glob('*.txt')))==6)
for line in (R/'SHA256SUMS').read_text().splitlines():
    expected,name=line.split('  ',1)
    ok('checksum: '+name,hashlib.sha256((R/name).read_bytes()).hexdigest()==expected)
for p in R.rglob('*'):
    if not p.is_file() or '.git' in p.parts:continue
    if p.suffix not in ('.md','.txt','.html','.json','.csv','.py','.cjs','.yml'):continue
    text=p.read_text();bad=['/Users/'+'markkashef','support@'+'collabdesk.example','maya@'+'collabdesk.example','theo@'+'collabdesk.example','rmixnnpquikffqbtbgee'+'.supabase.co']
    ok('no creator configuration: '+str(p.relative_to(R)),not any(x in text for x in bad))
print(json.dumps({'checks_passed':len(checks),'live_app_test':False,'result':'pass'}))
