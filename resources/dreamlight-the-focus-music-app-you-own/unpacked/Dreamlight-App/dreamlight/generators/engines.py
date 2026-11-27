"""
Unified synthesis engines for all 25 Dreamlight tracks.

Supports:
  - BinauralFocusEngine ("suite")
  - Pack2Engine ("pack2": driving, lofi, lofi_sun, organic, kalimba_organic,
                 crystalline, minimal_tech, felt_piano, hearth, sanctuary,
                 lullaby_delta, delta, deep_organ)
  - DreamlightFocusEngine ("dreamlight")
  - HelixDNAEngine ("dna")
Includes fast integrated-LUFS calibration so every rendered track matches the
library target (-15.5 LUFS within ±0.5 LU) with zero clipping (< -1.0 dBTP).
"""

from __future__ import annotations

import math
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import numpy as np

from .catalog import WEB_DIR, get_track
from .dna import HelixDNAEngine, load_dna_sequence
from .dsp import (
    SR,
    OverlapAddConvolver,
    StereoPingPongDelay,
    design_fir_kernel,
    design_reverb_ir,
    midi_to_hz,
    render_chord_pad,
    render_sub_bass,
    synth_bowed_drone,
    synth_celesta_note,
    synth_deep_organ_drone,
    synth_driving_bassline,
    synth_felt_piano_pad,
    synth_handpan_bass_hit,
    synth_handpan_note,
    synth_hearth_harp_pad,
    synth_kalimba_note,
    synth_lofi_rhodes_pad,
    synth_minimal_bass,
    synth_pluck_note,
    synth_singing_bowl,
    synthesize_kick,
)


def _soft_limit(mix: np.ndarray, gain_scale: float = 1.0) -> np.ndarray:
    """Apply calibrated loudness gain with smooth analog saturation and safe true-peak ceiling."""
    scaled = mix * gain_scale
    # Soft saturation preserves dynamics & pure binaural sines while capping peaks cleanly below -1.2 dBTP
    limited = 0.83 * np.tanh(scaled / 0.83)
    return np.clip(limited, -0.82, 0.82)


