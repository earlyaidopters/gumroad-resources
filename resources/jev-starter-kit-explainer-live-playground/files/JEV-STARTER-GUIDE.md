# Jev Starter Guide
By Mark Kashef | Documentation checked September 18, 2026

## Start here
- Walk through the explainer: https://jev-in-five-minutes.markkashef.chatgpt.site/#concept
- Try the live playground: https://ask-jev.markkashef.chatgpt.site/

The explainer covers the concept, question types, a hotel example, and practical use cases.
Ask Jev lets you supply a question, context, and answer options, then inspect the decision, probabilities and request metadata. It does not browse the web.
The playground uses a limited shared credit pool. Live requests depend on remaining credits and service availability. No personal API key is needed for this playground; your own integration needs your own TypeSafe access.

## Give Jev a decision
Start with something you decide repeatedly and a set of possible answers.
For example, paste hotel cancellation terms and ask: "What kind of refund do these terms offer?"
Options: cash refund, hotel credit, not enough information.
Include the actual terms. A label chosen from your options can still be wrong.

## Copy this into your coding assistant
```text
Help me add one focused Jev decision to my existing project.

First read the current official documentation:
https://docs.typesafe.ai/llms.txt
https://docs.typesafe.ai/api.md
https://docs.typesafe.ai/confidence.md
https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md

My repeated decision: [describe it]
Context available to the model: [describe the source data]
Allowed answers or rubric: [list them]
What should happen when evidence is missing: [review / ask / stop]

Keep my existing stack. Choose the appropriate primitive: noul, choice, or score.
Give the model the relevant context as state, a complete question in instructions, and criteria where required. Question IDs are not instructions.
Put TypeSafe credentials in a server-side environment variable named TYPESAFE_API_KEY. Never expose them to browser code, logs, or version control. I will provide my own key privately.
Use the current documented endpoint and model alias. Validate returned answer types and handle timeouts, invalid responses and rate limits.
Return the decision and probabilities where available. Do not present confidence as a guarantee of correctness.
Add a safe missing-information path. Calibrate escalation thresholds using examples from my task rather than assuming one percentage is universally safe.
Test a clear match, a clear mismatch, missing information and conflicting evidence.
Show me the smallest working version, the request JSON and the result.
```

## A request you can adapt
Endpoint: POST https://api.typesafe.ai/v1/systemone
Headers: Authorization: Bearer <YOUR_API_KEY> and Content-Type: application/json

```json
{
  "model": "jev-latest",
  "state": {
    "hotel_terms": "Free cancellation until 24 hours before arrival. Refunds are issued as hotel credit valid for 12 months."
  },
  "questions": {
    "refund_type": {
      "type": "choice",
      "instructions": "Which refund type is explicitly offered in state.hotel_terms?",
      "criteria": {
        "cash_refund": "Money returned to the original payment method.",
        "hotel_credit": "Credit usable for a future hotel stay.",
        "not_enough_information": "The refund method is missing, ambiguous or contradictory."
      }
    }
  }
}
```

This is an example request, not a live response. The expected label for these sample terms is hotel_credit.
The API returns the selected option in answers.refund_type.choice, the distribution in probabilities, and a separate confidence field for Choice.

## The three question types
- Noul: a yes/no judgment. The noul value is the probability of yes. It has no separate confidence field.
- Choice: choose one of your defined options. Returns the chosen option, its distribution and confidence.
- Score: rate something against an ordered rubric of at least two described levels. Returns a weighted score, legend, probabilities and confidence.

Ask Jev's yes/no interface uses a Choice question so it can also offer "Not enough information." That UI is not a direct demonstration of the Noul response format.

## Places to try it
- Fine print: cash refund, credit, or unclear.
- Evidence checks: supports the claim, contradicts it, or insufficient evidence.
- Request routing: send a task to a named team, model, or agent.
- Workflow checks: continue, revise, or request review.
- Document screening: surface the cases that need a person.

These are implementation patterns, not promises of accuracy or measured savings. Keep actions, arithmetic, permissions and known rules in ordinary code. Measure cost and latency against your current workflow.

## What to keep in mind
Constrained answers prevent free-form output; they do not prevent wrong judgments. Confidence summarizes the model's probability distribution, not a statistical confidence interval or a guarantee. Use human review where mistakes matter.

The walkthrough's use-case animations illustrate workflows. They are not all live integrations. Only claim a workflow works after testing it on your data.
Check current pricing at https://docs.typesafe.ai/ before estimating spend.

## Official references
- Documentation index: https://docs.typesafe.ai/llms.txt
- HTTP API: https://docs.typesafe.ai/api.md
- Confidence: https://docs.typesafe.ai/confidence.md
- Official skill: https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md
- TypeSafe console: https://console.typesafe.ai/home

