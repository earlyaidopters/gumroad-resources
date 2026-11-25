# Claude + Gemini editable runbook

Start with one workflow. Neon means Gemini 4 Neon. Fable, Opus and Sonnet are Claude models. Use the guide to choose a role for each model. Replace the bracketed inputs before sending a prompt. Save the replies and their evidence with the project.

## Handoff brief

- **From and to** [Who sends the brief and who receives it, including the models shown in each app]
- **Goal** [The decision or behavior you want to see]
- **Inputs and version** [File, commit, test URL, or clip range, plus the state that matters]
- **Boundaries** [Which files may change, what to leave alone, and what sends the work back to you]
- **Return format** [The exact file, fields, decision or report you expect back]
- **Evidence and stop rule** [What must pass, what proves it, and how many tries to allow]
- **Open questions** [Assumptions the next person or model should confirm before changing the work]

## Before the first run

- **Test the input**. Ask each model to read one harmless sample of the actual input. For video or screenshots, ask it to identify a visible detail you can check.
- **Check the workspace**. Confirm which project copy each thread can read or edit. Use separate branches or file scopes if both agents need to write. Keep approval prompts on for the trial.
- **Define done**. Write the expected output, evidence you will accept and when to stop. For each claimed action, ask for something you can inspect. Mark an action blocked if the required tool or input is unavailable.

## 01. The committee

Claude leads. Neon reviews from different viewpoints.

**What to bring**

Give Claude a homepage URL or screenshots, the audience you’re trying to reach, and the action you want visitors to take. Include the MiroFish link if it’s part of your setup.

1. Give Claude the material and assign two distinct viewpoints. Decide what each reviewer is trying to do on the page.
2. Let each reviewer work from the same source. Ask for the exact page text or visible element, the confusion it caused, and one suggested change.
3. Have Claude group repeated objections, retain disagreements, and suggest which edit to test with a real visitor.

### Reviewer prompt, once per persona

```text
Review [PAGE COPY OR SCREENSHOTS] as [PERSONA]. You came here to [VISITOR GOAL]. Return up to three objections. For each, quote the relevant page text or identify the visible element, explain what you would do next, and propose one edit. Label each sample visitor quote SIMULATED. Use quotation marks for page copy only when you can match the text exactly. Flag any part of the page you could not see.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Claude synthesis prompt

```text
Here are two independent simulated reviews of [PAGE VERSION]. Group objections that point to the same issue, preserve any disagreements, and rank the two changes worth testing. Cite the page evidence for each. Return one question I can ask a real visitor to check the biggest assumption. Say whether these came from a documented MiroFish run or from chat-based simulations. If MiroFish was used, attach the run report.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. Claude to reviewer
- **Pinned input**. Homepage copy v1, returning visitor who wants to know what a fit call involves.
- **What comes back**. Up to three objections with page excerpts and one edit per objection. Return to Claude before changing the page.

**Worked example**

The returning visitor sees “Book a call” before learning what happens on the call. An edit to test would say “Book a 15-minute fit call” if that reflects the actual offer.

**Check the result**

Each proposed edit names a specific section, button or line in the source. Check the quoted page text yourself. Label generated visitor responses as simulated.

**Manual route**

Run the personas in separate chats using the same pasted page copy. Bring the replies back to Claude. MiroFish is an optional standalone simulation tool with its own setup and service keys.

**If the workflow stalls**

Two reviewers give generic feedback. Give each a concrete visitor goal and require a page quote for every objection. If they both react to the same sentence, capture the different reasons before combining the feedback.

**A more exact check**

Start with two or three people who have different goals for the page. For example, a first-time visitor wants to understand the offer, a returning visitor wants to book a call, and a buyer with a budget wants pricing. Give each one a different question to answer. In a MiroFish run, set a cohort size and review the service requirements and costs before scaling it.

## 02. Independent opinions

Opus and Neon each make their own call.

**What to bring**

Send both models the same two feature options, five interview excerpts and time limit. Open separate threads and keep the answers hidden from each model until both respond.

