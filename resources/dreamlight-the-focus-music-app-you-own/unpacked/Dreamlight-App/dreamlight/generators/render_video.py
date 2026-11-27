"""
Dreamlight Focus Waveform Video Renderer.

Generates a studio-grade 1920x1080 procedural Dreamlight atmospheric backdrop
and composites a dual-layer luminous screen-blended live audio-reactive waveform
with smooth horizontal edge tapering and a gliding timeline orb via ffmpeg.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
WF_W, WF_H = 1600, 320
WF_X, WF_Y = 160, 425


def find_font(size: int, style: str = "ultralight") -> ImageFont.FreeTypeFont:
    if style == "ultralight":
        candidates = [
            ("/System/Library/Fonts/Avenir Next.ttc", 10),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 11),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 2),
        ]
    elif style == "regular":
        candidates = [
            ("/System/Library/Fonts/Avenir Next.ttc", 7),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
            ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
        ]
    else:
        candidates = [
            ("/System/Library/Fonts/Avenir Next.ttc", 5),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 10),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
        ]

    for path, idx in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size, index=idx)
            except Exception:
                try:
                    return ImageFont.truetype(path, size=size)
                except Exception:
                    continue
    return ImageFont.load_default()


def draw_tracked_text(
    draw: ImageDraw.ImageDraw,
    center_x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple,
    tracking: float = 0.0,
):
    widths = [draw.textlength(ch, font=font) for ch in text]
    total_w = sum(widths) + tracking * max(0, len(text) - 1)
    x = center_x - total_w / 2.0
    for ch, cw in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += cw + tracking


def generate_dreamlight_backdrop(
    out_path: str,
    duration_label: str = "1 HOUR DEEP WORK SESSION",
    subtitle_top: str = "FUNCTIONAL FOCUS AUDIO  •  16 HZ BETA ENTRAINMENT",
    footer_text: str = "120 BPM  •  NEURAL PHASE-LOCKING  •  HEADPHONES RECOMMENDED",
    seed: int = 2026,
) -> str:
    rng = np.random.default_rng(seed)

    xs = np.linspace(-1.0, 1.0, W, dtype=np.float32)
    ys = np.linspace(-1.0, 1.0, H, dtype=np.float32)
    X, Y = np.meshgrid(xs, ys)

    r = np.full((H, W), 6.0, dtype=np.float32)
    g = np.full((H, W), 9.0, dtype=np.float32)
    b = np.full((H, W), 21.0, dtype=np.float32)

    dist_top = np.sqrt((X * 0.85) ** 2 + ((Y + 0.56) * 1.15) ** 2)
    glow_top = np.exp(-dist_top ** 2 * 1.85)
    r += glow_top * 14.0
    g += glow_top * 20.0
    b += glow_top * 46.0

    wave1 = -0.58 + 0.14 * np.sin(X * 2.4 + 0.6) + 0.06 * np.cos(X * 4.7 - 0.3)
    ribbon1 = np.exp(-((Y - wave1) / 0.24) ** 2) * np.exp(-((X + 0.15) / 1.05) ** 2)
    r += ribbon1 * 52.0
    g += ribbon1 * 34.0
    b += ribbon1 * 105.0

    wave2 = -0.45 + 0.17 * np.cos(X * 1.9 - 0.7) - 0.05 * np.sin(X * 3.8 + 0.5)
    ribbon2 = np.exp(-((Y - wave2) / 0.20) ** 2) * np.exp(-((X - 0.28) / 0.92) ** 2)
    r += ribbon2 * 16.0
    g += ribbon2 * 72.0
    b += ribbon2 * 88.0

    wave3 = -0.66 + 0.11 * np.sin(X * 2.9 - 1.2)
    ribbon3 = np.exp(-((Y - wave3) / 0.16) ** 2) * np.exp(-((X - 0.05) / 0.72) ** 2)
    r += ribbon3 * 88.0
    g += ribbon3 * 64.0
    b += ribbon3 * 42.0

    wave_low = 0.80 + 0.08 * np.sin(X * 2.1 + 1.1)
    ribbon_low = np.exp(-((Y - wave_low) / 0.25) ** 2) * np.exp(-(X / 1.1) ** 2)
    r += ribbon_low * 20.0
    g += ribbon_low * 32.0
    b += ribbon_low * 54.0

    center_haze = np.exp(-((X / 0.68) ** 2 + ((Y - 0.09) / 0.22) ** 2))
    r += center_haze * 8.0
    g += center_haze * 14.0
    b += center_haze * 24.0

    vig = 1.0 - 0.48 * np.clip((X ** 2 * 0.75 + Y ** 2 * 0.95) - 0.15, 0.0, 1.4) ** 1.35
    vig = np.clip(vig, 0.35, 1.0)
    r *= vig
    g *= vig
    b *= vig

    grain = rng.normal(0.0, 0.95, size=(H, W)).astype(np.float32)
    rgb = np.stack([
        np.clip(r + grain, 0, 255),
        np.clip(g + grain, 0, 255),
        np.clip(b + grain, 0, 255),
    ], axis=-1).astype(np.uint8)

    img = Image.fromarray(rgb, mode="RGB").convert("RGBA")

    motes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(motes)
    for _ in range(150):
        sx = int(rng.integers(40, W - 40))
        sy = int(rng.integers(30, H - 30))
        if 420 < sy < 750 and 150 < sx < 1770 and rng.random() < 0.85:
            continue
        rad = float(rng.choice([1.0, 1.2, 1.5]))
        alpha = int(rng.integers(25, 100))
        tint = rng.choice([(245, 240, 230), (210, 235, 255), (225, 210, 255)])
        mdraw.ellipse((sx - rad, sy - rad, sx + rad, sy + rad), fill=(int(tint[0]), int(tint[1]), int(tint[2]), alpha))

    bokeh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bokeh)
    for _ in range(18):
        bx = int(rng.integers(80, W - 80))
        by = int(rng.integers(50, 400)) if rng.random() < 0.75 else int(rng.integers(770, H - 80))
        brad = int(rng.integers(14, 46))
        alpha = int(rng.integers(14, 32))
        tint = rng.choice([(245, 212, 158), (150, 130, 255), (94, 234, 212)])
        bdraw.ellipse((bx - brad, by - brad, bx + brad, by + brad), fill=(int(tint[0]), int(tint[1]), int(tint[2]), alpha))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(radius=16))

    img = Image.alpha_composite(img, bokeh)
    img = Image.alpha_composite(img, motes)

    txt_glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    tg_draw = ImageDraw.Draw(txt_glow)
    font_title = find_font(76, "ultralight")
    font_eyebrow = find_font(17, "ultralight")
    font_sub = find_font(19, "regular")
    font_footer = find_font(15, "ultralight")

    draw_tracked_text(tg_draw, W // 2, 196, "DREAMLIGHT", font_title, (190, 215, 255, 115), tracking=26.0)
    txt_glow = txt_glow.filter(ImageFilter.GaussianBlur(radius=14))
    img = Image.alpha_composite(img, txt_glow)

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    draw_tracked_text(odraw, W // 2, 150, subtitle_top, font_eyebrow, (186, 206, 236, 185), tracking=5.2)
    draw_tracked_text(odraw, W // 2, 196, "DREAMLIGHT", font_title, (246, 248, 254, 242), tracking=26.0)
    odraw.line([(W // 2 - 110, 302), (W // 2 + 110, 302)], fill=(235, 202, 148, 105), width=1)
    draw_tracked_text(odraw, W // 2, 320, duration_label, font_sub, (216, 226, 244, 178), tracking=7.5)

    wf_x0, wf_x1, wf_cy = WF_X, WF_X + WF_W, WF_Y + WF_H // 2
    odraw.line([(wf_x0 + 40, wf_cy), (wf_x1 - 40, wf_cy)], fill=(190, 220, 255, 42), width=1)

    tl_y = 948
    odraw.line([(wf_x0, tl_y), (wf_x1, tl_y)], fill=(195, 212, 240, 48), width=2)
    odraw.ellipse((wf_x0 - 3, tl_y - 3, wf_x0 + 3, tl_y + 3), fill=(215, 225, 245, 95))
    odraw.ellipse((wf_x1 - 3, tl_y - 3, wf_x1 + 3, tl_y + 3), fill=(215, 225, 245, 95))

    draw_tracked_text(odraw, W // 2, 978, footer_text, font_footer, (164, 180, 208, 152), tracking=4.8)

    img = Image.alpha_composite(img, overlay)
    img.convert("RGB").save(out_path, format="PNG")
    return out_path


def generate_taper_mask(out_path: str) -> str:
    x = np.arange(WF_W, dtype=np.float32)
    edge = 180.0
    env = np.ones(WF_W, dtype=np.float32)
    left = x < edge
    right = x >= (WF_W - edge)
    env[left] = 0.5 * (1.0 - np.cos(np.pi * x[left] / edge))
    env[right] = 0.5 * (1.0 - np.cos(np.pi * (WF_W - 1 - x[right]) / edge))
    y = np.arange(WF_H, dtype=np.float32)
    vy = np.ones(WF_H, dtype=np.float32)
    ve = 18.0
    vy[y < ve] = 0.5 * (1.0 - np.cos(np.pi * y[y < ve] / ve))
    vy[y >= WF_H - ve] = 0.5 * (1.0 - np.cos(np.pi * (WF_H - 1 - y[y >= WF_H - ve]) / ve))

    mask_2d = np.clip(np.outer(vy, env) * 255.0, 0, 255).astype(np.uint8)
    rgb = np.stack([mask_2d, mask_2d, mask_2d], axis=-1)
    Image.fromarray(rgb, mode="RGB").save(out_path, format="PNG")
    return out_path


def generate_progress_orb(out_path: str) -> str:
    sz = 28
    orb = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(orb)
    d.ellipse((4, 4, sz - 4, sz - 4), fill=(120, 232, 220, 130))
    orb = orb.filter(ImageFilter.GaussianBlur(radius=4.5))
    core = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    cd = ImageDraw.Draw(core)
    cd.ellipse((10, 10, sz - 10, sz - 10), fill=(255, 248, 234, 248))
    orb = Image.alpha_composite(orb, core)
    orb.save(out_path, format="PNG")
    return out_path


def probe_duration(audio_path: str) -> float:
    out = subprocess.check_output([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path,
    ], text=True).strip()
    return float(out)


def render_video(
    audio_path: str,
    output_path: str,
    backdrop_path: str,
    taper_path: str,
    orb_path: str,
    fps: int = 24,
    bitrate: str = "4200k",
    use_hw: bool = True,
):
    dur = probe_duration(audio_path)
    t0 = time.time()

    filter_complex = (
        f"[0:a]volume=1.65,asplit=2[a_aura][a_core];"
        f"[a_aura]aformat=channel_layouts=mono,"
        f"showwaves=s=800x160:mode=cline:rate={fps}:scale=sqrt:colors=white,"
        f"format=rgb24,gblur=sigma=8:steps=1,scale={WF_W}:{WF_H}:flags=bilinear,"
        f"lutrgb=r='val*0.42':g='val*0.52':b='val*0.95'[w_aura];"
        f"[a_core]showwaves=s={WF_W}x{WF_H}:mode=p2p:rate={fps}:scale=sqrt:colors=0xFFF4E0|0x93C5FD,"
        f"format=rgb24,split=2[c_raw][c_halo_in];"
        f"[c_halo_in]gblur=sigma=2.5:steps=1[c_halo];"
        f"[c_raw][c_halo]blend=all_mode=screen[w_core];"
        f"[w_aura][w_core]blend=all_mode=screen[w_sum];"
        f"[3:v]format=rgb24[taper];"
        f"[w_sum][taper]blend=all_mode=multiply[w_tapered];"
        f"[1:v]format=rgb24,split=2[bg_full][bg_for_crop];"
        f"[bg_for_crop]crop={WF_W}:{WF_H}:{WF_X}:{WF_Y}[bg_strip];"
        f"[bg_strip][w_tapered]blend=all_mode=screen[strip_lit];"
        f"[bg_full][strip_lit]overlay={WF_X}:{WF_Y}:shortest=1[v1];"
        f"[v1][2:v]overlay=x='146+1600*min(1,t/{dur:.4f})':y=934:shortest=1,format=yuv420p[vout]"
    )

    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning", "-stats",
        "-i", audio_path,
        "-loop", "1", "-framerate", str(fps), "-i", backdrop_path,
        "-loop", "1", "-framerate", str(fps), "-i", orb_path,
        "-loop", "1", "-framerate", str(fps), "-i", taper_path,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "0:a",
        "-t", f"{dur:.3f}",
        "-r", str(fps),
    ]

    if use_hw:
        cmd += ["-c:v", "h264_videotoolbox", "-b:v", bitrate, "-maxrate", "6000k", "-bufsize", "12000k", "-allow_sw", "1"]
    else:
        cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", "20"]

    cmd += ["-c:a", "copy", "-movflags", "+faststart", output_path]
    subprocess.run(cmd, check=True)
    elapsed = time.time() - t0
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Done! {output_path} ({size_mb:.1f} MB) in {elapsed:.1f}s", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Render glowing Dreamlight waveform video.")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--label", default="1 HOUR DEEP WORK SESSION")
    parser.add_argument("--backdrop", default="dreamlight_backdrop.png")
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--bitrate", default="4200k")
    parser.add_argument("--software", action="store_true")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(args.backdrop))
    orb_path = os.path.join(base_dir, ".progress_orb.png")
    taper_path = os.path.join(base_dir, ".taper_mask.png")

    generate_dreamlight_backdrop(args.backdrop, duration_label=args.label)
    generate_taper_mask(taper_path)
    generate_progress_orb(orb_path)
    render_video(args.audio, args.output, args.backdrop, taper_path, orb_path, args.fps, args.bitrate, not args.software)


if __name__ == "__main__":
    main()
