# Infrastructure Options Reference

When the user reaches Phase 3 (infrastructure choice), present the options that match their interview profile. Pull the LATEST docs for their chosen option before building.

## Decision Matrix

| If they chose... | Recommend... |
|---|---|
| Markdown format + flat structure + keyword retrieval | **Plain Markdown** |
| Markdown format + taxonomy + keyword retrieval | **Plain Markdown** (with structured folders) |
| Obsidian format (any structure/retrieval) | **Obsidian** |
| Database format + any structure + semantic retrieval | **SQLite + sqlite-vec** (local) or **Supabase pgvector** (cloud) |
| Database format + graph structure | **SQLite** (with custom graph tables) |
| Cloud access + team use | **Supabase pgvector** or **Pinecone** |
| Maximum simplicity + non-technical | **Obsidian** or **Plain Markdown** |
| Graph structure + codebase understanding | **Graphify** (AST knowledge graph, zero LLM cost for code) |
| Multimodal (code + docs + images + video) | **Graphify** + any storage backend |
| Maximum power + technical | **SQLite + sqlite-vec** |

---

## Option 1: Plain Markdown

### When to recommend
- User wants human-readable, git-versionable memory
- User prefers simplicity
- User doesn't need semantic search (keyword/grep is enough)

### Setup commands
```bash
# Create memory directory structure
mkdir -p .memory/{daily,knowledge,archive}

# Create the core files
touch .memory/PRIME.md          # Critical context, always loaded (~200 tokens)
touch .memory/MEMORY.md         # Active memory index
touch .memory/CONTINUATION.md   # Session handoff (updated before context limit)
```

### Hook configuration (.claude/settings.json)
```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "cat .memory/PRIME.md 2>/dev/null || true",
        "additionalContext": true
      }
    ],
    "PreCompact": [
      {
        "type": "command",
        "command": "cat .memory/PRIME.md 2>/dev/null || true",
        "additionalContext": true
      }
    ]
  }
}
```

### File templates

**PRIME.md** (always loaded, keep under 200 tokens):
```markdown
# Prime Context
**Project:** [name]
**Stack:** [key technologies]
**Current focus:** [what we're working on]
**Key decisions:** [1-3 most important recent decisions]
**Blockers:** [anything blocked right now]
```

**MEMORY.md** (active memory, tiered):
```markdown
# Memory

## Facts
- [Permanent knowledge about the project]

## Events
- [YYYY-MM-DD] [What happened]

## Discoveries
- [Non-obvious insights learned]

## Preferences
- [User preferences, coding style, tool choices]

## Advice
- [Recommendations and best practices discovered]
```

---

## Option 2: Obsidian

### When to recommend
- User already uses Obsidian
- User wants visual graph view
- User wants mobile access (Obsidian Sync)
- User is a knowledge worker / content creator

### Setup commands
```bash
# Check if Obsidian CLI is installed
obsidian --version 2>/dev/null || echo "Install Obsidian CLI: https://obsidian.md/download"

# Install official Obsidian skills
npx @anthropic-ai/agent-skills add kepano/obsidian-skills

# Create vault structure (or use existing)
# The skill will handle vault creation based on user's taxonomy choice
```

### Vault structure (taxonomy-based)
```
vault/
  _PRIME.md              # Critical context (~120 tokens)
  _INDEX.md              # Master catalog
  inbox/                 # New unsorted items
  facts/                 # Permanent knowledge
  events/                # Timestamped occurrences
  discoveries/           # Non-obvious insights
  preferences/           # User/project preferences
  advice/                # Recommendations
  daily/                 # YYYY-MM-DD session logs
  archive/               # Compressed old content
```

### Hook for Obsidian context injection
```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "obsidian read '_PRIME.md' --vault 'MyVault' 2>/dev/null || cat ~/path/to/vault/_PRIME.md 2>/dev/null || true",
        "additionalContext": true
      }
    ]
  }
}
```

---

## Option 3: SQLite + sqlite-vec

### When to recommend
- User wants semantic search (find by meaning)
- User wants local-first (no cloud dependency)
- User is comfortable with technical setup
- User wants hybrid search (keyword + semantic)

### Setup commands
```bash
# Install dependencies
pip install sqlite-vec fastembed

# Or for the full stack:
pip install sqlite-vec fastembed numpy
```

### Schema
```sql
-- Core tables
CREATE TABLE memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,          -- fact, event, discovery, preference, advice
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    project TEXT,
    session_id TEXT,
    priority TEXT DEFAULT 'P2',  -- P1=permanent, P2=active, P3=ephemeral
    confidence REAL DEFAULT 1.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    topic_key TEXT               -- for upsert pattern
);

-- Full-text search
CREATE VIRTUAL TABLE memories_fts USING fts5(
    title, content, type, project,
    content='memories', content_rowid='id'
);

-- Vector search (384-dim embeddings)
CREATE VIRTUAL TABLE memories_vec USING vec0(
    embedding float[384]
);

-- Triggers to keep FTS in sync
CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, title, content, type, project)
    VALUES (new.id, new.title, new.content, new.type, new.project);
END;
```

