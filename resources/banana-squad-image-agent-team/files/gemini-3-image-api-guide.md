# Gemini 3 Pro Image API Guide (Nano Banana Pro)

> Complete reference for generating and editing images with the Gemini API.
> Last updated: February 2026

---

## Overview

"Nano Banana" is the codename for Gemini's **native image generation** capabilities. The model generates images as part of its normal `generateContent` response — there is no separate image API. Response parts can be `text` or `inline_data` (base64-encoded image).

### Two Models

| Model | Model ID | Best For |
|---|---|---|
| **Nano Banana** | `gemini-2.5-flash-image` | Speed, efficiency, high-volume, low-latency. Fixed 1K resolution. Up to 3 input images. |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | Professional asset production. Thinking mode. Up to 4K resolution. Google Search grounding. Up to 14 reference images. |

**Default model for this project: `gemini-3-pro-image-preview`**

---

## Authentication

Set your API key as an environment variable:

```bash
export GEMINI_API_KEY="your-key-here"
```

Or load from `.env` file in project root.

---

## JavaScript SDK Setup

```bash
npm install @google/genai
```

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

// Reads GEMINI_API_KEY from environment automatically
const ai = new GoogleGenAI({});
```

---

## Python SDK Setup

```bash
pip install google-genai
```

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()  # Reads GEMINI_API_KEY from environment
```

---

## Core Operations

### 1. Text-to-Image

Generate an image from a text prompt.

**Python:**

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="Your detailed prompt here",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",   # See aspect ratio table below
            image_size="2K"        # "1K", "2K", or "4K" — MUST be uppercase
        ),
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("output.png")
```

**JavaScript:**

```javascript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: "Your detailed prompt here",
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: {
      aspectRatio: "16:9",
      imageSize: "2K",
    },
  },
});

for (const part of response.candidates[0].content.parts) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("output.png", buffer);
  }
}
```

**REST (curl):**

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Your prompt here"}]}],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {
        "aspectRatio": "16:9",
        "imageSize": "2K"
      }
    }
  }'
```

### 2. Image Editing (Image + Text → Image)

Provide an input image alongside a text instruction.

**Python:**

```python
image_input = Image.open("input.png")

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Your edit instruction", image_input],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    )
)
```

**JavaScript:**

```javascript
const base64Image = fs.readFileSync("input.png").toString("base64");

const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [
    { text: "Your edit instruction" },
    { inlineData: { mimeType: "image/png", data: base64Image } },
  ],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});
```

### 3. Multi-Image Input (Up to 14 Reference Images)

Gemini 3 Pro supports up to 14 reference images (6 objects + 5 humans with high fidelity).

**Python:**

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        "Combine these elements into a cohesive scene",
        Image.open("ref1.png"),
        Image.open("ref2.png"),
        Image.open("ref3.png"),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K"
        ),
    )
)
```

**JavaScript:**

```javascript
const contents = [
  { text: "Combine these elements into a cohesive scene" },
  { inlineData: { mimeType: "image/png", data: base64Img1 } },
  { inlineData: { mimeType: "image/png", data: base64Img2 } },
  { inlineData: { mimeType: "image/png", data: base64Img3 } },
];

const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents,
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
  },
});
```

### 4. Multi-Turn Chat Editing

Iterate on images conversationally. The SDK handles thought signatures automatically when using the chat API.

**Python:**

```python
chat = client.chats.create(
    model="gemini-3-pro-image-preview",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    )
)

# Turn 1: Generate
response = chat.send_message("Create an infographic about photosynthesis")

