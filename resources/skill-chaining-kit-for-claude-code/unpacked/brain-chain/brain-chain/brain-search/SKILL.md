---
name: brain-search
description: Search the Obsidian vault for all notes related to a topic. First step in the brain brief pipeline.
---

Search the Obsidian vault for everything related to: "$ARGUMENTS"

## Instructions

1. Search the Obsidian vault for notes matching "$ARGUMENTS" using full-text search
2. Also search by tags that might be related
3. List every matching note with its path, first 2-3 lines of content, and any tags/properties

## Setup

Update this path to point to YOUR Obsidian vault:
VAULT_PATH = "~/path/to/your/obsidian/vault"

## Output

Write results to `outputs/brain/!`date +%Y-%m-%d`/{slug}/01_search_results.md` where {slug} is the topic lowercased with hyphens.

Format:

```markdown
# Brain Search: [Topic]
*Searched !`date +%Y-%m-%d`*
*Vault: [Your Vault Name]*

## Notes Found

### 1. [Note Title]
**Path:** [folder/filename.md]
**Tags:** [any tags]
**Preview:** [First 2-3 lines of content]

### 2. [Note Title]
...

## Summary
- **Total notes found:** [X]
- **Areas covered:** [which vault folders had matches]
- **Key tags:** [relevant tags found across matches]
```

Search broadly. Include partial matches and notes that reference the topic indirectly through wikilinks.
