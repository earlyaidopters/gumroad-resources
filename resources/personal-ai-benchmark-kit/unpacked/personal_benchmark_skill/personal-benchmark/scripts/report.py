#!/usr/bin/env python3
"""Stage 4 of /benchmark: render a before/after HTML report for a run.

Side-by-side variant outputs per task with metric chips, archetype context,
rubric, and judge verdicts. Light Claude palette, self-contained, no deps.

Usage: report.py [run_dir]   (defaults to newest run)
Output: <run_dir>/report.html
"""

import html
import json
import os
import re
import sys
from pathlib import Path

BENCH = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")

CSS = """
:root{--bg:#F4F3EE;--ink:#141413;--coral:#C15F3C;--muted:#B1ADA1;--card:#FFFFFF}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,Helvetica,Arial,sans-serif;padding:48px 32px;max-width:1400px;margin:0 auto}
h1{font-size:34px;margin-bottom:6px}
.sub{color:var(--muted);margin-bottom:8px}
.verdict{font-size:19px;margin:18px 0 40px;padding:16px 20px;background:var(--card);border-left:5px solid var(--coral);border-radius:6px}
.task{margin-bottom:56px}
.kicker{color:var(--coral);font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
h2{font-size:23px;margin-bottom:10px}
.promptbox{background:#141413;color:#F4F3EE;border-radius:8px;padding:14px 18px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;margin-bottom:14px;max-height:180px;overflow-y:auto}
.rubric{color:#555;font-size:13.5px;margin-bottom:16px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.col{background:var(--card);border:1px solid #E4E2DA;border-radius:10px;padding:18px;display:flex;flex-direction:column}
.col h3{font-size:16px;margin-bottom:8px}
.before h3::after{content:" · BEFORE";color:var(--muted);font-size:11px;letter-spacing:.06em}
.after h3::after{content:" · AFTER";color:var(--coral);font-size:11px;letter-spacing:.06em}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.chip{background:var(--bg);border-radius:20px;padding:3px 11px;font:600 12px/1.5 ui-monospace,Menlo,monospace}
.chip.bad{background:#F6E3DC;color:var(--coral)}
.out{white-space:pre-wrap;font-size:13.5px;overflow-y:auto;max-height:420px;border-top:1px solid #EEECE5;padding-top:12px}
details{margin-top:8px}
details summary{cursor:pointer;color:#C15F3C;font-size:13px;font-weight:600;user-select:none}
details[open] summary{margin-bottom:6px}
.judge{margin-top:14px;background:var(--card);border:1px solid #E4E2DA;border-left:4px solid var(--coral);border-radius:8px;padding:12px 16px;font-size:14px}
table.glance{width:100%;border-collapse:collapse;background:var(--card);border-radius:10px;overflow:hidden;margin-bottom:44px;font-size:14.5px}
.glance th{background:#141413;color:#F4F3EE;text-align:left;padding:10px 14px;font-weight:600}
.glance td{padding:10px 14px;border-top:1px solid #EEECE5}
.glance td:first-child{font-weight:600}
"""


def chips(m):
    out = []
    if m.get("error") or m.get("is_error"):
        return '<span class="chip bad">ERROR / max turns</span>'
    out.append(f'<span class="chip">{m.get("num_turns","-")} turns</span>')
    out.append(f'<span class="chip">{m.get("words","-")} words</span>')
    out.append(f'<span class="chip">{m.get("duration_s","-")}s</span>')
    checks = m.get("checks") or []
    passed = sum(1 for c in checks if c["pass"] is True)
    total = sum(1 for c in checks if c["pass"] is not None)
    fails = [c["label"] for c in checks if c["pass"] is False]
    cls = "chip bad" if fails else "chip"
    label = f"checks {passed}/{total}" + (f": {', '.join(fails)}" if fails else "")
    out.append(f'<span class="{cls}">{html.escape(label)}</span>')
    return "".join(out)


