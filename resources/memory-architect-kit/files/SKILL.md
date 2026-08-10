# Memory Architect

Design your perfect Claude Code memory system through a guided interview, then build it. Come back anytime to evolve it.

## When to Use

Invoke with `/memory-architect` when the user wants to:
- Design a custom memory system for Claude Code (first-time setup)
- Understand what kind of memory they need
- Set up persistent memory with a specific backend (Obsidian, markdown, SQLite, Supabase, Turso, ChromaDB, Pinecone)
- **Evolve an existing memory system** (add layers, change backends, tune decay, review what's working)

## How It Works

**First, detect if they already have a memory system.** Check for:
- `~/.memory/` directory
- `.memory/` in current project
- `MEMORY_BUILD_PLAN.md` in current directory
- Memory-related sections in CLAUDE.md

If an existing system is found, enter **Advisor Mode** instead of the full interview.

### Advisor Mode (returning users)

If the user already has a memory system built by this skill (or any system), present:

"Welcome back. I can see you already have a memory system set up. What would you like to do?"

Use AskUserQuestion:
- **Review my setup** - Show current layers, backend, and how it's performing
- **Add a new layer** - Add working memory, episodic, decay, promotion, or another layer you skipped initially
- **Change my backend** - Migrate from one storage option to another (e.g., markdown to SQLite, local to cloud)
- **Tune my decay/promotion** - Adjust the forgetting curve, salience thresholds, or promotion strike count
- **Explain a concept** - Teach me about a memory paradigm I don't understand (multi-signal retrieval, entity linking, behavioral inference, etc.)
- **Start fresh** - Redesign from scratch with the full interview

For **"Review my setup":** Read their existing files, show the layer diagram with current state, report any issues (stale context, empty knowledge folders, promotion backlog). Act like a doctor doing a checkup.

For **"Add a new layer":** Teach the new layer (with ASCII art and analogies from the paradigms reference), then scaffold it into their existing structure. Don't rebuild anything that already exists.

For **"Change my backend":** Walk them through the migration. Read existing memories, create the new backend, migrate data, update hooks and CLAUDE.md.

For **"Tune my decay/promotion":** Show their current settings, explain what each parameter does, let them adjust. Rewrite the relevant script.

For **"Explain a concept":** Read `references/paradigms.md` and teach whatever they want to learn. Use the full ASCII art explanations. This is the "memory advisor" mode. They can ask about any paradigm and get a clear, visual explanation.

For **"Start fresh":** Run the full interview from Phase 1.

The key principle: **the skill is not a one-time installer. It's an ongoing advisor.** Users should feel comfortable coming back and saying "I think I need decay now" or "explain how entity linking works" or "my promotion isn't firing, help me debug it." The skill evolves their system as their needs change.

---

### Phase 1: The Interview (first-time users)

Use the AskUserQuestion tool. Ask ONE question at a time. Keep the conversation flowing.

**Round 0: Speed Setting**

First question, always:

"How would you like to go through this?"

Use AskUserQuestion:
- **Full walkthrough (recommended)** - I'll teach you how memory works with visual diagrams, then help you design yours. Takes ~10 minutes.
- **Fast track** - I already know what I want. Just ask me the questions and build it. Takes ~3 minutes.

If they pick **Fast track**, skip ALL teaching sections (no ASCII art, no paradigm explanations, no analogies). Just ask the preference questions back-to-back:
1. Who are you? (role)
2. Technical level?
3. Which layers? (show the one-line list, no diagrams)
4. Capture: auto, manual, or smart filter?
5. Format: Obsidian, markdown, or database?
6. Structure: flat, taxonomy, graph?
7. Retrieval: keyword, semantic, hybrid?
8. Injection: load all, progressive, project-aware?
9. Lifecycle: keep all, decay, promote?
10. Backend choice
11. What are you working on right now?
Then go straight to build.

If they pick **Full walkthrough**, continue with the teaching flow below.

**Round 1: Who Are You?**

Ask: "Before I design your memory system, I need to understand how you work."

Use AskUserQuestion:
- Solo developer / indie hacker
- Team lead or engineering manager
- Content creator / knowledge worker
- Business owner running multiple projects
- Student or researcher

Then: "How technical are you with infrastructure?"
- I live in the terminal. Give me the raw tools.
- I'm comfortable with CLIs but don't want to manage servers.
- I want something that works without touching config files.

**Round 2: Memory Layers**

Show the overview diagram FIRST. Let them see the full stack at a glance. Then let them PICK which layers they want. THEN deep-dive ONLY on the layers they picked.

Start by saying:

"Every memory system is built from layers. Here's the full stack at a glance."

Then show this overview diagram:

```
THE MEMORY STACK
================

  ALWAYS LOADED (cheap, tiny, persistent)
  ┌─────────────────────────────────────────────┐
  │  IDENTITY          "I am a backend dev       │
  │  ~100 tokens        who works on payments"   │
  ├─────────────────────────────────────────────┤
  │  CRITICAL CONTEXT  "Currently debugging      │
  │  ~300 tokens        the Stripe webhook"      │
  └─────────────────────────────────────────────┘

  LOADED ON DEMAND (medium cost, session-scoped)
  ┌─────────────────────────────────────────────┐
  │  WORKING MEMORY    "Just tried fix #3,       │
  │  ~1-2K tokens       it broke the test suite" │
  └─────────────────────────────────────────────┘

  SEARCHED, NEVER BULK-LOADED (large, persistent)
  ┌─────────────────────────────────────────────┐
  │  LONG-TERM         "We chose Postgres over   │
  │  KNOWLEDGE          DynamoDB in January"     │
  ├─────────────────────────────────────────────┤
  │  EPISODIC          "The full conversation    │
  │  MEMORY             where we debated it"     │
  └─────────────────────────────────────────────┘

  BACKGROUND PROCESSES (automated, no tokens)
  ┌─────────────────────────────────────────────┐
  │  DECAY             Old memories compress     │
  │                     over time automatically  │
  ├─────────────────────────────────────────────┤
  │  PROMOTION         Patterns that prove       │
  │                     themselves become rules  │
  └─────────────────────────────────────────────┘
```

Then give ONE-LINE descriptions and let them pick:

"Here's what each layer does in one line. Pick the ones that sound useful to you."

Use AskUserQuestion with multiSelect: true:
- **Identity** (~100 tokens, always loaded) - Your name badge. Who you are, what you do. Never changes.
- **Critical Context** (~300 tokens, always loaded) - Your sticky note. Current project, blockers, last decision. Survives compaction.
- **Working Memory** (~1-2K tokens, session-scoped) - Your messy desk. What happened this session. Resets when you close.
- **Long-term Knowledge** (unlimited, searched) - Your filing cabinet. Facts, decisions, patterns. Searched, never bulk-loaded.
- **Episodic Memory** (archived, rarely accessed) - Your journal. Full conversation history. Preserves the WHY.
- **Decay** (background process) - Your forgetting curve. Old memories auto-compress. Recent stays detailed.
- **Promotion** (background process) - Your intern-to-manager pipeline. Patterns seen 3x become permanent rules.

Most people need at least: Identity + Critical Context + Long-term Knowledge. The rest are optional.

**AFTER they select, deep-dive ONLY on what they picked.** For each selected layer, show the full ASCII art explanation from below. Skip layers they didn't select.

Say: "Great choices. Let me explain each one you picked so you know exactly what you're getting."

Then for each SELECTED layer, show its detailed explanation:

---

**IDENTITY LAYER** (show only if selected)

"This is the simplest layer. It's like your driver's license for Claude. A tiny file, maybe 100 tokens, that says who you are, what you do, and what matters to you. It loads at the start of every single session. It never changes unless YOU change it."

```
IDENTITY LAYER
==============
Size:     ~100-200 tokens (about 5-10 lines)
Loads:    Every session, automatically
Changes:  Only when you update it manually
Persists: Forever

Example:
┌──────────────────────────────────────┐
│  Role: Backend engineer              │
│  Stack: Python, FastAPI, Postgres    │
│  Timezone: EST                       │
│  Style: Prefer small PRs, test-first│
│  Current team: Payments              │
└──────────────────────────────────────┘

Think of it like: Your name badge at work.
Everyone who talks to you sees it first.
```

---

**CRITICAL CONTEXT LAYER** (show only if selected)

"This is what you're working on RIGHT NOW. The active project, what's blocked, what decision you just made. It updates frequently, maybe every session. The key feature: it survives context compaction. When Claude's memory gets squeezed during a long conversation, this layer re-injects itself so you never lose your bearings."

```
CRITICAL CONTEXT LAYER
======================
Size:     ~200-500 tokens (about 10-25 lines)
Loads:    Every session + re-injects after compaction
Changes:  Every session or two
Persists: Until you update it

Example:
┌──────────────────────────────────────┐
│  Project: payments-v2 migration      │
│  Focus: Stripe webhook reliability   │
│  Blocked: Waiting on API key from    │
│           finance team               │
│  Last decision: Using idempotency    │
│           keys instead of dedup DB   │
│  Next: Write integration tests       │
└──────────────────────────────────────┘

Think of it like: The sticky note on your monitor.
Glance at it, instantly know where you are.
```

---

**WORKING MEMORY** (show only if selected)

"This is your scratchpad. What happened in THIS session. What you tried, what failed, what you're in the middle of. It's bigger than the other always-on layers, maybe 1-2K tokens, but it only lives for the current session. When the session ends, it either gets compressed into a summary or discarded."

```
WORKING MEMORY
==============
Size:     ~1-2K tokens (loaded on demand)
Loads:    During the active session
Changes:  Constantly, as you work
Persists: Until session ends, then compresses or resets

Example:
┌──────────────────────────────────────┐
│  Tried: Adding retry logic to        │
│         webhook handler              │
│  Result: Tests pass but timeout      │
│          on large payloads           │
│  Hypothesis: Payload size exceeds    │
│          Lambda limit                │
│  Next try: Chunk the payload         │
│  Files touched: webhook.py, tests/   │
└──────────────────────────────────────┘

Think of it like: Your desk mid-project.
Papers everywhere, half-finished coffee,
three browser tabs open. Productive chaos
that gets cleaned up at the end of the day.
```

---

**LONG-TERM KNOWLEDGE** (show only if selected)

"This is your reference library. Architecture decisions, coding patterns, things you've learned that are true across sessions. It's potentially large, hundreds or thousands of entries, so it NEVER loads all at once. Instead, you search it when you need something specific. It persists indefinitely."

```
LONG-TERM KNOWLEDGE
===================
Size:     Unlimited (searched, never bulk-loaded)
Loads:    Only when you search for something
Changes:  When you learn something new
Persists: Indefinitely

Example entries:
┌──────────────────────────────────────┐
│  FACT: "We use Postgres 15 with      │
│        pgvector for embeddings"      │
│                                      │
│  DECISION: "Chose FastAPI over       │
│        Flask for async support"      │
│                                      │
│  PATTERN: "Always use idempotency    │
│        keys for payment webhooks"    │
│                                      │
│  PREFERENCE: "Mark prefers small     │
│        PRs with focused commits"     │
└──────────────────────────────────────┘

Think of it like: A filing cabinet.
You don't carry it around. You walk over
to it when you need a specific document.
```

---

**EPISODIC MEMORY** (show only if selected)

"This is your full conversation history. The raw, unedited record of every session you've had. You almost never load this into context. It's too big and too noisy. But it's invaluable when you need to answer the question: 'Why did we make that decision three weeks ago?' It preserves the WHY behind decisions, not just the WHAT."

```
EPISODIC MEMORY
===============
Size:     Very large (archived, rarely accessed)
Loads:    Only when explicitly searched
Changes:  Append-only (conversations get added)
Persists: Indefinitely

What it preserves that nothing else does:
┌──────────────────────────────────────┐
│  "We considered DynamoDB but         │
│   rejected it because the team       │
│   doesn't have NoSQL experience      │
│   and the migration timeline is      │
│   too tight to learn a new           │
│   paradigm."                         │
│                                      │
│  Long-term knowledge only stores:    │
│  "Chose Postgres over DynamoDB"      │
│                                      │
│  Episodic memory preserves:          │
│  The full debate, the alternatives,  │
│  the tradeoffs, the reasoning.       │
└──────────────────────────────────────┘

Think of it like: Your journal.
You don't read it every day. But when you
need to remember WHY you felt a certain way
about a decision, it's the only place
that has the full story.
```

---

**DECAY LAYER** (show only if selected)

"This is the forgetting curve. Not everything deserves to stay at full detail forever. A debugging session from last Tuesday doesn't need to be stored at the same resolution as today's work. The decay layer automatically compresses old memories over time. Recent things stay detailed. Older things become summaries. Really old things become one-liners. And if something hasn't been accessed in months, it might archive entirely."

```
DECAY LAYER
===========
How it works:

Day 1:    "Debugged webhook timeout. Root cause was
           Lambda payload limit of 6MB. Fixed by
           chunking payloads into 4MB segments.
           Updated webhook.py lines 45-80. Tests
           pass. Deployed to staging."

Day 7:    "Fixed webhook timeout by chunking
           payloads under Lambda's 6MB limit."

Day 30:   "Webhook payload chunking fix (Lambda)."

Day 90:   [archived or deleted]

The timeline in ASCII:

  FULL DETAIL ━━━━━━┓
                     ┃  Day 1-3
  SUMMARY ━━━━━━━━━━┛━━━━━━━━━┓
                               ┃  Day 7-14
  ONE-LINER ━━━━━━━━━━━━━━━━━━┛━━━━━━━━━┓
                                         ┃  Day 30+
  ARCHIVED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Optional: SALIENCE SCORING
If you access a memory frequently, it resists
decay. A memory you search for every week stays
vivid. A memory nobody touches fades faster.

  Formula: decay_rate = base_rate * (1 / access_count)

Think of it like: How your brain actually works.
You remember yesterday in detail. Last month
is fuzzy. Last year is highlights only.
This is that, but deliberate and configurable.
```

---

**PROMOTION LAYER** (show only if selected)

"This is the opposite of decay. Instead of memories fading, the BEST ones get promoted. Here's how it works: when you notice a pattern three times in working memory, that pattern is clearly important. Instead of leaving it as a note that might get lost, the promotion layer graduates it into a permanent rule in your CLAUDE.md or rules files. The original observation gets deleted from active memory, freeing up space. Knowledge doesn't just survive. It gains authority."

```
PROMOTION LAYER
===============
How it works:

  OBSERVATION (Working Memory):
  "Used idempotency keys for Stripe webhook"
              │
              ▼  (seen once, just a note)
  
  OBSERVATION (Working Memory):
  "Added idempotency keys for payment retry"
              │
              ▼  (seen twice, flagged as pattern)
  
  OBSERVATION (Working Memory):
  "Idempotency keys needed for refund webhook"
              │
              ▼  (seen 3x, PROMOTED)
  
  PERMANENT RULE (CLAUDE.md):
  "Always use idempotency keys for payment
   webhooks. This prevents duplicate charges."
              │
              ▼  (original observations deleted
                  from working memory)

The lifecycle:

  Working Memory ──→ Pattern Detected ──→ Promoted
       │                                      │
       │              3-strike rule            │
       ▼                                      ▼
  [deleted after      [becomes a permanent
   promotion]          rule or skill]

Think of it like: An intern becoming a manager.
They start as a temporary observation. If they
prove themselves repeatedly, they get promoted
to a permanent position with real authority.
The intern role is freed up for someone new.
```

---

After deep-diving on their selected layers, confirm:

"Those are your layers. Ready to move on to the design decisions?"

If they chose the decay layer, ask: "How aggressive should the forgetting be?"
- Conservative: summaries after 2 weeks, one-liners after 2 months
- Moderate: summaries after 1 week, one-liners after 1 month
- Aggressive: summaries after 3 days, one-liners after 2 weeks
- No decay. I want everything preserved as-is.

If they chose the decay layer, ask: "Do you want salience scoring? Memories you access frequently resist decay. Memories nobody touches fade faster."
- Yes, frequently used memories should stay vivid
- No, treat all memories equally

**Round 3: The 6 Design Decisions**

For each dimension: READ the matching section from `references/paradigms.md`, TEACH the paradigm with plain language and ASCII diagrams, THEN ask the preference question. Adapt the depth to the user's technical level from Round 1.

**Capture:**
Read `references/paradigms.md` > CAPTURE PARADIGMS. Teach the three philosophies (security camera, journal, smart filter) and the ADD-only principle. Show the ASCII diagrams. Then ask:

"Now that you've seen the three approaches, which sounds more like you?"
- Auto-capture everything (the security camera). I'll search later.
- I decide what's worth saving (the journal). Less noise, more signal.
- Smart filtering (the spam filter). Capture only the important signals automatically.

**Format:**
Present Obsidian as the recommended visual layer (explain the "two doors" concept: human browses in the app, AI reads via CLI, same files). Then ask about the backend:

"I'd recommend Obsidian as your visual interface. You browse memories in the app, Claude reads them via the CLI. Same files, two access points. Sound good?"
- Yes, Obsidian (recommended)
- No, I want plain markdown files only
- No, I want a database

If they chose Obsidian or Markdown, ask about optional backend acceleration:
- Vault files only (keyword search via CLI, simplest)
- Add SQLite or ChromaDB for semantic search (free, local)
- Add GitHub sync for multi-machine access (free)
- Add Obsidian Sync for mobile ($4/mo)
- Add Supabase for cloud search + team access (free tier)
- Add Turso for cloud SQLite (free tier)

**Structure:**
Read `references/paradigms.md` > STRUCTURE PARADIGMS. Teach flat vs taxonomy vs graph vs spatial. Show the retrieval improvement numbers (61% -> 95%). Then ask:

"How organized does your memory need to be?"
- Flat files. Simple. Dated. I'll search when I need something.
- 5-type taxonomy (facts, events, discoveries, preferences, advice). 34% better retrieval.
- Full knowledge graph with relationships. Most powerful, most complex.
- Spatial hierarchy (project > category > topic). 95% recall at the deepest level.

**Retrieval:**
Read `references/paradigms.md` > RETRIEVAL PARADIGMS. Teach keyword vs semantic vs multi-signal. Explain entity linking. Show the "panel of judges" diagram and the 7K vs 25K token comparison. Then ask:

"How do you want to find things?"
- Keyword search (the filing cabinet). Fast, simple, no dependencies.
- Semantic search (the librarian). Finds by meaning, not just words. Runs locally.
- Multi-signal hybrid (the panel of judges). Three searches combined. Most accurate, 70% fewer tokens than brute force.

**Injection:**
Read `references/paradigms.md` > INJECTION PARADIGMS. Teach the backpack vs library card analogy. Explain progressive disclosure and compaction survival. Then ask:

"How should memory load at the start of each session?"
- Load everything (the backpack). Fine if memory is small.
- Progressive disclosure (the library card). Identity and context always loaded (~400 tokens). Everything else searched on demand. 10x savings.
- Project-aware loading. Only load memories relevant to the current project or git branch.

**Lifecycle:**
Read `references/paradigms.md` > LIFECYCLE PARADIGMS. Teach accumulate vs decay vs promotion. Show the Ebbinghaus curve, the salience formula, the career ladder diagram. Explain behavioral pattern inference (Thai food example). Then ask:

"What should happen to old memories over time?"
- Keep everything forever (the archive). 96.6% recall. Storage grows.
- Decay over time (the brain). Recent is detailed, old compresses. Optional salience scoring.
- Promote the best, decay the rest. Patterns that prove themselves become permanent rules. Everything else fades.

**Round 4: Infrastructure Preference**

Based on their answers, present 2-3 infrastructure options that fit. Read `references/infrastructure_options.md` for the details.

"Based on what you've told me, here are the infrastructure options that fit your profile."

Present matching options with tradeoffs. Let them choose.

---

### Phase 2: Your Memory Recipe

Read `references/repo_patterns.md`. Based on the user's interview answers, identify which specific patterns match their profile.

Present the results as a recipe. DO NOT name any source repos. Present patterns as design choices.

First, show their layer architecture as ASCII:

```
YOUR MEMORY ARCHITECTURE
========================

  ┌─ ALWAYS ON ────────────────────────────┐
  │                                         │
  │  Identity         ~150 tokens    ✓      │
  │  Critical Context ~400 tokens    ✓      │
  │                                         │
  ├─ ON DEMAND ────────────────────────────┤
  │                                         │
  │  Working Memory   ~1.5K tokens   ✓      │
  │                                         │
  ├─ SEARCHED ─────────────────────────────┤
  │                                         │
  │  Long-term Knowledge  unlimited  ✓      │
  │  Episodic Memory      unlimited  ✗      │
  │                                         │
  ├─ BACKGROUND ───────────────────────────┤
  │                                         │
  │  Decay (moderate, salience ON)   ✓      │
  │  Promotion (3-strike rule)       ✓      │
  │                                         │
  └─────────────────────────────────────────┘
```

Then present the recipe:

```
YOUR MEMORY RECIPE
==================

LAYERS:
  1. Identity layer (~150 tokens, always loaded)
  2. Critical context layer (~400 tokens, survives compaction)
  3. Working memory (session-scoped, compresses on end)
  4. Long-term knowledge (searched on demand)
  5. Decay (moderate curve, salience scoring ON)
  6. Promotion (3-strike: observed 3x -> permanent rule)

CAPTURE: [Pattern name]
  [1-line description of what it does]

FORMAT: [Their chosen format]
  [1-line description of how it works]

STRUCTURE: [Pattern name]
  [1-line description]

RETRIEVAL: [Pattern name]
  [1-line description]

INJECTION: [How context loads]
  [Layer loading strategy based on their choices]

LIFECYCLE: [How memory ages]
  [Decay/promotion/compression strategy]

INFRASTRUCTURE: [Their choice]
  [Setup overview]
```

Ask: "Does this recipe look right? Want to adjust anything before I build it?"

---

### Phase 3: Dependency Check

Before generating the build plan, check what the user already has installed. Run these checks silently and report what's missing.

**For Obsidian:**
```bash
# Check if Obsidian app exists
ls /Applications/Obsidian.app 2>/dev/null || echo "MISSING: Obsidian app"

# Check if Obsidian CLI is installed
obsidian --version 2>/dev/null || echo "MISSING: Obsidian CLI"

# Check if kepano's official skills are installed
ls ~/.claude/skills/obsidian-cli/SKILL.md 2>/dev/null || ls .claude/skills/obsidian-cli/SKILL.md 2>/dev/null || echo "MISSING: Obsidian CLI skill"
ls ~/.claude/skills/obsidian-markdown/SKILL.md 2>/dev/null || ls .claude/skills/obsidian-markdown/SKILL.md 2>/dev/null || echo "MISSING: Obsidian Markdown skill"
```

**For SQLite + sqlite-vec:**
```bash
python3 -c "import sqlite_vec" 2>/dev/null || echo "MISSING: sqlite-vec"
python3 -c "from fastembed import TextEmbedding" 2>/dev/null || echo "MISSING: fastembed"
```

**For Supabase:**
```bash
supabase --version 2>/dev/null || echo "MISSING: Supabase CLI"
# Check for credentials
grep -q SUPABASE_URL ~/.env 2>/dev/null || echo "MISSING: SUPABASE_URL in ~/.env"
```

**For Pinecone:**
```bash
python3 -c "import pinecone" 2>/dev/null || echo "MISSING: pinecone SDK"
grep -q PINECONE_API_KEY ~/.env 2>/dev/null || echo "MISSING: PINECONE_API_KEY in ~/.env"
```

If anything is missing, present it clearly:

```
DEPENDENCY CHECK
================

  ✓ Obsidian app          installed
  ✗ Obsidian CLI          not found
  ✗ Obsidian skills       not installed
  ✓ Python 3              installed

  BEFORE WE BUILD, YOU NEED:

  1. Enable Obsidian CLI:
     Open Obsidian > Settings > General > scroll to bottom
     > toggle "Command Line Interface" ON

  2. Install Obsidian skills:
     I can run this for you:
     npx @anthropic-ai/agent-skills add kepano/obsidian-skills
```

Ask: "Want me to install what's missing, or do you want to do it manually?"

- Let me install it (Claude Code runs the install commands)
- I'll do it myself (show them the exact commands, pause until they confirm done)
- Skip for now (generate the build plan with install steps included as Step 1)

If they choose "skip for now," the build plan's first section becomes "Prerequisites: Install These First" with exact commands for everything missing.

---

### Phase 4: Build Plan

Generate a step-by-step build plan. Save it to the user's current directory as `MEMORY_BUILD_PLAN.md`.

The plan must include:
1. **Prerequisites** (if any dependencies were missing, list install commands first)
2. **Layer architecture diagram** (ASCII, matching what was shown in Phase 2)
3. **Infrastructure setup steps** (exact commands)
4. **File/folder structure** to create (mapped to their layers)
5. **Hook configurations** for SessionStart, PreCompact, SessionEnd
6. **Decay/promotion rules** (if they chose those layers), with the actual formula and schedule
7. **Salience scoring formula** (if enabled): `score = base_weight * recency_factor * access_frequency`
8. **CLAUDE.md additions** for memory integration
9. **Test plan** (how to verify each layer is working)
10. **HOW TO USE IT** (see Phase 6 below, this section is included in the build plan)

---

### Phase 5: Build It

Say: "Your recipe is locked. Now I'm going to build the whole thing."

This is the core deliverable. The user should end this phase with a COMPLETE, WORKING memory structure on their machine. Not a plan. Not a template. The actual thing, pre-filled with their interview answers.

**Step 1: Create the directory structure**

Build the EXACT folder tree based on their chosen layers and infrastructure. Example for someone who chose Identity + Critical Context + Long-term Knowledge + Promotion with Markdown:

```
~/.memory/
├── PRIME.md                    ← auto-inject file (~200 tokens)
├── identity.md                 ← pre-filled from interview
├── context.md                  ← template with their current project
├── knowledge/
│   ├── facts/                  ← if they chose 5-type taxonomy
│   ├── events/
│   ├── discoveries/
│   ├── preferences/
│   └── advice/
├── scripts/
│   ├── promote.py              ← 3-strike promotion checker
│   └── search.py               ← keyword search across knowledge/
└── MEMORY_BUILD_PLAN.md        ← reference doc of their full recipe
```

**Step 2: Pre-fill files from the interview**

This is what makes it feel magical. The files aren't empty templates. They're already populated.

**identity.md** gets pre-filled with what the user told you in Round 1:
```markdown
# Identity
Role: [what they said, e.g., "Business owner running multiple projects"]
Technical level: [their answer, e.g., "Comfortable with CLIs, no servers"]
Timezone: [detect from system or ask]
Key preferences: [anything they mentioned during the interview]
```

**context.md** gets pre-filled:
```markdown
# Critical Context
Current focus: [ask them: "What are you working on right now?" before building]
Active blockers: [ask or leave as "None yet"]
Last decision: [leave as "First session"]
Next step: [leave as "Run /memory-architect again to refine"]
```

**PRIME.md** is auto-generated from identity.md + context.md, compressed to under 200 tokens. This is the file that gets injected at SessionStart and PreCompact.

**Step 3: Create the knowledge structure**

If they chose the 5-type taxonomy, create the folders AND seed each with one example entry so they understand the format:

```markdown
# Example: knowledge/facts/claude_code_model.md
---
type: fact
created: 2026-04-20
---
Claude Code uses the Opus model by default. Can be changed with /model.
```

```markdown
# Example: knowledge/preferences/coding_style.md
---
type: preference
created: 2026-04-20
---
Prefer small, focused commits over large batches.
```

If they chose flat files instead of taxonomy, create a single `knowledge.md` with example entries.

**Step 4: Create the scripts**

If they chose the **promotion layer**, write `scripts/promote.py`:
- Reads all knowledge entries
- Counts how many times each pattern/topic appears
- If a pattern appears 3+ times, promotes it to a rule
- Outputs the promotion as a suggested CLAUDE.md addition
- Deletes the original observations from knowledge/

If they chose the **decay layer**, write `scripts/decay.py`:
- Reads all knowledge entries with timestamps
- Applies the forgetting formula based on their chosen aggressiveness
- Compresses entries older than the threshold
- Archives entries older than the archive threshold

If they chose **semantic search** (SQLite), write `scripts/search.py`:
- Creates the SQLite database with the schema
- Provides search(query) function with hybrid FTS5 + vector
- Returns results ranked by relevance

If they chose **keyword search** (simple), write `scripts/search.sh`:
- A simple grep wrapper that searches knowledge/ folder
- Supports the semantic keyword expansion map

**Step 5: Create the MEMORY_BUILD_PLAN.md**

Save the full recipe, layer diagram, and file manifest as a reference doc the user can always revisit.

**Step 6: Update CLAUDE.md**

Append memory instructions to the user's CLAUDE.md (or create one if it doesn't exist). The instructions tell Claude:
- Where memory lives (exact paths)
- How to read each layer
- How to write to each layer
- When to search (before answering architecture/pattern questions)
- When to save (when learning something new)
- How promotion works (if enabled)
- How decay works (if enabled)
- Where PRIME.md is and that it's the always-loaded context

