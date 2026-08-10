# FAQ

Straight answers to the questions that usually decide whether someone starts.

### Do I need to be technical?
No, but you need to be willing to read and make decisions. Claude Code runs the commands; you supply the judgment (what data, which surfaces, what budget). If you can follow a recipe and answer questions about your own situation, you can do this.

### How much does it really cost to run?
Two numbers, not one. A fixed infrastructure floor that runs whether or not anything happens, roughly $65 to $95/mo at the Hobby tier, $130 to $180 Standard, $230 to $400 Pro, $300 to $800 Enterprise. Plus inference (the model calls), often $10 to $40/mo at light use. On small tiers the NAT gateways and load balancer cost more than the compute. A daily cap protects you. See COST_SPEC.md and the cost chapter of the Blueprint.

### Is my data actually private?
Yes. Everything runs inside your own AWS account. Every model call goes through Bedrock in-account, so prompts never leave your walls, and all data sits in your own storage encrypted with your own keys. If you deleted the account, it would all be gone, because it only ever lived there.

### Is it actually secure?
It's a serious starting point, not Fort Knox out of the box, and the kit is honest about that. You get your own keys, a write-once audit trail, least-privilege access, leak scanning, and kill switches. A readiness monitor shows where you stand against SOC 2 and HIPAA. It makes you ready and evidenced; it does not certify you.

### Will this make me SOC 2 or HIPAA compliant?
No. It gets you ready and keeps you evidenced. A certificate comes only from an independent audit. This is a mental model and a head start, not legal advice, and your real obligations depend on your jurisdiction, industry, scope, and auditor.

### Can I use Azure or Google Cloud instead?
The pattern is cloud-agnostic: find the secure substitute for each service inside infrastructure you control. The kit is AWS-first, so the principles port directly but the specific stacks do not. The comparison chapter in the Blueprint shows the mapping.

### How long does it take?
Spread over a few short sessions. Setup (Part A) is an hour or two. Planning (Part B) is an hour or two. Scaffolding and deploying the foundation (Part C) is an afternoon. The CHECKLIST tracks it.

### Do I need an existing AWS account? Will this mess up my company account?
Use a fresh standalone account just for this, not your company's account managed under AWS Organizations (that path often won't work, and you don't want to experiment in production). TROUBLESHOOTING.md covers this.

### Who is this for?
Anyone who handles data that isn't theirs to hand over: a law firm, a clinic, an agency under NDA, a non-profit with donor records, or a founder who got the "where does our data go" question and didn't have an answer.

### What do I get for free here, and what's paid?
Free, this kit: the Blueprint, every service explained, the compliance mental model, the comparison, the from-zero prompt pack, the specs, and the foundation you build yourself. Paid, in the community: the full reference repo to clone, the orchestrator, the agents, the chat surfaces, Jarvis, the dashboard, the build modules that walk it line by line, and coaching to harden it for your org.

### What if I get stuck?
Check TROUBLESHOOTING.md first, it covers the common snags. If you're still stuck, the community is where the hands-on help lives: https://www.skool.com/earlyaidopters/about
