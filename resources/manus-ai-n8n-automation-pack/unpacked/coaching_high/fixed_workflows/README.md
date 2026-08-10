# n8n Workflow Automation Package for Coaching Business

This package contains 10 complete n8n workflow automations designed for your coaching business. All workflows have been fixed to resolve the JSON format errors that were causing the "propertyValues[itemName] is not iterable" error during import.

## What Was Fixed

The error was occurring because of problematic nested objects in the "otherOptions" fields of Slack nodes. In all affected workflows, I've simplified or removed these problematic nested structures while maintaining the core functionality of each workflow.

## Included Workflows

### Content Creation & Posting Automations

1. **LinkedIn Thought-Leadership Workflow** - Automates creation and posting of thought leadership content to LinkedIn
2. **Instagram Visual Quote Automation** - Creates and posts visual quotes to Instagram
3. **Twitter Thread Automation** - Generates and posts Twitter threads
4. **Facebook Engagement Content Automation** - Creates and posts engaging content to Facebook
5. **Monthly Email Newsletter Automation** - Generates and sends monthly newsletters via email

### Client Management Automations

6. **Client Session Scheduling Automation** - Manages the scheduling process for coaching sessions
7. **Client Post-Session Feedback Automation** - Collects and processes feedback after coaching sessions
8. **Client Onboarding Intake Automation** - Streamlines the client onboarding process
9. **Inactive Client Reengagement Automation** - Automatically reaches out to inactive clients
10. **Client Milestone Recognition Automation** - Celebrates client achievements and milestones

## How to Use These Workflows

1. Import the JSON files into your n8n instance
2. Configure the credentials for each integration as outlined in the setup instructions
3. Customize the workflow parameters to match your specific business needs
4. Activate the workflows

## Documentation

- **workflow_explanations.md** - Detailed explanations of how each workflow functions
- **setup_instructions.md** - Complete setup instructions for all required credentials

## Important Notes

- All workflows require you to replace placeholder values (like `GOOGLE_SHEET_ID_PLACEHOLDER`) with your actual values
- API credentials need to be set up in n8n before the workflows will function properly
- Test each workflow thoroughly in a non-production environment before activating for regular use

If you have any questions or need further assistance with these workflows, please let me know!
