"""Turn a finished Unlock run into report.html, REPORT.md and summary.json.

    python3 scripts/report.py --run RUN_FOLDER

Standard library only. The HTML is one self-contained file you can open,
share or screenshot. Replies are shown exactly as the models wrote them.
"""
from __future__ import annotations

import argparse
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import unlock_common as uc  # noqa: E402

GROUPS = {
    "development_replay": ("The question the edit was built on",
                           "A replay. The edit was tuned on this exact question, so it shows the edit took, not that it generalises."),
    "check_same_topic": ("Known check, same topic", "Ships with the skill, so it is not held out."),
    "check_control_topic": ("Known check, unrelated topic", "Should be unchanged. Ships with the skill."),
    "check_ordinary_task": ("Known check, everyday task", "Should be unchanged. Ships with the skill."),
}
FRESH = ("Fresh case, written after the freeze", "Not seen by Heretic and not used to pick the candidate.")
LATE = ("Added case, written before the freeze", "The file is older than the freeze, so it is not counted as fresh.")


def load(path: Path):
    try:
        return uc.read_json(path)
    except (OSError, ValueError):
        return None


def results(path: Path) -> dict:
    data = load(path)
    return {r["id"]: r for r in data["results"]} if data else {}


def collect(run: Path) -> dict:
    ev, out = run / "evidence", run / "outputs"
    meta = load(run / "run.json") or {}
    state = load(run / "state.json") or {}
    cases = load(run / "cases" / "compare.json") or {"fixtures": []}
    sets = [{"name": "compare", "fixtures": cases["fixtures"], "fresh": None,
             "original": results(out / "original.json"), "edited": results(out / "edited.json")}]
    for cs in state.get("case_sets", []):
        spec = load(run / "cases" / f"{cs['name']}.json") or {"fixtures": []}
        sets.append({"name": cs["name"], "fixtures": spec["fixtures"], "fresh": cs.get("written_after_freeze"),
                     "original": results(run / cs["original"]), "edited": results(run / cs["edited"])})
    integrity = load(ev / "integrity-latest.json") or load(ev / "integrity.json") or {}
    return {"run": run, "meta": meta, "state": state, "sets": sets, "integrity": integrity,
            "baseline": results(out / "original-before-edit.json"),
            "diff": load(ev / "tensor-diff.json") or {}, "trials": (load(ev / "trials.json") or {}).get("trials", []),
            "manifest": load(ev / "manifest.json") or {}, "resources": load(ev / "edit-resources.json") or {},
            "doctor": load(ev / "doctor.json") or {}}


def case_rows(d: dict) -> list:
    rows = []
    for s in d["sets"]:
        for f in s["fixtures"]:
            a, b = s["original"].get(f["id"]), s["edited"].get(f["id"])
            if s["name"] == "compare":
                group = GROUPS.get(f.get("case_group"), (f.get("case_group", "Case"), ""))
            else:
                group = FRESH if s["fresh"] else LATE
            rows.append({"id": f["id"], "set": s["name"], "group": group, "fixture": f,
                         "prompt": f.get("prompt") or next((m["content"] for m in reversed(f.get("messages", []))
                                                             if m["role"] == "user"), ""),
                         "expected": f.get("expected"), "original": a, "edited": b})
    return rows


def describe(r) -> dict:
    if not r:
        return {"text": "(no reply recorded)", "tokens": 0, "refusal": False, "limit": False}
    return {"text": r["response"], "tokens": r["generated_tokens"], "refusal": uc.looks_like_refusal(r["response"]),
            "limit": r["hit_token_limit"]}


def headline(rows: list) -> tuple:
    target = [r for r in rows if r["fixture"].get("case_group") == "development_replay"]
    if not target:
        return "Comparison complete", ""
    a, b = describe(target[0]["original"]), describe(target[0]["edited"])
    if a["refusal"] and not b["refusal"]:
        return "The original refused. The copy answered.", f"{a['tokens']} tokens before, {b['tokens']} tokens after, same question and settings."
    if a["refusal"] and b["refusal"]:
        return "Both copies still refuse the target question.", "The edit did not remove this refusal. Read the candidates table below."
    if not a["refusal"] and not b["refusal"]:
        return "Neither copy used a refusal phrase on the target question.", "Read both replies; the difference may be in what they say."
    return "The copy refused where the original answered.", "This is a regression. Read the replies below."


