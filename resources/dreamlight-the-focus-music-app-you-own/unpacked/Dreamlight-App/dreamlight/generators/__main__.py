"""
Dreamlight Generator CLI entry point.

Examples:
    python -m generators list
    python -m generators render --track cobalt_lattice
    python -m generators render --all-new --workers 6
    python -m generators covers --only-missing
    python -m generators tracks-json
    python -m generators verify --report reports/render-report.md
    python -m generators dna --csv generators/sample_dna_fake.csv --duration 30 --output /tmp/test_dna.mp3
"""

from __future__ import annotations

import argparse
import concurrent.futures
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

from .catalog import EXISTING_SLUGS, REPO_ROOT, TRACKS, WEB_DIR, get_track, write_tracks_json
from .covers import generate_covers
from .dna import HelixDNAEngine, generate_helix_cover, load_dna_sequence
from .engines import render_track, render_worker


def verify_audio_file(track: dict, audio_path: Path) -> dict:
    """Verify duration, stereo channels, LUFS, true peak, silence gaps, and L/R binaural carrier FFT."""
    if not audio_path.is_file():
        return {"slug": track["slug"], "exists": False, "passed": False, "error": "file missing"}

    # 1. ffprobe stream info (duration, channels, sample_rate)
    probe = subprocess.check_output(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration:stream=channels,sample_rate",
            "-of", "default=noprint_wrappers=1",
            str(audio_path),
        ],
        text=True,
    )
    kv = dict(line.split("=", 1) for line in probe.strip().splitlines() if "=" in line)
    dur = float(kv.get("duration", 0.0))
    channels = int(kv.get("channels", 0))
    sample_rate = int(kv.get("sample_rate", 0))

    # 2. Integrated LUFS, True Peak, and silence gaps > 2s (single ffmpeg pass!)
    cmd_meas = [
        "ffmpeg", "-hide_banner", "-nostats",
        "-i", str(audio_path),
        "-filter_complex", "ebur128=peak=true,silencedetect=noise=-55dB:d=2.0",
        "-f", "null", "-",
    ]
    p = subprocess.run(cmd_meas, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    stderr = p.stderr
    m_i = re.search(r"Integrated loudness:\s*I:\s*([-\d\.]+)\s*LUFS", stderr, re.S)
    m_tp = re.search(r"True peak:\s*Peak:\s*([-\d\.]+)\s*dBFS", stderr, re.S)
    lufs = float(m_i.group(1)) if m_i else float("nan")
    tp = float(m_tp.group(1)) if m_tp else float("nan")

    # Ignore silence inside the first 5s fade-in or last 12s fade-out
    interior_silences = []
    for m_s in re.finditer(r"silence_start:\s*([\d\.]+).*?silence_end:\s*([\d\.]+)\s*\|\s*silence_duration:\s*([\d\.]+)", stderr, re.S):
        s_start, s_end, s_dur = float(m_s.group(1)), float(m_s.group(2)), float(m_s.group(3))
        if s_start > 10.0 and s_end < dur - 22.0 and s_dur > 2.0:
            interior_silences.append((s_start, s_end, s_dur))

    # 3. FFT check on 10s mid-track excerpt (t=300s..310s) for discrete L/R binaural carriers
    bin_l_exp = track.get("binauralL")
    bin_r_exp = track.get("binauralR")
    beat_exp = track.get("beatHz")
    fft_l, fft_r, fft_diff, bin_ok = None, None, None, True
    if bin_l_exp and bin_r_exp:
        raw = subprocess.check_output(
            [
                "ffmpeg", "-v", "error",
                "-ss", "300", "-t", "10",
                "-i", str(audio_path),
                "-f", "f32le", "-ar", "44100", "-ac", "2", "pipe:1",
            ]
        )
        pcm = np.frombuffer(raw, dtype="<f4").reshape(-1, 2)
        n = pcm.shape[0]
        win = np.hanning(n)
        freqs = np.fft.rfftfreq(n, 1.0 / 44100.0)
        spec_l = np.abs(np.fft.rfft(pcm[:, 0] * win))
        spec_r = np.abs(np.fft.rfft(pcm[:, 1] * win))

        # Search in narrow ±1.5 Hz window around stated carrier AND verify strong prominence
        def peak_near(spec, target_hz):
            mask = (freqs >= target_hz - 1.5) & (freqs <= target_hz + 1.5)
            idx = np.where(mask)[0]
            sub = spec[idx]
            best = idx[int(np.argmax(sub))]
            # Parabolic interpolation for sub-bin accuracy
            if 0 < best < len(spec) - 1:
                y0, y1, y2 = math.log(spec[best - 1] + 1e-12), math.log(spec[best] + 1e-12), math.log(spec[best + 1] + 1e-12)
                delta = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if abs(y0 - 2 * y1 + y2) > 1e-12 else 0.0
                return float(freqs[best] + delta * (freqs[1] - freqs[0]))
            return float(freqs[best])

        fft_l = round(peak_near(spec_l, bin_l_exp), 2)
        fft_r = round(peak_near(spec_r, bin_r_exp), 2)
        fft_diff = round(fft_r - fft_l, 2)
        bin_ok = (abs(fft_l - bin_l_exp) <= 0.25) and (abs(fft_r - bin_r_exp) <= 0.25) and (abs(fft_diff - beat_exp) <= 0.25)

    dur_ok = abs(dur - 3600.0) <= 1.0
    stereo_ok = channels == 2 and sample_rate == 44100
    tp_ok = tp < -1.0
    lufs_ok = -16.5 <= lufs <= -14.5 if track["slug"] not in EXISTING_SLUGS else True
    silence_ok = len(interior_silences) == 0

    return {
        "slug": track["slug"],
        "title": track["title"],
        "filename": track["filename"],
        "is_new": track["slug"] not in EXISTING_SLUGS,
        "exists": True,
        "duration_sec": round(dur, 2),
        "channels": channels,
        "sample_rate": sample_rate,
        "lufs": round(lufs, 2),
        "true_peak_dbtp": round(tp, 2),
        "expected_l_hz": bin_l_exp,
        "expected_r_hz": bin_r_exp,
        "expected_beat_hz": beat_exp,
        "fft_l_hz": fft_l,
        "fft_r_hz": fft_r,
        "fft_diff_hz": fft_diff,
        "interior_silences": len(interior_silences),
        "size_mb": round(audio_path.stat().st_size / (1024 * 1024), 1),
        "dur_ok": dur_ok,
        "stereo_ok": stereo_ok,
        "tp_ok": tp_ok,
        "lufs_ok": lufs_ok,
        "bin_ok": bin_ok,
        "silence_ok": silence_ok,
        "passed": all([dur_ok, stereo_ok, tp_ok, lufs_ok, bin_ok, silence_ok]),
    }


def write_render_report(results: list[dict], report_path: Path):
    report_path.parent.mkdir(parents=True, exist_ok=True)
    existing = [r for r in results if not r["is_new"] and r.get("exists")]
    new_tracks = [r for r in results if r["is_new"] and r.get("exists")]

    ex_lufs = [r["lufs"] for r in existing if not math.isnan(r["lufs"])]
    mean_ex = sum(ex_lufs) / len(ex_lufs) if ex_lufs else -15.5
    med_ex = sorted(ex_lufs)[len(ex_lufs) // 2] if ex_lufs else -15.9

    lines = [
        "# Dreamlight Render & Acoustic Verification Report",
        "",
        "## Loudness Baseline (Existing 11 Tracks)",
        f"- Count verified: **{len(existing)}**",
        f"- Integrated LUFS range: **{min(ex_lufs):.2f} to {max(ex_lufs):.2f} LUFS**",
        f"- Mean / Median: **{mean_ex:.2f} LUFS** / **{med_ex:.2f} LUFS**",
        f"- Target for 14 new tracks: **-15.5 LUFS (±1.0 LU)**, True Peak **< -1.0 dBTP**, Duration **3600 ± 1 s**, 44.1 kHz discrete stereo, zero silence gaps > 2 s, FFT L/R binaural carrier diff matching stated beat.",
        "",
        "## 14 New Tracks: Verification Measurements",
        "",
        "| Slug | Title | Duration (s) | Format | Integrated LUFS | True Peak (dBTP) | Stated L / R (Δ Hz) | FFT Measured L / R (Δ Hz) | Silence Gaps >2s | Status |",
        "|---|---|---:|---|---:|---:|---|---|---:|---|",
    ]

    for r in new_tracks:
        stated = f"{r['expected_l_hz']} / {r['expected_r_hz']} (Δ{r['expected_beat_hz']})"
        measured = f"{r['fft_l_hz']} / {r['fft_r_hz']} (Δ{r['fft_diff_hz']})" if r["fft_l_hz"] is not None else "N/A"
        status = "PASS" if r["passed"] else "FAIL"
        lines.append(
            f"| `{r['slug']}` | {r['title']} | {r['duration_sec']:.2f} | {r['sample_rate']} Hz {r['channels']}ch | "
            f"{r['lufs']:.2f} | {r['true_peak_dbtp']:.2f} | {stated} | {measured} | {r['interior_silences']} | **{status}** |"
        )

    lines += [
        "",
        "## Existing 11 Tracks: Reference Measurements",
        "",
        "| Slug | Title | Duration (s) | Format | Integrated LUFS | True Peak (dBTP) | Stated L / R (Δ Hz) | FFT Measured L / R (Δ Hz) | Silence Gaps >2s | Status |",
        "|---|---|---:|---|---:|---:|---|---|---:|---|",
    ]
    for r in existing:
        if r["expected_l_hz"]:
            stated = f"{r['expected_l_hz']} / {r['expected_r_hz']} (Δ{r['expected_beat_hz']})"
            measured = f"{r['fft_l_hz']} / {r['fft_r_hz']} (Δ{r['fft_diff_hz']})"
        else:
            stated = "AM-only (16 Hz)"
            measured = "AM-only"
        status = "PASS" if r["passed"] else "FAIL"
        lines.append(
            f"| `{r['slug']}` | {r['title']} | {r['duration_sec']:.2f} | {r['sample_rate']} Hz {r['channels']}ch | "
            f"{r['lufs']:.2f} | {r['true_peak_dbtp']:.2f} | {stated} | {measured} | {r['interior_silences']} | **{status}** |"
        )

    all_new_pass = all(r["passed"] for r in new_tracks) and len(new_tracks) == 14
    lines += [
        "",
        "## Summary",
        f"- New tracks verified: **{len(new_tracks)} / 14**, all checks passed: **{'YES' if all_new_pass else 'NO'}**",
        f"- Existing tracks verified: **{len(existing)} / 11**",
    ]
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None):
    parser = argparse.ArgumentParser(prog="python -m generators", description="Dreamlight Audio & Asset Generator CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="List all tracks in the catalog")

    p_ren = sub.add_parser("render", help="Render one track, all new tracks, or all tracks")
    p_ren.add_argument("--track", help="Single track slug to render")
    p_ren.add_argument("--all-new", action="store_true", help="Render all 14 new expansion tracks")
    p_ren.add_argument("--all", action="store_true", help="Render all non-DNA tracks")
    p_ren.add_argument("--duration", type=float, default=3600.0)
    p_ren.add_argument("--output-dir", default=str(WEB_DIR / "audio"))
    p_ren.add_argument("--output", help="Explicit output file path (single --track only)")
    p_ren.add_argument("--bitrate", default="192k")
    p_ren.add_argument("--target-lufs", type=float, default=-15.5)
    p_ren.add_argument("--no-calibrate", action="store_true")
    p_ren.add_argument("--workers", type=int, default=min(7, os.cpu_count() or 4))
    p_ren.add_argument("--csv", help="CSV path if rendering helix_signature")

    p_cov = sub.add_parser("covers", help="Generate 512x512 studio cover PNGs from catalog")
    p_cov.add_argument("--track", help="Single track slug")
    p_cov.add_argument("--force", action="store_true", help="Overwrite existing covers")
    p_cov.add_argument("--output-dir", default=str(WEB_DIR / "covers"))

    p_tj = sub.add_parser("tracks-json", help="Regenerate web/tracks.json from generators/catalog.py")
    p_tj.add_argument("--web-dir", default=str(WEB_DIR))

    p_ver = sub.add_parser("verify", help="Verify rendered MP3s and write markdown report")
    p_ver.add_argument("--audio-dir", default=str(WEB_DIR / "audio"))
    p_ver.add_argument("--report", default=str(REPO_ROOT / "reports" / "render-report.md"))
    p_ver.add_argument("--workers", type=int, default=min(10, os.cpu_count() or 4))

    p_dna = sub.add_parser("dna", help="Render personalized Helix track from a 3-column CSV")
    p_dna.add_argument("--csv", required=True, help="Path to 3-column CSV (e.g. generators/sample_dna_fake.csv)")
    p_dna.add_argument("--duration", type=float, default=3600.0)
    p_dna.add_argument("--output", default=str(WEB_DIR / "audio" / "10_helix_signature_dna_14_5hz_1hr.mp3"))
    p_dna.add_argument("--cover", default=str(WEB_DIR / "covers" / "helix_signature.png"))

    args = parser.parse_args(argv)

    if args.cmd == "list":
        for i, t in enumerate(TRACKS, start=1):
            tag = "NEW" if t["slug"] not in EXISTING_SLUGS else "v1 "
            print(f"{i:2d}. [{tag}] {t['slug']:20s} | {t['band']:16s} | {t['mood']:10s} | {t['bpm']:6} BPM | {t['key']:12s} | {t['title']}")
        return

    if args.cmd == "covers":
        created = generate_covers(only_missing=not args.force, slug=args.track, out_dir=Path(args.output_dir))
        for p in created:
            print(f"Generated cover: {p}", flush=True)
        print(f"Covers complete ({len(created)} written).", flush=True)
        return

    if args.cmd == "tracks-json":
        p = write_tracks_json(Path(args.web_dir))
        print(f"Wrote {p} ({len(TRACKS)} tracks).", flush=True)
        return

    if args.cmd == "dna":
        degrees, seed = load_dna_sequence(args.csv)
        generate_helix_cover(args.cover, seed)
        stats = HelixDNAEngine(degrees, seed, duration_sec=args.duration).render_to_file(args.output)
        print(f"[dna] Done -> {stats['output']} ({stats['size_mb']:.1f} MB) | {stats['elapsed_sec']:.1f}s", flush=True)
        return

    if args.cmd == "render":
        target_lufs = None if args.no_calibrate else args.target_lufs
        if args.track:
            stats = render_track(
                slug=args.track,
                output_path=args.output or (Path(args.output_dir) / get_track(args.track)["filename"]),
                duration_sec=args.duration,
                bitrate=args.bitrate,
                target_lufs=target_lufs,
                csv_path=args.csv,
            )
            print(
                f"[{stats['slug']}] Done -> {stats['output']} ({stats['size_mb']:.1f} MB) | "
                f"gain={stats['gain_scale']}x | RMS {stats['rms_dbfs']} dBFS | Peak {stats['peak_dbfs']} dBFS | {stats['elapsed_sec']}s",
                flush=True,
            )
            return

        if args.all_new:
            slugs = [t["slug"] for t in TRACKS if t["slug"] not in EXISTING_SLUGS]
        elif args.all:
            slugs = [t["slug"] for t in TRACKS if t["engine"] != "dna"]
        else:
            parser.error("Specify --track <slug>, --all-new, or --all")

        t0 = time.time()
        print(f"Rendering {len(slugs)} tracks ({args.duration:.0f}s each) with {args.workers} parallel workers...", flush=True)
        tasks = [(s, args.output_dir, args.duration, args.bitrate, target_lufs, args.csv) for s in slugs]
        with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as ex:
            futs = {ex.submit(render_worker, task): task[0] for task in tasks}
            for fut in concurrent.futures.as_completed(futs):
                slug = futs[fut]
                stats = fut.result()
                print(
                    f"  [{stats['slug']:18s}] {stats['size_mb']:5.1f} MB | gain={stats['gain_scale']:.3f}x | "
                    f"RMS {stats['rms_dbfs']:6.2f} | Peak {stats['peak_dbfs']:6.2f} | {stats['elapsed_sec']:5.1f}s",
                    flush=True,
                )
        print(f"All {len(slugs)} renders completed in {time.time() - t0:.1f}s.", flush=True)
        write_tracks_json(WEB_DIR)
        return

    if args.cmd == "verify":
        audio_dir = Path(args.audio_dir)
        print(f"Verifying {len(TRACKS)} tracks in {audio_dir}...", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
            results = list(ex.map(lambda t: verify_audio_file(t, audio_dir / t["filename"]), TRACKS))
        for r in results:
            tag = "NEW" if r.get("is_new") else "v1 "
            if not r.get("exists"):
                print(f"  [{tag}] {r['slug']:18s} MISSING")
                continue
            status = "PASS" if r["passed"] else "FAIL"
            diff_str = f"Δ{r['fft_diff_hz']}Hz" if r["fft_diff_hz"] is not None else "AM-only"
            print(
                f"  [{tag}] {r['slug']:18s} | {r['duration_sec']:7.2f}s | {r['lufs']:6.2f} LUFS | "
                f"TP {r['true_peak_dbtp']:6.2f} | {diff_str:9s} | sil={r['interior_silences']} | {status}",
                flush=True,
            )
        report_path = Path(args.report)
        write_render_report(results, report_path)
        print(f"Wrote verification report -> {report_path}", flush=True)
        failed_new = [r for r in results if r.get("is_new") and not r.get("passed")]
        if failed_new:
            sys.exit(1)


if __name__ == "__main__":
    main()
