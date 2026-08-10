# Appointment Scheduling Automation - Workflow Explanation

## Overview
This workflow automates the appointment scheduling process for your massage therapy practice, allowing clients to self-book through a user-friendly calendar interface. It integrates with Google Calendar to check real-time availability and automatically sends confirmation emails to clients while adding bookings to your calendar.

## Workflow Triggers
The workflow can be triggered in two ways:
1. When a client submits a booking request through your online booking form (Webhook Node)
2. On a schedule to regularly sync and update appointment availability (Schedule Node)

## Step-by-Step Process

### 1. Client Booking Request (Webhook Node)
- Creates a webhook endpoint that receives POST requests from your online booking form
- Captures essential booking information:
  - Client name
  - Client email
  - Client phone
  - Requested service type
  - Requested date and time
  - Special requests or notes

### 2. Validate and Format Booking Data (Function Node)
- Validates all required fields are present
- Formats date and time to standard format
- Standardizes service type names
- Calculates appointment duration based on service type
- Generates a unique booking reference ID

### 3. Check Client Database (Google Sheets Node)
- Queries your client database in Google Sheets
- Checks if client already exists (by email or phone)
- If existing client: retrieves client ID and history
- If new client: prepares data for new client creation

### 4. Check Real-Time Availability (Google Calendar Node)
- Connects to your Google Calendar
- Checks if the requested time slot is available
- Verifies therapist availability for the requested service
- Considers buffer time between appointments (15 minutes)
- Returns available/unavailable status

### 5. Conditional Routing Based on Availability (Switch Node)
- If time slot is available: proceeds to booking confirmation
- If time slot is unavailable: proceeds to alternative suggestion

### 6. For Unavailable Slots: Generate Alternatives (Function Node)
- Calculates 3 alternative available time slots
- Prioritizes slots on the same day if possible
- Otherwise suggests slots on nearby dates
- Formats alternative options for client selection

### 7. For Unavailable Slots: Send Alternatives Email (Gmail Node)
- Sends email to client with alternative booking options
- Includes direct links to book each alternative slot
- Provides option to request different dates
- Sets expectation for booking expiration (24 hours)

### 8. For Available Slots: Create Calendar Event (Google Calendar Node)
- Creates new appointment in Google Calendar
- Sets correct appointment duration based on service type
- Includes client details and special requests in description
- Adds buffer time before/after appointment
- Sets appropriate reminder notifications

### 9. For Available Slots: Update Client Database (Google Sheets Node)
- If new client: adds client to database with contact information
- If existing client: updates last appointment date
- Records the new appointment in appointment history
- Updates client lifetime value and appointment count

### 10. For Available Slots: Send Confirmation Email (Gmail Node)
- Sends personalized confirmation email to client
- Includes all appointment details (date, time, service, therapist)
- Provides calendar attachment (.ics file) for client's calendar
- Includes preparation instructions for the appointment
- Provides cancellation/rescheduling policy and links

### 11. For Available Slots: Send Therapist Notification (Gmail Node)
- Notifies the assigned therapist of the new booking
- Includes client details and any special requests
- Provides link to client history if available
- Adds appointment to therapist's personal notification list

### 12. Sync Appointment Data (Google Sheets Node)
- Updates master appointment schedule in Google Sheets
- Records all booking details for reporting and analytics
- Updates availability calendar for future bookings
- Maintains accurate booking history

### 13. Error Handling (Error Trigger Node)
- Monitors for any failures in the workflow
- Sends notification to administrator if any step fails
- Logs errors for troubleshooting
- Ensures client is notified of any issues with their booking

## Integration Points
- **Online Booking Form**: Connects via Webhook
- **Google Calendar**: Manages appointment scheduling and availability
- **Google Sheets**: Stores client information and appointment history
- **Gmail**: Sends confirmation emails and notifications

## Customization Options
- Adjust appointment duration for different service types
- Modify buffer times between appointments
- Customize email templates for confirmations and notifications
- Configure business hours and therapist availability
- Set up multiple therapist calendars with service specializations

## Benefits
- Eliminates manual appointment booking and phone tag
- Ensures double-bookings cannot occur
- Provides 24/7 booking capability for clients
- Automatically updates all systems when bookings are made
- Reduces administrative workload
- Improves client experience with immediate confirmation
- Maintains accurate, centralized appointment records