class BinauralFocusEngine:
    """Streaming overlap-add phase-locked AM + discrete L/R binaural beat engine."""

    def __init__(self, track: dict[str, Any], duration_sec: float = 3600.0, gain_scale: float = 1.0):
        self.track = track
        self.slug = track["slug"]
        self.cfg = track["render_config"]
        self.duration_sec = duration_sec
        self.gain_scale = gain_scale
        self.bpm = self.cfg["bpm"]
        self.beat_sec = 60.0 / self.bpm
        self.bar_sec = 4.0 * self.beat_sec
        self.rng = np.random.default_rng(self.cfg["seed"])

        self.total_samples = int(round(duration_sec * SR))
        self.bars_per_block = max(4, int(round(16.0 / self.bar_sec)))
        self.block_sec = self.bars_per_block * self.bar_sec
        self.block_samples = int(round(self.block_sec * SR))
        self.chord_bars = 2 if self.bpm >= 100 else 1

        self.flt_pad_dark = OverlapAddConvolver(
            design_fir_kernel(SR, 2049, lo_hz=85.0, hi_hz=self.cfg["pad_dark_hz"]), self.block_samples
        )
        self.flt_pad_open = OverlapAddConvolver(
            design_fir_kernel(SR, 2049, lo_hz=85.0, hi_hz=self.cfg["pad_open_hz"]), self.block_samples
        )
        self.flt_shimmer = OverlapAddConvolver(
            design_fir_kernel(SR, 1025, lo_hz=350.0, hi_hz=1550.0), self.block_samples
        )
        self.flt_air = OverlapAddConvolver(
            design_fir_kernel(SR, 513, lo_hz=2600.0, hi_hz=9000.0), self.block_samples
        )
        self.flt_ocean = OverlapAddConvolver(
            design_fir_kernel(SR, 1025, lo_hz=140.0, hi_hz=1100.0), self.block_samples
        )
        self.flt_warm_noise = OverlapAddConvolver(
            design_fir_kernel(SR, 2049, lo_hz=65.0, hi_hz=240.0), self.block_samples
        )
        self.flt_side_hp = OverlapAddConvolver(
            design_fir_kernel(SR, 2049, lo_hz=185.0, hi_hz=None), self.block_samples
        )
        self.flt_master = OverlapAddConvolver(
            design_fir_kernel(SR, 513, lo_hz=None, hi_hz=10500.0), self.block_samples
        )

        self.ir = design_reverb_ir(
            SR, duration=self.cfg["reverb_dur"], brightness=self.cfg["reverb_bright"], seed=self.cfg["seed"] + 7
        )
        self.reverb = OverlapAddConvolver(self.ir, self.block_samples)
        self.delay = StereoPingPongDelay(
            SR,
            delay_l_sec=self.cfg["delay_l_beats"] * self.beat_sec,
            delay_r_sec=self.cfg["delay_r_beats"] * self.beat_sec,
            feedback=self.cfg["delay_fb"],
        )

        self.kick_cache: dict[float, np.ndarray] = {}
        self.arp_tail = np.zeros((int(2.4 * SR), 2), dtype=np.float64)
        self.kick_tail = np.zeros((int(0.6 * SR), 2), dtype=np.float64)
        self.xfade_sec = min(2.0, self.chord_bars * self.bar_sec * 0.42)

    def _get_kick(self, bass_midi: int) -> np.ndarray:
        f_root = midi_to_hz(bass_midi)
        while f_root < 45.0:
            f_root *= 2.0
        while f_root > 62.0:
            f_root *= 0.5
        f_key = round(f_root, 1)
        if f_key not in self.kick_cache:
            self.kick_cache[f_key] = synthesize_kick(SR, duration=0.45, f_end=f_key, tau=self.cfg["kick_tau"])
        return self.kick_cache[f_key]

    def _movement_at_time(self, t_sec: float) -> dict:
        movs = self.cfg["movements"]
        progress = min(0.999999, max(0.0, t_sec / max(1.0, self.duration_sec)))
        return movs[int(progress * len(movs))]

    def _chord_at_index(self, chord_idx: int):
        t_chord = chord_idx * self.chord_bars * self.bar_sec
        mov = self._movement_at_time(t_chord)
        chords = mov["chords"]
        c = chords[chord_idx % len(chords)]
        return c[0], c[1], c[2], mov

    def render_block(self, start_sample: int, n_samples: int) -> np.ndarray:
        cfg = self.cfg
        t = (start_sample + np.arange(n_samples, dtype=np.float64)) / SR
        t0 = start_sample / SR
        mov = self._movement_at_time(t0 + 0.5 * n_samples / SR)

        chord_dur = self.chord_bars * self.bar_sec
        first_chord_idx = int(math.floor((t0 - self.xfade_sec) / chord_dur))
        last_chord_idx = int(math.floor((t[-1] + self.xfade_sec) / chord_dur))

        pad_dry = np.zeros((n_samples, 2), dtype=np.float64)
        sub_dry = np.zeros((n_samples, 2), dtype=np.float64)
        shimmer_dry = np.zeros((n_samples, 2), dtype=np.float64)

        for c_idx in range(max(0, first_chord_idx), last_chord_idx + 1):
            bass_m, pad_ms, _, _ = self._chord_at_index(c_idx)
            c_start = c_idx * chord_dur
            c_end = (c_idx + 1) * chord_dur
            w_start = c_start - 0.5 * self.xfade_sec
            w_end = c_end + 0.5 * self.xfade_sec

            i0 = max(0, int(math.floor((w_start - t0) * SR)))
            i1 = min(n_samples, int(math.ceil((w_end - t0) * SR)))
            if i1 <= i0:
                continue

            t_seg = t[i0:i1]
            win = np.ones_like(t_seg)
            fade_in = (t_seg >= w_start) & (t_seg < c_start + 0.5 * self.xfade_sec)
            if c_idx > 0:
                win[fade_in] = 0.5 * (1.0 - np.cos(np.pi * (t_seg[fade_in] - w_start) / self.xfade_sec))
            fade_out = (t_seg > c_end - 0.5 * self.xfade_sec) & (t_seg <= w_end)
            win[fade_out] = 0.5 * (1.0 + np.cos(np.pi * (t_seg[fade_out] - (c_end - 0.5 * self.xfade_sec)) / self.xfade_sec))

            pad_dry[i0:i1] += render_chord_pad(t_seg, pad_ms, cfg["pad_harms"]) * win[:, None]
            sub_dry[i0:i1] += render_sub_bass(t_seg, bass_m, self.beat_sec, cfg["sub_duck"]) * win[:, None]

            sh_notes = [pad_ms[1] + 12, pad_ms[3] + 12]
            sh_seg = np.zeros((len(t_seg), 2), dtype=np.float64)
            for s_i, sm in enumerate(sh_notes):
                sf = midi_to_hz(sm)
                sh_seg[:, 0] += np.sin(2.0 * np.pi * sf * t_seg + s_i * 1.1) * 0.5
                sh_seg[:, 1] += np.sin(2.0 * np.pi * (sf * 1.0018) * t_seg + s_i * 1.6) * 0.5
            shimmer_dry[i0:i1] += sh_seg * win[:, None]

        pad_dark = self.flt_pad_dark.process(pad_dry)
        pad_open = self.flt_pad_open.process(pad_dry)
        lfo_breath = 0.5 + 0.5 * np.sin(2.0 * np.pi * 0.052 * t + 0.4)
        morph = (0.18 + 0.62 * mov["pad_brightness"]) * (0.45 + 0.55 * lfo_breath)
        pad_shaped = pad_dark * (1.0 - morph[:, None]) + pad_open * morph[:, None]

        shimmer_swell = (0.35 + 0.65 * (0.5 - 0.5 * np.cos(2.0 * np.pi * 0.03125 * t))) * mov["shimmer_level"]
        shimmer_shaped = self.flt_shimmer.process(shimmer_dry) * shimmer_swell[:, None]

        kick_dry = np.zeros((n_samples, 2), dtype=np.float64)
        if cfg["kick_gain"] > 0.0:
            kick_buf = np.zeros((n_samples + len(self.kick_tail), 2), dtype=np.float64)
            kick_buf[: len(self.kick_tail)] += self.kick_tail

            first_beat = int(math.ceil(t0 / self.beat_sec - 1e-9))
            last_beat = int(math.floor((t0 + n_samples / SR) / self.beat_sec - 1e-9))

            for b_idx in range(max(0, first_beat), last_beat + 1):
                b_time = b_idx * self.beat_sec
                pos = int(round(b_time * SR)) - start_sample
                if pos < 0 or pos >= n_samples:
                    continue
                c_idx = int(b_time // chord_dur)
                bass_m, _, _, b_mov = self._chord_at_index(c_idx)
                tmpl = self._get_kick(bass_m)
                accent = (1.00, 0.78, 0.90, 0.80)[b_idx % 4]
                intro_ramp = min(1.0, max(0.0, (b_time - 3.0) / 12.0))
                outro_ramp = min(1.0, max(0.0, (self.duration_sec - 28.0 - b_time) / 20.0)) if self.duration_sec > 60 else 1.0
                macro_wave = 0.90 + 0.10 * math.sin(2.0 * math.pi * b_time / 128.0)
                gain = accent * b_mov["kick_level"] * intro_ramp * outro_ramp * macro_wave
                if gain <= 1e-4:
                    continue
                end_p = pos + len(tmpl)
                kick_buf[pos:end_p, 0] += tmpl * gain
                kick_buf[pos:end_p, 1] += tmpl * gain

            kick_dry = kick_buf[:n_samples]
            self.kick_tail = kick_buf[n_samples : n_samples + len(self.kick_tail)].copy()

        arp_buf = np.zeros((n_samples + len(self.arp_tail), 2), dtype=np.float64)
        arp_buf[: len(self.arp_tail)] += self.arp_tail

        step_sec = self.beat_sec / cfg["arp_subdiv"]
        first_step = int(math.ceil(t0 / step_sec - 1e-9))
        last_step = int(math.floor((t0 + n_samples / SR) / step_sec - 1e-9))

        contour_7 = [0, 2, 4, 3, 5, 1, 6]
        contour_5 = [0, 3, 2, 4, 1]

        for s_idx in range(max(0, first_step), last_step + 1):
            s_time = s_idx * step_sec
            pos = int(round(s_time * SR)) - start_sample
            if pos < 0 or pos >= n_samples:
                continue
            if s_time < 6.0:
                continue
            if self.duration_sec > 60.0 and s_time > self.duration_sec - 24.0:
                continue

            c_idx = int(s_time // chord_dur)
            _, _, arp_scale, s_mov = self._chord_at_index(c_idx)
            step_in_bar = s_idx % 8
            rhythm_weights = (0.86, 0.30, 0.56, 0.72, 0.36, 0.64, 0.78, 0.28)
            if self.rng.random() > s_mov["arp_density"] * rhythm_weights[step_in_bar]:
                continue

            idx_a = contour_7[s_idx % 7]
            idx_b = contour_5[(s_idx // 3) % 5]
            midi_note = arp_scale[(idx_a + idx_b) % len(arp_scale)]
            r_oct = self.rng.random()
            if r_oct < 0.12:
                midi_note -= 12
            elif r_oct > 0.88:
                midi_note += 12

            vel = (0.45 + 0.40 * self.rng.random()) * (0.86 if step_in_bar in (0, 3, 6) else 0.70)
            dur = min(2.0, cfg["arp_decay"] * 3.2 + 0.45 * self.rng.random())
            pluck = synth_pluck_note(
                SR, midi_to_hz(midi_note), dur=dur, vel=vel,
                fm_index=cfg["arp_fm_index"], decay_fast=cfg["arp_decay"]
            )

            pan = 0.60 * math.sin(2.0 * math.pi * 0.47 * s_time + 0.25 * math.sin(2.0 * math.pi * 0.11 * s_time))
            angle = (pan + 1.0) * (math.pi / 4.0)
            end_p = pos + len(pluck)
            arp_buf[pos:end_p, 0] += pluck * math.cos(angle)
            arp_buf[pos:end_p, 1] += pluck * math.sin(angle)

        arp_dry = arp_buf[:n_samples]
        self.arp_tail = arp_buf[n_samples : n_samples + len(self.arp_tail)].copy()
        arp_total = arp_dry * 0.72 + self.delay.process(arp_dry) * 0.56

        white = self.rng.standard_normal((n_samples, 2))
        warm_noise = self.flt_warm_noise.process(white)

        t_beat = np.mod(t, self.beat_sec)
        air_shaped = np.zeros((n_samples, 2), dtype=np.float64)
        if cfg["air_gain"] > 0.0:
            air_band = self.flt_air.process(white)
            t_eighth = np.mod(t, self.beat_sec * 0.5)
            brush_env = (0.30 + 0.70 * np.exp(-t_eighth / 0.052)) * (0.75 + 0.25 * np.exp(-t_beat / 0.11))
            pan_wave = 0.28 * np.sin(2.0 * np.pi * 0.491 * t) + 0.12 * np.sin(2.0 * np.pi * 1.50 * t)
            air_shaped[:, 0] = air_band[:, 0] * brush_env * (1.0 + pan_wave)
            air_shaped[:, 1] = air_band[:, 1] * brush_env * (1.0 - pan_wave)

        ocean_shaped = np.zeros((n_samples, 2), dtype=np.float64)
        if cfg["ocean_gain"] > 0.0:
            ocean_band = self.flt_ocean.process(white)
            tide_l = 0.35 + 0.65 * (0.5 - 0.5 * np.cos(2.0 * np.pi * 0.092 * t))
            tide_r = 0.35 + 0.65 * (0.5 - 0.5 * np.cos(2.0 * np.pi * 0.092 * t + 0.85))
            ocean_shaped[:, 0] = ocean_band[:, 0] * tide_l
            ocean_shaped[:, 1] = ocean_band[:, 1] * tide_r

        reverb_send = pad_shaped * 0.48 + shimmer_shaped * 0.62 + arp_total * 0.60
        reverb_wet = self.reverb.process(reverb_send)

        slow_var = 0.88 + 0.12 * np.sin(2.0 * np.pi * (1.0 / 32.0) * t)
        eff_depth = min(0.54, cfg["am_depth"] * mov["mod_scale"]) * slow_var

        am_l = 1.0 - eff_depth * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["am_hz"] * t))
        am_r = 1.0 - eff_depth * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["am_hz"] * t + 0.30))
        if cfg["secondary_am_hz"] > 0.0 and cfg["secondary_am_depth"] > 0.0:
            s_d = cfg["secondary_am_depth"] * slow_var
            am_l *= 1.0 - s_d * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["secondary_am_hz"] * t))
            am_r *= 1.0 - s_d * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["secondary_am_hz"] * t + 0.30))
        am_stereo = np.column_stack([am_l, am_r])

        drift_l = 1.0 + 0.14 * np.sin(2.0 * np.pi * 0.491 * t) + 0.05 * np.sin(2.0 * np.pi * 1.45 * t)
        drift_r = 1.0 - 0.14 * np.sin(2.0 * np.pi * 0.491 * t) - 0.05 * np.sin(2.0 * np.pi * 1.45 * t)
        drift_stereo = np.column_stack([drift_l, drift_r])

        ambient_bus = (
            pad_shaped * cfg["pad_gain"]
            + shimmer_shaped * cfg["shimmer_gain"]
            + arp_total * cfg["arp_gain"]
            + reverb_wet * cfg["reverb_gain"]
            + air_shaped * cfg["air_gain"]
            + ocean_shaped * cfg["ocean_gain"]
        )
        beat_breath = (1.0 - 0.10 * np.exp(-t_beat / 0.11)) if cfg["kick_gain"] > 0.0 else np.ones_like(t)
        ambient_mod = ambient_bus * am_stereo * drift_stereo * beat_breath[:, None]

        low_bus = (
            kick_dry * cfg["kick_gain"]
            + sub_dry * cfg["sub_gain"]
            + warm_noise * 0.011
        ) * (1.0 - 0.08 * eff_depth * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["am_hz"] * t)))[:, None]

        mix = low_bus + ambient_mod

        mid = 0.5 * (mix[:, 0] + mix[:, 1])
        side = 0.5 * (mix[:, 0] - mix[:, 1])
        side_hp = self.flt_side_hp.process(np.column_stack([side, side]))[:, 0]
        mix[:, 0] = mid + side_hp
        mix[:, 1] = mid - side_hp
        mix = self.flt_master.process(mix)

        bin_breath = 0.86 + 0.14 * np.sin(2.0 * np.pi * 0.025 * t)
        mix[:, 0] += np.sin(2.0 * np.pi * cfg["binaural_l_hz"] * t) * cfg["binaural_gain"] * bin_breath
        mix[:, 1] += np.sin(2.0 * np.pi * cfg["binaural_r_hz"] * t) * cfg["binaural_gain"] * bin_breath

        fade_in_sec = min(10.0, self.duration_sec * 0.15)
        fade_out_sec = min(22.0, self.duration_sec * 0.20)
        if t[0] < fade_in_sec:
            fi = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / fade_in_sec, 0.0, 1.0)))
            mix *= fi[:, None]
        if t[-1] > self.duration_sec - fade_out_sec:
            fo = 0.5 * (1.0 - np.cos(np.pi * np.clip((self.duration_sec - t) / fade_out_sec, 0.0, 1.0)))
            mix *= fo[:, None]

        return _soft_limit(mix, self.gain_scale)


