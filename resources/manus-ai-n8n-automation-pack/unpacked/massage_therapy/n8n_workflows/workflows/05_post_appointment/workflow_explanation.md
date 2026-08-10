# Post-Appointment Follow-Up System - Workflow Explanation

## Overview
This workflow automates the process of following up with clients after their massage therapy appointments. It sends personalized thank-you emails, requests feedback or online reviews, and offers incentives for booking subsequent appointments, helping to enhance client satisfaction and increase retention rates.

## Workflow Triggers
The workflow is triggered when an appointment is marked as "completed" in your scheduling system, typically at the end of the business day (Google Calendar Node + Schedule Node).

## Step-by-Step Process

### 1. Identify Completed Appointments (Google Calendar Node)
- Connects to your Google Calendar
- Identifies all appointments marked as "completed" for the current day
- Retrieves appointment details including:
  - Client name and contact information
  - Service received
  - Therapist who provided the service
  - Appointment duration and time
  - Any notes added during the session

### 2. Retrieve Client History (Google Sheets Node)
- Queries your client database in Google Sheets
- Retrieves client's appointment history and preferences
- Determines client status (first-time, occasional, regular)
- Checks previous feedback and review history
- Identifies any special notes from the therapist

### 3. Personalize Follow-Up Content (Function Node)
- Creates personalized content based on:
  - Client's visit frequency (first-time vs. returning)
  - Service received
  - Therapist who provided the service
  - Any special notes from the session
  - Previous feedback patterns
  - Time since last review request
- Determines optimal follow-up type:
  - Thank you + rebooking incentive
  - Feedback request
  - Review request
  - Combination approach

### 4. Delay Timer (Wait Node)
- Sets appropriate delay before sending follow-up
- Typically 3-6 hours after appointment completion
- Configurable based on appointment time and type
- Ensures client has had time to experience benefits of the massage

### 5. Send Thank-You Email (Gmail Node)
- Sends personalized thank-you email including:
  - Genuine appreciation for their visit
  - Personalized message referencing their specific service
  - Therapist's name and brief personalized note
  - Self-care recommendations based on their treatment
  - Subtle mention of booking their next appointment

### 6. Conditional Routing Based on Client Status (Switch Node)
- Routes to different follow-up paths based on client status:
  - First-time clients: Focus on welcome and rebooking
  - Returning clients (no recent review): Request review
  - Regular clients: Request feedback and offer loyalty rewards
  - Special cases: Custom follow-up based on session notes

### 7. For First-Time Clients (Gmail Node)
- Sends special welcome message
- Includes new client special offer for next booking
- Provides educational content about benefits of regular massage
- Sets expectations for optimal treatment frequency
- Includes prominent booking button with special offer code

### 8. For Review-Eligible Clients (Gmail Node)
- Sends review request email
- Includes direct links to your Google Business, Yelp, or other review platforms
- Provides simple instructions for leaving a review
- Offers small incentive for completing review (e.g., $5 off next service)
- Includes sample review template to make it easier

### 9. For Regular Clients (Gmail Node)
- Sends loyalty appreciation message
- Includes brief feedback form (3-5 questions)
- Offers loyalty program points or benefits
- Suggests booking their next appointment with recommended timeframe
- Includes personalized service recommendations

### 10. SMS Follow-Up Option (Twilio Node or HTTP Request)
- For clients who prefer SMS communication
- Sends brief thank-you message
- Includes short link to feedback form or review site
- Mentions rebooking with simple reply option

### 11. Track Response and Engagement (Webhook Node)
- Creates endpoints to track:
  - Email opens and clicks
  - Review submission completions
  - Feedback form submissions
  - Rebooking link clicks
- Records all engagement metrics for analysis

### 12. Process Feedback Submissions (Function Node)
- Analyzes feedback responses
- Flags any concerns or issues for immediate attention
- Categorizes feedback by theme (therapist, facility, service, etc.)
- Calculates satisfaction scores
- Prepares summary for staff review

### 13. Handle Negative Feedback (Switch Node)
- Identifies feedback below threshold score (typically <4/5)
- Creates high-priority follow-up task for manager
- Generates personalized response template addressing concerns
- Offers appropriate service recovery options
- Sets reminder for manager check-in

### 14. Update Client Record (Google Sheets Node)
- Records follow-up communications sent
- Updates feedback and review history
- Notes any special requests or concerns
- Updates client lifetime value and engagement metrics
- Records rebooking status or intentions

### 15. Create Rebooking Reminder (Google Calendar Node)
- For clients who don't rebook immediately
- Creates follow-up reminder at optimal interval
- Sets appropriate staff task for personal outreach if needed
- Schedules targeted rebooking email for optimal timing

### 16. Generate Follow-Up Reports (Google Sheets Node)
- Creates daily summary of all follow-ups sent
- Tracks response rates and sentiment
- Monitors review submission completion
- Analyzes rebooking conversion rates
- Identifies trends in feedback

### 17. Error Handling (Error Trigger Node)
- Monitors for any failures in the follow-up process
- Alerts staff to any failed communications
- Creates manual follow-up tasks for failed attempts
- Logs errors for troubleshooting

## Integration Points
- **Google Calendar**: Source of appointment completion data
- **Google Sheets**: Client database and feedback tracking
- **Gmail**: Sending email follow-ups
- **Twilio** (or similar service): Sending SMS follow-ups
- **Review Platforms**: Direct links to Google, Yelp, etc.
- **Website**: Hosting feedback forms and rebooking pages

## Customization Options
- Adjust timing of follow-up messages
- Customize follow-up sequences by service type
- Configure different incentives for different client segments
- Implement A/B testing of follow-up messages
- Create seasonal or special promotion follow-ups

## Benefits
- Enhances client satisfaction through personalized follow-up
- Increases rebooking rates with timely incentives
- Generates valuable feedback for service improvement
- Boosts online reviews and reputation
- Identifies and addresses client concerns quickly
- Strengthens client relationships through consistent communication
- Provides valuable data on client satisfaction and preferences
