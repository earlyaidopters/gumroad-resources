---
name: sales-page
description: Generate complete landing page copy with pricing tiers for a new offer. Reads the market scan first if available.
---

Generate landing page copy for: "$ARGUMENTS"

## Instructions

1. First, check if a market scan exists at `outputs/launch/!`date +%Y-%m-%d`/{slug}/01_market_scan.md` (where {slug} is the offer name lowercased with hyphens). If it exists, read it and use the positioning gaps and recommended angle to inform the copy.
2. If no market scan exists, proceed with your best judgment on positioning.
3. Generate complete sales page copy following the structure below.

## Writing rules

- No em dashes. Ever. Use commas or periods instead.
- No colons in headlines or body copy. Rewrite to avoid them.
- Short sentences. Punchy. Direct.
- Lead with the transformation, not the features.
- Sound like a real person, not a marketing template.

## Output

Write the result to `outputs/launch/!`date +%Y-%m-%d`/{slug}/02_sales_page.md`. Create the directory if needed.

Use this structure:

```markdown
# Sales Page: [Offer Name]
*Generated !`date +%Y-%m-%d`*

## Headline
[One line. Big promise. Benefit-first.]

## Subheadline
[One line. Expands on the headline. Creates curiosity.]

## The Problem
[2-3 sentences. Paint the pain. Make them nod.]

## The Solution
[2-3 sentences. Introduce the offer as the answer.]

## What You Get

- **[Benefit 1]** - [One sentence expanding on it]
- **[Benefit 2]** - [One sentence expanding on it]
- **[Benefit 3]** - [One sentence expanding on it]
- **[Benefit 4]** - [One sentence expanding on it]
- **[Benefit 5]** - [One sentence expanding on it]

## Who This Is For

- [Ideal customer profile 1]
- [Ideal customer profile 2]
- [Ideal customer profile 3]

## Pricing

### Starter - $[X]
- [What's included]
- [What's included]
- [What's included]

### Professional - $[X]
- Everything in Starter, plus
- [What's included]
- [What's included]

### Premium - $[X]
- Everything in Professional, plus
- [What's included]
- [What's included]

## FAQ

**[Question without a colon]**
[Answer. 1-2 sentences.]

**[Question without a colon]**
[Answer. 1-2 sentences.]

**[Question without a colon]**
[Answer. 1-2 sentences.]

## CTA
[Final call to action. One line. Urgency without being sleazy.]
```

Make the copy feel real and specific to the offer. No generic placeholder language.
