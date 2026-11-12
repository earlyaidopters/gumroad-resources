"""Lil Token's research face: the normal face with the official Firecrawl
flame above the shades (the owner wants the logo only, no name), shown while it searches the
web with Firecrawl and while it says what it found.

Brand files in brand/: firecrawl-logo.svg (flame, #FA5D19, from
firecrawl.dev/logo.svg) and firecrawl-wordmark.svg (from the firecrawl.dev
header logo, recoloured white for the dark face). Same 14-frame layered
format as make_party.py. Run: python3 make_research.py
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from make_party import ORDER, SRC, rgb565_le

OUT = Path(__file__).parent
BRAND = OUT / "brand"
S = 4


def render_svg(svg: Path, height: int) -> Image.Image:
    with tempfile.TemporaryDirectory() as tmp:
        png = Path(tmp) / "out.png"
        subprocess.run(["rsvg-convert", "-h", str(height), str(svg), "-o", str(png)], check=True)
        return Image.open(png).convert("RGBA")


# name: (svg in brand/, height in screen px, top y). Firecrawl for web
# research, the Google G (wikimedia Google_"G"_logo.svg) for Gmail/Calendar.
BADGES = {
    "research": ("firecrawl-logo.svg", 54, 8),
    "google": ("google-g.svg", 46, 12),
    # Composio's own white mark (composio.dev/logos/composio-white.svg), shown
    # while it works in one of the owner's other apps.
    "composio": ("composio-white.svg", 48, 10),
}


def lockup(size=(320, 240), badge: str = "research") -> Image.Image:
    """The badge logo alone, centred above the shades (no wordmark)."""
    w, h = size
    svg, height, top = BADGES[badge]
    flame = render_svg(BRAND / svg, height * S)
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    im.paste(flame, ((w * S - flame.width) // 2, top * S), flame)
    return im.resize((w, h), Image.LANCZOS)


def main(name: str = "research") -> None:
    frames = {n: Image.open(SRC / f"{n}.png").convert("RGB") for n in ORDER}
    badge = lockup(frames["idle"].size, name)
    out, previews = bytearray(), []
    for frame_name in ORDER:
        dressed = frames[frame_name].copy()
        dressed.paste(badge, (0, 0), badge)
        out += rgb565_le(dressed)
        if frame_name in ("thinking", "eyes_half", "mouth_open"):
            previews.append(dressed)
    (OUT / f"{name}.rgb565").write_bytes(out)
    sheet = Image.new("RGB", (320 * len(previews) + 10 * (len(previews) - 1), 240), (255, 255, 255))
    for i, im in enumerate(previews):
        sheet.paste(im, (i * 330, 0))
    sheet.save(OUT / f"{name}_preview.png")
    print(f"{name} {len(out)} bytes")


if __name__ == "__main__":
    import sys
    for n in sys.argv[1:] or ["research"]:
        main(n)