1. Write one brief with both options, the decision deadline and the interview excerpts. Number the excerpts so you can find each source quickly.
2. Send the same brief to Opus and Neon in fresh threads without shared project context. Save both answers before showing either model the other reply.
3. Put both choices beside their cited lines. If priorities differ, decide which criterion matters most for this decision or collect the missing evidence.

### Shared decision brief, send unchanged to each model

```text
We have [TIME OR BUDGET LIMIT]. Option A is [A]. Option B is [B]. The decision criterion is [WHAT MATTERS MOST]. Use only [NUMBERED INTERVIEW EXCERPTS]. Choose A or B, cite one exact line with its interview number, and cite the strongest line against your choice. State what evidence would change your mind. If the evidence is too thin, say what you would collect next.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Comparison prompt, after both answers are saved

```text
Compare [ANSWER A] and [ANSWER B] against [ORIGINAL BRIEF AND EXCERPTS]. Check the quotes against the source. Identify which part of the disagreement comes from the evidence and which comes from different priorities. Give me one specific question to resolve any gap before I choose.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. You to each model
- **Pinned input**. Brief v1 with options A and B, five numbered excerpts and the one-feature limit.
- **What comes back**. One option, one exact quote and its interview number. Keep the reply private until both are saved.

**Worked example**

In the practice brief, Neon chose CSV export and cited interview 5, where the person says they mainly need to send the finished list. The line is present verbatim.

**Check the result**

Each answer picks one option and cites an exact line. Agreement is a reason to inspect the evidence. Repeated wording alone adds no independent source.

**Manual route**

Use two available Claude and Gemini chats. Remove names, email addresses and company details you don’t need before sharing the excerpts.

**If the workflow stalls**

Both answers choose the same feature and cite the same line. Check whether the other interviews support it and which segment the sample represents. Preserve the original replies before asking a model to reconcile them. To check whether ordering changed the recommendation, run another round in fresh chats with the option order reversed and the option IDs kept intact.

### A second interview exercise

Once you've tried the starter exercise, replace its brief with this balanced example. Run each answer in a fresh chat, with the same brief and prompt. Give each model the same decision criterion, or leave the criterion open and compare what each one weighs most.

```text
We have one sprint. Option A is one-click CSV export. Option B is saved filters.
1. "I open the same list and rebuild the same filters every morning."
2. "I need the CSV before the weekly handoff. Copying rows takes me half an hour."
3. "I switch between three client views. Saved filters would save me time every day."
4. "I can copy rows in a pinch. My manager asks for a spreadsheet every Friday."
5. "We use this list differently on the support team and the sales team."
Pick one option. Quote the strongest line for it and the strongest line against it.
State which job you prioritized. Say what evidence could change your choice.
```

Either choice can be reasonable. Check every quote, compare which task and team each answer prioritized, and decide what to confirm with users before you commit.

## 03. Plan, then build

Claude Fable plans. Neon builds from the approved brief.

**What to bring**

Give Claude Fable your board columns, what a card contains, who can move it and what should happen after a page refresh. Ask it to plan the work before touching any files.

1. Ask Claude Fable for a plan. Include user actions, constraints, what can wait, and one edge case that changes the build.
2. Approve a first slice. Freeze the brief with the expected screens, allowed files and tests. If a product decision is still open, resolve it before handing it over.
3. Send the approved brief to Neon and ask it to restate the first slice and open questions. Ask it to build only that slice after scope is clear.

### Planner prompt

```text
Plan [PROJECT] before writing code. Given [USER ACTIONS], [CONSTRAINTS] and [CURRENT FILES], write a handoff with the smallest working slice, states and edge cases, which files may change, acceptance checks, and open decisions. Keep [OUT OF SCOPE] out of the first slice. Ask me to resolve any unknown that changes the behavior.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Builder prompt

```text
Use [APPROVED PLAN AND VERSION] to build only [FIRST SLICE]. Check the actual project before assuming file names. Summarize the allowed files, the expected behavior, and anything that would change the plan. After approval, make the changes and return the changed files and exact results of the checks in the brief. Report unrun checks as blocked.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. Fable to Neon
- **Pinned input**. Board plan v1, move a card and persist the new column after refresh.
- **What comes back**. A patch within the approved board files and the move-and-refresh test result. Ask before adding sync or changing the plan.

