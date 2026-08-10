#!/usr/bin/env python3
"""
analyze_discipline.py · measure one model's working discipline, side by side.

You cannot clone a model's raw capability. You CAN measure its habits from your
own Claude Code logs and port the disciplined ones into a Mindset.md. This script
is the measuring tape. It reads your real session files, isolates the turns a
given model produced, and computes how often that model practiced each good
habit, next to a baseline model so the gap is evidence, not vibes.

It prints a markdown table in the same shape as the appendix in Fable_Mindset.md.

Usage:
    python3 analyze_discipline.py <target-model-id> <baseline-model-id>
    python3 analyze_discipline.py claude-fable-5 claude-opus-4-8

WHY RAW JSONL, NOT THE DEBLOATED TRACE.
debloat_jsonl.py throws away tool-result echo on purpose, because that is the
bloat you do not want to read. But two of the signals here only live in those
dropped records. The "re-evaluates after a result" signal needs to know a
tool_result came back, and the "tool error rate" signal needs the is_error flag
that only the raw tool_result carries. So this script operates on the raw files.

HOW A "TURN" IS DEFINED.
Claude Code does not store one fat record per turn. It writes each step of an
assistant's reply as its own JSONL line. A single reply becomes a thinking line,
then a text line, then a tool_use line, in order. So a logical assistant TURN is
a contiguous run of assistant records by the same model, bounded on each side by
a non-assistant record (a user message, a tool_result, or a different model's
records). We rebuild those turns by streaming the file and grouping the runs.

COST CONTROL.
We never scan every project file blindly. We first grep -rl for sessions that
contain the target model id, then only open those. We also stream line by line
with a json parse per line, so a 32 MB session never lands in memory whole.

ALL HEURISTICS ARE DOCUMENTED INLINE at the point they are computed.
"""
import json
import os
import subprocess
import sys
import re

PROJECTS = os.path.expanduser("~/.claude/projects")

# A Bash command counts as "the real test" when it matches this. Documented so a
# viewer can widen it for their own stack. Covers the common test, build, lint,
# and typecheck entry points across JS, Python, Go, and Rust toolchains.
REAL_TEST_RE = re.compile(
    r"\b(test|build|lint|pytest|jest|vitest|tsc)\b"
    r"|npm (run )?test"
    r"|go test"
    r"|cargo (test|build)",
    re.IGNORECASE,
)

EDIT_TOOLS = {"Edit", "Write", "MultiEdit"}


def sessions_with_model(model):
    """Only sessions that contain at least one turn from this model.

    grep -rl returns the file list cheaply so we never open files that cannot
    possibly contribute. The grep matches the same '"model":"<id>"' shape the
    corpus extractor uses, so the two stay consistent.
    """
    try:
        out = subprocess.run(
            ["grep", "-rl", f'"model":"{model}"', PROJECTS],
            capture_output=True, text=True, check=False,
        ).stdout
    except FileNotFoundError:
        return []
    return [p for p in out.splitlines() if p.strip()]


def iter_records(path):
    """Stream one parsed JSON object per line. Bad lines are skipped, not fatal."""
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def record_kind(obj):
    """Classify a raw record into the few shapes the metrics care about.

    Always returns a 3-tuple (kind, slot_a, slot_b) so callers can unpack
    uniformly. The meaning of the slots varies by kind:
      ('assistant', model, blocks)     blocks is the content list of dicts
      ('tool_result', is_error, None)  a user record that is actually tool output
      ('user', None, None)             a real user message (turn boundary)
      ('other', None, None)            bookkeeping we ignore
    """
    t = obj.get("type")
    if t == "assistant":
        msg = obj.get("message", {})
        return ("assistant", msg.get("model"), msg.get("content", []) or [])
    if t == "user":
        # A user record is tool output when it carries toolUseResult or a
        # tool_result content block. Otherwise it is something the human typed.
        if obj.get("toolUseResult") is not None:
            # is_error can live on the content block; default False when absent.
            return ("tool_result", _result_is_error(obj), None)
        c = obj.get("message", {}).get("content")
        if isinstance(c, list) and any(
            isinstance(b, dict) and b.get("type") == "tool_result" for b in c
        ):
            return ("tool_result", _result_is_error(obj), None)
        return ("user", None, None)
    return ("other", None, None)


def _result_is_error(obj):
    """True when this tool_result reports a failure (is_error on the block)."""
    c = obj.get("message", {}).get("content")
    if isinstance(c, list):
        for b in c:
            if isinstance(b, dict) and b.get("type") == "tool_result":
                if b.get("is_error"):
                    return True
    return False


class Counter:
    """Per-model tallies. Rates are derived at print time."""

    def __init__(self):
        self.turns = 0                  # logical assistant turns by this model
        self.turns_with_reasoning = 0    # turn had a thinking block
        self.reason_before_action = 0    # thinking came before the first tool_use
        self.turns_with_action = 0       # turn issued at least one tool_use
        self.reeval_opportunities = 0    # turns that directly followed a result
        self.reeval_did = 0              # ...of those, turns that contained reasoning
        self.tool_results = 0            # tool_result records after this model's calls
        self.tool_errors = 0             # ...of those, ones flagged is_error
        # Session level signals (computed once per session, not per turn).
        self.sessions = 0
        self.sessions_read_before_edit = 0   # a Read preceded the first edit
        self.sessions_with_edit = 0          # session contained any edit at all
        self.sessions_check_after_edit = 0   # any Bash ran after an edit
        self.sessions_test_after_edit = 0    # a REAL test/build/lint ran after an edit


