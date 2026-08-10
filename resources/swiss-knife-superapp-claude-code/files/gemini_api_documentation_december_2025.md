# Google Gemini API Documentation: Video Understanding, Image Generation & Real-time Voice
## Complete Developer Reference - December 2025

---

## Table of Contents

1. [Installation & Authentication](#installation--authentication)
2. [Model Overview & Quick Reference](#model-overview--quick-reference)
3. [Video Understanding](#video-understanding)
4. [Image Generation](#image-generation)
5. [Real-time Voice Conversation (Live API)](#real-time-voice-conversation-live-api)
6. [Rate Limits & Pricing](#rate-limits--pricing)
7. [Official Documentation Links](#official-documentation-links)

---

## Installation & Authentication

All capabilities use the unified `google-genai` Python SDK.

### Installation

```bash
pip install -U google-genai pillow pyaudio
```

### Authentication Methods

```python
from google import genai
from google.genai import types

# Option 1: Environment variable (recommended)
# Set GEMINI_API_KEY in your environment
client = genai.Client()

# Option 2: Direct API key
client = genai.Client(api_key="YOUR_API_KEY")

# Option 3: Vertex AI (enterprise)
client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1'
)
```

Get your API key from [Google AI Studio](https://aistudio.google.com).

---

## Model Overview & Quick Reference

### Latest Models by Capability (December 2025)

| Capability | Recommended Model | Model String |
|-----------|------------------|--------------|
| **Video Understanding** | Gemini 3 Pro | `gemini-3-pro-preview` |
| **Video Understanding** | Gemini 2.5 Flash | `gemini-2.5-flash` |
| **Image Generation (Native)** | Gemini 3 Pro Image | `gemini-3-pro-image-preview` |
| **Image Generation (Native)** | Gemini 2.5 Flash Image | `gemini-2.5-flash-image` |
| **Image Generation (Imagen)** | Imagen 4 | `imagen-4.0-generate-001` |
| **Real-time Voice** | Native Audio | `gemini-2.5-flash-native-audio-preview-09-2025` |

### Gemini 3 Pro - Flagship Model

Gemini 3 Pro is Google's most intelligent model, released November 2025:
- **Model String**: `gemini-3-pro-preview`
- **Context Window**: 1 million tokens input, 64k tokens output
- **Knowledge Cutoff**: January 2025
- **Pricing**: $2/million input tokens, $12/million output tokens (≤200k tokens)
- **Key Features**: State-of-the-art reasoning, agentic workflows, autonomous coding, multimodal understanding

### Gemini 3 New Features

1. **Thinking Level Parameter**: Controls reasoning depth (`low` or `high`)
2. **Media Resolution Parameter**: Granular control over vision processing (`low`, `medium`, `high`, `ultra_high`)
3. **Thought Signatures**: Encrypted representations for maintaining reasoning across API calls

---

## Video Understanding

### Supported Models

| Model String | Context Window | Best Use Case |
|-------------|----------------|---------------|
| `gemini-3-pro-preview` | 1,048,576 tokens | Complex multimodal reasoning, highest quality |
| `gemini-2.5-pro` | 1,048,576 tokens | State-of-the-art thinking over video |
| `gemini-2.5-flash` | 1,048,576 tokens | **Production recommended** - balance of speed/quality |
| `gemini-2.5-flash-lite` | 1,048,576 tokens | Cost-efficient high-volume processing |
| `gemini-2.0-flash` | 1,048,576 tokens | General video understanding |

### Video Specifications & Limits

| Specification | Value |
|--------------|-------|
| Maximum file size | 2 GB per file (via File API) |
| Maximum duration | ~2 hours (2M context), ~1 hour (1M context) |
| Inline data limit | 20 MB total request size |
| File retention | 48 hours (auto-deleted) |
| Token consumption | ~300 tokens/second (1 FPS + 32 tokens/sec audio) |

### Supported Video Formats

MP4, MPEG, MOV, AVI, FLV, WebM, WMV, 3GPP

### Method 1: File API Upload (Recommended for files >20MB)

```python
from google import genai
import time

client = genai.Client()

# Upload video file
video_file = client.files.upload(file="path/to/video.mp4")

# Wait for processing (required for longer videos)
while video_file.state and video_file.state.name == "PROCESSING":
    print("Processing video...")
    time.sleep(5)
    video_file = client.files.get(name=video_file.name)

if video_file.state.name == "FAILED":
    raise ValueError(f"Video processing failed: {video_file.state.name}")

# Analyze video content with Gemini 3 Pro
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=[
        video_file,
        "Describe the key events in this video with timestamps. Include both audio and visual details."
    ]
)

print(response.text)

# Clean up (optional - files auto-delete after 48 hours)
client.files.delete(name=video_file.name)
```

### Method 2: Inline Data (for files <20MB)

```python
from google import genai
from google.genai import types

video_bytes = open("short_video.mp4", 'rb').read()

client = genai.Client()
response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=types.Content(
        parts=[
            types.Part(
                inline_data=types.Blob(data=video_bytes, mime_type='video/mp4')
            ),
            types.Part(text='Summarize this video in 3 sentences.')
        ]
    )
)
print(response.text)
```

### Method 3: YouTube URL Analysis (Preview Feature)

```python
from google import genai
from google.genai import types

client = genai.Client()
response = client.models.generate_content(
    model='gemini-3-pro-preview',
    contents=types.Content(
        parts=[
            types.Part(
                file_data=types.FileData(
                    file_uri='https://www.youtube.com/watch?v=VIDEO_ID'
                )
            ),
            types.Part(text='What are the main topics discussed in this video?')
        ]
    )
)
print(response.text)
```

### Video Transcription with Timestamps

```python
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=[
        video_file,
        "Transcribe all spoken dialogue with timestamps in MM:SS format."
    ]
)
```

### Timestamp-Based Queries

```python
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=[
        video_file,
        "What is happening at 02:30 and how does it relate to the scene at 05:45?"
    ]
)
```

### Custom Frame Rate (for Fast-Action Video)

```python
from google import genai
from google.genai import types

video_bytes = open("action_video.mp4", 'rb').read()

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=types.Content(
        parts=[
            types.Part(
                inline_data=types.Blob(data=video_bytes, mime_type='video/mp4'),
                video_metadata=types.VideoMetadata(fps=5)  # 5 FPS instead of default 1
            ),
            types.Part(text='Describe the action sequence in detail.')
        ]
    )
)
```

### Video Segment Analysis (Clipping)

```python
response = client.models.generate_content(
    model='gemini-3-pro-preview',
    contents=types.Content(
        parts=[
            types.Part(
                file_data=types.FileData(file_uri='https://www.youtube.com/watch?v=VIDEO_ID'),
                video_metadata=types.VideoMetadata(
                    start_offset='1250s',  # Start at 20:50
                    end_offset='1570s'     # End at 26:10
                )
            ),
            types.Part(text='Summarize this section of the video.')
        ]
    )
)
```

### Gemini 3 Media Resolution Control

```python
from google import genai
from google.genai import types

# Per-part media resolution (Gemini 3 feature)
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=types.Content(
        parts=[
            types.Part(
                inline_data=types.Blob(data=video_bytes, mime_type='video/mp4'),
                media_resolution="media_resolution_high"  # low, medium, high, ultra_high
            ),
            types.Part(text='Identify all text visible in the video frames.')
        ]
    )
)
```

### Video Capabilities Summary

- Scene detection and description
- Object recognition and tracking
- Speech transcription with timestamps
- Visual question answering
- Timestamp-based queries (MM:SS format)
- Content summarization
- Multi-modal analysis (audio + video combined)

---

## Image Generation

### Available Models

#### Gemini Native Image Generation (generateContent API)

| Model String | Description | Max Resolution |
|-------------|-------------|----------------|
| `gemini-3-pro-image-preview` | **Advanced** - 4K output, Google Search grounding | Up to 4K (4096×4096) |
| `gemini-2.5-flash-image` | **Fast** - Cost-effective production use | 1K (1024×1024) |

#### Imagen Models (generateImages API)

| Model String | Description | Status |
|-------------|-------------|--------|
| `imagen-4.0-generate-001` | Latest generation, improved text rendering | GA |
| `imagen-4.0-ultra-generate-001` | Higher quality variant | GA |
| `imagen-4.0-fast-generate-001` | Lower latency variant | GA |
| `imagen-3.0-generate-002` | Previous generation | GA |
| `imagen-3.0-capability-001` | Image editing with masks | GA |

### Gemini 3 Pro Image (Nano Banana Pro)

Gemini 3 Pro Image is Google's most advanced image generation model (codename "Nano Banana Pro"):

**Key Features:**
- **4K Resolution**: Built-in 1K, 2K, and 4K output
- **Advanced Text Rendering**: Legible, stylized text for infographics, menus, diagrams
- **Google Search Grounding**: Generate imagery based on real-time data
- **Thinking Mode**: Multi-stage refinement for complex compositions
- **Multi-Image Input**: Up to 14 reference images for composition
- **Character Consistency**: Preserve identity across up to 5 people

### Basic Text-to-Image Generation

#### Gemini 2.5 Flash Image (Fast, Cost-Effective)

```python
from google import genai
from google.genai import types

client = genai.Client()

prompt = "A serene Japanese garden with cherry blossoms, koi pond, and traditional wooden bridge at sunset"

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=[prompt],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```

#### Gemini 3 Pro Image (Advanced, 4K)

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="Da Vinci style anatomical sketch of a butterfly",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",  # 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
            image_size="2K"       # 1K, 2K, 4K
        ),
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("high_res_image.png")
```

### Image Editing with Gemini

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

# Load existing image
source_image = Image.open('photo.png')

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=["Add a rainbow in the sky of this image", source_image],
)

for part in response.parts:
    if part.inline_data is not None:
        edited_image = part.as_image()
        edited_image.save("edited_image.png")
```

### Multi-Turn Conversational Image Editing with Gemini 3

```python
from google import genai
from google.genai import types

client = genai.Client()

chat = client.chats.create(
    model="gemini-3-pro-image-preview",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]  # Enable Google Search grounding
    )
)

# First turn: Generate initial image
response = chat.send_message("Create a vibrant infographic about photosynthesis")

for part in response.parts:
    if image := part.as_image():
        image.save("infographic_v1.png")

# Second turn: Edit the generated image
response2 = chat.send_message(
    "Update this infographic to be in Spanish",
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(aspect_ratio="16:9", image_size="2K")
    )
)

for part in response2.parts:
    if image := part.as_image():
        image.save("infographic_spanish.png")
```

### Thought Signatures for Gemini 3 (Required for Multi-Turn)

When using Gemini 3 Pro Image, you must pass thought signatures back for multi-turn conversations:

```python
# The Python SDK handles this automatically when using chat sessions
# For manual API calls, preserve the thoughtSignature from model responses

# Example response structure:
# {
#   "parts": [
#     {"text": "...", "thoughtSignature": "encrypted_signature_here"},
#     {"inlineData": {"mimeType": "image/png", "data": "..."}}
#   ]
# }

# Pass thoughtSignature back in subsequent requests to maintain reasoning context
```

### Imagen 4 Text-to-Image Generation

```python
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

client = genai.Client()

response = client.models.generate_images(
    model='imagen-4.0-generate-001',
    prompt='Robot holding a red skateboard in a futuristic city',
    config=types.GenerateImagesConfig(
        number_of_images=4,           # Generate 1-4 images
        aspect_ratio="16:9",          # 1:1, 3:4, 4:3, 9:16, 16:9
        person_generation="allow_adult",  # dont_allow, allow_adult, allow_all
    )
)

for idx, generated_image in enumerate(response.generated_images):
    image = Image.open(BytesIO(generated_image.image.image_bytes))
    image.save(f"imagen_output_{idx}.png")
```

### Imagen 4 Model Variants

```python
# Standard - Balanced quality and speed
model='imagen-4.0-generate-001'

# Ultra - Highest quality
model='imagen-4.0-ultra-generate-001'

# Fast - Lower latency
model='imagen-4.0-fast-generate-001'
```

### Imagen Image Editing with Masks

```python
from google import genai
from google.genai import types
from google.genai.types import RawReferenceImage, MaskReferenceImage

client = genai.Client()

# First generate an image
response1 = client.models.generate_images(
    model='imagen-4.0-generate-001',
    prompt='An umbrella in the foreground, rainy sky background',
    config=types.GenerateImagesConfig(number_of_images=1)
)

# Create reference from generated image
raw_ref_image = RawReferenceImage(
    reference_id=1,
    reference_image=response1.generated_images[0].image,
)

# Create mask for background replacement
mask_ref_image = MaskReferenceImage(
    reference_id=2,
    config=types.MaskReferenceConfig(
        mask_mode='MASK_MODE_BACKGROUND',
        mask_dilation=0,
    ),
)

# Edit the image - replace background
response2 = client.models.edit_image(
    model='imagen-3.0-capability-001',
    prompt='Sunlight and clear blue sky',
    reference_images=[raw_ref_image, mask_ref_image],
    config=types.EditImageConfig(
        edit_mode='EDIT_MODE_INPAINT_INSERTION',
        number_of_images=1,
        include_rai_reason=True,
        output_mime_type='image/jpeg',
    ),
)

response2.generated_images[0].image.show()
```

### Image Generation Parameters Reference

#### Gemini Native Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `response_modalities` | `['TEXT', 'IMAGE']` | Enable image output |
| `aspect_ratio` | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` | Output aspect ratio |
| `image_size` | `1K`, `2K`, `4K` | Output resolution (4K only for Gemini 3 Pro) |

#### Imagen Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `number_of_images` | 1-4 | Images per request |
| `aspect_ratio` | `1:1`, `3:4`, `4:3`, `9:16`, `16:9` | Output aspect ratio |
| `person_generation` | `dont_allow`, `allow_adult`, `allow_all` | Human generation control |
| `safety_filter_level` | `block_low_and_above`, `block_medium_and_above`, `block_only_high` | Content filtering |

### Safety and Content Policies

- **SynthID Watermarks**: All generated images include invisible digital watermarks (cannot be disabled)
- **Person Generation**: `allow_all` not permitted in EU, UK, CH, and MENA regions
- **Content Filtering**: Use `include_rai_reason=True` to get safety filter reasoning
- **Celebrity Generation**: Not allowed for any setting

### Language Support

**Gemini 2.5 Flash Image**: EN, es-MX, ja-JP, zh-CN, hi-IN

**Gemini 3 Pro Image**: ar-EG, de-DE, EN, es-MX, fr-FR, hi-IN, id-ID, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, ua-UA, vi-VN, zh-CN

---

## Real-time Voice Conversation (Live API)

The Gemini Live API enables low-latency, bidirectional voice conversations using WebSocket streaming with sub-second response times.

### Live API Models

| Model String | Description | Status |
|-------------|-------------|--------|
| `gemini-2.5-flash-native-audio-preview-09-2025` | **Recommended** - Native audio with thinking | Preview |
| `gemini-2.0-flash-live-001` | Legacy | **Deprecated Dec 9, 2025** |
| `gemini-live-2.5-flash-preview` | Legacy | **Deprecated Dec 9, 2025** |

### Audio Specifications

| Direction | Format | Sample Rate | Bit Depth | Channels | MIME Type |
|-----------|--------|-------------|-----------|----------|-----------|
| **Input** | Raw PCM, little-endian | 16,000 Hz | 16-bit | Mono | `audio/pcm;rate=16000` |
| **Output** | Raw PCM, little-endian | 24,000 Hz | 16-bit | Mono | `audio/pcm;rate=24000` |

### WebSocket Connection Details

**Endpoint:**
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
```

**Authentication:**
1. API Key: `?key={API_KEY}`
2. Ephemeral Tokens (recommended for client apps): `?access_token={TOKEN}`

### Complete Real-time Audio Implementation

```python
import asyncio
from google import genai
import pyaudio

client = genai.Client()

# Audio configuration
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

pya = pyaudio.PyAudio()

# Live API configuration
MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"
CONFIG = {
    "response_modalities": ["AUDIO"],
    "system_instruction": "You are a helpful and friendly AI assistant.",
}

audio_queue_output = asyncio.Queue()
audio_queue_mic = asyncio.Queue(maxsize=5)
audio_stream = None


async def listen_audio():
    """Capture microphone input and queue for sending."""
    global audio_stream
    mic_info = pya.get_default_input_device_info()
    audio_stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=SEND_SAMPLE_RATE,
        input=True,
        input_device_index=mic_info["index"],
        frames_per_buffer=CHUNK_SIZE,
    )
    kwargs = {"exception_on_overflow": False} if __debug__ else {}
    while True:
        data = await asyncio.to_thread(audio_stream.read, CHUNK_SIZE, **kwargs)
        await audio_queue_mic.put({"data": data, "mime_type": "audio/pcm"})


async def send_realtime(session):
    """Send queued audio to Gemini."""
    while True:
        msg = await audio_queue_mic.get()
        await session.send_realtime_input(audio=msg)


async def receive_audio(session):
    """Receive Gemini responses and queue for playback."""
    while True:
        turn = session.receive()
        async for response in turn:
            if response.server_content and response.server_content.model_turn:
                for part in response.server_content.model_turn.parts:
                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                        audio_queue_output.put_nowait(part.inline_data.data)

            # Handle interruptions - clear queue to stop playback
            if response.server_content and response.server_content.interrupted:
                while not audio_queue_output.empty():
                    audio_queue_output.get_nowait()


async def play_audio():
    """Play audio from output queue through speakers."""
    stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
    )
    while True:
        bytestream = await audio_queue_output.get()
        await asyncio.to_thread(stream.write, bytestream)


async def run():
    """Main function to run the real-time audio loop."""
    try:
        async with client.aio.live.connect(
            model=MODEL, config=CONFIG
        ) as live_session:
            print("Connected to Gemini. Start speaking!")
            async with asyncio.TaskGroup() as tg:
                tg.create_task(send_realtime(live_session))
                tg.create_task(listen_audio())
                tg.create_task(receive_audio(live_session))
                tg.create_task(play_audio())
    except asyncio.CancelledError:
        pass
    finally:
        if audio_stream:
            audio_stream.close()
        pya.terminate()
        print("\nConnection closed.")


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("Interrupted by user.")
```

### Basic Session Connection

```python
import asyncio
from google import genai

client = genai.Client()

model = "gemini-2.5-flash-native-audio-preview-09-2025"
config = {"response_modalities": ["AUDIO"]}

async def main():
    async with client.aio.live.connect(model=model, config=config) as session:
        print("Session connected!")
        
        # Send text and receive audio response
        await session.send_client_content(
            turns="Hello, how are you today?", 
            turn_complete=True
        )
        
        async for response in session.receive():
            if response.server_content and response.server_content.model_turn:
                for part in response.server_content.model_turn.parts:
                    if part.inline_data:
                        # Process audio bytes
                        audio_data = part.inline_data.data

if __name__ == "__main__":
    asyncio.run(main())
```

### Audio Transcription (Input and Output)

```python
from google.genai import types

config = {
    "response_modalities": ["AUDIO"],
    "output_audio_transcription": {},  # Transcribe model's speech
    "input_audio_transcription": {},   # Transcribe user's speech
}

async with client.aio.live.connect(model=model, config=config) as session:
    async for response in session.receive():
        if response.server_content:
            if response.server_content.output_transcription:
                print("Model said:", response.server_content.output_transcription.text)
            if response.server_content.input_transcription:
                print("User said:", response.server_content.input_transcription.text)
```

### Function Calling in Real-time

```python
from google.genai import types

# Define available functions
turn_on_lights = {"name": "turn_on_lights", "description": "Turns on the room lights"}
turn_off_lights = {"name": "turn_off_lights", "description": "Turns off the room lights"}

tools = [{"function_declarations": [turn_on_lights, turn_off_lights]}]
config = {"response_modalities": ["AUDIO"], "tools": tools}

async with client.aio.live.connect(model=model, config=config) as session:
    await session.send_client_content(
        turns={"parts": [{"text": "Turn on the lights please"}]}
    )
    
    async for response in session.receive():
        if response.tool_call:
            function_responses = []
            for fc in response.tool_call.function_calls:
                # Execute the function and create response
                result = execute_function(fc.name, fc.args)
                function_responses.append(types.FunctionResponse(
                    id=fc.id,
                    name=fc.name,
                    response={"result": result}
                ))
            
            await session.send_tool_response(function_responses=function_responses)
```

### Voice Configuration

```python
config = {
    "response_modalities": ["AUDIO"],
    "speech_config": {
        "voice_config": {
            "prebuilt_voice_config": {"voice_name": "Kore"}
        }
    },
}
```

**Available Voices:** Aoede, Charon, Fenrir, Kore, Puck (30+ HD voices available)

### Thinking Mode Configuration

```python
from google.genai import types

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    thinking_config=types.ThinkingConfig(
        thinking_budget=1024,      # Token budget for reasoning (0 to disable)
        include_thoughts=True      # Include thought summaries in response
    )
)
```

### Session Resumption for Long Conversations

```python
from google.genai import types

# First session - store the handle
config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    session_resumption=types.SessionResumptionConfig(handle=None),  # New session
)

stored_handle = None

async with client.aio.live.connect(model=model, config=config) as session:
    async for message in session.receive():
        if message.session_resumption_update:
            if message.session_resumption_update.resumable:
                stored_handle = message.session_resumption_update.new_handle

# Later - resume with stored handle
resume_config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    session_resumption=types.SessionResumptionConfig(handle=stored_handle),
)
```

### Context Window Compression for Extended Sessions

```python
from google.genai import types

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    context_window_compression=types.ContextWindowCompressionConfig(
        sliding_window=types.SlidingWindow(),
    ),
)
```

### Voice Activity Detection (VAD) Configuration

```python
from google.genai import types

config = {
    "response_modalities": ["AUDIO"],
    "realtime_input_config": {
        "automatic_activity_detection": {
            "disabled": False,  # Set True for manual VAD control
            "start_of_speech_sensitivity": types.StartSensitivity.START_SENSITIVITY_LOW,
            "end_of_speech_sensitivity": types.EndSensitivity.END_SENSITIVITY_LOW,
            "prefix_padding_ms": 20,
            "silence_duration_ms": 100,
        }
    }
}
```

### Affective Dialog (Emotion-Aware)

```python
config = {
    "response_modalities": ["AUDIO"],
    "enable_affective_dialog": True,  # Respond to user's emotional expression
}
```

### Proactive Audio (Selective Response)

```python
config = {
    "response_modalities": ["AUDIO"],
    "proactive_audio": {
        "enabled": True,  # Model decides when to respond based on context
    }
}
```

### Live API Session Limits

| Limit Type | Duration |
|-----------|----------|
| Audio-only session | 15 minutes (without compression) |
| Audio + video session | 2 minutes (without compression) |
| Connection lifetime | ~10 minutes |
| Session resumption token validity | 2 hours |
| Context window (native audio) | 128k tokens |

### Supported Languages for Native Audio

Auto-detected languages include: English (US), German, French, Spanish (US), Portuguese (Brazil), Japanese, Korean, Hindi, Arabic, Italian, Dutch, Polish, Russian, Thai, Turkish, Vietnamese, Indonesian (24+ languages total)

---

## Rate Limits & Pricing

### Rate Limit Tiers

| Tier | Qualification | Access |
|------|--------------|--------|
| Free | Available in eligible countries | Limited RPM/TPM/RPD |
| Tier 1 | Billing enabled | Higher limits |
| Tier 2 | >$250 cumulative spend, 30+ days | Much higher limits |
| Tier 3 | >$1,000 cumulative spend, 30+ days | Highest limits |

### Pricing Summary (December 2025)

#### Text/Video Models (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| Gemini 3 Pro Preview | $2.00 | $12.00 |
| Gemini 2.5 Pro | $1.25-2.50 | $10.00-15.00 |
| Gemini 2.5 Flash | $0.10 | $0.40 |
| Gemini 2.5 Flash Lite | $0.02 | $0.10 |

#### Image Generation

| Model | Price |
|-------|-------|
| Gemini 2.5 Flash Image | ~$0.039/image (1290 tokens) |
| Gemini 3 Pro Image (1K/2K) | ~$0.134/image (1120 tokens) |
| Gemini 3 Pro Image (4K) | ~$0.24/image (2000 tokens) |
| Imagen 4 | $0.03-0.04/image |

#### Live API

| Model | Input | Output |
|-------|-------|--------|
| Native Audio | Text: $0.35, Audio/Video: $2.10 | Text: $1.50, Audio: $8.50 |

### Free Tier Limits (Google AI Studio)

- ~1,500 images/day for image generation
- Limited RPM for text models
- Interactive use in AI Studio

---

## Official Documentation Links

### Core Documentation
- **Models Reference**: https://ai.google.dev/gemini-api/docs/models
- **Quickstart**: https://ai.google.dev/gemini-api/docs/quickstart
- **Pricing**: https://ai.google.dev/gemini-api/docs/pricing
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Release Notes**: https://ai.google.dev/gemini-api/docs/changelog

### Gemini 3 Pro
- **Developer Guide**: https://ai.google.dev/gemini-api/docs/gemini-3
- **Model Card**: https://deepmind.google/models/gemini/pro/

### Video Understanding
- **Video Guide**: https://ai.google.dev/gemini-api/docs/video-understanding
- **Files API**: https://ai.google.dev/gemini-api/docs/files

### Image Generation
- **Gemini Image Generation**: https://ai.google.dev/gemini-api/docs/image-generation
- **Imagen Guide**: https://ai.google.dev/gemini-api/docs/imagen
- **Vertex AI Image Generation**: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation

### Live API (Real-time Voice)
- **Get Started**: https://ai.google.dev/gemini-api/docs/live
- **Capabilities Guide**: https://ai.google.dev/gemini-api/docs/live-guide
- **WebSocket Reference**: https://ai.google.dev/api/live
- **Session Management**: https://ai.google.dev/gemini-api/docs/live-session
- **Vertex AI Live API**: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api

### SDKs and Tools
- **Python SDK**: https://github.com/googleapis/python-genai
- **Gemini Cookbook**: https://github.com/google-gemini/cookbook
- **Google AI Studio**: https://aistudio.google.com

---

## Summary & Recommendations

### For Video Understanding
- **Production**: Use `gemini-2.5-flash` for best balance of speed and quality
- **Highest Quality**: Use `gemini-3-pro-preview` for complex multimodal reasoning
- **Cost-Sensitive**: Use `gemini-2.5-flash-lite` for high-volume processing
- **Tip**: Increase FPS for action content, decrease for static lectures

### For Image Generation
- **Fast & Cost-Effective**: Use `gemini-2.5-flash-image` (~$0.039/image)
- **Professional/4K**: Use `gemini-3-pro-image-preview` with Google Search grounding
- **Standalone Generation**: Use `imagen-4.0-generate-001` for dedicated image generation
- **Tip**: Enable `tools=[{"google_search": {}}]` for data-driven visualizations

### For Real-time Voice
- **Current Model**: Use `gemini-2.5-flash-native-audio-preview-09-2025`
- **Long Sessions**: Enable context window compression for conversations >15 minutes
- **Client Apps**: Use ephemeral tokens instead of API keys
- **Tip**: Enable affective dialog for emotion-aware responses

---

*Last Updated: December 10, 2025*
*Document Version: 1.0*