**Worked example**

First slice: move a card from To do to Doing and persist the move after refresh. Leave multi-user sync for a later slice.

**Check the result**

On the approved first slice, move a card from To do to Doing, refresh, and confirm it remains in Doing. Review which files changed against the approved scope.

**Manual route**

If Fable is unavailable, use Opus or another Claude model in your picker. Paste the approved brief into a separate Gemini chat and ask for a patch or implementation steps for you to apply.

**If the workflow stalls**

The builder discovers the approved plan assumes a feature the project lacks. Ask it to return the exact missing dependency and a smaller first slice. Reapprove the plan before it starts work.

**A more exact check**

For the board, decide how ordering persists, what happens after a failed save and whether multi-tab sync belongs in this slice. Add empty-column and keyboard cases if the first slice includes them. A useful first slice is small enough that you can rerun its full checklist after every edit.

## 04. Build two pieces in parallel

Neon builds the clip picker. Sonnet builds the exporter.

**What to bring**

Give both agents the same source clip and time format, such as start 8.000 seconds and end 16.000 seconds from the start of the video. Agree on what to do if the end comes before the start. Give each agent its own files.

1. Agree on a shared payload and how it passes between tools. Set units, allowed ranges and the end marker rule. Give both agents the same example and keep it fixed.
2. Assign Neon the picker and Sonnet the exporter. Give each its own files or branch. If the format must change, pause both sides and update the brief.
3. Run the picker output through the exporter using the same clip. Test one valid selection and one invalid selection before integrating.

### Neon picker prompt

```text
Build [PICKER] in [PICKER FILES] using [SHARED FORMAT V1] and [SOURCE CLIP]. A valid selection emits exactly the agreed fields in seconds. Reject missing values and invalid ranges using the agreed rules. Do not edit the exporter or shared format. Verify the valid and invalid fixtures and report the emitted values.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Sonnet exporter prompt

```text
Build [EXPORTER] in [EXPORTER FILES] using [SHARED FORMAT V1] and [SOURCE CLIP]. Consume the picker output unchanged. Test the provided valid and invalid fixtures. Report output duration and boundary frames for the valid range, plus the error for the invalid one. If the format is unclear, stop and ask before changing it.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. You to Neon and Sonnet
- **Pinned input**. Clip format v1 plus the same 30-second source. One agent owns the picker files and one owns the exporter files.
- **What comes back**. The picker emits agreed values. The exporter returns an eight-second clip for 8 to 16 and an error for the reversed range.

**Worked example**

With a 30-second source, start 8.000 and end 16.000 means an 8-second selection. Start 16.000 and end 8.000 must return an invalid-range error.

**Check the result**

The picker produces the agreed fields and the exporter consumes them unchanged. On the sample, check the actual first and last frames as well as the clip duration.

**Manual route**

Use separate chats and apply their changes one at a time if your workspace cannot isolate edits. Keep the same format and scope per chat.

**If the workflow stalls**

The picker reports seconds and the exporter reads milliseconds, or the builder changed a key. Stop before merging. Compare the exact picker payload against the sample. Fix whichever side drifted from the version both were given.

### Worked clip-picker contract

Copy this into both threads. Use a 30-second test clip you can open locally. In this example, the picker writes clip-selection.json and the exporter reads that file. Both sides use this same example until you issue a new version.

```text
Format version: 1
Source duration: 30 seconds
start_seconds: decimal seconds from the source start, inclusive
end_seconds: decimal seconds from the source start, exclusive
Rules: 0 <= start_seconds < end_seconds <= source duration
Valid JSON: {"start_seconds": 8.000, "end_seconds": 16.000}
Expected: 8-second selection, starts at source 8.000 and ends before source 16.000
Invalid JSON: {"start_seconds": 16.000, "end_seconds": 8.000}
Expected: invalid-range error, no export
```

