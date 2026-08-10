# Linear API Patterns

## Rate Limiting
- 1,500 requests per hour per API key
- Batch issue creation: max 50 per request
- If rate limited, wait 60 seconds and retry

## Common MCP Tools

| Tool | Use For |
|------|---------|
| `list_teams` | Get available teams and IDs |
| `list_issues` | Fetch backlog, in-progress items |
| `create_issue` | Create a single task |
| `update_issue` | Change status, assignee, estimate |
| `list_labels` | Get available labels for the workspace |

## Priority Mapping

| User Says | Linear Priority |
|-----------|----------------|
| Urgent | 1 |
| High | 2 |
| Medium | 3 |
| Low | 4 |

## Pagination

When fetching issues, Linear returns max 50 per page.
Always check `pageInfo.hasNextPage` and use `pageInfo.endCursor` for pagination.
