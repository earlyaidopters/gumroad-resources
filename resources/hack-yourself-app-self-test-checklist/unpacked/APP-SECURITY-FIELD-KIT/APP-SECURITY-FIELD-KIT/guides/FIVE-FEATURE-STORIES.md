# Five ordinary features worth checking

These are conditional teaching stories, not findings from your app or a client assessment.

## 01. The password reset that changes the wrong account

You forget your password, so you ask the app to email you a reset link. That link should only let you change the password for the account that requested it.

Imagine the server checks that the link is valid, but then trusts a separate account ID sent by the browser. If it fails to bind both to the same account, a valid link for one test account could change the other account instead.

**A controlled check:** Use two disposable accounts and their own inboxes. Request a reset for account A and verify that the reset flow cannot target account B. Check normal reset success, wrong-account rejection, reuse, and expiry within your agreed test scope.

**What needs to change:** Derive the target account from the validated reset token on the server. Use an appropriate expiry and single-use invalidation. Review session handling after a reset.

**Evidence to keep:** Record which account requested the link and which disposable account changed. Redact the link and token. A changed email field on screen is not evidence of a completed password change.

**Limit:** No reset token, exploit payload, or real account is included. A request error or an invalid link alone does not prove the entire reset flow is safe.

Reference: RESET in [SOURCES.md](../SOURCES.md).

## 02. The review that starts behaving like a page

A customer leaves a review, and the next visitor reads it. The review is supposed to be somebody's words, even if you let them add a little formatting.

If the app inserts that text into an executable browser context without the right handling, the review could change the page or run code. Depending on the app, that could let someone show a fake sign-in form and collect what a visitor types.

**A controlled check:** In an isolated copy, use an approved harmless marker to check how review text is rendered. If a browser-execution check is authorized, use a benign local demonstration with no external destination. Do not ask real people to log in to a fake form.

**What needs to change:** Use safe text rendering and context-appropriate output encoding. If formatting is allowed, use a maintained HTML sanitizer with a restrictive policy. Browser security controls are an additional layer.

**Evidence to keep:** Show the stored test input and the browser behavior it caused. Keep script execution, a changed page, and credential theft as separate claims; one does not automatically prove the others.

**Limit:** This story describes a possible app mistake. A plain-text marker displaying correctly does not by itself prove every input context is safe.

Reference: XSS in [SOURCES.md](../SOURCES.md).

## 03. The chat box that keeps spending your money

You add an AI chat box so customers can get help without waiting for you. Each useful answer may also create a provider charge.

If the server accepts unlimited paid requests, one person could repeatedly trigger answers without creating any real business for you. A hidden button or a limit enforced only by the browser would not stop direct requests.

**A controlled check:** Set a deliberately small staging allowance. Make only the few agreed requests needed to reach it, then verify that the next request is rejected before the paid provider call. Use a mock provider when possible and inspect server logs.

**What needs to change:** Enforce authentication, per-user quotas, and appropriate rate limits before expensive work. Add the provider-side spending controls available to you and plan what the app does when the budget is exhausted.

**Evidence to keep:** Keep the request count, server decision, and evidence of whether the provider was called. An error shown after the provider already answered may still incur usage.

**Limit:** This is a quota check, not permission for a load test. An alert does not necessarily stop charges; verify the controls your provider actually enforces.

Reference: REST in [SOURCES.md](../SOURCES.md).

## 04. The checkout that believes the browser's price

You list a workshop for $100. A customer clicks buy, pays, and the app gives them access.

If the server trusts a price sent by the browser, a customer could ask it to charge $1 instead. The payment provider might correctly process that $1 while your app mistakenly unlocks the $100 workshop.

**A controlled check:** Use the payment provider's sandbox or test mode with a fictional product. Verify that the server selects the trusted product price, that changing a browser value cannot reduce the order total, and that access waits for the correct completed payment.

**What needs to change:** Calculate prices and discounts from trusted server-side records. Check payment state, amount, currency, and order association before fulfillment. Verify webhook signatures and handle repeated events safely.

**Evidence to keep:** Record the test product, trusted total, test payment state, and access result. A writable order value does not prove money moved or that paid content was delivered.

**Limit:** The fictional dollar amounts are an illustration. This is an application-logic problem, not a claim that the payment provider was compromised. Never run the exercise with real charges.

Reference: PAYMENTS in [SOURCES.md](../SOURCES.md).

## 05. The invoice email that gives your assistant a new job

You ask your assistant when a supplier's invoice is due, so it opens the email to read the date.

Someone could put instructions inside that email telling the assistant to send a private document elsewhere. If it mistakes the email for your instructions and has the necessary tools, it might try to send the file while you are waiting for a due date.

**A controlled check:** Use a made-up document, a controlled inbox, and a harmless request marker. Ask for the due date and inspect whether the assistant proposes any unrelated tool action. Keep sending disabled or approval-gated during the check.

**What needs to change:** Treat retrieved content as untrusted data, limit the assistant's accessible files and actions, and enforce authorization in the tools. Require meaningful approval for a sensitive send, showing the recipient and exact attachment.

**Evidence to keep:** Distinguish reading an instruction, proposing a tool call, attempting a blocked call, and completing a send. A text claim that a file was sent is not delivery evidence.

**Limit:** No model is assumed to follow the malicious instruction. Rewording a system prompt alone is not a complete boundary for an assistant that can read and send private files.

Reference: AGENTS in [SOURCES.md](../SOURCES.md).

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
