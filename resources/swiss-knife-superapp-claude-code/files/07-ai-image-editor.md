# Phase 7: AI Image Editor

Copy and paste this prompt into Claude Code to implement the AI image editor:

---

## PROMPT

```
Let's implement Phase 7: AI Image Editor for Media Toolkit.

This feature uses Google's Gemini API for AI-powered image generation and editing.

## Feature Requirements

### Image Generation (Text-to-Image)
Create images from text prompts with:
- **Style Presets**:
  - Photorealistic
  - Digital Art
  - Watercolor
  - Minimalist
  - 3D Render
  - Anime/Manga
- **Aspect Ratios**: 1:1, 4:5, 9:16, 16:9
- **Image Sizes**: 1K (1024px), 2K (2048px), 4K (4096px)

### Image Editing
Modify existing images with AI:
- **Quick Action Presets**:
  - Remove Background
  - Change Style (artistic transformation)
  - Add Elements (based on prompt)
  - Remove Object (describe what to remove)
  - Enhance Quality (upscale/sharpen)
  - Color Correction
- **Custom Prompt**: Free-form editing instructions
- Optional aspect ratio override

### Technical Details
- Model: `gemini-3-pro-image-preview` (Nano Banana Pro)
- SDK: `google-genai` (v0.4.0+)
- API key stored in .env as GOOGLE_API_KEY
- Handle rate limits and API errors gracefully
- Return images as base64 or direct file response

## Files to Create/Modify

### 1. Update requirements.txt
Add:
```
google-genai>=0.4.0
httpx>=0.27.0
```

### 2. Create app/services/ai_image_service.py
Functions needed:
- `generate_image(prompt, style, aspect_ratio, size)` - returns image bytes
- `edit_image(image_path, action, custom_prompt, aspect_ratio)` - returns image bytes
- `get_style_presets()` - returns dict of style names and prompt modifiers
- `get_action_presets()` - returns dict of action names and prompts
- `_build_generation_prompt(user_prompt, style)` - combines prompt with style
- `_build_edit_prompt(action, custom_prompt)` - builds edit instruction
- Custom exception: `AIImageError` for API failures

### 3. Create app/routers/ai_image.py
Endpoints:
- `POST /api/ai-image/generate` - Generate image from prompt
  - JSON body: prompt, style, aspect_ratio, size
  - Returns: FileResponse with generated image
- `POST /api/ai-image/edit` - Edit existing image
  - Form data: file, action, custom_prompt, aspect_ratio
  - Returns: FileResponse with edited image
- `GET /api/ai-image/presets` - Get all available presets

### 4. Update app/main.py
- Import and include the ai_image router

### 5. Create static/js/ai-image.js
- Tab navigation: [Generate] [Edit]
- Generate tab:
  - Prompt text area
  - Style selector (button group or grid)
  - Aspect ratio selector
  - Size selector
  - Generate button
  - Result preview with download
- Edit tab:
  - Image upload
  - Action selector (grid of preset buttons)
  - Custom prompt input
  - Aspect ratio selector (optional)
  - Edit button
  - Before/After comparison
  - Download result

### 6. Update templates/index.html
Add the AI Image Editor panel with both tabs.

### 7. Update static/css/styles.css
Add styles for:
- Prompt text area
- Style/action preset grid
- Generated image preview
- Before/after comparison
- Loading state with animation

## UI Design

### Generate Tab
```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ AI IMAGE EDITOR                         │
│ [■ Generate] [ Edit ]                   │
│                                         │
│ Describe what you want to create:       │
│ ┌─────────────────────────────────────┐ │
│ │ A serene Japanese garden with       │ │
│ │ cherry blossoms and a small pond    │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Style:                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │Photo│ │Digi-│ │Water│ │Mini-│       │
│ │real │ │ tal │ │color│ │mal  │       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│ ┌─────┐ ┌─────┐                        │
│ │ 3D  │ │Anime│                        │
│ └─────┘ └─────┘                        │
│                                         │
│ Aspect Ratio: [1:1] [4:5] [9:16] [16:9]│
│ Size: [1K] [2K] [4K]                   │
│                                         │
│ [  Generate Image  ]                    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │        [Generated Image]            │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ [  Download  ]                          │
└─────────────────────────────────────────┘
```

### Edit Tab
```
┌─────────────────────────────────────────┐
│ AI IMAGE EDITOR                         │
│ [ Generate ] [■ Edit]                   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   📷 Drop an image to edit         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Quick Actions:                          │
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │Remove  │ │Change  │ │  Add   │       │
│ │  BG    │ │ Style  │ │Elements│       │
│ └────────┘ └────────┘ └────────┘       │
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │Remove  │ │Enhance │ │ Color  │       │
│ │Object  │ │Quality │ │Correct │       │
│ └────────┘ └────────┘ └────────┘       │
│                                         │
│ Custom Instructions (optional):         │
│ ┌─────────────────────────────────────┐ │
│ │ Make the sky more dramatic with    │ │
│ │ orange sunset colors               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [  Edit Image  ]                        │
│                                         │
│ ┌───────────────┐ ┌───────────────┐    │
│ │    Before     │ │     After     │    │
│ │               │ │               │    │
│ └───────────────┘ └───────────────┘    │
│ [  Download  ]                          │
└─────────────────────────────────────────┘
```

## Google Gemini API Reference

### Setup
```python
from google import genai

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
```

### Generate Image
```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        "Create an image of: A serene Japanese garden with cherry blossoms"
    ],
    config=genai.types.GenerateContentConfig(
        response_modalities=["IMAGE"],
    )
)

