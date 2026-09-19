# Design source of truth

Replace the example decisions with your own, then attach this file and the approved reference to your coding agent. These values are illustrative, not a universal design system.

## Example: projects screen
User: A small team owner creating their first project.
Main action: Create a project and reach its detail page.
Reference: Attach one approved desktop image and one mobile image, or link the exact Figma frame you can access. Keep approval date and owner with the reference.
Priority: Existing product components first; approved reference second. Ask about conflicts.

## Example visual rules
Canvas: #F7F5EF. Text: #20223A. Accent: #6254C7.
Font: The product's existing sans-serif font; do not add an external font service.
Spacing scale: 4, 8, 16, 24, 32, 48px.
Content width: 1120px maximum. Page sides: 16px mobile, 32px desktop.
Cards: 12px radius and 24px padding. Reuse existing button and field components.
Copy: Heading 'Projects'; empty state 'Create your first project'; button 'Create project'.
States: Empty list, populated list, loading, creation success, validation error and server error.
Button: Normal, hover, visible keyboard focus, disabled during submission.
Small screen: Single column. Long project names wrap without pushing controls off screen.

## Expected behavior
Create opens a form with a required project name.
Invalid input shows a useful error beside the field.
Successful creation shows the new project once and opens its detail page.
Repeated clicks during submission must not create duplicate projects.
Server failure preserves the typed name and offers a retry.
Use approved synthetic data in a local or staging environment.

## Paste into your coding agent
Read this brief, the approved reference and the existing product components.
List missing design decisions and conflicts before building.
Implement only this screen and journey. Preserve unrelated work.
Use existing styles and components where available. Do not invent unsupported capabilities.
Open the running app in a browser at 390px and 1440px, or report that browser access is unavailable.
Check the specified states, main action, keyboard focus and horizontal overflow.
Capture screenshots of the actual result. Compare with the reference and fix observed mismatches.
Record checks as pass, fail or not run, with evidence. Do not claim a check passed without running it.
Return changed files, screenshots, observed failures and remaining questions. Do not publish the app.
