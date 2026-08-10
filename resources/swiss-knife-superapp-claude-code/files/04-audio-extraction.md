# Phase 4: Audio Extraction

Copy and paste this prompt into Claude Code to implement audio extraction:

---

## PROMPT

```
Let's implement Phase 4: Audio Extraction for Media Toolkit.

## Feature Requirements

### Supported Formats
- **Input Videos**: MP4, MKV, AVI, MOV, WEBM, FLV, WMV, M4V, MPEG, MPG, 3GP
- **Output Audio**: MP3, AAC, WAV, FLAC, OGG

### Bitrate Options (for lossy formats)
- 64 kbps (low)
- 128 kbps (standard)
- 192 kbps (good)
- 256 kbps (high)
- 320 kbps (maximum)

### Functionality
1. Upload a video file via drag-and-drop or click
2. Show video info preview (filename, duration, size, video codec)
3. Select output audio format
4. Select bitrate (for MP3, AAC, OGG)
5. Extract button
6. Download extracted audio

### Technical Details
- Use FFmpeg via subprocess for extraction
- Use ffprobe to get video metadata
- Use stream copy when possible for speed
- Set appropriate timeout (5 minutes per extraction)
- Clean up temp files after processing

## Files to Create/Modify

### 1. Create app/services/audio_service.py
Functions needed:
- `get_video_info(video_path)` - returns dict with duration, size, codecs
- `extract_audio(video_path, output_format, bitrate)` - returns audio path
- `get_supported_formats()` - returns video inputs and audio outputs
- Use subprocess to call ffmpeg and ffprobe
- Handle errors gracefully (FFmpeg not found, invalid video, etc.)

### 2. Create app/routers/audio.py
Endpoints:
- `POST /api/audio/extract` - Extract audio from video
  - Form data: file, format, bitrate
  - Returns: FileResponse with audio file
- `GET /api/audio/formats` - Get supported formats and bitrates

### 3. Update app/main.py
- Import and include the audio router

### 4. Create static/js/audio.js
- File upload with video info preview
- Format selector (button group)
- Bitrate selector (show only for lossy formats)
- Extract button with loading state
- Download result
- Error handling display

### 5. Update templates/index.html
Add the Audio Extraction panel with:
- Drop zone for video files
- Video info preview section
- Format selector buttons
- Bitrate selector (conditional)
- Extract button
- Result/download section

### 6. Update static/css/styles.css
Add styles for:
- Video info card
- Format and bitrate button groups
- Loading spinner during extraction
- Success/error result states

## UI Design

```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ AUDIO EXTRACTION                        │
│ Extract audio tracks from video files   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │   🎬 Drop a video file here        │ │
│ │   MP4, MKV, AVI, MOV, WEBM...      │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📹 vacation_video.mp4              │ │
│ │ Duration: 5:32                      │ │
│ │ Size: 245.8 MB                      │ │
│ │ Codec: H.264                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Output Format:                          │
│ [MP3] [AAC] [WAV] [FLAC] [OGG]         │
│                                         │
│ Bitrate:                                │
│ [64] [128] [192] [256] [320] kbps      │
│                                         │
│ [  Extract Audio  ]                     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Audio extracted successfully!    │ │
│ │ vacation_video.mp3 (8.2 MB)        │ │
│ │ [  Download  ]                      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## FFmpeg Commands Reference

Get video info:
```bash
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4
```

Extract to MP3:
```bash
ffmpeg -i input.mp4 -vn -acodec libmp3lame -ab 192k output.mp3
```

Extract to AAC:
```bash
ffmpeg -i input.mp4 -vn -acodec aac -ab 192k output.aac
```

Extract to WAV (lossless):
```bash
ffmpeg -i input.mp4 -vn -acodec pcm_s16le output.wav
```

Extract to FLAC (lossless):
```bash
ffmpeg -i input.mp4 -vn -acodec flac output.flac
```

## Deliverables
After this phase:
1. I can upload a video file
2. See video info (duration, size, codec)
3. Select audio format and bitrate
4. Extract and download the audio track
5. Errors are handled gracefully (missing FFmpeg, corrupt video)

Implement this feature now. Ensure FFmpeg commands run correctly via subprocess.
```

---

## Verification Steps

After Claude completes this phase:

1. Ensure FFmpeg is installed: `ffmpeg -version`
2. Test with different video formats:
   - [ ] MP4 video extracts audio
   - [ ] Duration is displayed correctly
   - [ ] MP3 at 320kbps works
   - [ ] WAV extraction works (no bitrate)
   - [ ] FLAC extraction works (no bitrate)
   - [ ] Invalid file shows error

Once verified, proceed to `05-video-splitting.md`.