### Embedding generation
```python
from fastembed import TextEmbedding

model = TextEmbedding("BAAI/bge-small-en-v1.5")  # 384-dim, runs locally

def embed(text):
    return list(model.embed([text]))[0].tolist()
```

### Hybrid search with Reciprocal Rank Fusion
```python
def hybrid_search(query, k=10, rrf_k=60):
    # FTS5 keyword search
    fts_results = db.execute("""
        SELECT rowid, rank FROM memories_fts
        WHERE memories_fts MATCH ? ORDER BY rank LIMIT ?
    """, (query, k * 2)).fetchall()

    # Vector similarity search
    query_vec = embed(query)
    vec_results = db.execute("""
        SELECT rowid, distance FROM memories_vec
        WHERE embedding MATCH ? ORDER BY distance LIMIT ?
    """, (serialize_f32(query_vec), k * 2)).fetchall()

    # Reciprocal Rank Fusion
    scores = {}
    for rank, (rowid, _) in enumerate(fts_results):
        scores[rowid] = scores.get(rowid, 0) + 1.0 / (rrf_k + rank + 1)
    for rank, (rowid, _) in enumerate(vec_results):
        scores[rowid] = scores.get(rowid, 0) + 1.0 / (rrf_k + rank + 1)

    return sorted(scores.items(), key=lambda x: x[1], reverse=True)[:k]
```

---

## Option 4: Supabase pgvector

### When to recommend
- User wants cloud-hosted (multi-device, team access)
- User wants managed infrastructure
- User is familiar with Supabase or PostgreSQL
- User wants real SQL queries + vector search

### Setup commands
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Init project (or link existing)
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

### Pull latest docs before building
```
WebFetch: https://supabase.com/docs/guides/ai/vector-columns
```

### Migration
```sql
-- Enable pgvector
create extension if not exists vector;

-- Memories table
create table memories (
    id bigint primary key generated always as identity,
    type text not null check (type in ('fact', 'event', 'discovery', 'preference', 'advice')),
    title text not null,
    content text not null,
    embedding vector(384),
    project text,
    session_id text,
    priority text default 'P2',
    confidence float default 1.0,
    topic_key text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Similarity search index
create index on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Full-text search index
create index memories_fts on memories using gin (to_tsvector('english', title || ' ' || content));

-- RLS policies (if needed)
alter table memories enable row level security;
```

### Connection from Claude Code hooks
```python
import os
from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_KEY"]
supabase = create_client(url, key)

# Store memory
supabase.table("memories").insert({
    "type": "discovery",
    "title": "Auth pattern",
    "content": "Supabase RLS is simpler than custom middleware",
    "embedding": embed("Auth pattern: Supabase RLS is simpler than custom middleware"),
    "project": "my-app",
}).execute()

# Hybrid search
result = supabase.rpc("hybrid_search", {
    "query_text": "authentication patterns",
    "query_embedding": embed("authentication patterns"),
    "match_count": 10,
}).execute()
```

---

## Option 5: Pinecone

### When to recommend
- User wants zero-infrastructure vector search
- User wants serverless (pay per query)
- User needs to scale to millions of memories
- User doesn't want to manage a database

### Setup commands
```bash
# Install SDK
pip install pinecone
```

### Pull latest docs before building
```
WebFetch: https://docs.pinecone.io/guides/get-started/overview
```

### Index creation
```python
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

# Create serverless index
pc.create_index(
    name="claude-memory",
    dimension=384,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

index = pc.Index("claude-memory")
```

### Store and retrieve
```python
# Store
index.upsert(vectors=[{
    "id": f"mem_{uuid4().hex[:8]}",
    "values": embed("Supabase RLS is simpler than custom middleware"),
    "metadata": {
        "type": "discovery",
        "title": "Auth pattern",
        "content": "Supabase RLS is simpler than custom middleware",
        "project": "my-app",
        "priority": "P2",
        "created_at": datetime.now().isoformat(),
    },
}])

# Search
results = index.query(
    vector=embed("authentication patterns"),
    top_k=10,
    include_metadata=True,
    filter={"project": {"$eq": "my-app"}},
)
```

---

## Universal Patterns (Apply to ANY infrastructure)

These patterns work regardless of which backend the user chose:

1. **PRIME.md / CRITICAL_FACTS.md** - Always have a <200 token file that loads at SessionStart AND PreCompact
2. **SessionStart + PreCompact hooks** - Memory must survive context compaction
3. **Privacy tags** - `<private>sensitive data</private>` stripped before storage
4. **5-type taxonomy** - Facts, Events, Discoveries, Preferences, Advice (works in any format)
5. **Progressive disclosure** - Search returns summaries first, full details on demand
6. **Session handoff** - Before ending, write a CONTINUATION.md with exact resume point
