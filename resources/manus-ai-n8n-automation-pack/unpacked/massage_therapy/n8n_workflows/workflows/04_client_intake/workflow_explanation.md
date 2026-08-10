# Client Intake Form Processing - Workflow Explanation

## Overview
This workflow automates the collection and processing of client intake forms prior to massage therapy appointments. It securely stores client information in Google Sheets and flags critical health or special-condition data for therapist review, ensuring all necessary information is collected before the client arrives for their appointment.

## Workflow Triggers
The workflow can be triggered in two ways:
1. When a new appointment is booked (via webhook from the Appointment Scheduling workflow)
2. When a client submits an intake form through your website (Webhook Node)

## Step-by-Step Process

### 1. Appointment Booking Trigger (Webhook Node)
- Receives notification when a new appointment is booked
- Captures essential appointment information:
  - Client name and contact details
  - Appointment date and time
  - Service type
  - Therapist assigned
  - Whether client is new or returning

### 2. Check Client Status (Google Sheets Node)
- Queries your client database in Google Sheets
- Determines if client is new or existing
- For existing clients: checks when their last intake form was completed
- Determines if a new intake form is needed based on your policy (e.g., required annually)

### 3. Conditional Routing (Switch Node)
- Routes based on client status and intake form needs:
  - New clients: Send full intake form
  - Existing clients needing update: Send update form
  - Recent clients with current form: Skip to form verification
  - Special cases (e.g., prenatal massage): Send specialized intake form

### 4. Generate Personalized Intake Form Link (Function Node)
- Creates a unique, secure link for the client's intake form
- Includes pre-filled information (name, email, appointment details)
- Sets expiration time for the form (typically 48 hours before appointment)
- Generates a unique form ID for tracking

### 5. Send Intake Form Email (Gmail Node)
- Sends personalized email to client with:
  - Friendly explanation of why the form is needed
  - Clear instructions for completion
  - Prominent link to the intake form
  - Deadline for submission (24-48 hours before appointment)
  - Privacy assurance statement
  - Contact information for questions

### 6. Record Form Sent Status (Google Sheets Node)
- Updates your client tracking sheet in Google Sheets
- Records that intake form was sent with timestamp
- Updates form status in appointment record
- Sets reminder for follow-up if not completed

### 7. Monitor Form Submission (Webhook Node)
- Creates endpoint to receive form submission data
- Captures all form fields including:
  - Contact information
  - Health history
  - Current medications
  - Areas of concern/pain
  - Pressure preferences
  - Previous massage experience
  - Specific health conditions
  - Consent for treatment

### 8. Process Form Submission (Function Node)
- Validates all required fields are completed
- Formats data for storage
- Identifies any critical health information requiring attention
- Flags contraindications or special needs
- Calculates form completion time
- Generates summary for therapist review

### 9. Store Client Information (Google Sheets Node)
- Securely stores all form data in your HIPAA-compliant Google Sheets
- For new clients: Creates new client record
- For existing clients: Updates existing record
- Maintains version history of previous forms
- Links form to upcoming appointment

### 10. Flag Critical Information (Function Node)
- Analyzes form responses for critical health information
- Identifies conditions requiring therapist attention:
  - Contraindications for specific techniques
  - Medical conditions requiring modifications
  - Medications that may affect treatment
  - Areas to avoid during massage
  - Allergies or sensitivities
- Assigns priority level to each flag

### 11. Send Therapist Notification (Gmail Node)
- Notifies the assigned therapist that intake form is completed
- Highlights any flagged information requiring special attention
- Provides secure link to view complete form
- Includes summary of client needs and preferences
- Requests acknowledgment of critical information

### 12. Send Client Confirmation (Gmail Node)
- Sends confirmation to client that their form was received
- Thanks them for providing their information
- Confirms their appointment details
- Provides preparation instructions based on their form responses
- Includes option to update information if needed

### 13. Set Follow-up Reminder for Incomplete Forms (Schedule Node)
- For forms not submitted within 24 hours of sending
- Schedules automated reminder email
- Escalates to SMS reminder if approaching appointment time
- Creates staff notification for very late or missing forms

### 14. Update Appointment Record (Google Calendar Node)
- Adds intake form status to appointment in Google Calendar
- Updates appointment notes with key information from intake form
- Adds any special preparation needs for the therapist
- Color-codes appointment based on form status and flags

### 15. Error Handling (Error Trigger Node)
- Monitors for any failures in the intake form process
- Alerts staff to any issues with form submission
- Creates manual follow-up tasks for problematic cases
- Logs errors for troubleshooting

## Integration Points
- **Appointment Scheduling Workflow**: Triggers intake form process
- **Google Sheets**: Stores client information securely
- **Gmail**: Sends form requests and notifications
- **Website**: Hosts the intake form
- **Google Calendar**: Updates appointment with form status

## Customization Options
- Create specialized intake forms for different service types
- Adjust form expiration and reminder timing
- Customize flagging criteria for health conditions
- Configure different form requirements for new vs. returning clients
- Implement multi-language support for diverse clientele

## Benefits
- Ensures all necessary client information is collected before appointments
- Alerts therapists to critical health information
- Reduces administrative workload of manual form processing
- Improves client experience with digital form completion
- Maintains secure, organized client records
- Ensures HIPAA compliance with proper data handling
- Provides consistent preparation for all appointments
