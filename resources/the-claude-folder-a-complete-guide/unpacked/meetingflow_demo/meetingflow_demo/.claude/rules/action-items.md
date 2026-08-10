---
paths:
  - "src/handlers/actions*"
  - "src/services/actions*"
---

# Action Item Rules

## Extraction Patterns

Look for these signals in transcripts:
- "I'll do X by Y" -> owner = speaker, deadline = Y
- "Can you handle X?" -> owner = person addressed, deadline = next meeting
- "We need to X" -> owner = unassigned (flag for manual assignment)
- "Action item:" or "TODO:" -> explicit action item

## Required Fields

Every action item must have:
- `description`: what needs to be done (one sentence)
- `owner`: who is responsible (speaker name from transcript)
- `deadline`: when it's due (ISO date, infer from context if not explicit)
- `status`: always starts as "pending"
- `source_meeting_id`: link back to the meeting
- `confidence`: how certain we are this is an action item (0.0-1.0)

## Storage

- Store in Supabase `action_items` table
- If confidence < 0.7, mark as "needs_review"
- Duplicate detection: check against last 30 days of action items by owner + keyword similarity