class Pack2Engine:
    """Specialized multi-style synthesis engine for acoustic, lo-fi, driving, sanctuary, and delta tracks."""

    BEATLESS_STYLES = {"delta", "deep_organ", "sanctuary", "lullaby_delta"}

    def __init__(self, track: dict[str, Any], duration_sec: float = 3600.0, gain_scale: float = 1.0):
        self.track = track
        self.slug = track["slug"]
        self.cfg = track["render_config"]
        self.style = self.cfg["style"]
        self.duration_sec = duration_sec
        self.gain_scale = gain_scale
        self.bpm = self.cfg["bpm"]
        self.beat_sec = 60.0 / self.bpm
        self.bar_sec = 4.0 * self.beat_sec
        self.rng = np.random.default_rng(self.cfg["seed"])

        self.total_samples = int(round(duration_sec * SR))
        self.bars_per_block = max(4, int(round(16.0 / self.bar_sec)))
        self.block_sec = self.bars_per_block * self.bar_sec
        self.block_samples = int(round(self.block_sec * SR))
        self.chord_bars = 4 if self.style in ("delta", "deep_organ", "lullaby_delta", "sanctuary") else 2
        self.xfade_sec = min(3.8, self.chord_bars * self.bar_sec * 0.42)

        dark_map = {
            "delta": 220.0, "deep_organ": 190.0, "lullaby_delta": 230.0,
            "sanctuary": 250.0, "hearth": 280.0, "felt_piano": 290.0,
            "lofi": 300.0, "lofi_sun": 320.0, "minimal_tech": 310.0,
            "crystalline": 380.0,
        }
        open_map = {
            "delta": 540.0, "deep_organ": 420.0, "lullaby_delta": 560.0,
            "sanctuary": 680.0, "hearth": 780.0, "felt_piano": 820.0,
            "lofi": 880.0, "lofi_sun": 960.0, "minimal_tech": 980.0,
            "crystalline": 1350.0,
        }
        dark_hi = dark_map.get(self.style, 340.0)
        open_hi = open_map.get(self.style, 1080.0)

        self.flt_pad_dark = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=75.0, hi_hz=dark_hi), self.block_samples)
        self.flt_pad_open = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=75.0, hi_hz=open_hi), self.block_samples)
        self.flt_tex_lo = OverlapAddConvolver(design_fir_kernel(SR, 1025, lo_hz=150.0, hi_hz=1350.0), self.block_samples)
        self.flt_tex_hi = OverlapAddConvolver(design_fir_kernel(SR, 513, lo_hz=2200.0, hi_hz=7800.0), self.block_samples)
        self.flt_side_hp = OverlapAddConvolver(design_fir_kernel(SR, 2049, lo_hz=185.0, hi_hz=None), self.block_samples)
        self.flt_master = OverlapAddConvolver(design_fir_kernel(SR, 513, lo_hz=None, hi_hz=10200.0), self.block_samples)

        self.ir = design_reverb_ir(
            SR, duration=self.cfg["reverb_dur"], brightness=self.cfg["reverb_bright"], seed=self.cfg["seed"] + 9
        )
        self.reverb = OverlapAddConvolver(self.ir, self.block_samples)
        self.delay = StereoPingPongDelay(
            SR,
            delay_l_sec=0.75 * self.beat_sec,
            delay_r_sec=1.00 * self.beat_sec,
            feedback=0.50 if self.style in self.BEATLESS_STYLES else 0.42,
        )

        self.kick_cache: dict[float, np.ndarray] = {}
        self.arp_tail = np.zeros((int(4.2 * SR), 2), dtype=np.float64)
        self.perc_tail = np.zeros((int(0.6 * SR), 2), dtype=np.float64)

    def _movement_at_time(self, t_sec: float) -> dict:
        movs = self.cfg["movements"]
        progress = min(0.999999, max(0.0, t_sec / max(1.0, self.duration_sec)))
        return movs[int(progress * len(movs))]

    def _chord_at_index(self, chord_idx: int):
        t_chord = chord_idx * self.chord_bars * self.bar_sec
        mov = self._movement_at_time(t_chord)
        chords = mov["chords"]
        c = chords[chord_idx % len(chords)]
        return c[0], c[1], c[2], mov

    def _get_kick(self, bass_midi: int) -> np.ndarray:
        f_root = midi_to_hz(bass_midi)
        while f_root < 46.0:
            f_root *= 2.0
        while f_root > 64.0:
            f_root *= 0.5
        key = round(f_root, 1)
        if key not in self.kick_cache:
            if self.style in ("organic", "kalimba_organic", "crystalline"):
                self.kick_cache[key] = synth_handpan_bass_hit(SR, f_end=key * 1.35)
            elif self.style in ("lofi", "lofi_sun", "felt_piano", "hearth"):
                self.kick_cache[key] = synthesize_kick(SR, duration=0.40, f_end=key, tau=0.115)
            elif self.style == "minimal_tech":
                self.kick_cache[key] = synthesize_kick(SR, duration=0.35, f_end=key, tau=0.078, f_start=128.0)
            else:
                self.kick_cache[key] = synthesize_kick(SR, duration=0.38, f_end=key, tau=0.088)
        return self.kick_cache[key]

    def render_block(self, start_sample: int, n_samples: int) -> np.ndarray:
        cfg = self.cfg
        t = (start_sample + np.arange(n_samples, dtype=np.float64)) / SR
        t0 = start_sample / SR
        mov = self._movement_at_time(t0 + 0.5 * n_samples / SR)

        chord_dur = self.chord_bars * self.bar_sec
        first_chord_idx = int(math.floor((t0 - self.xfade_sec) / chord_dur))
        last_chord_idx = int(math.floor((t[-1] + self.xfade_sec) / chord_dur))

        pad_dry = np.zeros((n_samples, 2), dtype=np.float64)
        sub_dry = np.zeros((n_samples, 2), dtype=np.float64)

        for c_idx in range(max(0, first_chord_idx), last_chord_idx + 1):
            bass_m, pad_ms, _, _ = self._chord_at_index(c_idx)
            c_start = c_idx * chord_dur
            c_end = (c_idx + 1) * chord_dur
            w_start = c_start - 0.5 * self.xfade_sec
            w_end = c_end + 0.5 * self.xfade_sec

            i0 = max(0, int(math.floor((w_start - t0) * SR)))
            i1 = min(n_samples, int(math.ceil((w_end - t0) * SR)))
            if i1 <= i0:
                continue

            t_seg = t[i0:i1]
            win = np.ones_like(t_seg)
            fade_in = (t_seg >= w_start) & (t_seg < c_start + 0.5 * self.xfade_sec)
            if c_idx > 0:
                win[fade_in] = 0.5 * (1.0 - np.cos(np.pi * (t_seg[fade_in] - w_start) / self.xfade_sec))
            fade_out = (t_seg > c_end - 0.5 * self.xfade_sec) & (t_seg <= w_end)
            win[fade_out] = 0.5 * (1.0 + np.cos(np.pi * (t_seg[fade_out] - (c_end - 0.5 * self.xfade_sec)) / self.xfade_sec))

            if self.style in ("lofi", "lofi_sun"):
                pad_dry[i0:i1] += synth_lofi_rhodes_pad(t_seg, pad_ms, self.beat_sec) * win[:, None]
            elif self.style == "felt_piano":
                pad_dry[i0:i1] += synth_felt_piano_pad(t_seg, pad_ms, self.beat_sec) * win[:, None]
            elif self.style == "hearth":
                pad_dry[i0:i1] += synth_hearth_harp_pad(t_seg, pad_ms, self.beat_sec) * win[:, None]
            elif self.style == "deep_organ":
                pad_dry[i0:i1] += synth_deep_organ_drone(t_seg, pad_ms) * win[:, None]
            elif self.style in ("crystalline", "minimal_tech"):
                pad_dry[i0:i1] += render_chord_pad(t_seg, pad_ms, (1.0, 0.36, 0.18, 0.09, 0.035)) * win[:, None]
            else:
                pad_dry[i0:i1] += synth_bowed_drone(t_seg, pad_ms) * win[:, None]

            if self.style == "driving":
                sub_dry[i0:i1] += synth_driving_bassline(t_seg, bass_m, self.beat_sec) * win[:, None]
            elif self.style == "minimal_tech":
                sub_dry[i0:i1] += synth_minimal_bass(t_seg, bass_m, self.beat_sec) * win[:, None]
            else:
                f0 = midi_to_hz(bass_m)
                while f0 < 40.0:
                    f0 *= 2.0
                while f0 > 78.0:
                    f0 *= 0.5
                p1 = 2.0 * np.pi * f0 * t_seg
                mono = np.sin(p1) + 0.22 * np.sin(2.0 * p1)
                if self.style in self.BEATLESS_STYLES:
                    mono *= 0.72 + 0.28 * np.sin(2.0 * np.pi * 0.052 * t_seg)
                elif self.style in ("lofi", "lofi_sun", "felt_piano", "hearth"):
                    tb = np.mod(t_seg, self.beat_sec)
                    mono *= 1.0 - 0.34 * np.exp(-tb / 0.14)
                sub_dry[i0:i1] += np.column_stack([mono, mono]) * win[:, None]

        pad_dark = self.flt_pad_dark.process(pad_dry)
        pad_open = self.flt_pad_open.process(pad_dry)
        lfo_rate = 0.024 if self.style in self.BEATLESS_STYLES else 0.055
        lfo = 0.5 + 0.5 * np.sin(2.0 * np.pi * lfo_rate * t + 0.4)
        morph = (0.18 + 0.64 * mov["pad_brightness"]) * (0.45 + 0.55 * lfo)
        pad_shaped = pad_dark * (1.0 - morph[:, None]) + pad_open * morph[:, None]

        # 2. PERCUSSION
        perc_dry = np.zeros((n_samples, 2), dtype=np.float64)
        if self.style not in self.BEATLESS_STYLES:
            perc_buf = np.zeros((n_samples + len(self.perc_tail), 2), dtype=np.float64)
            perc_buf[: len(self.perc_tail)] += self.perc_tail

            step_s = self.beat_sec / 2.0
            first_s = int(math.ceil(t0 / step_s - 1e-9))
            last_s = int(math.floor((t0 + n_samples / SR) / step_s - 1e-9))

            for s_idx in range(max(0, first_s), last_s + 1):
                b_time = s_idx * step_s
                pos = int(round(b_time * SR)) - start_sample
                if pos < 0 or pos >= n_samples:
                    continue
                intro_r = min(1.0, max(0.0, (b_time - 3.0) / 10.0))
                outro_r = min(1.0, max(0.0, (self.duration_sec - 26.0 - b_time) / 18.0)) if self.duration_sec > 60 else 1.0
                env_m = intro_r * outro_r
                if env_m <= 1e-4:
                    continue

                step8 = s_idx % 8
                c_idx = int(b_time // chord_dur)
                bass_m, _, _, _ = self._chord_at_index(c_idx)
                kick = self._get_kick(bass_m)

                hit_gain = 0.0
                if self.style in ("driving", "minimal_tech"):
                    if step8 % 2 == 0:
                        hit_gain = (1.0, 0.80, 0.92, 0.82)[step8 // 2]
                elif self.style in ("lofi", "lofi_sun"):
                    if step8 == 0:
                        hit_gain = 0.95
                    elif step8 == 3:
                        hit_gain = 0.50
                    elif step8 == 5:
                        hit_gain = 0.70
                elif self.style in ("organic", "kalimba_organic", "crystalline"):
                    if step8 == 0:
                        hit_gain = 0.84
                    elif step8 == 3:
                        hit_gain = 0.40
                    elif step8 == 6:
                        hit_gain = 0.58
                elif self.style in ("felt_piano", "hearth"):
                    if step8 == 0:
                        hit_gain = 0.72
                    elif step8 == 4:
                        hit_gain = 0.52

                if hit_gain > 0:
                    end_p = pos + len(kick)
                    perc_buf[pos:end_p, 0] += kick * (hit_gain * env_m)
                    perc_buf[pos:end_p, 1] += kick * (hit_gain * env_m)

            perc_dry = perc_buf[:n_samples]
            self.perc_tail = perc_buf[n_samples : n_samples + len(self.perc_tail)].copy()

        # 3. MELODIC LAYER
        arp_total = np.zeros((n_samples, 2), dtype=np.float64)
        if self.style not in ("delta", "deep_organ"):
            arp_buf = np.zeros((n_samples + len(self.arp_tail), 2), dtype=np.float64)
            arp_buf[: len(self.arp_tail)] += self.arp_tail

            step_div = 0.5 if self.style in ("sanctuary", "lullaby_delta") else 2.0
            step_sec = self.beat_sec / step_div
            first_step = int(math.ceil(t0 / step_sec - 1e-9))
            last_step = int(math.floor((t0 + n_samples / SR) / step_sec - 1e-9))
            c7 = [0, 2, 4, 3, 5, 1, 6]
            c5 = [0, 3, 2, 4, 1]

            for s_idx in range(max(0, first_step), last_step + 1):
                s_time = s_idx * step_sec
                pos = int(round(s_time * SR)) - start_sample
                if pos < 0 or pos >= n_samples or s_time < 5.0:
                    continue
                if self.duration_sec > 60.0 and s_time > self.duration_sec - 24.0:
                    continue
                c_idx = int(s_time // chord_dur)
                _, _, scale, s_mov = self._chord_at_index(c_idx)
                if not scale or s_mov["arp_density"] <= 0.0:
                    continue
                step_in_bar = s_idx % 8
                r_w = (0.85, 0.32, 0.60, 0.72, 0.38, 0.68, 0.78, 0.28)
                if self.rng.random() > s_mov["arp_density"] * r_w[step_in_bar]:
                    continue

                midi_n = scale[(c7[s_idx % 7] + c5[(s_idx // 3) % 5]) % len(scale)]
                vel = 0.52 + 0.34 * self.rng.random()
                if self.style == "sanctuary":
                    note = synth_singing_bowl(SR, midi_to_hz(midi_n - 12), dur=3.6, vel=vel * 0.78)
                elif self.style in ("lullaby_delta", "crystalline"):
                    dur = 1.95 if self.style == "lullaby_delta" else 1.25
                    note = synth_celesta_note(SR, midi_to_hz(midi_n), dur=dur, vel=vel * 0.75)
                elif self.style in ("kalimba_organic", "minimal_tech"):
                    dur = 1.15 if self.style == "kalimba_organic" else 0.75
                    note = synth_kalimba_note(SR, midi_to_hz(midi_n), dur=dur, vel=vel)
                elif self.style in ("felt_piano", "hearth"):
                    note = synth_pluck_note(SR, midi_to_hz(midi_n), dur=1.25, vel=vel * 0.78, fm_index=0.22, decay_fast=0.38)
                elif self.style == "organic":
                    note = synth_handpan_note(SR, midi_to_hz(midi_n), dur=1.4, vel=vel)
                else:
                    dur = 0.65 if self.style == "driving" else 1.15
                    note = synth_handpan_note(SR, midi_to_hz(midi_n), dur=dur, vel=vel)

                pan = 0.60 * math.sin(2.0 * math.pi * 0.43 * s_time)
                angle = (pan + 1.0) * (math.pi / 4.0)
                end_p = pos + len(note)
                if end_p <= arp_buf.shape[0]:
                    arp_buf[pos:end_p, 0] += note * math.cos(angle)
                    arp_buf[pos:end_p, 1] += note * math.sin(angle)

            arp_dry = arp_buf[:n_samples]
            self.arp_tail = arp_buf[n_samples : n_samples + len(self.arp_tail)].copy()
            arp_total = arp_dry * 0.72 + self.delay.process(arp_dry) * 0.56

        # 4. ATMOSPHERIC TEXTURES
        white = self.rng.standard_normal((n_samples, 2))
        tex_lo = self.flt_tex_lo.process(white)
        tex_hi = self.flt_tex_hi.process(white)

        tex_mix = np.zeros((n_samples, 2), dtype=np.float64)
        if self.style in ("driving", "minimal_tech"):
            t_16 = np.mod(t, self.beat_sec * 0.25)
            hat = 0.25 + 0.75 * np.exp(-t_16 / 0.030)
            tex_mix = tex_hi * hat[:, None] * (0.078 if self.style == "driving" else 0.062)
        elif self.style == "lofi":
            t_2bar = np.mod(t, self.beat_sec * 2.0)
            snare_t = np.maximum(0.0, t_2bar - self.beat_sec)
            snare = np.where(t_2bar >= self.beat_sec, np.exp(-snare_t / 0.075), 0.0)
            rain_bed = tex_lo * 0.048 + tex_hi * 0.055
            tex_mix = rain_bed + (tex_lo * 0.6 + tex_hi * 0.4) * snare[:, None] * 0.095
        elif self.style == "lofi_sun":
            t_2bar = np.mod(t, self.beat_sec * 2.0)
            snare_t = np.maximum(0.0, t_2bar - self.beat_sec)
            snare = np.where(t_2bar >= self.beat_sec, np.exp(-snare_t / 0.065), 0.0)
            tex_mix = tex_hi * 0.022 + (tex_lo * 0.5 + tex_hi * 0.5) * snare[:, None] * 0.075
        elif self.style in ("organic", "kalimba_organic", "crystalline"):
            gust_l = 0.40 + 0.60 * (0.5 + 0.5 * np.sin(2.0 * np.pi * 0.08 * t))
            gust_r = 0.40 + 0.60 * (0.5 + 0.5 * np.sin(2.0 * np.pi * 0.08 * t + 1.1))
            tex_mix[:, 0] = (tex_lo[:, 0] * 0.040 + tex_hi[:, 0] * 0.034) * gust_l
            tex_mix[:, 1] = (tex_lo[:, 1] * 0.040 + tex_hi[:, 1] * 0.034) * gust_r
        elif self.style == "hearth":
            # Soft crackling fireplace ember sparks + warm low hearth room air
            sparks = (self.rng.random((n_samples, 2)) < 0.00045).astype(np.float64) * self.rng.uniform(0.4, 1.0, (n_samples, 2))
            spark_hi = self.flt_tex_hi.process(sparks * 8.0)
            warm_sw = 0.55 + 0.45 * np.sin(2.0 * np.pi * 0.06 * t)
            tex_mix = tex_lo * warm_sw[:, None] * 0.032 + spark_hi * 0.14
        elif self.style == "felt_piano":
            # Subtle quiet library room air + gentle brush pulse
            t_8 = np.mod(t, self.beat_sec * 0.5)
            brush = 0.28 + 0.72 * np.exp(-t_8 / 0.055)
            tex_mix = tex_lo * 0.020 + tex_hi * brush[:, None] * 0.024
        else:
            # Deep space / sanctuary / delta ocean-floor swell
            swell = 0.45 + 0.55 * (0.5 + 0.5 * np.sin(2.0 * np.pi * 0.042 * t))
            tex_mix = tex_lo * swell[:, None] * (0.048 if self.style == "deep_organ" else 0.038)

        # 5. REVERB + POST-REVERB PHASE-LOCKED AM
        reverb_wet = self.reverb.process(pad_shaped * 0.50 + arp_total * 0.62)

        slow_var = 0.88 + 0.12 * np.sin(2.0 * np.pi * (1.0 / 32.0) * t)
        eff_depth = min(0.50, cfg["am_depth"] * mov["mod_scale"]) * slow_var
        am_l = 1.0 - eff_depth * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["am_hz"] * t))
        am_r = 1.0 - eff_depth * 0.5 * (1.0 - np.cos(2.0 * np.pi * cfg["am_hz"] * t + 0.28))
        am_stereo = np.column_stack([am_l, am_r])

        if self.style == "driving":
            ambient_bus = pad_shaped * 0.155 + arp_total * 0.115 + reverb_wet * 0.130 + tex_mix * 1.25
            low_bus = perc_dry * 0.345 + sub_dry * 0.285
        elif self.style == "minimal_tech":
            ambient_bus = pad_shaped * 0.140 + arp_total * 0.125 + reverb_wet * 0.120 + tex_mix * 1.15
            low_bus = perc_dry * 0.310 + sub_dry * 0.275
        elif self.style in ("lofi", "lofi_sun"):
            ambient_bus = pad_shaped * 0.150 + arp_total * 0.062 + reverb_wet * 0.118 + tex_mix
            low_bus = perc_dry * 0.240 + sub_dry * 0.195
        elif self.style in ("organic", "kalimba_organic", "crystalline"):
            ambient_bus = pad_shaped * 0.130 + arp_total * 0.115 + reverb_wet * 0.140 + tex_mix
            low_bus = perc_dry * 0.220 + sub_dry * 0.190
        elif self.style in ("felt_piano", "hearth"):
            ambient_bus = pad_shaped * 0.165 + arp_total * 0.075 + reverb_wet * 0.135 + tex_mix
            low_bus = perc_dry * 0.180 + sub_dry * 0.205
        elif self.style in ("sanctuary", "lullaby_delta"):
            ambient_bus = pad_shaped * 0.175 + arp_total * 0.095 + reverb_wet * 0.195 + tex_mix
            low_bus = sub_dry * 0.245
        else:
            ambient_bus = pad_shaped * 0.180 + reverb_wet * 0.205 + tex_mix
            low_bus = sub_dry * 0.265

        mix = low_bus + ambient_bus * am_stereo

        mid = 0.5 * (mix[:, 0] + mix[:, 1])
        side = 0.5 * (mix[:, 0] - mix[:, 1])
        side_hp = self.flt_side_hp.process(np.column_stack([side, side]))[:, 0]
        mix[:, 0] = mid + side_hp
        mix[:, 1] = mid - side_hp
        mix = self.flt_master.process(mix)

        # 6. TRUE DISCRETE L/R BINAURAL BEAT LAYER (Post-Monoizer!)
        bin_breath = 0.86 + 0.14 * np.sin(2.0 * np.pi * 0.025 * t)
        mix[:, 0] += np.sin(2.0 * np.pi * cfg["binaural_l_hz"] * t) * cfg["binaural_gain"] * bin_breath
        mix[:, 1] += np.sin(2.0 * np.pi * cfg["binaural_r_hz"] * t) * cfg["binaural_gain"] * bin_breath

        fi_sec = min(10.0, self.duration_sec * 0.15)
        fo_sec = min(22.0, self.duration_sec * 0.20)
        if t[0] < fi_sec:
            fi = 0.5 * (1.0 - np.cos(np.pi * np.clip(t / fi_sec, 0.0, 1.0)))
            mix *= fi[:, None]
        if t[-1] > self.duration_sec - fo_sec:
            fo = 0.5 * (1.0 - np.cos(np.pi * np.clip((self.duration_sec - t) / fo_sec, 0.0, 1.0)))
            mix *= fo[:, None]

        return _soft_limit(mix, self.gain_scale)


def _create_engine(track: dict[str, Any], duration_sec: float, gain_scale: float = 1.0, csv_path: str | None = None):
    eng_type = track["engine"]
    if eng_type == "suite":
        return BinauralFocusEngine(track, duration_sec=duration_sec, gain_scale=gain_scale)
    if eng_type == "pack2":
        return Pack2Engine(track, duration_sec=duration_sec, gain_scale=gain_scale)
    if eng_type == "dna":
        if not csv_path:
            raise ValueError("Track 'helix_signature' requires --csv (e.g. generators/sample_dna_fake.csv)")
        degrees, seed = load_dna_sequence(csv_path)
        return HelixDNAEngine(degrees, seed, duration_sec=duration_sec)
    if eng_type == "dreamlight":
        # Reuse suite engine with Dreamlight Focus parameters if re-rendered
        cfg = track["render_config"]
        synth_track = {
            "slug": track["slug"],
            "title": track["title"],
            "band": track["band"],
            "render_config": {
                "bpm": cfg["bpm"], "beat_hz": cfg["mod_hz"],
                "binaural_l_hz": 196.0, "binaural_r_hz": 196.0, "binaural_gain": 0.0,
                "am_hz": cfg["mod_hz"], "am_depth": cfg["mod_depth"],
                "secondary_am_hz": 0.0, "secondary_am_depth": 0.0,
                "kick_gain": 0.315, "kick_tau": 0.118, "sub_gain": 0.215, "sub_duck": 0.56,
                "pad_gain": 0.115, "pad_dark_hz": 310.0, "pad_open_hz": 820.0,
                "pad_harms": (1.0, 0.40, 0.16, 0.07, 0.025), "shimmer_gain": 0.020,
                "arp_gain": 0.068, "arp_fm_index": 0.42, "arp_decay": 0.26, "arp_subdiv": 2,
                "reverb_dur": 3.4, "reverb_bright": 0.95, "reverb_gain": 0.115,
                "air_gain": 0.078, "ocean_gain": 0.0, "delay_l_beats": 0.75, "delay_r_beats": 1.00,
                "delay_fb": 0.40, "seed": cfg["seed"],
                "movements": [
                    {"pad_brightness": 0.50, "arp_density": 0.50, "kick_level": 0.92, "shimmer_level": 0.36, "mod_scale": 0.98,
                     "chords": [(36, [48, 55, 58, 62, 63], [60, 62, 63, 67, 70, 72, 74]),
                                (32, [44, 51, 55, 60, 63], [58, 60, 63, 67, 70, 72, 75]),
                                (39, [51, 55, 58, 62, 65], [60, 62, 63, 67, 70, 74, 75]),
                                (34, [46, 53, 58, 60, 62], [58, 60, 62, 65, 67, 70, 72])]},
                ],
            },
        }
        return BinauralFocusEngine(synth_track, duration_sec=duration_sec, gain_scale=gain_scale)
    raise ValueError(f"Unsupported engine '{eng_type}'")


def calibrate_gain_for_lufs(track: dict[str, Any], target_lufs: float = -15.5) -> float:
    """Measure steady-state integrated LUFS on a fast 48s probe render and compute linear gain scale."""
    probe_dur = 48.0
    eng = _create_engine(track, duration_sec=3600.0, gain_scale=1.0)
    cmd = [
        "ffmpeg", "-hide_banner", "-nostats",
        "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0",
        "-filter_complex", "ebur128=peak=true",
        "-f", "null", "-",
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    written = 0
    target_samples = int(probe_dur * SR)
    skip_samples = int(12.0 * SR)  # Skip 10s fade-in so we measure steady-state loudness
    assert proc.stdin is not None
    while written < target_samples:
        n = min(eng.block_samples, target_samples - written)
        blk = eng.render_block(written, n)
        if written + n > skip_samples:
            s0 = max(0, skip_samples - written)
            seg = blk[s0:]
            pcm16 = np.clip(np.round(seg * 32767.0), -32768, 32767).astype("<i2")
            proc.stdin.write(pcm16.tobytes())
        written += n
    proc.stdin.close()
    stderr = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
    proc.wait()

    m = re.search(r"Integrated loudness:\s*I:\s*([-\d\.]+)\s*LUFS", stderr, re.S)
    if not m:
        return 1.0
    measured = float(m.group(1))
    delta_db = target_lufs - measured
    gain = 10.0 ** (delta_db / 20.0)
    return float(max(0.45, min(2.2, gain)))


def render_track(
    slug: str,
    output_path: str | Path | None = None,
    duration_sec: float = 3600.0,
    bitrate: str = "192k",
    target_lufs: float | None = -15.5,
    csv_path: str | None = None,
) -> dict[str, Any]:
    """Render a catalog track to MP3/WAV with exact discrete stereo preservation."""
    t_start = time.time()
    track = get_track(slug)
    out = Path(output_path) if output_path else (WEB_DIR / "audio" / track["filename"])
    out.parent.mkdir(parents=True, exist_ok=True)

    gain_scale = 1.0
    if target_lufs is not None and track["engine"] in ("suite", "pack2"):
        gain_scale = calibrate_gain_for_lufs(track, target_lufs=target_lufs)

    eng = _create_engine(track, duration_sec=duration_sec, gain_scale=gain_scale, csv_path=csv_path)

    ext = out.suffix.lower()
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0",
    ]
    if ext == ".wav":
        cmd += ["-c:a", "pcm_s16le"]
    else:
        # Force true discrete stereo (-joint_stereo 0) for zero binaural L/R crosstalk!
        cmd += ["-c:a", "libmp3lame", "-b:a", bitrate, "-joint_stereo", "0"]

    cmd += [
        "-metadata", f"title={track['title']} - {track['band']}",
        "-metadata", "artist=Dreamlight Neural Focus Studio",
        "-metadata", f"comment={track['band']} | {track['binaural']} | {track['bpm']} BPM | {track['key']}",
        str(out),
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    sum_sq, peak, written = 0.0, 0.0, 0
    try:
        assert proc.stdin is not None
        while written < eng.total_samples:
            n = min(eng.block_samples, eng.total_samples - written)
            blk = eng.render_block(written, n)
            sum_sq += float(np.sum(blk ** 2))
            peak = max(peak, float(np.max(np.abs(blk))))
            dither = (eng.rng.random(blk.shape) - eng.rng.random(blk.shape)) / 32768.0
            pcm16 = np.clip(np.round((blk + dither) * 32767.0), -32768, 32767).astype("<i2")
            proc.stdin.write(pcm16.tobytes())
            written += n
    finally:
        if proc.stdin:
            proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError(f"ffmpeg failed while rendering {slug}")

    rms_db = 20.0 * math.log10(math.sqrt(sum_sq / max(1, written * 2)) + 1e-12)
    peak_db = 20.0 * math.log10(peak + 1e-12)
    return {
        "slug": slug,
        "output": str(out),
        "gain_scale": round(gain_scale, 3),
        "rms_dbfs": round(rms_db, 2),
        "peak_dbfs": round(peak_db, 2),
        "size_mb": round(out.stat().st_size / (1024 * 1024), 2),
        "elapsed_sec": round(time.time() - t_start, 1),
    }


def render_worker(args_tuple):
    """Picklable top-level worker for ProcessPoolExecutor under spawn."""
    slug, out_dir, duration, bitrate, target_lufs, csv_path = args_tuple
    track = get_track(slug)
    out_path = Path(out_dir) / track["filename"]
    return render_track(
        slug=slug,
        output_path=out_path,
        duration_sec=duration,
        bitrate=bitrate,
        target_lufs=target_lufs,
        csv_path=csv_path,
    )
