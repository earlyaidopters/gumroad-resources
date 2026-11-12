"""Lil Token's wardrobe: one look per kind of music.

Each look is a runtime face set (layered mode, 14 frames of 160x120 RGB565,
same order as make_party.py) drawn as an overlay on the normal face. The
tarboush set for Arabic music is party.rgb565 from make_party.py.

  hiphop      snapback worn sideways and a gold chain
  classical   powdered wig, eyes closed
  electronic  DJ headphones, grinning
  rock        red bandana, grinning
  jazz        black beret
  ambient     soft headphones, eyes closed

Source frames come from ~/.stackchan/avatar/*.png (make_face.py).
Run: python3 make_wardrobe.py   (writes <look>.rgb565 and wardrobe_preview.png)

It also writes overlays/<name>.overlay for firmware 19, which draws one small
picture on top of whatever face is showing: 160x120 RGB565 followed by a
160x120 alpha plane, 57,600 bytes, a tenth of a face set. The hats above, the
tarboush, and the Firecrawl and Google badges all exist as overlays.
"""

from pathlib import Path

from PIL import Image, ImageDraw

from make_party import ORDER, SRC, rgb565_le

OUT = Path(__file__).parent
S = 4
GOLD, GOLD_DARK = (242, 193, 78), (176, 128, 30)


