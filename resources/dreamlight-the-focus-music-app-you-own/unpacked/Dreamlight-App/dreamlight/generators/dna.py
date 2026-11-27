"""
Personalized 1-hour binaural focus track generator driven by a 60-row marker CSV.

Deterministically hashes any 3-column CSV (symbol, id, genotype) into a melodic
motif (scale degrees 0..6) and PRNG seed without ever storing or exporting raw
marker values. Pass `--csv generators/sample_dna_fake.csv` to test with the
bundled synthetic example data.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import math
import os
import subprocess
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .dsp import (
    SR,
    OverlapAddConvolver,
    StereoPingPongDelay,
    design_fir_kernel,
    design_reverb_ir,
    midi_to_hz,
    render_chord_pad,
    render_sub_bass,
    synth_pluck_note,
    synthesize_kick,
)


def load_dna_sequence(csv_path: str) -> tuple[list[int], int]:
    """Parse a 3-column marker CSV into a deterministic musical motif (0..6) and 32-bit seed."""
    genotype_to_degree = {
        "AA": 0, "CC": 1, "GG": 2, "TT": 3,
        "AG": 4, "CT": 5, "CG": 6, "AT": 2,
        "ID": 4, "DELETION": 6,
    }
    degrees: list[int] = []
    h = hashlib.sha256()
    with open(csv_path, "r", encoding="utf-8") as f:
        for row in csv.reader(f):
            if not row or row[0].strip().startswith("#") or len(row) < 3:
                continue
            gene, rsid, gt = row[0].strip(), row[1].strip(), row[2].strip().upper()
            h.update(f"{gene}:{rsid}:{gt}|".encode("utf-8"))
            degrees.append(genotype_to_degree.get(gt, len(degrees) % 7))
    seed = int.from_bytes(h.digest()[:4], "big")
    if not degrees:
        degrees = [0, 2, 4, 5, 3, 1, 6]
    return degrees, seed


def generate_helix_cover(out_path: str, seed: int) -> str:
    """Render a custom 512x512 glowing emerald-gold-sapphire double-helix cover art."""
    S = 512
    rng = np.random.default_rng(seed & 0xFFFFFFFF)
    xs = np.linspace(-1.0, 1.0, S, dtype=np.float32)
    X, Y = np.meshgrid(xs, xs)

    g1 = np.exp(-((X + 0.30) ** 2 * 1.4 + (Y + 0.35) ** 2 * 1.4))
    g2 = np.exp(-((X - 0.34) ** 2 * 1.5 + (Y - 0.30) ** 2 * 1.5))
    g3 = np.exp(-(X ** 2 * 2.2 + Y ** 2 * 2.2))

    r = 6 + g1 * 38 + g2 * 26 + g3 * 88
    g = 10 + g1 * 92 + g2 * 112 + g3 * 72
    b = 22 + g1 * 135 + g2 * 108 + g3 * 48

    vig = np.clip(1.0 - 0.42 * (X ** 2 + Y ** 2), 0.35, 1.0)
    grain = rng.normal(0.0, 1.05, (S, S)).astype(np.float32)
    rgb = np.stack([
        np.clip(r * vig + grain, 0, 255),
        np.clip(g * vig + grain, 0, 255),
        np.clip(b * vig + grain, 0, 255),
    ], axis=-1).astype(np.uint8)
    img = Image.fromarray(rgb, "RGB").convert("RGBA")

    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    crisp = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cd = ImageDraw.Draw(crisp)
    cx = cy = S // 2

    pts_a, pts_b = [], []
    n_pts = 120
    ang = -math.pi / 4.2
    ca, sa = math.cos(ang), math.sin(ang)

    for i in range(n_pts):
        u = i / (n_pts - 1)
        s = (u - 0.5) * 370.0
        taper = math.sin(u * math.pi) ** 0.75
        amp = 54.0 * taper
        w = math.sin(u * math.pi * 4.2)
        xa, ya = s, w * amp
        xb, yb = s, -w * amp
        pts_a.append((cx + xa * ca - ya * sa, cy + xa * sa + ya * ca))
        pts_b.append((cx + xb * ca - yb * sa, cy + xb * sa + yb * ca))

    for i in range(6, n_pts - 6, 6):
        col = (245, 208, 169, 175) if (i // 6) % 2 == 0 else (56, 217, 192, 175)
        gd.line([pts_a[i], pts_b[i]], fill=col, width=7)
        cd.line([pts_a[i], pts_b[i]], fill=(255, 248, 236, 170), width=2)

    gd.ellipse((cx - 178, cy - 178, cx + 178, cy + 178), outline=(96, 165, 250, 125), width=7)
    cd.ellipse((cx - 178, cy - 178, cx + 178, cy + 178), outline=(245, 208, 169, 140), width=2)

    gd.line(pts_a, fill=(52, 211, 153, 225), width=14, joint="curve")
    gd.line(pts_b, fill=(245, 208, 169, 225), width=14, joint="curve")
    cd.line(pts_a, fill=(167, 243, 208, 245), width=4, joint="curve")
    cd.line(pts_b, fill=(255, 249, 238, 245), width=4, joint="curve")

    for _ in range(42):
        sx, sy = int(rng.integers(24, S - 24)), int(rng.integers(24, S - 24))
        cd.ellipse((sx - 1, sy - 1, sx + 1, sy + 1), fill=(245, 248, 255, int(rng.integers(60, 150))))

    glow = glow.filter(ImageFilter.GaussianBlur(radius=14))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, crisp)
    parent = os.path.dirname(os.path.abspath(out_path))
    if parent:
        os.makedirs(parent, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)
    return out_path


class HelixDNAEngine:
    """
    108.75 BPM · 14.50 Hz Low-Beta / High-SMR personalized binaural engine.
    Maps a sequence of scale degrees into melodic pluck pitches, octave accents, and stereo orbit.
    """

    def __init__(self, dna_degrees: list[int], seed: int, duration_sec: float = 3600.0):
        self.dna = dna_degrees
        self.seed = seed
        self.duration_sec = duration_sec
        self.bpm = 108.75
        self.beat_sec = 60.0 / self.bpm
        self.bar_sec = 4.0 * self.beat_sec
        self.rng = np.random.default_rng(seed)

        self.bin_l = 188.75
        self.bin_r = 203.25
        self.am_hz = 14.50
        self.am_depth = 0.35

        self.total_samples = int(round(duration_sec * SR))
        self.bars_per_block = 8
        self.block_sec = self.bars_per_block * self.bar_sec
        self.block_samples = int(round(self.block_sec * SR))
        self.chord_bars = 2
        self.xfade_sec = 1.8

        self.movements = [
            {
                "pad_brightness": 0.48, "arp_density": 0.50, "kick_level": 0.86, "shimmer_level": 0.32, "mod_scale": 0.94,
                "chords": [
                    (39, [51, 55, 58, 62, 65], [62, 63, 67, 69, 70, 74, 75]),
                    (36, [48, 55, 58, 62, 63], [60, 62, 63, 67, 70, 72, 74]),
                    (32, [44, 51, 55, 58, 62], [60, 62, 63, 67, 70, 74, 75]),
                    (34, [46, 53, 58, 60, 62], [60, 62, 65, 67, 70, 72, 74]),
                ],
            },
            {
                "pad_brightness": 0.62, "arp_density": 0.62, "kick_level": 0.95, "shimmer_level": 0.46, "mod_scale": 1.04,
                "chords": [
                    (31, [43, 50, 53, 57, 58], [62, 65, 67, 69, 70, 74, 77]),
                    (39, [51, 55, 58, 62, 65], [62, 63, 67, 70, 74, 75, 77]),
                    (29, [48, 53, 56, 60, 63], [60, 63, 65, 67, 70, 72, 75]),
                    (34, [46, 53, 56, 60, 63], [60, 62, 65, 67, 70, 72, 75]),
                ],
            },
            {
                "pad_brightness": 0.72, "arp_density": 0.66, "kick_level": 0.92, "shimmer_level": 0.56, "mod_scale": 1.06,
                "chords": [
                    (32, [44, 51, 55, 58, 62], [62, 63, 67, 69, 70, 74, 75]),
                    (39, [51, 55, 58, 62, 67], [62, 63, 67, 70, 74, 75, 79]),
                    (36, [48, 53, 55, 58, 62], [60, 62, 63, 67, 70, 72, 74]),
                    (31, [46, 50, 55, 57, 62], [62, 65, 67, 69, 70, 74, 77]),
                ],
            },
            {
                "pad_brightness": 0.46, "arp_density": 0.42, "kick_level": 0.80, "shimmer_level": 0.30, "mod_scale": 0.90,
                "chords": [
                    (36, [48, 55, 58, 62, 63], [60, 62, 63, 67, 70, 72, 74]),
                    (32, [44, 51, 55, 58, 63], [60, 62, 63, 67, 70, 72, 75]),
                    (34, [46, 53, 58, 60, 62], [60, 62, 65, 67, 70, 72, 74]),
                    (39, [51, 55, 58, 62, 65], [62, 63, 67, 70, 74, 75, 77]),
                ],
            },
        ]

        self.flt_pad_dark = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=85.0, hi_hz=290.0), self.block_samples)
        self.flt_pad_open = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=85.0, hi_hz=840.0), self.block_samples)
        self.flt_shimmer = OverlapAddConvolver(design_fir_kernel(SR, 1025, lo_hz=350.0, hi_hz=1500.0), self.block_samples)
        self.flt_air = OverlapAddConvolver(design_fir_kernel(SR, 513, lo_hz=2500.0, hi_hz=8600.0), self.block_samples)
        self.flt_warm = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=65.0, hi_hz=240.0), self.block_samples)
        self.flt_side_hp = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=185.0, hi_hz=None), self.block_samples)
        self.flt_master = OverlapAddConvolver(design_fir_kernel(SR, 513, lo_hz=None, hi_hz=10000.0), self.block_samples)

        self.ir = design_reverb_ir(SR, duration=3.8, brightness=0.95, seed=(seed + 13) & 0xFFFFFFFF)
        self.reverb = OverlapAddConvolver(self.ir, self.block_samples)
        self.delay = StereoPingPongDelay(SR, delay_l_sec=0.75 * self.beat_sec, delay_r_sec=1.0 * self.beat_sec, feedback=0.44)

        self.kick_cache: dict[float, np.ndarray] = {}
        self.arp_tail = np.zeros((int(1.8 * SR), 2), dtype=np.float64)
        self.kick_tail = np.zeros((int(0.6 * SR), 2), dtype=np.float64)

    def _get_kick(self, bass_midi: int) -> np.ndarray:
        f_root = midi_to_hz(bass_midi)
        while f_root < 45.0:
            f_root *= 2.0
        while f_root > 62.0:
            f_root *= 0.5
        k = round(f_root, 1)
        if k not in self.kick_cache:
            self.kick_cache[k] = synthesize_kick(SR, duration=0.44, f_end=k, tau=0.125)
        return self.kick_cache[k]

    def _mov_at(self, t_sec: float) -> dict:
        prog = min(0.999999, max(0.0, t_sec / max(1.0, self.duration_sec)))
        return self.movements[int(prog * len(self.movements))]

    def _chord_at(self, c_idx: int):
        mov = self._mov_at(c_idx * self.chord_bars * self.bar_sec)
        c = mov["chords"][c_idx % len(mov["chords"])]
        return c[0], c[1], c[2], mov

    def render_block(self, start_sample: int, n_samples: int) -> np.ndarray:
        t = (start_sample + np.arange(n_samples, dtype=np.float64)) / SR
        t0 = start_sample / SR
        mov = self._mov_at(t0 + 0.5 * n_samples / SR)
        chord_dur = self.chord_bars * self.bar_sec

        first_c = int(math.floor((t0 - self.xfade_sec) / chord_dur))
        last_c = int(math.floor((t[-1] + self.xfade_sec) / chord_dur))

        pad_dry = np.zeros((n_samples, 2), dtype=np.float64)
        sub_dry = np.zeros((n_samples, 2), dtype=np.float64)
        shim_dry = np.zeros((n_samples, 2), dtype=np.float64)

        for c_idx in range(max(0, first_c), last_c + 1):
            bass_m, pad_ms, _, _ = self._chord_at(c_idx)
            c_start, c_end = c_idx * chord_dur, (c_idx + 1) * chord_dur
            w_start, w_end = c_start - 0.5 * self.xfade_sec, c_end + 0.5 * self.xfade_sec
            i0 = max(0, int(math.floor((w_start - t0) * SR)))
            i1 = min(n_samples, int(math.ceil((w_end - t0) * SR)))
            if i1 <= i0:
                continue
            t_seg = t[i0:i1]
            win = np.ones_like(t_seg)
            fi = (t_seg >= w_start) & (t_seg < c_start + 0.5 * self.xfade_sec)
            if c_idx > 0:
                win[fi] = 0.5 * (1.0 - np.cos(np.pi * (t_seg[fi] - w_start) / self.xfade_sec))
            fo = (t_seg > c_end - 0.5 * self.xfade_sec) & (t_seg <= w_end)
            win[fo] = 0.5 * (1.0 + np.cos(np.pi * (t_seg[fo] - (c_end - 0.5 * self.xfade_sec)) / self.xfade_sec))

            pad_dry[i0:i1] += render_chord_pad(t_seg, pad_ms, (1.0, 0.38, 0.14, 0.06, 0.02)) * win[:, None]
            sub_dry[i0:i1] += render_sub_bass(t_seg, bass_m, self.beat_sec, 0.50) * win[:, None]
            for s_i, sm in enumerate((pad_ms[1] + 12, pad_ms[3] + 12)):
                sf = midi_to_hz(sm)
                shim_dry[i0:i1, 0] += np.sin(2.0 * np.pi * sf * t_seg + s_i) * 0.5 * win
                shim_dry[i0:i1, 1] += np.sin(2.0 * np.pi * (sf * 1.0018) * t_seg + s_i * 1.5) * 0.5 * win

        pad_dark = self.flt_pad_dark.process(pad_dry)
        pad_open = self.flt_pad_open.process(pad_dry)
        lfo = 0.5 + 0.5 * np.sin(2.0 * np.pi * 0.048 * t + 0.3)
        morph = (0.20 + 0.62 * mov["pad_brightness"]) * (0.45 + 0.55 * lfo)
        pad_shaped = pad_dark * (1.0 - morph[:, None]) + pad_open * morph[:, None]
        shim_swell = (0.35 + 0.65 * (0.5 - 0.5 * np.cos(2.0 * np.pi * 0.03 * t))) * mov["shimmer_level"]
        shim_shaped = self.flt_shimmer.process(shim_dry) * shim_swell[:, None]

        kick_buf = np.zeros((n_samples + len(self.kick_tail), 2), dtype=np.float64)
        kick_buf[: len(self.kick_tail)] += self.kick_tail
        fb = int(math.ceil(t0 / self.beat_sec - 1e-9))
        lb = int(math.floor((t0 + n_samples / SR) / self.beat_sec - 1e-9))
        for b_idx in range(max(0, fb), lb + 1):
            b_time = b_idx * self.beat_sec
            pos = int(round(b_time * SR)) - start_sample
            if pos < 0 or pos >= n_samples:
                continue
            bass_m, _, _, b_mov = self._chord_at(int(b_time // chord_dur))
            tmpl = self._get_kick(bass_m)
            acc = (1.00, 0.76, 0.88, 0.78)[b_idx % 4]
            ir = min(1.0, max(0.0, (b_time - 3.0) / 12.0))
            oramp = min(1.0, max(0.0, (self.duration_sec - 28.0 - b_time) / 20.0)) if self.duration_sec > 60 else 1.0
            gain = acc * b_mov["kick_level"] * ir * oramp * (0.90 + 0.10 * math.sin(2.0 * math.pi * b_time / 120.0))
            if gain <= 1e-4:
                continue
            kick_buf[pos : pos + len(tmpl), 0] += tmpl * gain
            kick_buf[pos : pos + len(tmpl), 1] += tmpl * gain
        kick_dry = kick_buf[:n_samples]
        self.kick_tail = kick_buf[n_samples : n_samples + len(self.kick_tail)].copy()

        arp_buf = np.zeros((n_samples + len(self.arp_tail), 2), dtype=np.float64)
        arp_buf[: len(self.arp_tail)] += self.arp_tail
        step_sec = self.beat_sec / 2.0
        fs = int(math.ceil(t0 / step_sec - 1e-9))
        ls = int(math.floor((t0 + n_samples / SR) / step_sec - 1e-9))
        n_dna = len(self.dna)
        for s_idx in range(max(0, fs), ls + 1):
            s_time = s_idx * step_sec
            pos = int(round(s_time * SR)) - start_sample
            if pos < 0 or pos >= n_samples or s_time < 5.0:
                continue
            if self.duration_sec > 60.0 and s_time > self.duration_sec - 24.0:
                continue
            _, _, scale, s_mov = self._chord_at(int(s_time // chord_dur))

            dna_val = self.dna[s_idx % n_dna]
            dna_next = self.dna[(s_idx + 7) % n_dna]
            step_in_bar = s_idx % 8
            r_w = (0.88, 0.30, 0.58, 0.74, 0.36, 0.66, 0.80, 0.28)
            if self.rng.random() > s_mov["arp_density"] * r_w[step_in_bar]:
                continue

            midi_n = scale[(dna_val + (s_idx // n_dna)) % len(scale)]
            if dna_next == 6 and self.rng.random() < 0.35:
                midi_n += 12
            elif dna_next == 0 and self.rng.random() < 0.28:
                midi_n -= 12

            vel = 0.48 + 0.055 * dna_val + 0.14 * self.rng.random()
            pluck = synth_pluck_note(SR, midi_to_hz(midi_n), dur=1.05, vel=vel, fm_index=0.42, decay_fast=0.30)
            pan = 0.62 * math.sin(2.0 * math.pi * 0.44 * s_time + dna_val * 0.45)
            angle = (pan + 1.0) * (math.pi / 4.0)
            arp_buf[pos : pos + len(pluck), 0] += pluck * math.cos(angle)
            arp_buf[pos : pos + len(pluck), 1] += pluck * math.sin(angle)

        arp_dry = arp_buf[:n_samples]
        self.arp_tail = arp_buf[n_samples : n_samples + len(self.arp_tail)].copy()
        arp_total = arp_dry * 0.72 + self.delay.process(arp_dry) * 0.58

        white = self.rng.standard_normal((n_samples, 2))
        warm_n = self.flt_warm.process(white)
        air_b = self.flt_air.process(white)
        t_beat = np.mod(t, self.beat_sec)
        t_eig = np.mod(t, self.beat_sec * 0.5)
        brush = (0.30 + 0.70 * np.exp(-t_eig / 0.052)) * (0.76 + 0.24 * np.exp(-t_beat / 0.11))
        pan_w = 0.26 * np.sin(2.0 * np.pi * 0.47 * t)
        air_s = np.column_stack([air_b[:, 0] * brush * (1 + pan_w), air_b[:, 1] * brush * (1 - pan_w)])

        rev = self.reverb.process(pad_shaped * 0.48 + shim_shaped * 0.60 + arp_total * 0.60)
        slow_var = 0.88 + 0.12 * np.sin(2.0 * np.pi * (1.0 / 32.0) * t)
        eff_d = min(0.50, self.am_depth * mov["mod_scale"]) * slow_var
        am_l = 1.0 - eff_d * 0.5 * (1.0 - np.cos(2.0 * np.pi * self.am_hz * t))
        am_r = 1.0 - eff_d * 0.5 * (1.0 - np.cos(2.0 * np.pi * self.am_hz * t + 0.30))
        am_st = np.column_stack([am_l, am_r])

        ambient = pad_shaped * 0.125 + shim_shaped * 0.025 + arp_total * 0.075 + rev * 0.125 + air_s * 0.068
        low = kick_dry * 0.285 + sub_dry * 0.215 + warm_n * 0.011
        mix = low + ambient * am_st * (1.0 - 0.10 * np.exp(-t_beat / 0.11))[:, None]

        mid = 0.5 * (mix[:, 0] + mix[:, 1])
        side = 0.5 * (mix[:, 0] - mix[:, 1])
        side_hp = self.flt_side_hp.process(np.column_stack([side, side]))[:, 0]
        mix[:, 0] = mid + side_hp
        mix[:, 1] = mid - side_hp
        mix = self.flt_master.process(mix)

        bb = 0.86 + 0.14 * np.sin(2.0 * np.pi * 0.025 * t)
        mix[:, 0] += np.sin(2.0 * np.pi * self.bin_l * t) * 0.056 * bb
        mix[:, 1] += np.sin(2.0 * np.pi * self.bin_r * t) * 0.056 * bb

        fi_sec = min(10.0, self.duration_sec * 0.15)
        fo_sec = min(22.0, self.duration_sec * 0.20)
        if t[0] < fi_sec:
            mix *= (0.5 * (1.0 - np.cos(np.pi * np.clip(t / fi_sec, 0.0, 1.0))))[:, None]
        if t[-1] > self.duration_sec - fo_sec:
            mix *= (0.5 * (1.0 - np.cos(np.pi * np.clip((self.duration_sec - t) / fo_sec, 0.0, 1.0))))[:, None]

        mix = np.tanh(mix * 1.08) / 1.08
        return np.clip(mix, -0.84, 0.84)

    def render_to_file(self, output_path: str, bitrate: str = "192k") -> dict:
        t_start = time.time()
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0",
            "-c:a", "libmp3lame", "-b:a", bitrate, "-joint_stereo", "0",
            "-metadata", "title=Helix Signature - Custom 14.5 Hz Focus",
            "-metadata", "artist=Dreamlight Neural Focus Studio",
            output_path,
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        sum_sq, peak, written = 0.0, 0.0, 0
        try:
            while written < self.total_samples:
                n = min(self.block_samples, self.total_samples - written)
                blk = self.render_block(written, n)
                sum_sq += float(np.sum(blk ** 2))
                peak = max(peak, float(np.max(np.abs(blk))))
                dither = (self.rng.random(blk.shape) - self.rng.random(blk.shape)) / 32768.0
                pcm16 = np.clip(np.round((blk + dither) * 32767.0), -32768, 32767).astype("<i2")
                assert proc.stdin is not None
                proc.stdin.write(pcm16.tobytes())
                written += n
        finally:
            if proc.stdin:
                proc.stdin.close()
            if proc.wait() != 0:
                raise RuntimeError("ffmpeg failed")
        rms_db = 20.0 * math.log10(math.sqrt(sum_sq / max(1, written * 2)) + 1e-12)
        peak_db = 20.0 * math.log10(peak + 1e-12)
        return {
            "output": output_path,
            "rms_dbfs": rms_db,
            "peak_dbfs": peak_db,
            "size_mb": os.path.getsize(output_path) / (1024 * 1024),
            "elapsed_sec": time.time() - t_start,
        }


def main():
    parser = argparse.ArgumentParser(
        description="Render a personalized 14.5 Hz focus track from a 3-column CSV (no default personal path)."
    )
    parser.add_argument(
        "--csv",
        required=True,
        help="Path to a 3-column CSV (e.g. generators/sample_dna_fake.csv)",
    )
    parser.add_argument("--duration", type=float, default=3600.0)
    parser.add_argument("--output", default="web/audio/10_helix_signature_dna_14_5hz_1hr.mp3")
    parser.add_argument("--cover", default="web/covers/helix_signature.png")
    args = parser.parse_args()

    degrees, seed = load_dna_sequence(args.csv)
    print(f"Loaded {len(degrees)}-step motif (seed {seed}). Generating cover -> {args.cover}", flush=True)
    generate_helix_cover(args.cover, seed)

    eng = HelixDNAEngine(degrees, seed, duration_sec=args.duration)
    stats = eng.render_to_file(args.output)
    print(
        f"[helix_signature] Done -> {stats['output']} ({stats['size_mb']:.1f} MB) | "
        f"RMS {stats['rms_dbfs']:.1f} dBFS | Peak {stats['peak_dbfs']:.1f} dBFS | {stats['elapsed_sec']:.1f}s",
        flush=True,
    )


if __name__ == "__main__":
    main()
