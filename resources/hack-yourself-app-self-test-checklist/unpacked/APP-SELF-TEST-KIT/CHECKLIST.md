# App self-test checklist

Prepared by Mark Kashef, 28 October 2026. Use a test copy you own and fictional records. Start with one feature, two ordinary accounts and a clearly allowed/blocked outcome.

## The same records can leak elsewhere

- [ ] Private records: check lists and individual records with two separate accounts, including workspaces and linked invoices. The server must check who can read or change each one.
- [ ] Signed-out access: repeat protected-page and data requests without a login; they should not return private records.
- [ ] Search and exports: keep another account's notes, email addresses and rows out of results and downloaded spreadsheets.
- [ ] File links and storage buckets: a private attachment should stay private when its link is copied to a different account.
- [ ] Admin pages: hiding the menu is not enough. An ordinary account must also be blocked from the page's underlying requests.
- [ ] Profile fields and invitations: only allow fields the user can change; stop users granting roles or inviting people with powers they do not have.
- [ ] Database permissions: enforce access rules on every relevant table; limit what the app's database account can read or change.
- [ ] API responses: return only the fields the page needs. A hidden field in a response is still available to the browser.

## Getting in without the right login

- [ ] Sessions: check expiration, logout and revocation after a compromise. Let users see and end other sessions; closing a browser alone does not prove a session is broken.
- [ ] Password resets: use expiring, single-use links for the intended account. Avoid responses that reveal which email addresses have accounts.
- [ ] Passwords and guessing: remove defaults, use strong password hashing and unique admin passwords, add a second sign-in check, and limit repeated failures.
- [ ] Google or GitHub login: verify allowed return addresses and provider protections. Check account linking and email verification so someone cannot claim another person's identity.
- [ ] Redirect links: keep login links from bouncing people to an unapproved site that could impersonate yours.
- [ ] Session tokens and cookies: validate signatures and expiry, protect signing secrets and reject tampered tokens. Protect cookies from script access where appropriate and send them securely.
- [ ] Cross-site requests and CORS: check whether another website can trigger a sensitive action or read a signed-in user's data. Restrict trusted origins and protect state-changing requests.
- [ ] Clickjacking and browser headers: stop sensitive pages being framed inside another site, and check the relevant browser security headers.

## Someone else can spend your usage

- [ ] Private service keys: keep them out of browser downloads, public code, screenshots and exposed configuration files. A public client key is not automatically a secret.
- [ ] If a secret leaked: replace it, check what it could access and review its usage. Removing the visible copy does not invalidate a stolen key.
- [ ] AI chat, search and email: set enforced per-user limits and check access on the server, not just on the screen.
- [ ] Signup and file uploads: bound request frequency, file sizes and storage so abuse cannot fill your database or storage.
- [ ] Costs: use restricted credentials, quotas and the spending controls the provider actually enforces. An alert alone does not stop spending.
- [ ] Availability: use a small, agreed test load. Cache expensive repeated work where safe, but keep quotas and access checks; caching alone does not prevent abuse.
- [ ] Old test deployments and internal dashboards: check whether they are still public, with weaker protections or default credentials.

## A normal input can become an instruction

- [ ] Comments and profile text: make sure text is displayed safely. If you allow rich formatting, sanitize it; use browser protections as an additional layer.
- [ ] Search and database filters: keep user input separate from database commands with parameterized queries. An error message alone does not prove a data leak.
- [ ] File uploads: check the actual content, size and allowed type. Store uploads where they cannot execute as server code.
- [ ] Download paths: keep a requested filename from reaching files outside its allowed folder.
- [ ] Link previews and URL imports: limit what the server can fetch so a supplied address cannot reach private internal services.
- [ ] Conversion tools and shell commands: keep user input out of executable commands; use safer libraries and fixed allowed operations.
- [ ] Saved objects: do not rebuild arbitrary executable objects from untrusted serialized data. Validate the format and use safer parsers.

## The app can believe the wrong price

- [ ] Prices, discounts and totals: calculate them on the server and verify the paid amount before delivering the product.
- [ ] Paid features: check the account's entitlement on each protected operation. A payment screen alone does not enforce it.
- [ ] Payment notifications: verify the provider signature and process repeated notifications safely, without granting the same benefit twice.
- [ ] Orders and invoices: check who can read them and who can change amounts or payment details. A writable invoice is not automatically a completed transfer.
- [ ] Sensitive account changes: require appropriate reauthentication before changing payout or recovery details.
- [ ] Card data: use the payment provider's supported checkout; avoid collecting raw card details you do not need.
- [ ] Subscriptions: show the charge, renewal timing and trial terms clearly. Test cancellation, and review the current rules of the stores and payment providers you use.

## Your own AI can be another way in

- [ ] Prompt injection: treat instructions found in documents, emails and websites as untrusted content. Test with harmless markers and a controlled destination.
- [ ] Connected tools: give the agent only the data and actions it needs. Require review before sensitive sends, deletions or financial changes.
- [ ] Separate users: one person's conversation, retrieved documents or agent memory must not turn up in another account.
- [ ] Generated code: review changes to authentication, permissions and secret handling before shipping them.
- [ ] Dependencies: check the libraries the AI installed for known vulnerabilities, suspicious packages and unnecessary permissions; update or remove them as appropriate.
- [ ] AI responses that trigger actions: validate the proposed action in ordinary code before executing it. A confident answer is not permission.

## Would you notice, and could you recover?

- [ ] Audit logs and monitoring: record important sign-ins, permission changes and unusual access; send alerts someone will actually review.
- [ ] Sensitive logs and source maps: check what you expose in diagnostics. Keep secrets and private records out of public errors, logs and published debugging files.
- [ ] Backups: keep recoverable copies with separate protection, then test a restore. A backup that has never been restored is an untested recovery plan.
- [ ] Incident response: have a way to pause a compromised feature or revoke its access while you investigate; test who can do that.
- [ ] Sensitive data: collect only what you need and protect it in transit and storage. Encryption does not replace permission checks.
- [ ] Privacy, cookies and retention: match your notices and choices to what the app collects, shares and keeps; get appropriate advice for your market.
- [ ] Package licenses: check the terms of third-party code before distributing it. A security scan does not decide your legal obligations.

## Record the result

- Feature and test URL:
- Account allowed to use it:
- Account that must be blocked:
- Exact action or request, with secrets removed:
- Expected result:
- Observed result and minimal evidence:
- Proposed repair:
- Same test after repair:
- Normal owner action still works:
- Not tested / still uncertain:

## References

OWASP Authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
OWASP Forgot Password: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
OWASP API Resource Consumption: https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/
OWASP Prompt Injection: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
