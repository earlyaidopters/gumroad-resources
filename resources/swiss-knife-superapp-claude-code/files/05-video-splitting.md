# Phase 5: Video Splitting

Copy and paste this prompt into Claude Code to implement video splitting:

---

## PROMPT

```
Let's implement Phase 5: Video Splitting for Media Toolkit.

## Feature Requirements

### Functionality
1. Two input methods:
   - Upload a video file (for smaller files)
   - Enter a local file path (for large files to avoid upload)
2. Enter number of parts to split into (2-20)
3. Show preview of split times before processing
4. Split the video into equal parts
5. Download individual parts or all as ZIP

### Technical Details
- Use FFmpeg stream copy (-c copy) for fast splitting without re-encoding
- Fall back to re-encoding (libx264/aac) if stream copy fails
- Calculate split points using video duration
- Save directly to output directory (no memory buffering for large files)
- Use ffprobe to get video duration accurately
- Set generous timeout (10 minutes per part)

### Split Logic
For a video of duration D split into N parts:
- Part 1: 0 to D/N
- Part 2: D/N to 2*D/N
- ...
- Part N: (N-1)*D/N to D

## Files to Create/Modify

### 1. Create app/services/video_service.py
Functions needed:
- `get_video_duration(video_path)` - returns duration in seconds
- `get_video_info(video_path)` - returns detailed video metadata
- `split_video(video_path, num_parts, output_dir)` - returns list of output paths
- `calculate_split_times(duration, num_parts)` - returns list of (start, end) tuples
- Stream copy first, fallback to re-encode on failure
- Progress callback support (optional)

### 2. Create app/routers/video.py
Endpoints:
- `POST /api/video/split` - Split uploaded video
  - Form data: file, parts
  - Returns: ZIP file with all parts
- `POST /api/video/split-local` - Split video from local path
  - JSON body: path, parts, output_dir (optional)
  - Returns: JSON with output file paths
- `POST /api/video/info-local` - Get video info from local path
  - JSON body: path
  - Returns: JSON with video info

### 3. Update app/main.py
- Import and include the video router

### 4. Create static/js/video.js
- Tab navigation: [Upload] [Local Path]
- Upload mode:
  - Drag-and-drop video file
  - Show video info
- Local path mode:
  - Text input for file path
  - "Load Info" button to verify file
  - Show video info when loaded
- Parts selector (number input, 2-20)
- Preview section showing split times
- Split button with progress
- Results with download links

### 5. Update templates/index.html
Add the Video Splitting panel with:
- Tab bar for input method
- Upload drop zone
- Local path input with Load button
- Video info display
- Parts input (number, min 2, max 20)
- Split preview table
- Split button
- Results section

### 6. Update static/css/styles.css
Add styles for:
- Split preview table
- Progress during split
- Part cards with download buttons
- Local path input styling

## UI Design

```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ VIDEO SPLITTING                         │
│ Split videos into equal parts           │
│                                         │
│ [■ Upload] [ Local Path ]               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   🎬 Drop a video file here        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ── OR Local Path ──                     │
│ [/path/to/video.mp4              ] [Load]│
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📹 my_video.mp4                    │ │
│ │ Duration: 10:30                     │ │
│ │ Size: 1.2 GB                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Number of Parts: [ 5 ]  (2-20)          │
│                                         │
│ Split Preview:                          │
│ ┌─────────────────────────────────────┐ │
│ │ Part 1: 0:00 - 2:06                │ │
│ │ Part 2: 2:06 - 4:12                │ │
│ │ Part 3: 4:12 - 6:18                │ │
│ │ Part 4: 6:18 - 8:24                │ │
│ │ Part 5: 8:24 - 10:30               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [  Split Video  ]                       │
│                                         │
│ Results:                                │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Part 1 - my_video_part1.mp4      │ │
│ │ ✓ Part 2 - my_video_part2.mp4      │ │
│ │ ✓ Part 3 - my_video_part3.mp4      │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│ [  Download All as ZIP  ]               │
└─────────────────────────────────────────┘
```

## FFmpeg Commands Reference

Get duration:
```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.mp4
```

Split with stream copy (fast):
```bash
ffmpeg -i input.mp4 -ss 0 -t 126 -c copy output_part1.mp4
ffmpeg -i input.mp4 -ss 126 -t 126 -c copy output_part2.mp4
```

Split with re-encoding (fallback):
```bash
ffmpeg -i input.mp4 -ss 0 -t 126 -c:v libx264 -c:a aac output_part1.mp4
```

## Deliverables
After this phase:
1. I can upload a video and split it into N parts
2. I can provide a local file path and split it
3. I can see preview of split times before processing
4. Each part is downloadable individually
5. All parts can be downloaded as ZIP
6. Large files don't cause memory issues

Implement this feature now. Focus on performance for large video files.
```

---

## Verification Steps

After Claude completes this phase:

1. Test Upload Mode:
   - [ ] Upload small video
   - [ ] See video info displayed
   - [ ] Enter number of parts
   - [ ] See split preview
   - [ ] Split and download

2. Test Local Path Mode:
   - [ ] Enter local file path
   - [ ] Load button fetches info
   - [ ] Split works without uploading
   - [ ] Large files work efficiently

3. Edge Cases:
   - [ ] Invalid path shows error
   - [ ] Parts = 1 shows error or is prevented
   - [ ] Very short video still works

Once verified, proceed to `06-video-compression.md`.
