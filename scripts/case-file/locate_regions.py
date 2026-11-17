"""Find where each cited region sits on its scanned page.

Input: the regions' printed labels and written values (rids.json, from the
local sample), the scan manifest, and tesseract word positions per scan page.
Output: regions.json = { dataPage: { rid: [x, y, w, h] } } as fractions of the
page image, only for regions found with confidence. A region that cannot be
placed for sure is left out: the viewer then shows the page as before, which
is better than pointing at the wrong line.
"""
import csv, json, re, sys, collections
from PIL import Image
S, LOCAL = sys.argv[1], sys.argv[2]
manifest = json.load(open(f"{LOCAL}/manifest.json"))
rids = json.load(open(f"{S}/rids.json"))
STOP = set("the and for with from this that are was were not has have had been its his her per any all each into over under than then also only left right page line note notes written column second first third fourth".split())
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
def tokens(text):
    text = re.sub(r"\([^)]*\)", " ", text)  # my own asides in brackets are not on the page
    return [t for t in (norm(w) for w in re.split(r"[\s/:,;.\-]+", text)) if len(t) >= 3 and t not in STOP]
def close(a, b):
    if a == b: return True
    if min(len(a), len(b)) < 5 or abs(len(a) - len(b)) > 1: return False
    # one edit apart
    if len(a) == len(b): return sum(x != y for x, y in zip(a, b)) == 1
    s, l = (a, b) if len(a) < len(b) else (b, a)
    return any(l[:i] + l[i+1:] == s for i in range(len(l)))

def words_of(scan):
    out = []
    with open(f"{S}/{str(scan).zfill(3)}.tsv") as f:
        for row in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            if row["level"] != "5": continue
            t = norm(row["text"])
            if len(t) < 2 or float(row["conf"]) < 30: continue
            out.append(dict(t=t, x=int(row["left"]), y=int(row["top"]), w=int(row["width"]), h=int(row["height"])))
    return out

def lines_of(words):
    """Words that share a text line, by vertical overlap (forms have several columns)."""
    lines = []
    for w in sorted(words, key=lambda w: (w["y"] + w["h"] / 2, w["x"])):
        cy = w["y"] + w["h"] / 2
        for line in lines:
            if abs(line["cy"] - cy) <= max(6, 0.6 * w["h"]):
                line["words"].append(w); break
        else:
            lines.append(dict(cy=cy, words=[w]))
    for line in lines: line["words"].sort(key=lambda w: w["x"])
    return lines

stats = collections.Counter(); regions = {}; report = []
for page, items in rids.items():
    scan = manifest["map"].get(page)
    if not scan: continue
    words = words_of(scan); lines = lines_of(words)
    W, H = Image.open(f"{LOCAL}/pages/{str(scan).zfill(3)}.jpg").size
    for item in items:
        label = tokens(item["k"]); value = [] if item["hand"] else tokens(item["v"])[:8]
        want = label or value
        if not want: stats["no words to look for"] += 1; continue
        best = []
        for line in lines:
            # the label's words, in a run on one line (a label does not span columns)
            ws = line["words"]
            for i, w in enumerate(ws):
                if not any(close(w["t"], t) for t in want): continue
                run = [w]; got = {next(t for t in want if close(w["t"], t))}
                for nxt in ws[i+1:]:
                    if nxt["x"] - (run[-1]["x"] + run[-1]["w"]) > 3.5 * max(nxt["h"], run[-1]["h"]): break
                    hit = next((t for t in want if close(nxt["t"], t)), None)
                    if hit: run.append(nxt); got.add(hit)
                best.append((len(got), -len(run), run))
        if not best: stats["label not found by OCR"] += 1; report.append((page, item["rid"], "not found")); continue
        best.sort(key=lambda b: (-b[0], b[1]))
        top = best[0]; need = max(1, -(-len(set(want)) * 6 // 10))
        if top[0] < need or (len(set(want)) == 1 and len(want[0]) < 5):
            stats["too few label words matched"] += 1; report.append((page, item["rid"], "weak")); continue
        # the same label somewhere else on the page with as good a match: cannot tell which
        rivals = [b for b in best[1:] if b[0] == top[0] and abs(b[2][0]["y"] - top[2][0]["y"]) > 2 * top[2][0]["h"]]
        if rivals: stats["label appears more than once"] += 1; report.append((page, item["rid"], "ambiguous")); continue
        run = top[2]
        x1 = min(w["x"] for w in run); y1 = min(w["y"] for w in run)
        x2 = max(w["x"] + w["w"] for w in run); y2 = max(w["y"] + w["h"] for w in run)
        h = y2 - y1
        # the written value follows its label: to the right, up to the next printed word far along the line
        line = next(l for l in lines if run[0] in l["words"])
        after = [w for w in line["words"] if w["x"] > x2 + 0.18 * W]
        reach = min(after[0]["x"] - 6 if after else W * 0.97, x2 + 0.45 * W)
        x1, y1, x2, y2 = max(0, x1 - 6), max(0, y1 - 0.5 * h - 3), min(W, max(x2 + 8, reach)), min(H, y2 + 0.9 * h + 4)
        regions.setdefault(page, {})[item["rid"]] = [round(x1 / W, 4), round(y1 / H, 4), round((x2 - x1) / W, 4), round((y2 - y1) / H, 4)]
        stats["placed"] += 1
json.dump(regions, open(f"{S}/regions.json", "w"))
json.dump(report, open(f"{S}/unplaced.json", "w"))
print(dict(stats), "of", sum(len(v) for v in rids.values()))
