# Manus AI n8n Automation Pack 🤖 🫰🏽
## **Massage Therapy Use Case (used on High Effort mode)**

📎 **File:** [`massage_therapy.zip`](files/massage_therapy.zip)

```
You are an expert n8n workflow automation specialist deeply familiar with massage therapy business operations. Your task is to create 10 comprehensive workflows using n8n, automating an entire massage therapy practice from lead generation through post-appointment follow-up.

### BUSINESS CONTEXT:
My massage therapy practice currently utilizes:
- **Google Calendar** (appointments)
- **Google Sheets** (client data storage)
- **Gmail** (communications)
- **Social media** (marketing)

My goals:
- Automate repetitive tasks
- Enhance client experience
- Increase bookings and retention

### YOUR DELIVERABLES FOR EACH WORKFLOW:
For **each** of the 10 workflows specified below, provide:
1. **Detailed Workflow Explanation File**  
   - Clearly explain how the workflow functions step-by-step
   - Outline all triggers, conditions, actions, and integrations
2. **Complete & Validated JSON Workflow**  
   - Fully importable into n8n without modification
   - Strictly conforms to the latest n8n documentation standards and JSON schema
   - Validated for JSON correctness
3. **Setup & Credential Instruction File**  
   - Clear instructions for setting up any required credentials (Google OAuth, API keys, etc.)
   - Include any necessary Google Sheets templates or example configurations required by the workflow

### REQUIRED WORKFLOWS:

1. **Lead Capture & Qualification System**
   - Capture leads from website forms
   - Automatically score and qualify leads based on predefined criteria
   - Route qualified leads to appropriate follow-up tasks or emails

2. **Appointment Scheduling Automation**
   - Allow client self-booking through a user-friendly calendar interface
   - Check real-time availability via Google Calendar
   - Send automated confirmation emails and add bookings to the calendar

3. **Appointment Reminder Sequence**
   - Automatically send SMS/email reminders 24 hours before appointments
   - Include easy-to-use rescheduling links
   - Reduce no-show rates with automated follow-up steps

4. **Client Intake Form Processing**
   - Automate collection and processing of client intake forms prior to appointments
   - Securely store client information in Google Sheets
   - Flag critical health or special-condition data for therapist review

5. **Post-Appointment Follow-Up System**
   - Automatically send personalized thank-you emails post-appointment
   - Request client feedback or online reviews
   - Offer incentives for clients to book subsequent appointments

6. **Inactive Client Re-engagement**
   - Identify clients who haven’t booked in over 60 days
   - Trigger personalized re-engagement email sequences
   - Track and report response rates and successful conversions

7. **Therapist Schedule Management**
   - Ensure optimal therapist scheduling and availability
   - Automatically prevent double-bookings
   - Provide daily schedule notifications to therapists via email or SMS

8. **Marketing Campaign Automation**
   - Schedule and automatically post social media marketing content
   - Track and analyze engagement metrics
   - Identify top-performing campaigns correlated with increased bookings

9. **Client Birthday/Anniversary Recognition**
   - Track client birthdays and anniversaries
   - Send automated personalized messages with special offers
   - Promote increased client engagement and re-bookings

10. **Business Analytics Dashboard**
    - Track essential business metrics (appointments booked, revenue, client retention rates)
    - Automatically generate weekly/monthly analytics reports
    - Provide clear insights into business trends and growth opportunities

### REQUIREMENTS:
- All workflows must adhere to current n8n best practices, optimized for performance and stability, and include error handling measures.
- Validate JSON files strictly according to the latest n8n documentation standards (https://docs.n8n.io).
- Include any necessary Google Sheets templates or sample data configurations to facilitate rapid deployment.
```

## **Venture Capital Use Case (used on High Effort mode)**

📎 **File:** [`venture_capital.zip`](files/venture_capital.zip)

