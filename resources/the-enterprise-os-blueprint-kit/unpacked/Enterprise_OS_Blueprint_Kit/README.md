# The Enterprise OS Blueprint Kit

Everything you need to understand and start building a secure agentic AI operating system inside your own cloud. Free, from Mark Kashef and the Early AI Dopters community.

> **New here? Open `QUICKSTART.md` first.** It sequences the whole kit so you're never lost. Everything below is the map.

## What's inside

**The Enterprise OS Blueprint** (the master guide, landscape, 34 pages). One comprehensive reference in four chapters:

1. **The Infrastructure** - the architecture end to end, with a by-the-numbers map, the 15 CDK stacks, and the leak scan.
2. **Every AWS Service in Plain English** - what each service is, what it does here, and the cost or gotcha for each.
3. **What Compliance Actually Looks Like** - the SOC 2 / HIPAA mental model, the five control categories, and the evidence an audit asks for. Not legal advice.
4. **Off-the-Shelf vs In-Your-Account** - Hermes / OpenClaw versus your own cloud, side by side.

**The Build-It Prompt Pack** (separate PDF). Eleven copy-paste prompts that take you from a blank laptop (no AWS, nothing installed) to a costed plan, a real deployed foundation, and your first secure, logged model call in your own account. Claude Code sets up the CLI and toolchain, enables the models, writes the spec files, scaffolds the project, drafts the foundation stacks, and proves the loop with one secure model call; you drive.

- **prompts/** - the eleven prompts as raw .txt, ready to paste, in three parts (set up, plan, draft and prove).
- **specs/** - eight fill-in spec templates Claude Code reads as the handoff (SETUP, SYSTEM, ARCHITECTURE, SECURITY, COST, READINESS, AGENT, BUILD_PLAN).
- **BLUEPRINT.md** - the whole architecture in plain markdown, the machine-readable version of the master guide. Drop it in your working folder so Claude Code can read it; it's what the prompts mean by "the Blueprint."

## How to use it

**Start with `QUICKSTART.md`.** It sequences the whole kit. In short: read the Blueprint to understand the system, copy BLUEPRINT.md and the specs/ folder into a working folder, then run the Prompt Pack in order to plan and draft your own.

- **`QUICKSTART.md`** - start here, the whole kit in order.
- **`examples/`** - three fully worked spec sets across the tiers (a solo operator at T0, a law firm at T1, a healthcare clinic at T2), so you can see what good looks like and how the design flexes to your situation.
- **`TROUBLESHOOTING.md`** - the common snags (account not standalone, bootstrap fails, Bedrock access pending, a surprise NAT bill) and the fix for each.
- **`GLOSSARY.md`** - every AWS and agent term in plain English.
- **`CHECKLIST.md`** - a printable tick-list of the whole journey.
- **`FAQ.md`** - straight answers to the questions that decide whether you start (cost, security, privacy, free vs paid, Azure/GCP).
- **`COMMANDS.md`** - the exact commands to check each step, copy-paste ready.
- **`FIRST_SESSION.md`** - a realistic 90-minute plan to get your first win.
- **`Enterprise_OS_On_One_Page.pdf`** - the whole system on a single printable page.

The actual repo to clone and deploy, the build training, and hands-on coaching live in the community.

**You're free to build with everything here, commercially too, no attribution required.**

**Join here:** https://www.skool.com/earlyaidopters/about
