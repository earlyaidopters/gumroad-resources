# Vibe Coding Starter Pack 🔥
## **Cheat Sheets for Lovable, Bolt, Cursor, and Replit**

📎 **File:** [`Replit Cheat Sheet.pdf`](files/Replit Cheat Sheet.pdf)

📎 **File:** [`Lovable Cheet Sheet.pdf`](files/Lovable Cheet Sheet.pdf)

📎 **File:** [`Cursor Cheat Sheet.pdf`](files/Cursor Cheat Sheet.pdf)

📎 **File:** [`Bolt Cheat Sheet.pdf`](files/Bolt Cheat Sheet.pdf)

## **n8n Workflows Used (for image generation apps)**

📎 **File:** [`Lovable_Image_Editing.json`](files/Lovable_Image_Editing.json)

📎 **File:** [`Lovable_Image_Gen_Demo_1.json`](files/Lovable_Image_Gen_Demo_1.json)

## **Security Cheat Sheet Presentation**

📎 **File:** [`Security-Features-Comparison-for-AI-Development-Platforms.pdf`](files/Security-Features-Comparison-for-AI-Development-Platforms.pdf)

## **Manus Prompt**

```
SYSTEM INSTRUCTIONS FOR MANUS

GOAL
Create TWO “three‑prompt build kits” that work in any of the following builders: Lovable, Bolt, Replit, Cursor.  
Each kit must contain:
– Prompt 1  Foundational Shell  
– Prompt 2  Data + Automation Integration  
– Prompt 3  UI Polish  

Also generate the companion automation definition:  
– Kit 1: a ready‑to‑import n8n (v1.91+) workflow JSON.  
– Kit 2: a Make.com scenario sketch written in plain text.  

GLOBAL OUTPUT RULES
1  Output plain text only — no markdown, no extra code fences.  
2  Use simple dividers like “-----” between parts.  
3  Insert the placeholders [PLATFORM], [WEBHOOK_URL_N8N], and [WEBHOOK_URL_MAKE] exactly as written.  
4  Do not add commentary before or after the deliverables.  

FORMAT TO RETURN
KIT 1 – AI ARCHETYPE FINDER  
-----Prompt 1-----  
[text]  
-----Prompt 2-----  
[text]  
-----Prompt 3-----  
[text]  
-----n8n Workflow JSON-----  
{ ... }  

KIT 2 – AI SOLUTION SELECTOR  
-----Prompt 1-----  
[text]  
-----Prompt 2-----  
[text]  
-----Prompt 3-----  
[text]  
-----Make.com Scenario-----  
[text]  

KIT 1 DETAILS
Purpose: Multi‑page personality test that outputs an archetype name, a 40‑word summary, and 3–5 matching AI tools.  
Data POSTed to [WEBHOOK_URL_N8N] with body:  
{ "userId": "<uuid>", "answers": { "q1": "...", "q2": "...", ... } }  

Prompt 1 requirements:  
– Flow: Intro → Q1…Q8 (one per page, progress bar) → Submit → Loading → Results.  
– Client‑side navigation only.  

Prompt 2 requirements:  
– POST to [WEBHOOK_URL_N8N].  
– Describe expected response:  
  { "archetype":"...", "summary":"...", "recommendedTools":[{ "name":"...", "why":"..." }, ...] }  
– Persist result locally so the user can revisit.  

Prompt 3 requirements:  
– Styling: soft gradient background, vibey feel, card grid for tools, confetti burst.  

n8n Workflow:  
Webhook Trigger → GPT‑4o Node 1 “Derive archetype” → GPT‑4o Node 2 “Suggest tools” → GPT‑4o Node 3 “Return JSON” → Webhook Response.  

KIT 2 DETAILS
Purpose: Wizard that branches early:  
Path A – Selling Solutions   Path B – Automating My Ops  
Collect 6–8 branch‑specific questions, then POST to [WEBHOOK_URL_MAKE].  

Prompt 1 requirements:  
– Flow: Intro → Path choice → Q‑set → Submit → Loading → Results panel (includes Mermaid).  
– Validate answers.  

Prompt 2 requirements:  
– POST body:  
  { "path":"A"|"B", "answers":{ "q1":"...", ... } }  
– Expect response:  
  { "painPoints":[...], "toolStack":[...], "mermaid":"graph TD; A-->B; ..." }  
– Inject Mermaid into <div id="diagram"> for client‑side render.  

Prompt 3 requirements:  
– Glass‑morphism panels, accordion sections for pain points and tool stack, copy buttons, embedded Mermaid.js renderer.  

Make.com Scenario (plain text sketch):  
1  Webhook (“AI‑Solution‑Selector‑In”)  
2  GPT‑4o module “Cluster pain points & recommend stack”  
3  GPT‑4o module “Generate Mermaid diagram”  
4  Webhook response (“Return JSON”)  
5  (Optional) Supabase module “Upsert record”  

END OF INSTRUCTIONS
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