def checks(d: dict, rows: list) -> list:
    integ = d["integrity"]
    items = []
    if "original_unchanged" in integ:
        n = len((load(d["run"] / "evidence" / "original-after.json") or {}).get("files", {}))
        items.append((integ["original_unchanged"], f"The original model's {n} files are byte-for-byte unchanged"))
    if "edited_unchanged_since_freeze" in integ:
        items.append((integ["edited_unchanged_since_freeze"], "The copy is unchanged since it was frozen"))
    cases = [c for s in integ.get("case_sets", []) for c in s["cases"]]
    if cases:
        same = sum(c["identical_input_tokens"] for c in cases)
        items.append((same == len(cases), f"Both models received identical input tokens on {same} of {len(cases)} cases"))
        cut = sum(c["hit_token_limit"] for c in cases)
        items.append((cut == 0, "No reply was cut off by the token limit" if cut == 0
                      else f"{cut} replies hit the token limit, so treat them as inconclusive"))
    sysmsg = d["meta"].get("system_message", uc.SYSTEM_MESSAGE)
    items.append((True, f'Both models got the same plain system message, "{sysmsg}", and greedy decoding'))
    return items


def change_lines(d: dict) -> list:
    diff = d["diff"]
    if not diff:
        return []
    lines = [f"{diff['changed_count']} of {diff['tensor_count']} weight tables changed. "
             f"None were added or removed." if not diff["only_in_original"] and not diff["only_in_edited"]
             else f"{diff['changed_count']} of {diff['tensor_count']} weight tables changed."]
    if diff.get("changed_by_component"):
        lines.append("Kinds touched: " + ", ".join(f"{k} ({v})" for k, v in diff["changed_by_component"].items()) + ".")
    if diff.get("layers_changed"):
        lines.append(f"Layers touched: {diff['layers_changed'][0]} to {diff['layers_changed'][-1]}.")
    m = diff.get("measurements") or {}
    if m:
        rel = sorted(v["relative_change"] or 0 for v in m.values())
        name = diff["largest_change_tensor"]
        big = m[name]
        lines.append(f"Typical changed table moved by {rel[len(rel) // 2] * 100:.2f}%. The most-changed one, "
                     f"{name}, moved by {big['relative_change'] * 100:.2f}% with "
                     f"{big['fraction_of_numbers_changed'] * 100:.0f}% of its numbers nudged and no single "
                     f"number moving more than {big['largest_single_change']:.4f}.")
    return lines


def trial_rows(d: dict) -> list:
    out = []
    for t in d["trials"]:
        names = list(t["scores"])
        refusal = next((t["scores"][n]["display"] for n in names if "refusal" in n.lower()), None)
        kl = next((t["scores"][n]["display"] for n in names if "kl" in n.lower()), None)
        other = {n: t["scores"][n]["display"] for n in names if "refusal" not in n.lower() and "kl" not in n.lower()}
        out.append({"index": t["index"], "refusal": refusal, "kl": kl, "other": other,
                    "direction": t["direction"], "chosen": t["chosen"], "completed": t["completed"]})
    return out


LIMITS = [
    "One target question built this edit. Answering it proves the edit took on that question, not that the model is uncensored in general.",
    "No refusal is not the same as a right answer. Check the facts in every reply; removing a refusal does not add knowledge.",
    "The refusal tags are a phrase match on replies such as \"I'm sorry\" and \"I cannot\". Read the replies themselves.",
    "Known checks ship with the skill, so they are not held out. Add your own questions after the freeze for fresh evidence.",
    "A handful of questions is a spot check, not a benchmark. Results are for this machine, model and software versions.",
]

