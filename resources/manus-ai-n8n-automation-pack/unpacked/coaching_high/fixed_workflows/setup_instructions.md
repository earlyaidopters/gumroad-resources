# n8n Workflow Setup and Credential Instructions

This document provides detailed instructions for setting up all required credentials and configuring the n8n workflows for your coaching business automation system.

## Prerequisites

Before setting up the workflows, ensure you have:

1. An n8n instance installed and running (version 1.0.0 or higher recommended)
2. Access to all required platform accounts (Google, social media, Slack, etc.)
3. Admin privileges to create API keys and credentials

## General Setup Process

### 1. Install n8n

If you haven't already installed n8n, you can do so using one of these methods:

**Using npm:**
```bash
npm install n8n -g
```

**Using Docker:**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Access n8n Dashboard

Open your browser and navigate to:
```
http://localhost:5678
```

### 3. Import Workflows

1. In the n8n dashboard, click on "Workflows" in the left sidebar
2. Click the "Import from File" button
3. Select each of the JSON workflow files provided in this package
4. After import, you'll need to configure credentials for each workflow

## Required Credentials Setup

### Google API Credentials

Most workflows require Google services (Gmail, Calendar, Sheets). Here's how to set them up:

#### Google OAuth2 API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Dashboard"
4. Click "+ ENABLE APIS AND SERVICES"
5. Search for and enable the following APIs:
   - Gmail API
   - Google Calendar API
   - Google Sheets API
6. Go to "APIs & Services" > "Credentials"
7. Click "Create Credentials" > "OAuth client ID"
8. Select "Web application" as the application type
9. Add the following redirect URI:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```
   (Replace localhost:5678 with your n8n domain if hosted elsewhere)
10. Click "Create" and note down the Client ID and Client Secret

#### In n8n:

1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "OAuth2 API" under "Credential Type"
4. Enter a name (e.g., "Google OAuth")
5. Enter the Client ID and Client Secret from Google
6. For "Authorization URL" enter:
   ```
   https://accounts.google.com/o/oauth2/v2/auth
   ```
7. For "Token URL" enter:
   ```
   https://oauth2.googleapis.com/token
   ```
8. For "Scope" enter (depending on which services you need):
   ```
   https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets
   ```
9. Click "Create"
10. Click "Connect" and follow the Google authentication process

Repeat this process to create separate credentials for each Google service if desired (Gmail, Calendar, Sheets).

### OpenAI API

1. Go to [OpenAI's website](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to the API section
4. Create a new API key and copy it

#### In n8n:

1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "OpenAI API" under "Credential Type"
4. Enter a name (e.g., "OpenAI")
5. Paste your API key
6. Click "Create"

### Slack API

1. Go to [Slack API website](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Enter a name and select your workspace
5. Under "OAuth & Permissions", add the following scopes:
   - `chat:write`
   - `chat:write.public`
   - `channels:read`
6. Install the app to your workspace
7. Copy the "Bot User OAuth Token"

#### In n8n:

1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "Slack API" under "Credential Type"
4. Enter a name (e.g., "Slack")
5. Paste your Bot User OAuth Token
6. Click "Create"

### LinkedIn API

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in the required information
4. Under "Products", select "Marketing Developer Platform"
5. Request access to the Marketing Developer Platform
6. Once approved, go to "Auth" tab
7. Note down the Client ID and Client Secret
8. Add the redirect URL:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```

#### In n8n:

1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "LinkedIn OAuth2 API" under "Credential Type"
4. Enter a name (e.g., "LinkedIn")
5. Enter the Client ID and Client Secret
6. For "Authorization URL" enter:
   ```
   https://www.linkedin.com/oauth/v2/authorization
   ```
7. For "Token URL" enter:
   ```
   https://www.linkedin.com/oauth/v2/accessToken
   ```
8. For "Scope" enter:
   ```
   r_liteprofile w_member_social
   ```
9. Click "Create"
10. Click "Connect" and follow the LinkedIn authentication process

