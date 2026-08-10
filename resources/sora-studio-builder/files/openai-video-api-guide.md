# OpenAI Video API (Sora) - Developer Guide

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Endpoints](#endpoints)
- [Object Schemas](#object-schemas)
- [Code Examples](#code-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The OpenAI Video API allows you to generate, remix, and manage AI-generated videos using the Sora model family. The API supports text-to-video generation, video remixing, and complete video lifecycle management.

**Key Features:**
- Text-to-video generation
- Image/video-guided generation
- Video remixing and extending
- Customizable duration and resolution
- Asynchronous job processing

---

## Authentication

All API requests require authentication using your OpenAI API key.

```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key-here")
# Or set OPENAI_API_KEY environment variable
```

---

## Base URL

```
https://api.openai.com/v1
```

---

## Endpoints

### 1. Create Video

**Endpoint:** `POST /videos`

Generate a new video from a text prompt.

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | ✅ Yes | - | Text description of the video to generate |
| `input_reference` | file | ❌ No | - | Optional image or video reference for guided generation |
| `model` | string | ❌ No | `sora-2` | Video generation model to use |
| `seconds` | string | ❌ No | `"4"` | Clip duration in seconds |
| `size` | string | ❌ No | `"720x1280"` | Output resolution (width x height) |

#### Supported Resolutions
- `720x1280` (Portrait - default)
- `1024x1808` (Tall portrait)
- `1280x720` (Landscape)
- `1808x1024` (Wide landscape)

#### Example Request

```python
from openai import OpenAI

client = OpenAI()

video = client.videos.create(
    prompt="A calico cat playing a piano on stage",
    model="sora-2",
    seconds="8",
    size="1024x1808"
)

print(f"Video ID: {video.id}")
print(f"Status: {video.status}")
```

#### Response

```json
{
  "id": "video_123",
  "object": "video",
  "model": "sora-2",
  "status": "queued",
  "progress": 0,
  "created_at": 1712697600,
  "size": "1024x1808",
  "seconds": "8",
  "quality": "standard"
}
```

---

### 2. Remix Video

**Endpoint:** `POST /videos/{video_id}/remix`

Create a remix of an existing completed video using a new prompt.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video_id` | string | ✅ Yes | The ID of the completed video to remix |

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | ✅ Yes | Updated text prompt that directs the remix generation |

#### Example Request

```python
from openai import OpenAI

client = OpenAI()

video = client.videos.remix(
    video_id="video_123",
    prompt="Extend the scene with the cat taking a bow to the cheering audience"
)

print(f"Remixed Video ID: {video.id}")
print(f"Original Video ID: {video.remixed_from_video_id}")
```

#### Response

```json
{
  "id": "video_456",
  "object": "video",
  "model": "sora-2",
  "status": "queued",
  "progress": 0,
  "created_at": 1712698600,
  "size": "720x1280",
  "seconds": "8",
  "remixed_from_video_id": "video_123"
}
```

---

### 3. List Videos

**Endpoint:** `GET /videos`

Retrieve a paginated list of all video jobs for your organization.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `after` | string | ❌ No | - | Cursor for pagination (ID of last item from previous page) |
| `limit` | integer | ❌ No | - | Number of items to retrieve per page |
| `order` | string | ❌ No | `desc` | Sort order: `asc` (ascending) or `desc` (descending) |

#### Example Request

```python
from openai import OpenAI

client = OpenAI()

# Get first page
page = client.videos.list(limit=10, order="desc")

for video in page.data:
    print(f"ID: {video.id}, Status: {video.status}")

# Pagination
if page.data:
    last_id = page.data[-1].id
    next_page = client.videos.list(after=last_id, limit=10)
```

#### Response

```json
{
  "data": [
    {
      "id": "video_123",
      "object": "video",
      "model": "sora-2",
      "status": "completed",
      "created_at": 1712697600,
      "size": "720x1280",
      "seconds": "8"
    },
    {
      "id": "video_124",
      "object": "video",
      "model": "sora-2",
      "status": "processing",
      "progress": 45
    }
  ],
  "object": "list"
}
```

---

### 4. Retrieve Video

**Endpoint:** `GET /videos/{video_id}`

Get detailed information about a specific video job.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video_id` | string | ✅ Yes | The ID of the video to retrieve |

#### Example Request

```python
from openai import OpenAI

client = OpenAI()

video = client.videos.retrieve("video_123")

print(f"Status: {video.status}")
print(f"Progress: {video.progress}%")
print(f"Duration: {video.seconds}s")
print(f"Size: {video.size}")
```

#### Response

```json
{
  "id": "video_123",
  "object": "video",
  "model": "sora-2",
  "status": "completed",
  "progress": 100,
  "created_at": 1712697600,
  "completed_at": 1712698200,
  "expires_at": 1712784600,
  "size": "1024x1808",
  "seconds": "8",
  "quality": "standard"
}
```

---

### 5. Delete Video

**Endpoint:** `DELETE /videos/{video_id}`

Delete a video job and its associated content.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video_id` | string | ✅ Yes | The ID of the video to delete |

#### Example Request

```python
from openai import OpenAI

client = OpenAI()

deleted_video = client.videos.delete("video_123")
print(f"Deleted video: {deleted_video.id}")
```

#### Response

```json
{
  "id": "video_123",
  "object": "video",
  "deleted": true
}
```

---

### 6. Download Video Content

**Endpoint:** `GET /videos/{video_id}/content`

Download the rendered video file for a completed video job.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video_id` | string | ✅ Yes | The ID of the video whose content to download |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `variant` | string | ❌ No | `mp4` | Which downloadable asset to return |

#### Example Request

```python
from openai import OpenAI

client = OpenAI()

# Download video content
response = client.videos.download_content(video_id="video_123")
content = response.read()

# Save to file
with open("generated_video.mp4", "wb") as f:
    f.write(content)

print("Video downloaded successfully!")
```

#### Response

Binary video content (MP4 file stream)

---

## Object Schemas

### Video Job Object

The Video object contains all metadata about a video generation job.

```typescript
{
  id: string;                      // Unique identifier
  object: "video";                 // Always "video"
  model: string;                   // Model used (e.g., "sora-2")
  status: string;                  // Current status
  progress: integer;               // Completion percentage (0-100)
  created_at: integer;             // Unix timestamp
  completed_at?: integer;          // Unix timestamp when finished
  expires_at?: integer;            // Unix timestamp when assets expire
  size: string;                    // Resolution (e.g., "720x1280")
  seconds: string;                 // Duration in seconds
  quality?: string;                // Quality level
  remixed_from_video_id?: string;  // Source video ID (if remix)
  error?: {                        // Error details (if failed)
    code: string;
    message: string;
  };
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `queued` | Job is waiting to start processing |
| `processing` | Video is being generated |
| `completed` | Video generation finished successfully |
| `failed` | Video generation failed (see error field) |
| `cancelled` | Job was cancelled |

---

## Code Examples

### Complete Workflow Example

```python
from openai import OpenAI
import time

client = OpenAI()

# Step 1: Create a video
print("Creating video...")
video = client.videos.create(
    prompt="A serene mountain landscape at sunset with clouds rolling over peaks",
    seconds="8",
    size="1280x720"
)

video_id = video.id
print(f"Video ID: {video_id}")

# Step 2: Poll for completion
print("Waiting for video generation...")
while True:
    video = client.videos.retrieve(video_id)
    print(f"Status: {video.status}, Progress: {video.progress}%")
    
    if video.status == "completed":
        print("Video generation completed!")
        break
    elif video.status == "failed":
        print(f"Video generation failed: {video.error}")
        break
    
    time.sleep(10)  # Wait 10 seconds before checking again

# Step 3: Download the video
print("Downloading video...")
response = client.videos.download_content(video_id=video_id)
content = response.read()

with open(f"{video_id}.mp4", "wb") as f:
    f.write(content)

print("Video saved successfully!")

# Step 4: Create a remix
print("Creating remix...")
remix = client.videos.remix(
    video_id=video_id,
    prompt="Same scene but now with a golden eagle soaring through the frame"
)

print(f"Remix ID: {remix.id}")
```

### Error Handling Example

```python
from openai import OpenAI
from openai import OpenAIError

client = OpenAI()

try:
    video = client.videos.create(
        prompt="A futuristic cityscape with flying cars",
        seconds="8",
        size="1920x1080"
    )
    print(f"Video created: {video.id}")
    
except OpenAIError as e:
    print(f"Error creating video: {e}")
    # Handle specific error types
    if hasattr(e, 'status_code'):
        if e.status_code == 400:
            print("Bad request - check your parameters")
        elif e.status_code == 401:
            print("Authentication failed - check your API key")
        elif e.status_code == 429:
            print("Rate limit exceeded - wait before retrying")
```

### Async Example (Python 3.7+)

```python
import asyncio
from openai import AsyncOpenAI

async def generate_video():
    client = AsyncOpenAI()
    
    video = await client.videos.create(
        prompt="A robot dancing in the rain",
        seconds="6"
    )
    
    print(f"Video created: {video.id}")
    
    # Poll for completion
    while True:
        video = await client.videos.retrieve(video.id)
        if video.status == "completed":
            break
        await asyncio.sleep(10)
    
    # Download content
    response = await client.videos.download_content(video_id=video.id)
    content = await response.read()
    
    with open("robot_dance.mp4", "wb") as f:
        f.write(content)

asyncio.run(generate_video())
```

### Batch Processing Example

```python
from openai import OpenAI
import concurrent.futures

client = OpenAI()

prompts = [
    "A butterfly landing on a flower",
    "Ocean waves crashing on rocks",
    "Time-lapse of clouds moving across the sky"
]

def create_video(prompt):
    video = client.videos.create(prompt=prompt, seconds="6")
    return {"prompt": prompt, "video_id": video.id}

# Create videos in parallel
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(create_video, prompts))

for result in results:
    print(f"Created video {result['video_id']} for: {result['prompt']}")
```

---

## Error Handling

### Common Error Codes

| Status Code | Error Type | Description | Solution |
|-------------|------------|-------------|----------|
| 400 | Bad Request | Invalid parameters or malformed request | Check parameter types and values |
| 401 | Unauthorized | Invalid or missing API key | Verify your API key is correct |
| 404 | Not Found | Video ID doesn't exist | Check the video ID is correct |
| 429 | Rate Limit | Too many requests | Implement exponential backoff |
| 500 | Server Error | Internal server error | Retry with exponential backoff |

### Error Response Format

```json
{
  "error": {
    "code": "invalid_request_error",
    "message": "Invalid value for 'seconds': must be between 1 and 30",
    "type": "invalid_request_error"
  }
}
```

### Retry Logic Example

```python
import time
from openai import OpenAI, OpenAIError

def create_video_with_retry(prompt, max_retries=3):
    client = OpenAI()
    
    for attempt in range(max_retries):
        try:
            video = client.videos.create(prompt=prompt)
            return video
        
        except OpenAIError as e:
            if attempt == max_retries - 1:
                raise
            
            wait_time = 2 ** attempt  # Exponential backoff
            print(f"Attempt {attempt + 1} failed. Retrying in {wait_time}s...")
            time.sleep(wait_time)
```

---

## Best Practices

### 1. Polling Strategy

Don't poll too frequently - use reasonable intervals:

```python
def wait_for_completion(client, video_id, check_interval=10, timeout=600):
    """
    Wait for video completion with timeout.
    
    Args:
        client: OpenAI client instance
        video_id: Video job ID
        check_interval: Seconds between status checks (default: 10)
        timeout: Maximum wait time in seconds (default: 600)
    """
    import time
    
    start_time = time.time()
    
    while True:
        if time.time() - start_time > timeout:
            raise TimeoutError("Video generation timed out")
        
        video = client.videos.retrieve(video_id)
        
        if video.status == "completed":
            return video
        elif video.status == "failed":
            raise Exception(f"Video failed: {video.error}")
        
        time.sleep(check_interval)
```

### 2. Resource Management

Always clean up videos you no longer need:

```python
def cleanup_old_videos(client, days_old=7):
    """Delete videos older than specified days."""
    import time
    
    cutoff_time = time.time() - (days_old * 24 * 60 * 60)
    videos = client.videos.list(order="asc")
    
    for video in videos.data:
        if video.created_at < cutoff_time:
            client.videos.delete(video.id)
            print(f"Deleted old video: {video.id}")
```

### 3. Prompt Engineering

Write clear, descriptive prompts:

```python
# ✅ Good - specific and descriptive
prompt = """A close-up shot of a hummingbird hovering near a red hibiscus flower.
The scene is shot in slow motion with morning sunlight creating a soft glow.
The background is a blurred garden."""

# ❌ Bad - too vague
prompt = "bird and flower"
```

### 4. Handle Expiration

Videos expire after a certain time. Download important videos:

```python
def download_if_expiring_soon(client, video_id, hours_threshold=24):
    """Download video if it expires within threshold."""
    import time
    
    video = client.videos.retrieve(video_id)
    
    if video.expires_at:
        time_until_expiry = video.expires_at - time.time()
        hours_until_expiry = time_until_expiry / 3600
        
        if hours_until_expiry < hours_threshold:
            print(f"Video expires in {hours_until_expiry:.1f} hours. Downloading...")
            response = client.videos.download_content(video_id=video_id)
            content = response.read()
            
            with open(f"backup_{video_id}.mp4", "wb") as f:
                f.write(content)
            
            return True
    
    return False
```

### 5. Optimize for Performance

Use appropriate resolution and duration:

```python
# For quick previews
preview = client.videos.create(
    prompt="concept test",
    seconds="4",
    size="720x1280"  # Smaller size = faster generation
)

# For final production
final = client.videos.create(
    prompt="final video with detailed description",
    seconds="8",
    size="1808x1024"  # Higher resolution for quality
)
```

### 6. Cost Optimization

```python
# Test prompts with shorter durations first
def test_prompt(prompt):
    """Test a prompt with minimum duration."""
    video = client.videos.create(
        prompt=prompt,
        seconds="4",  # Minimum duration for testing
        size="720x1280"
    )
    return video

# Once satisfied, generate full version
def generate_final(prompt):
    """Generate final video with full duration."""
    video = client.videos.create(
        prompt=prompt,
        seconds="8",
        size="1920x1080"
    )
    return video
```

---

## Rate Limits & Quotas

**Note:** Specific rate limits and quotas are organization-dependent. Monitor your usage and implement appropriate rate limiting in your application.

```python
import time
from collections import deque

class RateLimiter:
    def __init__(self, max_requests, time_window):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
    
    def wait_if_needed(self):
        now = time.time()
        
        # Remove old requests outside time window
        while self.requests and self.requests[0] < now - self.time_window:
            self.requests.popleft()
        
        # If at limit, wait
        if len(self.requests) >= self.max_requests:
            sleep_time = self.time_window - (now - self.requests[0])
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        self.requests.append(time.time())

# Usage
limiter = RateLimiter(max_requests=10, time_window=60)  # 10 requests per minute

for prompt in prompts:
    limiter.wait_if_needed()
    video = client.videos.create(prompt=prompt)
```

---

## Additional Resources

- **OpenAI Documentation:** https://platform.openai.com/docs
- **API Reference:** https://platform.openai.com/docs/api-reference/videos
- **Community Forum:** https://community.openai.com
- **Status Page:** https://status.openai.com

---

## Quick Reference Cheat Sheet

```python
from openai import OpenAI
client = OpenAI()

# Create video
video = client.videos.create(prompt="...", seconds="8", size="1280x720")

# Check status
video = client.videos.retrieve(video_id)

# Download video
response = client.videos.download_content(video_id=video_id)
content = response.read()

# Remix video
remix = client.videos.remix(video_id=video_id, prompt="...")

# List videos
videos = client.videos.list(limit=10, order="desc")

# Delete video
client.videos.delete(video_id)
```

---

*Last Updated: October 2025*
