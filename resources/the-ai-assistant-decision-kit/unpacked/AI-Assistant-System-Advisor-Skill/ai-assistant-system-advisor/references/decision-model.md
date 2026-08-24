# Decision Model

The purpose of scoring is to expose tradeoffs, not manufacture false precision.

## Step 1: set the operating-path hypothesis

Choose among these paths before choosing a brand.

### Stay put

Lead when the current setup completes the important work, the pain is unproven, the desired feature is reproducible with a small change, or migration cost exceeds likely value.

### Managed assistant

Lead when the user values low setup, vendor-operated infrastructure, polished interfaces, and ecosystem integration more than model freedom or deep customization.

### Open-source runtime

Lead when the user needs inspectability, model routing, custom channels, hosting control, or a modifiable harness and has a real operator for updates, secrets, security, and recovery.

### Owned or DIY system

Lead when the user's durable asset is a distinctive workflow and they want files, memory, skills, routines, permissions, and interfaces to survive model changes. Require a maintenance owner and a narrow first milestone.

## Step 2: derive weights from the interview

Start with these default weights, then change them based on the user's answers. Keep the total at 100.

| Dimension | Default weight | Raise it when |
| --- | ---: | --- |
| Core workflow fit | 20 | The user names a revenue, operations, or mission-critical job |
| Ecosystem and connector fit | 15 | Existing apps, admin controls, or team habits are costly to replace |
| Operator and maintenance fit | 15 | The user has low technical comfort or no system owner |
| Trust, privacy, and permissions | 10 | Sensitive data or consequential actions are involved |
| Always-on and reliability | 10 | Work must continue without the user's device |
| Ownership and model flexibility | 10 | Portability or model routing is a hard requirement |
| Interfaces and channels | 10 | Phone, terminal, messaging, browser, or local apps are essential |
| Switching cost and reversibility | 10 | Existing memory, skills, routines, or team processes are substantial |

Show the final weights and one sentence explaining any large adjustment.

## Step 3: score with evidence

Score each candidate from 0 to 5 for each dimension:

- `0`: contradicts a hard requirement
- `1`: possible only through a major workaround or unacceptable burden
- `2`: meaningful mismatch
- `3`: adequate
- `4`: strong fit
- `5`: unusually strong native fit
- `U`: unknown or unverified

Add an evidence grade:

- `F`: current first-party fact
- `O`: user-observed behavior
- `A`: analysis from facts and user answers
- `U`: unresolved unknown

Example: `4F` means strong fit supported by a current first-party source. `3A` means adequate fit based on analysis. Do not convert `U` to zero.

## Step 4: apply hard constraints

A candidate cannot win if it violates a non-negotiable requirement, even with a high weighted score. Common hard constraints include:

- required platform unavailable
- unsupported data or admin boundary
- no acceptable way to reach local files or apps
- no always-on path for the required work
- maintenance requirement exceeds available operator capacity
- fixed model when model portability is mandatory
- price above a firm budget ceiling
- destructive or irreversible migration without export or fallback

## Step 5: compare defaults and ceilings

Create two separate columns:

- **Default fit:** What a normal user receives after ordinary setup.
- **Ceiling fit:** What a skilled operator could achieve with configuration, hosting, plugins, code, or custom architecture.

Do not punish a configurable open-source runtime for a weak setup as though it were a fixed product. Do not credit a managed product with a hypothetical custom ceiling it does not expose.

## Step 6: calculate migration reality

Inventory what changes:

- files and folder structure
- saved context and memory
- skills, prompts, plugins, and MCPs
- app authorizations and secrets
- routines, triggers, and monitoring
- user interfaces and messaging channels
- admin policies and approvals
- team training and habits
- backup, rollback, and incident response

Rate migration effort as `small`, `meaningful`, or `rebuild`. State the evidence.

## Step 7: use decision thresholds

- **Stay:** The candidate does not improve a high-weight problem by at least one clear level, or the gain does not exceed switching cost.
- **Test:** The candidate appears better but one or more critical facts or workflow outcomes remain unproven.
- **Migrate:** The pilot meets the success threshold, hard constraints pass, and the gain is large enough to justify rebuilding affected layers.
- **Build:** No managed or open-source default satisfies the distinctive workflow, and the user has a credible owner, maintenance budget, and narrow milestone.

## Common traps

- Treating `works in the cloud` as unique without checking VPS, serverless, and competing managed sessions.
- Treating `multi-agent` as one capability instead of checking isolation, shared state, routing, approvals, and failure handling.
- Treating many connectors as useful when the user's required connector is missing.
- Treating memory as a checkbox without checking write rules, editability, scope, portability, and poisoning risk.
- Treating a familiar model as proof of a better operating system.
- Ignoring that the user's present setup may already contain the hard-won value.

