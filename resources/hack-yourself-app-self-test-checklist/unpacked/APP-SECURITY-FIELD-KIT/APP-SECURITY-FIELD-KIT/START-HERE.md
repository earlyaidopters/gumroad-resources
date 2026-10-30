# Your first useful check

Start with a single question: can one customer read another customer's private record? Use a test copy of your app, often called a staging environment, with made-up records. You can explore more features once you have a result you can explain.

**If you downloaded the ZIP, extract it first.** The guides, prompts, report, and templates are inside the `APP-SECURITY-FIELD-KIT` folder. No installation is needed to read them or try the report's fictional sample.

## Prepare your test

1. **Agree the scope.** Read [DISCLAIMER.md](DISCLAIMER.md) and [DEFENSIVE-USE.md](DEFENSIVE-USE.md), then complete the [test scope sheet](templates/TEST-SCOPE.md). Use your own staging app or an app you have explicit written permission to test.
2. **Create two ordinary accounts.** Give each one a fictional private record. Put a harmless marker such as `PRIVATE-NOTE-B` in the second account's note, and confirm that the owner can read it normally.
3. **Check your assistant.** Use the [prepare-session prompt](prompts/00-prepare-session.txt). It needs working browser or HTTP tools. Keep the account sessions separate, and supply test logins through your approved private credential mechanism.

## Run one comparison

Open the [first-check prompt](prompts/01-first-check.txt). Replace `YOUR_APP_URL` with the allowed staging URL and `TEST_RECORD_URL` with the fictional record's link. Leave passwords and tokens out of the public prompt and report.

The assistant should first read the marker as the owner, then try the same record with the other account. Inspect the actual returned content and session. A status code or a changed organization ID in the address bar does not establish who made the request or what they received.

Record each attempted check in [COVERAGE.csv](templates/COVERAGE.csv). If the evidence supports a problem, complete a [finding card](templates/FINDING.md). Use the [evidence-review prompt](prompts/03-review-evidence.txt) before accepting the claim.

If a repair is needed, use the [fix-and-retest prompt](prompts/04-fix-and-retest.txt) after approving the change. Repeat the original forbidden action, confirm the owner's normal action still works, and keep the [retest record](templates/RETEST.csv).

## See the report before adding your results

From the extracted folder, open **`report/risk-report.html`** in your browser and click **Try fictional sample**. The clearly labeled sample lets you explore the grid without running a test or importing data. If you are reading on GitHub, [download the report file](https://github.com/earlyaidopters/hack-yourself-security-kit/releases/latest/download/RISK-REPORT.html) and open that downloaded file; the GitHub HTML source view does not run it.

For your assessment, use the [report prompt](prompts/05-build-risk-report.txt) to prepare JSON from the [blank template](templates/assessment.blank.json). Read the [field instructions](templates/README.md), review and redact the result, then use **Import assessment JSON**.

The page starts empty. It sends no report data to a server and keeps changes in memory. **Export JSON before closing or reloading** if you want to keep your work. Use **Print / Save PDF** for a reading copy, and review both exports before sharing.

## Choose what to test next

Read the [five everyday-feature stories](guides/FIVE-FEATURE-STORIES.md), then choose relevant items from the [full checklist](CHECKLIST.md). The [deeper-review prompt](prompts/02-go-deeper.txt) helps cover related routes within your scope. Keep untested features and unresolved concerns visible; do not count them as passes.

Prefer a PDF? Open the [field guide](downloads/APP-SECURITY-FIELD-GUIDE.pdf) and [printable worksheets](downloads/TEST-WORKSHEETS.pdf). The [combined prompt file](ALL-PROMPTS.md) keeps all six templates together.

For connecting a model to DeepSeek Harness, use the companion [setup kit](https://github.com/earlyaidopters/uncensored-ai-starter-kit). This kit does not install a model or automatically scan an app. [Setup and troubleshooting](guides/SETUP.md) explains what to check when a tool, login, or report import fails.

---

For education and authorized defensive testing only. Use synthetic data, limited test accounts, and the agreed scope. AI can miss issues or invent them; verify the evidence. A passed check is not security certification. Read the [full limitations](DISCLAIMER.md) before use.
