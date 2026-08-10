# MeetingFlow

AI-powered meeting assistant that processes transcripts, extracts action items, and automates follow-ups.

## Commands

```bash
npm run dev          # Start local server
npm run test         # Run test suite (Jest)
npm run lint         # ESLint + Prettier
npm run build        # Production build
```

## Architecture

- Express API, Node 20, TypeScript strict mode
- Fireflies API for meeting transcripts
- Resend for transactional email
- Supabase for storage (meetings, action items, contacts)
- All handlers in `src/handlers/`
- Shared types in `src/types/`

## Key Conventions

- Use zod for all request validation
- Return shape is always `{ data, error }`
- Never expose stack traces in API responses
- Use the logger module, not console.log
- Date handling: always use date-fns, always store UTC

## What This Project Does

1. Pulls meeting transcripts from Fireflies after every call
2. Extracts action items with owners and deadlines
3. Drafts follow-up emails matched to the meeting tone
4. Updates a Supabase dashboard with meeting analytics
5. Generates weekly summaries of commitments across all meetings

## Personal Overrides

For personal preferences that don't belong in the shared repo, create a `CLAUDE.local.md` in the project root and add it to `.gitignore`. Import it here with @CLAUDE.local.md so Claude reads it alongside this file.

## Watch Out For

- Fireflies webhook payload changed in v3. Use `transcript.sentences` not `transcript.text`
- Supabase RLS is ON. Every query needs the service role key for admin operations
- Email rate limit is 100/hour on the Resend free tier
