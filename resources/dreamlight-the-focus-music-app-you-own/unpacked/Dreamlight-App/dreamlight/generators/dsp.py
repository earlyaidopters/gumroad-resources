"""
Core numpy DSP primitives and procedural instrument synthesizers for Dreamlight.

Pure Python + NumPy audio synthesis with exact linear-phase overlap-add FIR
filtering, custom stereo hall/cathedral convolution reverb, ping-pong delay,
and distinct procedural instruments.
"""

from __future__ import annotations

import math
import numpy as np

SR = 44100


def midi_to_hz(midi_note: float) -> float:
    return 440.0 * (2.0 ** ((midi_note - 69.0) / 12.0))


def next_pow2(n: int) -> int:
    return 1 << (n - 1).bit_length()


def design_fir_kernel(
    sr: int,
    num_taps: int = 513,
    lo_hz: float | None = None,
    hi_hz: float | None = None,
) -> np.ndarray:
    """Blackman-windowed linear-phase FIR filter kernel."""
    assert num_taps % 2 == 1
    m = num_taps - 1
    n = np.arange(num_taps, dtype=np.float64) - m / 2.0
    win = np.blackman(num_taps)

    def lp_sinc(fc_hz: float) -> np.ndarray:
        fc = fc_hz / sr
        h = 2.0 * fc * np.sinc(2.0 * fc * n) * win
        s = h.sum()
        return h / s if abs(s) > 1e-12 else h

    impulse = np.zeros(num_taps, dtype=np.float64)
    impulse[m // 2] = 1.0

    if lo_hz is None and hi_hz is not None:
        return lp_sinc(hi_hz)
    if lo_hz is not None and hi_hz is None:
        return impulse - lp_sinc(lo_hz)
    if lo_hz is not None and hi_hz is not None:
        return lp_sinc(hi_hz) - lp_sinc(lo_hz)
    return impulse


class OverlapAddConvolver:
    """Streaming stereo FFT convolution with exact overlap-add continuity."""

    def __init__(self, ir: np.ndarray, block_size: int):
        if ir.ndim == 1:
            ir = np.column_stack([ir, ir])
        self.ir_len = ir.shape[0]
        self.block_size = block_size
        self.n_fft = next_pow2(block_size + self.ir_len - 1)
        self.ir_fft = np.fft.rfft(ir, n=self.n_fft, axis=0)
        self.tail = np.zeros((self.ir_len - 1, 2), dtype=np.float64)

    def process(self, block: np.ndarray) -> np.ndarray:
        n = block.shape[0]
        if n == 0:
            return np.zeros((0, 2), dtype=np.float64)
        x_fft = np.fft.rfft(block, n=self.n_fft, axis=0)
        y_full = np.fft.irfft(x_fft * self.ir_fft, n=self.n_fft, axis=0)
        out = y_full[:n].copy()
        overlap_n = min(n, self.tail.shape[0])
        out[:overlap_n] += self.tail[:overlap_n]

        new_tail = np.zeros((self.ir_len - 1, 2), dtype=np.float64)
        rem_old = self.tail.shape[0] - overlap_n
        if rem_old > 0:
            new_tail[:rem_old] += self.tail[overlap_n:]
        y_tail = y_full[n : n + self.ir_len - 1]
        new_tail[: y_tail.shape[0]] += y_tail
        self.tail = new_tail
        return out


def design_reverb_ir(
    sr: int = SR,
    duration: float = 3.4,
    brightness: float = 1.0,
    seed: int = 42,
    early_reflections: bool = False,
) -> np.ndarray:
    """Dark-damped stereo hall/cathedral impulse response scaled by duration & brightness."""
    rng = np.random.default_rng(seed)
    n = int(sr * duration)
    t = np.arange(n, dtype=np.float64) / sr

    ir = np.zeros((n, 2), dtype=np.float64)
    scale_rt = duration / 3.4
    bands = [
        (85.0, 260.0, 2.9 * scale_rt, 0.55),
        (260.0, 750.0, 2.5 * scale_rt, 0.80),
        (750.0, 1800.0, 1.7 * scale_rt * brightness, 0.42 * brightness),
        (1800.0, 4400.0, 0.95 * scale_rt * brightness, 0.16 * brightness),
        (4400.0, 8200.0, 0.45 * scale_rt * brightness, 0.06 * brightness),
    ]

    pre_delay = int(0.020 * sr)
    attack = int(0.048 * sr)
    base_env = np.ones(n, dtype=np.float64)
    base_env[:pre_delay] = 0.0
    atk_slice = slice(pre_delay, min(n, pre_delay + attack))
    atk_len = atk_slice.stop - atk_slice.start
    base_env[atk_slice] = 0.5 * (1.0 - np.cos(np.pi * np.arange(atk_len) / max(1, atk_len)))

    n_fft = next_pow2(n)
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)

    for ch in range(2):
        acc = np.zeros(n, dtype=np.float64)
        for lo, hi, rt60, gain in bands:
            tau = max(0.05, rt60 / 6.907755)
            noise = rng.standard_normal(n)
            spec = np.fft.rfft(noise, n=n_fft)
            mask = np.zeros_like(freqs)
            lo_w, hi_w = lo * 0.35, hi * 0.35
            in_lo = (freqs >= lo - lo_w) & (freqs < lo)
            in_mid = (freqs >= lo) & (freqs <= hi)
            in_hi = (freqs > hi) & (freqs <= hi + hi_w)
            mask[in_lo] = 0.5 * (1.0 - np.cos(np.pi * (freqs[in_lo] - (lo - lo_w)) / max(1e-6, lo_w)))
            mask[in_mid] = 1.0
            mask[in_hi] = 0.5 * (1.0 + np.cos(np.pi * (freqs[in_hi] - hi) / max(1e-6, hi_w)))
            shaped = np.fft.irfft(spec * mask, n=n_fft)[:n]
            env = base_env * np.exp(-np.maximum(0.0, t - 0.020) / tau)
            acc += shaped * env * gain

        if early_reflections:
            er_times = [0.026, 0.041, 0.059, 0.081] if ch == 0 else [0.031, 0.047, 0.067, 0.089]
            er_gains = [0.22, 0.16, 0.12, 0.08]
            for et, eg in zip(er_times, er_gains):
                idx = int(et * sr)
                if idx + 64 < n:
                    k = np.exp(-0.5 * ((np.arange(64) - 32) / 9.0) ** 2)
                    k /= k.sum()
                    acc[idx : idx + 64] += eg * k * 8.0

        ir[:, ch] = acc

    l_raw, r_raw = ir[:, 0].copy(), ir[:, 1].copy()
    ir[:, 0] = 0.76 * l_raw + 0.24 * r_raw
    ir[:, 1] = 0.76 * r_raw + 0.24 * l_raw

    fade = int(0.18 * sr)
    ir[-fade:, :] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(fade)[:, None] / fade))

    rms = np.sqrt(np.mean(np.sum(ir ** 2, axis=0)))
    if rms > 0:
        ir /= rms * 1.15
    return ir


