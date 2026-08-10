---
description: Debug a failed Fireflies webhook delivery
argument-hint: [webhook-id]
---

## Recent Webhook Logs

!`node src/scripts/check-webhook-logs.js $ARGUMENTS`

## Fireflies API Status

!`curl -s https://api.fireflies.ai/graphql -H "Authorization: Bearer $FIREFLIES_API_KEY" -d '{"query":"{ user { name } }"}' | jq .`

Investigate why this webhook failed:

1. Check if the payload matches our zod schema
2. Verify the Fireflies API key is valid
3. Check Supabase connection
4. Look for rate limiting or timeout issues
5. Suggest a fix and test it