def canvas():
    im = Image.new("RGBA", (320 * S, 240 * S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def p(*xy):
    return [v * S for v in xy]


def poly(pts):
    return [(x * S, y * S) for x, y in pts]


def finish(im, angle=0, centre=(160, 60)):
    if angle:
        im = im.rotate(angle, resample=Image.BICUBIC, center=(centre[0] * S, centre[1] * S))
    return im.resize((320, 240), Image.LANCZOS)


def snapback():
    im, d = canvas()
    crown, dark, brim = (44, 82, 210), (26, 50, 150), (226, 40, 52)
    d.pieslice(p(100, 6, 220, 122), 180, 360, fill=crown)           # dome
    d.pieslice(p(160, 6, 220, 122), 270, 360, fill=dark)            # shaded side
    d.rounded_rectangle(p(98, 56, 222, 68), radius=4 * S, fill=dark)
    d.polygon(poly([(196, 54), (268, 44), (274, 58), (204, 70)]), fill=brim)   # flat brim, off to the side
    d.polygon(poly([(204, 66), (274, 56), (274, 60), (206, 71)]), fill=(140, 16, 28))
    d.rounded_rectangle(p(138, 24, 182, 50), radius=6 * S, fill=GOLD)          # front patch
    d.rounded_rectangle(p(143, 29, 177, 45), radius=4 * S, fill=crown)
    d.ellipse(p(155, 2, 165, 12), fill=dark)                                   # button
    hat = finish(im, angle=6)
    chain, d2 = canvas()
    d2.arc(p(96, 150, 224, 232), 20, 160, fill=GOLD, width=5 * S)              # chain
    d2.arc(p(96, 153, 224, 235), 20, 160, fill=GOLD_DARK, width=2 * S)
    d2.rounded_rectangle(p(148, 222, 172, 240), radius=3 * S, fill=GOLD)       # pendant
    d2.rounded_rectangle(p(153, 226, 167, 236), radius=2 * S, fill=GOLD_DARK)
    hat.alpha_composite(finish(chain))
    return hat


def wig():
    im, d = canvas()
    white, shade, line = (236, 234, 226), (196, 194, 188), (150, 148, 144)
    d.ellipse(p(52, -8, 268, 74), fill=white)                                   # top
    for x, y in ((30, 56), (22, 90), (28, 124), (256, 56), (264, 90), (258, 124)):   # side rolls, clear of the shades
        d.ellipse(p(x, y, x + 34, y + 30), fill=white, outline=line, width=S)
        d.arc(p(x + 7, y + 6, x + 27, y + 24), 30, 300, fill=shade, width=2 * S)
    for x in (86, 116, 146, 176, 206):                                          # curls across the top
        d.arc(p(x, 18, x + 26, 46), 180, 360, fill=shade, width=2 * S)
    d.arc(p(52, -8, 268, 74), 200, 340, fill=line, width=S)
    d.rounded_rectangle(p(150, 60, 170, 70), radius=3 * S, fill=(40, 40, 52))   # black bow knot
    d.polygon(poly([(150, 65), (136, 58), (136, 72)]), fill=(40, 40, 52))
    d.polygon(poly([(170, 65), (184, 58), (184, 72)]), fill=(40, 40, 52))
    return finish(im)


def headphones(band, cup, glow):
    im, d = canvas()
    d.arc(p(46, 8, 274, 190), 196, 344, fill=band, width=9 * S)                 # band over the head
    d.arc(p(52, 14, 268, 190), 200, 340, fill=glow, width=2 * S)
    for x in (30, 252):                                                         # ear cups
        d.rounded_rectangle(p(x, 78, x + 38, 138), radius=12 * S, fill=cup)
        d.rounded_rectangle(p(x + 7, 88, x + 31, 128), radius=8 * S, fill=band)
        d.ellipse(p(x + 13, 100, x + 25, 116), fill=glow)
    return finish(im)


def bandana():
    im, d = canvas()
    red, dark, dot = (206, 30, 40), (140, 14, 24), (250, 240, 236)
    d.polygon(poly([(70, 40), (250, 34), (254, 60), (68, 66)]), fill=red)       # band across the forehead
    d.polygon(poly([(70, 60), (254, 54), (254, 60), (68, 66)]), fill=dark)
    for x in range(86, 244, 22):
        d.ellipse(p(x, 44, x + 6, 50), fill=dot)
    d.ellipse(p(246, 36, 268, 58), fill=dark)                                   # knot
    d.polygon(poly([(262, 44), (300, 30), (296, 52)]), fill=red)                # tails
    d.polygon(poly([(262, 50), (298, 62), (286, 78)]), fill=dark)
    return finish(im, angle=-3)


def beret():
    im, d = canvas()
    black, shade = (150, 30, 52), (196, 60, 84)
    d.ellipse(p(84, 4, 252, 70), fill=black)                                    # slouched body
    d.ellipse(p(150, 8, 246, 50), fill=shade)
    d.ellipse(p(156, 12, 240, 48), fill=black)
    d.rounded_rectangle(p(98, 54, 222, 68), radius=6 * S, fill=shade)           # band
    d.line(p(166, 6, 172, -4), fill=black, width=4 * S)                         # stalk
    return finish(im, angle=-10)


LOOKS = {
    # name: (overlay, frame used for the six face slots, or None to keep each expression)
    "hiphop": (snapback, None),
    "classical": (wig, "eyes_closed"),
    "electronic": (lambda: headphones((36, 38, 56), (20, 22, 36), (0, 220, 255)), "happy"),
    "rock": (bandana, "happy"),
    "jazz": (beret, None),
    "ambient": (lambda: headphones((70, 62, 110), (48, 42, 84), (190, 160, 255)), "eyes_closed"),
}


def overlay_bytes(im: Image.Image) -> bytes:
    """RGBA picture -> the firmware's overlay format."""
    im = im.convert("RGBA").resize((160, 120), Image.LANCZOS)
    colour, alpha = bytearray(), bytearray()
    for r, g, b, a in im.getdata():
        v = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
        colour += bytes((v & 0xFF, v >> 8))
        alpha.append(a)
    return bytes(colour + alpha)


def write_overlays() -> None:
    from make_party import tarboush
    from make_research import lockup

    folder = OUT / "overlays"
    folder.mkdir(exist_ok=True)
    pictures = {name: draw() for name, (draw, _) in LOOKS.items()}
    pictures["party"] = tarboush()
    pictures["research"] = lockup(badge="research")
    pictures["google"] = lockup(badge="google")
    pictures["composio"] = lockup(badge="composio")
    for name, im in pictures.items():
        (folder / f"{name}.overlay").write_bytes(overlay_bytes(im))
    print(f"overlays: {', '.join(sorted(pictures))}")


def main() -> None:
    write_overlays()
    frames = {name: Image.open(SRC / f"{name}.png").convert("RGBA") for name in ORDER}
    previews = []
    for look, (draw, face) in LOOKS.items():
        overlay = draw()
        data = bytearray()
        for i, name in enumerate(ORDER):
            base = frames[face] if (face and i < 6) else frames[name]
            dressed = base.copy()
            dressed.alpha_composite(overlay)
            data += rgb565_le(dressed)
            if i == 0:
                previews.append(dressed.convert("RGB"))
        (OUT / f"{look}.rgb565").write_bytes(data)
        print(f"{look}: {len(data)} bytes")
    sheet = Image.new("RGB", (330 * len(previews) - 10, 240), (255, 255, 255))
    for i, im in enumerate(previews):
        sheet.paste(im, (i * 330, 0))
    sheet.save(OUT / "wardrobe_preview.png")


if __name__ == "__main__":
    main()
