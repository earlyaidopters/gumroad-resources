# Google Services Integration Setup Guide

This guide will walk you through the process of setting up Google services integration for use with your n8n workflows. Google services (Gmail, Calendar, Sheets) are used extensively across your coaching workflows for email communication, scheduling, and data storage.

## Prerequisites

- A Google account (preferably a Google Workspace business account)
- n8n instance up and running
- Basic familiarity with Google Cloud Platform

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Coaching Automation")
5. Click "Create"
6. Wait for the project to be created and select it

## Step 2: Enable Required APIs

You'll need to enable several Google APIs for your workflows:

1. In your Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for and enable each of the following APIs:
   - Gmail API
   - Google Calendar API
   - Google Sheets API
   - Google Drive API (required for Sheets)
3. For each API, click "Enable" and wait for activation

## Step 3: Configure OAuth Consent Screen

1. In Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have Google Workspace with all users internal)
3. Click "Create"
4. Fill in the required information:
   - App name: "Coaching Automation"
   - User support email: Your email address
   - Developer contact information: Your email address
5. Click "Save and Continue"
6. Add the following scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`
7. Click "Save and Continue"
8. Add test users (including your own email)
9. Click "Save and Continue"
10. Review your settings and click "Back to Dashboard"

## Step 4: Create OAuth Credentials

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" and select "OAuth client ID"
3. Select "Web application" as the application type
4. Name: "n8n Integration"
5. Add authorized redirect URIs:
   - Add your n8n instance OAuth callback URL: `https://your-n8n-instance.com/oauth2/callback`
   - If using localhost for development: `http://localhost:5678/oauth2/callback`
6. Click "Create"
7. A popup will show your Client ID and Client Secret - copy these and store them securely

## Step 5: Configure Gmail Credentials in n8n

1. Open your n8n instance
2. Click on "Settings" in the left sidebar
3. Select "Credentials"
4. Click "Add Credential"
5. Search for and select "Gmail OAuth2 API"
6. Fill in the following details:
   - **Credential Name**: "Gmail Coaching Communications"
   - **Client ID**: Paste your Google OAuth Client ID
   - **Client Secret**: Paste your Google OAuth Client Secret
   - **Scope**: `https://www.googleapis.com/auth/gmail.send`
7. Click "Connect" to authorize n8n with your Google account
8. Follow the OAuth flow to grant access
9. Click "Save" to store your credentials

## Step 6: Configure Google Calendar Credentials in n8n

1. In n8n, go to "Settings" > "Credentials"
2. Click "Add Credential"
3. Search for and select "Google Calendar OAuth2 API"
4. Fill in the following details:
   - **Credential Name**: "Google Calendar Coaching Sessions"
   - **Client ID**: Paste your Google OAuth Client ID
   - **Client Secret**: Paste your Google OAuth Client Secret
   - **Scope**: `https://www.googleapis.com/auth/calendar`
5. Click "Connect" to authorize n8n with your Google account
6. Follow the OAuth flow to grant access
7. Click "Save" to store your credentials

## Step 7: Configure Google Sheets Credentials in n8n

1. In n8n, go to "Settings" > "Credentials"
2. Click "Add Credential"
3. Search for and select "Google Sheets OAuth2 API"
4. Fill in the following details:
   - **Credential Name**: "Google Sheets Coaching Data"
   - **Client ID**: Paste your Google OAuth Client ID
   - **Client Secret**: Paste your Google OAuth Client Secret
   - **Scope**: `https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive`
5. Click "Connect" to authorize n8n with your Google account
6. Follow the OAuth flow to grant access
7. Click "Save" to store your credentials

## Step 8: Set Up Required Google Sheets

Several workflows require specific Google Sheets for data storage:

1. Create a new Google Sheet named "Coaching Business Automation"
2. Add the following worksheets (tabs):
   - "Clients" (columns: Name, Email, Phone, Intake Date, Goals, Preferred Coaching Type, Referral Source, Status, Notes, Last Re-engagement Date, Re-engagement Count)
   - "Client Sessions" (columns: Date, Time, Client Name, Client Email, Session Type, Status, Calendar Event ID, Notes, Feedback Sent, Feedback Sent Date, Feedback Received, Feedback Rating)
   - "Content Calendar" (columns: Date, Platform, Content Type, Topic, Status, Content, Published URL)
   - "Content Tracking" (columns: Date, Platform, Content Type, Topic, Post ID, Engagement Metrics)
   - "Client Feedback" (columns: Session ID, Client Name, Submission Date, Overall Rating, Value Rating, Coach Rating, Comments, Improvement Suggestions)
   - "Newsletter Archive" (columns: Date, Month, Subject, Content, Recipients)
   - "Client Milestones" (columns: Client Name, Client Email, Milestone Type, Milestone Description, Trigger Date, Status, Recognition Date, Notes)
   - "Re-engagement Tracking" (columns: Client Name, Client Email, Date Sent, Days Inactive, Re-engagement Count, Status, Response Date, Notes)
3. Format each sheet with appropriate headers
4. Note the Google Sheet ID from the URL (the long string between /d/ and /edit in the URL)
5. Update this Sheet ID in all relevant workflow files

## Step 9: Test Your Google Integrations

1. Create a new workflow in n8n
2. Add nodes for Gmail, Google Calendar, and Google Sheets
3. Configure each node with your newly created credentials
4. Execute simple test operations for each service
5. Verify that all connections are working correctly

## Usage Considerations

- **API Quotas**: Google APIs have usage quotas - monitor your usage if running workflows frequently
- **Authentication Expiration**: OAuth tokens may expire and need refreshing
- **Sheet Structure**: Maintain consistent column names and structure in your Google Sheets
- **Email Sending Limits**: Gmail has sending limits that may affect high-volume workflows

## Troubleshooting

- **Authentication Errors**: Verify your Client ID and Secret are correct
- **Access Denied**: Ensure you've granted all necessary permissions during OAuth
- **Sheet Not Found**: Verify Sheet IDs are correct and sheets are accessible
- **API Quota Exceeded**: Spread operations across time or request higher quotas

## Security Best Practices

- Never share your Google OAuth Client Secret
- Regularly review app permissions in your Google account
- Consider using a dedicated Google account for automation
- Use environment variables for storing credentials in production environments
- Implement proper access controls on your Google Sheets

By following this guide, you'll have successfully set up Google services integration for use in your n8n coaching workflows. These integrations provide essential functionality for email communication, scheduling, and data storage across your automation system.