```
You are an expert n8n workflow automation specialist with deep familiarity in venture capital (VC) firm operations. Your task is to design and provide 10 comprehensive n8n workflows tailored specifically for automating core VC business processes, from deal sourcing to portfolio management.

### BUSINESS CONTEXT:
Our venture capital firm leverages the following tools extensively:
- **Google Calendar** (Meetings and events)
- **Google Sheets** (Deal pipeline management, portfolio data)
- **Gmail** (Communication with founders and LPs)
- **LinkedIn and CRM** (Deal sourcing, founder outreach)
- **Slack** (Internal communication)
- **DocuSign** (Document management and e-signatures)

Our primary goals:
- Automate repetitive manual tasks to improve operational efficiency
- Enhance deal-flow management and portfolio oversight
- Provide data-driven insights for improved investment decisions

### DELIVERABLES REQUIRED FOR EACH WORKFLOW:
For **each** of the 10 workflows detailed below, please provide:

1. **Workflow Explanation Document**  
   - Step-by-step description of how the workflow operates
   - Clearly defined triggers, conditions, integrations, and outcomes

2. **Validated & Ready-to-Import n8n JSON Workflow**  
   - Fully compatible with the latest n8n JSON schema documentation (https://docs.n8n.io)
   - Validated JSON that can be imported directly into n8n without modification

3. **Setup & Credential Instruction File**  
   - Step-by-step instructions for configuring required credentials and integrations (Google OAuth, LinkedIn API, DocuSign API, Slack webhooks, etc.)
   - Include sample Google Sheets templates or configurations required by each workflow

### REQUIRED WORKFLOWS:

1. **Deal Sourcing & Lead Capture Automation**
   - Capture inbound deal leads from website forms and LinkedIn messages
   - Score and categorize leads based on predefined criteria
   - Automatically route qualified leads to relevant team members via Slack and CRM

2. **Meeting Scheduling & Calendar Integration**
   - Enable automated meeting scheduling for founder pitches and internal reviews
   - Check real-time team availability in Google Calendar
   - Send automatic confirmations and reminders via Gmail

3. **Founder Pitch & Due Diligence Workflow**
   - Automate collection of pitch materials and documents (pitch decks, financial data)
   - Store and organize data securely in Google Sheets or CRM
   - Notify team members of new submissions and track review progress

4. **Investment Committee Decision Automation**
   - Streamline scheduling of investment committee meetings
   - Automatically distribute agendas and relevant documents via Gmail and Slack
   - Log decisions and update pipeline stages in Google Sheets or CRM automatically

5. **Portfolio Company Update & Reporting**
   - Automate collection of monthly/quarterly KPIs from portfolio companies via standardized Google Sheets forms
   - Consolidate data into centralized dashboards for real-time tracking
   - Flag significant deviations or performance concerns automatically to assigned team members via Slack alerts

6. **LP Communications & Reporting Automation**
   - Generate quarterly performance reports from aggregated data automatically
   - Automate sending personalized update emails to LPs via Gmail
   - Track LP engagement and responses for future analysis and reporting

7. **Document Signature & Management**
   - Automate preparation, sending, and tracking of investment documents and term sheets using DocuSign
   - Store signed documents automatically into structured Google Drive folders
   - Notify relevant stakeholders upon completion via Slack and Gmail

8. **Social Media & Thought Leadership Automation**
   - Schedule and publish VC firm content automatically across LinkedIn and other social platforms
   - Track engagement metrics and correlate content performance with inbound lead quality
   - Provide insights to refine future content strategy

9. **Networking & Event Management Automation**
   - Automate attendee invitation management, registration tracking, and post-event follow-ups
   - Sync event details directly to Google Calendar
   - Automatically capture attendee interest and integrate data into CRM or Google Sheets

10. **Analytics & Investment Performance Dashboard**
    - Automate tracking of key investment performance metrics (IRR, MoIC, portfolio diversification)
    - Generate weekly/monthly analytical dashboards in Google Sheets or Data Studio
    - Identify actionable insights for investment strategy adjustments automatically

### REQUIREMENTS:
- Each workflow must strictly adhere to current n8n best practices, ensuring high performance, stability, and robust error handling.
- JSON workflows must be validated explicitly per the latest official n8n JSON schema documentation (https://docs.n8n.io).
- Provide all necessary templates or sample Google Sheets documents clearly labeled for immediate and easy implementation.
```

## **Coaching (used on Standard & High Effort mode)**

📎 **File:** [`coaching_standard.zip`](files/coaching_standard.zip)

