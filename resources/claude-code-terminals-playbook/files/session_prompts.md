# Session Prompts for Parallel Terminals

Copy-paste these prompts into your Claude Code sessions.

---

## Scenario 1: True Parallel

Use these when tasks are genuinely independent.

### Research Task
```
Research [TOPIC].

Deliverables:
- [Specific output 1]
- [Specific output 2]
- [Specific output 3]

Save to [filename].md
```

### Content Creation Task
```
Write [CONTENT TYPE] about [TOPIC].

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Save to [filename].md
```

---

## Scenario 2: Phased Parallel

Use these after your foundation is built.

### Feature Build (Post-Foundation)
```
Build [FEATURE NAME].

Context: Auth and database are already set up and working.

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Do NOT modify:
- Database schema
- Authentication system
- [Other foundation elements]
```

### Asking Claude What's Independent
```
Look at our plan.md file.

Tell me which remaining tasks can be built independently - meaning if they had no context of what other tasks are doing, they could still be completed successfully.

For each independent task, write me a prompt I can use in a separate terminal session.
```

---

## Scenario 3: Relay Race

Use these for sequential phase handoffs.

### Phase Start
```
Read plan.md. Execute Phase [N]: [Phase Name].

As you work:
- Check off completed tasks in plan.md
- Add any architecture decisions to decisions.md
- Document anything the next session needs to know

When done, summarize what was completed and what's ready for Phase [N+1].
```

### Phase Continue (After Previous Completes)
```
Read plan.md. Phase [N-1] is complete.

Execute Phase [N]: [Phase Name].

Reference decisions.md for any architectural context from previous phases.

Check off tasks as you complete them.
```

### Plan Guardian Check-In
```
We just completed Phase [N] in another terminal.

Can you check the codebase against plan.md and tell me:
1. Have we finished everything in Phase [N]?
2. Are there any issues or gaps?
3. Is anything missing that Phase [N+1] will need?
```

---

## Claude MD Instructions

Add this to your CLAUDE.md for automatic plan tracking:

```
## Plan Tracking

When working on this project:
- Always check plan.md before starting work
- Check off tasks as you complete them
- Document any decisions that deviate from the plan in decisions.md
- If you encounter blockers, note them in the relevant phase section
```