class StereoPingPongDelay:
    """Streaming tempo-synced stereo ping-pong delay with warm low-pass feedback."""

    def __init__(self, sr: int, delay_l_sec: float, delay_r_sec: float, feedback: float = 0.40):
        self.dl = max(1, int(round(delay_l_sec * sr)))
        self.dr = max(1, int(round(delay_r_sec * sr)))
        self.fb = feedback
        self.buf_l = np.zeros(self.dl, dtype=np.float64)
        self.buf_r = np.zeros(self.dr, dtype=np.float64)

    def process(self, block: np.ndarray) -> np.ndarray:
        n = block.shape[0]
        out = np.zeros_like(block)
        step = min(self.dl, self.dr)
        pos = 0
        k = np.array([0.1, 0.2, 0.4, 0.2, 0.1], dtype=np.float64)
        while pos < n:
            m = min(step, n - pos)
            del_l = self.buf_l[:m].copy()
            del_r = self.buf_r[:m].copy()
            out[pos : pos + m, 0] = del_l
            out[pos : pos + m, 1] = del_r

            if m >= 8:
                fb_l = np.convolve(del_r, k, mode="same") * self.fb
                fb_r = np.convolve(del_l, k, mode="same") * self.fb
            else:
                fb_l = del_r * self.fb
                fb_r = del_l * self.fb

            in_l = block[pos : pos + m, 0] + fb_l
            in_r = block[pos : pos + m, 1] + fb_r

            self.buf_l = np.concatenate([self.buf_l[m:], in_l])
            self.buf_r = np.concatenate([self.buf_r[m:], in_r])
            pos += m
        return out


