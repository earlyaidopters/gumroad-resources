"""Rebuild finished assets. Run: python3 -m pip install -r requirements-build.txt"""
from pathlib import Path
import json, html, math, hashlib
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white
from PIL import Image, ImageDraw, ImageFont

R=Path(__file__).resolve().parents[1]
OUT=R/'downloads';OUT.mkdir(exist_ok=True)
FONT=R/'assets/fonts/Poppins-ExtraBold.ttf'
pdfmetrics.registerFont(TTFont('Poppins',str(FONT)))
NAVY='#10213b';TEAL='#087d70';MINT='#70e5cd';INK='#253850';PALE='#eef5f7';MUTED='#53667d';LINE='#cbd8e2'
styles={
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10.5,leading=15,textColor=HexColor(INK)),
 'small':ParagraphStyle('small',fontName='Helvetica',fontSize=8.8,leading=12,textColor=HexColor(MUTED)),
 'title':ParagraphStyle('title',fontName='Poppins',fontSize=25,leading=29,textColor=HexColor(NAVY)),
 'white':ParagraphStyle('white',fontName='Poppins',fontSize=35,leading=42,textColor=white),
 'section':ParagraphStyle('section',fontName='Poppins',fontSize=11,leading=15,textColor=HexColor(TEAL)),
}
class Book:
 def __init__(self,path,title):
  self.c=canvas.Canvas(str(path),pagesize=(612,792));self.c.setTitle(title);self.c.setAuthor('Mark Kashef');self.page=0;self.min_y=792
 def start(self,label,title,subtitle=None):
  self.page+=1;c=self.c;c.setFillColor(HexColor('#f9fbfc'));c.rect(0,0,612,792,fill=1,stroke=0);c.setFillColor(HexColor(NAVY));c.rect(0,758,612,34,fill=1,stroke=0);c.setFillColor(HexColor(MINT));c.setFont('Helvetica-Bold',8);c.drawString(40,770,'MARK KASHEF / APP SECURITY FIELD KIT');c.setFillColor(HexColor(TEAL));c.setFont('Helvetica-Bold',8);c.drawString(40,729,label.upper());y=self.para(title,710,'title',8)
  if subtitle:y=self.para(subtitle,y,'small',17)
  return y
 def para(self,text,y,style='body',gap=11,x=40,w=532):
  p=Paragraph(html.escape(text).replace('\n','<br/>'),styles[style]);_,h=p.wrap(w,900);p.drawOn(self.c,x,y-h);self.min_y=min(self.min_y,y-h);assert y-h>=69,(self.page,text[:55],y-h);return y-h-gap
 def section(self,title,text,y):
  y=self.para(title,y,'section',5);return self.para(text,y,'body',14)
 def flow(self,labels,y):
  c=self.c;w=164;h=55
  for i,label in enumerate(labels):
   x=40+i*184;c.setFillColor(HexColor(NAVY));c.roundRect(x,y-h,w,h,7,fill=1,stroke=0);c.setFillColor(HexColor(MINT));c.setFont('Helvetica-Bold',8);c.drawString(x+12,y-15,str(i+1).zfill(2));p=Paragraph(html.escape(label),ParagraphStyle('fl',fontName='Helvetica-Bold',fontSize=10,leading=12,textColor=white));_,ph=p.wrap(w-24,h-24);p.drawOn(c,x+12,y-24-ph)
   if i<2:c.setStrokeColor(HexColor(TEAL));c.line(x+w+4,y-h/2,x+w+16,y-h/2)
  return y-h-22
 def end(self,dark=False):
  c=self.c;c.setStrokeColor(HexColor("#496079" if dark else LINE));c.line(40,52,572,52);c.setFillColor(HexColor("#c6d7e5" if dark else MUTED));c.setFont('Helvetica',7);c.drawString(40,38,'AUTHORIZED DEFENSIVE USE ONLY / SYNTHETIC DATA / NO SECURITY GUARANTEE');c.drawString(40,26,'v1.0.0 / 29 OCT 2026 / Full limitations: DISCLAIMER.md');c.drawRightString(572,26,str(self.page));c.showPage()
 def save(self):self.c.save()

