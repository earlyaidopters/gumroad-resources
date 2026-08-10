# Greenfield vs Audit Detection

The skill audits the operator's working directory **silently** before asking any questions. Detection logic lives in `scripts/audit_existing_folder.py`.

## Detection triggers (any one shifts to `audit-existing` mode)

| Path | Signal |
|---|---|
| `.claude/CLAUDE.md` | Operator has at least started the AI layer |
| `.claude/settings.json` | Hooks may already be wired |
| `.claude/skills/<any>` | Skills exist |
| `.claude/agents/<any>` | Subagents exist |
| `.claude/rules/<any>` | Rules exist (path-scoped or always-on) |
| `data/` (with subfolders) | Data namespacing has begun |
| `silver_platters/` | The 80% has started |
| `outputs/audit_log.md` | Audit trail is active |
| `data/raw_dropzone/` | Conversion hook may be wired |
| `data/converted/` | Conversion hook is firing |

## Branch behavior

### Greenfield (none of the above)

- Run the full interview from Stage 1.
- The operator gets a complete data map plus a full opportunities list plus the handoff prompt.
- The `BUILD_PLAN.md` reads as "build everything from scratch."

### Audit-existing (one or more triggers)

- **Acknowledge what was found** in plain English before asking anything else.
- The interview SKIPS questions about whatever was detected.
  - If `.claude/skills/cfo-bot/` exists, don't ask about CFO bot.
  - If `silver_platters/finance_weekly_*.md` exists, don't ask about finance silver platter.
  - If `rules/matter_handling.md` exists, don't ask about matter walling.
- The opportunities list focuses on **GAPS** — what's NOT there yet.
- The handoff prompt addresses `@claude-code-guide` with "augment my existing setup" framing, not "scaffold from scratch."

### Edge cases

- **Partial setup.** Operator has `.claude/CLAUDE.md` but no skills. Treat as audit-existing — acknowledge the CLAUDE.md, then ask about everything else.
- **Borrowed setup.** Operator has a `.claude/` folder copied from someone else's repo. Detect by reading the CLAUDE.md and checking if the business named matches what they describe in Stage 2. If mismatch, gently flag: *"I see a CLAUDE.md mentioning [other business]. Did you copy this from somewhere? Want me to treat that as a starting point or a clean slate?"*
- **Demo folder.** If cwd matches one of `demos/0X_*/` in the Business OS Demos Kit, recognize it as a tutorial folder and offer to walk through what's already built (rather than running an interview).

## Output format from `audit_existing_folder.py`

```json
{
  "mode": "greenfield" | "audit-existing",
  "detections": {
    "claude_md": {"exists": true, "lines": 80, "path": ".claude/CLAUDE.md"},
    "settings_json": {"exists": true, "has_hooks": true},
    "skills": {"count": 3, "names": ["cfo-bot", "cmo-bot", "ea-orchestrator"]},
    "agents": {"count": 0, "names": []},
    "rules": {"count": 2, "names": ["finance.md", "voice_of_customer.md"]},
    "data_namespaces": ["shopify", "ads", "surveys", "inventory"],
    "silver_platters": ["finance_weekly_2025-W44.md", "customer_voice_2025-W44.md"],
    "audit_log": {"exists": true, "line_count": 17},
    "raw_dropzone": {"exists": true, "file_count": 3},
    "converted": {"exists": true, "file_count": 3}
  },
  "skip_questions": [
    "Are you using Claude Code?",
    "Do you have a CFO/CMO/EA bot?",
    "Do you have a finance silver platter?"
  ]
}
```

The interview reads this JSON to decide which questions to skip.