If you need cuts at frames between keyframes, check the boundary frames against the source. Use an export method that can cut at the selected frame. At a frame boundary, allow at most one frame of rounding and record any difference. Run these checks on the combined output after both parts work individually.

## 05. Pick the model by the input

Neon reads the footage. Opus or Sonnet reads the transcript and comments.

**What to bring**

Give Neon a clip it can open. Give Claude the transcript and a sample of comments from the same video.

1. Pick the same source video and the same starting point for both models. Give Neon the footage and Claude the transcript plus a sample of viewer comments.
2. Ask each model to return evidence with timestamps or comment IDs. Keep direct observations and suggested interpretations easy to tell apart.
3. Align clips and spoken lines by timestamp. Ask Claude to suggest one editing decision to try and point to the evidence that led to it.

### Neon footage prompt

```text
Inspect [CLIP] from [START] to [END]. For each meaningful cut or visible change, return timestamp, what is visibly different, and any unclear section. Separate what you saw from your interpretation of energy or pacing. If you cannot open the clip, ask for timestamped stills.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Claude synthesis prompt

```text
Align [VISUAL NOTES], [TIMESTAMPED TRANSCRIPT] and [NUMBERED COMMENTS] from the same video. Identify the beats named in the comments, including praise and complaints. Cite a timestamp and a comment ID where relevant. Return one editing tactic to try in [MY VIDEO] and name the evidence that would tell me whether it worked. Identify any assumption the inputs cannot settle.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. Neon to Claude
- **Pinned input**. Visual notes for source clip v1, 00:00 to 01:00, and matching transcript and numbered comments.
- **What comes back**. A short timeline with visible evidence, viewer reactions, and one change to try. Mark missing timestamps explicitly.

**Worked example**

At 00:14 the shot cuts to a product demo. A comment calls out that demo. That supports trying an earlier demo in your next edit, with the effect on retention still to be measured.

**Check the result**

For a short clip, pick three timestamps and scrub to each on the same source clock. Verify the visual change and matching spoken line. Treat comments as individual reactions.

**Manual route**

If your Gemini chat cannot open video, supply timestamped stills or a shot list. Use the transcript for spoken words and leave timing or motion claims you cannot verify marked unknown.

**If the workflow stalls**

The clip and transcript start on different clocks. Find a visible or spoken anchor in both, such as the first demo cut and its line, then record the time offset before merging notes.

**A more exact check**

Have Neon return one row per event with source time, visible change and a short description. Sample three rows by seeking to their stated source times. A half-second difference is a workable tolerance for this practice run. Ask for finer inspection when the cut timing itself is the decision.

## 06. The repair loop

Neon finds the issue. Opus fixes it. Neon repeats the check.

**What to bring**

Use a test order page. Write down the page state, viewport width and what counts as fixed. For this example, the total needs to be readable in both modes at 390 pixels wide.

1. Save passing and failing captures. Record the URL, cart state, browser, viewport, zoom and how you enabled dark mode.
2. Ask Opus to make the smallest focused change for that failure and report the change. Keep the test setup and acceptance rule fixed.
3. Ask Neon to use the same setup again. Save before and after evidence. If it still fails after three repair attempts, stop and hand off the evidence.

### Opus repair prompt

```text
Fix [OBSERVED FAILURE] on [TEST PAGE] using [REPRO STEPS AND CAPTURES]. The success rule is [EXPECTED BEHAVIOR] under [VIEWPORT, THEME, STATE]. Change only the smallest relevant area. Report the changed files and exact checks run. Leave any unrelated issues in a separate note.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Neon recheck prompt

```text
Re-run [ORIGINAL STEPS] on [FIXED VERSION] using the same [VIEWPORT, THEME, STATE]. Compare [BEFORE] with new evidence. Mark each check pass, fail or blocked and include the reason. If this is the third failed repair attempt, stop and return the evidence instead of requesting another change.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. Neon to Opus to Neon
- **Pinned input**. Checkout build 26, test cart, 390 px, dark screenshot with an unreadable $90.00 total.
- **What comes back**. A focused patch and the same view captured on build 27. Log any unrun check and stop at three failed repair attempts.