# Get image data
for part in response.candidates[0].content.parts:
    if part.inline_data:
        image_bytes = part.inline_data.data
        mime_type = part.inline_data.mime_type
```

### Edit Image
```python
from google.genai import types

# Load the image
image = types.Part.from_bytes(
    data=image_bytes,
    mime_type="image/png"
)

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        image,
        "Edit this image: remove the background and make it transparent"
    ],
    config=genai.types.GenerateContentConfig(
        response_modalities=["IMAGE"],
    )
)
```

## Preset Prompts

### Style Presets (for generation)
```python
STYLE_PRESETS = {
    "photorealistic": "photorealistic, highly detailed, professional photography",
    "digital_art": "digital art, vibrant colors, detailed illustration",
    "watercolor": "watercolor painting style, soft edges, artistic brush strokes",
    "minimalist": "minimalist design, clean lines, simple composition",
    "3d_render": "3D rendered, CGI, highly detailed, realistic lighting",
    "anime": "anime style, manga illustration, Japanese animation aesthetic"
}
```

### Action Presets (for editing)
```python
ACTION_PRESETS = {
    "remove_background": "Remove the background from this image, make it transparent",
    "change_style": "Transform this image into a {style} artistic style",
    "add_elements": "Add the following to this image: {prompt}",
    "remove_object": "Remove {prompt} from this image, fill naturally",
    "enhance_quality": "Enhance this image: improve clarity, sharpness, and detail",
    "color_correction": "Correct and enhance the colors in this image"
}
```

## Deliverables
After this phase:
1. I can generate images from text prompts
2. Style presets modify the output style
3. Aspect ratio and size options work
4. I can upload an image and apply edits
5. Quick action presets work correctly
6. Custom edit prompts are supported
7. API errors are handled gracefully

Make sure to handle the case where GOOGLE_API_KEY is not set with a helpful error message.
```

---

## Verification Steps

After Claude completes this phase:

1. Setup:
   - [ ] Add GOOGLE_API_KEY to .env file
   - [ ] Get API key from https://aistudio.google.com/apikey

2. Test Generation:
   - [ ] Simple prompt generates an image
   - [ ] Style presets change the output style
   - [ ] Different aspect ratios work
   - [ ] Different sizes work

3. Test Editing:
   - [ ] Upload image works
   - [ ] "Remove Background" action works
   - [ ] "Change Style" action works
   - [ ] Custom prompt editing works

4. Error Handling:
   - [ ] Missing API key shows helpful error
   - [ ] Invalid prompt handles gracefully
   - [ ] Rate limit errors are caught

Once verified, proceed to `08-polish-and-testing.md`.
