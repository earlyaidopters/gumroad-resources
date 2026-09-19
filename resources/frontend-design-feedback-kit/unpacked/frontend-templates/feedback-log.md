# Visual feedback log

Copy this record for each issue.

Screen and route:
Browser and viewport width:
Build/version and test data:
State checked:
Reference image or Figma frame:
Actual screenshot:
Observed mismatch:
Expected rule:
Smallest requested correction:
Interaction checked and expected result:
Actual result:
Status: pass / fail / not run
Retest evidence:
Reviewer and date:

## Example
Screen: Projects, empty state. Width: 390px.
Mismatch: Create project button extends past the card.
Expected: 16px page side margins; button contained within the card.
Correction: Fix the card/button width rules, preserving desktop layout.
Retest: 390px and 1440px, click action and visible keyboard focus.
Status: Not run. This example is a specification, not evidence of a test.

## Completion checks
- Reference colours, typography, spacing and components match.
- The main user journey reaches its expected result.
- Required empty/loading/error/success states are checked.
- Hover and keyboard focus states are visible where applicable.
- Small screens have no unintended horizontal overflow.
- Screenshot comparisons use stable data and a consistent browser environment.
- A person reviewed visual differences before accepting a new baseline.
- Unrun checks and remaining issues are explicit.

## Tool pairing
Figma reference + your coding agent + browser review.
Add Playwright when you need repeatable interaction checks and screenshot comparisons.
With no Figma file, use approved screenshots and design-brief.md.
Screenshots help inspect appearance; exercise controls to check behavior.

Official docs checked 2026-09-16:
https://developers.figma.com/docs/figma-mcp-server/
https://playwright.dev/docs/test-snapshots
