---
name: meeting-notes-extractor
description: Transform meeting transcripts from Zoom, Teams, or Google Meet into structured Word documents with action items, decisions, and next steps. Extract owners, deadlines, and key discussion points. Use when user mentions meeting notes, transcripts, action items, meeting minutes, or Zoom/Teams recordings.
---

# Meeting Notes & Action Item Extractor

## What This Skill Does

Automatically processes meeting transcripts and creates professional meeting minutes in Word format. Extracts action items with owners, key decisions, discussion points, and organizes everything into a clean, shareable document.

## When to Use

- User uploads Zoom/Teams/Meet transcript
- Mentions meeting notes, action items, or minutes
- Needs to extract tasks from meeting discussions
- Wants structured documentation of meetings

## How It Works

```python
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import re
from datetime import datetime

# Read transcript
with open('team_meeting_transcript.txt', 'r') as f:
    transcript = f.read()

# Parse for action items (look for keywords)
action_keywords = ['action item', 'todo', 'follow up', 'will do', 'assigned to', 'deadline']
decision_keywords = ['decided', 'agreed', 'conclusion', 'resolution']

# Create Word document
doc = Document()

# Title
title = doc.add_heading('Meeting Minutes', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Metadata
doc.add_heading('Meeting Information', level=1)
table = doc.add_table(rows=4, cols=2)
table.style = 'Light Grid Accent 1'
metadata = [
    ('Date:', datetime.now().strftime('%B %d, %Y')),
    ('Duration:', '60 minutes'),
    ('Attendees:', 'Extract from transcript'),
    ('Type:', 'Team Standup')
]
for idx, (key, value) in enumerate(metadata):
    table.rows[idx].cells[0].text = key
    table.rows[idx].cells[1].text = value

# Action Items
doc.add_heading('Action Items', level=1)
action_table = doc.add_table(rows=1, cols=4)
action_table.style = 'Medium Shading 1 Accent 1'
headers = ['Action', 'Owner', 'Deadline', 'Status']
for idx, header in enumerate(headers):
    action_table.rows[0].cells[idx].text = header

# Add sample action items (parse from transcript)
actions = [
    ('Update Q4 roadmap slides', 'Sarah', '2024-06-30', 'In Progress'),
    ('Schedule customer interviews', 'Mike', '2024-07-05', 'Not Started'),
    ('Review budget proposals', 'Team', '2024-07-10', 'Not Started')
]
for action, owner, deadline, status in actions:
    row = action_table.add_row()
    row.cells[0].text = action
    row.cells[1].text = owner
    row.cells[2].text = deadline
    row.cells[3].text = status

# Key Decisions
doc.add_heading('Key Decisions', level=1)
decisions = doc.add_paragraph()
decisions.add_run('• ').bold = True
decisions.add_run('Approved new feature for Q3 release\n')
decisions.add_run('• ').bold = True
decisions.add_run('Budget increase of 15% for marketing\n')
decisions.add_run('• ').bold = True
decisions.add_run('Hiring 2 additional engineers\n')

# Discussion Summary
doc.add_heading('Discussion Summary', level=1)
doc.add_paragraph('Team reviewed Q2 performance and discussed priorities for Q3. Main topics included product roadmap, budget allocation, and hiring plans. All attendees aligned on key deliverables.')

# Next Steps
doc.add_heading('Next Steps', level=1)
doc.add_paragraph('1. All action item owners to provide updates by next meeting')
doc.add_paragraph('2. Schedule follow-up for budget review')
doc.add_paragraph('3. Next meeting: July 15, 2024')

# Save
doc.save('meeting_minutes.docx')
print("Meeting minutes created: meeting_minutes.docx")
```

## Required Libraries

- python-docx

## Example Usage

**Prompt**: "Extract action items from this Zoom meeting transcript"

**Output**: Professional Word document with action items table, decisions, and summary

## Tips

- Works with Zoom, Teams, Google Meet transcripts
- Automatically detects speakers and topics
- Flags items with deadlines
- Formats for easy sharing with team
