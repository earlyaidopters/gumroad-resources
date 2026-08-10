---
description: Generate a weekly summary of all meetings and outstanding action items
---

## This Week's Meetings

!`node src/scripts/list-meetings.js --since "7 days ago"`

## All Pending Action Items

!`node src/scripts/list-pending-actions.js --all`

## Overdue Items

!`node src/scripts/list-overdue-actions.js`

Generate a weekly summary that includes:

1. **Meetings this week**: count, total hours, key participants
2. **Action items created**: total, by owner, by status
3. **Overdue items**: list with original deadlines and owners
4. **Upcoming deadlines**: items due in the next 7 days
5. **Patterns**: any recurring topics or frequently mentioned concerns

Format as a clean report I can share with the team.
