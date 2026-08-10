# SYSTEM_SPEC

What you're building, written down. Fill this in, or let the SCOPE prompt (step 4) write it for you. Every later prompt and the build itself read from this.

## Identity
- Account id: [from SETUP.md]
- Region: [from SETUP.md]
- Owner: [you / your org]
- Recommended deploy tier: [hobby / standard / pro / enterprise]

## Data
- What data will this handle: [describe]
- Sensitivity: [public / internal / confidential / regulated]
- Any of it not yours to hand over: [yes / no. If yes, say so loudly, it drives everything]
- Retention needs: [how long must records be kept, and why]

## Jurisdiction and industry
- Jurisdiction(s): [country / state]
- Industry: [e.g. healthcare, legal, finance, non-profit]
- Rules that brings: [HIPAA, GDPR, etc., or none yet]

## Surfaces
- [ ] Telegram   [ ] Slack   [ ] Web dashboard   [ ] Other: ___

## Models
- Allowed: [Claude Opus / Sonnet / Haiku, Amazon Nova / Titan, open: Llama / Mistral / DeepSeek / Qwen]
- Barred from sending prompts to any outside vendor: [yes / no. If yes, plan for in-account open models]

## Team and roles
- People: [count]
- Roles needed: [viewer / analyst / operator / admin / owner]

## Tools you're replacing
- [list the off-the-shelf tools this is the secure substitute for]

## Budget
- Monthly ceiling: [$X]
- Daily cap target: [$X per day]

## Non-negotiables
- [the hard lines this build must never cross]

## Open questions
- [what you still need to decide]
