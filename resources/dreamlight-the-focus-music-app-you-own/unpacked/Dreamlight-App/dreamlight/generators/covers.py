"""
Minimalist 512x512 studio cover art generator driven by generators/catalog.py.

Matches the dark-obsidian + dual-aurora + glowing/crisp geometric motif + stardust
aesthetic across all 25 Dreamlight sessions.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .catalog import TRACKS, WEB_DIR, get_track


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def render_cover(
    slug: str,
    palette: list[str],
    motif: str,
    seed: int,
    out_dir: Path | None = None,
) -> Path:
    S = 512
    rng = np.random.default_rng(seed & 0xFFFFFFFF)
    c1, c2, c3 = hex_rgb(palette[0]), hex_rgb(palette[1]), hex_rgb(palette[2])

    xs = np.linspace(-1.0, 1.0, S, dtype=np.float32)
    X, Y = np.meshgrid(xs, xs)

    g1 = np.exp(-((X + 0.35) ** 2 * 1.4 + (Y + 0.38) ** 2 * 1.4))
    g2 = np.exp(-((X - 0.38) ** 2 * 1.6 + (Y - 0.32) ** 2 * 1.6))
    g3 = np.exp(-(X ** 2 * 2.4 + Y ** 2 * 2.4))

    r = 6 + g1 * c2[0] * 0.42 + g2 * c1[0] * 0.48 + g3 * c3[0] * 0.16
    g = 8 + g1 * c2[1] * 0.42 + g2 * c1[1] * 0.48 + g3 * c3[1] * 0.16
    b = 18 + g1 * c2[2] * 0.42 + g2 * c1[2] * 0.48 + g3 * c3[2] * 0.16

    vig = np.clip(1.0 - 0.42 * (X ** 2 + Y ** 2), 0.35, 1.0)
    grain = rng.normal(0.0, 1.1, (S, S)).astype(np.float32)
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

    def draw_wave(draw, amp, freq, phase, col, width, y_off=0):
        pts = []
        for i in range(100):
            u = i / 99.0
            x = 64 + u * (S - 128)
            taper = math.sin(u * math.pi) ** 1.25
            y = cy + y_off + math.sin(u * math.pi * 2 * freq + phase) * amp * taper
            pts.append((x, y))
        draw.line(pts, fill=col, width=width, joint="curve")

    # Original 10 motifs + 14 new motifs
    if motif == "rings":
        for rad, alpha in [(152, 130), (118, 195), (84, 150)]:
            gd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(*c1, alpha), width=8)
            cd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(*c3, alpha), width=3)
        draw_wave(gd, 58, 1.5, 0.0, (*c2, 220), 14)
        draw_wave(cd, 58, 1.5, 0.0, (255, 249, 240, 240), 5)

    elif motif == "hex":
        for rad, rot, col in [(150, 0.0, c1), (112, math.pi / 6, c2), (72, 0.0, c3)]:
            pts = [(cx + math.cos(rot + k * math.pi / 3) * rad, cy + math.sin(rot + k * math.pi / 3) * rad) for k in range(6)]
            pts.append(pts[0])
            gd.line(pts, fill=(*col, 200), width=10)
            cd.line(pts, fill=(*col, 235), width=3)
        draw_wave(cd, 44, 2.5, 0.3, (255, 252, 245, 230), 4)

    elif motif == "lattice":
        # Crisp interconnected diamond/node precision lattice
        nodes = []
        for row in range(-2, 3):
            for col_i in range(-2, 3):
                if abs(row) + abs(col_i) <= 3:
                    nx = cx + col_i * 64 + (32 if row % 2 else 0)
                    ny = cy + row * 56
                    nodes.append((nx, ny))
        for i, a in enumerate(nodes):
            for b in nodes[i + 1:]:
                dist = math.hypot(a[0] - b[0], a[1] - b[1])
                if 50 < dist < 86:
                    gd.line([a, b], fill=(*c1, 145), width=6)
                    cd.line([a, b], fill=(*c3, 185), width=2)
        for nx, ny in nodes:
            gd.ellipse((nx - 8, ny - 8, nx + 8, ny + 8), fill=(*c2, 220))
            cd.ellipse((nx - 4, ny - 4, nx + 4, ny + 4), fill=(255, 252, 248, 245))

    elif motif == "prism":
        # Refracting luminous crystal triangle + spectral rays
        tri = [(cx, cy - 134), (cx + 132, cy + 96), (cx - 132, cy + 96), (cx, cy - 134)]
        gd.line(tri, fill=(*c1, 215), width=12)
        cd.line(tri, fill=(255, 252, 245, 240), width=3)
        tri2 = [(cx, cy - 82), (cx + 80, cy + 62), (cx - 80, cy + 62), (cx, cy - 82)]
        cd.line(tri2, fill=(*c2, 210), width=2)
        for j, (dy, col) in enumerate([(-26, c1), (0, c3), (26, c2)]):
            gd.line([(cx + 38, cy + 8), (cx + 195, cy + dy * 2.1)], fill=(*col, 195), width=10)
            cd.line([(cx + 38, cy + 8), (cx + 195, cy + dy * 2.1)], fill=(*col, 235), width=3)
        gd.line([(cx - 195, cy + 16), (cx - 46, cy + 8)], fill=(*c3, 210), width=8)
        cd.line([(cx - 195, cy + 16), (cx - 46, cy + 8)], fill=(255, 252, 245, 245), width=3)

    elif motif == "turbine":
        # Kinetic concentric velocity arcs + radiant core
        gd.ellipse((cx - 44, cy - 44, cx + 44, cy + 44), fill=(*c3, 195))
        cd.ellipse((cx - 28, cy - 28, cx + 28, cy + 28), outline=(255, 250, 240, 245), width=3)
        for idx, rad in enumerate((76, 114, 154)):
            for k in range(3):
                a0 = idx * 28 + k * 120
                col = c1 if (idx + k) % 2 == 0 else c2
                gd.arc((cx - rad, cy - rad, cx + rad, cy + rad), a0, a0 + 78, fill=(*col, 210), width=12)
                cd.arc((cx - rad, cy - rad, cx + rad, cy + rad), a0, a0 + 78, fill=(*c3, 235), width=3)

    elif motif == "aurora":
        # Sweeping vertical & diagonal northern-lights ribbons
        for j, (y_off, ph, col) in enumerate([(-64, 0.2, c1), (-16, 1.3, c2), (34, 2.5, c3), (78, 3.6, c1)]):
            draw_wave(gd, 52, 1.15, ph, (*col, 200), 16, y_off=y_off)
            draw_wave(cd, 52, 1.15, ph, (255, 252, 245, 215), 3, y_off=y_off)
        for x_off in (-110, -55, 0, 55, 110):
            gd.line([(cx + x_off, cy - 135), (cx + x_off + 24, cy + 115)], fill=(*c2, 70), width=14)

    elif motif == "solar":
        gd.ellipse((cx - 96, cy - 96, cx + 96, cy + 96), fill=(*c1, 140))
        cd.ellipse((cx - 72, cy - 72, cx + 72, cy + 72), outline=(*c3, 235), width=4)
        for rad in (116, 152):
            gd.arc((cx - rad, cy - rad, cx + rad, cy + rad), 200, 340, fill=(*c2, 200), width=10)
            cd.arc((cx - rad, cy - rad, cx + rad, cy + rad), 200, 340, fill=(*c3, 220), width=3)
        draw_wave(gd, 46, 2.0, 0.0, (*c3, 210), 12, y_off=48)
        draw_wave(cd, 46, 2.0, 0.0, (255, 248, 235, 235), 4, y_off=48)

    elif motif == "diamond":
        # Faceted quartz crystal nested rhombi + precision axis
        for rad, col in [(164, c1), (122, c2), (78, c3), (38, c1)]:
            pts = [(cx, cy - rad), (cx + rad * 0.78, cy), (cx, cy + rad), (cx - rad * 0.78, cy), (cx, cy - rad)]
            gd.line(pts, fill=(*col, 200), width=9)
            cd.line(pts, fill=(*col, 240), width=3)
        cd.line([(cx, cy - 164), (cx, cy + 164)], fill=(255, 252, 248, 140), width=2)
        cd.line([(cx - 128, cy), (cx + 128, cy)], fill=(255, 252, 248, 140), width=2)

    elif motif == "bars":
        n_bars, bw, gap = 15, 10, 14
        total = n_bars * bw + (n_bars - 1) * gap
        x0 = cx - total // 2
        for i in range(n_bars):
            d = abs(i - (n_bars - 1) / 2.0) / ((n_bars - 1) / 2.0)
            h = int(28 + (1.0 - d ** 1.4) * 125 * (0.72 + 0.28 * math.cos(i * 1.1)))
            x = x0 + i * (bw + gap)
            col = c3 if i == n_bars // 2 else (c1 if i % 2 == 0 else c2)
            gd.rounded_rectangle((x - 2, cy - h, x + bw + 2, cy + h), radius=6, fill=(*col, 175))
            cd.rounded_rectangle((x, cy - h, x + bw, cy + h), radius=5, fill=(*col, 235))

    elif motif == "rain":
        gd.rounded_rectangle((116, 86, 396, 426), radius=140, outline=(*c1, 180), width=10)
        cd.rounded_rectangle((116, 86, 396, 426), radius=140, outline=(*c3, 210), width=3)
        for k in range(18):
            rx = int(rng.integers(140, 372))
            ry = int(rng.integers(120, 370))
            rl = int(rng.integers(22, 54))
            col = c3 if k % 3 == 0 else c1
            gd.line([(rx, ry), (rx - 8, ry + rl)], fill=(*col, 170), width=6)
            cd.line([(rx, ry), (rx - 8, ry + rl)], fill=(255, 245, 230, 210), width=2)

    elif motif == "arch":
        # Warm architectural library arches + nested golden chord lines
        for inset, col in [(0, c1), (34, c2), (68, c3)]:
            gd.rounded_rectangle((112 + inset, 88 + inset, 400 - inset, 424 - inset // 2), radius=144 - inset // 2, outline=(*col, 190), width=9)
            cd.rounded_rectangle((112 + inset, 88 + inset, 400 - inset, 424 - inset // 2), radius=144 - inset // 2, outline=(*col, 235), width=3)
        for dy in (-10, 24, 58, 92):
            cd.line([(cx - 88, cy + dy), (cx + 88, cy + dy)], fill=(*c3, 165), width=2)

    elif motif == "sunburst":
        # Sunlit golden atelier rays + warm central halo
        gd.ellipse((cx - 72, cy - 72, cx + 72, cy + 72), fill=(*c1, 165))
        cd.ellipse((cx - 56, cy - 56, cx + 56, cy + 56), outline=(*c3, 240), width=3)
        for k in range(16):
            ang = k * math.pi / 8.0
            r0, r1 = 76, 152 if k % 2 == 0 else 124
            col = c3 if k % 2 == 0 else c2
            p0 = (cx + math.cos(ang) * r0, cy + math.sin(ang) * r0)
            p1 = (cx + math.cos(ang) * r1, cy + math.sin(ang) * r1)
            gd.line([p0, p1], fill=(*col, 185), width=8)
            cd.line([p0, p1], fill=(*col, 235), width=2)

    elif motif == "horizon":
        gd.pieslice((cx - 135, cy - 125, cx + 135, cy + 145), 180, 360, fill=(*c1, 150))
        cd.arc((cx - 135, cy - 125, cx + 135, cy + 145), 180, 360, fill=(*c3, 235), width=4)
        for j, dy in enumerate([16, 42, 70, 102]):
            w = 158 - j * 24
            gd.line([(cx - w, cy + dy), (cx + w, cy + dy)], fill=(*c2, 180 - j * 30), width=8)
            cd.line([(cx - w, cy + dy), (cx + w, cy + dy)], fill=(*c3, 220 - j * 35), width=3)

    elif motif == "botanical":
        # Organic overlapping petal / courtyard arch rings
        for k in range(6):
            ang = k * math.pi / 3.0
            ox, oy = math.cos(ang) * 56, math.sin(ang) * 56
            col = c1 if k % 2 == 0 else c2
            gd.ellipse((cx + ox - 86, cy + oy - 86, cx + ox + 86, cy + oy + 86), outline=(*col, 155), width=8)
            cd.ellipse((cx + ox - 86, cy + oy - 86, cx + ox + 86, cy + oy + 86), outline=(*c3, 200), width=2)
        cd.ellipse((cx - 26, cy - 26, cx + 26, cy + 26), outline=(255, 252, 245, 235), width=3)

    elif motif == "ripples":
        for offset_x, offset_y, col in [(-36, -18, c1), (36, 18, c2), (0, 0, c3)]:
            for rad in (58, 102, 146):
                gd.ellipse((cx + offset_x - rad, cy + offset_y - rad, cx + offset_x + rad, cy + offset_y + rad), outline=(*col, 130), width=6)
                cd.ellipse((cx + offset_x - rad, cy + offset_y - rad, cx + offset_x + rad, cy + offset_y + rad), outline=(*col, 195), width=2)

    elif motif == "silk":
        for dy, ph, col, w in [(-36, 0.0, c2, 14), (0, 0.9, c1, 14), (36, 1.8, c3, 12)]:
            draw_wave(gd, 66, 1.25, ph, (*col, 200), w, y_off=dy)
            draw_wave(cd, 66, 1.25, ph, (255, 248, 242, 220), 4, y_off=dy)

    elif motif == "embers":
        # Cozy glowing hearth rings + rising ember sparks
        for rad, col in [(136, c2), (96, c1), (54, c3)]:
            gd.ellipse((cx - rad, cy + 24 - rad, cx + rad, cy + 24 + rad), outline=(*col, 180), width=10)
            cd.ellipse((cx - rad, cy + 24 - rad, cx + rad, cy + 24 + rad), outline=(*col, 220), width=3)
        for _ in range(28):
            ex = int(rng.integers(120, 392))
            ey = int(rng.integers(90, 360))
            er = int(rng.integers(2, 6))
            col = c3 if rng.random() > 0.45 else c1
            gd.ellipse((ex - er * 2, ey - er * 2, ex + er * 2, ey + er * 2), fill=(*col, 180))
            cd.ellipse((ex - er, ey - er, ex + er, ey + er), fill=(255, 248, 235, 240))

    elif motif == "lagoon":
        # Twilight crescent moon reflection over calm horizontal lagoon ripples
        gd.ellipse((cx - 72, cy - 122, cx + 72, cy + 22), fill=(*c1, 140))
        cd.ellipse((cx - 56, cy - 106, cx + 56, cy + 6), outline=(*c3, 230), width=3)
        for j in range(5):
            dy = 26 + j * 28
            col = c1 if j % 2 == 0 else c2
            draw_wave(gd, 18 - j * 2, 1.4, j * 0.8, (*col, 195), 9, y_off=dy)
            draw_wave(cd, 18 - j * 2, 1.4, j * 0.8, (*c3, 215), 2, y_off=dy)

    elif motif == "tide":
        for j in range(5):
            dy = -72 + j * 36
            col = c1 if j % 2 == 0 else c2
            draw_wave(gd, 32, 1.0, j * 0.75, (*col, 180), 10, y_off=dy)
            draw_wave(cd, 32, 1.0, j * 0.75, (*c3, 205), 3, y_off=dy)

    elif motif == "mandala":
        # Sacred temple singing-bowl geometry (12-fold lotus mandala)
        for rad in (156, 114, 72, 34):
            gd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(*c1, 175), width=8)
            cd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(*c3, 220), width=2)
        for k in range(12):
            ang = k * math.pi / 6.0
            p0 = (cx + math.cos(ang) * 34, cy + math.sin(ang) * 34)
            p1 = (cx + math.cos(ang) * 156, cy + math.sin(ang) * 156)
            col = c2 if k % 2 == 0 else c3
            gd.line([p0, p1], fill=(*col, 145), width=6)
            cd.line([p0, p1], fill=(*col, 205), width=2)

    elif motif == "clouds":
        # Soft floating luminous cloud ellipses + gentle drift arcs
        for ox, oy, rx, ry, col in [
            (-54, -22, 118, 66, c1), (58, -14, 112, 62, c2), (0, 26, 144, 68, c3), (-20, -56, 90, 48, c3)
        ]:
            gd.ellipse((cx + ox - rx, cy + oy - ry, cx + ox + rx, cy + oy + ry), outline=(*col, 165), width=10)
            cd.ellipse((cx + ox - rx, cy + oy - ry, cx + ox + rx, cy + oy + ry), outline=(255, 252, 255, 195), width=2)

    elif motif == "crescent":
        # Starlight crescent moon cradled in orbital rings
        for rad, col in [(158, c2), (124, c1)]:
            gd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(*col, 150), width=7)
            cd.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(*c3, 180), width=2)
        gd.ellipse((cx - 78, cy - 78, cx + 78, cy + 78), fill=(*c1, 195))
        cd.ellipse((cx - 78, cy - 78, cx + 78, cy + 78), fill=(*c3, 235))
        cd.ellipse((cx - 46, cy - 92, cx + 96, cy + 50), fill=(7, 10, 24, 248))

    elif motif == "abyss":
        # Ultra-deep ocean-trench descending concentric echo arcs
        for j, rad in enumerate((48, 86, 124, 162, 198)):
            col = c3 if j == 0 else (c1 if j % 2 == 1 else c2)
            gd.arc((cx - rad, cy - rad - 28, cx + rad, cy + rad - 28), 20, 160, fill=(*col, 200 - j * 25), width=11)
            cd.arc((cx - rad, cy - rad - 28, cx + rad, cy + rad - 28), 20, 160, fill=(*c3, 225 - j * 30), width=3)
        gd.ellipse((cx - 22, cy - 50, cx + 22, cy - 6), fill=(*c3, 210))
        cd.ellipse((cx - 12, cy - 40, cx + 12, cy - 16), fill=(255, 252, 248, 245))

    else:  # eclipse fallback
        gd.ellipse((cx - 122, cy - 122, cx + 122, cy + 122), outline=(*c1, 215), width=18)
        cd.ellipse((cx - 122, cy - 122, cx + 122, cy + 122), outline=(*c3, 235), width=4)
        cd.ellipse((cx - 106, cy - 106, cx + 106, cy + 106), fill=(5, 8, 20, 235))
        cd.arc((cx - 122, cy - 122, cx + 122, cy + 122), 210, 350, fill=(255, 250, 242, 245), width=5)

    # Pinpoint stardust
    for _ in range(38):
        sx, sy = int(rng.integers(24, S - 24)), int(rng.integers(24, S - 24))
        cd.ellipse((sx - 1, sy - 1, sx + 1, sy + 1), fill=(240, 245, 255, int(rng.integers(55, 145))))

    glow = glow.filter(ImageFilter.GaussianBlur(radius=14))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, crisp)

    target_dir = Path(out_dir) if out_dir else (WEB_DIR / "covers")
    target_dir.mkdir(parents=True, exist_ok=True)
    out_path = target_dir / f"{slug}.png"
    img.convert("RGB").save(out_path, format="PNG", optimize=True)
    return out_path


def generate_covers(only_missing: bool = True, slug: str | None = None, out_dir: Path | None = None) -> list[Path]:
    target_dir = Path(out_dir) if out_dir else (WEB_DIR / "covers")
    targets = [get_track(slug)] if slug else TRACKS
    created: list[Path] = []
    for idx, t in enumerate(targets, start=101):
        out_path = target_dir / f"{t['slug']}.png"
        if only_missing and out_path.exists():
            continue
        if t["slug"] == "helix_signature" and out_path.exists():
            continue
        p = render_cover(
            slug=t["slug"],
            palette=t["palette"],
            motif=t["cover_motif"],
            seed=t["render_config"].get("seed", idx),
            out_dir=target_dir,
        )
        created.append(p)
    return created
