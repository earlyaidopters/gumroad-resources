---
paths:
  - "src/handlers/email*"
  - "src/services/email*"
  - "src/templates/**"
---

# Email Drafting Rules

## Tone Matching

- Internal team emails: casual, direct, bullet points for action items
- Client-facing emails: professional but warm, no jargon, specific next steps
- Executive summaries: concise, lead with decisions needed, data-backed

## Structure

Every follow-up email must include:
1. One-line meeting summary (what was discussed)
2. Action items with owners and deadlines (bulleted)
3. Decisions made (if any)
4. Next meeting date/time (if scheduled)

## Sending Rules

- Use Resend API via `src/services/email.ts`
- Rate limit: max 100 emails/hour (free tier)
- Always BCC the meeting organizer
- Never auto-send without preview. Always draft first, then confirm.
- Subject line format: "Follow-up: [Meeting Title] - [Date]"
