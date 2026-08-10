# Claude Code Guide Handoff Template

Render this template into `claude_code_guide_handoff.txt` in the operator's `silver_platter_output/` folder. The operator copy-pastes it into a new Claude Code session and addresses the `@claude-code-guide` agent.

---

## Template (Jinja2 syntax — variables get filled at render time)

```
@claude-code-guide

I just ran /silver-platter on my repo. Here's what we mapped together. I want you to scaffold the .claude/ folder so the architecture matches.

# Business

- Name: {{ business.name }}
- Archetype: {{ business.archetype }}
- One-line: {{ business.stack_summary }}

# Data map

## Pantry (what data sources I have)

{% for item in pantry %}
- {{ item.tool }} — {{ item.format }}, {{ item.cadence }} cadence, {{ item.volume }} volume
  - Status: {{ item.status }}
  - Feeds: {{ item.feeds | join(', ') }}
  {% if item.cli_skill %}- CLI skill available: {{ item.cli_skill }}{% endif %}
{% endfor %}

## Prep table (silver platters I need)

{% for item in prep %}
- {{ item.name }} ({{ item.domain }} domain)
  - Sources: {{ item.sources | join(', ') }}
  - Schedule: {{ item.schedule }}
  - Status: {{ item.status }}
{% endfor %}

## Plate (outputs that go to humans)

{% for item in plate %}
- {{ item.name }} (drafted by {{ item.agent }})
  - Consumers: {{ item.consumers | join(', ') }}
  - Approval gate: {{ item.approval_gate }}
{% endfor %}

# What I want you to build

Specifically:

1. Create the folder structure:
   {% for item in folder_structure %}- {{ item }}
   {% endfor %}

2. Write a lean root CLAUDE.md (target < 200 lines) that:
   - States the business one-liner
   - Names the agent hierarchy with one bullet per role
   - Lists the hard rules (jargon translation, single coral accent equivalents — locked operator preferences, etc.)
   - References the path-scoped rules under .claude/rules/

3. Write {{ skills_to_write | length }} skills under .claude/skills/:
   {% for skill in skills_to_write %}- {{ skill.name }} — {{ skill.purpose }}
   {% endfor %}

4. Write {{ subagents_to_write | length }} subagents under .claude/agents/:
   {% for agent in subagents_to_write %}- {{ agent.name }} — {{ agent.role }}
   {% endfor %}

5. Write {{ rules_to_write | length }} rules under .claude/rules/:
   {% for rule in rules_to_write %}- {{ rule.name }} — paths: {{ rule.paths | join(', ') }}
   {% endfor %}

6. Configure .claude/settings.json with three hooks:
   - SessionStart: convert_dropzone.sh (PDF/DOCX/XLSX/EML to .md)
   - PostToolUse Edit|Write: audit_action.sh (append every action to outputs/audit_log.md)
   - Stop: check_acknowledgment.sh (warn-on-unsigned-draft, exit 0)

# Hard constraints I need you to honor

- Plain English voice. Operators are not engineers. Translate every jargon term inline.
- Never use em dashes anywhere in the .claude/ files. Comma, period, or rewrite.
- Every output that goes to a human (report, brief, draft, letter) requires an approval gate.
- All silver platters get committed to git. Raw data exports do not.
- Hooks are non-blocking by default (Stop hook exits 0).
- The orchestrator is a hierarchy, NOT a flat row. Specialists report to the orchestrator. Operators only talk to the orchestrator.

# What you should NOT do

- Don't pull in any external dependencies beyond what's standard (pandoc, pdftotext, jq, xlsx2csv, python3-stdlib).
- Don't write tests right now. Get the scaffolding right first.
- Don't push anything to git or modify my main branch.
- Don't auto-run anything. I'll review every file you create.

# Working directory

{{ cwd_path }}

When you're done, tell me:
1. What files you created (list)
2. What I should open first to verify
3. Any open questions you couldn't answer from this brief
```

---

## Variables the renderer fills

The Jinja2 renderer is fed:

```python
context = {
    "business": data_map["business"],
    "pantry": data_map["pantry"],
    "prep": data_map["prep"],
    "plate": data_map["plate"],
    "folder_structure": derived_from_data_map,
    "skills_to_write": [op for op in opportunities if op.claude_code_feature == "skill"],
    "subagents_to_write": derived_from_archetype + opportunities,
    "rules_to_write": [op for op in opportunities if op.claude_code_feature == "rule"],
    "cwd_path": str(Path.cwd()),
}
```

## Voice rules baked into the template

- Operators read this as a structured request, not a wall of text.
- The "What I want you to build" section reads like a punch list.
- The "Hard constraints" section locks the voice rules so the resulting `.claude/` files match brand.
- The "What you should NOT do" section prevents `@claude-code-guide` from over-building.
