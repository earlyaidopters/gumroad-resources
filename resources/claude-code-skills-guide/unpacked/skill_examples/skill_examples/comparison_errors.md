# Common Skill Mistakes: A Visual Catalog

Quick reference of the most common mistakes, why they happen,
and the exact fix.

---

## Mistake 1: Wrong Folder/File Naming

### The Mistake
```
My Project Helper/          <- Spaces and capitals
├── skill.md                <- Lowercase 's'
└── README.md               <- Don't include this
```

### The Fix
```
project-helper/             <- kebab-case
├── SKILL.md                <- Exact casing: SKILL.md
├── scripts/                <- Optional subdirs
└── references/             <- No README.md inside
```

### Why It Matters
- Claude literally cannot find `skill.md` — it looks for `SKILL.md` exactly
- Spaces in folder names break zip uploads
- README.md inside the skill folder gets loaded as part of the skill content

---

## Mistake 2: Missing YAML Delimiters

### The Mistake
```yaml
name: my-skill
description: Does things

# My Skill Instructions...
```

### The Fix
```yaml
---
name: my-skill
description: Does things.
---

# My Skill Instructions...
```

### Why It Matters
Without the `---` delimiters, the parser can't distinguish frontmatter
from body content. The skill will fail to upload with "Invalid frontmatter."

---

## Mistake 3: Forbidden Characters in Frontmatter

### The Mistake
```yaml
---
name: my-skill
description: Creates <div> elements and generates
  <React> components for the user's project.
---
```

### The Fix
```yaml
---
name: my-skill
description: Creates div elements and generates React
  components for web projects. Use when user asks to
  "build a component" or "create a page layout".
---
```

### Why It Matters
Frontmatter is injected into Claude's system prompt. XML angle brackets
(`<` and `>`) could be interpreted as system-level tags, creating a
security risk. The upload will be rejected.

---

## Mistake 4: Description Without Triggers

### The Mistake
```yaml
description: A comprehensive project management solution that
  leverages AI to optimize team productivity and streamline
  workflow processes across the organization.
```
This reads like marketing copy. Claude has no idea when to activate it.

### The Fix
```yaml
description: Creates and manages project tasks in Asana. Use
  when user says "create a task", "plan this project",
  "what's on my Asana board", or "assign this to someone".
  Requires Asana MCP server.
```

### The Rule
Every description MUST answer two questions:
1. **WHAT** does it do? (specific actions)
2. **WHEN** should Claude use it? (trigger phrases users would say)

---

## Mistake 5: Giant SKILL.md With Everything Inline

### The Mistake
```
my-skill/
└── SKILL.md   (4,000 lines — includes full API reference,
                 changelog, contributor guide, architecture docs,
                 and the actual instructions buried on line 2,847)
```

### The Fix
```
my-skill/
├── SKILL.md              (200 lines — core instructions only)
├── references/
│   ├── api-patterns.md   (API reference)
│   └── examples/         (detailed examples)
└── scripts/
    └── validate.py       (validation logic)
```

### Why It Matters
- SKILL.md body is Level 2 — loaded when relevant. Bigger = more tokens.
- Claude's attention degrades with length. Critical instructions get lost.
- Keep SKILL.md under ~5,000 words. Move details to references/.
- Link to references: "Before making API calls, consult references/api-patterns.md"

---

## Mistake 6: Over-Engineering the Metadata

### The Mistake
```yaml
---
name: data-processor
description: Processes data.
metadata:
  author: DataTeam
  version: 0.0.1-alpha-rc2-hotfix3
  category: data-engineering
  tags: [etl, pipeline, transformation, batch, streaming, schema,
         coercion, inference, heterogeneous, multi-paradigm]
  internal-build-id: 7f3a2b1c
  jira-ticket: DATA-4521
  sprint: 2026-Q1-S3
  code-review: pending
  test-coverage: 43%
  last-reviewed-by: john@company.com
  deployment-target: prod-us-east-1
---
```

### The Fix
```yaml
---
name: csv-data-pipeline
description: Cleans, validates, and transforms CSV files for
  analysis. Use when user says "clean this CSV", "fix my data",
  or "prepare this spreadsheet for analysis".
metadata:
  author: DataTeam
  version: 1.0.0
---
```

### Why It Matters
- Metadata is for Claude and users, not your CI/CD pipeline
- Internal build IDs, Jira tickets, and sprint info are noise
- Every byte in frontmatter goes into the system prompt
- Keep metadata to: author, version, and mcp-server (if applicable)

---

## Mistake 7: "Errors Are Handled"

### The Mistake
```markdown
## Error Handling

Errors are handled appropriately.
```
This is the equivalent of writing "code goes here" in your function body.

### The Fix
```markdown
## Troubleshooting

**Error: "Issue creation failed — authentication error"**
Cause: Linear API token expired or missing permissions.
Solution: Ask user to reconnect Linear in Settings > Extensions.

**Error: "Team not found"**
Cause: Team name doesn't match Linear workspace.
Solution: Use `list_teams` via Linear MCP to show available teams.

**Sprint seems overloaded**
If total points > 80% of capacity, warn the user:
"This sprint is at {percent}% capacity. Consider moving
{lowest_priority_task} to the backlog."
```

### Why It Matters
- Claude needs to know WHICH errors to expect
- Each error needs a SPECIFIC response, not generic handling
- Without this, Claude will either ignore errors or hallucinate solutions

---

## Mistake 8: Using Reserved Names

### The Mistake
```yaml
name: claude-assistant
# or
name: anthropic-helper
```

### The Fix
```yaml
name: ai-assistant
# or
name: project-helper
```

### Why It Matters
Names containing "claude" or "anthropic" are reserved by Anthropic.
The upload will be rejected. Choose a name that describes what your
skill does, not which AI it runs on.

---

## Quick Diagnostic Checklist

If your skill isn't working, check these in order:

| Symptom | Check | Fix |
|---------|-------|-----|
| Won't upload | Is file named exactly `SKILL.md`? | Rename (case-sensitive) |
| Won't upload | Are `---` YAML delimiters present? | Add them |
| Won't upload | Any `<` or `>` in frontmatter? | Remove them |
| Never triggers | Is description vague? | Add trigger phrases |
| Always triggers | Is description too broad? | Add negative triggers |
| Triggers but wrong output | Are instructions specific? | Add steps, tables, examples |
| MCP calls fail | Is the server connected? | Check Settings > Extensions |
| Inconsistent results | Are instructions ambiguous? | Use scripts for validation |
