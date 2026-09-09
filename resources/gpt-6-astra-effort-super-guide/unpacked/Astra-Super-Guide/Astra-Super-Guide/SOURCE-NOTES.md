# Astra super-guide: eight useful additions

Research lock: 8 September 2026. Official pages fetched live through OpenAI Docs. Prompts below are original practical adaptations, not vendor quotations. These are documented capabilities and suggested workflows, not extra experiments secretly added to the video's seven runs.

## 1. Diagnose the stop before buying more reasoning

**The nugget:** If Astra pauses unnecessarily, ask which instruction caused the pause. Its official guide explicitly describes sensitivity to skills and AGENTS.md, and recommends exposing the exact blocking instruction. This makes an apparently vague “lazy model” problem inspectable.

**Use when:** It keeps offering to continue, asking for permission on work you already requested, or returning a plan instead of the result.

```text
Finish the requested result using the scope we've already agreed. Make reasonable assumptions for reversible details and tell me the important ones. If you're blocked, identify the exact missing fact or the exact instruction and file causing the stop. Complete the independent work you can do before asking me. Finish by checking the deliverables against my request.
```

**Boundary:** Extra reasoning is not documented as a cure for early stopping. This is a behavior/prompt intervention; it does not bypass real permissions. Avoid using “never ask me anything.”

