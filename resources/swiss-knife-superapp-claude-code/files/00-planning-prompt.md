# Phase 0: Planning Prompt

Copy and paste this prompt into Claude Code to generate your implementation plan:

---

## PROMPT

```
I want to build a local web application called "Media Toolkit" - a Swiss Army knife for media processing. Before we write any code, I need you to create a comprehensive implementation plan.

## Project Overview

This will be a FastAPI-based web application with a vanilla JavaScript frontend. The app will have 6 main features:

1. **Image Conversion** - Convert between formats (PNG, JPG, WEBP, HEIC, etc.) with quality control
2. **PDF Tools** - Merge multiple PDFs and split PDFs into pages
3. **Audio Extraction** - Extract audio from video files using FFmpeg
4. **Video Splitting** - Split videos into N equal parts
5. **Video Compression** - Compress videos by target size, quality preset, or resolution
6. **AI Image Editor** - Generate and edit images using Google Gemini API

## Technical Requirements

- **Backend**: FastAPI with Python 3.9+
- **Frontend**: Vanilla HTML/CSS/JavaScript (no React/Vue)
- **Styling**: Dark theme with purple/indigo accents
- **Media Processing**: Pillow for images, pypdf for PDFs, FFmpeg for audio/video
- **AI**: Google Gemini (gemini-3-pro-image-preview model)
- **Architecture**: Router-Service pattern (routers handle HTTP, services handle business logic)

## What I Need From You

Create a detailed implementation plan that includes:

1. **Project Structure** - Complete folder/file layout
2. **Phase Breakdown** - 8 phases with specific deliverables for each
3. **Tech Stack Details** - All Python packages needed with versions
4. **API Endpoints** - List all endpoints we'll need
5. **UI Components** - Main menu cards, feature panels, shared components
6. **Dependencies** - External tools needed (FFmpeg, etc.)

Format the plan as a markdown document that I can reference throughout development. Include:
- Clear phase boundaries
- What each file will contain
- How components connect
- Any gotchas or considerations

Do NOT write any code yet. Just the plan. I will execute the phases one by one in subsequent prompts.
```

---

## Expected Output

Claude should create a detailed plan covering:
- Complete file structure
- 8 implementation phases
- All API endpoints mapped out
- Frontend component breakdown
- Configuration requirements

Once you have the plan, proceed to `01-project-setup.md`.
