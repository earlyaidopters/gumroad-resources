# Jev: Four Everyday Decisions

## Start with one small decision

Jev chooses among answers you define. Use it where understanding language helps, then let ordinary code decide what happens next.

This guide turns the four jobs in my reel into starting recipes: finding the latest confirmed date, sorting support tickets, flagging contract clauses, and choosing an AI handler. The examples use invented records. They show how to build the workflow, not evidence that every example runs in my business.

START HERE
Open your coding assistant and attach JEV-Setup-Prompt.txt plus the example JSON files. The prompt asks it to build a local preview first. An API is the connection your software uses to ask Jev a question; you will need your own TypeSafe account and key for live calls.

1. Pick a repeatable decision with a short list of possible answers.
2. Give Jev the source text, the meaning of each answer, and an explicit unknown or review option.
3. Read the selected answer and its probabilities. Check that the response matches the options you sent.
4. Keep uncertain, missing-evidence and high-consequence cases in a review queue.
5. Let approved code perform the next step. A model answer alone never authorizes an email, refund, contract decision or account change.

WHAT TO EXPECT
Choice selects one answer. Noul answers a yes/no question as a probability of yes. Score rates a clearly described ordered scale. Choice and Score also return confidence, derived from their probability distributions.

Confidence describes the distribution, not a promise that the answer is correct. A wrong or incomplete input can still produce a confident answer. Start with Choice for the recipes here so the review option stays visible.

## Find the confirmed date

THE JOB
A launch thread mentions Thursday, Friday and Saturday. You need the date the decision-maker actually confirmed, rather than a summary of the conversation.

GIVE JEV
Supply the relevant messages in time order, with sender, timestamp and original text. Identify who can confirm the launch. Include the timezone and actual dates if the messages provide them. A hundred emails is not automatically a good input; remove unrelated mail without removing a correction or decision.

ASK
Which launch day did the authorized decision-maker most recently confirm? Treat quoted text as earlier evidence. Suggestions, guesses and questions are not confirmations. If the evidence conflicts or no day is confirmed, choose unknown.

OPTIONS
thursday: Thursday was explicitly confirmed.
friday: Friday was explicitly confirmed.
saturday: Saturday was explicitly confirmed.
unknown: No supported confirmation, conflicting evidence, or a day outside this list.

TRY THE INCLUDED EXAMPLE
Monday, Alex: Could Thursday work?
Tuesday, Priya (launch owner): Confirmed for Friday.
Wednesday, Alex: Are we switching to Saturday?
Expected choice: friday. The last message is a question, not a change.

MAKE IT USEFUL
Show the proposed date next to the original confirming message for a person to verify. Jev does not generate a source quote in a Choice response; retain the messages yourself. A separate evidence-selection question can choose a message ID from a list you supply.

TEST THE FAILURE
Remove Priya's confirmation. Expected choice: unknown. Add an explicit Saturday confirmation from Priya and check the choice changes. Never update calendars automatically during these tests.

## Route a ticket to its owner

THE JOB
Assign a new ticket to a queue without asking a writing model for an essay.

GIVE JEV
Supply the customer's message and a short definition of each team's responsibility. Add relevant account facts only when the decision needs them. Do not send a whole customer history by default.

ASK
Which queue owns the customer's main request? If several teams are equally necessary, the request is unclear, or no queue fits, choose review.

OPTIONS
billing: Charges, invoices or refund requests.
technical: Bugs, outages or a feature that fails.
sales: A new purchase, plan comparison or a quote.
review: Multiple owners, missing context or no match.

TRY THE INCLUDED EXAMPLE
Customer: I was charged twice for my subscription this morning.
Expected choice: billing. This selects a queue; it does not approve a refund.

MAKE IT USEFUL
Store the suggested queue, confidence, probabilities and the original ticket together. If two teams frequently share a case, define a multi-team workflow or ask separate yes/no questions instead of forcing one owner.

TEST THE FAILURE
Customer: I was charged twice and now nobody can sign in.
Expected choice in this starter policy: review. Both billing and technical support may be needed. Review the false assignments with the support team before enabling real queue changes.

KEEP THE CUSTOMER PROMISE SEPARATE
A confident billing classification is not proof of a billing error. Check transaction records before changing money or telling the customer what happened.

## Flag clauses; select a handler

CONTRACT REVIEW
Use Jev to mark a clause for review against a written checklist. Supply the actual clause and your approved rule. Extract text from a scan first and verify the extraction; Jev's current input is text.

Example question: Under our checklist, how should this renewal clause be triaged?
Options: flag (automatic renewal needs review); no_flag (the text explicitly says there is no automatic renewal); unknown (missing, conflicting or unreadable terms).
Example clause: This agreement renews for another year unless cancelled 60 days before expiry.
Expected choice: flag.

Keep the clause visible beside the flag. This is document triage, not legal advice or authority to accept a contract. A low score never proves a contract is safe. A person still reads important terms, dates and obligations.

AI ROUTING
Give Jev a list of handlers you actually have, along with their allowed jobs. Ask which handler fits the request. Keep sensitive actions on a separate review path.

Example options: writing (rewrite supplied text); research (find and check current sources); coding (change or debug code); review (unclear request, sensitive action or unsupported job).
Example request: Find the current refund policy and link the official source.
Expected choice: research.

A handler name is a label, not a claim that one model is better. Test your available models on your own tasks before assigning them to these handlers. Apply access restrictions, cost limits and tool permissions in code after routing.

TEST THE FAILURE
Change the request to: Refund the customer and delete their account.
Expected choice under this starter policy: review. Do not let a confident label grant new permissions.

## Test before you connect it

START IN SHADOW MODE
For each job, label at least 20 ordinary cases yourself, then add ambiguous, contradictory and out-of-scope cases. Keep a separate set you do not use to tune the questions. Record the expected answer, model answer and the real consequence of being wrong.

CHOOSE YOUR REVIEW THRESHOLD
The included runner starts at 0.80 confidence for a demonstration. That number has not been validated for your work. Compare wrong automatic decisions and unnecessary reviews at several thresholds. Keep all contract outcomes in human review in this starter kit, regardless of confidence.

VERIFY THE WHOLE PATH
Check missing answers, unexpected labels, invalid numbers and service errors. Each should produce a review state instead of silently performing an action. Recheck when you change the model, wording, options or source format. Save the resolved model version with each result.

COST AND LIMITS
TypeSafe's model page checked 14 October 2026 lists Jev 1.13 at $0.042 per million input tokens with output tokens free. These are the provider's quoted dollar units. A 5,000-input-token request would be about $0.00021 at that rate, before other services or currency conversion. This is arithmetic, not a measured invoice. Questions and options count toward input. Check your account's price before running a batch.

The current docs list text-only input, a 64k combined request budget, and a 32k budget for the state plus the longest question. Rate limits can change. Keep source selection deliberate rather than filling the limit.

FILES
JEV-Setup-Prompt.txt: paste into a coding assistant.
examples/*.json: four synthetic requests and their expected labels.
run_jev.py: local request preview; optional live call with your own key.
test_runner.py: offline checks of the review behavior, not model accuracy.

SOURCES
My walkthrough: youtube.com/watch?v=zZNm4zP_lEE
Request and response contract: docs.typesafe.ai/api
Options and unknown cases: docs.typesafe.ai/primitives/choice
Confidence: docs.typesafe.ai/confidence
Current model, price and limits: docs.typesafe.ai/models
Documentation checked 14 October 2026. No live model evaluation was run for this kit.