---
name: auto-follow-up
description: Automatically draft follow-up emails after meetings. Use when a meeting transcript is processed, when the user mentions sending follow-ups, or when action items are extracted from a meeting.
allowed-tools: Read, Write, Edit, Grep, Glob
---

When a meeting transcript has been processed, automatically draft a follow-up email.

## Steps

1. Read the processed transcript and extracted action items
2. Determine the meeting type:
   - Internal standup -> brief, bullet-point format
   - Client meeting -> professional, detailed format
   - Executive review -> concise, decision-focused format
3. Draft the email following rules in `@../../rules/email-drafting.md`
4. Include all action items with owners and deadlines
5. Save draft to Supabase `email_drafts` table with status "draft"
6. Present the draft for review before sending

## Tone Reference

Reference recent sent emails in `src/templates/` to match established tone.
Never auto-send. Always present for approval first.
