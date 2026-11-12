"""Lil Token's dance face: the rapper face wearing a red tarboush, always grinning.

Builds two runtime avatar sets for the firmware's load_avatar_set (layered
mode, 14 frames of 160x120 RGB565 little-endian, in the firmware's order:
faces idle, happy, thinking, sad, surprised, embarrassed; eyes open, half,
closed; mouths closed, half, open, e, u):

  party.rgb565    every frame wears the tarboush; all six face slots use the
                  happy (grinning) face, so any expression while dancing smiles
  default.rgb565  the normal face, to swap back after the dance

Source frames come from ~/.stackchan/avatar/*.png (make_face.py).
Run: python3 make_party.py   (writes next to this script, plus party_preview.png)
"""

from pathlib import Path

from PIL import Image, ImageDraw

SRC = Path(__file__).parent / "frames"
OUT = Path(__file__).parent
ORDER = (
    ["idle", "happy", "thinking", "sad", "surprised", "embarrassed"]
    + ["eyes_open", "eyes_half", "eyes_closed"]
    + ["mouth_closed", "mouth_half", "mouth_open", "mouth_e", "mouth_u"]
)
S = 4  # supersample

FEZ_RED = (190, 22, 34)
FEZ_DARK = (128, 10, 20)
FEZ_SHINE = (232, 70, 72)
TASSEL = (20, 20, 22)
TASSEL_GOLD = (242, 193, 78)


def tarboush(size=(320, 240)) -> Image.Image:
    """Transparent overlay: a slightly tilted fez sitting above the shades."""
    w, h = size
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def p(*xy):
        return [v * S for v in xy]

    # Truncated cone: wide brim above the shades, narrower flat top.
    body = [(104, 64), (216, 64), (200, 10), (120, 10)]
    d.polygon([(x * S, y * S) for x, y in body], fill=FEZ_RED)
    # Shading stripe on the right, shine on the left.
    d.polygon([(x * S, y * S) for x, y in [(186, 64), (216, 64), (200, 10), (180, 10)]], fill=FEZ_DARK)
    d.polygon([(x * S, y * S) for x, y in [(116, 60), (128, 60), (134, 14), (126, 14)]], fill=FEZ_SHINE)
    # Brim band and flat top.
    d.rounded_rectangle(p(100, 58, 220, 70), radius=5 * S, fill=FEZ_DARK)
    d.ellipse(p(118, 3, 202, 17), fill=FEZ_DARK)
    d.ellipse(p(121, 5, 199, 15), fill=FEZ_RED)
    # Tassel: button on top, cord swinging over to the right side.
    d.ellipse(p(155, 4, 165, 12), fill=TASSEL)
    d.line(p(160, 8, 196, 22, 214, 44), fill=TASSEL, width=3 * S, joint="curve")
    d.polygon([(x * S, y * S) for x, y in [(206, 42), (222, 42), (226, 64), (202, 64)]], fill=TASSEL)
    for x in (207, 211, 215, 219, 223):
        d.line(p(x, 48, x + 1, 64), fill=(52, 52, 56), width=S)
    d.rounded_rectangle(p(205, 40, 223, 46), radius=2 * S, fill=TASSEL_GOLD)

    im = im.rotate(-7, resample=Image.BICUBIC, center=(160 * S, 60 * S))
    return im.resize((w, h), Image.LANCZOS)


def rgb565_le(im: Image.Image) -> bytes:
    im = im.convert("RGB").resize((160, 120), Image.LANCZOS)
    out = bytearray()
    for r, g, b in im.getdata():
        v = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
        out += bytes((v & 0xFF, v >> 8))
    return bytes(out)


def main() -> None:
    frames = {name: Image.open(SRC / f"{name}.png").convert("RGB") for name in ORDER}
    hat = tarboush(frames["idle"].size)

    party, default = bytearray(), bytearray()
    previews = []
    for i, name in enumerate(ORDER):
        base = frames["happy"] if i < 6 else frames[name]
        dressed = base.copy()
        dressed.paste(hat, (0, 0), hat)
        party += rgb565_le(dressed)
        default += rgb565_le(frames[name])
        if name in ("idle", "eyes_closed", "mouth_open"):
            previews.append(dressed)

    (OUT / "party.rgb565").write_bytes(party)
    (OUT / "default.rgb565").write_bytes(default)
    sheet = Image.new("RGB", (320 * len(previews) + 10 * (len(previews) - 1), 240), (255, 255, 255))
    for i, im in enumerate(previews):
        sheet.paste(im, (i * 330, 0))
    sheet.save(OUT / "party_preview.png")
    print(f"party {len(party)} bytes, default {len(default)} bytes")


if __name__ == "__main__":
    main()
