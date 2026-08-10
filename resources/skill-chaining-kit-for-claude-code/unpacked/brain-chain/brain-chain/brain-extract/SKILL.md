---
name: brain-extract
description: Extract key insights, tasks, and connections from vault search results. Second step in the brain brief pipeline.
---

Extract insights from vault notes about: "$ARGUMENTS"

## Instructions

1. Check for search results at `outputs/brain/!`date +%Y-%m-%d`/{slug}/01_search_results.md` (where {slug} is the topic lowercased with hyphens)
2. If search results exist, read the full content of the top 10 most relevant notes from the vault
3. From each note, extract:
   - Key insights or decisions documented
   - Open tasks (checkboxes)
   - Wikilinks to other notes (connections)
   - Dates mentioned (deadlines, events)
   - Any action items or commitments

## Output

Write results to `outputs/brain/!`date +%Y-%m-%d`/{slug}/02_extracted_insights.md`

Format:

```markdown
# Brain Extract: [Topic]
*Extracted !`date +%Y-%m-%d`*

## Key Insights (across all notes)

1. **[Insight]** - Source: [note name]
2. **[Insight]** - Source: [note name]
...

## Open Tasks

- [ ] [Task] - Source: [note name]
- [ ] [Task] - Source: [note name]
...

## Connections Map

[List wikilinks and how notes reference each other. Show the web of connections.]

- [Note A] links to [Note B] (context: why)
- [Note B] links to [Note C] (context: why)
...

## Timeline

| Date | Event/Deadline | Source |
|------|---------------|--------|
| ... | ... | ... |

## Knowledge Gaps

[What's missing? What topics are referenced but have no dedicated note? What questions remain unanswered?]
```

Be thorough. Read the actual note content, don't just summarize titles.
