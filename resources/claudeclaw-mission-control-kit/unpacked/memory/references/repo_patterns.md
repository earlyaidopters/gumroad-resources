# Memory Design Patterns Reference

This file maps proven memory patterns to the 6 design dimensions. When the user completes their interview, match their answers to the patterns below. Present patterns by what they do, not where they came from.

## CAPTURE Dimension

### Auto-capture (everything, via hooks)
| Pattern | What It Does |
|---|---|
| Lifecycle hook capture | Zero-intervention. Hooks fire at SessionStart, PostToolUse, Stop, and SessionEnd to observe tool usage and decisions automatically. |
| PreCompact context preservation | Saves a transcript summary BEFORE Claude's context compression fires. Prevents knowledge loss during long sessions. |
| Message classification routing | Every message auto-classified (decision? incident? win? architecture?) and routed to the right file/folder. |
| Session-end auto-sync | Hook fires at session end, copies conversations to archive, indexes them. Zero manual intervention. |
| Queue-based async tracking | Hooks write to a `.memory-queue.jsonl` file (producer). A separate process reads the queue (consumer). Reliable, testable. |

### Selective capture (manual, signal-based)
| Pattern | What It Does |
|---|---|
| Signal keyword filtering | Only captures turns containing keywords like "decision", "bug", "remember" plus N surrounding turns for context. Everything else ignored. |
| Three-command manual cycle | You control every save. /preserve updates context, /compress archives session, /resume loads it back. |
| Distillation trigger word | Define a keyword (like "save" or "consolidate") that dumps everything important to disk on demand. |
| Reflective evaluation | Stop hook triggers Claude to evaluate whether changes are worth documenting. Reduces noise for trivial tasks. |

### Balanced capture
| Pattern | What It Does |
|---|---|
| Error-only auto-capture | PostToolUse monitors for errors only (~30 tokens overhead on failure, zero on success). Everything else is manual. |
| Tool-based filtering | Only captures turns where specific tools were used (e.g., Edit, Write). Skips discussion, captures action. |
| Agent-generated facts as first-class | When the AI confirms an action ("I've booked your flight" or "I've updated the config"), that gets stored with equal weight to user statements. Most systems only capture what the user said, missing half the story. |
| Single-pass ADD-only extraction | One LLM call extracts facts from a conversation. It only ADDs, never updates or deletes existing memories. Old and new facts coexist. This cuts extraction latency in half and produces better memories because the model spends its capacity understanding the input rather than diffing against existing state. |

---

## FORMAT Dimension

### Human-readable (markdown)
| Pattern | What It Does |
|---|---|
| Daily dated markdown files | One file per day: `YYYY-MM-DD.md`. Any search index is a derived "shadow" that rebuilds from these files. Git-versionable, human-editable. |
| Header/raw session split | Each session log has a structured header (30-80 lines) for retrieval. Full conversation below a separator, never loaded but always searchable via grep. |
| Daily-to-knowledge compilation | Daily logs are immutable "source code." A scheduled process compiles them into structured knowledge articles with cross-references and an index. |
| Session handoff document | Ultra-compact file (under 50 lines, under 500 tokens) with exact resume point: file, function, line number, what's done, what's next. |

### Database (SQLite, vector, graph)
| Pattern | What It Does |
|---|---|
| Dual-scope SQLite (project + global) | Two databases: one for global user preferences, one for project-specific knowledge. Subject-predicate-object triples with automatic truth maintenance. |
| Version-controlled SQL (Dolt) | Git for data. Hash-based IDs prevent merge collisions across branches. Full history, branching, diffing on your database. |
| Single-file SQLite with FTS5 | One binary, one database file. Full-text search built in. Topic key upsert pattern: evolving decisions update in place instead of creating duplicates. |
| 4-graph knowledge store | Four edge types in one graph: semantic (similar content), temporal (created near each other), causal (because/therefore), entity (shared mentions). Edges strengthen when recalled together, decay when unused. |

### Obsidian vault
| Pattern | What It Does |
|---|---|
| Zettelkasten + codebase knowledge graph | Single vault for ALL projects. AST-based code graph sits alongside your notes. Cross-project connections emerge in graph view. |
| PARA method vault | Projects, Areas, Resources, Archive. Interactive setup wizard imports existing vaults and personalizes the structure. |
| Self-rewriting vault | Ingestion doesn't just create new notes. It rewrites 5-15 existing pages, resolves contradictions, creates synthesis across sources. Tracks when facts changed. |
| Workplace-first vault | Career management system. Auto-detects accomplishments for your brag doc. Performance backlinks become evidence at review time. |