# ---------------------------------------------------------------------------
# Procedural Instrument Synthesizers
# ---------------------------------------------------------------------------


def synthesize_kick(
    sr: int,
    duration: float = 0.44,
    f_end: float = 51.0,
    tau: float = 0.118,
    f_start: float = 116.0,
) -> np.ndarray:
    n = int(sr * duration)
    t = np.arange(n, dtype=np.float64) / sr
    tau_p = 0.024
    phase = 2.0 * np.pi * (f_end * t + (f_start - f_end) * tau_p * (1.0 - np.exp(-t / tau_p)))

    atk_n = int(0.004 * sr)
    env = np.exp(-t / tau)
    env[:atk_n] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(atk_n) / atk_n))
    tail_n = int(0.04 * sr)
    env[-tail_n:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail_n) / tail_n))

    sig = np.sin(phase) * env
    return np.tanh(sig * 1.28) / 1.12


def render_chord_pad(
    t: np.ndarray,
    pad_midis: list[int],
    harms: tuple[float, ...] = (1.0, 0.40, 0.16, 0.07, 0.025),
    detune_cents: tuple[float, ...] = (-4.5, -1.5, 1.5, 4.5),
) -> np.ndarray:
    n = len(t)
    out = np.zeros((n, 2), dtype=np.float64)
    pans = (-0.46, -0.14, 0.14, 0.46)
    inv_notes = 1.0 / math.sqrt(len(pad_midis) * len(detune_cents))

    for m_idx, midi in enumerate(pad_midis):
        base_f = midi_to_hz(midi)
        note_w = 1.15 if m_idx == 0 else (0.95 if m_idx < 3 else 0.68)
        for v_idx, (cents, pan) in enumerate(zip(detune_cents, pans)):
            f = base_f * (2.0 ** (cents / 1200.0))
            phi0 = (midi * 0.73 + v_idx * 0.35) % (2.0 * np.pi)
            phase = phi0 + 2.0 * np.pi * f * t
            sig = np.sin(phase) * harms[0]
            sig += np.sin(2.0 * phase) * harms[1]
            sig += np.sin(3.0 * phase) * harms[2]
            sig += np.sin(4.0 * phase) * harms[3]
            sig += np.sin(5.0 * phase) * harms[4]

            angle = (pan + 1.0) * (np.pi / 4.0)
            out[:, 0] += sig * (math.cos(angle) * note_w * inv_notes)
            out[:, 1] += sig * (math.sin(angle) * note_w * inv_notes)
    return out


def render_sub_bass(
    t: np.ndarray,
    bass_midi: int,
    beat_sec: float,
    duck_depth: float = 0.50,
) -> np.ndarray:
    f0 = midi_to_hz(bass_midi)
    while f0 < 43.0:
        f0 *= 2.0
    while f0 > 82.0:
        f0 *= 0.5

    p1 = 2.0 * np.pi * f0 * t
    mono = np.sin(p1) + 0.24 * np.sin(2.0 * p1) + 0.04 * np.sin(3.0 * p1)

    if duck_depth > 0.01:
        t_beat = np.mod(t, beat_sec)
        duck = 1.0 - duck_depth * np.exp(-t_beat / 0.115) * (1.0 - np.exp(-t_beat / 0.005))
        mono *= duck
    else:
        mono *= 0.72 + 0.28 * np.sin(2.0 * np.pi * 0.09 * t)

    return np.column_stack([mono, mono])


