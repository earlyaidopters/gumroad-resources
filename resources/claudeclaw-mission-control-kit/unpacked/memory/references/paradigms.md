# Memory Paradigms Reference

When the skill reaches the 6 design decisions (Round 3), it must TEACH each paradigm in plain language BEFORE asking the user to choose. This file contains the explanations Claude should draw from. Adapt the language to the user's technical level (detected in Round 1). Use analogies. Show ASCII diagrams where they help.

---

## CAPTURE PARADIGMS

### Teach before asking about capture:

"Before you choose how memories get captured, let me explain three different philosophies. Each one has a real tradeoff."

**Auto-capture (the security camera approach):**
```
Think of it like a security camera in a store.
It records everything. 24/7. You never touch it.
If something happens, you rewind the tape.

  SESSION ──────────────────────────► 
  ↓ hook   ↓ hook   ↓ hook   ↓ hook
  save     save     save     save

  Pros: You never forget anything.
  Cons: Lots of noise. Storage grows fast.
```

**Manual capture (the journal approach):**
```
Think of it like keeping a journal.
At the end of the day, YOU decide what's
worth writing down. Everything else is gone.

  SESSION ──────────────────────────►
                              ↓ you decide
                              save (or don't)

  Pros: Only signal, no noise.
  Cons: You have to remember to save.
        If you forget, it's gone.
```

**Signal-based capture (the smart filter approach):**
```
Think of it like a spam filter, but for memories.
It watches your conversation and only saves
moments that contain certain signals:
  - "decided to..."
  - "bug found..."  
  - "remember that..."
  - any time an error occurs

Everything else passes through without being saved.

  SESSION ──────────────────────────►
       ↓           ↓         ↓
     noise      SIGNAL!     noise
                  save

  Pros: Automatic but selective.
  Cons: Might miss something that didn't
        contain a trigger keyword.
```

**The ADD-only principle:**
```
"One more thing about capture. When new information
comes in that contradicts something you already know,
what should happen?

Most systems OVERWRITE the old fact. Your profile
says New York. New data says San Francisco.
Old system: delete New York, write San Francisco.

The smarter approach: KEEP BOTH.

  OLD: Lives in New York (stored Jan 2026)
  NEW: Lives in San Francisco (stored Apr 2026)

Now the system knows you MOVED. 'Your old neighborhood'
means New York. 'Your current location' means San Francisco.
Overwriting would have destroyed that context.

This is called ADD-only memory. Never delete. Never overwrite.
Just add, and let the search figure out what's current."
```

**Agent-generated facts:**
```
"Another thing most memory systems miss: when Claude
says 'I've updated your config file' or 'I booked
the 3pm slot,' that's a fact too. 

Most systems only save what YOU said. But half the
story is what the AI DID. A good memory system treats
agent actions as first-class facts."
```

---

## RETRIEVAL PARADIGMS

### Teach before asking about retrieval:

"Now let me explain how you'll FIND things in your memory. This is where it gets interesting."

**Keyword search (the filing cabinet approach):**
```
You know exactly what you're looking for.
You search for "auth" and it finds every memory
that contains the word "auth."

Fast. Simple. No dependencies.

But if you search for "login" it won't find
memories that say "authentication."
And if you search for "attend" it won't find
"attending" unless you're using smart matching.
```

**Semantic search (the librarian approach):**
```
Instead of matching exact words, it matches MEANING.

You search for "how we handle user logins"
and it finds a memory that says
"authentication uses JWT tokens via Supabase."

It found it because the MEANING is related,
even though the words are completely different.

How it works (simplified):

  Your query: "how we handle logins"
       ↓
  Converted to a number (embedding)
       ↓
  [0.23, 0.87, 0.12, 0.45, ...]
       ↓
  Compared against all memory embeddings
       ↓
  Closest match returned

This runs locally on your machine. No API calls.
A small model (384 dimensions) handles the math.
```

**Multi-signal retrieval (the panel of judges approach):**
```
This is the most powerful approach.
Instead of one search method, you run THREE
in parallel and combine their votes.

  YOUR QUERY
       │
       ├──► KEYWORD SEARCH ──► rankings
       │    (exact word match)
       │
       ├──► SEMANTIC SEARCH ──► rankings
       │    (meaning match)
       │
       └──► ENTITY SEARCH ──► rankings
            (people, places, concepts)
       │
       ▼
  RANK FUSION
  (combine all three rankings into one)
       │
       ▼
  BEST RESULTS (~7,000 tokens)
  vs 25,000+ tokens with brute-force

Different questions lean on different signals:
  "What does Alice think?" → Entity search leads
  "What happened last week?" → Keyword search leads
  "How has the project evolved?" → Semantic search leads

The combined result outperforms any single method.
And it uses 70% fewer tokens than loading everything.
```

