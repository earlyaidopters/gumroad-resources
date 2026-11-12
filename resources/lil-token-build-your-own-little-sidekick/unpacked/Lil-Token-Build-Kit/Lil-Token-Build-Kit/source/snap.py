"""Save Lil Token's current LCD contents as a PNG: python snap.py out.png"""
import base64, json, subprocess, sys
from pathlib import Path
from PIL import Image

py = sys.executable
out = subprocess.run([py, str(Path(__file__).with_name("tok.py")), "screen_snapshot"], capture_output=True, text=True)
d = json.loads(out.stdout)
raw = base64.b64decode(d["data"])
img = Image.new("RGB", (d["w"], d["h"]))
px = img.load()
for i in range(d["w"] * d["h"]):
    v = raw[2 * i] | (raw[2 * i + 1] << 8)
    r, g, b = (v >> 11) & 31, (v >> 5) & 63, v & 31
    px[i % d["w"], i // d["w"]] = (r * 255 // 31, g * 255 // 63, b * 255 // 31)
img = img.resize((d["w"] * 2, d["h"] * 2), Image.NEAREST)
img.save(sys.argv[1] if len(sys.argv) > 1 else "snap.png")
print("saved", d["w"], d["h"])
