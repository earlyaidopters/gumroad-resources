# App security review checklist

50 review items across seven areas. Mark each confirmed, passed, needs_review, not_tested, or not applicable with a reason in your coverage log. These are review prompts, not 50 automatic tests or 50 vulnerabilities.

## A. The same records can leak elsewhere

- [ ] **A01** Private records: check lists and individual records with two separate accounts, including workspaces and linked invoices. The server must check who can read or change each one.
- [ ] **A02** Signed-out access: repeat protected-page and data requests without a login; they should not return private records.
- [ ] **A03** Search and exports: keep another account's notes, email addresses and rows out of results and downloaded spreadsheets.
- [ ] **A04** File links and storage buckets: a private attachment should stay private when its link is copied to a different account.
- [ ] **A05** Admin pages: hiding the menu is not enough. An ordinary account must also be blocked from the page's underlying requests.
- [ ] **A06** Profile fields and invitations: only allow fields the user can change; stop users granting roles or inviting people with powers they do not have.
- [ ] **A07** Database permissions: enforce access rules on every relevant table; limit what the app's database account can read or change.
- [ ] **A08** API responses: return only the fields the page needs. A hidden field in a response is still available to the browser.

## B. Getting in without the right login

- [ ] **B01** Sessions: check expiration, logout and revocation after a compromise. Let users see and end other sessions; closing a browser alone does not prove a session is broken.
- [ ] **B02** Password resets: use expiring, single-use links for the intended account. Avoid responses that reveal which email addresses have accounts.
- [ ] **B03** Passwords and guessing: remove defaults, use strong password hashing and unique admin passwords, add a second sign-in check, and limit repeated failures.
- [ ] **B04** Google or GitHub login: verify allowed return addresses and provider protections. Check account linking and email verification so someone cannot claim another person's identity.
- [ ] **B05** Redirect links: keep login links from bouncing people to an unapproved site that could impersonate yours.
- [ ] **B06** Session tokens and cookies: validate signatures and expiry, protect signing secrets and reject tampered tokens. Protect cookies from script access where appropriate and send them securely.
- [ ] **B07** Cross-site requests and CORS: check whether another website can trigger a sensitive action or read a signed-in user's data. Restrict trusted origins and protect state-changing requests.
- [ ] **B08** Clickjacking and browser headers: stop sensitive pages being framed inside another site, and check the relevant browser security headers.

## C. Someone else can spend your usage

- [ ] **C01** Private service keys: keep them out of browser downloads, public code, screenshots and exposed configuration files. A public client key is not automatically a secret.
- [ ] **C02** If a secret leaked: replace it, check what it could access and review its usage. Removing the visible copy does not invalidate a stolen key.
- [ ] **C03** AI chat, search and email: set enforced per-user limits and check access on the server, not just on the screen.
- [ ] **C04** Signup and file uploads: bound request frequency, file sizes and storage so abuse cannot fill your database or storage.
- [ ] **C05** Costs: use restricted credentials, quotas and the spending controls the provider actually enforces. An alert alone does not stop spending.
- [ ] **C06** Availability: use a small, agreed test load. Cache expensive repeated work where safe, but keep quotas and access checks; caching alone does not prevent abuse.
- [ ] **C07** Old test deployments and internal dashboards: check whether they are still public, with weaker protections or default credentials.

## D. A normal input can become an instruction

- [ ] **D01** Comments and profile text: make sure text is displayed safely. If you allow rich formatting, sanitize it; use browser protections as an additional layer.
- [ ] **D02** Search and database filters: keep user input separate from database commands with parameterized queries. An error message alone does not prove a data leak.
- [ ] **D03** File uploads: check the actual content, size and allowed type. Store uploads where they cannot execute as server code.
- [ ] **D04** Download paths: keep a requested filename from reaching files outside its allowed folder.
- [ ] **D05** Link previews and URL imports: limit what the server can fetch so a supplied address cannot reach private internal services.
- [ ] **D06** Conversion tools and shell commands: keep user input out of executable commands; use safer libraries and fixed allowed operations.
- [ ] **D07** Saved objects: do not rebuild arbitrary executable objects from untrusted serialized data. Validate the format and use safer parsers.

## E. The app can believe the wrong price

- [ ] **E01** Prices, discounts and totals: calculate them on the server and verify the paid amount before delivering the product.
- [ ] **E02** Paid features: check the account's entitlement on each protected operation. A payment screen alone does not enforce it.
- [ ] **E03** Payment notifications: verify the provider signature and process repeated notifications safely, without granting the same benefit twice.
- [ ] **E04** Orders and invoices: check who can read them and who can change amounts or payment details. A writable invoice is not automatically a completed transfer.
- [ ] **E05** Sensitive account changes: require appropriate reauthentication before changing payout or recovery details.
- [ ] **E06** Card data: use the payment provider's supported checkout; avoid collecting raw card details you do not need.
- [ ] **E07** Subscriptions: show the charge, renewal timing and trial terms clearly. Test cancellation, and review the current rules of the stores and payment providers you use.

## F. Your own AI can be another way in

- [ ] **F01** Prompt injection: treat instructions found in documents, emails and websites as untrusted content. Test with harmless markers and a controlled destination.
- [ ] **F02** Connected tools: give the agent only the data and actions it needs. Require review before sensitive sends, deletions or financial changes.
- [ ] **F03** Separate users: one person's conversation, retrieved documents or agent memory must not turn up in another account.
- [ ] **F04** Generated code: review changes to authentication, permissions and secret handling before shipping them.
- [ ] **F05** Dependencies: check the libraries the AI installed for known vulnerabilities, suspicious packages and unnecessary permissions; update or remove them as appropriate.
- [ ] **F06** AI responses that trigger actions: validate the proposed action in ordinary code before executing it. A confident answer is not permission.

## G. Would you notice, and could you recover?

- [ ] **G01** Audit logs and monitoring: record important sign-ins, permission changes and unusual access; send alerts someone will actually review.
- [ ] **G02** Sensitive logs and source maps: check what you expose in diagnostics. Keep secrets and private records out of public errors, logs and published debugging files.
- [ ] **G03** Backups: keep recoverable copies with separate protection, then test a restore. A backup that has never been restored is an untested recovery plan.
- [ ] **G04** Incident response: have a way to pause a compromised feature or revoke its access while you investigate; test who can do that.
- [ ] **G05** Sensitive data: collect only what you need and protect it in transit and storage. Encryption does not replace permission checks.
- [ ] **G06** Privacy, cookies and retention: match your notices and choices to what the app collects, shares and keeps; get appropriate advice for your market.
- [ ] **G07** Package licenses: check the terms of third-party code before distributing it. A security scan does not decide your legal obligations.

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