def synth_pluck_note(
    sr: int,
    freq: float,
    dur: float = 1.15,
    vel: float = 0.7,
    fm_index: float = 0.42,
    decay_fast: float = 0.26,
) -> np.ndarray:
    n = int(sr * dur)
    t = np.arange(n, dtype=np.float64) / sr
    atk = int(0.010 * sr)
    env = 0.62 * np.exp(-t / decay_fast) + 0.38 * np.exp(-t / (decay_fast * 2.5))
    env[:atk] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(atk) / atk))
    tail = int(0.05 * sr)
    env[-tail:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))

    mod_env = np.exp(-t / 0.052) * (fm_index * vel)
    phase = 2.0 * np.pi * freq * t
    sig = np.sin(phase + mod_env * np.sin(2.0 * phase))
    sig += 0.16 * np.sin(2.0 * phase) * np.exp(-t / 0.16)
    return sig * env * vel


def synth_handpan_note(sr: int, freq: float, dur: float = 1.6, vel: float = 0.75) -> np.ndarray:
    """Warm organic wooden marimba / steel-handpan hybrid."""
    n = int(sr * dur)
    t = np.arange(n, dtype=np.float64) / sr
    atk = int(0.004 * sr)
    env1 = np.exp(-t / 0.42)
    env2 = np.exp(-t / 0.16)
    env3 = np.exp(-t / 0.08)
    env_atk = np.ones(n, dtype=np.float64)
    env_atk[:atk] = 0.5 * (1.0 - np.cos(np.pi * np.arange(atk) / atk))
    tail = int(0.06 * sr)
    env_atk[-tail:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))

    p = 2.0 * np.pi * freq * t
    sig = (
        np.sin(p) * env1
        + 0.36 * np.sin(2.0 * p) * env2
        + 0.10 * np.sin(3.0 * p) * env3
        + 0.14 * np.sin(3.98 * p) * np.exp(-t / 0.018)
    )
    return sig * env_atk * vel


def synth_handpan_bass_hit(sr: int, f_end: float = 78.0) -> np.ndarray:
    """Organic resonant frame-drum / handpan ding bass thump."""
    dur = 0.42
    n = int(sr * dur)
    t = np.arange(n, dtype=np.float64) / sr
    f_start = f_end * 1.55
    tau_p = 0.022
    phase = 2.0 * np.pi * (f_end * t + (f_start - f_end) * tau_p * (1.0 - np.exp(-t / tau_p)))
    atk = int(0.005 * sr)
    env = np.exp(-t / 0.13)
    env[:atk] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(atk) / atk))
    tail = int(0.04 * sr)
    env[-tail:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))
    return (np.sin(phase) + 0.18 * np.sin(2.0 * phase) * np.exp(-t / 0.05)) * env


def synth_kalimba_note(sr: int, freq: float, dur: float = 1.15, vel: float = 0.72) -> np.ndarray:
    """Resonant wooden thumb-piano / kalimba tine pluck."""
    n = int(sr * dur)
    t = np.arange(n, dtype=np.float64) / sr
    atk = int(0.0025 * sr)
    env = 0.72 * np.exp(-t / 0.24) + 0.28 * np.exp(-t / 0.65)
    env[:atk] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(atk) / atk))
    tail = int(0.04 * sr)
    env[-tail:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))

    p = 2.0 * np.pi * freq * t
    tine_click = 0.22 * np.sin(6.27 * p) * np.exp(-t / 0.014)
    sig = np.sin(p) + 0.22 * np.sin(2.0 * p) * np.exp(-t / 0.12) + 0.12 * np.sin(2.96 * p) * np.exp(-t / 0.06) + tine_click
    return sig * env * vel


def synth_celesta_note(sr: int, freq: float, dur: float = 1.9, vel: float = 0.65) -> np.ndarray:
    """Delicate celestial music-box / glass celesta droplet."""
    n = int(sr * dur)
    t = np.arange(n, dtype=np.float64) / sr
    atk = int(0.007 * sr)
    env = 0.55 * np.exp(-t / 0.45) + 0.45 * np.exp(-t / 1.15)
    env[:atk] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(atk) / atk))
    tail = int(0.08 * sr)
    env[-tail:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))

    p = 2.0 * np.pi * freq * t
    sig = (
        np.sin(p)
        + 0.28 * np.sin(2.0 * p) * np.exp(-t / 0.35)
        + 0.11 * np.sin(4.0 * p) * np.exp(-t / 0.14)
        + 0.05 * np.sin(5.4 * p) * np.exp(-t / 0.04)
    )
    return sig * env * vel