**Entity linking:**
```
"One more concept: entity linking.

Every memory gets scanned for entities,
meaning people, places, tools, and concepts.
These entities get their own lookup table.

  Memory: 'Decided to use Supabase for auth'
  Entities extracted: [Supabase, auth]

  Memory: 'Supabase RLS handles permissions'
  Entities extracted: [Supabase, RLS, permissions]

  Memory: 'Auth migration completed Friday'
  Entities extracted: [auth, migration]

Now when you search for 'Supabase,' all three
memories get boosted because they share the
entity. Even the third one, which doesn't
mention Supabase by name, gets boosted through
the shared 'auth' entity.

This is how memory systems connect dots
that simple search would miss."
```

---

## LIFECYCLE PARADIGMS

### Teach before asking about lifecycle:

"The last big decision is what happens to memories over time. Three philosophies."

**Accumulate forever (the archive approach):**
```
Never delete. Never compress. Keep everything.

  Day 1: Full detail ████████████████
  Day 30: Full detail ████████████████
  Day 365: Full detail ████████████████

Why this works: Raw storage scores 96.6% on
recall benchmarks. Every time you summarize,
you lose information. The LLM decides what's
"worth keeping" and it's sometimes wrong.

Tradeoff: Storage grows indefinitely.
At personal scale (under 10,000 memories),
this is usually fine.
```

**Decay (the brain approach):**
```
Your brain does this naturally.
Yesterday is vivid. Last month is fuzzy.
Last year is highlights only.

  Day 1:   ████████████████  Full detail
  Day 7:   ████████          Summary
  Day 30:  ████              One-liner
  Day 90:  █                 Archived

The decay formula:
  detail_level = original * 0.5^(days / half_life)

SALIENCE SCORING (optional upgrade):
Memories you ACCESS frequently resist decay.
A fact you search for every week stays vivid.
A fact nobody touches fades faster.

  Accessed weekly:  ████████████████  stays vivid
  Never accessed:   ████              fades fast

  decay_rate = base_rate * (1 / access_count)

Think of it like paths in a forest.
The paths you walk often stay clear.
The ones nobody uses get overgrown.
```

**Promotion (the career ladder approach):**
```
The opposite of decay. The best memories
get PROMOTED, not just preserved.

Here's how it works:

  You notice: "idempotency keys for webhooks"     (once)
  You notice: "idempotency keys for payments"      (twice)
  You notice: "idempotency keys for refunds"       (three times)

  Three strikes → PROMOTED.

  This observation becomes a PERMANENT RULE:
  "Always use idempotency keys for financial APIs."

  The rule goes into your CLAUDE.md.
  The original 3 observations get deleted
  from active memory, freeing up space.

  Working Memory ──→ Pattern Detected ──→ Permanent Rule
       │                                       │
       ▼                                       ▼
  [deleted after         [enforced in every
   promotion]             future session]

Knowledge doesn't just survive. It gains authority.
```

**Behavioral pattern inference (the insight approach):**
```
"One advanced concept: pattern inference.

Most memory systems store raw facts:
  'Ordered pad thai on Friday'
  'Ordered pad thai on Friday'
  'Ordered pad thai on Friday'
  ... (8 times)

A smarter system INFERS the pattern:
  'Loves Thai food. Has a Friday dinner ritual.
   Go-to restaurant: Bangkok Kitchen.'

This is the difference between a tape recorder
and an analyst. The tape recorder stores events.
The analyst spots trends.

If you want your memory to do this, it needs
a periodic process that reviews accumulated facts
and extracts higher-order patterns. Think of it
like a weekly review where the system asks:
'What patterns do I see across all these events?'"
```

---

## INJECTION PARADIGMS

### Teach before asking about injection:

"How memory enters Claude's brain at the start of each session matters a lot for cost and quality."

**Load everything (the backpack approach):**
```
Imagine carrying every document you own
in a backpack. Every morning.

If your memory is small (under 500 lines),
this works fine. Claude reads it all,
knows everything, no searching needed.

  Session starts → load 500 lines → done

But if your memory grows to 5,000 lines,
you're burning tokens loading things
you won't need this session.
```