def analyze_session(path, target, counters):
    """Walk one session once, updating counters for the target model.

    THE TURN MODEL (a reasoning beat).
    Claude Code splits one assistant reply across several JSONL lines, a thinking
    line, a text line, then ONE line per tool_use, and it interleaves the matching
    tool_result lines between them when tools run in parallel. So a single raw
    message.id is too fine a unit, the model often thinks once and then fires a
    string of tool-only continuation message.ids that carry no reasoning of their
    own. Counting each of those as a separate turn would understate reasoning.

    The unit that matches how a human reads the transcript is a BEAT, one time the
    model takes control and leads with reasoning or a reply. A new beat opens when
    the model emits a thinking or text block right after a turn boundary (a real
    user message, or a tool_result it is reacting to). Tool-only continuation
    records are absorbed into the open beat. A beat closes at the next boundary.

    This is the same granularity the published appendix used, so the rates line up
    in shape. The exact percentages still depend on which sessions you scan, the
    appendix measured one four day window, this script measures all history on
    disk, so treat the two as the same definition over different samples.

    Single streaming pass. We also track, in raw line order (the true execution
    order), the Read / edit / Bash / real-test sequence for the session level
    signals, and we attribute each tool_result to the beat that caused it via
    parentUuid so the tool error rate is the target's own error rate.
    """
    c = counters
    c.sessions += 1

    # --- beat accumulation ---
    beats = []                 # list of dicts: {blocks, followed_result}
    cur = None                 # the open beat, or None
    # boundary state: what was the most recent non-target-assistant record
    #   "user"   a real human message (hard boundary, opens fresh)
    #   "result" a tool_result (soft boundary, the re-evaluate moment)
    #   None     we are inside an assistant beat
    boundary = "user"
    # uuid of an assistant record -> index of the beat it belongs to, so a
    # tool_result landing later can be attributed to the right beat.
    uuid_to_beat = {}

    # --- session ordering state (raw execution order) ---
    saw_edit = False
    read_before_first_edit = False
    seen_read_yet = False
    check_after_edit = False
    test_after_edit = False

    for obj in iter_records(path):
        t = obj.get("type")

        if t == "assistant" and obj.get("message", {}).get("model") == target:
            blocks = []
            for b in obj.get("message", {}).get("content", []):
                if isinstance(b, dict) and b.get("type") in ("thinking", "text", "tool_use"):
                    blocks.append((b.get("type"), b.get("name")))
            leads_with_reasoning = bool(blocks) and blocks[0][0] in ("thinking", "text")

            # open a new beat when we just crossed a boundary and this record
            # leads with reasoning or text. otherwise extend the open beat.
            if cur is None or (leads_with_reasoning and boundary in ("user", "result")):
                cur = {"blocks": [], "followed_result": (boundary == "result")}
                beats.append(cur)
            cur_idx = len(beats) - 1
            uuid_to_beat[obj.get("uuid")] = cur_idx
            cur["blocks"].extend(blocks)
            boundary = None

            # session ordering signals, in execution order
            for kind, name in blocks:
                if kind != "tool_use":
                    continue
                if name == "Read":
                    seen_read_yet = True
                elif name in EDIT_TOOLS:
                    if not saw_edit:
                        read_before_first_edit = seen_read_yet
                    saw_edit = True
                elif name == "Bash":
                    cmd = ""
                    for b in obj.get("message", {}).get("content", []):
                        if (isinstance(b, dict) and b.get("type") == "tool_use"
                                and b.get("name") == "Bash"):
                            cmd = (b.get("input", {}) or {}).get("command", "") or ""
                            break
                    if saw_edit:
                        check_after_edit = True
                        if REAL_TEST_RE.search(cmd):
                            test_after_edit = True
            continue

        # non-target-assistant record. classify the boundary it sets.
        kind, is_err, _ = record_kind(obj)
        if kind == "tool_result":
            # attribute the result to the beat that issued the call
            owner = uuid_to_beat.get(obj.get("parentUuid"))
            if owner is not None:
                beats[owner].setdefault("results", 0)
                beats[owner]["results"] += 1
                if is_err:
                    beats[owner].setdefault("errors", 0)
                    beats[owner]["errors"] += 1
            boundary = "result"   # soft boundary, opens the re-evaluate window
        elif kind == "user":
            boundary = "user"     # hard boundary, a fresh human turn
            cur = None
        # 'assistant' (other model) and 'other' do not move the boundary

    # roll session ordering signals into the counters
    if saw_edit:
        c.sessions_with_edit += 1
        if read_before_first_edit:
            c.sessions_read_before_edit += 1
        if check_after_edit:
            c.sessions_check_after_edit += 1
        if test_after_edit:
            c.sessions_test_after_edit += 1

    # score the beats
    for beat in beats:
        kinds = [k for k, _ in beat["blocks"]]
        has_think = "thinking" in kinds
        c.turns += 1
        if has_think:
            c.turns_with_reasoning += 1

        # reasons before the first action: the first thinking block precedes the
        # first tool_use within this beat's ordered content.
        if "tool_use" in kinds:
            c.turns_with_action += 1
            first_tool_idx = kinds.index("tool_use")
            if has_think and kinds.index("thinking") < first_tool_idx:
                c.reason_before_action += 1

        # re-evaluates after a result: this beat opened off a tool_result, the
        # moment to read what came back and decide again. Credit it if it reasoned.
        if beat.get("followed_result"):
            c.reeval_opportunities += 1
            if has_think:
                c.reeval_did += 1

        # tool error accounting, only this model's own calls
        c.tool_results += beat.get("results", 0)
        c.tool_errors += beat.get("errors", 0)


