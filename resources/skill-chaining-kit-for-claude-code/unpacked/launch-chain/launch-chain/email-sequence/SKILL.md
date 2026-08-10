---
name: email-sequence
description: Write a 3-email launch nurture sequence (teaser, value, CTA). Reads previous launch outputs if available.
---

Write a 3-email launch sequence for: "$ARGUMENTS"

## Instructions

1. Check for existing launch assets at `outputs/launch/!`date +%Y-%m-%d`/{slug}/` (where {slug} is the offer name lowercased with hyphens)
   - Read `01_market_scan.md` if it exists (for positioning)
   - Read `02_sales_page.md` if it exists (for offer details and pricing)
2. Write 3 emails that build anticipation and drive action
3. Each email should be ready to copy-paste into an email tool

## Writing rules

- No em dashes. Use commas or periods.
- No colons in subject lines or body copy.
- Short paragraphs. 1-2 sentences each.
- Conversational. Like texting a smart friend.
- Subject lines under 50 characters.

## Output

Write the result to `outputs/launch/!`date +%Y-%m-%d`/{slug}/03_email_sequence.md`. Create the directory if needed.

Use this structure:

```markdown
# Email Sequence: [Offer Name]
*Generated !`date +%Y-%m-%d`*

---

## Email 1: The Teaser
**Send: 5 days before launch**

**Subject line:** [Short, curiosity-driven, no colon]
**Preview text:** [The grey text that shows in inbox]

[Body - 4-6 short paragraphs. Build anticipation. Hint at what's coming. Don't reveal everything. End with "more soon" energy.]

---

## Email 2: The Value Drop
**Send: 2 days before launch**

**Subject line:** [Short, value-forward, no colon]
**Preview text:** [The grey text that shows in inbox]

[Body - 5-7 short paragraphs. Deliver a genuine insight or mini-lesson related to the offer. Prove you know what you're talking about. Naturally transition to "I built something around this."]

---

## Email 3: The CTA
**Send: Launch day**

**Subject line:** [Short, action-oriented, no colon]
**Preview text:** [The grey text that shows in inbox]

[Body - 4-6 short paragraphs. Announce the offer. Reference the value from Email 2. Clear pricing. One CTA link. Light urgency without being pushy.]

[Sign-off]
```

Make each email distinct in tone. Email 1 is mysterious. Email 2 is generous. Email 3 is direct.
