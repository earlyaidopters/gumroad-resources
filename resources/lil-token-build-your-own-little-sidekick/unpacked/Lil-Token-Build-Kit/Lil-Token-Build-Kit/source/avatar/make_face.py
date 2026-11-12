"""Draw Lil Token's rapper face as the 14 full-frame PNGs the stackchan-mcp firmware expects.

Every frame is the whole face at 320x240. Expressions are complete faces; the
eye and mouth frames are the idle face with only that part changed, so blinks
and lip sync swap frames without anything else moving. The firmware stores
frames at 160x120 and scales them up, so shapes stay bold and simple.

Run: python3 make_face.py [out_dir]   (default ~/.stackchan/avatar)
Also writes contact_sheet.png next to this script.
"""

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 320, 240
S = 4  # supersample factor for smooth edges

BG = (18, 18, 24)
GOLD = (242, 193, 78)
GOLD_DARK = (176, 128, 30)
LENS = (40, 40, 52)
SHINE = (245, 245, 250)
WHITE = (240, 240, 245)
CORAL = (232, 96, 60)
SKY = (110, 190, 255)

# Shades geometry (in 320x240 space)
LEFT_LENS = (62, 72, 148, 128)
RIGHT_LENS = (172, 72, 258, 128)
MOUTH_C = (160, 178)


def canvas():
    im = Image.new("RGB", (W * S, H * S), BG)
    return im, ImageDraw.Draw(im)


def sc(*vals):
    return [v * S for v in vals]


def shades(d, eye="open", tilt=0.0, slide=0):
    """Gold-rimmed shades with white eye shapes inside the lenses."""
    for i, (x0, y0, x1, y1) in enumerate((LEFT_LENS, RIGHT_LENS)):
        dy = slide + (tilt if i == 0 else -tilt)
        box = sc(x0, y0 + dy, x1, y1 + dy)
        d.rounded_rectangle(box, radius=18 * S, fill=LENS, outline=GOLD, width=6 * S)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + dy
        if eye == "open":
            d.ellipse(sc(cx - 13, cy - 15, cx + 13, cy + 15), fill=SHINE)
        elif eye == "half":
            d.rounded_rectangle(sc(cx - 15, cy - 5, cx + 15, cy + 7), radius=6 * S, fill=SHINE)
        elif eye == "closed":
            d.rounded_rectangle(sc(cx - 17, cy - 2, cx + 17, cy + 3), radius=3 * S, fill=SHINE)
        elif eye == "happy":
            d.arc(sc(cx - 16, cy - 8, cx + 16, cy + 18), start=200, end=340, fill=SHINE, width=6 * S)
        elif eye == "small":
            d.ellipse(sc(cx - 7, cy - 6, cx + 7, cy + 8), fill=SHINE)
        elif eye == "wide":
            d.ellipse(sc(cx - 17, cy - 19, cx + 17, cy + 19), fill=SHINE)
    # bridge
    by = 92 + slide
    d.line(sc(148, by, 172, by), fill=GOLD, width=6 * S)


def grill(d, x0, y0, x1, y1):
    """Gold teeth bar with tooth separators."""
    d.rounded_rectangle(sc(x0, y0, x1, y1), radius=4 * S, fill=GOLD)
    n = 5
    for k in range(1, n):
        x = x0 + (x1 - x0) * k / n
        d.line(sc(x, y0 + 2, x, y1 - 2), fill=GOLD_DARK, width=2 * S)