### Facebook/Instagram API

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add the "Instagram Graph API" product
4. Navigate to "App Settings" > "Basic"
5. Note down the App ID and App Secret
6. Under "Products" > "Instagram Graph API" > "Settings", add an Instagram test user

#### In n8n:

1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "Facebook OAuth2 API" under "Credential Type"
4. Enter a name (e.g., "Facebook/Instagram")
5. Enter the App ID and App Secret
6. For "Authorization URL" enter:
   ```
   https://www.facebook.com/dialog/oauth
   ```
7. For "Token URL" enter:
   ```
   https://graph.facebook.com/oauth/access_token
   ```
8. For "Scope" enter:
   ```
   pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish
   ```
9. Click "Create"
10. Click "Connect" and follow the Facebook authentication process

### Twitter API

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Apply for Elevated access (required for posting)
4. Navigate to "Keys and Tokens"
5. Generate "Consumer Keys" (API Key and Secret)
6. Generate "Access Token and Secret"

#### In n8n:

1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "Twitter OAuth1a API" under "Credential Type"
4. Enter a name (e.g., "Twitter")
5. Enter the API Key, API Secret, Access Token, and Access Token Secret
6. Click "Create"

## Google Sheets Setup

Several workflows require specific Google Sheets for data storage and tracking. Here's how to set them up:

### 1. Content Creation Tracking Sheet

Create a new Google Sheet with the following tabs:

**Content Topics:**
- Columns: Topic, Category, Status (Used/Unused), Notes

**Quotes:**
- Columns: Quote, Author, Category, Status (Used/Unused)

**Thread Topics:**
- Columns: Topic, Category, Status (Used/Unused), Notes

**Content Calendar:**
- Columns: Date, Platform, Content Type, Status, Notes

**Newsletter Content:**
- Columns: Month, Topic, Highlights, Events, Tips, Status

### 2. Client Management Sheets

Create a new Google Sheet with the following tabs:

**Clients:**
- Columns: id, first_name, last_name, email, phone, coaching_type, session_count, status, notes, created_date

**Sessions:**
- Columns: date, client_id, client_name, session_date, session_type, duration, status, event_id

**Feedback:**
- Columns: date, client_id, client_name, event_id, session_date, feedback_id, request_sent, feedback_received, reminder_sent

**Responses:**
- Columns: feedback_id, client_id, submission_date, overall_rating, content_rating, coach_rating, comments, improvement_suggestions

**Registrations:**
- Columns: id, first_name, last_name, email, phone, coaching_interest, source, registration_date, status

**Tracking:**
- Columns: date, client_id, first_name, last_name, email, welcome_email_sent, intake_form_completed, initial_session_scheduled, resources_sent, status

**Reengagement:**
- Columns: date, client_id, client_name, email, type, days_inactive, response_received, notes

**Milestones:**
- Columns: date, client_id, client_name, email, milestone_type, milestone_category, description, email_sent

**Achievements:**
- Columns: client_id, goal_id, achievement_date, achievement_description, goal_details

## Workflow-Specific Setup

### 1. LinkedIn Thought-Leadership Workflow

1. Import the workflow JSON file
2. Configure the Google Sheets node to point to your Content Topics sheet
3. Set up the LinkedIn credentials
4. Adjust the Schedule node to your preferred posting frequency
5. Update the OpenAI prompt to match your coaching niche and voice

### 2. Instagram Visual Quote Automation

1. Import the workflow JSON file
2. Configure the Google Sheets node to point to your Quotes sheet
3. Set up the Facebook/Instagram credentials
4. Ensure your Instagram account is connected to a Facebook Page
5. Adjust the Schedule node to your preferred posting frequency
6. Update the image templates if desired

### 3. Twitter Thread Automation

1. Import the workflow JSON file
2. Configure the Google Sheets node to point to your Thread Topics sheet
3. Set up the Twitter credentials
4. Adjust the Schedule node to your preferred posting frequency
5. Update the OpenAI prompt to match your coaching voice

### 4. Facebook Engagement Content Automation

