# Producer review — first attempts

Review lock: 7 September 2026 Toronto (8 September UTC). All seven first attempts frozen before producer tests. No fixes or coaching were sent to participants. Original source files were not edited. Servers were restarted for review; several simultaneous startup attempts collided on inspector ports, then succeeded sequentially. Restart time is not included in participant duration.

## Measurement

Time: the first task_complete.duration_ms in each task, rounded to nearest second. It includes tool waits, research and building, not just model generation. All seven ran concurrently on the same machine; compare these observed runs, not universal speed.

Tokens: final cumulative total_token_usage at first task completion, independently reconciled against the sum of last_token_usage for distinct cumulative updates. All seven reconcile. total = input + output; reasoning_output is a subset of output, cached_input is a subset of input. Do not add either twice. Ultra includes the parent and three child task totals, each cut off at parent completion. Child counters begin independently near 30k, rather than inheriting the parent's accumulated counter. Sum is 21,730,368. These are processed tokens, mostly cached/reused input, not fresh context, credits, money or a bill.

Primary source: results.json; source session hashes retained. Exact counts and raw/normalized links are retained there. XHIGH contains eight status/thread URLs but only seven conversations: the second X status is an author reply in the same conversation. All others match the labeled ledger conversation count. One original Reddit source from Low and Medium reopened; Medium's source genuinely describes additional rooms, stairs and vents beyond the service agreement. Research counts measure ledger depth, not validated buyer demand.

Canvas: live, non-deleted native Excalidraw elements. Embedded images counted from files; drawings and shapes are not counted as embedded images. Seven canvas JSONs parse; their text was read for six required zones, links between evidence, product decisions, journey, screens, architecture and MVP. Sol separates visual direction as an additional zone and has no embedded raster images. Counts are descriptive, not quality scores.

## LOW · Astra / Clearshift

Producer browser: opened CS-1042, edited correction instruction, saved assignment, loaded sample recheck. Closure was disabled until the flagged standard was checked. Completed verification; after reload dashboard showed Open 2, Closed 1. Pass for this correction/recheck/save path. Eight Reddit conversations; no X. Canvas has 161 elements and three actual app screenshots. Narrow owner workflow is coherent, with explicit alternatives and a proposed service/data advantage. More recorded time and processed tokens than Medium despite lower effort.

## MED · Astra / Scopewell

Producer browser (earlier preserved check): changed labor minutes from 45 to 60; monthly proposal changed from $164 to $212. Prepared proposal, recorded a fictional acceptance, refreshed: one recorded change and $212 additions remained. Pass for changed-price/approval/persistence. Six Reddit conversations; no X. 133 canvas elements, one embedded interface wireframe. Detailed source counterevidence, paid incumbent, day-one utility and disproof plan. Lightest canvas of the set by element count; not the most visually deep. Fastest recorded completion, lower processed tokens than Low and High. Recommended starting point for this research-and-build brief because enough checked functionality arrived sooner.

## HIGH · Astra / Fieldwork

Producer browser: marked Cedar unavailable. Narrowed Emma's latest finish to 10:00, producing No feasible cover. Restored 12:00, chose Elm 09:00–11:00 and Birch 14:15–16:15. Reviewed both changed drafts and saved. Reload showed Cedar empty, Emma on Elm and Priya on Birch; four other visits unchanged. Pass for constraint guard/reassignment/persistence. Seven Reddit + one X source. 186 canvas elements and three app screenshots. A deeper scheduling problem than a simple form; literal conditional slots and unschedulable state create meaningful depth. Fixed travel allowance, not live route optimization.

## XHIGH · Astra / Scopekeep

Producer browser: changed labor rate from $95 to $110 for three hours; total became $530. Used a fictional response, recorded approval, prepared billing. Reload showed a $530 ready-to-bill row with revision 1. Pass for repricing/approval/billing/persistence. Six Reddit + one X conversation (reply deduplicated). Canvas 155 elements, one embedded visual. Strong counterexample: roofing owner says Grok + open-source Slowbooks already produces change orders; directly challenges the proposed business. Producer web fetch of X failed, so that source remains participant-read, not independently reverified during this review. Business-depth editorial distinction, not a factual universal ranking.

## MAX · Astra / Fieldnote

Producer browser: changed labor to $275.25 and materials to $84.75. Preview showed exactly $360. Simulated approval then reload retained approval; Morgan approved extras became $840 and job total $25,640. Pass for precise-price/approval/persistence. Seven Reddit, no X. 155 native elements with three app screenshots. Authored model includes state-transition validation, exact cents, declined revisions clearing old approval. Participant caught Escape closing the canvas, fixed and retested. Download event was not verified by participant; selectable export fallback exists. Longest recorded completion, 46:10, beyond the self-managed 45-minute allowance including packaging.

## HIGH · Sol / RelayOps

Producer browser: selected Split with Crew 1 (11 min added drive), then Prepare updates. Change summary still said Move Fernbank and Brief Crew 2, matching the compress option. Entered a custom customer message, simulated updates; outcome showed fixed 0 min drive and 3/3 promises. Reload preserved resolved state. Partial: working step progression and persistence; selected plan does not drive downstream summary/outcome. Confirmed hard-coded change and outcome JSX in app/page.tsx lines 115 and 118. Do not repair this before filming. Six Reddit + two X links. Canvas 215 elements, vector screen diagrams, no embedded images. Short research ledger (369 words) is supported by app and canvas content; do not use file length alone to rank depth. Lowest processed token total, second shortest run. Weakest checked decision-to-output connection.

## ULTRA · Astra / Accord

Producer browser: created a new custom pantry trim change; 2 hours at $85 plus $30 became $200. Created pending request; approval disabled until a note. Entered fictional approval and recorded; reload retained exact title/scope/$200 and approval note. Pass for new-record/calculation/approval/persistence. Seven Reddit + two X conversations. 240 elements, two embedded images, six core zones. Three Ultra subagents researched Reddit, X and alternatives; research/alternatives specialists later audited implementation and numeric edge cases. Competitor depth includes Joist invoice-only change orders and Jobber reapproval behavior, rather than marketing headlines alone. Best fit here for delegating separate research/checking lanes; expensive in processed work versus Medium, not a cheaper-model crew. Aggregate includes 7.12M child tokens.

## Recommendation lens

Choose a starting setting for a bounded research-and-prototype brief. Medium: shortest observed completion with a producer-verified functional path and adequate linked plan. High: a useful next test when the job has interacting constraints. Ultra: separate delegation experiment with deeper specialist research. Sol: lower processed usage but concrete conditional-output gap. No universal model ranking or pricing conclusion. No participant required a producer nudge to return artifacts; this does not prove all tasks are free from early-stopping behavior.