def mouth(d, shape="smirk"):
    cx, cy = MOUTH_C
    if shape == "smirk":  # idle and mouth_closed
        d.arc(sc(cx - 34, cy - 30, cx + 26, cy + 8), start=20, end=150, fill=WHITE, width=6 * S)
        d.line(sc(cx + 22, cy + 2, cx + 34, cy - 6), fill=WHITE, width=6 * S)
    elif shape == "half":
        d.rounded_rectangle(sc(cx - 26, cy - 8, cx + 26, cy + 12), radius=10 * S, fill=WHITE)
        grill(d, cx - 22, cy - 6, cx + 22, cy + 2)
    elif shape == "open":
        d.rounded_rectangle(sc(cx - 30, cy - 14, cx + 30, cy + 22), radius=16 * S, fill=WHITE)
        d.rounded_rectangle(sc(cx - 24, cy - 2, cx + 24, cy + 18), radius=10 * S, fill=CORAL)
        grill(d, cx - 26, cy - 12, cx + 26, cy - 2)
    elif shape == "e":
        d.rounded_rectangle(sc(cx - 36, cy - 8, cx + 36, cy + 10), radius=9 * S, fill=WHITE)
        grill(d, cx - 32, cy - 6, cx + 32, cy + 4)
    elif shape == "u":
        d.ellipse(sc(cx - 14, cy - 12, cx + 14, cy + 16), fill=WHITE)
        d.ellipse(sc(cx - 7, cy - 4, cx + 7, cy + 9), fill=CORAL)
    elif shape == "grin":
        d.chord(sc(cx - 44, cy - 34, cx + 44, cy + 26), start=0, end=180, fill=WHITE)
        grill(d, cx - 38, cy - 4, cx + 38, cy + 8)
    elif shape == "flat":
        d.line(sc(cx - 18, cy + 2, cx + 26, cy - 4), fill=WHITE, width=6 * S)
    elif shape == "frown":
        d.arc(sc(cx - 30, cy - 2, cx + 30, cy + 34), start=200, end=340, fill=WHITE, width=6 * S)
    elif shape == "o":
        d.ellipse(sc(cx - 18, cy - 18, cx + 18, cy + 22), fill=WHITE)
        d.ellipse(sc(cx - 11, cy - 10, cx + 11, cy + 14), fill=CORAL)
    elif shape == "wavy":
        pts = [(cx - 30 + i * 4, cy + 4 * math.sin(i * 0.9)) for i in range(16)]
        d.line([v * S for p in pts for v in p], fill=WHITE, width=5 * S, joint="curve")


def token_coin(d, x, y, r=26):
    d.ellipse(sc(x - r, y - r, x + r, y + r), fill=GOLD, outline=GOLD_DARK, width=4 * S)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Black.ttf", int(r * 1.3) * S)
    except OSError:
        font = ImageFont.load_default()
    d.text((x * S, y * S + 2 * S), "T", fill=GOLD_DARK, font=font, anchor="mm")


def blush(d):
    for x in (70, 250):
        d.ellipse(sc(x - 22, 140, x + 22, 152), fill=CORAL)


def sweat(d):
    d.polygon(sc(282, 40, 272, 62, 292, 62), fill=SKY)
    d.ellipse(sc(271, 54, 293, 74), fill=SKY)


def finish(im):
    return im.resize((W, H), Image.LANCZOS)


def frame(eye="open", mouth_shape="smirk", tilt=0.0, slide=0, extra=None):
    im, d = canvas()
    shades(d, eye=eye, tilt=tilt, slide=slide)
    mouth(d, mouth_shape)
    if extra:
        extra(d)
    return finish(im)


FRAMES = {
    # expressions
    "idle": lambda: frame(),
    "happy": lambda: frame(eye="happy", mouth_shape="grin"),
    "thinking": lambda: frame(eye="half", mouth_shape="flat", tilt=-4, extra=lambda d: token_coin(d, 282, 42)),
    "sad": lambda: frame(eye="small", mouth_shape="frown", tilt=5, slide=8),
    "surprised": lambda: frame(eye="wide", mouth_shape="o", slide=-10),
    "embarrassed": lambda: frame(eye="half", mouth_shape="wavy", extra=lambda d: (blush(d), sweat(d))),
    # blink frames (idle face, eyes changed)
    "eyes_open": lambda: frame(eye="open"),
    "eyes_half": lambda: frame(eye="half"),
    "eyes_closed": lambda: frame(eye="closed"),
    # lip-sync frames (idle face, mouth changed)
    "mouth_closed": lambda: frame(mouth_shape="smirk"),
    "mouth_half": lambda: frame(mouth_shape="half"),
    "mouth_open": lambda: frame(mouth_shape="open"),
    "mouth_e": lambda: frame(mouth_shape="e"),
    "mouth_u": lambda: frame(mouth_shape="u"),
}


def main():
    out = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path(__file__).parent / "frames"
    out.mkdir(parents=True, exist_ok=True)
    images = {}
    for name, make in FRAMES.items():
        images[name] = make()
        images[name].save(out / f"{name}.png")

    # Contact sheet at device resolution (160x120 upscaled back, like the firmware)
    cols, pad = 5, 8
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGB", (cols * (W + pad) + pad, rows * (H + 28 + pad) + pad), (230, 230, 230))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(images.items()):
        dev = im.resize((160, 120), Image.LANCZOS).resize((W, H), Image.BILINEAR)
        x = pad + (i % cols) * (W + pad)
        y = pad + (i // cols) * (H + 28 + pad)
        sheet.paste(dev, (x, y))
        d.text((x + 4, y + H + 6), name, fill=(20, 20, 20))
    sheet_path = Path(__file__).with_name("contact_sheet.png")
    sheet.save(sheet_path)
    print(f"wrote {len(images)} frames to {out} and {sheet_path}")


if __name__ == "__main__":
    main()