**Step 7: Ask one more question before building**

Before creating all files, ask: "What are you working on right now? I'll use this to pre-fill your Critical Context layer so memory is useful from the first session."

This makes the first session feel like magic. Claude already knows their project.

**Step 8: Build everything**

Execute all the above. Create every file, every folder, every script. Pre-fill everything. Show progress as you go.

After building, show the complete file tree:

```
MEMORY STRUCTURE CREATED
========================

  ~/.memory/
  ├── PRIME.md                 ✓ (182 tokens, auto-inject ready)
  ├── identity.md              ✓ (pre-filled: business owner, CLI-comfortable)
  ├── context.md               ✓ (pre-filled: working on payments-v2)
  ├── knowledge/
  │   ├── facts/               ✓ (1 example seeded)
  │   ├── events/              ✓ (empty, ready)
  │   ├── discoveries/         ✓ (empty, ready)
  │   ├── preferences/         ✓ (1 example seeded)
  │   └── advice/              ✓ (empty, ready)
  ├── scripts/
  │   ├── promote.py           ✓ (3-strike rule, runs at session end)
  │   └── search.sh            ✓ (keyword search with expansion)
  └── MEMORY_BUILD_PLAN.md     ✓ (full recipe for reference)

  CLAUDE.md                    ✓ (memory instructions appended)

  Total: 14 files created
  PRIME.md: 182 tokens (under 200 budget)
```