b=Book(OUT/'APP-SECURITY-FIELD-GUIDE.pdf','Hack Yourself: App Security Field Guide')
# Cover
b.page+=1;c=b.c;c.setFillColor(HexColor(NAVY));c.rect(0,0,612,792,fill=1,stroke=0);c.setFillColor(HexColor(MINT));c.setFont('Helvetica-Bold',10);c.drawString(42,740,'MARK KASHEF / PRACTICAL FIELD GUIDE');p=Paragraph('Hack yourself.<br/>Then fix it.',styles['white']);_,h=p.wrap(510,200);p.drawOn(c,42,674-h)
c.setFillColor(white);c.setFont('Helvetica',14);c.drawString(43,500,'Check the app you built with AI,');c.drawString(43,478,'one feature at a time.')
colors=['#174343','#444d32','#6b4a2e','#743e43']
for row in range(5):
 for col in range(5):
  score=(5-row)*(col+1);band=3 if score>=16 else 2 if score>=10 else 1 if score>=5 else 0;c.setFillColor(HexColor(colors[band]));c.roundRect(43+col*48,172+(4-row)*43,42,37,4,fill=1,stroke=0)
c.setFillColor(HexColor(MINT));c.setFont('Helvetica-Bold',9);c.drawString(312,345,'LEARN THE FAILURE');c.drawString(312,312,'KEEP THE EVIDENCE');c.drawString(312,279,'VERIFY THE REPAIR');c.setFillColor(white);c.setFont('Helvetica',9);c.drawString(43,146,'Illustrative risk grid. No real findings shown.');b.end(True)

y=b.start('Start here','One useful check beats a vague verdict.','Read the boundary, prepare two accounts, and keep the result small enough to explain.')
y=b.flow(['Define the boundary','Compare two accounts','Repair and retest'],y)
for title,text in [
 ('Choose a private feature','Pick a note, file, invoice, or other record that belongs to one account. Use a staging copy and fictional data. Give the record a harmless marker so you can recognize it.'),
 ('Confirm the normal action','Check that the owner can read the record. Without that positive control, a blocked request could simply mean the feature is broken or your setup is wrong.'),
 ('Try the forbidden action','With the other ordinary account, request that same record. Inspect the result and the active session. A different organization ID in the address bar does not change which account made the request.'),
 ('Make a decision from evidence','A private marker returned to the wrong account is useful evidence. An empty response, failed tool, or HTTP 200 alone does not establish the same result.'),
 ('Then widen the review','Use the deeper-review prompt and complete checklist after you have one result you understand. Keep gaps and failed tools visible in your coverage log.')]:y=b.section(title,text,y)
b.end()

y=b.start('Before testing','Agree the scope. Enforce the limits.','Permission for one app does not include every service it happens to link to.')
for title,text in [
 ('Write down the boundary','Use templates/TEST-SCOPE.md: owner, written permission, exact hosts, accounts, actions, test window, request budget, spending controls, and stop conditions. Resolve missing details before the first test request.'),
 ('Keep the environment disposable','Use an isolated copy, synthetic records, ordinary test accounts, and a backup. Do not hand the testing agent a production admin or database service-role key.'),
 ('Configure the real controls','Constrain the runtime\'s network, files, and tools. Set enforced service quotas and monitor actual requests. Prompt wording alone does not impose a network boundary, concurrency limit, or spending cap.'),
 ('Stop at the boundary','Stop for real private data, unexpected third-party hosts, destructive operations, real charges or messages, or service instability. Preserve minimal redacted evidence and use the agreed contact route.'),
 ('Understand the limits','This is education, not legal advice, a professional assessment, or a certification. The full terms are in DISCLAIMER.md. A test login or public URL is not permission to test a third-party system.')]:y=b.section(title,text,y)
b.end()

