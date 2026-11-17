"""Contact sheet of placed regions, to check by eye that each box sits on its label. Local only."""
import json, random, sys
from PIL import Image, ImageDraw
S, LOCAL, out, n, seed = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
m = json.load(open(f"{LOCAL}/manifest.json")); reg = json.load(open(f"{S}/regions.json")); rids = json.load(open(f"{S}/rids.json"))
only = sys.argv[6].split(",") if len(sys.argv) > 6 else None
allr = [(p, r) for p, v in reg.items() for r in v if not only or r in only]
random.Random(seed).shuffle(allr)
tiles = []
for p, r in allr[:n]:
    im = Image.open(f"{LOCAL}/pages/{str(m['map'][p]).zfill(3)}.jpg").convert("RGB"); W, H = im.size
    x, y, w, h = reg[p][r]; box = [x * W, y * H, (x + w) * W, (y + h) * H]
    d = ImageDraw.Draw(im); d.rectangle(box, outline=(230, 120, 0), width=3)
    pad = 40; crop = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(W, box[2] + pad), min(H, box[3] + pad)))
    crop.thumbnail((520, 146))
    it = next(i for i in rids[p] if i["rid"] == r)
    tile = Image.new("RGB", (540, 180), "white"); tile.paste(crop, (10, 30)); dd = ImageDraw.Draw(tile)
    dd.text((10, 2), f"{r}: {it['k'][:60]}", fill=(0, 0, 0)); dd.text((10, 15), f"expects: {it['v'][:80]}", fill=(0, 90, 160))
    tiles.append(tile)
cols = 2; rows = -(-len(tiles) // cols)
sheet = Image.new("RGB", (540 * cols, 180 * rows), "white")
for i, t in enumerate(tiles): sheet.paste(t, (540 * (i % cols), 180 * (i // cols)))
sheet.save(out)
