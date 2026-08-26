# Multi-Agent Build Checklist

Use this checklist before implementing the blueprint in an existing agent system.

## 1. Truth and scope

- [ ] The target feature is described in plain language.
- [ ] Existing primitives have been audited before proposing replacements.
- [ ] Verified behavior, interpretation, and speculation are labeled separately.
- [ ] Vendor-specific additions are not attributed to another product.
- [ ] The plan does not copy recovered code, proprietary UI, installers, or binaries.

## 2. Agent identity

- [ ] Every agent has a stable ID that does not depend on its display name.
- [ ] Profile, transcript, and memory are separate objects.
- [ ] Updating an agent profile does not rewrite its transcript.
- [ ] Private one-to-one context is not injected into group turns by default.
- [ ] Agent deletion has an explicit user confirmation path.

## 3. Transcript and memory

- [ ] Each agent has an isolated transcript store.
- [ ] Group rooms have their own transcript.
- [ ] Memory supports durable profile facts and time-bound history.
- [ ] Memory has explicit owner scope: agent, user, or project.
- [ ] Shared memory uses single-writer records or conflict-safe updates.
- [ ] Prompt injection uses a character or token budget.
- [ ] Older memory can be searched without entering every prompt.

## 4. Messaging

- [ ] Peer sends return delivery acknowledgements, not replies.
- [ ] Replies arrive as later events.
- [ ] Messages have stable IDs and timestamps.
- [ ] Queued messages survive a host restart.
- [ ] Sender and recipient both receive visible transcript records.
- [ ] Message size and attachment capabilities are bounded.
- [ ] Automatic acknowledgement loops are prevented.
- [ ] Fan-out requires explicit user intent or approval.

## 5. Scheduling and priority

- [ ] User, peer, automation, and background lanes are distinguishable.
- [ ] The active user lane cannot be interrupted by a peer.
- [ ] Normal peer messages wait for the current run to finish.
- [ ] Priority messages require an explicit reason.
- [ ] Priority is one-to-one unless group interruption is deliberately designed.
- [ ] Interrupted runs record why they stopped.
- [ ] Superseded work does not resume blindly.

## 6. Group rooms

- [ ] Maximum members are configured.
- [ ] Maximum rounds are configured.
- [ ] Maximum total messages are configured.
- [ ] Maximum messages per member turn are configured.
- [ ] Recent history has a hard limit.
- [ ] Members can pass.
- [ ] A no-message round ends the meeting.
- [ ] Mentions can restrict responders.
- [ ] A manager role is optional and explicit.
- [ ] Stale room epochs cancel outdated work.

## 7. Computer and tools

- [ ] The design states whether agents share a computer, file system, or network.
- [ ] A private desktop window is not described as a private machine unless it is one.
- [ ] Desktop windows have ownership tokens or another strong assignment boundary.
- [ ] Resource exhaustion has an honest fallback.
- [ ] Tool calls have typed inputs and structured results.
- [ ] Side-effecting tools emit audit events.
- [ ] Imported scripts do not run during import.

## 8. Permissions

- [ ] The agent sandbox and the user's computer are separate trust zones.
- [ ] Standing modes are explicit.
- [ ] Allow-once approvals are scoped to agent, action, target, and run.
- [ ] Approvals expire.
- [ ] Denials stop immediate repeat prompts.
- [ ] A user or administrator can set a permission ceiling.
- [ ] Publish, pay, send, delete, and credential actions have separate policies.
- [ ] Repetition is never treated as silent consent.

## 9. Models and providers

- [ ] Provider adapters share a common contract.
- [ ] Queues, memory, permissions, and rooms remain outside provider code.
- [ ] Provider cancellation maps to scheduler interruption.
- [ ] Tool calls are normalized before execution.
- [ ] Usage records are labeled as estimates when not authoritative billing data.

## 10. Verification

- [ ] Agent A can message B without blocking.
- [ ] B wakes once and can reply later.
- [ ] Restart recovery does not lose queued work.
- [ ] A priority peer interrupts background work but not the user lane.
- [ ] A group stops at every configured bound.
- [ ] Pass messages are not displayed.
- [ ] Memory scope tests prevent cross-agent leakage.
- [ ] Desktop assignment tests prevent window theft.
- [ ] `Allow once`, `Always`, `Deny`, and `Never` each behave correctly.
- [ ] The user can see what happened and why.