y=b.start('Setup','Prove that a tool ran.','A model describing a test is different from a model executing one.')
y=b.flow(['Open staging page','Read own marker','Inspect tool result'],y)
for title,text in [
 ('Use the setup prompt first','prompts/00-prepare-session.txt asks the assistant to confirm scope, available tools, session separation, and any controls that must be configured outside the prompt.'),
 ('Verify the account session','Keep account A and B in separate profiles or explicit sessions. Check the signed-in identity before each comparison. An owner token can make an ordinary-looking request misleading.'),
 ('Protect the evidence','Use the approved private credential mechanism. Redact passwords, tokens, cookies, reset links, personal details, and private file URLs before sharing. Review the AI provider\'s handling of submitted data.'),
 ('Keep a known working setup','Use the linked model setup kit for DeepSeek Harness connections. This field kit does not install a model, include API credits, or promise any provider will remain available.'),
 ('If tools fail','Record an incomplete check. A 401 may mean the test login is invalid; a refused localhost connection may mean the server is off. Neither proves a vulnerability or complete protection.')]:y=b.section(title,text,y)
b.end()

y=b.start('Access check','The URL chooses a record. Permission decides who gets it.','Organization and record IDs help locate information. They are not substitutes for authorization.')
y=b.flow(['Owner reads marker','Other account asks','Server checks access'],y)
for title,text in [
 ('Use a test record with an obvious owner','Add a fictional note to account B and confirm B can read it. Record the allowed sharing rule before making a comparison.'),
 ('Compare the actual request','Use account A\'s session to request B\'s record through the same route or underlying API. Compare the returned marker, not just the page layout or status code.'),
 ('Follow related paths inside scope','A list endpoint, individual record endpoint, search result, export, or copied file link may enforce different rules. Treat each tested action as its own coverage item.'),
 ('Fix the authorization layer','Validate the caller\'s relationship to the record and workspace on the server or database. Hiding the menu, changing an ID format, or blocking one URL is not enough if another data route is still exposed.'),
 ('Retest both sides','Repeat A\'s forbidden read, then B\'s legitimate read. Record the deployed version and keep a regression check. Source: AUTH in SOURCES.md.')]:y=b.section(title,text,y)
b.end()

stories=json.loads((R/'data/stories.json').read_text())
for s in stories:
 y=b.start('Everyday feature '+s['id'],s['title'],'A conditional teaching example. This is not a finding about your app or a client.')
 y=b.flow(s['flow'],y)
 for title,key in [('The normal moment','normal'),('Where it can go wrong','failure'),('A controlled check','test'),('What to change','fix'),('Keep the claim honest','proof')]:y=b.section(title,s[key],y)
 y=b.para('Reference: '+s['source']+' in SOURCES.md. '+s['not'],y,'small',5);b.end()

groups=json.loads((R/'data/checklist.json').read_text())
source_map={'A':'AUTH','B':'AUTH, RESET, CSRF','C':'REST, SECRETS','D':'XSS, UPLOADS','E':'PAYMENTS, WEBHOOKS','F':'AGENTS, AGENCY, DEPENDENCIES','G':'SECRETS, DEPENDENCIES'}
for g in groups:
 y=b.start('Checklist '+g['id'],g['title'],'Mark each item confirmed, passed, needs_review, not_tested, or not applicable with a reason.')
 for item in g['items']:
  c=b.c;c.setStrokeColor(HexColor(TEAL));c.rect(40,y-10,8,8,fill=0,stroke=1);y=b.para(item['id']+'  '+item['text'],y,'body',15,x=58,w=514)
 y=b.para('Implementation references: '+source_map[g['id']]+'. Review against your app\'s context; these prompts are not a complete audit or automatic tests.',y,'small');b.end()