def main():
    if len(sys.argv) > 1:
        run_dir = Path(sys.argv[1])
    else:
        run_dir = sorted((BENCH / "runs").iterdir())[-1]
    results = json.loads((run_dir / "results.json").read_text())
    snap = run_dir / "eval_pack.json"
    pack = json.loads((snap if snap.exists() else BENCH / "eval_pack.json").read_text())
    tasks_by_id = {t["id"]: t for t in pack["tasks"]}
    variants = [v for v in (results.get("variants") or []) if v and v != "none"]

    scorecard = (run_dir / "scorecard.md")
    verdict_lines = []
    judge_by_task = {}
    drama = {}  # tid -> biggest judge score gap, for most-dramatic-first ordering
    if scorecard.exists():
        text = scorecard.read_text()
        verdict_lines = [l[2:] for l in text.splitlines() if l.startswith("- **")]
        cur = None
        for l in text.splitlines():
            if l.startswith("### "):
                cur = l[4:].split(" (")[0]
            elif l.startswith("**Judge") and cur:
                judge_by_task.setdefault(cur, []).append(re.sub(r"\*\*", "", l))
                m = re.search(r"Judge \([^)]*?([\d.]+) vs [^)]*?([\d.]+)\)", l)
                if m:
                    gap = abs(float(m.group(1)) - float(m.group(2)))
                    drama[cur] = max(drama.get(cur, 0), gap)

    # judge wins per variant, from the verdicts score.py persisted into results.json
    wins_by_variant = {}
    for key, v in (results.get("verdicts") or {}).items():
        if v.get("outcome") == "win":
            wins_by_variant[key.split("|", 1)[1]] = wins_by_variant.get(key.split("|", 1)[1], 0) + 1

    body = [f"<h1>Personal Benchmark</h1>",
            f'<div class="sub">{" vs ".join(html.escape(v) for v in variants)} · pack {results["pack_version"]}</div>']

    # TLDR hero block from verdict.json (written by verdict.py)
    vfile = run_dir / "verdict.json"
    if vfile.exists():
        tv = json.loads(vfile.read_text())
        body.append('<div class="verdict"><div style="font-size:24px;font-weight:700;margin-bottom:8px">'
                    + html.escape(tv.get("headline", "")) + "</div>"
                    + f"<p style='margin-bottom:10px'>{html.escape(tv.get('bottom_line', ''))}</p>"
                    + "<ul style='margin:0 0 10px 20px'>"
                    + "".join(f"<li>{html.escape(b)}</li>" for b in tv.get("behavior", []))
                    + "</ul>"
                    + f"<p><b>Recommendation:</b> {html.escape(tv.get('recommendation', ''))}</p>"
                    + f"<p style='color:#777;font-size:13px;margin-top:8px'>{html.escape(tv.get('caveat', ''))}</p>"
                    + "</div>")
    elif verdict_lines:
        body.append('<div class="verdict">' + "<br>".join(
            re.sub(r"\*\*", "", html.escape(l)) for l in verdict_lines) + "</div>")

    body.append('<div class="sub" style="margin-bottom:28px">Tasks are ordered by how decisive the '
                'judge\'s call was, biggest gap first. Press J / K to move between tasks.</div>')

    # at-a-glance table across the whole pack
    body.append('<table class="glance"><tr><th>model</th><th>judge wins</th><th>completed</th>'
                '<th>avg turns</th><th>avg words</th><th>total time</th><th>checks passed</th></tr>')
    for i, vlabel in enumerate(variants):
        ms = [bv.get(vlabel) for bv in results["tasks"].values()]
        ok = [m for m in ms if m and not m.get("error") and not m.get("is_error")]
        jw = "reference" if i == 0 else str(wins_by_variant.get(vlabel, 0))
        if not ok:
            body.append(f"<tr><td>{html.escape(vlabel)}</td><td>{jw}</td><td>0/{len(ms)}</td>"
                        "<td>-</td><td>-</td><td>-</td><td>-</td></tr>")
            continue
        avg = lambda k: round(sum(m.get(k) or 0 for m in ok) / len(ok), 1)
        total_s = round(sum(m.get("duration_s") or 0 for m in ok))
        cp = sum(sum(1 for c in (m.get("checks") or []) if c["pass"] is True) for m in ok)
        ct = sum(sum(1 for c in (m.get("checks") or []) if c["pass"] is not None) for m in ok)
        body.append(f"<tr><td>{html.escape(vlabel)}</td><td>{jw}</td><td>{len(ok)}/{len(ms)}</td>"
                    f"<td>{avg('num_turns')}</td><td>{round(avg('words'))}</td>"
                    f"<td>{total_s // 60}m {total_s % 60}s</td><td>{cp}/{ct}</td></tr>")
    body.append("</table>")
    body.append('<div class="sub" style="margin:-32px 0 40px;font-size:13px">Turns, words, and time '
                'describe personality, not quality. Fewer words can mean concise or incomplete; '
                'quality lives in the checks column and the judge verdicts.</div>')

    # the full rubric table (score.py persists it into results.json)
    dims = results.get("dimensions") or {}
    if dims:
        DIMS = [("Quality (blind judge, 1-10)", "quality"),
                ("Instruction fidelity", "fidelity"),
                ("Output tokens per task", "avg_tokens"),
                ("Token efficiency (quality / 1K tokens)", "quality_per_1k_tokens"),
                ("Soul (reads like a person)", "soul"),
                ("Lecture factor (lower is better)", "lecture"),
                ("Padding (lower is better)", "padding")]
        body.append('<h2 style="font-size:20px;margin-bottom:12px">The rubric: what "better" means here</h2>')
        body.append('<table class="glance"><tr><th>dimension</th>' +
                    "".join(f"<th>{html.escape(v)}</th>" for v in dims) + "</tr>")
        for label, key in DIMS:
            body.append(f"<tr><td>{label}</td>" + "".join(
                f"<td>{dims[v].get(key) if dims[v].get(key) is not None else '-'}</td>"
                for v in dims) + "</tr>")
        body.append("</table>")

    # quarantine disclosure
    q = results.get("quarantine") or {}
    if q:
        items = "; ".join(f"{tid}: {', '.join(ls)}" for tid, ls in q.items())
        body.append(f'<div class="judge" style="margin-bottom:40px"><b>Checks quarantined</b> '
                    f'(every model failed them, so the test is broken, not the models): {html.escape(items)}</div>')

    ordered = sorted(results["tasks"].items(),
                     key=lambda kv: -drama.get(kv[0], 0))  # biggest verdict gap first
    for tid, by_v in ordered:
        task = tasks_by_id.get(tid, {})
        share = f"{task.get('share_pct','?')}% of your workload"
        arch = task.get("archetype", "")
        body.append('<div class="task">')
        body.append(f'<div class="kicker">{html.escape(arch)} · {share}</div>')
        body.append(f"<h2>{html.escape(tid)}</h2>")
        gap = drama.get(tid, 0)
        if gap:
            pct = min(100, round(gap / 9 * 100))
            label = "decisive" if gap >= 4 else ("clear" if gap >= 2 else "close call")
            body.append(f'<div style="display:flex;align-items:center;gap:10px;margin:2px 0 12px">'
                        f'<div style="height:6px;border-radius:3px;background:#C15F3C;width:{pct * 2.4}px"></div>'
                        f'<span style="font-size:12.5px;color:#8a877e">verdict gap {gap:g}/9 · {label}</span></div>')
        body.append(f'<div class="promptbox">{html.escape(task.get("prompt","")[:1200])}</div>')
        if task.get("rubric"):
            body.append('<div class="rubric">Judged on: ' +
                        " · ".join(html.escape(r) for r in task["rubric"][:4]) + "</div>")
        body.append('<div class="cols">')
        for i, vlabel in enumerate(variants):
            m = by_v.get(vlabel) or {}
            cls = "col before" if i == 0 else "col after"
            out_text = m.get("result") or m.get("error") or "(no output)"
            preview = html.escape(out_text[:280]) + ("…" if len(out_text) > 280 else "")
            body.append(f'<div class="{cls}"><h3>{html.escape(vlabel)}</h3>'
                        f'<div class="chips">{chips(m)}</div>'
                        f'<div class="out" style="max-height:none;border:0;padding-top:8px">{preview}</div>'
                        f'<details><summary>show full output</summary>'
                        f'<div class="out">{html.escape(out_text[:6000])}</div></details></div>')
        body.append("</div>")
        for j in judge_by_task.get(tid, []):
            body.append(f'<div class="judge">{html.escape(j)}</div>')
        # vibe evidence: the intangibles, in the models' own words
        for key, vv in (results.get("verdicts") or {}).items():
            v_tid, v_ch = key.split("|", 1)
            vb = (vv or {}).get("vibe")
            if v_tid != tid or not vb:
                continue
            ev = vb.get("evidence") or {}
            ref_v = variants[0]
            parts = [f"Vibe: {html.escape(ref_v)} soul {vb['ref'].get('soul')} / lecture {vb['ref'].get('lecture')}"
                     f" vs {html.escape(v_ch)} soul {vb['ch'].get('soul')} / lecture {vb['ch'].get('lecture')}."]
            if ev.get("a"):
                parts.append(f'{html.escape(ref_v)}: &ldquo;{html.escape(ev["a"])}&rdquo;')
            if ev.get("b"):
                parts.append(f'{html.escape(v_ch)}: &ldquo;{html.escape(ev["b"])}&rdquo;')
            body.append('<div class="judge" style="border-left-color:#B1ADA1">' + "<br>".join(parts) + "</div>")
        body.append("</div>")

    body.append("""<script>
const T=[...document.querySelectorAll('.task')];let i=-1;
addEventListener('keydown',e=>{
  if(e.key!=='j'&&e.key!=='k')return;
  i=e.key==='j'?Math.min(i+1,T.length-1):Math.max(i-1,0);
  T[i].scrollIntoView({behavior:'smooth',block:'start'});
});
</script>""")
    out = run_dir / "report.html"
    out.write_text("<!doctype html><meta charset='utf-8'><title>Personal Benchmark</title>"
                   f"<style>{CSS}</style>" + "\n".join(body))
    print(f"Report: {out}")
    write_share_card(run_dir, results, pack, variants)
    # if a live view was on screen during the run, hand it off to the finished report
    if (run_dir / "live.html").exists():
        (run_dir / "live.html").write_text(
            "<!doctype html><meta charset='utf-8'>"
            "<meta http-equiv='refresh' content='0;url=report.html'>"
            "<title>Verdict ready</title>")


