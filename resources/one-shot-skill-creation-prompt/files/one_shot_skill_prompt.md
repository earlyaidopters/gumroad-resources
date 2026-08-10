# One-Shot Skill Creation Prompt

Use this prompt with Claude Code after installing the Gemini skill. Replace the file path with your own screen recording.

## Prerequisites

1. Install the Gemini skill globally in Claude Code (link below)
2. Have a Gemini API key set in your environment (aistudio.google.com > Get API Key)
3. Record a screen share (with audio) of yourself doing the process you want to automate
4. Save the recording to a folder Claude Code can access

## The Prompt

```
I have a screen recording of me executing a process end-to-end. I need you to:

1. Take the attached video file and send it to the Gemini Video Understanding API
2. Watch the entire recording and extract a comprehensive, detailed SOP of the full process

When building the SOP, account for:
- Every step I take, in order, no matter how small
- The "devils in the details" -- micro-decisions, mouse movements, tab switches, and small choices that reveal how I actually work vs. how I might describe it
- Anything I say under my breath, in passing, or as a side comment -- these offhand remarks often contain the most valuable tacit knowledge
- Moments where I pause, hesitate, or backtrack -- these reveal decision points and quality checks
- Any external references I pull up (websites, posts, examples) -- document what I looked at and why it mattered
- My tone preferences, style choices, and the reasoning behind rejections (e.g., "too corporate," "doesn't sound like me")
- The difference between what I asked for and what I accepted -- the gap between these two is where the real standards live

Structure the SOP as:
- A clear phase-by-phase breakdown of the process
- Each phase with numbered steps
- A dedicated "Nuances and Tacit Knowledge" section capturing everything that wouldn't make it into a typical SOP
- A "Quality Standards" section based on what I rejected and why
- A "Style References" section if I referenced any external examples or creators

Save the SOP to a markdown file in this directory.

Once the SOP is complete, I want you to invoke the skill creator to turn this SOP into a fully functional Claude Code skill, including:
- A SKILL.md with proper trigger conditions
- Any reference files needed (style guides, templates)
- Human-in-the-loop checkpoints using the AskUserQuestion tool where my judgment is needed
- Clear invocation instructions

Before creating anything, show me your plan first.

@"path/to/your/recording.mp4"
```

## Tips for Better Results

- **Longer recordings = richer skills.** A 4-minute recording gives you a basic skill. A 20-minute recording captures the edge cases and judgment calls that make a skill great.
- **Talk while you work.** Narrate your thought process out loud. "I'm choosing this because..." and "This doesn't feel right because..." are gold for the SOP extraction.
- **Show your references.** If you pull up an example of what "good" looks like, Gemini captures that. Open the tweet, the post, the design -- don't just describe it.
- **Don't clean up your process.** The backtracking, the "actually no, change that" moments -- those ARE the skill. A messy recording makes a better skill than a rehearsed one.
- **Compress before sending.** Ask Claude Code to compress large video files before uploading to save on API costs. A 500MB file can often be compressed to 50MB without losing useful information.

## Gemini Skill (Required)

Install this skill in Claude Code to enable video understanding:

https://github.com/google-gemini/gemini-skills/blob/main/skills/gemini-api-dev/SKILL.md

You can install it by giving Claude Code the URL directly, or by downloading the SKILL.md file into your `.claude/skills/` directory.

## Need a Gemini API Key?

1. Go to aistudio.google.com
2. Click "Get API Key" in the left sidebar
3. Create a new key or use an existing one
4. Add it to your environment: `GOOGLE_API_KEY=your_key_here`
