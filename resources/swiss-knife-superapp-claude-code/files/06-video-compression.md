# Phase 6: Video Compression

Copy and paste this prompt into Claude Code to implement video compression:

---

## PROMPT

```
Let's implement Phase 6: Video Compression for Media Toolkit.

This is a complex feature with THREE compression modes. Take your time and implement carefully.

## Feature Requirements

### Mode 1: Target Size
- Specify desired output file size (e.g., 900 MB for < 1GB limit)
- Uses two-pass encoding for accurate bitrate targeting
- Calculates optimal video bitrate based on target size, duration, and audio bitrate

### Mode 2: Quality Preset
- Three presets:
  - Low: CRF 28 (smaller file, lower quality)
  - Medium: CRF 23 (balanced)
  - High: CRF 18 (larger file, higher quality)
- Single-pass CRF encoding

### Mode 3: Resolution
- Downscale to target resolution while maintaining aspect ratio
- Options: 2160p (4K), 1440p, 1080p, 720p, 480p, 360p
- Combined with quality preset for final encoding

### Additional Features
- "Estimate" button to preview output size before compression
- Show progress during compression (percentage if possible)
- Support for local file paths (for large files)

### Technical Details
- Video codec: libx264
- Audio codec: AAC at 128kbps
- Two-pass encoding for target size mode
- CRF encoding for quality/resolution modes
- Scale filter for resolution: `scale=-2:{height}` (ensures even dimensions)
- Long timeout (1 hour) for compression operations
- Use temp directory for two-pass log files

## Bitrate Calculation for Target Size
```
target_video_bitrate = ((target_size_mb * 8192) / duration_seconds) - audio_bitrate_kbps
```

## Files to Create/Modify

### 1. Update app/services/video_service.py
Add functions:
- `compress_target_size(video_path, target_size_mb)` - two-pass encoding
- `compress_quality(video_path, quality_preset)` - CRF encoding
- `compress_resolution(video_path, resolution, quality_preset)` - scale + CRF
- `estimate_output_size(video_path, settings)` - estimate without processing
- Helper: `_run_two_pass_encode(input_path, output_path, video_bitrate)`
- Helper: `_get_crf_for_preset(preset)` - returns CRF value

### 2. Update app/routers/video.py
Add endpoints:
- `POST /api/video/compress/target-size`
  - Form data: file, target_size_mb
  - Returns: FileResponse with compressed video
- `POST /api/video/compress/quality`
  - Form data: file, preset (low/medium/high)
  - Returns: FileResponse with compressed video
- `POST /api/video/compress/resolution`
  - Form data: file, resolution, preset
  - Returns: FileResponse with compressed video
- `POST /api/video/compress/estimate`
  - Form data: file or path, settings
  - Returns: JSON with estimated output size

### 3. Create static/js/compress.js
- Tab navigation: [Target Size] [Quality] [Resolution]
- Target Size tab:
  - File upload or local path
  - Target size input (MB)
  - Estimate button
  - Compress button
- Quality tab:
  - File upload or local path
  - Quality preset selector (Low/Medium/High)
  - Estimate button
  - Compress button
- Resolution tab:
  - File upload or local path
  - Resolution selector dropdown
  - Quality preset selector
  - Estimate button
  - Compress button
- All tabs:
  - Video info display
  - Progress indicator
  - Download result

### 4. Update templates/index.html
Add the Video Compression panel with all three modes.

### 5. Update static/css/styles.css
Add styles for:
- Three-tab navigation
- Target size input with "MB" label
- Resolution dropdown
- Estimate result display
- Compression progress bar (if percentage available)

## UI Design

### Target Size Tab
```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ VIDEO COMPRESSION                       │
│ [■ Target Size] [ Quality ] [ Resolution]│
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   🎬 Drop a video file here        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Local path: [                    ] [Load]│
│                                         │
│ 📹 large_video.mp4 (2.3 GB, 45:00)     │
│                                         │
│ Target Size: [ 900 ] MB                 │
│ (Original: 2,355 MB)                    │
│                                         │
│ [Estimate] → Estimated: ~892 MB         │
│                                         │
│ [  Compress Video  ]                    │
│                                         │
│ Progress: [████████████░░░░░] 72%       │
│                                         │
│ ✓ Compressed: 891 MB (62% reduction)    │
│ [  Download  ]                          │
└─────────────────────────────────────────┘
```

### Quality Tab
```
┌─────────────────────────────────────────┐
│ VIDEO COMPRESSION                       │
│ [ Target Size ] [■ Quality] [ Resolution]│
│                                         │
│ ... (file upload) ...                   │
│                                         │
│ Quality Preset:                         │
│ [Low] [■ Medium] [High]                 │
│                                         │
│ • Low: Smaller file, lower quality      │
│ • Medium: Balanced (recommended)        │
│ • High: Larger file, better quality     │
│                                         │
│ [  Compress Video  ]                    │
└─────────────────────────────────────────┘
```

### Resolution Tab
```
┌─────────────────────────────────────────┐
│ VIDEO COMPRESSION                       │
│ [ Target Size ] [ Quality ] [■ Resolution]│
│                                         │
│ ... (file upload) ...                   │
│                                         │
│ Target Resolution:                      │
│ [ 1080p (Full HD)          ▼]           │
│                                         │
│ Quality: [Low] [■ Medium] [High]        │
│                                         │
│ [  Compress Video  ]                    │
└─────────────────────────────────────────┘
```

## FFmpeg Commands Reference

### Target Size (Two-Pass)
Pass 1:
```bash
ffmpeg -y -i input.mp4 -c:v libx264 -b:v 2000k -pass 1 -an -f null /dev/null
```

Pass 2:
```bash
ffmpeg -i input.mp4 -c:v libx264 -b:v 2000k -pass 2 -c:a aac -b:a 128k output.mp4
```

### Quality (CRF)
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac -b:a 128k output.mp4
```

### Resolution + Quality
```bash
ffmpeg -i input.mp4 -vf "scale=-2:720" -c:v libx264 -crf 23 -c:a aac -b:a 128k output.mp4
```

## Deliverables
After this phase:
1. Target Size mode compresses to specified size (±10% accuracy)
2. Quality mode offers three presets
3. Resolution mode downscales video
4. Estimate feature gives preview of output size
5. Large files can be processed via local path
6. Progress is shown during compression

This is the most complex feature. Take care with the FFmpeg commands and error handling.
```

---

## Verification Steps

After Claude completes this phase:

1. Test Target Size Mode:
   - [ ] 1GB video compressed to 500MB target
   - [ ] Result is close to target size (±10%)
   - [ ] Two-pass encoding runs correctly

2. Test Quality Mode:
   - [ ] Low preset creates smaller file
   - [ ] High preset creates larger file
   - [ ] Medium is in between

3. Test Resolution Mode:
   - [ ] 1080p downscales correctly
   - [ ] Aspect ratio is preserved
   - [ ] Quality preset is applied

4. Test Estimate:
   - [ ] Shows reasonable estimate
   - [ ] Doesn't actually compress

Once verified, proceed to `07-ai-image-editor.md`.
