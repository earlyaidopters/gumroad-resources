# Description Field: Bad vs Good

The description is the single most important field in your skill. It determines
whether Claude loads your skill or ignores it.

Formula: WHAT it does + WHEN to use it + KEY trigger phrases

---

## Pair 1: Project Management

### Bad
```yaml
description: Helps with projects.
```
Why it fails: Too vague. Claude has no idea when to trigger this. "Projects" could
mean anything — school projects, home renovation, software development.

### Good
```yaml
description: Plans and creates sprint tasks in Linear from project
  context. Use when user says "plan this sprint", "create sprint
  tasks", "help me plan the next sprint", or "break this down into
  tickets". Works with Linear MCP for task creation.
```
Why it works: Specific tool (Linear), specific actions (sprint planning, task creation),
specific trigger phrases users would actually say.

---

## Pair 2: Data Processing

### Bad
```yaml
description: Implements a sophisticated multi-paradigm data
  transformation pipeline with configurable ETL stages.
```
Why it fails: Too technical. No user has ever said "I need a multi-paradigm data
transformation pipeline." Zero trigger phrases. Reads like a PhD abstract.

### Good
```yaml
description: Cleans, validates, and transforms CSV files for
  analysis. Use when user says "clean this CSV", "fix my data",
  "prepare this spreadsheet for analysis", or uploads a .csv
  file that needs processing.
```
Why it works: Plain language actions, mentions the file type (.csv), includes
phrases real humans actually type.

---

## Pair 3: Design Handoff

### Bad
```yaml
description: Creates sophisticated multi-page documentation systems.
```
Why it fails: What documentation? For whom? When? This could be anything from
API docs to a school report.

### Good
```yaml
description: Analyzes Figma design files and generates developer
  handoff documentation. Use when user uploads .fig files, asks
  for "design specs", "component documentation", or
  "design-to-code handoff".
```
Why it works: Specific input (Figma files), specific output (dev handoff docs),
specific trigger phrases, mentions file type.

---

## Pair 4: Customer Onboarding

### Bad
```yaml
description: Manages customer accounts and subscriptions for
  our payment platform.
```
Why it fails: Missing triggers. What would a user say to invoke this? Also
"our platform" — which one?

### Good
```yaml
description: End-to-end customer onboarding workflow for PayFlow.
  Handles account creation, payment setup, and subscription
  management. Use when user says "onboard new customer", "set up
  subscription", or "create PayFlow account".
```
Why it works: Names the platform, lists the workflow steps, includes trigger phrases.

---

## Pair 5: Over-triggering vs Precise

### Bad (over-triggers)
```yaml
description: Processes documents and analyzes data for business use.
```
Why it fails: Every prompt involving any document or data would trigger this.
Way too broad. Claude would load it constantly.

### Good (precise scope)
```yaml
description: Advanced statistical analysis for CSV datasets.
  Performs regression, clustering, and hypothesis testing. Use
  for statistical modeling and quantitative analysis. Do NOT use
  for simple data exploration (use data-viz skill instead) or
  general spreadsheet tasks.
```
Why it works: Defines scope clearly, includes NEGATIVE triggers ("Do NOT use for..."),
distinguishes itself from related skills.

---

## Pair 6: MCP Enhancement

### Bad
```yaml
description: Works with Sentry to look at errors.
```
Why it fails: Vague action ("look at"), no workflow context, no trigger phrases.

### Good
```yaml
description: Automatically analyzes and fixes detected bugs in
  GitHub Pull Requests using Sentry's error monitoring data via
  MCP. Use when user says "review this PR for Sentry errors",
  "check what Sentry says about this code", or "fix the bugs
  Sentry found". Requires Sentry MCP server connected.
```
Why it works: Clear workflow (analyze PR + Sentry data + suggest fixes),
specific triggers, notes the MCP dependency.

---

## The Pattern

Every good description follows the same structure:

```
[Specific action verb] + [what it works with] + [what it produces].
Use when user [trigger phrase 1], [trigger phrase 2], or [trigger phrase 3].
[Optional: negative triggers or dependencies].
```
