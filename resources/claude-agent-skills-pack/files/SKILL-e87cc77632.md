---
name: pitch-deck-builder
description: Transform rough ideas, bullet points, or text outlines into professional PowerPoint pitch decks. Create investor presentations, sales decks, or business proposals with proper structure and design. Use when the user mentions pitch deck, investor presentation, PowerPoint from notes, startup pitch, or wants to create slides from ideas.
---

# Pitch Deck Builder

## What This Skill Does

This skill transforms rough notes, bullet points, or text outlines into polished PowerPoint presentations suitable for investor pitches, sales presentations, or business proposals. It automatically structures content into standard pitch deck format with professional layouts and design elements.

## When to Use

Invoke this skill when the user:
- Mentions creating a pitch deck or investor presentation
- Has rough notes or ideas they want turned into slides
- Asks for help creating a PowerPoint presentation
- Needs a startup pitch, sales deck, or business proposal
- Wants to convert text outline into professional slides
- Mentions Y Combinator, investors, pitch, funding, or presentations

## How It Works

### Step 1: Parse Input and Structure Content

```python
# Read the input file containing rough notes/outline
with open('startup_outline.txt', 'r') as f:
    content = f.read()

# Standard pitch deck structure
deck_structure = [
    'Title Slide',
    'Problem',
    'Solution',
    'Product/Demo',
    'Market Size',
    'Business Model',
    'Traction',
    'Competition',
    'Team',
    'Financial Projections',
    'Ask/Closing'
]
```

### Step 2: Create PowerPoint with python-pptx

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# Create presentation
prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(7.5)

# Define color scheme (professional blue)
PRIMARY_COLOR = RGBColor(31, 71, 136)  # Dark blue
SECONDARY_COLOR = RGBColor(79, 129, 189)  # Medium blue
ACCENT_COLOR = RGBColor(155, 187, 89)  # Green
TEXT_COLOR = RGBColor(51, 51, 51)  # Dark gray

# === SLIDE 1: TITLE ===
slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout

# Add background color
background = slide.background
fill = background.fill
fill.solid()
fill.fore_color.rgb = PRIMARY_COLOR

# Company name
title_box = slide.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(1))
title_frame = title_box.text_frame
title_frame.text = "YourStartup"
title_para = title_frame.paragraphs[0]
title_para.font.size = Pt(60)
title_para.font.bold = True
title_para.font.color.rgb = RGBColor(255, 255, 255)
title_para.alignment = PP_ALIGN.CENTER

# Tagline
subtitle_box = slide.shapes.add_textbox(Inches(1), Inches(3.8), Inches(8), Inches(0.8))
subtitle_frame = subtitle_box.text_frame
subtitle_frame.text = "Revolutionizing [Industry] with AI"
subtitle_para = subtitle_frame.paragraphs[0]
subtitle_para.font.size = Pt(28)
subtitle_para.font.color.rgb = RGBColor(255, 255, 255)
subtitle_para.alignment = PP_ALIGN.CENTER

# === SLIDE 2: PROBLEM ===
slide = prs.slides.add_slide(prs.slide_layouts[1])  # Title and content
title = slide.shapes.title
title.text = "The Problem"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

content = slide.placeholders[1]
tf = content.text_frame
tf.text = "The current market faces three major challenges:"

# Add bullet points
for point in [
    "Manual processes waste 20+ hours per week",
    "Existing solutions are too complex and expensive",
    "No integrated platform exists for small businesses"
]:
    p = tf.add_paragraph()
    p.text = point
    p.level = 1
    p.font.size = Pt(24)

# === SLIDE 3: SOLUTION ===
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "Our Solution"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

content = slide.placeholders[1]
tf = content.text_frame
tf.text = "An AI-powered platform that:"

for point in [
    "Automates repetitive tasks (saves 20 hrs/week)",
    "Simple interface anyone can use in 5 minutes",
    "Affordable pricing starting at $49/month",
    "Integrates with existing tools seamlessly"
]:
    p = tf.add_paragraph()
    p.text = point
    p.level = 1
    p.font.size = Pt(24)

# === SLIDE 4: PRODUCT/DEMO ===
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "Product Demo"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

# Add placeholder for demo screenshot
left = Inches(1.5)
top = Inches(2)
width = Inches(7)
height = Inches(4.5)
txBox = slide.shapes.add_textbox(left, top, width, height)
tf = txBox.text_frame
tf.text = "[Product Screenshot/Demo Here]"
tf.paragraphs[0].alignment = PP_ALIGN.CENTER
tf.paragraphs[0].font.size = Pt(32)
tf.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)

# === SLIDE 5: MARKET SIZE ===
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "Market Opportunity"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

# TAM/SAM/SOM boxes
left_start = Inches(1)
top_start = Inches(2)
box_width = Inches(2.5)
box_height = Inches(1.5)
spacing = Inches(0.3)

markets = [
    ("TAM", "$50B", "Total Addressable Market"),
    ("SAM", "$5B", "Serviceable Available"),
    ("SOM", "$500M", "Target in 5 years")
]