def write_share_card(run_dir, results, pack, variants):
    """share.html: one frozen 16:9 frame, verdict in huge type. Built to be
    full-screened on camera or cropped into a thumbnail."""
    vfile = run_dir / "verdict.json"
    tv = json.loads(vfile.read_text()) if vfile.exists() else {}
    wins_by_variant = {}
    for key, vv in (results.get("verdicts") or {}).items():
        if vv.get("outcome") == "win":
            wins_by_variant[key.split("|", 1)[1]] = wins_by_variant.get(key.split("|", 1)[1], 0) + 1
    n_tasks_total = len(results["tasks"])

    rows = []
    for i, vlabel in enumerate(variants):
        ms = [bv.get(vlabel) for bv in results["tasks"].values()]
        ok = [m for m in ms if m and not m.get("error") and not m.get("is_error")]
        if not ok:
            continue
        avg = lambda k: round(sum(m.get(k) or 0 for m in ok) / len(ok), 1)
        cp = sum(sum(1 for c in (m.get("checks") or []) if c["pass"] is True) for m in ok)
        ct = sum(sum(1 for c in (m.get("checks") or []) if c["pass"] is not None) for m in ok)
        jw = "ref" if i == 0 else f"{wins_by_variant.get(vlabel, 0)} of {n_tasks_total}"
        rows.append((vlabel, jw, avg("num_turns"), round(avg("words")), f"{cp}/{ct}"))

    short = lambda s: html.escape(re.sub(r"^claude-", "", s))
    table = "".join(
        f"<tr><td>{short(v)}</td><td>{jw}</td><td>{t}</td><td>{w}</td><td>{c}</td></tr>"
        for v, jw, t, w, c in rows)
    n_tasks = len(results["tasks"])
    card = f"""<!doctype html><meta charset='utf-8'><title>Verdict</title><style>
body{{margin:0;background:#F4F3EE;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#141413}}
.frame{{width:1920px;height:1080px;box-sizing:border-box;padding:90px 110px;display:flex;flex-direction:column;justify-content:center;transform-origin:top left}}
.kick{{color:#C15F3C;font:700 26px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;margin-bottom:28px}}
h1{{font-size:76px;line-height:1.08;margin:0 0 30px;max-width:1500px}}
.rec{{font-size:32px;line-height:1.4;max-width:1450px;margin-bottom:48px}}
.rec b{{color:#C15F3C}}
table{{border-collapse:collapse;font-size:27px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 14px rgba(20,20,19,.07)}}
th{{background:#141413;color:#F4F3EE;padding:16px 34px;text-align:left;font-weight:600}}
td{{padding:15px 34px;border-top:1px solid #EEECE5}}
td:first-child{{font-weight:700}}
.foot{{margin-top:44px;color:#B1ADA1;font-size:21px}}
</style><body><div class='frame'>
<div class='kick'>My benchmark · {n_tasks} tasks from my own work</div>
<h1>{html.escape(tv.get('headline', 'Personal benchmark results'))}</h1>
<div class='rec'><b>Recommendation:</b> {html.escape(tv.get('recommendation', ''))}</div>
<table><tr><th>model</th><th>wins</th><th>avg turns</th><th>avg words</th><th>checks</th></tr>{table}</table>
<div class='foot'>{html.escape(tv.get('caveat', ''))}</div>
</div><script>
const f=document.querySelector('.frame');
function fit(){{const s=Math.min(innerWidth/1920,innerHeight/1080);f.style.transform=`scale(${{s}})`}}
addEventListener('resize',fit);fit();
</script></body>"""
    (run_dir / "share.html").write_text(card)
    print(f"Share card: {run_dir}/share.html")


if __name__ == "__main__":
    main()