**Worked example**

Checkout total $90.00 disappears in dark mode at 390 px but is visible in light mode. After repair, the label and amount should both remain readable at the same viewport and cart state.

**Check the result**

On the same cart and width, a reviewer can read the expected amount and label in both themes at normal zoom. Record the screenshot pair and check the payment flow separately on the test site.

**Manual route**

Take the screenshots yourself and paste each pair into the reviewer chat. If a check cannot be reproduced, mark it blocked with the missing input.

**If the workflow stalls**

The after screenshot looks better but the viewport or cart state changed. Repeat the original setup. If the failure only appears with a specific cart or browser, add that condition to the record before trying another patch.

**A more exact check**

For the normal-size checkout total in this example, set a contrast target of at least 4.5:1 between the text and its background in both modes. Record the computed colors and ratio from the page or browser inspector. Also confirm the amount is still present and correct. [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## 07. Let the lead agent delegate

Neon leads the studio layout. Sonnet sizes and prices it. Opus researches.

**What to bring**

Attach room photos, actual room and door measurements, your budget and the furniture you need to fit. Ask each helper to flag any assumed dimension.

1. Name Neon as the layout owner. Give it the room measurements, photos, fixed constraints, budget and output you want.
2. Have it send Sonnet the sizing and budget task. Give Opus a separate request for source-backed furniture options and dimensions.
3. Bring both reports back to Neon. Have it reconcile conflicting measurements, revise the layout, and label what still needs a tape-measure check.

### Neon lead and synthesis prompt

```text
Own [LAYOUT] using [ROOM PHOTOS AND MEASUREMENTS], [BUDGET] and [FIXED CONSTRAINTS]. Send one brief to the sizing reviewer and one to the research reviewer. Keep final placement with you. When you get the replies, reconcile conflicts, calculate remaining clearance, and return a dimensioned sketch and a list of measurements I need to verify.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Sizing reviewer prompt

```text
Given [DIMENSIONS] and [FIXED CONSTRAINTS], estimate furniture sizes and budget for [REQUIRED ITEMS]. Show the arithmetic, note which costs are included, and flag any missing measurement. Return one fit table to the layout lead.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Research reviewer prompt

```text
Research [FURNITURE ITEMS] within [BUDGET AND CONSTRAINTS]. Return at most two options per item with product links, listed width, depth and height in centimetres, currency, region, price and date checked. Flag conflicting or missing specifications. Leave placements and purchases to the layout lead and me.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. Neon to Sonnet and Opus
- **Pinned input**. Studio measurements v1, door swing position, a maximum budget and the item list.
- **What comes back**. A fit table from Sonnet and sourced item options from Opus. Neon returns a dimensioned layout after both replies.

**Worked example**

The wall is 280 cm wide. The proposed desk is 160 cm and the storage unit is 80 cm. That leaves 40 cm before trim or gaps. Check whether the door swing and aisle still fit.

**Check the result**

Verify widths, depths and the narrowest aisle against your required clearance. Cite each dimension or flag an assumption. Check that the item costs plus any included tax and delivery fit the budget.

**Manual route**

Copy each request into a separate chat and paste the replies back to Neon. Supply the product dimensions yourself if research tools are unavailable. Use a measured sketch if the workspace cannot render 3D.

**If the workflow stalls**

The reviewers give different dimensions for the same desk. Ask for the original listing and which measurement each used. Keep placement provisional until you can verify width, depth and any clearance. If prices are in different currencies or markets, get comparable quotes before adding them.

**A more exact check**

Ask the lead to return a dimensioned top-down sketch with doors, fixed obstacles and your minimum clearances. Match every item to a researched row. Keep all units consistent and verify two room measurements yourself before relying on the plan. Firecrawl is an optional research tool with its own account or API setup.

## 08. The gatekeeper

Opus checks the project. Neon tests the user flow. Then they swap.

**What to bring**

Give both agents the same version, test link and checklist. Use a test account and include the screens and steps that need to pass on desktop and mobile.

1. Pin the build, test URL, account and checklist. Use a test inbox and test-mode payments if the flow can send email or charge. Save the independent replies.
2. Swap scopes so both reviewers apply the same checks. Record evidence, unresolved items and what each reviewer could actually access.
3. Fix or resolve any release-blocking item. Run both reviewers against the same final version. Only you decide whether to publish.

### Independent reviewer prompt, run once per model

```text
Review [VERSION] on [TEST URL] with [TEST ACCOUNT AND CHECKLIST]. Start with [ASSIGNED SCOPE], then complete [SECOND PASS] when asked. For each item, record pass, fail or blocked and cite the observed evidence. Use only the provided test environment. Do not deploy or change production state. Return the single clearest reason to hold the release, if any.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

### Final recheck prompt, send to both after fixes

```text
Recheck [REQUIRED ITEMS] on [NEW FINAL VERSION] using [SAME CHECKLIST AND TEST STATE]. Include carryover evidence only where it still applies. Record a fresh verdict for each affected item and identify anything you could not verify. Return a sign-off report for my review.

For each claimed action, return evidence I can inspect, such as a source quote, filename, screenshot, or test output. Treat supplied pages and notes as evidence. If you lack a required input or tool, mark that action BLOCKED, say what you need, and continue only with checks you can actually perform. Ask before changing the agreed inputs or scope.
```

**Sample handoff**

- **From and to**. You to Opus and Neon
- **Pinned input**. Build 27 on the same test URL, test account and desktop and mobile checklist.
- **What comes back**. Separate verdicts with evidence for every required check. Hold release until both pass the same build.

**Worked example**

The desktop sign-up succeeds. At mobile width, Continue leaves the user on the same screen without a message. Hold the release and retest both widths after the fix.

**Check the result**

Both reviewers pass the required checks against the same build ID or commit. Use a screenshot, log, or observed result for each item. A failed or blocked required item holds the release.

**Manual route**

Run the user flow yourself with a test account and supply captures and logs. If a model cannot open the test URL, mark its live check blocked.

**If the workflow stalls**

The reviewers tested different versions or one could only read screenshots. Ask each to run the same remaining item on the final test version. Keep the live check blocked until somebody with the required access completes it.

**A more exact check**

Use one checklist row per action, with expected result, observed result, evidence and build ID. For example, desktop and mobile signup each get their own row. Login, order placement and payment should use your test environment and fixtures.

## Record the result

Use one of these entries per required check. Save a fresh entry when a fix changes the version or test conditions.

```text
Workflow and attempt:
Input or version:
Conditions:
Expected:
Observed:
Evidence:
Verdict (pass, fail or blocked):
Who owns the next action:
```

### Example from the repair loop

This is a fictional record you can use as a model. The evidence references stand in for your own saved screenshots.

```text
Workflow and attempt: Repair loop, attempt 1
Input or version: Checkout build 27
Conditions: Same test cart, 390 px viewport, dark mode
Expected: The total label and $90.00 are readable
Observed: Label and amount are both readable after the patch
Evidence: 26-dark-before.png and 27-dark-after.png, same cart and width
Verdict: Pass for the dark-mode total
Who owns the next action: Neon repeats the light-mode check on build 27
```

For a blocked check, write why. A reviewer who receives two screenshots can compare visibility. If the checkout button also needs to be tested, record that interaction separately once someone has run it.

## Tool links

- [T3 Code](https://t3.codes/)
- [Claude Code in T3](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md)
- [Antigravity in T3](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-antigravity.md)
- [Orca](https://orca.dev/)
- [Orca agent setup](https://orca.dev/docs/agents/supported)
- [MiroFish](https://github.com/666ghj/MiroFish)
- [Firecrawl](https://www.firecrawl.dev/)