Source: [Astra prompting guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra#instruction-following).

## 2. Test the branch, not the screenshot

**The nugget:** A prototype can look complete while ignoring a user's choice. In the producer check, Sol's app let us select “Split with Crew 1,” but its next screen still described moving Fernbank with Crew 2. That is a better quality test than counting canvas elements.

**Use when:** Reviewing anything with approvals, prices, scheduling, filters or saved preferences.

```text
Use the app as a customer. Pick a non-default option, change a meaningful number, and follow the workflow to the final result. Show that the choice and number actually change the result. Reload and check what persisted. Try one invalid input too. Report the exact input, expected result and observed result. Fix any failures, then repeat only the affected checks.
```

**Boundary:** This is a recommended verification pattern supported by one preserved producer finding. It is not proof that Sol always fails or Astra always passes. Official computer-use guidance says to inspect actual application outcomes, rather than trust the agent's final answer.

Sources: `evidence/PRODUCER-CHECKS.md`, Sol section; [Computer use: verify the result](https://developers.openai.com/api/docs/guides/tools-computer-use#5-continue-and-verify-the-result).

## 3. A 272K threshold is a request boundary, not a token budget for the whole project

**The nugget:** For Astra API prompts above 272,000 input tokens, the entire request uses 2× input/cache rates and 1.5× output rates. It is not just the excess tokens, and it is not a simple “everything doubles.” A task processing millions of tokens over repeated calls has not necessarily crossed that boundary on any individual call.

**Use when:** Running long API workflows, or investigating a claim that changing a Codex context setting will halve subscription usage.

```text
Audit this workflow's context and billing settings without changing them. Identify whether it uses ChatGPT sign-in or API billing. For API calls, report the largest individual input-token count and whether any request exceeded Astra's 272,000-input-token threshold. Separate this from cumulative tokens across the task. If you recommend compaction or a configuration change, show the supported setting, current value and proposed diff first.
```

**Boundary:** The API threshold does not establish an equivalent Codex subscription discount. Do not supply a universal TOML edit without checking the installed client's supported settings. Compaction also trades retained detail for smaller context.

Source: [Astra model pricing notes](https://developers.openai.com/api/docs/models/gpt-6-astra).

## 4. “Fast” and “Medium” are separate decisions

**The nugget:** With ChatGPT sign-in, Astra Fast mode consumes credits at 2.5× the Standard rate where available. That is a credit multiplier, not a promise that Astra completes tasks 2.5× faster. The speed page's 1.5× speed statement explicitly names other model families. The API has its own rate structure: Astra Fast is 2× applicable API token rates.

**Use when:** You like Medium's output but want to choose whether faster iteration is worth extra allowance.

```text
Inspect my current model, reasoning effort, speed mode and sign-in method. Explain the applicable usage tradeoff using current official documentation. Keep reasoning effort unchanged. Show me how to switch only speed mode so I can compare one representative task on Standard and Fast.
```

Codex CLI has `/fast status`, `/fast off`, and `/fast on` for inspecting and changing this setting.

**Boundary:** Mark's preference for Medium + Fast is a workflow preference. The seven-run table does not measure a Standard-versus-Fast experiment or actual credit spending.

Sources: [Codex speed](https://learn.chatgpt.com/docs/agent-configuration/speed); [Astra API model](https://developers.openai.com/api/docs/models/gpt-6-astra).

## 5. Millions of processed tokens can mostly be reread context

**The nugget:** Cached input and reasoning output are subsets of the counters, not extra categories to add twice. The video's cumulative totals include repeated cached input; Ultra also includes its three subagents. They describe processed work, not fresh words generated or a bill.

**Use when:** Comparing agent runs or trying to explain why a short answer used a large token total.

```text
Audit these run logs. Report ordinary input, cached input, cache-write input if available, output and reasoning-output subsets. Reconcile the totals without double-counting subsets. Include child agents exactly once. Keep processed tokens, actual credits charged and API dollar cost separate. If actual billing data is missing, mark cost unavailable rather than estimating it from total tokens alone.
```

**Boundary:** API caching has its own write/read prices and conditions. Preserve the raw usage fields; do not infer a precise bill from a screenshot or the final answer's word count.

Sources: [Prompt caching measurement](https://developers.openai.com/api/docs/guides/prompt-caching); `evidence/results.json` and `PRODUCER-REVIEW.md`.

## 6. Raise effort for the difficult phase without breaking the API cache

**The nugget:** Astra's Responses API supports a `configuration_update` input item that changes reasoning effort while keeping the original request-level setting and cached prefix. You can draft at low, then raise effort for failure analysis in the same conversation.

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

Place it before the next user message; keep request-level `reasoning.effort` at its original value.

```text
Review the proposed migration for data-loss scenarios, concurrency failures and rollback gaps. For each material risk, point to the relevant part of the plan and propose a concrete check or change. Keep the already agreed scope.
```

**Boundary:** API developer feature, not a Codex-chat magic phrase. Supported for Astra in standard single-agent mode. The update persists until overridden. The response's `reasoning.effort` field still reports the request-level setting, so it is insufficient by itself to audit effective effort. After compaction, add a fresh desired update. Do not claim this makes an independent clean-room comparison; history is deliberately shared.

Source: [Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation).

## 7. Give each subagent a different question

**The nugget:** Delegation is useful when independent research lanes can advance simultaneously. Astra's guide says it may delegate less than desired unless told when to do so. In Ultra's preserved run, the three specialist lanes added 7.12M processed tokens; they were not a free research team.

```text
Use up to three subagents for independent questions: one for customer pain evidence, one for competing products, and one for reasons this idea could fail. Give each a bounded deliverable with direct sources. Keep the product decision and synthesis with the main agent. Avoid duplicate searches. If there is no useful independent work, continue without delegation.
```

**Boundary:** More agents are not automatically cheaper or better. Record their models and include their usage. This is a workflow suggestion, not a universal performance result.

Sources: [Astra subagent delegation](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra#subagent-delegation); `evidence/PRODUCER-CHECKS.md`, Ultra section.

## 8. Use Grok to find the objection you would rather miss

**The nugget:** Instead of asking Grok for “best ideas,” ask it to locate people already solving the proposed pain with cheap software or AI. Scopekeep's research surfaced a roofing owner's claim that Grok plus an open-source tool handled change orders. That is relevant counter-evidence for a change-order SaaS.

```text
I'm evaluating [product] for [specific customer]. Find recent firsthand posts on X showing how these customers already solve [pain], especially with spreadsheets, incumbent software or AI. Prioritize evidence that could make this product unnecessary. Return direct post links, dates, the actual workaround and what each source does and does not establish. Do not invent buyer demand from likes. If a source cannot be opened, say so.
```

Follow-up in Codex:

```text
Open the cited originals. Which claims survive verification? Revise the opportunity around what customers still struggle with after using these workarounds. Separate a feature that can be copied from a defensibility hypothesis that needs validation.
```

**Boundary:** Grok responses are research leads. That historical X example was read by the participant, but the producer could not independently reopen it; do not present it as newly verified here. Customer complaints are not proof of willingness to pay or a durable moat.

Source: `evidence/PRODUCER-CHECKS.md`, XHigh section. Method is an original editorial recommendation.