**Infrastructure-specific builds:**

**For Obsidian:** Create the folders inside their vault path. Use `obsidian create` CLI commands where possible. Map layers to vault folders. If they have existing vault content, create a `memory/` subfolder to keep things clean.

**For SQLite:** Create `~/.memory/memory.db` with the full schema. Seed it with the same example entries. Write the search script with the hybrid search function. If they wanted vectors, install fastembed and generate embeddings for the seed entries.

**For Supabase:** Pull latest docs via WebFetch. Create the SQL migration file. Write the connection script with their project URL. Show them the exact `supabase db push` command to run.

**For Pinecone:** Pull latest docs via WebFetch. Write the index creation script. Write the connection layer. Show them the setup commands.

**Part B: Wire the hooks (hand off to claude-code-guide)**

After scaffolding is complete, explain to the user:

"The files and structure are ready. Now we need to wire up the hooks that make your memory actually work. Claude Code hooks are the engine that loads your memory at session start, re-injects it when context compacts, and saves it when you close.

To make sure this is done right, I'm going to give you a prompt to paste into a fresh session. Tag the `@claude-code-guide` agent, because it specializes in configuring Claude Code's settings, hooks, and lifecycle events."

Then generate a CUSTOM prompt based on everything the user chose. The prompt must be copy-pasteable and self-contained. Here is the template:

---

**Generate this prompt and present it in a code block for easy copy-paste:**

````
@claude-code-guide I need you to configure Claude Code hooks for a custom memory system. Here's what was built:

INFRASTRUCTURE: [Obsidian / Markdown / SQLite / Supabase / Pinecone]
MEMORY DIRECTORY: [exact path, e.g., ~/.memory/ or ~/vault/memory/]

LAYERS AND FILES:
- Identity: [path to identity.md or table name]
- Critical Context: [path to context.md or table name]
- [Working Memory: path if chosen]
- [Long-term Knowledge: path/folder or table if chosen]
- [Episodic Memory: path/folder or table if chosen]

HOOKS I NEED CONFIGURED:

1. SessionStart hook:
   - Read [identity file path] and inject as additionalContext
   - Read [context file path] and inject as additionalContext
   [- If SQLite/Supabase/Pinecone: run a Python script that queries the DB and returns a summary]

2. PreCompact hook:
   - Same as SessionStart (re-inject identity + context so memory survives compaction)

3. SessionEnd hook:
   [- If working memory chosen: compress current session notes into a summary and append to long-term knowledge]
   [- If episodic memory chosen: archive the conversation to episodes/ folder]
   [- If promotion chosen: run promote.py script that checks for patterns seen 3+ times and promotes them to CLAUDE.md rules]
   - Update context file with current project state