def pct(num, den):
    return (100.0 * num / den) if den else 0.0


def analyze(model):
    c = Counter()
    files = sessions_with_model(model)
    for f in files:
        analyze_session(f, model, c)
    return c, len(files)


def fmt(p):
    return f"{p:.0f}%"


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: python3 analyze_discipline.py <target-model> <baseline-model>")
    target, baseline = sys.argv[1], sys.argv[2]

    tc, tf = analyze(target)
    bc, bf = analyze(baseline)

    def row(label, tnum, tden, bnum, bden, note):
        return (f"| {label} | {fmt(pct(tnum, tden))} | "
                f"{fmt(pct(bnum, bden))} | {note} |")

    print(f"# Discipline · {target} vs {baseline}\n")
    print(f"Target  {target}: {tc.turns} beats across {tf} sessions")
    print(f"Baseline {baseline}: {bc.turns} beats across {bf} sessions")
    print("Measured over all matching sessions on disk. Rates shift with the "
          "window you scan, so compare the two columns, not the absolutes.\n")
    print(f"| Habit | {target} | {baseline} | Note |")
    print("|---|---|---|---|")
    print(row("turns containing reasoning",
              tc.turns_with_reasoning, tc.turns,
              bc.turns_with_reasoning, bc.turns,
              "reason on nearly every turn"))
    print(row("reasons before the first action",
              tc.reason_before_action, tc.turns_with_action,
              bc.reason_before_action, bc.turns_with_action,
              "plan precedes action"))
    print(row("re-evaluates after a result",
              tc.reeval_did, tc.reeval_opportunities,
              bc.reeval_did, bc.reeval_opportunities,
              "the observe then decide loop"))
    print(row("reads the file before editing",
              tc.sessions_read_before_edit, tc.sessions_with_edit,
              bc.sessions_read_before_edit, bc.sessions_with_edit,
              "fresh read prevents stale edits"))
    print(row("runs a check after editing",
              tc.sessions_check_after_edit, tc.sessions_with_edit,
              bc.sessions_check_after_edit, bc.sessions_with_edit,
              "do something every time"))
    print(row("runs the real test after editing",
              tc.sessions_test_after_edit, tc.sessions_with_edit,
              bc.sessions_test_after_edit, bc.sessions_with_edit,
              "the shared blind spot, fix it"))
    # tool error rate is a fraction, shown to one decimal for precision.
    te_t = pct(tc.tool_errors, tc.tool_results)
    te_b = pct(bc.tool_errors, bc.tool_results)
    print(f"| tool error rate | {te_t:.1f}% | {te_b:.1f}% | low, recovery is methodical |")

    # raw denominators for transparency, so you can audit any rate by hand.
    print("\n## Raw counts (for audit)\n")
    print(f"| Signal | {target} num/den | {baseline} num/den |")
    print("|---|---|---|")
    print(f"| reasoning | {tc.turns_with_reasoning}/{tc.turns} | {bc.turns_with_reasoning}/{bc.turns} |")
    print(f"| reason-before-action | {tc.reason_before_action}/{tc.turns_with_action} | {bc.reason_before_action}/{bc.turns_with_action} |")
    print(f"| re-evaluate | {tc.reeval_did}/{tc.reeval_opportunities} | {bc.reeval_did}/{bc.reeval_opportunities} |")
    print(f"| read-before-edit | {tc.sessions_read_before_edit}/{tc.sessions_with_edit} | {bc.sessions_read_before_edit}/{bc.sessions_with_edit} |")
    print(f"| check-after-edit | {tc.sessions_check_after_edit}/{tc.sessions_with_edit} | {bc.sessions_check_after_edit}/{bc.sessions_with_edit} |")
    print(f"| real-test-after-edit | {tc.sessions_test_after_edit}/{tc.sessions_with_edit} | {bc.sessions_test_after_edit}/{bc.sessions_with_edit} |")
    print(f"| tool-error | {tc.tool_errors}/{tc.tool_results} | {bc.tool_errors}/{bc.tool_results} |")


if __name__ == "__main__":
    main()
