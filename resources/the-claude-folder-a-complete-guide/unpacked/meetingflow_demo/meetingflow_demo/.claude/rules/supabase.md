---
paths:
  - "src/services/db*"
  - "src/migrations/**"
  - "supabase/**"
---

# Supabase Rules

## Connection

- Always use the service role key for server-side operations
- RLS is enabled on all tables. Client queries go through RLS, server queries bypass with service role.
- Connection pooling via `@supabase/supabase-js` singleton in `src/services/db.ts`

## Schema

Key tables:
- `meetings`: id, title, date, duration_minutes, fireflies_id, transcript_raw, transcript_processed
- `action_items`: id, meeting_id, description, owner, deadline, status, confidence
- `contacts`: id, name, email, role, last_meeting_date
- `email_drafts`: id, meeting_id, subject, body, status, sent_at

## Migration Rules

- Always create migrations via `npx supabase migration new [name]`
- Test migrations locally before pushing: `npx supabase db reset`
- Never modify existing migrations. Create new ones.
