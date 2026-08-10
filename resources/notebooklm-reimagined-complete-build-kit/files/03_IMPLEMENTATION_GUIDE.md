# NotebookLM Reimagined: Implementation Guide

> **Step-by-Step Build Instructions for Claude**
>
> Follow this guide to build the complete application from scratch.

---

## For Claude: Before You Begin

**IMPORTANT: Ask the user to complete these setup steps first.**

### Required Setup Checklist

Before writing any code, ensure the user has:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PREREQUISITES CHECKLIST                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  □ 1. SUPABASE MCP CONFIGURED                                   │
│     Ask: "Do you have Supabase MCP set up in Claude Code?"      │
│     If no: Guide them to set it up first                        │
│                                                                  │
│  □ 2. SUPABASE PROJECT CREATED                                  │
│     Ask: "Do you have a Supabase project?"                      │
│     If no: "Please create one at supabase.com/dashboard"        │
│     Then: "Share your project URL and keys"                     │
│                                                                  │
│  □ 3. GEMINI API KEY                                            │
│     Ask: "Do you have a Google AI Studio API key?"              │
│     If no: "Get one at aistudio.google.com/app/apikey"          │
│                                                                  │
│  □ 4. VERCEL ACCOUNT (for deployment)                           │
│     Ask: "Do you have a Vercel account?"                        │
│     If no: "Sign up at vercel.com"                              │
│                                                                  │
│  □ 5. (OPTIONAL) ATLASCLOUD API KEY                             │
│     For video generation with Wan 2.5                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Verify Supabase MCP Works

Run this command to verify MCP access:
```
mcp__supabase__list_projects
```

If this works, you can proceed. If not, help the user configure MCP first.

---

## Phase 1: Database Setup (Use Supabase MCP)

### 1.1 Create Database Schema

Use `mcp__supabase__apply_migration` to create each table. Apply these migrations in order:

**Migration 1: profiles**
```sql
-- Migration: 001_create_profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
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

**Migration 2: notebooks**
```sql
-- Migration: 002_create_notebooks
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📓',
  settings JSONB DEFAULT '{}',
  file_search_store_id TEXT,
  source_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
```

**Migration 3: sources**
```sql
-- Migration: 003_create_sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  token_count INT,
  metadata JSONB DEFAULT '{}',
  source_guide JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_notebook_id ON sources(notebook_id);
```

**Migration 4: chat_sessions and chat_messages**
```sql
-- Migration: 004_create_chat
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  source_ids_used JSONB DEFAULT '[]',
  model_used TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_notebook_id ON chat_sessions(notebook_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

**Migration 5: audio_overviews**
```sql
-- Migration: 005_create_audio_overviews
CREATE TABLE audio_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  format TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  custom_instructions TEXT,
  source_ids JSONB DEFAULT '[]',
  script TEXT,
  audio_file_path TEXT,
  duration_seconds INT,
  model_used TEXT,
  cost_usd DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_audio_overviews_notebook_id ON audio_overviews(notebook_id);
```

**Migration 6: video_overviews**
```sql
-- Migration: 006_create_video_overviews
CREATE TABLE video_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  style TEXT NOT NULL,
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

**Migration 7: research_tasks**
```sql
-- Migration: 007_create_research_tasks
CREATE TABLE research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  mode TEXT DEFAULT 'fast',
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

**Migration 8: notes**
```sql
-- Migration: 008_create_notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'written',
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

**Migration 9: api_keys**
```sql
-- Migration: 009_create_api_keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB DEFAULT '["*"]',
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

**Migration 10: usage_logs**
```sql
-- Migration: 010_create_usage_logs
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

### 1.2 Enable Row Level Security

```sql
-- Migration: 011_enable_rls
-- Enable RLS on all tables
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
```

### 1.3 Create RLS Policies

```sql
-- Migration: 012_create_rls_policies

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Notebooks
CREATE POLICY "Users can view own notebooks" ON notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notebooks" ON notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notebooks" ON notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks" ON notebooks FOR DELETE USING (auth.uid() = user_id);

-- Sources (via notebook ownership)
CREATE POLICY "Users can view sources" ON sources FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create sources" ON sources FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can update sources" ON sources FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete sources" ON sources FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- Chat sessions
CREATE POLICY "Users can view chat sessions" ON chat_sessions FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create chat sessions" ON chat_sessions FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete chat sessions" ON chat_sessions FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- Chat messages (via session → notebook)
CREATE POLICY "Users can view chat messages" ON chat_messages FOR SELECT
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN notebooks n ON cs.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  ));
CREATE POLICY "Users can create chat messages" ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN notebooks n ON cs.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  ));