def synth_singing_bowl(sr: int, freq: float, dur: float = 3.8, vel: float = 0.7) -> np.ndarray:
    """Harmonic Tibetan singing bowl with shimmering inharmonic overtones and slow beating."""
    n = int(sr * dur)
    t = np.arange(n, dtype=np.float64) / sr
    atk = int(0.035 * sr)
    env_a = np.ones(n, dtype=np.float64)
    env_a[:atk] = 0.5 * (1.0 - np.cos(np.pi * np.arange(atk) / atk))
    tail = int(0.22 * sr)
    env_a[-tail:] *= 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))

    p = 2.0 * np.pi * freq * t
    beat1 = 0.85 + 0.15 * np.sin(2.0 * np.pi * 1.4 * t)
    beat2 = 0.80 + 0.20 * np.sin(2.0 * np.pi * 2.3 * t + 0.6)
    sig = (
        np.sin(p) * np.exp(-t / 1.85) * beat1
        + 0.34 * np.sin(2.756 * p) * np.exp(-t / 1.25) * beat2
        + 0.12 * np.sin(5.404 * p) * np.exp(-t / 0.55)
    )
    return sig * env_a * vel


def synth_lofi_rhodes_pad(t: np.ndarray, pad_midis: list[int], beat_sec: float) -> np.ndarray:
    """Warm vintage Rhodes electric piano chords with gentle tape wow/flutter & bell bark."""
    n = len(t)
    out = np.zeros((n, 2), dtype=np.float64)
    tape_mod = 0.0018 * np.sin(2.0 * np.pi * 0.38 * t) + 0.00045 * np.sin(2.0 * np.pi * 3.2 * t)
    trem_l = 0.84 + 0.16 * np.sin(2.0 * np.pi * (0.5 / beat_sec) * t)
    trem_r = 0.84 - 0.16 * np.sin(2.0 * np.pi * (0.5 / beat_sec) * t)

    inv = 1.0 / math.sqrt(len(pad_midis) * 2)
    for idx, midi in enumerate(pad_midis):
        f0 = midi_to_hz(midi)
        w = 1.1 if idx == 0 else (0.95 if idx < 3 else 0.72)
        pan = -0.35 + 0.70 * (idx / max(1, len(pad_midis) - 1))
        angle = (pan + 1.0) * (math.pi / 4.0)
        phi = 2.0 * np.pi * f0 * t + (2.0 * np.pi * f0 * 0.0006 * np.sin(2.0 * np.pi * 0.38 * t)) + idx * 0.8
        sig = (
            np.sin(phi + 0.15 * np.sin(2.0 * phi))
            + 0.26 * np.sin(2.0 * phi)
            + 0.09 * np.sin(3.0 * phi)
            + 0.025 * np.sin(7.0 * phi) * (0.5 + 0.5 * tape_mod * 120.0)
        )
        out[:, 0] += sig * (math.cos(angle) * w * inv)
        out[:, 1] += sig * (math.sin(angle) * w * inv)

    out[:, 0] *= trem_l
    out[:, 1] *= trem_r
    return out


def synth_felt_piano_pad(t: np.ndarray, pad_midis: list[int], beat_sec: float) -> np.ndarray:
    """Warm muted upright felt-piano / Wurlitzer harmonic bed with soft rhythmic bloom."""
    n = len(t)
    out = np.zeros((n, 2), dtype=np.float64)
    # Soft 2-bar felt-hammer pulse bloom
    bar_cycle = np.mod(t, beat_sec * 4.0)
    bloom = 0.62 + 0.38 * np.exp(-bar_cycle / (beat_sec * 2.2)) * (1.0 - np.exp(-bar_cycle / 0.035))

    inv = 1.0 / math.sqrt(len(pad_midis) * 2.4)
    for idx, midi in enumerate(pad_midis):
        f0 = midi_to_hz(midi)
        w = 1.12 if idx == 0 else (0.92 if idx < 3 else 0.68)
        pan = -0.42 + 0.84 * (idx / max(1, len(pad_midis) - 1))
        angle = (pan + 1.0) * (math.pi / 4.0)
        phi1 = 2.0 * np.pi * f0 * t + idx * 0.65
        phi2 = 2.0 * np.pi * (f0 * 1.0011) * t + idx * 1.15
        # Soft felt roll-off: warm fundamental + muted 2nd + very gentle 3rd
        sig = 0.65 * np.sin(phi1) + 0.45 * np.sin(phi2) + 0.24 * np.sin(2.0 * phi1) + 0.07 * np.sin(3.0 * phi1)
        out[:, 0] += sig * bloom * (math.cos(angle) * w * inv)
        out[:, 1] += sig * bloom * (math.sin(angle) * w * inv)
    return out


