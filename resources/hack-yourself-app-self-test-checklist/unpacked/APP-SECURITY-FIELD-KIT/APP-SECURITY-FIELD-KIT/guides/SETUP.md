# Get the tools ready before you judge the app

## Pick a setup you can inspect

Use an assistant that can show browser actions or HTTP requests and their returned results. A chat window that only writes advice cannot perform a web test. Connect your chosen provider using its current official setup instructions or the linked model setup kit. Provider access and prices can change; no specific hosted model is required here.

## Prove one capability at a time

Ask the assistant to open your staging login page and report its title without signing in. Then let it sign in to an ordinary disposable account through the approved private credential mechanism. Have it read one harmless marker belonging to that account. Check the tool log and returned content. This confirms a useful starting capability, not that the model is good at security testing.

## Separate the accounts

Use separate profiles, cookie jars, or explicit sessions. Confirm the active account before each comparison. The same request run with the owner's token is not a cross-account test, even if the browser address bar shows a different organization ID.

## Keep secrets and costs under control

Use limited test credentials, not a service-role key. Check the provider's data handling before submitting code or assessment evidence. Review real runtime file/network permissions and available spending controls. An instruction in a prompt, a usage alert, or a model's refusal is not an enforced security boundary.

## Troubleshooting

| Symptom | Check next |
| --- | --- |
| Assistant describes a test but shows no tool action | Enable the required tools and verify an actual request ran |
| A local page refuses the connection | Start its local server, verify the port, then reload |
| Every request returns 401 | Check session validity and test credentials before drawing conclusions |
| Another account's record appears accessible | Confirm which session supplied the request, which account owns the marker, and whether it was intended to be shared |
| The interface is empty | Confirm that you signed into the seeded ordinary account, not an empty support workspace |
| Report import fails | Start from assessment.blank.json, use exact status labels, and supply evidence for confirmed findings |
| No vulnerabilities found | Record coverage and limitations; this is a valid result, not a reason to invent a problem |

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