### Cloud database
| Pattern | What It Does |
|---|---|
| Cloud API with namespace containers | Personal vs team vs repo namespaces in a hosted service. Signal extraction mode. Codebase indexing command. |
| Multi-level scoping | Every memory tagged with user_id, session_id, agent_id. Three distinct retrieval scopes from one system. |

---

## STRUCTURE Dimension

### Flat files
| Pattern | What It Does |
|---|---|
| Daily dated files | `YYYY-MM-DD.md`. Session anchors via HTML comments. Opt-in summarization command to reduce size over time. |
| Plain JSON store | `.memories.json`. Zero dependencies. Two-way sync with CLAUDE.md catches when your context file drifts from reality. |
| Lite-to-full promotion | Start with 2 files, graduate to 7+ as the project grows. Avoids the empty-template problem on small projects. |

### Categorized / Taxonomy
| Pattern | What It Does |
|---|---|
| 5-type taxonomy | Facts, Events, Discoveries, Preferences, Advice. Every memory goes into one of five buckets. Filtering by type gives a 34% retrieval improvement over flat search. |
| 3-tier priority tagging | [P1] permanent (architecture decisions, preferences), [P2] active (current state, recent decisions), [P3] ephemeral (debugging details). Each tagged with an `observed:` date for evidence-based pruning. |
| Promotion lifecycle | Pattern observed -> captured automatically -> recurs 2-3x -> promoted to permanent rules -> removed from active memory. Knowledge graduates upward, freeing space. |
| Identity separation | Three distinct files: agent identity (who the AI is), user profile (who you are), and active memory (what happened). Keeps concerns clean. |
| Structured save format | Every memory entry requires: What, Why, Where, Learned. Forces disciplined entries. A stable topic key means evolving decisions update in place. |

### Graph / Hierarchy
| Pattern | What It Does |
|---|---|
| Spatial hierarchy | Organize by Project > Category > Topic. Metadata filtering at each level compounds. Project+category = 85% recall. Project+topic = 95% recall. |
| Dependency graph with typed relationships | Four relationship types: blocks, related, parent-child, discovered-from. A "ready" command traverses the graph and returns only tasks with zero open blockers. |
| 4-edge knowledge graph | Semantic + temporal + causal + entity edges. Intent-aware recall: "why?" follows causal edges, "when?" follows temporal edges. |
| Self-evolving knowledge graph | New memory triggers a search for related existing memories. An LLM decides whether to link, merge, or strengthen connections. The graph reorganizes itself over time. |
| Temporal fact management | Knowledge graph edges have valid_from/valid_until windows. Facts can be superseded, not just deleted. Query historical vs current state. |
| Codebase knowledge graph (AST, zero LLM cost) | Tree-sitter parses your code into a knowledge graph deterministically. Classes, functions, imports, call graphs, docstrings, rationale comments. 25 languages. No API calls. Persistent graph.json queryable across sessions. 71.5x fewer tokens per query vs reading raw files. |
| Confidence-tagged relationships | Every relationship tagged EXTRACTED (found directly in source), INFERRED (reasonable inference with a confidence score), or AMBIGUOUS (flagged for review). You always know what was found vs guessed. |
| Multimodal graph | Not just code and text. PDFs, screenshots, whiteboard photos, video/audio transcripts all become nodes in the same graph. Videos transcribed locally with Whisper. Everything connected. |
| Community detection (topology-based clustering) | Leiden algorithm finds communities by edge density. No embeddings needed. The graph structure itself is the similarity signal. Discovers which concepts cluster together without any vector database. |

---

## RETRIEVAL Dimension

### Keyword / simple
| Pattern | What It Does |
|---|---|
| Full-text search (FTS5) | SQLite built-in. Fast, reliable, zero dependencies. Works offline. |
| Keyword tags per session | Each session log has extracted keyword tags. A poor man's embedding layer. Topic search across all sessions without any vector DB. |
| Semantic keyword expansion | Search for "auth" and it expands to: authentication, login, session, jwt, oauth, nextauth, clerk, token. No embeddings needed, just a synonym map. |
| Index-guided retrieval (no RAG) | One markdown index file listing all knowledge articles. At personal scale (50-500 articles), an LLM reading a structured index outperforms vector similarity. |
| Graph-first querying | Read a one-page graph report (god nodes, communities, surprising connections) before searching raw files. Navigate by structure instead of keyword matching. 71.5x fewer tokens. The assistant gets a MAP of the codebase, not a text dump. |