y=b.start('Choose your next check','Start where a mistake would hurt your business.','These examples help you choose a feature. They do not claim a business has a vulnerability.')
for title,text in [
 ('Agency or client portal','Start with private client notes, shared links, attachments, and workspace separation. A different client should not receive a record simply by following a copied link.'),
 ('Course, membership, or paid download','Check the path from trusted product price to completed payment to access. Check cancellation and entitlement changes against the rules you actually offer.'),
 ('Online shop or booking app','Check order ownership, discounts, invoice details, and confirmations in test mode. Record what the server believes before concluding that a displayed total caused a real payment.'),
 ('AI support tool or document assistant','Check per-user usage limits, private retrieval boundaries, and the tools that can send or change data. Use made-up files and an approval-gated sending tool.'),
 ('Internal team dashboard','Check roles, exports, account linking, and offboarding. A team member losing a menu should also lose the underlying access that the role no longer allows.'),
 ('Use the coverage log','Choose a few high-value checks, record exactly what you covered, and mark the rest untested. The full checklist helps plan the next review without implying you tested everything today.')]:y=b.section(title,text,y)
b.end()

y=b.start('Evidence','Write a finding someone can reproduce.','Keep observations, possible consequences, and missing proof separate.')
for title,text in [
 ('Identity and expected rule','Record the active account, role, record owner, route, version, and what should have happened. Confirm the record was supposed to be private.'),
 ('Smallest proof','Keep the exact action and a redacted response or screenshot that shows the harmless marker or completed result. Do not collect an entire customer database to prove one read.'),
 ('Observed impact','State only what the evidence shows. Reading one label is not reading every conversation. A writable field is not a completed financial transfer. An attempted send is not a delivered file.'),
 ('Next action','Recommend the specific permission, validation, or business-rule repair. Assign an owner and a retest. Use templates/FINDING.md and templates/RETEST.csv.'),
 ('Four report statuses','confirmed: evidence supports the issue. passed: this exact check met the expected rule. needs_review: concern or incomplete proof. not_tested: no executed check. Keep the last two out of the confirmed count.')]:y=b.section(title,text,y)
b.end()

y=b.start('Risk map','Make the priorities visible.','Qualitative ratings support a decision. They are not CVSS or measured probabilities.')
y=b.flow(['Confirm evidence','Rate ease and impact','Choose next repair'],y)
for title,text in [
 ('Ease of exploitation, 1 to 5','1 means unusual access or difficult conditions. 3 means an ordinary signed-in user can reproduce the issue with investigation. 5 means a public, repeatable action with few barriers. Explain the conditions.'),
 ('Consequence, 1 to 5','1 means limited nuisance or information. 3 means meaningful private data or a workflow effect. 5 means broad compromise or severe impact supported by evidence. Do not rate a hypothetical worst case as an observed result.'),
 ('A simple triage default','The urgent list includes confirmed items with both ratings at least 3, plus documented owner overrides. The grid uses ease times consequence for color. These are kit-specific display choices, not an industry severity standard.'),
 ('Use the offline report','Open report/risk-report.html and import a redacted JSON file based on templates/assessment.blank.json. The sample is clearly fictional. The page runs locally and starts without findings; no scan is performed.'),
 ('Export before closing','The page keeps data in memory, not persistent storage. Export the JSON to retain it, and use Print / Save PDF for a shareable view. Check the content before sharing either file. Full anchors: guides/RISK-RATINGS.md.')]:y=b.section(title,text,y)
b.end()

y=b.start('Repair and recovery','A fix needs two successful checks.','The forbidden action should fail, and the legitimate action should still work.')
y=b.flow(['Review the repair','Repeat failed boundary','Confirm owner access'],y)
for title,text in [
 ('Apply a reviewed change in staging','Use the evidence to identify the rule that failed. Review the affected files, likely side effects, and rollback plan. Keep unrelated changes out of the repair.'),
 ('Repeat the same input','Use the original account, route, record, and action. A different request may miss the original problem. Record the response and version, then confirm the owner can still complete the normal action.'),
 ('Check the neighboring routes','Verify related list, item, export, file, and write paths affected by the change. Retain an appropriate regression test. A local pass does not prove production has the same deployed repair.'),
 ('Clean up and revoke','Remove disposable records and test access, revoke temporary credentials, and keep only necessary redacted evidence. Restore changes according to the scope and recovery plan.'),
 ('Escalate a real exposure','Stop and use the authorized owner\'s incident process. Seek qualified help for material risk or sensitive production data. This guide does not determine your legal or regulatory duties.')]:y=b.section(title,text,y)