[4. Stop hook (optional):
   - If capture is auto: evaluate whether the current work is worth saving to long-term knowledge]

Please configure these in .claude/settings.json (or settings.local.json for user-specific). Use the correct hook schema. Test that each hook fires correctly.

[If Obsidian: Use the Obsidian CLI (obsidian read/write) for file operations]
[If SQLite: The script is at .memory/scripts/hook_runner.py]
[If Supabase: The script is at .memory/scripts/supabase_sync.py]
[If Pinecone: The script is at .memory/scripts/pinecone_sync.py]
````

---

Adapt this template based on the user's actual choices. Only include the layers they selected. Only include the infrastructure-specific lines that apply. The prompt should be specific enough that the claude-code-guide agent can execute it without asking follow-up questions.

Present it like this:

```
NEXT STEP: WIRE THE HOOKS
==========================

Your memory files and structure are ready.
Now we need to connect them to Claude Code's
lifecycle so they actually load and save.

Copy the prompt below and paste it into a
fresh Claude Code session. Tag the
@claude-code-guide agent, it specializes
in configuring hooks and settings.

┌──────────────────────────────────────────┐
│  1. Open a new Claude Code session       │
│  2. Paste the prompt below               │
│  3. The agent will configure your hooks  │
│  4. Close that session                   │
│  5. Open another new session             │
│  6. Claude should now know who you are   │
│     and what you're working on           │
└──────────────────────────────────────────┘
```

