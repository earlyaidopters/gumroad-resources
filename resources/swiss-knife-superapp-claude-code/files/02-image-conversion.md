# Phase 2: Image Conversion

Copy and paste this prompt into Claude Code to implement image conversion:

---

## PROMPT

```
Let's implement Phase 2: Image Conversion for Media Toolkit.

## Feature Requirements

### Supported Formats
- **Input**: PNG, JPG/JPEG, WEBP, GIF, BMP, TIFF, HEIC/HEIF (iPhone photos)
- **Output**: PNG, JPG, WEBP, GIF, BMP, TIFF

### Functionality
1. Upload one or more images via drag-and-drop or click
2. Select output format from button group
3. Quality slider (1-100) for JPG and WEBP formats
4. Preview uploaded files with names and sizes
5. Convert button that processes all images
6. Show individual progress/status for each file
7. Download individual files or all as ZIP (for multiple files)

### Technical Details
- Handle HEIC files using pillow-heif library
- Convert RGBA to RGB for formats without alpha (fill with white)
- Optimize PNG files automatically
- Stream responses for downloads
- Clean up temp files after processing

## Files to Create/Modify

### 1. Update requirements.txt
Add:
```
Pillow>=10.4.0
pillow-heif>=1.0.0
```

### 2. Create app/services/image_service.py
Functions needed:
- `convert_image(input_path, output_format, quality)` - returns output path
- `get_supported_formats()` - returns dict of input/output formats
- Handle color mode conversions
- Register HEIF opener with Pillow

### 3. Create app/routers/image.py
Endpoints:
- `POST /api/image/convert` - Convert single image
  - Form data: file, format, quality
  - Returns: FileResponse with converted image
- `POST /api/image/convert-bulk` - Convert multiple images
  - Form data: files[], format, quality
  - Returns: ZIP file with all converted images
- `GET /api/image/formats` - Get supported formats

### 4. Update app/main.py
- Import and include the image router

### 5. Create static/js/image.js
- Handle file selection (drag-drop and click)
- Display file previews with status indicators
- Format selection button group
- Quality slider (show only for JPG/WEBP)
- Convert button with progress tracking
- Download buttons (individual and ZIP)
- Remove individual files from list

### 6. Update templates/index.html
Add the Image Conversion panel with:
- Drag-and-drop upload zone
- File list with previews
- Format selector (button group: PNG, JPG, WEBP, GIF, BMP, TIFF)
- Quality slider (hidden until JPG/WEBP selected)
- Convert All button
- Results section with download buttons

### 7. Update static/css/styles.css
Add styles for:
- Upload drop zone (dashed border, drag-over state)
- File list items with status badges
- Button groups for format selection
- Quality slider styling
- Progress indicators
- Download buttons

## UI Design

```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ IMAGE CONVERSION                        │
│ Convert images between formats          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │   📁 Drop images here or click     │ │
│ │      Supports: PNG, JPG, HEIC...   │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Selected Files (3):                     │
│ ┌─────────────────────────────────────┐ │
│ │ photo1.heic  2.3 MB  [✓] [×]       │ │
│ │ photo2.jpg   1.1 MB  [✓] [×]       │ │
│ │ photo3.png   890 KB  [✓] [×]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Output Format:                          │
│ [PNG] [JPG] [WEBP] [GIF] [BMP] [TIFF]  │
│                                         │
│ Quality: ────●───── 85                  │
│                                         │
│ [  Convert All  ]                       │
│                                         │
│ Results:                                │
│ ┌─────────────────────────────────────┐ │
│ │ photo1.jpg ✓ [Download]            │ │
│ │ photo2.jpg ✓ [Download]            │ │
│ │ photo3.jpg ✓ [Download]            │ │
│ └─────────────────────────────────────┘ │
│ [  Download All as ZIP  ]               │
└─────────────────────────────────────────┘
```

## Deliverables
After this phase:
1. I can upload PNG, JPG, HEIC, etc. images
2. Select output format
3. Adjust quality for lossy formats
4. Convert and download individual files
5. Convert multiple and download as ZIP
6. HEIC files from iPhone convert correctly

Implement this feature now. Make sure the UI matches the existing dark theme.
```

---

## Verification Steps

After Claude completes this phase:

1. Restart the server if needed
2. Navigate to Image Conversion
3. Test the following:
   - [ ] Drag-and-drop works
   - [ ] Click to browse works
   - [ ] Multiple files can be added
   - [ ] Format buttons work
   - [ ] Quality slider appears for JPG/WEBP
   - [ ] Single file conversion works
   - [ ] Bulk conversion returns ZIP
   - [ ] HEIC files convert (if you have iPhone photos)
   - [ ] Files can be removed from list

Once verified, proceed to `03-pdf-tools.md`.