b.end()

y=b.start('Prompts and files','The next step is already in the kit.','Use one prompt for one job. Keep your scope and evidence beside it.')
for title,text in [
 ('00 / Prepare the session','prompts/00-prepare-session.txt - confirm scope, tools, sessions, and controls before testing.'),
 ('01 / Run one private-record check','prompts/01-first-check.txt - confirm owner access, then test the other account.'),
 ('02 / Go deeper','prompts/02-go-deeper.txt - map related in-scope routes with a counted request budget.'),
 ('03 / Review the evidence','prompts/03-review-evidence.txt - challenge assumptions before calling something confirmed.'),
 ('04 / Fix and retest','prompts/04-fix-and-retest.txt - review a repair, apply it when authorized, and verify both sides.'),
 ('05 / Build the risk report','prompts/05-build-risk-report.txt - prepare redacted JSON for the offline heat map.'),
 ('Keep the complete sources','ALL-PROMPTS.md combines the prompts. CHECKLIST.md, templates/, and guides/ are editable. DISCLAIMER.md and DEFENSIVE-USE.md explain the full boundaries. The PDFs are finished reading copies.')]:y=b.section(title,text,y)
b.end()

y=b.start('Read this before use','Know what this kit can and cannot tell you.','Full notice: DISCLAIMER.md. Third-party terms and licenses still apply.')
for title,text in [
 ('Authorization','Use only systems you own or have explicit written permission to test, within the agreed scope. The kit grants no permission. A provider account, test login, or public URL is not authorization for unrelated systems.'),
 ('No guarantee','Provided as is and as available, without warranties to the extent permitted by applicable law. This is education, not legal advice, a professional security assessment, compliance certification, or a guarantee of security or fitness. AI can be incorrect or unsafe.'),
 ('Your responsibilities','Review commands, findings, code, costs, data handling, permissions, backups, and third-party terms. Use synthetic data and limited access. A prompt is not a sandbox, and a passing check covers only the action tested.'),
 ('Liability and rights','To the extent permitted by applicable law, creators and contributors disclaim liability for losses arising from use or reliance. Nothing excludes rights, remedies, warranties, or liability that cannot lawfully be excluded or limited.'),
 ('Examples and providers','Feature stories and sample reports are fictional teaching examples. No client data, model weights, credits, or actual app findings are included. Product names belong to their owners; references do not imply endorsement.'),
 ('Version and verification','Version 1.0.0, 29 October 2026. See verification/STATUS.md for the actual checks and remaining limits. Provider interfaces, models, prices, and guidance can change.')]:y=b.section(title,text,y)
b.end()

y=b.start('References and updates','Keep the official guidance close.','Use these sources for implementation details and current provider behavior.')
for key,title,url,desc in json.loads((R/'data/sources.json').read_text()):
 y=b.para(key+' / '+title,y,'section',2)
 p=Paragraph('<link href="'+html.escape(url,quote=True)+'" color="#087d70">'+html.escape(url)+'</link>',styles['small']);_,h=p.wrap(532,100);p.drawOn(b.c,40,y-h);y-=h+10
y=b.para('Updated sources and editable files: github.com/earlyaidopters/hack-yourself-security-kit\nComplete download: markkashef.gumroad.com/l/hack-yourself-checklist',y,'small');b.end();b.save()

