# Inactive Client Re-engagement - Workflow Explanation

## Overview
This workflow automatically identifies clients who haven't booked an appointment in over 60 days, triggers personalized re-engagement email sequences, and tracks response rates and successful conversions. It helps recover potentially lost clients and increase retention rates for your massage therapy practice.

## Workflow Triggers
The workflow is triggered on a weekly schedule (typically Monday mornings) to identify and re-engage inactive clients (Schedule Node).

## Step-by-Step Process

### 1. Weekly Inactive Client Check (Schedule Node)
- Runs automatically once per week (recommended: Monday mornings)
- Initiates the process to identify inactive clients
- Can be manually triggered for testing or special campaigns

### 2. Retrieve Client Database (Google Sheets Node)
- Connects to your client database in Google Sheets
- Retrieves all client records with relevant fields:
  - Client name and contact information
  - Date of last appointment
  - Service history and preferences
  - Previous engagement metrics
  - Any notes about client status
  - Previous re-engagement attempts

### 3. Identify Inactive Clients (Function Node)
- Analyzes client records to identify inactive clients
- Calculates days since last appointment for each client
- Filters for clients who haven't booked in 60+ days
- Excludes clients with:
  - Future appointments already scheduled
  - Recent re-engagement attempts (within 30 days)
  - Seasonal-only booking patterns
  - "Do not contact" flags
- Segments inactive clients by inactivity duration:
  - 60-90 days: Early intervention
  - 91-180 days: Mid-term recovery
  - 181+ days: Long-term re-engagement

### 4. Retrieve Client History Details (Google Sheets Node)
- For identified inactive clients, pulls detailed history:
  - Preferred services and therapists
  - Average appointment frequency before inactivity
  - Feedback from previous appointments
  - Special dates (birthday, anniversary)
  - Previous response to promotions
  - Lifetime value and visit count

### 5. Personalize Re-engagement Strategy (Function Node)
- Creates personalized re-engagement approach based on:
  - Client's service history and preferences
  - Reason for last visit (if known)
  - Duration of inactivity
  - Previous loyalty level
  - Seasonal patterns
  - Special occasions (birthday, anniversary)
- Determines optimal incentive level based on client value
- Selects appropriate messaging theme and tone

### 6. Segment Clients by Re-engagement Strategy (Switch Node)
- Routes clients to different re-engagement sequences:
  - Service-focused: Highlighting new or preferred services
  - Wellness-focused: Emphasizing health benefits
  - Value-focused: Featuring special offers and incentives
  - Seasonal: Tied to upcoming season or holiday
  - Personal: Based on life events or milestones

### 7. Create Personalized Email Content (Function Node)
- Generates highly personalized email content for each client
- Includes dynamic elements:
  - Personal greeting with client name
  - Reference to previous services enjoyed
  - Personalized reason to return
  - Appropriate incentive based on client value
  - Specific call-to-action based on re-engagement strategy
- Ensures content feels personal and not automated

### 8. Send Initial Re-engagement Email (Gmail Node)
- Sends personalized re-engagement email including:
  - Friendly "we miss you" message
  - Personalized content based on their history
  - Specific incentive or offer to return
  - Easy booking options (link, phone, reply)
  - Expiration date for special offer (creates urgency)
  - Option to update preferences or provide feedback

### 9. Record Re-engagement Attempt (Google Sheets Node)
- Updates client record in your database
- Records re-engagement email sent with timestamp
- Notes specific strategy and offer used
- Sets tracking for response monitoring
- Updates re-engagement campaign status

### 10. Track Email Engagement (Webhook Node)
- Creates endpoints to track:
  - Email opens and click-throughs
  - Booking link interactions
  - Offer code redemptions
  - Unsubscribe requests
- Records all engagement metrics for analysis

### 11. Set Follow-up Sequence Timer (Wait Node)
- If no response to initial email:
  - Sets appropriate delay before follow-up (typically 7 days)
  - Prepares secondary re-engagement message
  - Adjusts offer or approach if needed

### 12. Send Follow-up Email (Gmail Node)
- For non-responders after delay period
- Sends follow-up email with:
  - Gentle reminder about previous offer
  - Alternative value proposition
  - Different call-to-action approach
  - Extended deadline for special offer
  - Alternative booking methods

### 13. Final Re-engagement Attempt (Wait Node + Gmail Node)
- For clients who don't respond to second email
- After additional delay (typically 7-10 days)
- Sends final re-engagement email:
  - Best possible offer or incentive
  - "Last chance" messaging
  - Alternative service suggestions
  - Request for feedback on why they haven't returned
  - Option to pause communications temporarily

### 14. Process Successful Re-engagements (Webhook Node)
- Monitors for appointment bookings from re-engaged clients
- When booking detected:
  - Updates client status to "re-engaged"
  - Records which re-engagement message was successful
  - Calculates re-engagement campaign ROI
  - Prepares special welcome back experience
  - Notifies therapist of returning client status

### 15. Send "Welcome Back" Confirmation (Gmail Node)
- For successfully re-engaged clients who book
- Sends special welcome back email:
  - Expresses genuine appreciation for their return
  - Confirms appointment details
  - Includes special welcome back treatment enhancement
  - Sets expectations for exceptional experience
  - Requests update on preferences or needs

### 16. Update Client Status (Google Sheets Node)
- Updates client status in database
- Resets inactivity counter
- Records successful re-engagement method
- Updates lifetime value projections
- Sets flag for special attention at next appointment

### 17. Generate Re-engagement Campaign Report (Google Sheets Node)
- Creates weekly summary of re-engagement efforts
- Tracks key metrics:
  - Number of inactive clients identified
  - Emails sent by segment
  - Open and click-through rates
  - Booking conversion rate
  - Revenue from re-engaged clients
  - Most effective re-engagement strategies
- Provides insights for campaign optimization

### 18. Error Handling (Error Trigger Node)
- Monitors for any failures in the re-engagement process
- Alerts staff to any failed communications
- Creates manual follow-up tasks for special cases
- Logs errors for troubleshooting

## Integration Points
- **Google Sheets**: Client database and campaign tracking
- **Gmail**: Sending re-engagement emails
- **Google Calendar**: Detecting new bookings from re-engaged clients
- **Website**: Tracking booking link interactions
- **Booking System**: Monitoring offer code redemptions

## Customization Options
- Adjust inactivity threshold (60 days default, but customizable)
- Customize re-engagement sequences by client segment
- Configure different incentive levels based on client value
- Implement seasonal re-engagement campaigns
- Create special win-back campaigns for high-value lost clients

## Benefits
- Recovers revenue from inactive clients
- Increases client retention and lifetime value
- Provides insights into why clients become inactive
- Creates systematic approach to client re-engagement
- Personalizes outreach based on client history
- Optimizes incentive spending based on client value
- Measures effectiveness of different re-engagement strategies
