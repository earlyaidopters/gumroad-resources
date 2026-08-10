---
name: action-tracker
description: Automatically extract and track action items from meeting transcripts. Use when processing transcripts, reviewing meeting notes, or when the user asks about outstanding tasks or deadlines.
allowed-tools: Read, Write, Edit, Grep, Glob
---

Scan meeting transcripts for action items and manage them.

## Extraction

1. Parse transcript for action item signals (see `@../../rules/action-items.md`)
2. For each candidate:
   - Extract description, owner, deadline
   - Score confidence (0.0-1.0)
   - Check for duplicates against last 30 days
3. Store in Supabase `action_items` table
4. Flag items with confidence < 0.7 for manual review

## Tracking

When asked about outstanding tasks:
1. Query Supabase for pending/overdue items
2. Group by owner
3. Highlight overdue items with days past deadline
4. Suggest follow-up actions for stale items (> 7 days without update)

## Integration

After extraction, trigger the auto-follow-up skill to include items in the email draft.
