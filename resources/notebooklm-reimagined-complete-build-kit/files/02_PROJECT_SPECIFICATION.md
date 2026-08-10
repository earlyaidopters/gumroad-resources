# NotebookLM Reimagined: Complete Project Specification

> **Version 3.0 | January 2025**
>
> Complete technical specification for building NotebookLM Reimagined from scratch.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Gemini API Integration](#5-gemini-api-integration)
6. [AtlasCloud Video Integration](#6-atlascloud-video-integration)
7. [Authentication System](#7-authentication-system)
8. [Backend Implementation](#8-backend-implementation)
9. [Frontend Implementation](#9-frontend-implementation)
10. [Deployment](#10-deployment)

---

# 1. Prerequisites & Setup

## For Claude: First Steps

**Before writing any code, ask the user to set up these services:**

### 1.1 Supabase Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE MCP SETUP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User needs Supabase MCP configured in Claude Code          │
│                                                                  │
│  2. Create a new Supabase project:                              │
│     - Go to https://supabase.com/dashboard                      │
│     - Click "New Project"                                       │
│     - Note the project URL and keys                             │
│                                                                  │
│  3. Get the following credentials:                              │
│     - SUPABASE_URL (e.g., https://xxx.supabase.co)             │
│     - SUPABASE_ANON_KEY (public, safe for frontend)            │
│     - SUPABASE_SERVICE_ROLE_KEY (private, backend only)        │
│                                                                  │
│  4. Verify MCP works:                                           │
│     mcp__supabase__list_projects                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Google AI Studio Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    GEMINI API SETUP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Go to https://aistudio.google.com/app/apikey               │
│                                                                  │
│  2. Create an API key                                           │
│                                                                  │
│  3. Note the key: GOOGLE_API_KEY=AIza...                       │
│                                                                  │
│  4. Available models (no separate enablement needed):           │
│     - gemini-2.0-flash (fast, cheap)                           │
│     - gemini-2.0-flash-lite (fastest, cheapest)                │
│     - gemini-2.5-pro (quality)                                 │
│     - gemini-2.5-flash (balanced)                              │
│     - gemini-2.5-pro-tts-preview (text-to-speech)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Vercel Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL SETUP                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Create Vercel account: https://vercel.com                  │
│                                                                  │
│  2. Install Vercel CLI:                                         │
│     npm install -g vercel                                       │
│                                                                  │
│  3. Login:                                                      │
│     vercel login                                                │
│                                                                  │
│  4. We'll deploy TWO projects:                                  │
│     - Backend (Python FastAPI) → api.yourapp.com               │
│     - Frontend (Next.js) → yourapp.com                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 (Optional) AtlasCloud for Video

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATLASCLOUD SETUP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For video generation using Wan 2.5:                            │
│                                                                  │
│  1. Sign up: https://atlascloud.ai                              │
│                                                                  │
│  2. Create API key                                              │
│                                                                  │
│  3. Note: ATLASCLOUD_API_KEY=apikey-xxx                        │
│                                                                  │
│  Cost: ~$0.02/second of video                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Environment Variables Summary

**Backend `.env`:**
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gemini
GOOGLE_API_KEY=AIza...

# AtlasCloud (optional)
ATLASCLOUD_API_KEY=apikey-xxx

# App
DEBUG=false
```

**Frontend `.env.local`:**
```bash
# Supabase (public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Backend API URL
NEXT_PUBLIC_API_URL=https://your-api.vercel.app

# Gemini (for client-side study generation)
GOOGLE_API_KEY=AIza...

# AtlasCloud (optional)
ATLASCLOUD_API_KEY=apikey-xxx
```

---

# 2. Architecture

## 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  App Router │ React Query │ shadcn/ui │ Tailwind │ 4 Themes   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  Supabase Auth (client) ────┤                                       │
│  Supabase Realtime ─────────┤                                       │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Vercel Python Runtime │ Async │ Pydantic │ 13 Routers        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  JWT/API Key Auth ──────────┤                                       │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      ROUTERS                                    │ │
│  │  notebooks │ sources │ chat │ audio │ video │ research │ study │ │
│  │  notes │ export │ api-keys │ profile │ studio │ global-chat    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      SERVICES                                   │ │
│  │  gemini.py │ auth.py │ supabase_client.py │ atlascloud_video.py││
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
        ┌──────────────────────┼───────────────────────┐
        │                      │                       │
        ▼                      ▼                       ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SUPABASE    │    │   GEMINI API    │    │   ATLASCLOUD    │
│               │    │                 │    │                 │
│ PostgreSQL    │    │ generateContent │    │ Wan 2.5         │
│ Auth          │    │ TTS             │    │ Text-to-Video   │
│ Storage       │    │ File Search     │    │                 │
│ Realtime      │    │ Deep Research   │    │                 │
└───────────────┘    └─────────────────┘    └─────────────────┘
```

## 2.2 Directory Structure

```
project/
├── backend/
│   ├── api/
│   │   └── index.py              # Vercel entry point
│   ├── app/
│   │   ├── main.py               # FastAPI app setup
│   │   ├── config.py             # Settings
│   │   ├── models/
│   │   │   └── schemas.py        # Pydantic models
│   │   ├── routers/
│   │   │   ├── notebooks.py      # CRUD for notebooks
│   │   │   ├── sources.py        # File upload, YouTube, URLs
│   │   │   ├── chat.py           # RAG chat with citations
│   │   │   ├── audio.py          # Audio generation
│   │   │   ├── video.py          # Video generation
│   │   │   ├── research.py       # Deep Research
│   │   │   ├── study.py          # Flashcards, quiz, guides
│   │   │   ├── notes.py          # User notes
│   │   │   ├── export.py         # JSON/ZIP export
│   │   │   ├── api_keys.py       # API key management
│   │   │   ├── profile.py        # User profile
│   │   │   ├── studio.py         # Combined studio features
│   │   │   └── global_chat.py    # Chat without notebook
│   │   └── services/
│   │       ├── gemini.py         # Gemini API client
│   │       ├── atlascloud_video.py # Wan 2.5 client
│   │       ├── auth.py           # JWT + API key auth
│   │       ├── supabase_client.py # Supabase connection
│   │       └── persona_utils.py  # Persona handling
│   ├── requirements.txt
│   ├── vercel.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── notebooks/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Notebook view
│   │   │   │       └── history/
│   │   │   ├── profile/
│   │   │   ├── settings/
│   │   │   └── docs/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components
│   │   │   ├── dashboard/
│   │   │   ├── chat/
│   │   │   ├── sources/
│   │   │   ├── studio/
│   │   │   ├── study/
│   │   │   └── panels/
│   │   ├── lib/
│   │   │   ├── supabase.ts       # Supabase client
│   │   │   ├── api.ts            # API client
│   │   │   ├── gemini.ts         # Client-side Gemini
│   │   │   └── export-utils.ts   # PDF/DOCX export
│   │   ├── providers.tsx         # Query + Theme providers
│   │   └── globals.css           # Theme CSS variables
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── .env.local
│
└── docs/                         # These specification files
    ├── 01_VISION_DOCUMENT.md
    ├── 02_PROJECT_SPECIFICATION.md
    └── 03_IMPLEMENTATION_GUIDE.md
```

---

# 3. Database Schema

## 3.1 Complete Schema (11 Tables)

Use `mcp__supabase__apply_migration` to create these tables:

### profiles
```sql
-- Extends Supabase Auth users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### notebooks
```sql
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📓',
  settings JSONB DEFAULT '{}',  -- persona, preferences
  file_search_store_id TEXT,    -- Gemini File Search Store ID
  source_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
```

### sources
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'pdf', 'docx', 'txt', 'youtube', 'url', 'audio', 'text'
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'ready', 'failed'
  file_path TEXT,                 -- Supabase Storage path
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  token_count INT,
  metadata JSONB DEFAULT '{}',    -- duration, transcript, url, content (for text)
  source_guide JSONB,             -- summary, topics, suggested_questions
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_notebook_id ON sources(notebook_id);
```

### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_notebook_id ON chat_sessions(notebook_id);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,  -- 'user', 'assistant'
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  source_ids_used JSONB DEFAULT '[]',
  model_used TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

### audio_overviews
```sql
CREATE TABLE audio_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  format TEXT NOT NULL,  -- 'deep_dive', 'brief', 'critique', 'debate'
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  progress_percent INT DEFAULT 0,
  custom_instructions TEXT,
  source_ids JSONB DEFAULT '[]',
  script TEXT,
  audio_file_path TEXT,  -- Supabase Storage path
  duration_seconds INT,
  model_used TEXT,
  cost_usd DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_audio_overviews_notebook_id ON audio_overviews(notebook_id);
```

### video_overviews
```sql
CREATE TABLE video_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  style TEXT NOT NULL,  -- 'documentary', 'explainer', 'presentation'
  status TEXT DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  source_ids JSONB DEFAULT '[]',
  script TEXT,
  video_file_path TEXT,
  thumbnail_path TEXT,
  duration_seconds INT,
  model_used TEXT,
  cost_usd DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_video_overviews_notebook_id ON video_overviews(notebook_id);
```

### research_tasks
```sql
CREATE TABLE research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  mode TEXT DEFAULT 'fast',  -- 'fast', 'deep'
  status TEXT DEFAULT 'pending',
  progress_message TEXT,
  sources_found_count INT DEFAULT 0,
  sources_analyzed_count INT DEFAULT 0,
  report_content TEXT,
  report_citations JSONB DEFAULT '[]',
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_research_tasks_notebook_id ON research_tasks(notebook_id);
```

### notes
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'written',  -- 'written', 'saved_response'
  title TEXT,
  content TEXT,
  tags JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT FALSE,
  original_message_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_notebook_id ON notes(notebook_id);
```

### api_keys
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,      -- First 16 chars for display
  key_hash TEXT NOT NULL,        -- SHA256 hash of full key
  scopes JSONB DEFAULT '["*"]',  -- ["*"] = all, or specific scopes
  rate_limit_rpm INT DEFAULT 100,
  rate_limit_rpd INT DEFAULT 10000,
  expires_at TIMESTAMPTZ,
  allowed_ips JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  total_requests INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

### usage_logs
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  model_used TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
```

## 3.2 Row Level Security (RLS)

**Enable RLS on ALL tables and create policies:**

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Notebooks policies
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notebooks"
  ON notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE USING (auth.uid() = user_id);

-- Sources policies (access via notebook ownership)
CREATE POLICY "Users can view sources in own notebooks"
  ON sources FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create sources in own notebooks"
  ON sources FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete sources in own notebooks"
  ON sources FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- Apply similar patterns for all other tables...
-- (chat_sessions, chat_messages, audio_overviews, video_overviews,
--  research_tasks, notes, api_keys, usage_logs)
```

## 3.3 Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('sources', 'sources', false),
  ('audio', 'audio', false),
  ('video', 'video', false);

-- Storage policies (user folder isolation)
-- Pattern: {user_id}/{notebook_id}/{filename}

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('sources', 'audio', 'video') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('sources', 'audio', 'video') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('sources', 'audio', 'video') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 3.4 Realtime Configuration

Enable Realtime on tables for live updates:

```sql
-- In Supabase Dashboard > Database > Replication
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE audio_overviews;
ALTER PUBLICATION supabase_realtime ADD TABLE video_overviews;
ALTER PUBLICATION supabase_realtime ADD TABLE research_tasks;
```

---

# 4. API Endpoints

## 4.1 Complete Endpoint Reference

### Notebooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks` | Create notebook |
| `GET` | `/api/v1/notebooks` | List user's notebooks |
| `GET` | `/api/v1/notebooks/{id}` | Get notebook details |
| `PATCH` | `/api/v1/notebooks/{id}` | Update notebook |
| `DELETE` | `/api/v1/notebooks/{id}` | Delete notebook |

### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/sources` | Upload file (multipart) |
| `POST` | `/api/v1/notebooks/{id}/sources/youtube` | Add YouTube video |
| `POST` | `/api/v1/notebooks/{id}/sources/url` | Add website URL |
| `POST` | `/api/v1/notebooks/{id}/sources/text` | Add pasted text |
| `GET` | `/api/v1/notebooks/{id}/sources` | List sources |
| `GET` | `/api/v1/notebooks/{id}/sources/{sid}` | Get source details |
| `DELETE` | `/api/v1/notebooks/{id}/sources/{sid}` | Delete source |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/chat` | Send message, get response |
| `GET` | `/api/v1/notebooks/{id}/chat/sessions` | List chat sessions |
| `GET` | `/api/v1/notebooks/{id}/chat/sessions/{sid}` | Get session messages |
| `DELETE` | `/api/v1/notebooks/{id}/chat/sessions/{sid}` | Delete session |

### Audio Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/audio` | Start audio generation |
| `POST` | `/api/v1/notebooks/{id}/audio/estimate` | Get cost estimate |
| `GET` | `/api/v1/notebooks/{id}/audio` | List audio overviews |
| `GET` | `/api/v1/notebooks/{id}/audio/{aid}` | Get status/details |
| `GET` | `/api/v1/notebooks/{id}/audio/{aid}/download` | Get download URL |
| `DELETE` | `/api/v1/notebooks/{id}/audio/{aid}` | Delete audio |

### Video Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/video` | Start video generation |
| `POST` | `/api/v1/notebooks/{id}/video/estimate` | Get cost estimate |
| `GET` | `/api/v1/notebooks/{id}/video` | List videos |
| `GET` | `/api/v1/notebooks/{id}/video/{vid}` | Get status/details |
| `GET` | `/api/v1/notebooks/{id}/video/{vid}/download` | Get download URL |
| `DELETE` | `/api/v1/notebooks/{id}/video/{vid}` | Delete video |

### Deep Research

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/research` | Start research task |
| `GET` | `/api/v1/notebooks/{id}/research` | List research tasks |
| `GET` | `/api/v1/notebooks/{id}/research/{rid}` | Get status/report |
| `POST` | `/api/v1/notebooks/{id}/research/{rid}/add-to-notebook` | Import as source |

### Study Materials

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/flashcards` | Generate flashcards |
| `POST` | `/api/v1/notebooks/{id}/quiz` | Generate quiz |
| `POST` | `/api/v1/notebooks/{id}/study-guide` | Generate study guide |
| `POST` | `/api/v1/notebooks/{id}/faq` | Generate FAQ |

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/notes` | Create note |
| `POST` | `/api/v1/notebooks/{id}/notes/save-response` | Save chat response |
| `GET` | `/api/v1/notebooks/{id}/notes` | List notes |
| `PATCH` | `/api/v1/notebooks/{id}/notes/{nid}` | Update note |
| `DELETE` | `/api/v1/notebooks/{id}/notes/{nid}` | Delete note |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notebooks/{id}/export/json` | Export as JSON |
| `GET` | `/api/v1/notebooks/{id}/export/zip` | Export as ZIP |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/api-keys` | Create API key |
| `GET` | `/api/v1/api-keys` | List keys |
| `DELETE` | `/api/v1/api-keys/{id}` | Revoke key |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/profile` | Get user profile |
| `PATCH` | `/api/v1/profile` | Update profile |

## 4.2 Response Format

**Success response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "My Notebook",
    // ... entity fields
  },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.0023,
    "model_used": "gemini-2.0-flash"
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

**Error response:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Notebook not found",
    "details": {}
  }
}
```

## 4.3 Request/Response Examples

### Create Notebook
```bash
POST /api/v1/notebooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Q4 Strategy Research",
  "emoji": "📊",
  "description": "Research for quarterly planning"
}
```

Response:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q4 Strategy Research",
    "emoji": "📊",
    "description": "Research for quarterly planning",
    "source_count": 0,
    "created_at": "2025-01-11T10:00:00Z"
  }
}
```

### Chat with Sources
```bash
POST /api/v1/notebooks/{id}/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What are the key risks mentioned in the documents?",
  "source_ids": ["uuid1", "uuid2"],  // optional, use specific sources
  "model": "gemini-2.0-flash"  // optional
}
```

Response:
```json
{
  "data": {
    "message_id": "uuid",
    "session_id": "uuid",
    "content": "Based on the documents, the key risks identified are:\n\n1. **Market volatility** [1] - The Q3 report highlights...\n2. **Supply chain disruptions** [2] - According to...",
    "citations": [
      {
        "number": 1,
        "source_id": "uuid1",
        "source_name": "Q3 Report.pdf",
        "text": "Market volatility presents significant risk...",
        "confidence": 0.92
      },
      {
        "number": 2,
        "source_id": "uuid2",
        "source_name": "Risk Assessment.docx",
        "text": "Supply chain disruptions may impact...",
        "confidence": 0.88
      }
    ],
    "suggested_questions": [
      "How can these risks be mitigated?",
      "What's the timeline for risk assessment?",
      "Are there any contingency plans mentioned?"
    ]
  },
  "usage": {
    "input_tokens": 2500,
    "output_tokens": 450,
    "cost_usd": 0.0043,
    "model_used": "gemini-2.0-flash"
  }
}
```

### Generate Audio Overview
```bash
POST /api/v1/notebooks/{id}/audio
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "deep_dive",  // deep_dive, brief, critique, debate
  "custom_instructions": "Focus on the financial implications",
  "source_ids": []  // empty = use all sources
}
```

Response:
```json
{
  "data": {
    "id": "uuid",
    "status": "processing",
    "format": "deep_dive",
    "progress_percent": 0,
    "estimated_duration_seconds": 600
  }
}
```

---

# 5. Gemini API Integration

## 5.1 SDK Setup

**Install the Google GenAI SDK:**
```bash
pip install google-generativeai google-genai
```

**Initialize client:**
```python
import google.generativeai as genai
from google import genai as genai_new  # New SDK for TTS

genai.configure(api_key=settings.google_api_key)
client = genai_new.Client(api_key=settings.google_api_key)
```

## 5.2 Model Pricing Reference

```python
MODEL_PRICING = {
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},      # per 1M tokens
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.0},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
}

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["gemini-2.0-flash"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return input_cost + output_cost
```

## 5.3 GeminiService Implementation

```python
# app/services/gemini.py

import google.generativeai as genai
from google import genai as genai_new
from app.config import settings

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.client = genai_new.Client(api_key=settings.google_api_key)

    async def generate_content(
        self,
        prompt: str,
        model: str = "gemini-2.0-flash",
        system_instruction: str = None,
        temperature: float = 0.7
    ) -> dict:
        """Generate content using Gemini."""
        generation_config = genai.GenerationConfig(temperature=temperature)

        model_instance = genai.GenerativeModel(
            model_name=model,
            generation_config=generation_config,
            system_instruction=system_instruction
        )

        response = model_instance.generate_content(prompt)

        # Extract usage
        usage = {
            "input_tokens": response.usage_metadata.prompt_token_count,
            "output_tokens": response.usage_metadata.candidates_token_count,
            "model_used": model,
            "cost_usd": calculate_cost(
                model,
                response.usage_metadata.prompt_token_count,
                response.usage_metadata.candidates_token_count
            )
        }

        return {
            "content": response.text,
            "usage": usage
        }

    async def generate_with_context(
        self,
        message: str,
        context: str,
        model: str = "gemini-2.0-flash",
        source_names: list[str] = None,
        persona_instructions: str = None
    ) -> dict:
        """Generate response with RAG context."""
        system_instruction = """You are a helpful research assistant.
Answer based on the provided context. Cite sources using [1], [2], etc.
If the context doesn't contain relevant information, say so."""

        if persona_instructions:
            system_instruction += f"\n\n{persona_instructions}"

        prompt = f"""Context from sources:
{context}

User question: {message}

Provide a helpful answer with citations."""

        return await self.generate_content(
            prompt=prompt,
            model=model,
            system_instruction=system_instruction
        )

    async def generate_audio_script(
        self,
        topic: str,
        format: str,  # deep_dive, brief, critique, debate
        context: str,
        duration_minutes: int = 10
    ) -> dict:
        """Generate podcast script."""
        format_instructions = {
            "deep_dive": f"""Create an engaging {duration_minutes}-minute podcast script
with two hosts (Alex and Sam) exploring this topic in depth. Include:
- Warm introduction
- Main discussion points
- Interesting tangents
- Natural conversation flow
- Strong conclusion""",
            "brief": """Create a 2-minute summary script with a single narrator.
Be concise and hit the key points quickly.""",
            "critique": f"""Create a {duration_minutes}-minute analytical podcast
with two hosts critically examining the content. Include:
- Fair assessment of strengths
- Thoughtful critique of weaknesses
- Balanced perspective""",
            "debate": f"""Create a {duration_minutes}-minute debate podcast
with two hosts taking opposing views. Include:
- Clear thesis and antithesis
- Supporting arguments for each side
- Respectful disagreement
- Nuanced conclusion"""
        }

        prompt = f"""{format_instructions.get(format, format_instructions['deep_dive'])}

Topic: {topic}

Source content:
{context}

Write the complete script with speaker labels."""

        return await self.generate_content(
            prompt=prompt,
            model="gemini-2.5-pro",
            temperature=0.8
        )

    async def text_to_speech(
        self,
        text: str,
        voice_name: str = "Kore"
    ) -> bytes:
        """Convert text to speech using Gemini TTS."""
        response = self.client.models.generate_content(
            model="gemini-2.5-pro-tts-preview",
            contents=text,
            config={
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": voice_name
                        }
                    }
                }
            }
        )

        # Extract audio data
        audio_data = response.candidates[0].content.parts[0].inline_data.data
        return audio_data

    async def generate_flashcards(
        self,
        content: str,
        count: int = 10
    ) -> list[dict]:
        """Generate flashcards from content."""
        prompt = f"""Generate {count} flashcards from this content.
Return as JSON array with "front" (question) and "back" (answer) fields.

Content:
{content}

Return ONLY the JSON array, no markdown."""

        result = await self.generate_content(
            prompt=prompt,
            model="gemini-2.0-flash",
            temperature=0.3
        )

        import json
        cards = json.loads(result["content"])
        return {"cards": cards, "usage": result["usage"]}

    async def generate_quiz(
        self,
        content: str,
        count: int = 5
    ) -> list[dict]:
        """Generate multiple choice quiz."""
        prompt = f"""Generate {count} multiple choice questions from this content.
Return as JSON array with fields:
- question: string
- options: array of 4 strings
- correct_index: 0-3
- explanation: string

Content:
{content}

Return ONLY the JSON array, no markdown."""

        result = await self.generate_content(
            prompt=prompt,
            model="gemini-2.0-flash",
            temperature=0.3
        )

        import json
        questions = json.loads(result["content"])
        return {"questions": questions, "usage": result["usage"]}

# Singleton instance
gemini_service = GeminiService()
```

## 5.4 TTS Voice Options

Available voices for `gemini-2.5-pro-tts-preview`:
- **Kore** - Calm, professional female
- **Charon** - Deep, authoritative male
- **Fenrir** - Energetic male
- **Aoede** - Warm, friendly female
- **Puck** - Playful, youthful
- **Orbit** - Neutral, clear

---

# 6. AtlasCloud Video Integration

## 6.1 Setup

```python
# app/services/atlascloud_video.py

import httpx
from app.config import settings

ATLASCLOUD_API_URL = "https://api.atlascloud.ai/v1"

class AtlasCloudVideoService:
    def __init__(self):
        self.api_key = settings.atlascloud_api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def generate_video(
        self,
        prompt: str,
        duration: int = 5,  # 5 or 10 seconds
        size: str = "1280x720"  # 1280x720, 720x1280, 1920x1080, 1080x1920
    ) -> dict:
        """Generate video using Wan 2.5."""

        async with httpx.AsyncClient() as client:
            # Start generation
            response = await client.post(
                f"{ATLASCLOUD_API_URL}/video/generate",
                headers=self.headers,
                json={
                    "model": "alibaba/wan-2.5/text-to-video-fast",
                    "prompt": prompt,
                    "duration": duration,
                    "size": size
                }
            )
            result = response.json()

            if "error" in result:
                raise Exception(result["error"])

            return {
                "job_id": result["id"],
                "status": result["status"],
                "estimated_cost": duration * 0.02  # ~$0.02/second
            }

    async def get_video_status(self, job_id: str) -> dict:
        """Check video generation status."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ATLASCLOUD_API_URL}/video/{job_id}",
                headers=self.headers
            )
            return response.json()

    async def download_video(self, video_url: str) -> bytes:
        """Download generated video."""
        async with httpx.AsyncClient() as client:
            response = await client.get(video_url)
            return response.content

atlascloud_service = AtlasCloudVideoService()
```

## 6.2 Video Generation Flow

```
1. User requests video → POST /notebooks/{id}/video
2. Backend generates script using Gemini
3. Backend sends prompt to AtlasCloud
4. AtlasCloud returns job_id
5. Backend polls for completion (or use webhook)
6. Once complete, download video
7. Upload to Supabase Storage
8. Update database with video_file_path
9. Frontend receives completion via Realtime
```

---

# 7. Authentication System

## 7.1 Dual Auth: JWT + API Keys

```python
# app/services/auth.py

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import jwt
import hashlib

security = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_api_key: str = Depends(api_key_header)
) -> dict:
    """Authenticate via JWT or API key."""

    # Priority: API Key > JWT
    if x_api_key:
        return await validate_api_key(x_api_key, request)
    elif credentials:
        return await validate_jwt(credentials.credentials)
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

async def validate_jwt(token: str) -> dict:
    """Validate Supabase JWT (no signature verification needed)."""
    try:
        # Supabase JWTs are already validated by Supabase Auth
        # We just need to decode and extract the user
        payload = jwt.decode(
            token,
            key="",  # Supabase validates
            options={"verify_signature": False}
        )
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "auth_type": "jwt"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def validate_api_key(key: str, request: Request) -> dict:
    """Validate API key and check rate limits."""
    key_hash = hashlib.sha256(key.encode()).hexdigest()

    # Look up key in database
    result = supabase.table("api_keys").select("*").eq("key_hash", key_hash).eq("is_active", True).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid API key")

    api_key = result.data[0]

    # Check expiration
    if api_key.get("expires_at") and api_key["expires_at"] < datetime.now().isoformat():
        raise HTTPException(status_code=401, detail="API key expired")

    # Check IP allowlist
    if api_key.get("allowed_ips") and len(api_key["allowed_ips"]) > 0:
        client_ip = request.client.host
        if client_ip not in api_key["allowed_ips"]:
            raise HTTPException(status_code=403, detail="IP not allowed")

    # Update last_used and increment counter
    supabase.table("api_keys").update({
        "last_used_at": datetime.now().isoformat(),
        "total_requests": api_key["total_requests"] + 1
    }).eq("id", api_key["id"]).execute()

    return {
        "user_id": api_key["user_id"],
        "auth_type": "api_key",
        "scopes": api_key.get("scopes", ["*"])
    }
```

## 7.2 API Key Format

```
Format: nb_live_{64_random_hex_chars}
Example: nb_live_a1b2c3d4e5f6...

Prefix stored: nb_live_a1b2c3d4e5f6 (first 20 chars for display)
Hash stored: SHA256(full_key)
```

---

# 8. Backend Implementation

## 8.1 Main Application

```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NotebookLM Reimagined API",
    version="1.0.0",
    description="API-first research intelligence platform"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from app.routers import (
    notebooks, sources, chat, audio, video,
    research, study, notes, export, api_keys,
    profile, studio, global_chat
)

# Register routers with /api/v1 prefix
app.include_router(notebooks.router, prefix="/api/v1", tags=["Notebooks"])
app.include_router(sources.router, prefix="/api/v1", tags=["Sources"])
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])
app.include_router(audio.router, prefix="/api/v1", tags=["Audio"])
app.include_router(video.router, prefix="/api/v1", tags=["Video"])
app.include_router(research.router, prefix="/api/v1", tags=["Research"])
app.include_router(study.router, prefix="/api/v1", tags=["Study"])
app.include_router(notes.router, prefix="/api/v1", tags=["Notes"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(api_keys.router, prefix="/api/v1", tags=["API Keys"])
app.include_router(profile.router, prefix="/api/v1", tags=["Profile"])
app.include_router(studio.router, prefix="/api/v1", tags=["Studio"])
app.include_router(global_chat.router, prefix="/api/v1", tags=["Global Chat"])

@app.get("/")
async def root():
    return {"message": "NotebookLM Reimagined API", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

## 8.2 Configuration

```python
# app/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Gemini
    google_api_key: str

    # AtlasCloud (optional)
    atlascloud_api_key: str = ""

    # App
    app_name: str = "NotebookLM Reimagined"
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

## 8.3 Supabase Client

```python
# app/services/supabase_client.py

from supabase import create_client, Client
from app.config import settings

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key  # Use service role for backend
)
```

## 8.4 Vercel Entry Point

```python
# api/index.py

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

# Export for Vercel
app = app
```

## 8.5 Vercel Configuration

```json
// vercel.json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.py"
    }
  ]
}
```

## 8.6 Requirements

```
# requirements.txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-dotenv>=1.0.0
supabase>=2.3.0
google-generativeai>=0.8.0
google-genai>=1.0.0
python-multipart>=0.0.6
pydantic>=2.5.0
pydantic-settings>=2.1.0
httpx>=0.24.0
sse-starlette>=2.0.0
python-jose[cryptography]>=3.3.0
aiofiles>=23.2.1
mangum>=0.17.0
```

---

# 9. Frontend Implementation

## 9.1 Core Setup

**package.json dependencies:**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "@tanstack/react-query": "^5.90.0",
    "@google/generative-ai": "^0.24.0",
    "framer-motion": "^12.0.0",
    "sonner": "^2.0.0",
    "next-themes": "^0.4.0",
    "react-markdown": "^10.0.0",
    "docx": "^9.5.0",
    "jspdf": "^3.0.0",
    "pptxgenjs": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0"
  }
}
```

## 9.2 Supabase Client

```typescript
// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types
export interface Notebook {
  id: string
  user_id: string
  name: string
  description?: string
  emoji: string
  settings: Record<string, any>
  source_count: number
  created_at: string
  updated_at: string
}

export interface Source {
  id: string
  notebook_id: string
  type: 'pdf' | 'docx' | 'txt' | 'youtube' | 'url' | 'audio' | 'text'
  name: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  file_path?: string
  metadata?: Record<string, any>
  source_guide?: {
    summary?: string
    topics?: string[]
    suggested_questions?: string[]
  }
  created_at: string
}

// ... more types for ChatSession, ChatMessage, AudioOverview, etc.
```

## 9.3 API Client

```typescript
// lib/api.ts
import { createClient } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'API request failed')
  }

  return response.json()
}