📎 **File:** [`coaching_high.zip`](files/coaching_high.zip)

```
You are an expert n8n workflow automation specialist experienced in automating processes specifically for coaching businesses, with a strong focus on automated content creation, posting, and efficient client management. Your task is to design 10 comprehensive, fully automated workflows built in n8n and deliver them as complete, validated JSON files.

### BUSINESS CONTEXT:
My coaching practice uses the following platforms extensively:
- **Google Calendar** (scheduling sessions)
- **Google Sheets** (client management and content calendars)
- **Gmail** (email communications and marketing)
- **Slack** (team and internal alerts)
- **Social Platforms**: LinkedIn, Instagram, Twitter (X), Facebook
- **Canva** (visual content generation)
- **OpenAI API** (content generation)

Primary objectives:
- Automate content creation, design, and direct posting to social media
- Streamline and automate client communications and management tasks
- Ensure efficiency, consistency, and scalability through automation

### REQUIRED DELIVERABLES FOR EACH WORKFLOW:
For **each of the 10 workflows** listed below, you must provide:

1. **Validated, Fully Automated n8n JSON Workflow**  
   - Each JSON file must be strictly validated per the latest n8n JSON schema (https://docs.n8n.io).
   - Workflows must be complete, production-ready, error-handled, and require **no manual intervention after setup**.

2. **Detailed Workflow Explanation File**  
   - Clearly explain step-by-step how the workflow operates.
   - Include workflow triggers, actions, conditions, integrations, and expected outcomes.

3. **Credential & Setup Instruction File**  
   - Detailed step-by-step instructions for all necessary integrations (OpenAI, Canva API, Google OAuth, Slack webhooks, Social Media APIs, etc.).
   - Provide any required Google Sheets templates or sample data for immediate deployment.

### REQUIRED WORKFLOWS:

#### Content Creation & Posting Automations:

1. **Automated LinkedIn Thought-Leadership Workflow**
   - Weekly automatic content generation via OpenAI
   - Canva integration for visual content creation
   - Direct, automated posting to LinkedIn

2. **Instagram Visual Quote Automation**
   - Automated generation of engaging quotes via OpenAI
   - Visual generation through Canva integration
   - Direct scheduling and posting to Instagram

3. **Twitter (X) Thread Automation**
   - Automated insightful thread creation via OpenAI
   - Direct automated posting to Twitter (X)

4. **Facebook Engagement Content Automation**
   - Automated weekly generation of engagement-focused posts via OpenAI
   - Direct scheduling and posting on Facebook Pages/Groups

5. **Monthly Email Newsletter Automation**
   - Automated monthly newsletter drafting via OpenAI
   - Direct automatic sending via Gmail

#### Client Management Automations:

6. **Client Session Scheduling Automation**
   - Automated booking via client self-scheduling linked to Google Calendar
   - Automated confirmation and reminders sent via Gmail

7. **Client Post-Session Feedback Automation**
   - Automated sending of feedback requests post-session
   - Automatic tracking of feedback responses in Google Sheets

8. **Client Onboarding & Intake Automation**
   - Automated collection of onboarding forms via Google Forms or Typeform
   - Automatic storage of client data in Google Sheets and notification via Slack

9. **Inactive Client Re-engagement Automation**
   - Automatic detection and re-engagement emails for inactive clients
   - Automated tracking of responses and re-engagement success

10. **Client Milestone Recognition Automation**
    - Automatic tracking of client milestones from data in Google Sheets
    - Automated sending of personalized milestone recognition emails via Gmail

### REQUIREMENTS:
- All delivered JSON workflows must be strictly compatible and fully validated with the latest version of n8n (per official docs: https://docs.n8n.io).
- Each JSON workflow must be fully automated, requiring no manual intervention after initial setup.
- Clearly documented instructions and any required resources must accompany each workflow to ensure rapid and seamless deployment.
```

## **Follow-Up Prompt(s) in Case JSON Isn't Valid**

1. Possible prompt: Many of the JSON files have property value issues.
2. We got this error in every single JSON file...
3. We want to create a fully fledged JSON file for each automation that is going to be compliant with the latest version of n8n so we can seamlessly import it.

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
