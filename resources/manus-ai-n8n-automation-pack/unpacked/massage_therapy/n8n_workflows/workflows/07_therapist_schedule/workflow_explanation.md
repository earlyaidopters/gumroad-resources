# Therapist Schedule Management - Workflow Explanation

## Overview
This workflow automates the management of therapist schedules in your massage therapy practice, ensuring optimal scheduling, preventing double-bookings, and providing daily schedule notifications to therapists via email or SMS. It helps maintain efficient operations and keeps your therapists informed about their upcoming appointments.

## Workflow Triggers
The workflow is triggered in multiple ways:
1. Daily schedule notification (Schedule Node - early morning)
2. When new appointments are booked (Webhook Node)
3. When appointments are modified or canceled (Webhook Node)
4. When therapist availability changes (Webhook Node)

## Step-by-Step Process

### 1. Daily Schedule Generation (Schedule Node)
- Runs automatically each morning (configurable, recommended: 5:00 AM)
- Initiates the process to compile daily schedules for all therapists
- Prepares personalized schedule notifications

### 2. Retrieve Therapist Information (Google Sheets Node)
- Connects to your "Therapists" Google Sheet
- Retrieves all active therapist records with:
  - Contact information (email, phone)
  - Specialties and service capabilities
  - Regular working hours and days
  - Communication preferences
  - Any special notes or restrictions

### 3. Retrieve Daily Appointments (Google Calendar Node)
- Connects to your Google Calendar
- Retrieves all appointments for the current day
- Filters and organizes by therapist
- Includes appointment details:
  - Client name
  - Service type and duration
  - Special requests
  - Room assignment
  - Preparation requirements

### 4. Format Therapist Schedules (Function Node)
- Processes appointment data for each therapist
- Organizes chronologically with time blocks
- Calculates preparation and transition times
- Identifies gaps and potential optimization opportunities
- Formats schedule in easy-to-read layout
- Includes client notes and special requirements
- Adds daily totals (appointments, hours, services by type)

### 5. Send Daily Schedule Notifications (Switch Node)
- Routes based on therapist communication preferences:
  - Email notifications (Gmail Node)
  - SMS notifications (Twilio Node or HTTP Request)
  - Both email and SMS
- Sends personalized schedule to each therapist including:
  - Complete day's schedule with times and services
  - Client names and special notes
  - Room assignments
  - Preparation requirements
  - Breaks and gaps in schedule
  - Option to confirm receipt

### 6. Monitor Schedule Changes (Webhook Node)
- Creates endpoints to receive notifications when:
  - New appointments are booked
  - Existing appointments are modified
  - Appointments are canceled
  - Therapist availability changes
- Captures all relevant details about the change

### 7. Process Schedule Changes (Function Node)
- Analyzes the impact of schedule changes
- Determines affected therapists
- Calculates ripple effects on other appointments
- Identifies potential conflicts or double-bookings
- Prepares appropriate notifications

### 8. Prevent Double-Bookings (Switch Node)
- When new appointment is being created:
  - Checks therapist availability in real-time
  - Verifies room availability
  - Confirms no overlapping appointments
  - Validates against working hours
  - Ensures adequate transition time between appointments
- If conflict detected:
  - Blocks the conflicting booking
  - Suggests alternative times or therapists
  - Notifies administrator of the conflict

### 9. Update Google Calendar (Google Calendar Node)
- When schedule changes are approved:
  - Updates appointment in Google Calendar
  - Adjusts room assignments if needed
  - Updates appointment notes with change history
  - Maintains consistent color-coding and categorization

### 10. Send Schedule Update Notifications (Gmail Node)
- For significant schedule changes:
  - Notifies affected therapist(s) immediately
  - Provides details of the change
  - Includes updated schedule for the day
  - Requests acknowledgment of the change
  - Provides contact for questions or concerns

### 11. Optimize Therapist Scheduling (Function Node)
- Runs weekly or on-demand
- Analyzes therapist utilization and scheduling patterns
- Identifies optimization opportunities:
  - Balancing workload across therapists
  - Minimizing gaps between appointments
  - Matching client preferences with therapist specialties
  - Optimizing room usage
- Generates recommendations for schedule improvements

### 12. Handle Time-Off Requests (Webhook Node)
- Creates endpoint for therapist time-off requests
- Captures request details:
  - Therapist name
  - Requested dates/times
  - Reason for request
  - Urgency/priority
- Routes request to approval process

### 13. Process Time-Off Approvals (Switch Node)
- Checks for scheduling conflicts with existing appointments
- If no conflicts:
  - Automatically approves request
  - Blocks calendar for requested time
  - Sends confirmation to therapist
- If conflicts exist:
  - Routes to administrator for review
  - Provides conflict details and options
  - Suggests possible solutions

### 14. Update Availability Calendar (Google Calendar Node)
- When time-off is approved:
  - Blocks time in Google Calendar
  - Marks as unavailable for new bookings
  - Updates therapist availability status
  - Ensures online booking system reflects changes

### 15. Generate Schedule Analytics (Google Sheets Node)
- Creates weekly schedule analytics:
  - Therapist utilization rates
  - Service type distribution
  - Peak booking times
  - Cancellation/reschedule patterns
  - Schedule optimization opportunities
- Updates scheduling dashboard with insights

### 16. Error Handling (Error Trigger Node)
- Monitors for any failures in the scheduling process
- Alerts administrator to any scheduling conflicts
- Creates manual resolution tasks for complex issues
- Logs errors for troubleshooting

## Integration Points
- **Google Calendar**: Primary scheduling system
- **Google Sheets**: Therapist database and analytics
- **Gmail**: Sending schedule notifications
- **Twilio** (or similar service): Sending SMS notifications
- **Booking System**: Preventing double-bookings

## Customization Options
- Adjust notification timing and frequency
- Customize schedule format for different therapists
- Configure different buffer times between service types
- Implement therapist-specific scheduling rules
- Create specialized views for different roles (therapist vs. admin)

## Benefits
- Eliminates double-bookings and scheduling conflicts
- Keeps therapists informed with up-to-date schedules
- Reduces administrative workload for schedule management
- Optimizes therapist utilization and productivity
- Improves therapist satisfaction with organized scheduling
- Provides valuable insights for staffing decisions
- Ensures smooth operations with proper preparation time
