# Phase 1: Project Setup

Copy and paste this prompt into Claude Code to set up the base project:

---

## PROMPT

```
Let's begin building Media Toolkit. This is Phase 1: Project Setup.

## What to Create

### 1. Project Structure
Create this folder structure:
```
media-toolkit/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI entry point
│   ├── config.py         # Environment configuration
│   ├── routers/          # API endpoints (empty for now)
│   │   └── __init__.py
│   └── services/         # Business logic (empty for now)
│       └── __init__.py
├── static/
│   ├── css/
│   │   └── styles.css    # Dark theme stylesheet
│   └── js/
│       └── main.js       # Core navigation & utilities
├── templates/
│   └── index.html        # Single-page app template
├── uploads/              # Temp upload storage
│   └── .gitkeep
├── outputs/              # Temp output storage
│   └── .gitkeep
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

### 2. Backend Setup (app/main.py)
- FastAPI app with Jinja2 templates
- Static file serving from /static
- Health check endpoint at /health
- CORS middleware for local development
- Auto-create uploads/outputs directories on startup

### 3. Configuration (app/config.py)
- Use pydantic-settings for config management
- Load from .env file
- Settings: GOOGLE_API_KEY, UPLOAD_DIR, OUTPUT_DIR

### 4. Frontend Base (templates/index.html)
Create a single-page app with:
- Dark theme (purple/indigo accents)
- Main menu with 6 feature cards in a grid:
  1. Image Conversion - "Convert between image formats"
  2. PDF Tools - "Merge and split PDF files"
  3. Audio Extraction - "Extract audio from videos"
  4. Video Splitting - "Split videos into parts"
  5. Video Compression - "Compress videos"
  6. AI Image Editor - "Generate and edit with AI"
- Each card should have an icon (use inline SVG), title, and description
- Clicking a card should show its feature panel (panels will be added later)
- "Back to Menu" button in each panel
- Use Feather Icons style for SVGs

### 5. Styling (static/css/styles.css)
Create a complete dark theme with:
- CSS custom properties for colors
- Background: dark gray (#0f0f0f)
- Cards: slightly lighter (#1a1a1a)
- Accent: purple/indigo gradient
- Hover effects on cards
- Smooth transitions
- Grid layout for cards (responsive)
- Panel show/hide animations
- Button styles (primary, secondary)
- Form input styles (dark theme)
- Drag-and-drop zone styles (for future use)

### 6. Core JavaScript (static/js/main.js)
- Panel navigation (showPanel, showMainMenu functions)
- Utility functions:
  - formatFileSize(bytes) - returns "1.5 MB" etc
  - formatDuration(seconds) - returns "1:23" or "1:23:45"
  - showToast(message, type) - placeholder for notifications
- Event listeners for card clicks

### 7. Requirements (requirements.txt)
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-multipart>=0.0.6
jinja2>=3.1.3
pydantic-settings>=2.1.0
python-dotenv>=1.0.0
aiofiles>=23.2.1
```

### 8. Config Files
- .env.example with GOOGLE_API_KEY placeholder
- .gitignore (ignore .env, venv, __pycache__, uploads/*, outputs/*)
- Simple README.md with setup instructions

## Deliverables
After running this, I should be able to:
1. Run `pip install -r requirements.txt`
2. Run `uvicorn app.main:app --reload`
3. Visit http://127.0.0.1:8000 and see the main menu with 6 cards
4. Click cards to see empty panels
5. Navigate back to the main menu

Create all files now. Make the UI polished and professional-looking.
```

---

## Verification Steps

After Claude completes this phase:

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

5. Open http://127.0.0.1:8000 and verify:
   - [ ] Dark themed UI loads
   - [ ] 6 feature cards are visible
   - [ ] Cards have icons and descriptions
   - [ ] Clicking a card shows an empty panel
   - [ ] Back button returns to main menu

Once verified, proceed to `02-image-conversion.md`.
