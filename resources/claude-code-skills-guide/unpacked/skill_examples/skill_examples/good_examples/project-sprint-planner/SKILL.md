---
name: project-sprint-planner
description: Plans and creates sprint tasks in Linear from project context. Use when user says "plan this sprint", "create sprint tasks", "help me plan the next sprint", or "break this down into tickets". Works with Linear MCP for task creation.
metadata:
  author: TeamHub
  version: 1.0.0
  mcp-server: linear
---

# Sprint Planner

## Instructions

### Step 1: Gather Context

Ask the user for:
- **Sprint goal** (one sentence describing the sprint's purpose)
- **Sprint duration** (default: 2 weeks)
- **Team members** (names and roles)

Then fetch current project state:
```
Use Linear MCP: list_issues with status "In Progress" or "Backlog"
```

### Step 2: Analyze Capacity

Based on team size and sprint duration, calculate:
- **Total story points available**: team_size x 10 points per person per sprint
- **Already committed**: sum of in-progress issue points
- **Available capacity**: total - committed

Tell the user: "Your team has ~{available} points of capacity this sprint."

### Step 3: Create Task Breakdown

For each piece of work the user describes:

1. **Title**: Short, action-oriented (e.g., "Add password reset flow")
2. **Description**: What "done" looks like in 2-3 sentences
3. **Estimate**: Story points (1 = few hours, 3 = a day, 5 = 2-3 days, 8 = a week)
4. **Priority**: Urgent / High / Medium / Low
5. **Labels**: Feature, Bug, Tech Debt, or Infrastructure

Present the full list to the user for approval BEFORE creating anything.

### Step 4: Create in Linear

After user approves:
```
For each task, call Linear MCP: create_issue
Parameters:
  - title: from breakdown
  - description: from breakdown
  - estimate: story points
  - priority: mapped to Linear priority (1-4)
  - labels: from breakdown
  - assignee: if user specified
```

Confirm each creation. If any fail, report which ones and why.

### Step 5: Summary

Provide a sprint summary:
- Total tasks created
- Total story points committed
- Capacity remaining
- Any risks (over-committed, unbalanced workload)

## Examples

### Example 1: Small Sprint

User says: "Plan a sprint for our auth improvements"

Actions:
1. Fetch current Linear backlog
2. Ask about team and goals
3. Suggest breakdown: "Add SSO login" (5pts), "Fix session timeout bug" (3pts), "Add rate limiting" (3pts)
4. User approves
5. Create 3 issues in Linear

Result: 3 tasks created, 11 points committed, sprint ready.

### Example 2: Large Feature Breakdown

User says: "Break down the checkout redesign into sprint tasks"

Actions:
1. Ask user to describe the checkout flow changes
2. Break into atomic tasks (no task > 8 points)
3. Suggest ordering by dependency
4. Flag if total exceeds sprint capacity

## Troubleshooting

**Error: "Issue creation failed — authentication error"**
Cause: Linear API token expired or missing permissions.
Solution: Ask user to reconnect Linear in Settings > Extensions.

**Error: "Team not found"**
Cause: Team name doesn't match Linear workspace.
Solution: Use `list_teams` via Linear MCP to show available teams.

**Sprint seems overloaded**
If total points > 80% of capacity, warn:
"This sprint is at {percent}% capacity. Consider moving {lowest_priority_task} to the backlog."
