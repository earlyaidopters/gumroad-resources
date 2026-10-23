# Skill Audit Prompt

Find which skills still earn their place in your AI setup.

## Start here

1. Open Claude Code or Codex on the computer that contains your skills. Use an empty working folder where the audit may create its report.
2. Open SKILL-AUDIT-PROMPT.txt, copy the whole file and paste it into a new chat. This is a task prompt; you do not need to install another skill.
3. Tell the assistant which project folders to include. Allow it to read only the relevant skill folders and session history you want audited.
4. Open the new skill-audit-YYYY-MM-DD/report.html in your browser. It works offline without the adjacent JSON file. Review the source-coverage section before acting on the recommendations.

The assistant needs local file access. A browser-only chat without access to your computer cannot audit your local files. If your tool cannot read usage history, the report should say usage is unknown.

## What is included

- SKILL-AUDIT-PROMPT.txt: ready-to-paste prompt, including run notes that clarify missing history, counting, privacy and report output.
- SKILL-AUDIT-PROMPT.md: unchanged original prompt prepared for the video, kept for reference. Use the .txt edition for a new audit.
- THREE-QUESTIONS.md: the keep, merge and review checklist, plus the just-in-time loading idea.

## What you should receive

One offline HTML report with an inventory, usage heatmap, top-used-skills chart, overlap grid, reasons for each recommendation and proposed merges. A separate JSON export lets you reuse the data. Neither is a precomputed report about your machine: your assistant creates them from the evidence it can access.

The audit does not remove skills. Check every Delete or Merge recommendation before asking for a separate cleanup. Missing history and a low use count alone do not prove a skill is unnecessary.

## If the result looks wrong

Check which folders and dates were covered. Ask the assistant to reconcile the summary against its rows, identify missing logs and distinguish observed skill loads from mentions. If report writing is blocked, get the findings in chat rather than widening access to unrelated folders.

Prepared 23 October 2026. AI recommendations can vary by tool, available history and model. The .txt edition preserves the original prompt and adds explicit run notes; it does not promise a particular number of deletions or a speed improvement.

Learn with Mark: https://www.skool.com/earlyaidopters/about
