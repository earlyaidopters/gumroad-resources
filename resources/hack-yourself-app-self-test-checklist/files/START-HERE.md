# Your first useful check

You built an app, and now you want to know whether one customer can see another customer's private information. Start there. You can explore more features once you have a result you can explain.

## Open these in order

1. **Read the boundary.** Open DISCLAIMER.md and DEFENSIVE-USE.md. Complete templates/TEST-SCOPE.md before sending test requests.
2. **Prepare two ordinary accounts.** Create separate fictional records. Add a unique harmless marker to one private note so you can tell whether the wrong account received it.
3. **Check your assistant.** Use prompts/00-prepare-session.txt. It needs working browser or HTTP tools; a written plan does not mean it ran a test.
4. **Run one comparison.** Fill in prompts/01-first-check.txt with your staging URL and test-record link. Provide credentials through your assistant's approved private credential mechanism, not a public prompt or report.
5. **Record what happened.** Use templates/FINDING.md for a confirmed issue and templates/COVERAGE.csv for every attempted check. A blocked action is worth recording too.
6. **Review and repair.** Use prompts/03-review-evidence.txt before accepting a finding, then prompts/04-fix-and-retest.txt after you approve the change.
7. **Make it visible.** Open report/risk-report.html and import a redacted JSON report that follows templates/assessment.blank.json. Or use prompts/05-build-risk-report.txt to prepare that data.

## Choose your next feature

Read guides/FIVE-FEATURE-STORIES.md for five familiar examples, then CHECKLIST.md for the wider review. Mark items not present in your app as not applicable and record why. Do not interpret an untested item as a pass.

## Files you can use without installing anything

- downloads/APP-SECURITY-FIELD-GUIDE.pdf: illustrated guide and complete checklist.
- downloads/TEST-WORKSHEETS.pdf: printable scope, evidence, and retest sheets.
- ALL-PROMPTS.md: all six prompts in one readable file.
- report/risk-report.html: offline report with a clickable heat map and print layout.

The offline page starts empty. Its sample is fictional. It keeps changes in memory until you export JSON; reloading discards unexported work. No tracking, external fonts, network requests, or account is required.

For connecting a model to DeepSeek Harness, use the companion [setup kit](https://github.com/earlyaidopters/uncensored-ai-starter-kit). This kit does not install a model or automatically scan an app.

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
