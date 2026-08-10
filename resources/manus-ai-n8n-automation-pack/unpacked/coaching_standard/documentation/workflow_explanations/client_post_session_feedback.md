# Client Post-Session Feedback Automation Workflow Explanation

## Overview

The Client Post-Session Feedback Automation workflow is designed to systematically collect, track, and analyze feedback from clients after coaching sessions. This workflow automatically sends feedback requests to clients after completed sessions, processes their responses, and stores the data for continuous improvement of your coaching services.

## Workflow Structure

The workflow consists of the following key components:

1. **Schedule Trigger**: Regularly checks for completed sessions that need feedback requests
2. **Feedback Request**: Sends personalized feedback request emails to clients
3. **Feedback Collection**: Processes submitted feedback via a webhook
4. **Data Storage**: Records all feedback in a structured format
5. **Notification**: Alerts you about new feedback submissions

## Detailed Node Explanation

### 1. Schedule Trigger

This node initiates the workflow on a regular schedule to check for completed sessions.

**Configuration:**
- Type: Schedule Trigger
- Schedule: Every hour
- This ensures timely feedback requests without overwhelming your systems

### 2. Google Sheets - Get Completed Sessions

This node retrieves recently completed sessions that haven't yet received feedback requests.

**Configuration:**
- Type: Google Sheets
- Operation: Get All Rows
- Sheet Name: Client Sessions
- Filter: Status = "Completed" AND Feedback Sent = FALSE

### 3. Any Sessions to Process?

This node checks if there are any completed sessions that need feedback requests.

**Configuration:**
- Type: IF
- Condition: Checks if the returned array length is greater than 0
- Routes the workflow based on whether there are sessions to process

### 4. Split Into Individual Sessions

This node separates the list of sessions into individual items for processing.

**Configuration:**
- Type: Split In Batches
- Batch Size: 1
- This allows individual processing of each session

### 5. Gmail - Send Feedback Request

This node sends a personalized feedback request email to the client.

**Configuration:**
- Type: Gmail
- Operation: Send Email
- To: Client's email address
- Subject: "Feedback Request: Your Coaching Session on [Date]"
- Content: HTML-formatted email with:
  - Personalized greeting
  - Thank you message
  - Link to feedback form with pre-filled session details
  - Your signature

### 6. Google Sheets - Update Session

This node marks the session as having had a feedback request sent.

**Configuration:**
- Type: Google Sheets
- Operation: Update Row
- Sheet Name: Client Sessions
- Data: Feedback Sent = TRUE, Feedback Sent Date = [Current Date]
- Row: Identified by Row Number from the original query

### 7. All Sessions Processed?

This node checks if all sessions have been processed.

**Configuration:**
- Type: IF
- Condition: Checks if there are no more items left to process
- Routes back to process more sessions or continues to notification

### 8. Slack - Send Notification

This node sends a notification about the batch of feedback requests.

**Configuration:**
- Type: Slack
- Channel: Your designated feedback channel
- Message: Summary of how many feedback requests were sent

### 9. Webhook - Feedback Submission

This node creates an endpoint that receives feedback submissions from your form.

**Configuration:**
- Type: Webhook
- Method: POST
- Path: submit-feedback
- Response: JSON
- This endpoint receives client feedback with details like session ID, ratings, and comments

### 10. Validate Feedback Data

This node validates the incoming feedback data.

**Configuration:**
- Type: Code (JavaScript)
- Function: Validates required fields (session ID, client name, overall rating, comments)
- Returns error if validation fails

### 11. Is Valid Feedback?

This node checks if the feedback validation was successful.

**Configuration:**
- Type: IF
- Condition: Checks if the success property is true
- Routes the workflow based on validation result

### 12. Google Sheets - Save Feedback

This node records the feedback details in your feedback tracking spreadsheet.

**Configuration:**
- Type: Google Sheets
- Operation: Append Row
- Sheet Name: Client Feedback
- Data: Session ID, client name, submission date, ratings, comments, improvement suggestions

### 13. Google Sheets - Update Session Status

This node updates the original session record with feedback status.

**Configuration:**
- Type: Google Sheets
- Operation: Update Row
- Sheet Name: Client Sessions
- Data: Feedback Received = TRUE, Feedback Rating = [Overall Rating]
- Row: Identified by Session ID

### 14. Slack - Notify About Feedback

This node sends you a notification about the new feedback submission.

**Configuration:**
- Type: Slack
- Channel: Your designated feedback channel
- Message: Alert with client name, overall rating, and feedback comments

### 15. Respond - Success

This node sends a success response back to the client's browser or app.

**Configuration:**
- Type: Respond to Webhook
- Response: JSON with thank you message
- Status: 200 OK

### 16. Respond - Error

This node sends an error response if validation fails.

**Configuration:**
- Type: Respond to Webhook
- Response: JSON with error message
- Status: 400 Bad Request

## Workflow Logic and Data Flow

The workflow operates in two distinct parts:

**Part 1: Sending Feedback Requests**
1. The schedule trigger runs hourly to check for completed sessions
2. Sessions without feedback requests are identified
3. For each session:
   - A personalized feedback request email is sent
   - The session record is updated to prevent duplicate requests
4. A notification summarizes the batch of sent requests

**Part 2: Processing Feedback Submissions**
1. The webhook receives feedback submissions from clients
2. The submission data is validated
3. If validation fails, an error response is sent
4. If validation succeeds:
   - The feedback is saved in the feedback tracking spreadsheet
   - The original session record is updated
   - You receive a Slack notification
   - A success response is sent to the client

## Customization Options

You can customize this workflow in several ways:

1. **Feedback Timing**: Adjust when feedback requests are sent (immediately after sessions or with a delay)
2. **Feedback Form**: Design your own form with the specific questions you want to ask
3. **Rating Scales**: Modify the expected rating scales and feedback categories
4. **Email Template**: Customize the feedback request email to match your brand
5. **Notification Details**: Adjust what information is included in Slack notifications

## Error Handling

The workflow includes error handling at several points:

1. Comprehensive validation of all required feedback fields
2. Clear error messages sent back to the client
3. Sessions are marked for feedback only after the email is successfully sent
4. All errors are logged for troubleshooting

## Integration Points

This workflow integrates with:

1. **Your Feedback Form**: Via webhook (can be integrated with any form system)
2. **Gmail**: For sending feedback requests
3. **Google Sheets**: For session and feedback tracking
4. **Slack**: For notifications

## Performance Considerations

- The scheduled trigger runs hourly but can be adjusted based on your volume
- Processing each feedback request takes only a few seconds
- The webhook has a timeout of 120 seconds, which is more than sufficient

## Best Practices

1. Create a simple, user-friendly feedback form that connects to this webhook
2. Limit your feedback form to essential questions to increase completion rates
3. Send feedback requests promptly after sessions while the experience is fresh
4. Regularly review feedback data to identify trends and improvement opportunities
5. Acknowledge clients who provide detailed feedback
6. Use feedback data in your professional development planning
7. Consider adding automated follow-up for very negative or very positive feedback

This workflow automates the entire feedback collection process, ensuring you consistently gather insights from clients while minimizing administrative work. The structured data collection allows for meaningful analysis of your coaching effectiveness over time.
