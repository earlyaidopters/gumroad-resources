# Appointment Reminder Sequence - Workflow Explanation

## Overview
This workflow automates the process of sending timely reminders to clients before their scheduled massage appointments. It helps reduce no-show rates by sending SMS and/or email reminders 24 hours before appointments, including easy-to-use rescheduling links and important preparation information.

## Workflow Triggers
The workflow is triggered on a schedule, running once daily to identify upcoming appointments that require reminders (Schedule Node).

## Step-by-Step Process

### 1. Daily Schedule Check (Schedule Node)
- Runs automatically once per day (configurable, recommended time: early morning)
- Initiates the process to identify appointments requiring reminders
- Can be manually triggered if needed for testing or special circumstances

### 2. Retrieve Upcoming Appointments (Google Calendar Node)
- Connects to your Google Calendar
- Retrieves all appointments scheduled for the next 48 hours
- Filters out any appointments that have already been sent reminders
- Includes appointment details: client name, email, phone, service type, date/time, therapist

### 3. Format Appointment Data (Function Node)
- Processes each appointment to prepare for reminder sending
- Calculates exact 24-hour mark before each appointment
- Formats date and time in client-friendly format
- Generates unique rescheduling/cancellation links
- Prepares personalized reminder content based on service type

### 4. Filter Appointments Due for Reminders (Filter Node)
- Identifies appointments exactly 24 hours away from current time
- Excludes any appointments marked as "reminder sent" in your tracking system
- Prioritizes appointments if multiple reminders need to be sent

### 5. Check Client Communication Preferences (Google Sheets Node)
- Queries your client database in Google Sheets
- Retrieves client communication preferences (SMS, email, or both)
- Gets any special notes or requirements for the client
- Confirms contact information is up-to-date

### 6. Split Workflow by Communication Preference (Switch Node)
- Routes each appointment reminder based on client preference:
  - SMS only
  - Email only
  - Both SMS and email
  - No reminders (opted out)

### 7. Send SMS Reminders (Twilio Node or HTTP Request)
- For clients who prefer SMS or both communication types
- Sends personalized SMS reminder with:
  - Appointment date, time, and service
  - Therapist name
  - Preparation instructions (brief version)
  - Rescheduling link (shortened URL)
  - Reply option to confirm

### 8. Send Email Reminders (Gmail Node)
- For clients who prefer email or both communication types
- Sends personalized email reminder with:
  - Complete appointment details
  - Therapist information and photo
  - Detailed preparation instructions
  - Calendar attachment (.ics file)
  - Prominent rescheduling/cancellation buttons
  - Map/directions to your location
  - Cancellation policy reminder

### 9. Record Reminder Sent Status (Google Sheets Node)
- Updates your appointment tracking sheet in Google Sheets
- Marks reminder as "sent" with timestamp
- Records which reminder types were sent (SMS, email, both)
- Updates reminder status in client history

### 10. Handle Rescheduling Requests (Webhook Node)
- Creates endpoints for rescheduling/cancellation links
- When client clicks rescheduling link:
  - Captures the request details
  - Presents available alternative times
  - Allows client to select new time
  - Updates all systems with new appointment time

### 11. Handle Cancellation Requests (Webhook Node)
- When client clicks cancellation link:
  - Captures cancellation reason (optional survey)
  - Confirms cancellation with client
  - Updates calendar and appointment system
  - Optionally offers future booking incentive

### 12. Process Responses (Switch Node)
- Handles different types of client responses:
  - Confirmation replies: marks appointment as confirmed
  - Questions: forwards to staff for personal response
  - Rescheduling via reply: triggers assisted rescheduling process
  - Cancellations via reply: processes cancellation

### 13. Update Appointment Status (Google Calendar Node)
- Updates appointment in Google Calendar with confirmation status
- Adds any notes from client responses
- Updates color coding based on status (confirmed, rescheduled, etc.)

### 14. Generate Daily Reminder Report (Google Sheets Node)
- Creates daily summary of all reminders sent
- Tracks confirmation rates and response types
- Identifies any failed reminder attempts
- Provides analytics on most effective reminder timing

### 15. Error Handling (Error Trigger Node)
- Monitors for any failures in the reminder process
- Alerts staff to any failed reminder attempts
- Creates manual follow-up tasks for failed reminders
- Logs errors for troubleshooting

## Integration Points
- **Google Calendar**: Source of appointment data
- **Google Sheets**: Client database and reminder tracking
- **Gmail**: Sending email reminders
- **Twilio** (or similar service): Sending SMS reminders
- **Website**: Hosting rescheduling and cancellation pages

## Customization Options
- Adjust reminder timing (24 hours, 48 hours, or multiple reminders)
- Customize reminder content by service type
- Configure different reminder sequences for new vs. returning clients
- Add additional reminder channels (e.g., WhatsApp, Facebook Messenger)
- Implement multi-language support based on client preferences

## Benefits
- Reduces no-show rates significantly (typically 30-50% reduction)
- Provides convenient rescheduling options to maintain bookings
- Ensures clients are prepared for their appointments
- Saves staff time on manual reminder calls
- Creates consistent client communication
- Improves overall client experience
- Provides valuable data on reminder effectiveness