def synth_hearth_harp_pad(t: np.ndarray, pad_midis: list[int], beat_sec: float) -> np.ndarray:
    """Intimate warm nylon-harp & mellow acoustic pad with staggered note breathing."""
    n = len(t)
    out = np.zeros((n, 2), dtype=np.float64)
    inv = 1.0 / math.sqrt(len(pad_midis) * 2.2)
    for idx, midi in enumerate(pad_midis):
        f0 = midi_to_hz(midi)
        w = 1.15 if idx == 0 else (0.94 if idx < 3 else 0.65)
        pan = -0.45 + 0.90 * (idx / max(1, len(pad_midis) - 1))
        angle = (pan + 1.0) * (math.pi / 4.0)
        # Staggered gentle acoustic strum wave
        strum = np.mod(t - idx * 0.14, beat_sec * 4.0)
        env = 0.55 + 0.45 * np.exp(-strum / (beat_sec * 2.5)) * (1.0 - np.exp(-strum / 0.025))
        phi = 2.0 * np.pi * f0 * t + idx * 0.9
        sig = np.sin(phi) + 0.30 * np.sin(2.0 * phi) + 0.11 * np.sin(3.0 * phi) + 0.03 * np.sin(4.0 * phi)
        out[:, 0] += sig * env * (math.cos(angle) * w * inv)
        out[:, 1] += sig * env * (math.sin(angle) * w * inv)
    return out


def synth_bowed_drone(t: np.ndarray, pad_midis: list[int]) -> np.ndarray:
    """Glacial, cathedral-like bowed cello/organ harmonic drone."""
    n = len(t)
    out = np.zeros((n, 2), dtype=np.float64)
    detunes = (-6.0, -2.0, 2.0, 6.0)
    pans = (-0.52, -0.18, 0.18, 0.52)
    inv = 1.0 / math.sqrt(len(pad_midis) * len(detunes))

    for m_idx, midi in enumerate(pad_midis):
        f0 = midi_to_hz(midi)
        w = 1.25 if m_idx == 0 else (0.90 if m_idx < 3 else 0.58)
        swell = 0.65 + 0.35 * np.sin(2.0 * np.pi * (0.021 + m_idx * 0.007) * t + m_idx * 1.3)
        for v_idx, (cents, pan) in enumerate(zip(detunes, pans)):
            f = f0 * (2.0 ** (cents / 1200.0))
            phi = 2.0 * np.pi * f * t + m_idx * 0.9 + v_idx * 0.45
            sig = np.sin(phi) + 0.34 * np.sin(2.0 * phi) + 0.14 * np.sin(3.0 * phi) + 0.04 * np.sin(4.0 * phi)
            angle = (pan + 1.0) * (math.pi / 4.0)
            out[:, 0] += sig * swell * (math.cos(angle) * w * inv)
            out[:, 1] += sig * swell * (math.sin(angle) * w * inv)
    return out