### Semantic / vector
| Pattern | What It Does |
|---|---|
| Local embeddings (no API key) | BAAI/bge-small-en-v1.5 via fastembed. 384-dim vectors, runs entirely on-device. Zero cloud dependency. |
| Pluggable embedding providers | ONNX local by default, but swap to OpenAI, Google, Voyage, Jina, or Ollama with one config line. |
| Multi-concept AND search | Pass an array of concepts like ["React Router", "authentication", "JWT"] and find memories matching ALL of them. Intersection, not union. |
| Graph-following search | Initial vector results lead to structurally connected but semantically distant memories. Discovers things flat search misses. |

### Hybrid
| Pattern | What It Does |
|---|---|
| Reciprocal Rank Fusion (keyword + vector) | Run keyword search and vector search independently, then fuse their rankings using RRF. Score-agnostic, so different search methods combine cleanly. |
| Tri-hybrid search | BM25 (keyword) + vector (semantic) + Personalized PageRank (graph relationships). Three fundamentally different strategies merged via RRF. |
| Tiered search degradation | Five tiers: keyword (always works) -> BM25 (optional) -> fuzzy (optional) -> semantic (optional) -> hybrid. Each optional dependency unlocks a better tier. Start simple, upgrade later. |
| Multi-signal retrieval fusion | Three scoring passes run in parallel: semantic similarity, keyword matching, and entity matching. Results are fused via rank scoring. Different queries lean on different signals. A "what does Alice think?" query leans on entity matching. A "what happened last week?" leans on temporal. The combined score outperforms any individual signal. Under 7,000 tokens per retrieval call vs 25,000+ for full-context approaches. |
| Entity linking layer | Every memory is analyzed for entities (proper nouns, quoted text, compound noun phrases). Entities are embedded and stored in a separate lookup layer, linking memories about the same person, place, or concept. At query time, entities from the query are matched against this layer, and relevant memories get a ranking boost. |
| Keyword normalization | Queries like "what meetings did I attend?" match memories containing "attending a meeting." Verb form normalization prevents conjugation variants from being treated as different tokens. Small change, measurable impact. |

---

## INJECTION Dimension

### Load everything
| Pattern | What It Does |
|---|---|
| Single context file | Everything in CLAUDE.md. Simple. Works when your memory is small (under 500 lines). |
| Wiki index injection | Your knowledge index auto-injects at session start. Accumulated knowledge available without asking for it. |

### Progressive disclosure
| Pattern | What It Does |
|---|---|
| 3-layer progressive retrieval | Search returns compact IDs and summaries (~50-100 tokens per result). Expand for timeline context. Full details only on explicit request. 10x token savings. |
| 4-layer token budget | L0: identity (~50 tokens, always loaded). L1: critical facts (~120 tokens, always loaded). L2: topic recall (on demand). L3: deep search (explicit request only). Wake up with ~600-900 tokens total. |
| Tiered loading | Always-on context is ~2K tokens (identity + tasks + file listing). Everything else loaded via semantic search or triggered by hooks. |
| Critical facts file (~120 tokens) | A tiny file with your timezone, role, location, key active project. Always loaded at session start. Ultra-cheap. |
| Compaction-surviving injection | Context injection hook fires at BOTH SessionStart AND PreCompact. When Claude's context window compresses, your memory re-injects automatically. Customizable via a PRIME.md file. |
| Peek-then-drill | Search returns lightweight metadata first (title, type, tags). Load full content only after confirming relevance. Minimizes wasted tokens. |

### Branch/project-aware
| Pattern | What It Does |
|---|---|
| Branch-aware overlays | Each git branch gets its own memory overlay file. Switch branches, switch context. Merge a branch, fold the overlay back. |
| Dual-scope (project + global) | Separate stores for global preferences and project-specific knowledge. Project memory loads when you're in that project. Global loads everywhere. |
| Path-scoped rules | Memory files with path matchers in frontmatter. `api-testing.md` only loads when Claude works with files matching `src/api/**/*.test.ts`. Zero overhead otherwise. |

---

## LIFECYCLE Dimension

