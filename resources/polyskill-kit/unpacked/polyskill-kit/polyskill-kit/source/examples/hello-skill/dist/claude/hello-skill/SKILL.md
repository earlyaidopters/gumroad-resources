---
name: hello-skill
description: >
  Demonstrates how the polyskill optimizer works. Use when you want to see a worked example that round-trips between Claude Code and Codex with every primitive exercised: dynamic injection, MCP
  dependencies, bash tool declarations, and front-loaded descriptions.
allowed-tools: git:* ls
---

# hello-skill

A worked example that exercises every cross-runtime primitive in one place.

## What this skill does

When activated, it greets the user, shows the current git state, and suggests a next action.

## Steps

1. Greet the user by name if you know it; otherwise just say "Hi".
2. Inspect the working tree state:

!`git status --short`

3. If there are uncommitted changes, suggest committing or stashing.
4. If the tree is clean, suggest the next step from the README.

## Notes

- This is a demo skill. Real skills should do something useful.
- The dynamic injection above runs natively in Claude Code; in Codex it gets rewritten as prose telling the model to run the command itself.

## Required MCP servers

- **github** — GitHub MCP server for reading repo state (https://api.githubcopilot.com/mcp/)