// API functions
export const api = {
  // Notebooks
  notebooks: {
    list: () => apiRequest<{ data: Notebook[] }>('/api/v1/notebooks'),
    get: (id: string) => apiRequest<{ data: Notebook }>(`/api/v1/notebooks/${id}`),
    create: (data: { name: string; emoji?: string }) =>
      apiRequest<{ data: Notebook }>('/api/v1/notebooks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Notebook>) =>
      apiRequest<{ data: Notebook }>(`/api/v1/notebooks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest(`/api/v1/notebooks/${id}`, { method: 'DELETE' }),
  },

  // Sources
  sources: {
    list: (notebookId: string) =>
      apiRequest<{ data: Source[] }>(`/api/v1/notebooks/${notebookId}/sources`),
    upload: async (notebookId: string, file: File) => {
      const token = await getAuthToken()
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${API_URL}/api/v1/notebooks/${notebookId}/sources`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      )
      return response.json()
    },
    addYouTube: (notebookId: string, url: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/sources/youtube`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    addUrl: (notebookId: string, url: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/sources/url`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    addText: (notebookId: string, name: string, content: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/sources/text`, {
        method: 'POST',
        body: JSON.stringify({ name, content }),
      }),
    delete: (notebookId: string, sourceId: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'DELETE',
      }),
  },

  // Chat
  chat: {
    send: (notebookId: string, message: string, sourceIds?: string[]) =>
      apiRequest<ChatResponse>(`/api/v1/notebooks/${notebookId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, source_ids: sourceIds }),
      }),
    sessions: (notebookId: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/chat/sessions`),
  },

  // Audio
  audio: {
    generate: (notebookId: string, format: string, customInstructions?: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/audio`, {
        method: 'POST',
        body: JSON.stringify({ format, custom_instructions: customInstructions }),
      }),
    list: (notebookId: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/audio`),
    get: (notebookId: string, audioId: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/audio/${audioId}`),
  },

  // Study materials
  study: {
    flashcards: (notebookId: string, count?: number) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/flashcards`, {
        method: 'POST',
        body: JSON.stringify({ count }),
      }),
    quiz: (notebookId: string, count?: number) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/quiz`, {
        method: 'POST',
        body: JSON.stringify({ count }),
      }),
    studyGuide: (notebookId: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/study-guide`, {
        method: 'POST',
      }),
    faq: (notebookId: string) =>
      apiRequest(`/api/v1/notebooks/${notebookId}/faq`, {
        method: 'POST',
      }),
  },
}
```

## 9.4 Theme System

```typescript
// providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export const THEMES = [
  { id: 'dark', name: 'Dark', description: 'Deep purple/blue tones' },
  { id: 'light', name: 'Light', description: 'Clean white background' },
  { id: 'midnight', name: 'Midnight Blue', description: 'Deep navy aesthetic' },
  { id: 'crimson', name: 'Crimson', description: 'Dark with red accents' },
]

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        themes={THEMES.map(t => t.id)}
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

## 9.5 Three-Panel Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Logo  │  Notebook Title  │  Theme  │  Settings  │  User Menu   │
├────────┼──────────────────────────────────────────┼──────────────┤
│        │                                          │              │
│ LEFT   │              CENTER                      │    RIGHT     │
│ PANEL  │              PANEL                       │    PANEL     │
│        │                                          │              │
│Sources │         Chat Interface                   │   Studio     │
│        │                                          │              │
│ □ PDF  │  [Message history with citations]        │ Audio Gen    │
│ □ Doc  │                                          │ Video Gen    │
│ □ URL  │                                          │ Research     │
│ □ YT   │                                          │ Flashcards   │
│        │                                          │ Quiz         │
│[+ Add] │  ┌────────────────────────────────┐     │ Study Guide  │
│        │  │ Type a message...              │     │ FAQ          │
│        │  └────────────────────────────────┘     │ Notes        │
│        │                                          │              │
└────────┴──────────────────────────────────────────┴──────────────┘
```

---

# 10. Deployment

## 10.1 Backend Deployment (Vercel)

```bash
# In backend/ directory
cd backend

# Link to Vercel project
vercel link

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_API_KEY
vercel env add ATLASCLOUD_API_KEY

# Deploy
vercel --prod
```

## 10.2 Frontend Deployment (Vercel)

```bash
# In frontend/ directory
cd frontend

# Link to Vercel project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_URL  # Backend URL from step 1
vercel env add GOOGLE_API_KEY
vercel env add ATLASCLOUD_API_KEY

# Deploy
vercel --prod
```

## 10.3 Post-Deployment Checklist

- [ ] Verify database migrations applied
- [ ] Verify RLS policies enabled on all tables
- [ ] Verify storage buckets created with policies
- [ ] Test authentication flow (signup/login)
- [ ] Test notebook creation
- [ ] Test source upload
- [ ] Test chat with citations
- [ ] Test audio generation
- [ ] Verify CORS configuration

---

# Quick Reference

## Gemini Models

| Use Case | Model | Cost |
|----------|-------|------|
| Chat (fast) | `gemini-2.0-flash` | $0.10/$0.40 per 1M tokens |
| Chat (quality) | `gemini-2.5-pro` | $1.25/$10.00 per 1M tokens |
| TTS | `gemini-2.5-pro-tts-preview` | ~$0.02/min |
| Flashcards | `gemini-2.0-flash` | $0.10/$0.40 per 1M tokens |

## Audio Formats

| Format | Duration | Hosts | Style |
|--------|----------|-------|-------|
| `deep_dive` | 6-15 min | 2 | Exploratory |
| `brief` | 1-3 min | 1 | Concise |
| `critique` | 5-10 min | 2 | Analytical |
| `debate` | 5-10 min | 2 | Opposing views |

## Video Styles

| Style | Description |
|-------|-------------|
| `documentary` | Professional narration |
| `explainer` | Educational breakdown |
| `presentation` | Business style |

---

**End of Specification**
