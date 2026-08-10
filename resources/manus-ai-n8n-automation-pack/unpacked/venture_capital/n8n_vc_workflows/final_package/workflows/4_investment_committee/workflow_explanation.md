# Investment Committee Decision Workflow

## Overview
This workflow automates the process of preparing for, conducting, and following up on investment committee meetings where final investment decisions are made. It streamlines document distribution, facilitates structured voting, captures decision rationales, and ensures proper communication of outcomes to all stakeholders. By standardizing the investment committee process, this workflow improves decision quality, maintains comprehensive records, and accelerates post-decision actions while reducing administrative overhead.

## Workflow Triggers
The workflow can be initiated through multiple entry points:
1. **Due Diligence Completion** - Automatically triggered when due diligence is finalized
2. **Manual Trigger** - Deal sponsor manually initiates the IC process for a specific opportunity
3. **Scheduled Trigger** - Regular IC meetings based on predetermined schedule
4. **CRM Status Change** - Triggered when a deal reaches "IC Review" stage in the CRM

## Step-by-Step Process Flow

### 1. Pre-Meeting Preparation
- **Function Node**: Identifies upcoming IC agenda items based on completed due diligence
- **Google Drive Node**: Collects all relevant documents for each investment opportunity
- **Code Node**: Generates standardized investment memo template with key data points
- **Google Docs Node**: Creates comprehensive investment committee memo
- **Slack Node**: Notifies deal sponsor to review and finalize the memo

### 2. Meeting Scheduling and Material Distribution
- **Google Calendar Node**: Schedules or updates IC meeting based on availability
- **Function Node**: Determines required attendees and optional observers
- **Gmail Node**: Distributes meeting invitation with agenda and materials
- **Google Drive Node**: Creates shared folder with read-only access to all materials
- **Slack Node**: Sends reminder with direct links to all documents

### 3. Pre-Meeting Feedback Collection
- **Form Trigger Node**: Collects preliminary questions and concerns from IC members
- **Function Node**: Categorizes feedback and identifies common themes
- **Gmail Node**: Sends compiled questions to deal sponsor for preparation
- **Slack Node**: Creates dedicated channel for pre-meeting discussion

### 4. Meeting Facilitation
- **Google Calendar Trigger Node**: Initiates meeting workflow when IC meeting begins
- **Function Node**: Generates meeting agenda with time allocations
- **Google Docs Node**: Creates live meeting notes document
- **Slack Node**: Sends meeting start notification with links to live documents

### 5. Decision Capture and Voting
- **Form Trigger Node**: Collects structured voting input from each IC member
- **Function Node**: Applies firm's voting rules (unanimous, majority, points system)
- **Switch Node**: Routes workflow based on voting outcome
- **Google Sheets Node**: Records votes, comments, and decision rationale
- **Code Node**: Calculates final decision based on voting rules

### 6. Post-Decision Documentation
- **Function Node**: Generates comprehensive decision record
- **Google Docs Node**: Creates formal investment decision document
- **Google Drive Node**: Stores decision document in appropriate deal folder
- **CRM Node**: Updates deal status based on decision outcome

### 7. Communication and Next Steps
- **Switch Node**: Routes workflow based on positive or negative decision
- **Gmail Node**: Sends appropriate communications to founders based on decision
- **Slack Node**: Notifies relevant team members of decision and next steps
- **Function Node**: Generates task list for post-decision actions

### 8. Follow-up Actions
- **Switch Node**: Routes to appropriate next workflow based on decision
- **For Approved Investments**:
  - **Google Docs Node**: Generates term sheet or updates existing one
  - **Gmail Node**: Sends term sheet to founders
  - **Schedule Trigger Node**: Sets up follow-up timeline
- **For Declined Investments**:
  - **Gmail Node**: Sends thoughtful rejection with feedback
  - **CRM Node**: Updates deal status and archives materials
  - **Function Node**: Identifies potential future reconnection points

## Decision Logic
The workflow incorporates several decision points:

1. **Voting Rule Implementation**:
   - Unanimous approval: All IC members must approve
   - Simple majority: More than half of IC members must approve
   - Points system: Members assign points, investment must cross threshold
   - Champion-based: One partner strongly advocates with limited veto rights

2. **Decision Outcomes**:
   - Approve: Move forward with investment
   - Decline: Reject the investment opportunity
   - Defer: Request additional information before making final decision
   - Modify: Approve with specific changes to terms or conditions

3. **Follow-up Determination**:
   - Immediate actions for approved deals
   - Feedback delivery for declined deals
   - Information gathering for deferred decisions
   - Term renegotiation for modified approvals

## Error Handling
The workflow includes robust error handling:

1. **Quorum Verification**:
   - Ensures minimum required IC members participate in decision
   - Reschedules meeting if quorum cannot be achieved

2. **Incomplete Information Detection**:
   - Identifies missing critical data in investment memos
   - Pauses process until required information is provided

3. **Deadlock Resolution**:
   - Implements tie-breaking mechanisms when votes are split
   - Escalates to managing partner or executive committee when needed

## Integration Points
This workflow integrates with the following systems:

1. **Google Calendar** - Manages meeting scheduling
2. **Google Drive/Docs** - Handles document creation and storage
3. **Gmail** - Manages communications with team and founders
4. **Slack** - Facilitates internal notifications and discussions
5. **CRM System** - Maintains comprehensive deal records
6. **Form System** - Collects structured feedback and votes

## Customization Options
The workflow can be customized in several ways:

1. **Voting Rules** - Configure decision criteria based on firm's governance
2. **Document Templates** - Customize investment memo and decision record formats
3. **Communication Templates** - Adjust messaging for different decision outcomes
4. **Approval Thresholds** - Set different requirements based on investment size
5. **Escalation Paths** - Define alternative approval routes for special cases

## Performance Considerations
To ensure optimal performance:

1. **Document Handling** - Implements efficient processing for large investment memos
2. **Meeting Scheduling** - Respects calendar availability and time zone differences
3. **Decision Recording** - Creates comprehensive audit trail of all votes and rationales
4. **Integration Timing** - Coordinates updates across multiple systems to maintain consistency

This workflow significantly improves the investment committee process by standardizing procedures, ensuring comprehensive documentation, facilitating structured decision-making, and maintaining a complete record of investment decisions. It integrates seamlessly with the due diligence workflow to provide a continuous experience from evaluation through to final investment decision.