# Turn 2: Edit
response = chat.send_message(
    "Update to Spanish. Do not change any other elements.",
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K"
        ),
    )
)
```

**JavaScript:**

```javascript
const chat = ai.chats.create({
  model: "gemini-3-pro-image-preview",
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

let response = await chat.sendMessage({ message: "Create an infographic..." });

response = await chat.sendMessage({
  message: "Update to Spanish. Do not change any other elements.",
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
  },
});
```

### 5. Google Search Grounding (Real-Time Data)

Generate images based on live information (weather, sports scores, news).

**Python:**

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="Visualize the current weather forecast for SF as a modern chart",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
        tools=[{"google_search": {}}]
    )
)
# Response includes groundingMetadata with searchEntryPoint and groundingChunks
```

**JavaScript:**

```javascript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: "Visualize the current weather forecast for SF",
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: "16:9" },
    tools: [{ googleSearch: {} }],
  },
});
```

---

## Configuration Reference

### Response Modalities

| Setting | Behavior |
|---|---|
| `['TEXT', 'IMAGE']` | Returns text and images (default) |
| `['IMAGE']` | Returns images only, no text |

### Aspect Ratios

Available for both models: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

### Resolution (Gemini 3 Pro Only)

| Size | Description | Tokens |
|---|---|---|
| `"1K"` | Default. ~1024px on longest side | 1120 |
| `"2K"` | ~2048px on longest side | 1120 |
| `"4K"` | ~4096px on longest side | 2000 |

**CRITICAL: Resolution values MUST use uppercase K (e.g., `"2K"` not `"2k"`).**

### Gemini 3 Pro Resolution Table

| Aspect | 1K | 2K | 4K |
|---|---|---|---|
| 1:1 | 1024x1024 | 2048x2048 | 4096x4096 |
| 2:3 | 848x1264 | 1696x2528 | 3392x5056 |
| 3:2 | 1264x848 | 2528x1696 | 5056x3392 |
| 16:9 | 1376x768 | 2752x1536 | 5504x3072 |
| 9:16 | 768x1376 | 1536x2752 | 3072x5504 |

---

## Thinking Mode (Gemini 3 Pro)

Enabled by default, cannot be disabled. The model reasons through complex prompts before generating.

- Generates up to 2 interim "thought images" (not charged)
- The last thought image is also the final rendered image
- Access thoughts via `part.thought` flag

```python
for part in response.parts:
    if part.thought:
        if part.text:
            print("[THOUGHT]", part.text)
        elif image := part.as_image():
            image.show()  # Interim composition test
```

### Thought Signatures

All non-thought image parts include a `thought_signature` field. In multi-turn:

- **Using SDK chat API**: signatures are handled automatically
- **Building history manually**: pass signatures back exactly as received or the response will fail

---

## Prompting Best Practices

### Core Principle

> **Describe the scene narratively — don't just list keywords.**
> A descriptive paragraph always produces better images than disconnected words.

### Strategies

1. **Be hyper-specific**: "ornate elven plate armor, etched with silver leaf patterns, with pauldrons shaped like falcon wings" > "fantasy armor"
2. **Provide context and intent**: "logo for a high-end minimalist skincare brand" > "create a logo"
3. **Use photography terms for realism**: camera angles, lens types (85mm portrait), lighting (golden hour, softbox), bokeh
4. **Iterate conversationally**: "make the lighting warmer" — works great in multi-turn
5. **Step-by-step for complex scenes**: "First create X background, then add Y, finally place Z"
6. **Semantic negatives**: describe what you WANT ("empty deserted street") not what you don't ("no cars")
7. **Control the camera**: `wide-angle shot`, `macro shot`, `low-angle perspective`, `bird's eye view`

### Prompt Templates

**Photorealistic:**
```
A photorealistic [shot type] of [subject], [action/expression], set in [environment].
Illuminated by [lighting], creating a [mood] atmosphere.
Captured with [camera/lens], emphasizing [textures/details]. [Aspect ratio].
```

**Stylized / Sticker / Icon:**
```
A [style] sticker of [subject], featuring [characteristics] and a [color palette].
Bold, clean outlines, [shading style]. Background: [color/transparent].
```

**Text in Image (use Gemini 3 Pro):**
```
Create a [image type] for [brand/concept] with the text "[exact text]"
in a [font style]. Design: [style description], color scheme: [colors].
```

**Product Mockup:**
```
A high-resolution, studio-lit product photograph of [product] on [surface].
Lighting: [setup] to [purpose]. Camera: [angle] to showcase [feature].
Ultra-realistic, sharp focus on [detail]. [Aspect ratio].
```

---

## Limitations

- Best language support: EN, ar-EG, de-DE, es-MX, fr-FR, hi-IN, id-ID, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, ua-UA, vi-VN, zh-CN
- No audio or video inputs
- Won't always generate the exact number of images requested
- 2.5 Flash: up to 3 input images | Gemini 3 Pro: 5 high-fidelity + up to 14 total
- All images carry SynthID watermarks
- For text-heavy images: generate text first, then ask for the image in a follow-up turn

---

## Error Handling

Common issues:

| Error | Cause | Fix |
|---|---|---|
| `imageSize` rejected | Used lowercase `"2k"` | Use uppercase `"2K"` |
| No image in response | Safety filter triggered | Rephrase prompt to avoid policy violations |
| Blurry/low-quality | No `imageSize` specified | Add `imageSize: "2K"` or `"4K"` |
| Thought signature error | Manual history missing signatures | Use SDK chat API, or pass signatures back verbatim |
| Content policy block | Prompt violates usage policy | Review Google's Prohibited Use Policy |