Then output the customized prompt in a fenced code block.

---

### Phase 6: How It All Works (TEACH THIS)

After presenting the handoff prompt, explain how the finished system works in practice. This section educates the user so they understand what's happening behind the scenes once the hooks are wired.

Show this diagram:

```
A TYPICAL SESSION WITH YOUR MEMORY
===================================

  YOU OPEN CLAUDE CODE
         │
         ▼
  ┌─ SessionStart hook fires ──────────────┐
  │  Loads: Identity + Critical Context     │
  │  Claude already knows:                  │
  │    - Who you are                        │
  │    - What you're working on             │
  │    - What's blocked                     │
  │    - What you decided last time         │
  └────────────────────────────────────────┘
         │
         ▼
  YOU START WORKING
  ("Fix the webhook timeout issue")
         │
         ▼
  ┌─ Claude checks memory ─────────────────┐
  │  CLAUDE.md says: "search long-term      │
  │  knowledge before answering questions"  │
  │                                         │
  │  Finds: "Always use idempotency keys    │
  │  for payment webhooks" (promoted rule)  │
  │                                         │
  │  Claude applies this knowledge          │
  │  automatically.                         │
  └────────────────────────────────────────┘
         │
         ▼
  YOU WORK FOR AN HOUR
  (context window fills up)
         │
         ▼
  ┌─ PreCompact hook fires ────────────────┐
  │  Re-injects: Identity + Critical Context│
  │  You don't lose your place.             │
  └────────────────────────────────────────┘
         │
         ▼
  YOU FINISH AND CLOSE THE SESSION
         │
         ▼
  ┌─ SessionEnd hook fires ────────────────┐
  │  1. Working memory saved/compressed     │
  │  2. Promotion check: any pattern seen   │
  │     3+ times? → promote to rule         │
  │  3. Critical Context updated with       │
  │     "webhook fix deployed to staging"   │
  │  4. Next session picks up right here    │
  └────────────────────────────────────────┘
```

