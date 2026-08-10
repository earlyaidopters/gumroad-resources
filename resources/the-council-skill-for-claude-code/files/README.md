# Council Skill — Setup Guide

Get second opinions from Gemini and Codex without leaving Claude Code.

## Requirements

- Claude Code installed
- OpenRouter API key (free to get, pay per use)

## Step 1: Get Your OpenRouter Key

1. Go to https://openrouter.ai/keys
2. Create an account and generate an API key
3. Add it to your environment:

```bash
echo 'OPENROUTER_API_KEY=your-key-here' >> ~/.env
```

## Step 2: Install the Skill

```bash
# In Claude Code, run:
/skills install council.skill
```

Or manually unzip and place the `council/` folder inside `~/.claude/skills/`

## Step 3: Use It

**Get a second opinion (auto-routed):**
```
get a second opinion on this bug
```

**Ask a specific model:**
```
ask Gemini about this frontend
ask Codex to review this function
```

**Fan out to all competitors:**
```
get a few opinions on this architecture decision
```

**Explicit slash command:**
```
/council
```

## Customise the Routing

The config lives at `~/.claude/skills/council/references/council_config.json`.

Edit it to change which model handles what:

```json
"defaults": {
  "bug_fix": "openai/gpt-5.3-codex",
  "frontend": "google/gemini-3.1-pro-preview",
  "architecture": "anthropic/claude-opus-4-6",
  "refactor": "openai/gpt-5.3-codex",
  "general": "google/gemini-3.1-pro-preview"
}
```

You can also type: "change the bug fix model to Gemini" and Claude will update the config for you.

## Check Latest Models

```bash
python ~/.claude/skills/council/scripts/council.py models
```

This hits OpenRouter live and shows the latest available models — no stale data.

## Support

Join the Early AI Dopters community: https://www.skool.com/earlyaidopters/about
