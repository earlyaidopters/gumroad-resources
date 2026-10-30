# Read the risk grid without fooling yourself

The grid is a qualitative planning tool. It is not CVSS, a probability model, a penetration-test certification, or a measurement of expected losses. The reviewer must explain each rating using the app's actual context.

## Ease of exploitation: horizontal axis

1. Requires unusual access, multiple difficult conditions, or substantial specialized work.
2. Requires limited special access or several non-obvious conditions.
3. An ordinary signed-in user can reproduce it with some investigation.
4. An ordinary user can repeat it with a simple action and few conditions.
5. A public, repeatable action works without special access or meaningful barriers.

## Consequence: vertical axis

1. Limited information or nuisance; no demonstrated sensitive action or data exposure.
2. Small, contained disclosure or reversible change with limited business effect.
3. Meaningful private data or disruption affecting one account or workflow.
4. Sensitive data, account control, or material financial/operational impact across an important boundary.
5. Broad compromise or severe business impact supported by direct evidence and scope.

Do not infer a 5 from dramatic wording. If the observed proof is narrow, keep the rating narrow and explain any broader possibility separately.

## How the template groups results

- Only confirmed findings with evidence, ratings, and a rating reason appear on the grid.
- "Fix these first" contains confirmed items with both ease and consequence at least 3, plus explicit owner urgency overrides. This is a simple triage default, not an industry severity standard.
- Other confirmed items and incomplete or untested checks appear in "Good to know," with status labels.
- Passed checks appear in "Protections that worked." The page never labels the entire app secure.
- Grid color follows ease times consequence: 1-4 lower, 5-9 moderate, 10-15 elevated, 16-25 highest. These color bands are display choices; the urgent list uses the separate rule above.

The list is the accessible alternative to the plot. Select a marker with a mouse or keyboard to read evidence and repairs. Multiple findings in one cell remain separate buttons. An empty grid means there are no plotted confirmed findings, not that the app is safe.

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