def synth_deep_organ_drone(t: np.ndarray, pad_midis: list[int]) -> np.ndarray:
    """Ultra-deep sub-octave cathedral pipe-organ drone for 1.5 Hz Delta restoration."""
    n = len(t)
    out = np.zeros((n, 2), dtype=np.float64)
    detunes = (-5.0, 0.0, 5.0)
    pans = (-0.42, 0.0, 0.42)
    inv = 1.0 / math.sqrt(len(pad_midis) * len(detunes))

    for m_idx, midi in enumerate(pad_midis):
        # Drop lowest voice an octave for deep subterranean warmth
        f0 = midi_to_hz(midi - (12 if m_idx == 0 and midi > 42 else 0))
        w = 1.35 if m_idx == 0 else (0.85 if m_idx < 3 else 0.50)
        swell = 0.68 + 0.32 * np.sin(2.0 * np.pi * (0.015 + m_idx * 0.005) * t + m_idx * 1.7)
        for v_idx, (cents, pan) in enumerate(zip(detunes, pans)):
            f = f0 * (2.0 ** (cents / 1200.0))
            phi = 2.0 * np.pi * f * t + m_idx * 1.1 + v_idx * 0.6
            # Pure flute-pipe organ recipe (strong 1st, hollow 2nd, faint 4th)
            sig = np.sin(phi) + 0.26 * np.sin(2.0 * phi) + 0.06 * np.sin(4.0 * phi)
            angle = (pan + 1.0) * (math.pi / 4.0)
            out[:, 0] += sig * swell * (math.cos(angle) * w * inv)
            out[:, 1] += sig * swell * (math.sin(angle) * w * inv)
    return out


def synth_driving_bassline(t: np.ndarray, bass_midi: int, beat_sec: float) -> np.ndarray:
    """Syncopated 16th-note warm analog rolling bassline."""
    f0 = midi_to_hz(bass_midi)
    while f0 < 46.0:
        f0 *= 2.0
    while f0 > 88.0:
        f0 *= 0.5

    step_sec = beat_sec / 4.0
    step_idx = np.floor(t / step_sec).astype(np.int64) % 16
    t_step = np.mod(t, step_sec)

    pattern_gain = np.array(
        [0.35, 0.95, 0.85, 1.00, 0.35, 0.90, 0.80, 0.95, 0.35, 0.95, 0.85, 1.00, 0.35, 0.88, 0.95, 0.78]
    )[step_idx]
    octave_mult = np.array(
        [1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.5, 2.0, 1.0]
    )[step_idx]

    atk = np.minimum(1.0, t_step / 0.006)
    dec = np.exp(-t_step / (step_sec * 0.72))
    env = pattern_gain * atk * dec

    p1 = 2.0 * np.pi * f0 * t
    p2 = 2.0 * np.pi * (f0 * 2.0) * t
    p3 = 2.0 * np.pi * (f0 * 1.5) * t

    is_oct = (octave_mult > 1.8).astype(np.float64)
    is_fifth = ((octave_mult > 1.3) & (octave_mult < 1.8)).astype(np.float64)
    is_root = 1.0 - is_oct - is_fifth

    wave = (
        is_root * (np.sin(p1) + 0.38 * np.sin(2.0 * p1) + 0.14 * np.sin(3.0 * p1))
        + is_oct * (0.75 * np.sin(p2) + 0.25 * np.sin(p1) + 0.20 * np.sin(2.0 * p2))
        + is_fifth * (0.72 * np.sin(p3) + 0.35 * np.sin(p1))
    )
    mono = np.tanh(wave * env * 1.15)
    return np.column_stack([mono, mono])


def synth_minimal_bass(t: np.ndarray, bass_midi: int, beat_sec: float) -> np.ndarray:
    """Hypnotic off-beat 8th-note minimal-tech sub/mid bass pulse."""
    f0 = midi_to_hz(bass_midi)
    while f0 < 45.0:
        f0 *= 2.0
    while f0 > 82.0:
        f0 *= 0.5

    step_sec = beat_sec / 2.0
    step_idx = np.floor(t / step_sec).astype(np.int64) % 8
    t_step = np.mod(t, step_sec)

    pat = np.array([0.45, 0.92, 0.55, 0.88, 0.45, 0.96, 0.70, 0.82])[step_idx]
    atk = np.minimum(1.0, t_step / 0.008)
    dec = np.exp(-t_step / (step_sec * 0.85))
    env = pat * atk * dec

    p1 = 2.0 * np.pi * f0 * t
    wave = np.sin(p1) + 0.32 * np.sin(2.0 * p1) + 0.09 * np.sin(3.0 * p1)
    mono = np.tanh(wave * env * 1.10)
    return np.column_stack([mono, mono])
