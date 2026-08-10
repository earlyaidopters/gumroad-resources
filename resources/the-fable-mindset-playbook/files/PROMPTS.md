# Fable Mindset, copy-paste prompts

Give these to Claude Code in order. Each prompt is in its own block so you can grab it clean.

The point. Reasoning text is only in about a quarter of sessions, so we do not chase it. We capture what is always there, the user messages, the assistant messages, the tool calls, and the order of actions. That behaviour is the signal.

Before you start, copy a non-sensitive session in as the demo file (never the health one):

```
cd "~/Desktop/YouTube/YT Command Centre/temp_files/fable_mindset"
cp ~/.claude/projects/<a-safe-project>/<some-session>.jsonl demo_session.jsonl
```

---

## 1. Build the de-bloater (creates it, runs it, opens it)

```
The bloat in these files is the tool results, the full file contents and command output that get echoed back into the context. Write me a small Python script, debloat_jsonl.py, that takes one Claude Code session file from ~/.claude/projects and strips it to a lightweight transcript. Keep my user messages, the assistant's text messages, the model that wrote each turn, and one compact line per tool call showing the tool name, and keep any thinking blocks if they happen to be there. Drop the heavy tool-result payloads, the attachment blobs, and the harness bookkeeping. When it's done, run it on demo_session.jsonl, print the before and after file size, and open the slimmed file so we can see the clean transcript.
```

---

## 2. Filter to only Fable and analyze how it behaved

```
Every assistant turn records which model wrote it, in a field called message.model. Pull every turn that came from claude-fable-5 out of my whole history, across all my projects, into one combined corpus. Then analyze how it actually behaved, using what is reliably in the logs. Count the assistant messages and my messages, the total tool calls and which tools it leaned on, how many tool calls it makes per turn, and the order it works in, like whether it reads a file before it edits it and whether it runs a test after it edits. Give me the behavioural patterns as real measured numbers, not impressions.
```

---

## 3. Compare to the Opus 4.8 rhythm and write the playbook

```
Now run the exact same behavioural read on my claude-opus-4-8 sessions and put the two side by side. Show me the distance in their rhythm, the tool-call cadence, the action sequences, and the ratios like reads before edits and tests after edits. Then turn that gap into a playbook, a single file I can point Opus 4.8 at so it adopts Fable's decision-making patterns, the parts that carry over through instruction. Be honest about where Fable itself was weak, so the playbook fixes that habit instead of copying it.
```

---

## 4. Point your model at the playbook so it loads every session

```
Take the playbook you just wrote and put it in this project's CLAUDE.md so it loads every session. Keep it tight.
```

---

## 5. Crank the reasoning up

```
/effort max
```

---

## 6. Wire the one guarantee (the test hook)

```
Add a PostToolUse hook that runs this project's tests after any Edit, Write, or MultiEdit, set hooksEnabled to true, and show me the settings.
```
