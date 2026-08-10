# The Council Skill for Claude Code 👑
📎 **File:** [`README.md`](files/README.md)

📎 **File:** [`council.skill`](files/council.skill)

The Council skill connects Claude Code to OpenAI and Google models via OpenRouter.

Instead of switching between AI tools, you stay in Claude Code and tap into other

models whenever you need a second opinion.

**HOW IT WORKS**

***You trigger it three ways:***

1. "Get a second opinion" -- Claude looks at what you're working on, picks the

right model automatically (Codex for bugs, Gemini for frontend), and asks it.

2. "Ask Gemini about this" -- Goes straight to the model you named, no routing.

3. "Get a few opinions" -- Fans out to both competitors and returns both takes.

Before running anything, Claude plays back the plan so you can approve or edit it:

Council Plan:

Fix login redirect loop -> openai/gpt-5.3-codex [bug_fix]

Redesign settings page -> google/gemini-3.1-pro [frontend]

Proceed?

After the council responds, Claude synthesizes the result -- agreeing, pushing back,

or taking the best parts -- and then executes.

SETUP

1. Install council.skill into Claude Code

2. Run any council command -- it will create your ~/.env template automatically

3. Add your OpenRouter API key (free at openrouter.ai/keys)

4. Done

One key. Every model. Claude stays in charge.

---

# **Love my free stuff? You'll love my paid ones much more.**

[JOIN NOW](https://www.skool.com/earlyaidopters/about)
