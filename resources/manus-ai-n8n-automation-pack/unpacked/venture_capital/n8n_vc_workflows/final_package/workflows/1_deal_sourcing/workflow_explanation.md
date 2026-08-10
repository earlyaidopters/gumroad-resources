# Deal Sourcing & Lead Capture Automation Workflow

## Overview
This workflow automates the process of capturing inbound deal leads from multiple sources, scoring them based on predefined criteria, and routing qualified leads to the relevant team members. It streamlines the initial stages of the deal pipeline, ensuring no promising opportunities are missed while filtering out leads that don't meet the firm's investment criteria.

## Workflow Triggers
The workflow can be initiated through multiple entry points:
1. **Website Form Submission** - Captures leads directly from the VC firm's website using the n8n Form Trigger
2. **LinkedIn Message Webhook** - Receives notifications when potential founders reach out via LinkedIn
3. **Manual Entry** - Allows team members to manually input leads discovered through networking or other channels

## Step-by-Step Process Flow

### 1. Lead Capture
- **Form Trigger Node**: Collects structured data from website visitors including founder information, company details, funding stage, and pitch deck uploads
- **Webhook Node**: Receives data from LinkedIn and other external sources
- **Manual Trigger Node**: Provides an interface for manual lead entry by team members

### 2. Data Normalization & Enrichment
- **Function Node**: Standardizes data format from different sources
- **HTTP Request Node**: Enriches lead data by fetching additional information from external APIs (e.g., company information, founder background)
- **Code Node**: Transforms and structures the data for consistent processing

### 3. Lead Scoring & Categorization
- **Code Node**: Applies scoring algorithm based on predefined criteria:
  - Market size and growth potential
  - Team experience and track record
  - Technology differentiation
  - Funding stage and capital requirements
  - Alignment with investment thesis
- **Switch Node**: Routes leads based on score thresholds and investment categories

### 4. CRM Integration
- **Agile CRM Node**: Creates or updates contact and company records
- **Agile CRM Node**: Creates a new deal with appropriate stage assignment
- **Function Node**: Maps lead data to CRM fields and structures

### 5. Team Notification & Assignment
- **Slack Node**: Sends notifications to relevant team members based on:
  - Investment category/sector
  - Deal size
  - Geographic location
  - Team member expertise and workload
- **Slack Node**: Creates dedicated channel for high-potential deals

### 6. Follow-up Scheduling
- **Google Calendar Node**: Creates follow-up tasks and reminders
- **Schedule Trigger Node**: Sets up automated follow-up sequences for different lead categories

### 7. Analytics & Reporting
- **Google Sheets Node**: Logs all incoming leads for analytics and reporting
- **Function Node**: Calculates conversion metrics and pipeline statistics

## Decision Logic
The workflow incorporates several decision points:

1. **Lead Quality Assessment**:
   - High-quality leads (score > 80): Immediate notification to partners, creation of dedicated Slack channel
   - Medium-quality leads (score 50-80): Assignment to associates for further research
   - Low-quality leads (score < 50): Automated response and addition to general newsletter list

2. **Sector-Based Routing**:
   - Routes leads to sector-specific team members based on company description and categorization
   - Assigns secondary team members for cross-sector opportunities

3. **Geographic Filtering**:
   - Filters leads based on the firm's geographic investment criteria
   - Routes international leads to appropriate regional specialists

## Error Handling
The workflow includes robust error handling:

1. **Data Validation**:
   - Checks for required fields and data format consistency
   - Provides feedback for incomplete submissions

2. **Fallback Mechanisms**:
   - If CRM integration fails, stores data in Google Sheets and alerts admin
   - If team assignment logic fails, routes to default team member

3. **Duplicate Detection**:
   - Checks for existing records in CRM before creating new entries
   - Merges information for existing contacts/companies

## Integration Points
This workflow integrates with the following systems:

1. **Website Forms** - Captures inbound leads
2. **LinkedIn** - Receives messages and connection requests
3. **Agile CRM** - Stores contact, company, and deal information
4. **Slack** - Notifies team members and facilitates collaboration
5. **Google Sheets** - Maintains deal pipeline data and analytics
6. **Google Calendar** - Schedules follow-up activities

## Customization Options
The workflow can be customized in several ways:

1. **Scoring Criteria** - Adjust weights and thresholds based on investment focus
2. **Team Assignment Rules** - Modify routing logic based on team structure
3. **Notification Templates** - Customize Slack messages and email templates
4. **Form Fields** - Add or remove fields based on information requirements
5. **Integration Endpoints** - Connect to different CRM systems or communication tools

## Performance Considerations
To ensure optimal performance:

1. **Rate Limiting** - Implements delays between API calls to respect service limits
2. **Batch Processing** - Groups operations when possible to reduce API calls
3. **Error Retry Logic** - Automatically retries failed operations with exponential backoff
4. **Logging** - Records all activities for troubleshooting and optimization

This workflow significantly improves deal sourcing efficiency by automating manual tasks, ensuring consistent lead evaluation, and providing timely notifications to the right team members.
