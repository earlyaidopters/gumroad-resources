---
paths:
  - "src/handlers/transcript*"
  - "src/services/fireflies*"
---

# Transcript Processing Rules

## Fireflies API

- Always use v3 endpoint: `https://api.fireflies.ai/graphql`
- Transcript data lives in `transcript.sentences`, NOT `transcript.text`
- Each sentence has: `text`, `speaker_name`, `start_time`, `end_time`
- Speaker identification is probabilistic. Always include confidence scores.

## Processing Pipeline

1. Receive webhook from Fireflies (POST /api/webhooks/fireflies)
2. Validate payload with zod schema in `src/schemas/fireflies.ts`
3. Group sentences by speaker
4. Run through the action item extractor (separate skill handles this)
5. Store raw transcript + processed version in Supabase

## Quality Rules

- Never truncate transcripts. Store the full version.
- If speaker_name is "Unknown", flag it in the processed output
- Meeting duration > 90 minutes? Split into logical segments by topic shifts