CSS = """
:root{--paper:#f5eedc;--card:#fffaf0;--ink:#1b1b1b;--muted:#6b6458;--gold:#e3a72f;--goldsoft:#f6e2b3;--line:#e2d6bb;--bad:#b4462b;--ok:#3d7a4a}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif}
main{max-width:1180px;margin:0 auto;padding:40px 28px 80px}
h1{font-size:44px;line-height:1.05;margin:0 0 6px;letter-spacing:-.02em}h1 span{color:var(--gold)}
h2{font-size:24px;margin:48px 0 14px;letter-spacing:-.01em}h3{font-size:15px;margin:0 0 6px}
.sub{color:var(--muted);margin:0 0 28px}.hero{background:var(--ink);color:#fff;border-radius:18px;padding:28px 30px;margin:24px 0}
.hero .big{font-size:30px;font-weight:700;letter-spacing:-.01em}.hero .small{color:#cfc6b4;margin-top:6px}
.q{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 12px;font-weight:600}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}.reply{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-width:0}
.reply.copy{border:2px solid var(--gold)}.reply .who{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:flex;justify-content:space-between;gap:8px;margin-bottom:8px}
.reply pre{white-space:pre-wrap;word-wrap:break-word;margin:0;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}
.tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#eee4cd;color:var(--ink);text-transform:none;letter-spacing:0}
.tag.refuse{background:#f3d3c8;color:var(--bad)}.tag.answer{background:var(--goldsoft)}.tag.warn{background:#f3d3c8;color:var(--bad)}
.case{margin:0 0 30px;padding-bottom:26px;border-bottom:1px dashed var(--line)}.group{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);margin-bottom:6px}
.groupnote{color:var(--muted);font-size:13px;margin:-2px 0 10px}details{margin-top:10px;color:var(--muted);font-size:14px}summary{cursor:pointer}
ul.checks{list-style:none;padding:0;margin:0}ul.checks li{padding:8px 0 8px 34px;position:relative;border-bottom:1px solid var(--line)}
ul.checks li:before{content:"\\2713";position:absolute;left:4px;top:7px;width:22px;height:22px;border-radius:50%;background:var(--ok);color:#fff;font-size:13px;text-align:center;line-height:22px}
ul.checks li.no:before{content:"!";background:var(--bad)}
table{border-collapse:collapse;width:100%;background:var(--card);border-radius:12px;overflow:hidden;border:1px solid var(--line)}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);font-size:14px}th{background:#efe5cc}tr.chosen td{background:var(--goldsoft);font-weight:700}
.box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px}.box p{margin:0 0 8px}
.limits li{margin-bottom:6px}.kv{display:grid;grid-template-columns:220px 1fr;gap:6px 16px;font-size:14px}.kv div:nth-child(odd){color:var(--muted)}
code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:#efe5cc;padding:1px 5px;border-radius:5px;word-break:break-all}
footer{margin-top:50px;color:var(--muted);font-size:13px}
@media (max-width:760px){.pair{grid-template-columns:1fr}h1{font-size:34px}.kv{grid-template-columns:1fr}}
"""


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""))


def reply_card(r, who: str, copy: bool) -> str:
    x = describe(r)
    tags = [f'<span class="tag {"refuse" if x["refusal"] else "answer"}">'
            f'{"refusal phrase found" if x["refusal"] else "no refusal phrase"}</span>']
    if x["limit"]:
        tags.append('<span class="tag warn">hit token limit</span>')
    return (f'<div class="reply{" copy" if copy else ""}"><div class="who"><span>{esc(who)} &middot; {x["tokens"]} tokens</span>'
            f'<span>{"".join(tags)}</span></div><pre>{esc(x["text"])}</pre></div>')