for idx, (label, value, description) in enumerate(markets):
    left = left_start + idx * (box_width + spacing)

    # Create box
    shape = slide.shapes.add_shape(
        1,  # Rectangle
        left, top_start, box_width, box_height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = SECONDARY_COLOR if idx == 0 else (ACCENT_COLOR if idx == 2 else PRIMARY_COLOR)
    shape.line.color.rgb = RGBColor(255, 255, 255)

    # Add text
    tf = shape.text_frame
    tf.text = f"{label}\n{value}"
    tf.paragraphs[0].font.size = Pt(32)
    tf.paragraphs[0].font.bold = True
    tf.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER

    # Description below
    desc_box = slide.shapes.add_textbox(left, top_start + box_height + Inches(0.2), box_width, Inches(0.5))
    desc_tf = desc_box.text_frame
    desc_tf.text = description
    desc_tf.paragraphs[0].font.size = Pt(14)
    desc_tf.paragraphs[0].alignment = PP_ALIGN.CENTER

# === SLIDE 6: BUSINESS MODEL ===
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "Business Model"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

content = slide.placeholders[1]
tf = content.text_frame
tf.text = "SaaS Subscription Model:"

for point in [
    "Starter: $49/month (up to 10 users)",
    "Professional: $149/month (up to 50 users)",
    "Enterprise: Custom pricing (unlimited)",
    "Average Revenue Per User (ARPU): $89/month",
    "Customer Acquisition Cost (CAC): $200",
    "Lifetime Value (LTV): $2,400"
]:
    p = tf.add_paragraph()
    p.text = point
    p.level = 1
    p.font.size = Pt(20)

# === SLIDE 7: TRACTION ===
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "Traction & Milestones"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

content = slide.placeholders[1]
tf = content.text_frame
tf.text = "Key achievements to date:"

for point in [
    "✓ 1,200 active users in 6 months",
    "✓ $50K MRR with 20% month-over-month growth",
    "✓ 95% customer satisfaction score",
    "✓ Partnerships with 3 major industry players",
    "✓ Featured in TechCrunch and Forbes"
]:
    p = tf.add_paragraph()
    p.text = point
    p.level = 1
    p.font.size = Pt(24)

# === SLIDE 8: COMPETITION ===
slide = prs.slides.add_slide(prs.slide_layouts[5])  # Title only
title = slide.shapes.title
title.text = "Competitive Landscape"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

# Simple competitive matrix placeholder
comp_box = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(4))
tf = comp_box.text_frame
tf.text = "Why we're different:\n\n"
tf.paragraphs[0].font.size = Pt(28)

for point in [
    "• Competitor A: Enterprise-only, complex setup",
    "• Competitor B: Limited features, poor UX",
    "• Us: Affordable, easy to use, comprehensive"
]:
    p = tf.add_paragraph()
    p.text = point
    p.font.size = Pt(22)

# === SLIDE 9: TEAM ===
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "Our Team"
title.text_frame.paragraphs[0].font.size = Pt(44)
title.text_frame.paragraphs[0].font.color.rgb = PRIMARY_COLOR

content = slide.placeholders[1]
tf = content.text_frame
tf.text = "Experienced team with proven track record:"

for point in [
    "CEO: 15 years in SaaS, 2 successful exits",
    "CTO: Former Google engineer, ML expert",
    "VP Product: Led product at unicorn startup",
    "20 total employees across engineering, sales, and support"
]:
    p = tf.add_paragraph()
    p.text = point
    p.level = 1
    p.font.size = Pt(22)

# === SLIDE 10: ASK ===
slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank

# Background
background = slide.background
fill = background.fill
fill.solid()
fill.fore_color.rgb = ACCENT_COLOR

# The Ask
ask_box = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(2))
tf = ask_box.text_frame
tf.text = "We're raising $2M Seed Round"
tf.paragraphs[0].font.size = Pt(48)
tf.paragraphs[0].font.bold = True
tf.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)
tf.paragraphs[0].alignment = PP_ALIGN.CENTER

# Use of funds
use_box = slide.shapes.add_textbox(Inches(1.5), Inches(4.5), Inches(7), Inches(2))
tf = use_box.text_frame
tf.text = "Use of funds:\n50% Engineering | 30% Sales & Marketing | 20% Operations"
tf.paragraphs[0].font.size = Pt(24)
tf.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)
tf.paragraphs[0].alignment = PP_ALIGN.CENTER

# Save presentation
prs.save('pitch_deck.pptx')
print("Pitch deck created: pitch_deck.pptx")
```

## Required Libraries

- python-pptx

## Example Usage

**User prompt**: "Create a 10-slide investor pitch deck from these notes about my AI SaaS startup"

**Claude will**:
1. Read the user's rough notes/outline
2. Extract key information (problem, solution, market, etc.)
3. Structure content into standard pitch deck format
4. Create professional PowerPoint with:
   - Title slide with company name
   - Problem slide highlighting pain points
   - Solution slide with key benefits
   - Product/demo placeholder
   - Market opportunity (TAM/SAM/SOM)
   - Business model and pricing
   - Traction and metrics
   - Competitive landscape
   - Team overview
   - Funding ask and use of funds
5. Apply professional design with consistent colors and fonts
6. Output ready-to-present .pptx file

**Output files**:
- `pitch_deck.pptx` - Complete 10-slide presentation

## Tips for Best Results

- Provide clear information about your:
  - Problem and solution
  - Target market and size
  - Business model and pricing
  - Current traction (users, revenue, growth)
  - Team background
  - Funding ask
- The more details you provide, the more customized the deck
- Claude will use industry-standard pitch deck structure
- You can request specific slides to be added or modified
- Works for: investor pitches, sales decks, product presentations, business proposals

## Customization Options

Users can request:
- Different color schemes (corporate, tech, creative)
- More or fewer slides
- Specific slide types (timeline, roadmap, financial projections)
- Industry-specific templates (B2B SaaS, consumer apps, hardware, etc.)
- Speaker notes for each slide
