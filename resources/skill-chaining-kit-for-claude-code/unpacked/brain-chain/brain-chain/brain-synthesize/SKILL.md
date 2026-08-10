---
name: brain-synthesize
description: Generate a comprehensive brief from vault search results and extracted insights. Final step in the brain brief pipeline.
---

Synthesize everything known about: "$ARGUMENTS"

## Instructions

1. Read all previous brain pipeline outputs from `outputs/brain/!`date +%Y-%m-%d`/{slug}/`:
   - `01_search_results.md` (what notes exist)
   - `02_extracted_insights.md` (what they contain)
2. Generate a comprehensive, actionable brief that synthesizes everything into one document
3. This should read like a briefing document, not a data dump

## Writing rules

- No em dashes. Use commas or periods.
- Short paragraphs. Direct.
- Lead with what matters most.
- Flag contradictions or outdated information.

## Output

Write results to `outputs/brain/!`date +%Y-%m-%d`/{slug}/03_synthesis.md`

Format:

```markdown
# Brain Brief: [Topic]
*Synthesized !`date +%Y-%m-%d`*
*Based on [X] vault notes across [Y] areas*

## Executive Summary

[3-5 sentences. What does Mark know about this topic? What's the current state? What needs attention?]

## What You Know

[The consolidated knowledge. Organized thematically, not by source note. Written as a coherent narrative.]

## What You've Committed To

[Action items, promises, deadlines. Pulled from tasks and timeline data.]

## Connections You Might Have Missed

[Non-obvious links between notes in different areas. Ideas that reference each other but aren't explicitly connected.]

## Blind Spots

[What's referenced but underdeveloped? What questions does the vault raise but not answer?]

## Recommended Next Steps

1. [Specific action]
2. [Specific action]
3. [Specific action]
```

The brief should make Mark feel like he just reviewed his entire brain in 60 seconds.