Then explain the three activation modes:

```
THREE WAYS YOUR MEMORY ACTIVATES
=================================

1. AUTOMATIC (hooks, you do nothing)
   SessionStart loads identity + context.
   PreCompact re-injects when context compresses.
   SessionEnd saves and promotes.

2. CLAUDE.md INSTRUCTIONS (always in context)
   Claude knows it has memory. It searches
   before answering. It saves when it learns.
   You don't have to ask.

3. ON-DEMAND (you ask for it)
   "Search my memory for auth patterns"
   "Why did we choose Postgres last month?"
   "Remember that we decided to use webhooks"
   "What's my current context?"
```

Then show what was installed:

```
WHAT WAS BUILT
==============

Files created:
  [list actual files/paths based on their choices]

CLAUDE.md additions:
  - Memory system instructions
  - Paths to memory files
  - Promotion rules (if chosen)

HOOKS TO BE CONFIGURED (via @claude-code-guide):
  SessionStart  → loads identity + context
  PreCompact    → re-injects identity + context
  SessionEnd    → saves, promotes, updates context

TO VERIFY IT WORKS:
  1. Wire the hooks (paste the prompt above)
  2. Close that session
  3. Open a new Claude Code session
  4. Claude should greet you knowing who you are
     and what you were working on
```

---

## Important Rules

- Ask ONE question at a time. Don't dump all questions at once.
- Use AskUserQuestion for every choice. Don't assume.
- TEACH before asking. Every concept (working memory, decay, promotion, salience) must be explained with plain language and an ASCII diagram BEFORE the user is asked to choose it.
- Use analogies. "Think of it like your desk mid-project." "Think of it like a filing cabinet." People understand physical metaphors.
- Show the ASCII diagrams exactly as written in this skill. They are carefully designed.
- NEVER name source repos when presenting patterns. The patterns are design choices, not citations.
- Never install packages without asking first.
- For cloud infrastructure (Supabase, Pinecone), always check for existing credentials first.
- Pull the LATEST docs when connecting to any infrastructure. Don't rely on cached knowledge.
- The build plan must be executable. Real commands, real file paths, real code.
- The layer architecture is the heart of the design. Spend the most time here.
- The "How to Use It" section (Phase 6) is NOT optional. A memory system nobody knows how to invoke is useless. Always end with this.
- Dependency checks must happen BEFORE building, not during. Never let a build fail because Obsidian CLI isn't installed. Detect it early, route them to install it, then continue.
