---
description: Pull a meeting transcript from Fireflies and process it end-to-end
argument-hint: [meeting-id or "latest"]
---

## Meeting to Process

!`node src/scripts/fetch-transcript.js $ARGUMENTS`

## Current Action Items for Context

!`node src/scripts/list-pending-actions.js --limit 10`

Take the transcript above and:

1. Extract all action items with owners and deadlines
2. Flag any items with confidence below 0.7 for manual review
3. Draft a follow-up email appropriate for the meeting type
4. Store everything in Supabase
5. Show me the email draft before sending
