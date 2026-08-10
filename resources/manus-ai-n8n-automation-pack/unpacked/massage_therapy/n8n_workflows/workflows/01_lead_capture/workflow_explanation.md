# Lead Capture & Qualification System - Workflow Explanation

## Overview
This workflow automates the process of capturing leads from your massage therapy website, scoring them based on predefined criteria, and routing qualified leads to appropriate follow-up actions. It integrates with Google Sheets to store lead information and Gmail to send automated follow-up emails.

## Workflow Triggers
The workflow is triggered when a potential client submits a contact form on your website. This is implemented using the n8n Webhook node, which creates an endpoint that your website form can post data to.

## Step-by-Step Process

### 1. Capture Lead Information (Webhook Node)
- Creates a webhook endpoint that receives POST requests from your website contact form
- Captures essential lead information:
  - Name
  - Email
  - Phone
  - Service interest (massage type)
  - Preferred appointment time/day
  - How they heard about your business
  - Any additional notes or questions

### 2. Format Lead Data (Function Node)
- Standardizes and validates the incoming data
- Formats phone numbers consistently
- Converts service interests to standardized categories
- Adds a timestamp for when the lead was captured
- Creates a unique lead ID

### 3. Score and Qualify Lead (Function Node)
- Assigns a lead score based on predefined criteria:
  - Service interest alignment with your specialties (+1-3 points)
  - Completeness of contact information (+1-2 points)
  - Preferred appointment time availability (+1-2 points)
  - Referral source value (+0-2 points)
- Categorizes leads as:
  - Hot (7-9 points): Immediate follow-up
  - Warm (4-6 points): Standard follow-up
  - Cold (0-3 points): Marketing nurture campaign

### 4. Store Lead in Google Sheets (Google Sheets Node)
- Connects to your "Leads Database" Google Sheet
- Adds a new row with all lead information and scoring
- Updates the "Last Updated" timestamp
- Ensures no duplicate entries by checking email/phone

### 5. Conditional Routing (Switch Node)
- Routes the lead based on qualification score:
  - Hot leads: Immediate email notification to staff + high-priority follow-up email to lead
  - Warm leads: Standard follow-up email with booking link
  - Cold leads: Add to marketing nurture campaign

### 6. Send Staff Notification for Hot Leads (Gmail Node)
- For hot leads only
- Sends an email notification to designated staff member(s)
- Includes all lead details and recommended follow-up timeframe
- Provides quick-action links to contact the lead

### 7. Send Lead Follow-Up Email (Gmail Node)
- Sends personalized email based on lead qualification:
  - Hot leads: Personalized response addressing their specific interests with priority booking link
  - Warm leads: Standard follow-up with service information and booking options
  - Cold leads: General information about services with invitation to learn more

### 8. Add Cold Leads to Nurture Campaign (If Node + HTTP Request)
- For cold leads only
- Adds lead to your email marketing system (e.g., Mailchimp, Constant Contact)
- Assigns to appropriate nurture campaign based on service interest
- Schedules regular follow-up content

### 9. Create Follow-Up Task (Google Sheets Node)
- For hot and warm leads
- Adds a follow-up task to your "Tasks" Google Sheet
- Sets deadline based on lead temperature (24 hours for hot, 48 hours for warm)
- Assigns to appropriate staff member

### 10. Error Handling (Error Trigger Node)
- Monitors for any failures in the workflow
- Sends notification to administrator if any step fails
- Logs errors for troubleshooting
- Attempts to recover and continue workflow when possible

## Integration Points
- **Website Form**: Connects via Webhook
- **Google Sheets**: Stores lead information and follow-up tasks
- **Gmail**: Sends notifications and follow-up emails
- **Email Marketing System**: Optional integration for nurture campaigns

## Customization Options
- Adjust scoring criteria based on your business priorities
- Modify email templates to match your brand voice
- Configure follow-up timeframes based on your staff availability
- Add additional qualification criteria specific to your practice

## Benefits
- Automates lead capture from website inquiries
- Ensures consistent lead qualification
- Prioritizes high-value leads for immediate attention
- Prevents leads from falling through the cracks
- Provides data for marketing effectiveness analysis
- Increases conversion rates through timely, relevant follow-up
