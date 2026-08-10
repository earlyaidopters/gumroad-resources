---
identity:
  name: hello-skill
  description:
    full: >
      Demonstrates how the polyskill optimizer works. Use when you want to see
      a worked example that round-trips between Claude Code and Codex with
      every primitive exercised: dynamic injection, MCP dependencies, bash
      tool declarations, and front-loaded descriptions.
    short: Polyskill round-trip demo
activation:
  triggers:
    - hello-skill
    - polyskill demo
    - cross-runtime example
  auto_invoke: true
  user_invoke: true
dependencies:
  mcp:
    - name: github
      description: GitHub MCP server for reading repo state
      url: https://api.githubcopilot.com/mcp/
      transport: streamable_http
  bash:
    - pattern: git:*
      reason: read repository state
    - pattern: ls
      reason: list files in scope
  env: []
resources:
  scripts: []
  references: []
  assets: []
behavior:
  dynamic_injections:
    - placeholder: '{{injection_1}}'
      command: git status --short
      codex_fallback: First, run `git status --short` and review the output before continuing.
constraints:
  max_body_lines: 500
  recommended_body_tokens: 5000
---

# hello-skill

A worked example that exercises every cross-runtime primitive in one place.

## What this skill does

When activated, it greets the user, shows the current git state, and suggests a next action.

## Steps

1. Greet the user by name if you know it; otherwise just say "Hi".
2. Inspect the working tree state:

{{injection_1}}

3. If there are uncommitted changes, suggest committing or stashing.
4. If the tree is clean, suggest the next step from the README.

## Notes

- This is a demo skill. Real skills should do something useful.
- The dynamic injection above runs natively in Claude Code; in Codex it gets rewritten as prose telling the model to run the command itself.
