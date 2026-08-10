---
name: launch-offer
description: Chain all launch skills together. One command to go from idea to complete launch kit with market research, sales page, emails, social posts, and a PDF brief.
context: fork
agent: general-purpose
allowed-tools: Read Write Edit Bash Glob Grep WebSearch WebFetch Skill
---

# Launch Offer Pipeline

CRITICAL: Run ALL 5 steps below AUTOMATICALLY without stopping. Do NOT pause between steps. Do NOT ask the user to continue. Do NOT wait for confirmation. Execute every step back-to-back in one continuous run. This is an autonomous pipeline.

Run the complete launch pipeline for: "$ARGUMENTS"

## Setup

The output folder is `outputs/launch/!`date +%Y-%m-%d`/{slug}/` where {slug} is the offer name lowercased with spaces replaced by hyphens (e.g. "AI Automation Workshop" becomes "ai-automation-workshop").

Create this directory first. Then execute all 5 steps without stopping.

## Step 1: Market Research
Run `/market-scan` with argument: "$ARGUMENTS"
Produces `01_market_scan.md`. Immediately continue to Step 2.

## Step 2: Sales Page
Run `/sales-page` with argument: "$ARGUMENTS"
Reads market scan, produces `02_sales_page.md`. Immediately continue to Step 3.

## Step 3: Email Sequence
Run `/email-sequence` with argument: "$ARGUMENTS"
Reads previous outputs, produces `03_email_sequence.md`. Immediately continue to Step 4.

## Step 4: Social Announcement
Run `/social-announce` with argument: "$ARGUMENTS"
Reads all previous outputs, produces `04_social_posts.md`. Immediately continue to Step 5.

## Step 5: Launch Brief PDF
Run `/launch-brief` with argument: "$ARGUMENTS"
Reads ALL previous outputs, produces `05_launch_brief.pdf`. Open the PDF when done.

## Completion

After all 5 steps finish, list the output folder contents and open the PDF. Report what was generated.

REMINDER: Do NOT pause, ask for confirmation, or wait between steps. Run all 5 back-to-back autonomously.