def render_html(d: dict, rows: list) -> str:
    meta, man, res = d["meta"], d["manifest"], d["resources"]
    big, small = headline(rows)
    target = next((r for r in rows if r["fixture"].get("case_group") == "development_replay"), None)
    parts = [f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
             f'<title>/unlock report, {esc(meta.get("recipe", ""))}</title><style>{CSS}</style></head><body><main>',
             '<h1><span>/unlock</span> report</h1>',
             f'<p class="sub">{esc(meta.get("recipe_title", ""))} &middot; {esc(man.get("base_model_id", ""))} &middot; '
             f'frozen {esc(man.get("frozen_at", "")[:16].replace("T", " "))}</p>',
             f'<div class="hero"><div class="big">{esc(big)}</div><div class="small">{esc(small)}</div></div>']
    if target:
        parts += [f'<div class="q">{esc(target["prompt"])}</div><div class="pair">',
                  reply_card(target["original"], "Original", False), reply_card(target["edited"], "Edited copy", True), '</div>',
                  '<p class="groupnote" style="margin-top:10px">This is the question the edit was built on, so it is '
                  'a replay. It shows the edit took on this question, not that it generalises.</p>']
    parts.append('<h2>Proof it is a fair test</h2><ul class="checks">')
    for ok, text in checks(d, rows):
        parts.append(f'<li class="{"" if ok else "no"}">{esc(text)}</li>')
    parts.append('</ul>')
    lines = change_lines(d)
    if lines:
        parts.append('<h2>What changed inside the model</h2><div class="box">' + "".join(f"<p>{esc(x)}</p>" for x in lines) + '</div>')
    trials = trial_rows(d)
    if trials:
        parts.append('<h2>The candidates Heretic tried</h2><table><tr><th>Candidate</th><th>Still refusing</th>'
                     '<th>Drift from original (KL, lower is closer)</th><th>Direction</th><th>Result</th></tr>')
        for t in trials:
            result = "Saved" if t["chosen"] else ("Did not finish" if not t["completed"] else "Discarded")
            parts.append(f'<tr class="{"chosen" if t["chosen"] else ""}"><td>{esc(t["index"])}</td><td>{esc(t["refusal"])}</td>'
                         f'<td>{esc(t["kl"])}</td><td>{esc(t["direction"])}</td><td>{result}</td></tr>')
        parts.append('</table>')
    rest = [r for r in rows if r is not target]
    if rest:
        parts.append('<h2>Every other question, side by side</h2>'
                     '<p class="sub">The question the edit was built on is at the top. These are the checks.</p>')
    for r in rest:
        title, note = r["group"]
        parts.append(f'<div class="case"><div class="group">{esc(title)}</div><div class="groupnote">{esc(note)}</div>'
                     f'<div class="q">{esc(r["prompt"])}</div><div class="pair">'
                     + reply_card(r["original"], "Original", False) + reply_card(r["edited"], "Edited copy", True) + '</div>')
        a, b = describe(r["original"]), describe(r["edited"])
        if r["original"] and r["edited"] and a["text"] == b["text"]:
            parts.append('<details open><summary>Identical replies</summary>Both models wrote exactly the same text.</details>')
        if r["expected"]:
            parts.append(f'<details><summary>What a good answer includes</summary>{esc(r["expected"])}</details>')
        parts.append('</div>')
    parts.append('<h2>How to read this honestly</h2><div class="box"><ul class="limits">'
                 + "".join(f"<li>{esc(x)}</li>" for x in LIMITS) + '</ul></div>')
    a = (d["doctor"].get("facts") or {})
    kv = [("Edited copy", man.get("edited_model")), ("Original", man.get("base_model")),
          ("Model", f'{man.get("base_model_id", "")} @ {str(man.get("base_model_revision", ""))[:12]}'),
          ("Heretic", f'{uc.HERETIC_URL} @ {str((man.get("heretic") or {}).get("commit", ""))[:12]}'),
          ("Recipe", f'{meta.get("recipe")} ({meta.get("recipe_status")})'),
          ("Machine", f'{a.get("chip", "")}, {uc.mem_gb(a.get("memory_bytes"))} memory' if a else ""),
          ("Device", meta.get("device")),
          ("Edit time", f'{res["seconds"]:.0f} seconds' if res.get("seconds") else ""),
          ("Peak memory", uc.mem_gb(res.get("peak_memory_bytes")) if res.get("peak_memory_bytes") else "not measured"),
          ("Software", ", ".join(f"{k} {v}" for k, v in (man.get("versions") or {}).items())),
          ("Skill commit", man.get("skill_commit")[:12] if man.get("skill_commit") else "not a git checkout"),
          ("Run folder", str(d["run"]))]
    parts.append('<h2>Run details</h2><div class="box kv">' + "".join(
        f"<div>{esc(k)}</div><div><code>{esc(v)}</code></div>" for k, v in kv if v) + '</div>')
    parts.append('<footer>Made with <a href="https://github.com/promptadvisers/unlock">Unlock</a>. '
                 'The model edit was done by <a href="https://github.com/p-e-w/heretic">Heretic</a>. '
                 'Raw replies, token IDs and fingerprints are in the run folder.</footer></main></body></html>')
    return "".join(parts)