w=Book(OUT/'TEST-WORKSHEETS.pdf','App Security Test Worksheets')
sheet_pages=[('01 / Permission and setup','Scope sheet',['Owner / authorized tester / permission reference','App and exact allowed backend hosts','Excluded services / permitted actions','Test window / request budget / concurrency','Disposable accounts and fictional record owners','Spending controls / backup / rollback / contact','Stop conditions / evidence retention / credential revocation']),('02 / Record the result','Evidence sheet',['Finding ID / feature / tested version and date','Active account and role / record owner / expected rule','Exact action or request, with secrets removed','Expected result and observed result','Smallest proof / directly supported business consequence','Status / ease and consequence ratings / rating reason','Recommended repair / assigned owner / remaining uncertainty']),('03 / Verify the repair','Retest sheet',['Finding ID / repair version / reviewer and date','Original forbidden action repeated with the same inputs','Forbidden action blocked: exact observed evidence','Normal owner action still works: exact evidence','Related routes checked / remaining gaps','Disposable records cleaned up / temporary access revoked','Production verification (if authorized) / next review date'])]
for label,title,fields in sheet_pages:
 y=w.start(label,title,'Print this sheet or use the editable Markdown/CSV templates. Keep secrets and personal data out.')
 for field in fields:
  y=w.para(field,y,'small',4);w.c.setStrokeColor(HexColor(LINE));w.c.line(40,y-15,572,y-15);w.c.line(40,y-35,572,y-35);y-=61
 w.end()
w.save()

sample=(R/'examples/assessment.sample.json').read_text();blank=(R/'templates/assessment.blank.json').read_text();terms=html.escape((R/'DISCLAIMER.md').read_text())
template=(R/'scripts/report.template.html').read_text();(R/'report').mkdir(exist_ok=True)
(R/'report/risk-report.html').write_text(template.replace('__SAMPLE__',sample.replace('</','<\\/')).replace('__BLANK__',blank.replace('</','<\\/')).replace('__DISCLAIMER__',terms))

# Designed cover assets use real typography and a small illustrative grid, not a fabricated screenshot.
for name,(width,height) in [('cover.jpg',(1600,900)),('thumbnail.jpg',(1000,1000))]:
 im=Image.new('RGB',(width,height),NAVY);d=ImageDraw.Draw(im);left=int(width*.065);scale=width/1600
 def font(size):return ImageFont.truetype(str(FONT),round(size*scale))
 d.text((left,int(height*.075)),'MARK KASHEF',font=font(23),fill=MINT)
 if width==1600:
  d.text((left,190),'HACK',font=font(105),fill='white');d.text((left,320),'YOURSELF',font=font(105),fill='white');d.text((left,492),'APP SECURITY FIELD KIT',font=font(26),fill=MINT)
  gx,gy,cell,gap=1020,220,77,10
 else:
  d.text((left,170),'HACK',font=font(145),fill='white');d.text((left,285),'YOURSELF',font=font(145),fill='white');d.text((left,440),'APP SECURITY FIELD KIT',font=font(36),fill=MINT);gx,gy,cell,gap=left,560,58,9
 for row in range(5):
  for col in range(5):
   score=(5-row)*(col+1);band=3 if score>=16 else 2 if score>=10 else 1 if score>=5 else 0;x=gx+col*(cell+gap);y=gy+row*(cell+gap);d.rounded_rectangle((x,y,x+cell,y+cell),radius=6,fill=colors[band])
 d.text((left,height-125),'CHECKLIST / PROMPTS / RISK MAP',font=font(23 if width==1600 else 30),fill='white')
 d.text((left,height-65),'AUTHORIZED USE ONLY  /  ILLUSTRATIVE GRID',font=font(14 if width==1600 else 18),fill='#b5cad8')
 im.save(R/'assets'/name,quality=95)

checksum_files=['downloads/APP-SECURITY-FIELD-GUIDE.pdf','downloads/TEST-WORKSHEETS.pdf','report/risk-report.html','ALL-PROMPTS.md','CHECKLIST.md']
(R/'SHA256SUMS').write_text(''.join(hashlib.sha256((R/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in checksum_files))
print(json.dumps({'field_guide_pages':b.page,'worksheet_pages':w.page,'minimum_content_y':round(b.min_y,1),'report_built':True}))
