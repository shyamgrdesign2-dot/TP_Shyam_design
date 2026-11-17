"""A scan page with a faint numbered grid (percent of width / height), so a region can be read off by eye. Local only."""
import json, sys
from PIL import Image, ImageDraw
LOCAL, page, out = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(f"{LOCAL}/manifest.json"))
im = Image.open(f"{LOCAL}/pages/{str(m['map'][page]).zfill(3)}.jpg").convert("RGB"); W, H = im.size
d = ImageDraw.Draw(im, "RGBA")
for p in range(0, 101, 5):
    strong = p % 10 == 0
    col = (220, 0, 120, 130 if strong else 60)
    x = int(W * p / 100); y = int(H * p / 100)
    d.line([(x, 0), (x, H)], fill=col, width=1); d.line([(0, y), (W, y)], fill=col, width=1)
    if strong:
        d.rectangle([x + 1, 1, x + 20, 12], fill=(255, 255, 255, 220)); d.text((x + 2, 1), str(p), fill=(200, 0, 100, 255))
        d.rectangle([1, y + 1, 20, y + 12], fill=(255, 255, 255, 220)); d.text((2, y + 1), str(p), fill=(200, 0, 100, 255))
im.save(out)