-- Audio overviews
CREATE POLICY "Users can view audio" ON audio_overviews FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create audio" ON audio_overviews FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can update audio" ON audio_overviews FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete audio" ON audio_overviews FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- Video overviews (same pattern)
CREATE POLICY "Users can view video" ON video_overviews FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create video" ON video_overviews FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can update video" ON video_overviews FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete video" ON video_overviews FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- Research tasks (same pattern)
CREATE POLICY "Users can view research" ON research_tasks FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create research" ON research_tasks FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can update research" ON research_tasks FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- Notes (same pattern)
CREATE POLICY "Users can view notes" ON notes FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can create notes" ON notes FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can update notes" ON notes FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete notes" ON notes FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- API keys
CREATE POLICY "Users can view own api keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own api keys" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api keys" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api keys" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- Usage logs
CREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own usage" ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 1.4 Create Storage Buckets

Use `mcp__supabase__execute_sql` for this:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('sources', 'sources', false),
  ('audio', 'audio', false),
  ('video', 'video', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload to sources" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sources' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own sources" ON storage.objects FOR SELECT
  USING (bucket_id = 'sources' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own sources" ON storage.objects FOR DELETE
  USING (bucket_id = 'sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own audio" ON storage.objects FOR SELECT
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own audio" ON storage.objects FOR DELETE
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload video" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own video" ON storage.objects FOR SELECT
  USING (bucket_id = 'video' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own video" ON storage.objects FOR DELETE
  USING (bucket_id = 'video' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 1.5 Enable Realtime

```sql
-- Enable realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE audio_overviews;
ALTER PUBLICATION supabase_realtime ADD TABLE video_overviews;
ALTER PUBLICATION supabase_realtime ADD TABLE research_tasks;
```

### 1.6 Verify Schema

After all migrations, verify with:
```
mcp__supabase__list_tables
```

Expected tables: profiles, notebooks, sources, chat_sessions, chat_messages, audio_overviews, video_overviews, research_tasks, notes, api_keys, usage_logs

---

## Phase 2: Backend Implementation

### 2.1 Create Project Structure

```bash
mkdir -p backend/api backend/app/routers backend/app/services backend/app/models
```

Create these files:

```
backend/
├── api/
│   └── index.py
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── notebooks.py
│   │   ├── sources.py
│   │   ├── chat.py
│   │   ├── audio.py
│   │   ├── video.py
│   │   ├── research.py
│   │   ├── study.py
│   │   ├── notes.py
│   │   ├── export.py
│   │   ├── api_keys.py
│   │   └── profile.py
│   └── services/
│       ├── __init__.py
│       ├── gemini.py
│       ├── atlascloud_video.py
│       ├── auth.py
│       └── supabase_client.py
├── requirements.txt
├── vercel.json
└── .env
```

### 2.2 Implementation Order

Build in this order for incremental testing:

1. **config.py** → Settings and environment variables
2. **supabase_client.py** → Database connection
3. **auth.py** → JWT and API key authentication
4. **gemini.py** → Gemini API integration
5. **schemas.py** → Pydantic models
6. **main.py** → FastAPI app setup
7. **notebooks.py** → CRUD operations
8. **sources.py** → File upload and processing
9. **chat.py** → RAG chat with citations
10. **audio.py** → Audio generation
11. **study.py** → Flashcards, quiz, study guide
12. **notes.py** → Notes management
13. **video.py** → Video generation
14. **research.py** → Deep Research
15. **export.py** → JSON/ZIP export
16. **api_keys.py** → API key management
17. **profile.py** → User profile

### 2.3 Key Implementation Patterns

**Null-safety for optional fields:**
```python
# WRONG - fails if source_guide is None
source.get("source_guide", {}).get("summary")

# CORRECT - handles None values
source_guide = source.get("source_guide") or {}
source_guide.get("summary")
```

**Source content extraction (used in chat, audio, study):**
```python
async def get_sources_content(notebook_id: str, source_ids: list = None):
    """Extract content from sources for context."""
    query = supabase.table("sources").select("*").eq("notebook_id", notebook_id).eq("status", "ready")

    if source_ids:
        query = query.in_("id", source_ids)

    result = query.execute()

    context_parts = []
    source_map = {}

    for i, source in enumerate(result.data):
        source_guide = source.get("source_guide") or {}
        metadata = source.get("metadata") or {}

        # Extract content based on type
        if source["type"] == "text" and metadata.get("content"):
            content = metadata["content"]
        elif source_guide.get("summary"):
            content = source_guide["summary"]
        else:
            content = f"[Source: {source['name']}]"

        context_parts.append(f"[{i+1}] {source['name']}:\n{content}")
        source_map[i+1] = source

    return "\n\n".join(context_parts), source_map
```

**Cost tracking:**
```python
async def log_usage(user_id: str, notebook_id: str, operation: str, usage: dict):
    """Log AI operation usage."""
    supabase.table("usage_logs").insert({
        "user_id": user_id,
        "notebook_id": notebook_id,
        "operation_type": operation,
        "model_used": usage.get("model_used"),
        "input_tokens": usage.get("input_tokens"),
        "output_tokens": usage.get("output_tokens"),
        "cost_usd": usage.get("cost_usd")
    }).execute()
```

### 2.4 Testing Each Router

After implementing each router, test with curl:

```bash
# Test notebooks
curl -X POST http://localhost:8000/api/v1/notebooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Notebook"}'

# Test sources
curl -X POST http://localhost:8000/api/v1/notebooks/{id}/sources/text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "content": "This is test content"}'

# Test chat
curl -X POST http://localhost:8000/api/v1/notebooks/{id}/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is this about?"}'
```

---

## Phase 3: Frontend Implementation

### 3.1 Create Next.js Project

```bash
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir
cd frontend
```

### 3.2 Install Dependencies

```bash
npm install @supabase/ssr @supabase/supabase-js @tanstack/react-query \
  @google/generative-ai framer-motion sonner next-themes react-markdown \
  docx jspdf pptxgenjs lucide-react

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog input textarea select tabs \
  dropdown-menu avatar badge progress toast tooltip
```

### 3.3 Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Dashboard (notebook list)
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── notebooks/
│   │   └── [id]/
│   │       └── page.tsx    # Three-panel notebook view
│   ├── profile/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── ui/                 # shadcn components
│   ├── dashboard/
│   │   ├── header.tsx
│   │   └── notebook-card.tsx
│   ├── chat/
│   │   ├── chat-panel.tsx
│   │   ├── message-item.tsx
│   │   └── citation-popup.tsx
│   ├── sources/
│   │   ├── source-list.tsx
│   │   └── upload-dialog.tsx
│   └── studio/
│       ├── studio-panel.tsx
│       ├── audio-generator.tsx
│       └── study-materials.tsx
├── lib/
│   ├── supabase.ts
│   ├── api.ts
│   └── gemini.ts
├── providers.tsx
└── globals.css
```

### 3.4 Implementation Order

1. **lib/supabase.ts** → Supabase client and types
2. **lib/api.ts** → Backend API client
3. **providers.tsx** → Query client and theme provider
4. **globals.css** → Theme CSS variables
5. **app/layout.tsx** → Root layout
6. **Auth pages** → Login/register
7. **Dashboard** → Notebook list
8. **Notebook view** → Three-panel layout
9. **Source components** → Upload, list, delete
10. **Chat components** → Messages, citations
11. **Studio components** → Audio, study materials

### 3.5 Theme CSS Variables

Add to `globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... more variables */
  }

  .dark {
    /* Dark theme */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... more variables */
  }

  .midnight {
    /* Midnight Blue theme */
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    /* ... */
  }

  .crimson {
    /* Crimson theme */
    --background: 0 0% 8%;
    --foreground: 0 0% 95%;
    --primary: 0 72% 51%;
    /* ... */
  }
}
```

---

## Phase 4: Deployment

### 4.1 Backend Deployment to Vercel

**Step 1: Create vercel.json**
```json
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

**Step 2: Create api/index.py**
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.main import app
app = app
```

**Step 3: Deploy**
```bash
cd backend
vercel link
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_API_KEY
vercel --prod
```

Note the deployment URL (e.g., `https://your-api.vercel.app`)

### 4.2 Frontend Deployment to Vercel

**Step 1: Set environment variables**
```bash
cd frontend
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_URL  # Backend URL from above
```

**Step 2: Deploy**
```bash
vercel --prod
```

### 4.3 Post-Deployment Verification

Run these checks:

```bash
# 1. Health check
curl https://your-api.vercel.app/health

# 2. Test auth (get token from frontend)
curl https://your-api.vercel.app/api/v1/notebooks \
  -H "Authorization: Bearer $TOKEN"

# 3. Test notebook creation
curl -X POST https://your-api.vercel.app/api/v1/notebooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# 4. Open frontend and test:
# - Sign up / login
# - Create notebook
# - Add source (text paste)
# - Chat with source
# - Generate flashcards
```

---

## Troubleshooting

### Common Issues

**1. "Authentication required" error**
- Check token is being passed in Authorization header
- Verify Supabase auth is working
- Check if JWT is expired

**2. RLS policy errors**
- Verify user_id is being set correctly
- Check policy syntax in Supabase dashboard
- Test with service role key temporarily

**3. CORS errors**
- Add frontend URL to CORS origins in main.py
- Check Vercel deployment settings

**4. Gemini API errors**
- Verify API key is valid
- Check model name is correct
- Review rate limits

**5. Storage upload fails**
- Check bucket exists
- Verify storage policies
- Check file size limits

### Debug Commands

```bash
# Check Supabase tables
mcp__supabase__list_tables

# Run SQL query
mcp__supabase__execute_sql --query "SELECT * FROM notebooks LIMIT 5"

# Check migrations
mcp__supabase__list_migrations
```

---

## Quick Reference

### MCP Commands

| Command | Description |
|---------|-------------|
| `mcp__supabase__list_projects` | List all projects |
| `mcp__supabase__list_tables` | List tables in project |
| `mcp__supabase__apply_migration` | Create/modify tables |
| `mcp__supabase__execute_sql` | Run SQL queries |
| `mcp__supabase__generate_typescript_types` | Generate types |

### API Response Format

```json
{
  "data": { /* result */ },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.0023,
    "model_used": "gemini-2.0-flash"
  }
}
```

### Audio Formats

| Format | Duration | Description |
|--------|----------|-------------|
| `deep_dive` | 6-15 min | Two hosts, exploratory |
| `brief` | 1-3 min | Single narrator, concise |
| `critique` | 5-10 min | Two hosts, analytical |
| `debate` | 5-10 min | Two hosts, opposing views |

### Gemini Models

| Model | Use Case | Cost |
|-------|----------|------|
| `gemini-2.0-flash` | Fast chat | $0.10/$0.40 per 1M |
| `gemini-2.5-pro` | Quality | $1.25/$10 per 1M |
| `gemini-2.5-pro-tts-preview` | TTS | ~$0.02/min |

---

## Completion Checklist

### Phase 1: Database
- [ ] All 11 tables created
- [ ] RLS enabled on all tables
- [ ] Policies created for all tables
- [ ] Storage buckets created
- [ ] Realtime enabled

### Phase 2: Backend
- [ ] Config and auth working
- [ ] Gemini service working
- [ ] Notebooks CRUD working
- [ ] Sources upload working
- [ ] Chat with citations working
- [ ] Audio generation working
- [ ] Study materials working
- [ ] All routers registered

### Phase 3: Frontend
- [ ] Auth pages working
- [ ] Dashboard showing notebooks
- [ ] Notebook view with 3 panels
- [ ] Source upload working
- [ ] Chat working with citations
- [ ] Studio panel working

### Phase 4: Deployment
- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] End-to-end test passing

---

**You're ready to build! Follow this guide step by step, and don't skip the verification steps.**