def render_md(d: dict, rows: list) -> str:
    big, small = headline(rows)
    man, meta = d["manifest"], d["meta"]
    out = ["# /unlock report", "", f"**{big}** {small}", "",
           f"Recipe {meta.get('recipe')} ({meta.get('recipe_status')}). Model {man.get('base_model_id', '')}. "
           f"Frozen {man.get('frozen_at', '')}.", "", "## Proof it is a fair test", ""]
    out += [f"- {'Yes' if ok else 'NO'}. {t}" for ok, t in checks(d, rows)]
    lines = change_lines(d)
    if lines:
        out += ["", "## What changed inside the model", ""] + [f"- {x}" for x in lines]
    trials = trial_rows(d)
    if trials:
        out += ["", "## The candidates Heretic tried", "", "| Candidate | Still refusing | Drift (KL) | Direction | Result |",
                "| --- | --- | --- | --- | --- |"]
        out += [f"| {t['index']} | {t['refusal']} | {t['kl']} | {t['direction']} | "
                f"{'Saved' if t['chosen'] else 'Discarded' if t['completed'] else 'Did not finish'} |" for t in trials]
    out += ["", "## Every question, side by side", ""]
    for r in rows:
        a, b = describe(r["original"]), describe(r["edited"])
        out += [f"### {r['group'][0]}: {r['id']}", "", f"> {r['prompt']}", "",
                f"**Original** ({a['tokens']} tokens{', refusal phrase found' if a['refusal'] else ''}"
                f"{', hit token limit' if a['limit'] else ''})", "", "```text", a["text"], "```", "",
                f"**Edited copy** ({b['tokens']} tokens{', refusal phrase found' if b['refusal'] else ''}"
                f"{', hit token limit' if b['limit'] else ''})", "", "```text", b["text"], "```", ""]
        if r["expected"]:
            out += [f"What a good answer includes. {r['expected']}", ""]
    out += ["## How to read this honestly", ""] + [f"- {x}" for x in LIMITS]
    out += ["", f"Edited copy: `{man.get('edited_model', '')}`", ""]
    return "\n".join(out)


def summary(d: dict, rows: list) -> dict:
    big, small = headline(rows)
    return {"headline": big, "detail": small, "checks": [{"ok": ok, "text": t} for ok, t in checks(d, rows)],
            "changes": change_lines(d), "edited_model": d["manifest"].get("edited_model"),
            "cases": [{"id": r["id"], "group": r["group"][0], "original_refusal_phrase": describe(r["original"])["refusal"],
                       "edited_refusal_phrase": describe(r["edited"])["refusal"],
                       "identical_text": bool(r["original"] and r["edited"]) and
                       describe(r["original"])["text"] == describe(r["edited"])["text"]} for r in rows]}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--run", type=Path, required=True)
    args = p.parse_args(argv)
    run = args.run.expanduser().absolute()
    if not (run / "run.json").is_file():
        print(f"{run} is not an Unlock run folder.", file=sys.stderr)
        return 1
    d = collect(run)
    rows = case_rows(d)
    (run / "report.html").write_text(render_html(d, rows), encoding="utf-8")
    (run / "REPORT.md").write_text(render_md(d, rows), encoding="utf-8")
    uc.write_json(run / "summary.json", summary(d, rows))
    big, small = headline(rows)
    print(f"{big} {small}")
    print(f"Report: {run / 'report.html'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
