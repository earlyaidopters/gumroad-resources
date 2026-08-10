# YOUR FIRST 90 MINUTES

The goal of your first session is not to finish. It's to get a real win and some momentum: a working AWS setup and a written plan. Here's a realistic pace so you don't try to do it all at once.

## Minutes 0 to 15 · Get oriented
Skim The Enterprise OS Blueprint, just the chapter titles and the by-the-numbers page. Open QUICKSTART.md. Make an empty folder, copy BLUEPRINT.md and the specs/ folder into it, and open Claude Code there.

## Minutes 15 to 45 · Set up your AWS (Prompt Pack, Part A, step 1)
Paste prompt 1. Let Claude Code walk you through installing the CLI, opening a clean standalone account, turning on MFA, and setting a profile and region. Stop when `aws sts get-caller-identity` returns your account. That alone is a milestone, most people never get a clean CLI on a fresh account.

## Minutes 45 to 70 · Toolchain and models (steps 2 and 3)
Run prompts 2 and 3: install Node and the CDK, bootstrap your account, and request Bedrock model access. Access can take a few minutes to propagate, so kick it off and keep moving.

## Minutes 70 to 90 · Scope your system (Part B, step 4)
Run prompt 4 and answer the interview honestly. You'll end with a SYSTEM_SPEC.md that says exactly what you're building and which tier fits.

## End of session
Check off Part A and the start of Part B on CHECKLIST.md. You now have a working AWS setup and a real plan, in 90 minutes. Next session: architecture, cost, and the first deploy.

One piece of advice: don't rush Part C in your first sitting. The foundation deploy deserves a fresh head, and the cost guardrails set first.
