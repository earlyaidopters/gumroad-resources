---
name: market-scan
description: Research competitors, pricing, and positioning gaps for a new offer. Use when launching a product, course, or service and you need to understand the landscape first.
---

Research the market for: "$ARGUMENTS"

## Instructions

1. Use WebSearch to find 5-8 competitors offering something similar to "$ARGUMENTS"
2. For each competitor, identify what they offer, their pricing (if visible), their positioning angle, and what's missing or weak
3. Identify the top 3 positioning gaps that could be exploited
4. Recommend one clear angle to differentiate

## Output

Write the result to `outputs/launch/!`date +%Y-%m-%d`/{slug}/01_market_scan.md` where {slug} is the offer name lowercased with hyphens (e.g. "AI Automation Workshop" becomes "ai-automation-workshop"). Create the directory if needed.

Use this exact format:

```markdown
# Market Scan: [Offer Name]
*Generated !`date +%Y-%m-%d`*

## Competitor Landscape

| # | Competitor | What They Offer | Price | Positioning | Weakness |
|---|-----------|----------------|-------|-------------|----------|
| 1 | ... | ... | ... | ... | ... |

## Top 3 Positioning Gaps

1. **[Gap name]** - [One sentence on why this is an opportunity]
2. **[Gap name]** - [One sentence on why this is an opportunity]
3. **[Gap name]** - [One sentence on why this is an opportunity]

## Recommended Angle

[One paragraph. Direct. What makes this offer different and why someone should buy THIS one over the competitors.]

## Key Takeaways for Sales Copy

- [Bullet point for the sales page to use]
- [Bullet point for the sales page to use]
- [Bullet point for the sales page to use]
```

Keep it tight. No fluff. This is a research brief that feeds into the next step of the pipeline.
