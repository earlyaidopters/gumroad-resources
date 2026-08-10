# QUICKSTART

New here? Do this in order. The whole kit takes you from zero to a real, deployed foundation in your own AWS, drafting your own version of the system. You don't need to be an AWS expert. You need Claude Code and a couple of focused sessions.

## 1. Understand it (30 to 60 minutes)

Read **The Enterprise OS Blueprint** (the PDF). Four chapters: the infrastructure, every AWS service in plain English, what compliance actually looks like, and off-the-shelf vs in-your-account. Don't memorize it. Just get the shape: one account, one chokepoint, your own keys, a control for everything.

## 2. Set up your workspace (5 minutes)

- Make an empty folder for your build.
- Copy **BLUEPRINT.md** and the **specs/** folder into it. Claude Code reads these as it works.
- Have Claude Code open in that folder.

## 3. Run the prompts in order (a few hours, spread out)

Open **The Build-It Prompt Pack** (the PDF) and run the 11 prompts in order, pasting each into Claude Code:

- **Part A (steps 1 to 3):** set up the AWS CLI, a clean standalone account, the CDK toolchain, and Bedrock model access, from scratch.
- **Part B (steps 4 to 7):** scope your system, draft the architecture, cost-model it, check compliance readiness. Each writes a spec file.
- **Part C (steps 8 to 11):** scaffold the CDK project, draft the foundation stacks, deploy and verify with the budget set first, then prove it with one secure, logged model call.

The raw prompts are also in **prompts/** if you'd rather copy-paste from text.

## 4. See what good looks like

Stuck on a spec? Open **examples/** for three fully filled-in sets across the tier spectrum, a solo operator at T0, a law firm at T1, and a healthcare clinic at T2, so you can see what a completed SYSTEM_SPEC, ARCHITECTURE_SPEC, and COST_SPEC look like, and how the design flexes as the data gets more sensitive. Yours will differ. Use them for the level of detail, not as templates to copy.

## 5. When something breaks

See **TROUBLESHOOTING.md** for the snags that stop most people (account not standalone, bootstrap fails, Bedrock access pending, a surprise NAT bill) and the fix for each.

## Keep these handy

- **FIRST_SESSION.md** - a paced 90-minute plan for your first sitting, win first, finish later.
- **GLOSSARY.md** - every AWS and agent term in this kit, in plain English.
- **CHECKLIST.md** - tick off the whole journey as you go, so nothing slips.
- **FAQ.md** - the cost, security, privacy, and free-vs-paid questions, answered straight.
- **COMMANDS.md** - the exact command to check each step.
- **Enterprise_OS_On_One_Page.pdf** - the whole system on a single printable page. Pin it up.

## What you'll have at the end

A real, costed, deployed foundation in your own account: your network, your storage including the write-once audit bucket, your tables, your own keys, least-privilege roles, with an AWS budget and a daily cap live, and your first secure AI call made inside your own cloud and logged to your own audit trail. The orchestrator, the agents, the chat surfaces, Jarvis, the dashboard, and the hardened production version are the next layer, and they live in the community.

**Join here:** https://www.skool.com/earlyaidopters/about
