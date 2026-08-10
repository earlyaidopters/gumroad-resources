# NotebookLM Reimagined: Vision Document

> **An API-First Research Intelligence Platform**
>
> Google's NotebookLM, rebuilt as an open platform for developers.

---

## For Claude: How to Use This Document

This document is part of a three-part specification for building NotebookLM Reimagined. Before starting:

1. **Ask the user to set up these prerequisites:**
   - Supabase project (you'll need the Supabase MCP configured)
   - Vercel account for deployment
   - Google AI Studio account for Gemini API key
   - (Optional) AtlasCloud account for video generation

2. **Read all three documents in order:**
   - `01_VISION_DOCUMENT.md` (this file) - Understand the why
   - `02_PROJECT_SPECIFICATION.md` - Complete technical spec
   - `03_IMPLEMENTATION_GUIDE.md` - Step-by-step build instructions

3. **Use the Supabase MCP** for all database operations - no Docker or local infrastructure needed.

---

## The Problem We're Solving

Google's NotebookLM is impressive. It takes your documents, lets you chat with them, and generates surprisingly good AI podcasts. But it has three fundamental limitations:

| Limitation | Impact |
|------------|--------|
| **Walled Garden** | No API. No webhooks. No automation. |
| **Google Ecosystem Lock-in** | Can't customize, can't integrate with your stack. |
| **Product, Not Platform** | Use it their way or not at all. |

**We're building the open alternative.**

---

## The Vision

Build an API-first research intelligence platform that replicates NotebookLM's functionality while exposing **every feature through a clean REST API**.

### Core Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                     DESIGN PRINCIPLES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. API-FIRST, ALWAYS                                           │
│     The web UI is just another API client.                      │
│     Everything the UI does, any developer can do.               │
│                                                                  │
│  2. SUPABASE FOR EVERYTHING                                     │
│     No Docker. No Redis. No Celery.                             │
│     Database, Auth, Storage, Realtime - all Supabase.           │
│                                                                  │
│  3. COST TRANSPARENCY                                           │
│     Every API response includes token usage and cost.           │
│     Users know exactly what they're spending.                   │
│                                                                  │
│  4. MODEL FLEXIBILITY                                           │
│     Switch between Gemini models per-request.                   │
│     Fast & cheap vs slow & quality - user's choice.             │
│                                                                  │
│  5. AI-ASSISTED DEVELOPMENT                                     │
│     Built with Supabase MCP for rapid iteration.                │
│     This codebase is designed to be modified by AI.             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Web UI  │  │   n8n   │  │ Zapier  │  │ Custom  │  │   AI    │   │
│  │(Next.js)│  │         │  │         │  │  Apps   │  │ Agents  │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │
└───────┼────────────┼────────────┼────────────┼────────────┼─────────┘
        │            │            │            │            │
        └────────────┴─────┬──────┴────────────┴────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  /api/v1/notebooks  │  /sources  │  /chat  │  /audio  │  /video │ │
│  │  /research  │  /study  │  /notes  │  /export  │  /api-keys      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│  ┌────────────────────────┼────────────────────────────────────────┐│
│  │              SUPABASE (All Infrastructure)                       ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           ││
│  │  │   Supabase   │  │  PostgreSQL  │  │   Storage    │           ││
│  │  │     Auth     │  │  (Database)  │  │   (Files)    │           ││
│  │  │  JWT + RLS   │  │  11 Tables   │  │  3 Buckets   │           ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘           ││
│  │                                                                  ││
│  │  ┌──────────────┐  ┌──────────────┐                             ││
│  │  │   Realtime   │  │     MCP      │                             ││
│  │  │  (Updates)   │  │  (AI Dev)    │                             ││
│  │  └──────────────┘  └──────────────┘                             ││
│  └────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AI SERVICES                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      GEMINI API                               │   │
│  │  generateContent  │  File Search (RAG)  │  TTS  │  Research  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  ATLASCLOUD (WAN 2.5)                         │   │
│  │                  Text-to-Video Generation                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What We're Building

### Core Features (NotebookLM Parity)

| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Multi-format Ingestion** | PDFs, DOCX, TXT, websites, YouTube videos | `POST /sources` |
| **RAG-Powered Chat** | Query sources with automatic citations | `POST /chat` |
| **Audio Overviews** | Podcast-style content (Deep Dive, Brief, Critique, Debate) | `POST /audio` |
| **Video Overviews** | Visual explainers via Wan 2.5 | `POST /video` |
| **Deep Research** | Autonomous multi-step web research | `POST /research` |
| **Study Materials** | Flashcards, quizzes, study guides, FAQs | `POST /flashcards`, etc. |
| **Notes** | Create and save responses | `POST /notes` |

### Beyond NotebookLM

| Feature | Description |
|---------|-------------|
| **Full REST API** | Every feature is an HTTP endpoint |
| **API Key Management** | Create keys with rate limits, scopes, expiration |
| **Export Everything** | JSON, ZIP, PDF, DOCX, PPTX formats |
| **Themes** | Dark, Light, Midnight Blue, Crimson |
| **Usage Analytics** | Track costs and usage patterns |
| **Multi-Tenancy** | Isolated notebooks per user with RLS |

---

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Database** | Supabase PostgreSQL | Managed, RLS, Realtime built-in |
| **Auth** | Supabase Auth | JWT + API Keys, zero config |
| **File Storage** | Supabase Storage | S3-compatible, integrated |
| **API** | FastAPI (Python) | Fast, typed, async |
| **AI/RAG** | Gemini API | File Search, TTS, Deep Research |
| **Video** | AtlasCloud Wan 2.5 | High-quality text-to-video |
| **Frontend** | Next.js 14+ | App Router, shadcn/ui |
| **Deployment** | Vercel | Zero-config Python + Node |

**What we don't need:**
- No Docker
- No Redis
- No Celery
- No self-hosted vector database
- No infrastructure management

---

## The User Experience

### For Developers (Primary Interface)

```bash
# Create a notebook
curl -X POST https://api.yourapp.com/api/v1/notebooks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Q4 Strategy Research", "emoji": "📊"}'

# Upload a source document
curl -X POST https://api.yourapp.com/api/v1/notebooks/{id}/sources \
  -F "file=@quarterly_report.pdf"

# Chat with your sources
curl -X POST https://api.yourapp.com/api/v1/notebooks/{id}/chat \
  -d '{"message": "What are the key risks mentioned?", "model": "gemini-2.0-flash"}'

# Generate a podcast
curl -X POST https://api.yourapp.com/api/v1/notebooks/{id}/audio \
  -d '{"format": "deep_dive"}'

# Export everything
curl https://api.yourapp.com/api/v1/notebooks/{id}/export/zip > backup.zip
```

### For No-Code Users (n8n / Zapier)

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTOMATION WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. TRIGGER: New file added to Google Drive                     │
│                    │                                             │
│                    ▼                                             │
│  2. ACTION: HTTP Request → Upload to NotebookLM API             │
│                    │                                             │
│                    ▼                                             │
│  3. ACTION: HTTP Request → Generate summary                     │
│                    │                                             │
│                    ▼                                             │
│  4. ACTION: Post summary to Slack                               │
│                    │                                             │
│                    ▼                                             │
│  5. ACTION: HTTP Request → Generate podcast                     │
│                    │                                             │
│                    ▼                                             │
│  6. ACTION: Upload MP3 to Dropbox                               │
│                                                                  │
│             All automatic, no browser needed.                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gemini Models Reference

| Feature | Model | Input Cost | Output Cost |
|---------|-------|------------|-------------|
| Chat (fast) | `gemini-2.0-flash` | $0.10/1M | $0.40/1M |
| Chat (lite) | `gemini-2.0-flash-lite` | $0.075/1M | $0.30/1M |
| Chat (quality) | `gemini-2.5-pro` | $1.25/1M | $10.00/1M |
| Flash exp | `gemini-2.5-flash` | $0.15/1M | $0.60/1M |
| TTS | `gemini-2.5-pro-tts-preview` | - | ~$0.02/min |
| Deep Research | `deep-research-pro-preview` | $0.50-2.00/query |

### Typical Operation Costs

| Operation | Typical Cost |
|-----------|--------------|
| Chat query (Flash) | $0.001 - $0.01 |
| Chat query (Pro) | $0.02 - $0.10 |
| Audio Overview (Deep Dive, 10 min) | $0.40 - $0.80 |
| Video Overview (10 sec) | $0.20 - $0.40 |
| Deep Research | $0.50 - $2.00 |
| Flashcards (10 cards) | $0.01 - $0.02 |

---

## The Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   NotebookLM says:                                              │
│   "Here's our product. Use it our way."                         │
│                                                                  │
│   NotebookLM Reimagined says:                                   │
│   "Here's a platform. Build whatever you want."                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

With Supabase handling all infrastructure and AI-assisted development via MCP, we focus entirely on features. No DevOps. No infrastructure. Just building.

---

## Next Steps

1. **Read `02_PROJECT_SPECIFICATION.md`** for complete technical details
2. **Read `03_IMPLEMENTATION_GUIDE.md`** for step-by-step build instructions
3. **Set up prerequisites** (Supabase, Vercel, Gemini API)
4. **Start building** with Claude + Supabase MCP

---

**Ready to build the platform? Let's go.**