**Progressive disclosure (the library card approach):**
```
Instead of carrying every book, you carry
a library card that tells you what's available.

  Layer 0: Identity (~100 tokens, always loaded)
           "I'm a backend dev on the payments team"

  Layer 1: Context (~300 tokens, always loaded)
           "Currently fixing webhook timeouts"

  Layer 2: Search results (loaded when you ask)
           "Here are 5 relevant memories about webhooks..."

  Layer 3: Full detail (loaded on explicit request)
           "The full conversation where we debated this..."

  Total at session start: ~400 tokens
  vs loading everything: ~5,000 tokens

  That's a 10x savings.

The trick: your PRIME.md file (layers 0+1)
loads at EVERY session start. It's under 200 tokens.
Everything else loads only when needed.
```

**Compaction survival:**
```
"One critical thing: during long sessions,
Claude's context window fills up. When that
happens, Claude COMPRESSES older messages
to make room. This is called compaction.

If your memory was loaded at the start,
it gets compressed too. You lose your bearings.

The solution: a PreCompact hook.
Right BEFORE compression happens, the hook
re-injects your identity and context.

  Session starts → memory loaded
       │
       ▼
  You work for an hour (context fills up)
       │
       ▼
  Compaction about to fire...
       │
       ▼
  PreCompact hook: RE-INJECT identity + context
       │
       ▼
  Compaction fires (but your core memory is fresh)
       │
       ▼
  You keep working. Never lost your place.

This is the single most important hook.
Without it, long sessions lose all memory context."
```

---

## STRUCTURE PARADIGMS

### Teach before asking about structure:

**Flat files:**
```
One file per day. Or one big file.
Simple grep to search. No categories.

  memory/
  ├── 2026-04-15.md
  ├── 2026-04-16.md
  └── 2026-04-17.md

Works great if you have fewer than ~100 memories.
Gets hard to navigate beyond that.
```

**Taxonomy (the library approach):**
```
Every memory goes into one of five categories:

  FACTS       "We use Postgres 15"
  EVENTS      "Deployed auth fix on Friday"
  DISCOVERIES "RLS is simpler than middleware"
  PREFERENCES "Prefer small PRs, test-first"
  ADVICE      "Always use idempotency keys"

This simple 5-type split improves retrieval
by ~34% compared to a flat file. Because when
you search for a preference, you only search
the preferences folder. Less noise. Faster.

  memory/knowledge/
  ├── facts/
  ├── events/
  ├── discoveries/
  ├── preferences/
  └── advice/
```

**Graph (the web approach):**
```
Instead of folders, memories LINK to each other.

  [Supabase] ──uses──► [pgvector]
       │                    │
       │               ──stores──► [embeddings]
       │
  ──hosts──► [auth service]
                  │
             ──uses──► [RLS policies]

When you search for "Supabase," you don't just
get direct matches. You follow the links and
discover connected concepts: pgvector, embeddings,
auth, RLS.

This is the most powerful structure, but also
the most complex. Best for people with hundreds
or thousands of memories who need to understand
how concepts RELATE to each other.
```

**Spatial hierarchy (the building approach):**
```
Organize memories like rooms in a building.

  WING: Project (e.g., "payments-v2")
    └── HALL: Category (e.g., "architecture")
          └── ROOM: Topic (e.g., "webhook-auth")

Searching gets more precise at each level:
  All memories:           61% recall
  + filter by project:    73% recall
  + filter by category:   85% recall
  + filter by topic:      95% recall

Structure isn't overhead. Structure IS retrieval.
```

---

## TRUTH MAINTENANCE

### Teach when the user picks accumulate-forever or ADD-only:

```
"If you're keeping everything, contradictions
will happen. 'We use Express' in January.
'We migrated to FastAPI' in March.

Four possible outcomes when a new fact
contradicts an old one:

  SUPERSESSION: New replaces old.
    "Lives in SF" supersedes "Lives in NY"
    (but both are kept with timestamps)

  ACCUMULATION: Both are true.
    "Likes Thai food" AND "Likes Italian"
    (multi-value, no contradiction)

  CONFLICT: Genuinely contradictory.
    "Budget is $50K" vs "Budget is $30K"
    (flagged for human review)

  CORROBORATION: Same fact, more evidence.
    "Uses Postgres" confirmed by 3 sources
    (confidence score increases)

A good memory system handles all four
automatically. You only get asked about
genuine conflicts."
```

---

## How to use this file

When the skill reaches each design decision in Round 3, it should:

1. Read the relevant paradigm section from this file
2. Adapt the explanation to the user's technical level (from Round 1)
3. Show the ASCII diagram
4. Explain the tradeoffs in plain language
5. THEN ask the preference question

For non-technical users: use only the analogies (security camera, journal, filing cabinet, library card, backpack, paths in a forest)

For technical users: include the formulas, mention the benchmark numbers, show the data structures

The goal: the user should UNDERSTAND each paradigm before choosing. An informed choice is a better choice.