1. Import the workflow JSON file
2. Configure the Google Sheets node to point to your Content Calendar sheet
3. Set up the Facebook credentials
4. Adjust the Schedule node to your preferred posting frequency
5. Update the content type rotation in the workflow if desired

### 5. Monthly Email Newsletter Automation

1. Import the workflow JSON file
2. Configure the Google Sheets nodes to point to your Clients and Newsletter Content sheets
3. Set up the Gmail credentials
4. Adjust the Schedule node to your preferred sending date
5. Update the newsletter template and sections as needed

### 6. Client Session Scheduling Automation

1. Import the workflow JSON file
2. Configure the Google Calendar node with your coaching calendar
3. Configure the Google Sheets node to point to your Clients and Sessions sheets
4. Set up the Gmail and Slack credentials
5. Update email templates and reminder timing if needed

### 7. Client Post-Session Feedback Automation

1. Import the workflow JSON file
2. Configure the Google Calendar node with your coaching calendar
3. Configure the Google Sheets nodes to point to your Feedback and Responses sheets
4. Set up the Gmail and Slack credentials
5. Create a feedback form (Google Forms recommended) and update the form URL in the workflow
6. Adjust the feedback request timing if needed

### 8. Client Onboarding Intake Automation

1. Import the workflow JSON file
2. Configure the Google Sheets nodes to point to your Registrations, Tracking, and Clients sheets
3. Set up the Gmail and Slack credentials
4. Create an intake form (Google Forms recommended) and update the form URL in the workflow
5. Update the welcome email template and resources as needed

### 9. Inactive Client Reengagement Automation

1. Import the workflow JSON file
2. Configure the Google Sheets nodes to point to your Clients, Sessions, and Reengagement sheets
3. Set up the Gmail and Slack credentials
4. Adjust the inactivity thresholds if needed (currently set to 30, 60, and 90 days)
5. Update the reengagement email templates and offers as needed

### 10. Client Milestone Recognition Automation

1. Import the workflow JSON file
2. Configure the Google Sheets nodes to point to your Clients, Sessions, Achievements, and Milestones sheets
3. Set up the Gmail and Slack credentials
4. Adjust the milestone thresholds if needed
5. Update the celebration email templates as needed

## Placeholder Replacement

After importing the workflows, you'll need to replace several placeholders:

1. `GOOGLE_SHEET_ID_PLACEHOLDER` - Replace with your actual Google Sheet IDs
2. `GOOGLE_CALENDAR_CREDENTIAL_ID_PLACEHOLDER` - Replace with your Google Calendar credential ID
3. `GOOGLE_SHEETS_CREDENTIAL_ID_PLACEHOLDER` - Replace with your Google Sheets credential ID
4. `YOUR_EMAIL@gmail.com` - Replace with your actual email address

To find these IDs in n8n:
1. Go to "Credentials" in the left sidebar
2. Click on the credential you want to use
3. Copy the ID from the URL (the string after /credential/)

## Testing the Workflows

Before activating the workflows for production use:

1. Use the "Execute Workflow" button to test each workflow individually
2. Check the execution results for any errors
3. Verify that the data is being correctly stored in your Google Sheets
4. Test email sending with a test email address
5. Confirm social media posts are appearing as expected

## Activating the Workflows

Once testing is complete:

1. Toggle the "Active" switch on each workflow
2. Confirm the schedule settings are correct
3. Monitor the first few automated runs to ensure everything is working correctly

## Troubleshooting

If you encounter issues:

1. Check the execution log for error messages
2. Verify all credentials are correctly configured
3. Ensure Google Sheets are properly set up with the required columns
4. Check API rate limits if you're experiencing failures with social media posting
5. Verify that all OAuth tokens are valid and not expired

## Maintenance

To keep your workflows running smoothly:

1. Periodically check for n8n updates
2. Monitor API credential expirations
3. Review and update your content strategy quarterly
4. Adjust AI prompts as needed to keep content fresh
5. Back up your workflow configurations regularly

For any additional assistance, please refer to the [n8n documentation](https://docs.n8n.io/) or contact your workflow developer.
