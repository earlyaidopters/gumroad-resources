---
name: brain-brief
description: Chain all brain skills together. One command to search your Obsidian vault, extract insights, and synthesize a comprehensive brief on any topic.
context: fork
agent: general-purpose
allowed-tools: Read Write Edit Bash Glob Grep Skill
---

# Brain Brief Pipeline

CRITICAL: Run ALL 3 steps below AUTOMATICALLY without stopping. Do NOT pause between steps. Do NOT ask the user to continue. Do NOT wait for confirmation. Execute every step back-to-back in one continuous run. This is an autonomous pipeline.

Search, extract, and synthesize everything in the Obsidian vault about: "$ARGUMENTS"

## Setup

Output folder: `outputs/brain/!`date +%Y-%m-%d`/{slug}/` where {slug} is the topic lowercased with hyphens.

Create this directory first. Then execute all 3 steps without stopping.

## Step 1: Search the Vault
Run `/brain-search` with argument: "$ARGUMENTS"
Produces `01_search_results.md`. Immediately continue to Step 2.

## Step 2: Extract Insights
Run `/brain-extract` with argument: "$ARGUMENTS"
Reads search results, produces `02_extracted_insights.md`. Immediately continue to Step 3.

## Step 3: Synthesize Brief
Run `/brain-synthesize` with argument: "$ARGUMENTS"
Reads all previous outputs, produces `03_synthesis.md`.

## Completion

List the output folder contents. Report what was found and synthesized.

REMINDER: Do NOT pause, ask for confirmation, or wait between steps. Run all 3 back-to-back autonomously.