### Accumulate forever
| Pattern | What It Does |
|---|---|
| Store verbatim, search later | Never summarize at storage time. Raw storage scores 96.6% on recall benchmarks. LLM summaries that decide what's "worth remembering" lose 12+ points. |
| ADD-only, never update | Memories accumulate without overwriting. When information changes (user moved from New York to San Francisco), both facts live side by side. The system knows there was a transition. "Your old neighborhood" points to New York, "your current location" means San Francisco. Contradictions resolve at retrieval time, not storage time. Eliminates the failure mode where an LLM incorrectly merges or overwrites correct information. |
| Index raw conversations | Don't extract facts. Index the actual user-assistant exchanges. Nothing is lost to summarization bias. Original context, including alternatives considered, is preserved. |
| Behavioral pattern inference | Don't just store raw facts. If a user orders from the same Thai restaurant every Friday for two months, the system should infer "loves Thai food, has a Friday dinner habit" rather than storing eight copies of "ordered pad thai." Memory that reasons about patterns is more valuable than memory that records events. |

### Compress / compact
| Pattern | What It Does |
|---|---|
| Threshold-based compression | Line count triggers: under 100 = no action, 100-150 = suggest compression, 150-200 = auto-compress, over 200 = emergency compress + archive. Key Decisions sections are NEVER compressed. |
| Biological memory decay | Old completed items get summarized. Originals preserved in history, restorable. Recent things are detailed, old things are compressed summaries. |
| Header/raw archiving | Structured summary stays for retrieval. Full conversation archived below, never loaded but always grep-searchable. |
| Ebbinghaus forgetting curve | Confidence scores decay following an exponential curve: `weight * 0.5^(days/half_life)`. Memories you don't access gradually fade. Prevents infinite accumulation. |
| SHA256 incremental updates | Content-hash every file. On re-runs, only changed files get re-processed. Unchanged content is skipped entirely. Makes rebuilds instant for large corpora. Git hooks can trigger automatic rebuilds on commit. |

### Promote / graduate
| Pattern | What It Does |
|---|---|
| Notes-to-rules promotion | Temporary observations that recur 2-3 times get promoted from scratchpad memory into permanent enforced rules. The entry is removed from active memory, freeing space. Knowledge gains authority as it proves itself. |
| Compounding knowledge compilation | Daily logs compile into structured articles. When you query the knowledge base, the answer can be filed back as a permanent article. Every question makes the system smarter over time. |
| Knowledge health linting | Automated checks for: broken links, orphan pages, stale articles, contradictions (LLM-judged), missing backlinks, uncompiled sources. Keeps the knowledge base clean. |
| Pattern-to-wisdom promotion | When the system encounters something surprising multiple times, it tracks the pattern. Clustered surprises get promoted to a permanent "wisdom" tier. |
| Self-rewriting on ingestion | New information doesn't just get appended. It triggers rewrites of existing pages, contradiction resolution, and synthesis across sources. Tracks when facts changed and why. |

---

## INFRASTRUCTURE Setup Reference

### Obsidian
- **Install app:** https://obsidian.md/download
- **Install CLI:** Settings > General > Command Line Interface > Enable
- **Skills to install:** `npx @anthropic-ai/agent-skills add kepano/obsidian-skills`
- **Best for:** Visual thinkers, graph view users, existing Obsidian users, mobile access
- **Pair with:** Any capture/lifecycle pattern

### Plain Markdown
- **No install needed.** Create directory structure, configure hooks.
- **Best for:** Minimalists, git-first workflows, full control
- **Pair with:** Daily files, header/raw splits, keyword retrieval

### SQLite + sqlite-vec
- **Install:** `pip install sqlite-vec fastembed`
- **Gives you:** Full-text search (FTS5) + vector similarity, all local
- **Best for:** Technical users who want local semantic search without cloud
- **Pair with:** Hybrid search, truth maintenance, structured saves

### Supabase pgvector
- **Install CLI:** `brew install supabase/tap/supabase`
- **Docs to pull:** `https://supabase.com/docs/guides/ai/vector-columns`
- **Gives you:** Cloud-hosted vectors, full SQL, realtime, auth, team access
- **Best for:** Teams, multi-device, managed backend

### Pinecone
- **Install SDK:** `pip install pinecone`
- **Docs to pull:** `https://docs.pinecone.io/guides/get-started/overview`
- **Gives you:** Managed vector search, serverless, metadata filtering
- **Best for:** Scale-first users, zero infrastructure management
