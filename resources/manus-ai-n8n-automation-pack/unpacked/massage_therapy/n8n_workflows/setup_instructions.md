# N8n Workflow Setup Instructions

This document provides comprehensive setup instructions for all 10 n8n workflows created for your massage therapy business. Follow these instructions to properly set up and configure each workflow in your n8n instance.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [General Setup Instructions](#general-setup-instructions)
3. [Credential Setup](#credential-setup)
4. [Workflow-Specific Instructions](#workflow-specific-instructions)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up these workflows, ensure you have:

1. **n8n Instance**: A running n8n instance (self-hosted or cloud)
2. **Google Workspace**: Access to Google services (Gmail, Calendar, Sheets)
3. **API Access**: Required API credentials for third-party services
4. **Database**: Google Sheets set up with the required structure for storing data

## General Setup Instructions

### Installing n8n

If you haven't installed n8n yet:

**Docker Installation (Recommended)**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**NPM Installation**
```bash
npm install n8n -g
n8n start
```

### Importing Workflows

1. Access your n8n instance at `http://localhost:5678` (or your custom URL)
2. Navigate to "Workflows" in the left sidebar
3. Click the "Import from File" button
4. Select the JSON workflow file you want to import
5. Review the imported workflow and click "Save"
6. Repeat for all 10 workflow files

## Credential Setup

### Google Services Setup

#### Google OAuth2 API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Set Application Type to "Web application"
6. Add authorized redirect URIs:
   - `https://your-n8n-domain.com/rest/oauth2-credential/callback`
   - `http://localhost:5678/rest/oauth2-credential/callback` (for local development)
7. Note your Client ID and Client Secret

In n8n:
1. Go to "Credentials" in the left sidebar
2. Click "Create New"
3. Select "OAuth2 API" under "Google"
4. Enter your Client ID and Client Secret
5. Save the credential

#### Gmail

1. In n8n, go to "Credentials"
2. Click "Create New"
3. Select "Gmail OAuth2 API"
4. Follow the OAuth flow to authorize n8n to access your Gmail account
5. Save the credential as "gmail_credentials"

#### Google Calendar

1. In n8n, go to "Credentials"
2. Click "Create New"
3. Select "Google Calendar OAuth2 API"
4. Follow the OAuth flow to authorize n8n to access your Google Calendar
5. Save the credential as "google_calendar_credentials"

#### Google Sheets

1. In n8n, go to "Credentials"
2. Click "Create New"
3. Select "Google Sheets OAuth2 API"
4. Follow the OAuth flow to authorize n8n to access your Google Sheets
5. Save the credential as "google_sheets_credentials"

### Social Media API Setup

#### Facebook/Instagram

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the "Instagram Graph API" and "Facebook Graph API" products
4. Generate access tokens with the required permissions
5. In n8n, create HTTP Header Auth credentials:
   - Name: "Facebook API"
   - Header Parameter Name: "Authorization"
   - Header Parameter Value: "Bearer YOUR_ACCESS_TOKEN"

#### Twitter

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use an existing one
3. Generate API keys and access tokens
4. In n8n, create HTTP Header Auth credentials:
   - Name: "Twitter API"
   - Header Parameter Name: "Authorization"
   - Header Parameter Value: "Bearer YOUR_ACCESS_TOKEN"

### SMS Service Setup (Twilio)

1. Sign up for a [Twilio account](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. In n8n, create HTTP Basic Auth credentials:
   - Name: "Twilio API"
   - User: YOUR_ACCOUNT_SID
   - Password: YOUR_AUTH_TOKEN
5. Set environment variables in n8n:
   - TWILIO_ACCOUNT_SID: Your Twilio Account SID
   - TWILIO_PHONE_NUMBER: Your Twilio phone number

## Workflow-Specific Instructions

### 1. Lead Capture & Qualification System

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Create a Google Sheet named "Leads" with the following columns:
   - id, name, email, phone, source, dateSubmitted, leadScore, status, notes
2. Update the Google Sheets node to point to your sheet
3. Customize the lead scoring logic in the "Score Lead" node
4. Update email templates in the Gmail nodes
5. Set the webhook URL in your website contact forms

**Webhook URL:** `https://your-n8n-domain.com/webhook/lead-capture`

### 2. Appointment Scheduling Automation

**Required Credentials:**
- Google Calendar OAuth2 API
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Create a Google Sheet named "Appointments" with the following columns:
   - id, clientId, clientName, appointmentDate, startTime, endTime, serviceType, therapistId, therapistName, status, notes
2. Create a Google Sheet named "Therapists" with the following columns:
   - id, name, specialties, workingHours, status
3. Update the Google Sheets nodes to point to your sheets
4. Configure the Google Calendar node with your business calendar
5. Update email templates in the Gmail nodes
6. Set the webhook URL in your online booking system

**Webhook URL:** `https://your-n8n-domain.com/webhook/appointment-request`

### 3. Appointment Reminder Sequence

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API
- Twilio API (for SMS)

**Setup Steps:**
1. Ensure your "Appointments" Google Sheet is set up (see Workflow 2)
2. Update the Google Sheets node to point to your sheet
3. Configure reminder timing in the "Schedule Reminders" node
4. Update email templates in the Gmail nodes
5. Update SMS templates in the Twilio HTTP Request nodes
6. Set environment variables for Twilio

### 4. Client Intake Form Processing

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Create a Google Sheet named "Clients" with the following columns:
   - id, firstName, lastName, email, phone, dateOfBirth, address, emergencyContact, medicalHistory, preferences, creationDate
2. Create a Google Sheet named "Intake Forms" with the following columns:
   - id, clientId, formDate, formData, status, notes
3. Update the Google Sheets nodes to point to your sheets
4. Customize the form validation logic in the "Validate Form Data" node
5. Update email templates in the Gmail nodes
6. Set the webhook URL in your intake form system

**Webhook URL:** `https://your-n8n-domain.com/webhook/intake-form-submission`

### 5. Post-Appointment Follow-Up System

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Ensure your "Appointments" and "Clients" Google Sheets are set up
2. Create a Google Sheet named "Feedback" with the following columns:
   - id, clientId, appointmentId, rating, comments, dateSubmitted, followupStatus
3. Update the Google Sheets nodes to point to your sheets
4. Configure follow-up timing in the "Schedule Follow-ups" node
5. Update email templates in the Gmail nodes
6. Set the webhook URL for feedback submission

**Webhook URL:** `https://your-n8n-domain.com/webhook/feedback-submission`

### 6. Inactive Client Re-engagement

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Ensure your "Clients" and "Appointments" Google Sheets are set up
2. Create a Google Sheet named "Re-engagement Campaigns" with the following columns:
   - id, clientId, lastAppointmentDate, daysSinceLastVisit, campaignType, sentDate, status, response
3. Update the Google Sheets nodes to point to your sheets
4. Configure inactivity thresholds in the "Identify Inactive Clients" node
5. Update email templates in the Gmail nodes
6. Set the webhook URL for tracking re-engagement responses

**Webhook URL:** `https://your-n8n-domain.com/webhook/reengagement-response`

### 7. Therapist Schedule Management

**Required Credentials:**
- Google Calendar OAuth2 API
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Ensure your "Therapists" and "Appointments" Google Sheets are set up
2. Create a Google Sheet named "Therapist Availability" with the following columns:
   - id, therapistId, date, startTime, endTime, status, notes
3. Update the Google Sheets nodes to point to your sheets
4. Configure the Google Calendar nodes with your therapists' calendars
5. Update email templates in the Gmail nodes
6. Set the webhook URL for availability updates

**Webhook URL:** `https://your-n8n-domain.com/webhook/therapist-availability-update`

### 8. Marketing Campaign Automation

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API
- Facebook API
- Instagram API
- Twitter API

**Setup Steps:**
1. Create a Google Sheet named "Marketing Campaigns" with the following columns:
   - id, campaignName, description, startDate, endDate, targetAudience, goals, budget, contentSchedule, trackingLinks, owner, status
2. Create a Google Sheet named "Campaign Content" with the following columns:
   - contentId, campaignId, contentType, contentText, contentImage, scheduledDate, platforms, submittedBy, status, submissionDate
3. Create a Google Sheet named "Posted Content" with the following columns:
   - id, contentId, campaignId, platform, postDate, postUrl, likes, comments, shares, clicks
4. Create a Google Sheet named "Campaign Reports" with the following columns:
   - id, campaignId, reportPeriod, totalPosts, platformBreakdown, engagementMetrics, generatedDate
5. Update the Google Sheets nodes to point to your sheets
6. Configure social media API credentials
7. Set environment variables for social media accounts:
   - FACEBOOK_PAGE_ID: Your Facebook page ID
   - INSTAGRAM_ACCOUNT_ID: Your Instagram account ID
8. Update email templates in the Gmail nodes
9. Set the webhook URL for content submissions

**Webhook URL:** `https://your-n8n-domain.com/webhook/campaign-content-submission`

### 9. Client Birthday/Anniversary Recognition

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API
- Twilio API (for SMS)

**Setup Steps:**
1. Ensure your "Clients" Google Sheet is set up with dateOfBirth and firstVisitDate columns
2. Create a Google Sheet named "Special Date Messages" with the following columns:
   - id, clientId, specialDateType, specialDate, sentDate, messageType, promoCode, expirationDate
3. Create a Google Sheet named "Special Offers" with the following columns:
   - id, promoCode, clientId, offerType, discount, validFrom, validTo, status
4. Create a Google Sheet named "Offer Redemptions" with the following columns:
   - redemptionId, clientId, promoCode, appointmentDate, serviceType, redemptionDate
5. Create a Google Sheet named "Special Date Reports" with the following columns:
   - id, reportPeriod, messageStats, redemptionStats, businessImpact, generatedDate
6. Update the Google Sheets nodes to point to your sheets
7. Configure Twilio for SMS messages
8. Update email templates in the Gmail nodes
9. Set the webhook URL for offer redemptions

**Webhook URL:** `https://your-n8n-domain.com/webhook/special-date-redemption`

### 10. Business Analytics Dashboard

**Required Credentials:**
- Google Sheets OAuth2 API
- Gmail OAuth2 API

**Setup Steps:**
1. Ensure all previous Google Sheets are set up
2. Create a Google Sheet named "Weekly Business Reports" with the following columns:
   - id, reportPeriod, totalAppointments, weeklyGrowthRate, serviceTypeDistribution, therapistDistribution, dayOfWeekDistribution, timeOfDayDistribution, cancellationRate, noShowRate, totalRevenue, serviceRevenue, productRevenue, newClientsLastWeek, activeClientsLastWeek, retentionRate, insights, generatedDate
3. Create a Google Sheet named "Monthly Business Reports" with the following columns:
   - id, reportPeriod, keyMetrics, monthlyTrends, servicePerformance, therapistPerformance, clientSegmentation, insights, recommendations, generatedDate
4. Update the Google Sheets nodes to point to your sheets
5. Update email templates in the Gmail nodes
6. Set the webhook URL for dashboard data requests

**Webhook URL:** `https://your-n8n-domain.com/webhook/dashboard-data-request`

## Troubleshooting

### Common Issues and Solutions

1. **Workflow Not Running on Schedule**
   - Check that your n8n instance is running continuously
   - Verify that the schedule trigger is properly configured
   - Check timezone settings in your n8n instance

2. **API Authentication Errors**
   - Verify that your credentials are correct and not expired
   - Check that you have the necessary permissions for each API
   - Regenerate access tokens if needed

3. **Webhook Not Receiving Data**
   - Ensure your n8n instance is publicly accessible
   - Verify the webhook URL is correctly set in your forms/systems
   - Check for any firewall or network restrictions

4. **Google Sheets Integration Issues**
   - Verify sheet names and column headers match exactly
   - Check that your Google account has proper permissions
   - Ensure your OAuth tokens haven't expired

5. **Email Sending Failures**
   - Check Gmail sending limits (2000 emails per day)
   - Verify email templates for syntax errors
   - Check that recipient email addresses are valid

### Getting Help

If you encounter issues not covered here:

1. Check the [n8n documentation](https://docs.n8n.io/)
2. Visit the [n8n forum](https://community.n8n.io/)
3. Contact your implementation specialist for personalized support

## Maintenance and Updates

To keep your workflows running smoothly:

1. **Regular Monitoring**: Check workflow execution logs weekly
2. **Credential Renewal**: Update OAuth credentials before they expire
3. **Data Cleanup**: Archive old data in Google Sheets periodically
4. **Version Control**: Export and backup your workflows regularly
5. **Updates**: Keep your n8n instance updated to the latest version

By following these setup instructions, you'll have a fully automated system for managing your massage therapy business operations, from lead capture to client retention and business analytics.
