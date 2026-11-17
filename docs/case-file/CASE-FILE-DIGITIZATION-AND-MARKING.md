# Case File: how digitization and page marking work, and how to check them

17 Nov 2026. For the developers who build the extraction service, the viewer and its checks.

When a doctor clicks a citation (`[54]`) next to a value, the original scanned page opens and the exact words the value was read from are boxed in amber. This document explains how that works end to end, and how to prove each value and each box is right. The data shape itself is in `CASE-FILE-DATA-SCHEMA.md`.

Everything here was run on one real patient folder: six PDFs, 275 pages, 202 facts, 791 citations.

## 1. The pipeline at a glance

```
PDFs of one patient
  │ 1. Pages      split every PDF into page images, numbered across the whole folder
  ▼
manifest.json   page number -> image file, size
  │ 2. Read       extract facts page by page; each fact names the line it came from
  ▼
facts           { title, detail, verbatim, cite: { page, rid }, also: [...], confidence }
  │ 3. Locate     find each cited line on its image: a box [x, y, w, h]
  ▼
regions.json    { page: { rid: [x, y, w, h] } }
  │ 4. Store      turn facts into Rx pad rows with _source
  ▼
export JSON     diagnosis, medications, ..., hospital_course
  │ 5. Check      automatic checks, then a person looks
  ▼
viewer          citation -> page -> amber box on the words
```

## 2. Pages: one numbering for the whole folder

A patient folder is many PDFs. They are read as one file, in order, and every page gets a global page number:

| File | Pages | Global pages |
|---|---|---|
| ICU monitoring chart | 4 | 1 to 4 |
| Emergency records (two visits) | 27 | 5 to 31 |
| HIV counselling and consent | 1 | 32 |
| Consultation records | 19 | 33 to 51 |
| Nursing file of the orthopaedic stay | 90 | 52 to 141 |
| Inpatient case file of the orthopaedic stay | 134 | 142 to 275 |

Global page = the file's offset + the page number inside that PDF. Every citation uses the global number, so `[54]` on screen and `page: 164` in the data always mean one page.

Each page is rendered to an image (`pdftoppm -r 100 -jpeg`, about 827 x 1169 px) and listed in `manifest.json`:

```json
{
  "pages": 275,
  "image": "pages/{n}.jpg",
  "pad": 3,
  "map": { "1": 1, "2": 2, "164": 164 },
  "sizes": { "164": [827, 1169] },
  "files": [ { "id": "F6", "name": "...pdf", "pages": 134, "from": 142, "to": 275 } ]
}
```

`map` takes a data page to its image. Image sizes are listed so the viewer can lay out every page before the images load, which keeps a box from jumping.

## 3. Reading: every fact names its line

The reader (a person or the extraction model, following one written spec) goes page by page and writes facts. The rules that make marking possible:

- Every fact has `cite: { page, rid }`. `rid` (region id) names the line on that page and always starts with the page: `p164-final-dx`, `p166-course`, `p259-abg`.
- Every `rid` used is also listed in `lines`, with the label printed on the page and the text of the line:
  ```json
  { "page": 164, "rid": "p164-final-dx", "label": "Diagnosis", "text": "Closed left neck of femur fracture", "hand": false }
  ```
  `label` and `text` are what step 4 looks for on the image. `hand: true` says the line is handwritten.
- `verbatim` is the words exactly as on the page, mistakes included. It is what the reviewer compares against the box.
- The same fact on another page is one fact with that page in `also`, not a second fact.
- Typed pages use the PDF's text layer (`pdftotext -layout`). Handwritten pages, tables and thin text are read from the image.

## 4. Locating: from a line to a box on the image

Script: `scripts/case-file/locate_regions.py`, with `scripts/case-file/ocr_page.sh`.

1. OCR every page image with Tesseract into word boxes: `tesseract <page>.jpg <out> --psm 11 tsv`. Each word comes with its left, top, width, height and a confidence. Words under 30% confidence are dropped.
2. Group words into text lines by vertical overlap (forms have several columns, so a line is matched within its own row).
3. For each `rid`, take the words of its printed `label` (or of its typed `text` when there is no label), drop stop words and anything in brackets (the reader's own asides are not on the page), and look for a run of them on one line. A word matches when it is the same or one letter apart (OCR misreads).
4. Accept a box only when it is certain:
   - at least 60% of the label's words are found in one run;
   - a one-word label must be five letters or more;
   - the same match must not appear elsewhere on the page. If it does, the region is left out instead of guessed.
5. Grow the box from the label to cover the written value: to the right up to the next printed word or 45% of the page width, and a little above and below for handwriting.
6. Save it as fractions of the image, so it holds at any zoom: `[x, y, width, height]`, all between 0 and 1.

Lines OCR cannot place (mostly handwriting, ticked checkboxes, tables without labels) are placed by a person on a gridded copy of the page (`scripts/case-file/grid_overlay.py <scan folder> <page> <out.jpg>` draws a numbered 5% grid). In production the extraction service returns the box with each fact, because it already knows where it read the words.

A region with no box is not an error: the viewer then outlines the whole cited page and says "cited on this page". A wrong box is worse than no box.

## 5. The viewer: how a citation lands on the words

Code: `SourcePageViewer.jsx` (`useLocalScan`, the `.scanHit` box) and `ArchivedRecords.module.scss` (`.scanHit`).

1. On open it loads `manifest.json` and `regions.json`.
2. A citation `(page, rid)` maps the data page to its image through `manifest.map`.
3. It looks up `regions[page][rid]`. If found, an absolutely positioned box is drawn over the image at `left: x%, top: y%, width: w%, height: h%`, with an amber fill (multiply blend, so the ink stays readable) and an amber outline that pulses once.
4. It scrolls the page strip so the box is in the middle of the view. The page label reads "cited words marked".
5. With no box, the page gets an amber outline and the label reads "cited on this page".

Because the box is in fractions of the image, zooming the page (five steps) never moves it off the words.

## 6. How to check it is right

Run these for every folder before it is shown to a doctor.

### 6a. Automatic checks

```bash
node scripts/case-file/check_case_file.mjs docs/case-file/case-file-example.json public/case-file-local
```

Hard rules (the script exits with 1 if any fails):

| Rule | Why |
|---|---|
| Every row has `_source.page`, `region` and `asWritten` | A value with no page cannot be checked |
| `region` starts with `p<page>-` | Catches a fact cited to the wrong page |
| The page has an image in the manifest | The citation must open something |
| Every box lies inside its page (0 to 1) | Catches a box computed on the wrong image size |
| Every hospital course has text, and written text has its page | The course is shown as written |

To look at (printed, not failing):

| Finding | What to do |
|---|---|
| No box for a region | Place it on the grid, or accept the page outline |
| Confidence under 0.7 | The row must be verified by a reviewer before it counts |
| A number in a stored value is not in its words as written | Usually an earlier reading of a lab series (see 6d); otherwise the value is wrong |
| A stay's course comes from rows | The file has no written course; confirm nothing was missed |

Results on this folder: 165 stored rows, 165 with a marked box, 0 hard failures, 38 to look at (3 low-confidence medicines, the rest earlier readings of lab series). Across all 791 citations (including the `also` pages), 778 have a box and 13 fall back to the page outline.

### 6b. Box placement, by eye

Make a contact sheet (`scripts/case-file/contact_sheet.py`): each placed box drawn on a crop of its page, with the label and value it should cover written above it. A person goes through it and rejects any box that is not on its words. Check every box on handwritten pages and a random sample of typed ones. Rejected boxes are removed (the page outline is used) or redrawn on the grid.

### 6c. Values against the page, by a reviewer

This is the review workspace (`/dev/archived-records`): every row has Verify, Edit and Remove. Clicking its citation opens the page with the box. The reviewer reads the box, not the row. A changed row keeps the first reading in `_source.readAs`, so the correction can be audited. Until verified, rows show the "Not verified" tag.

### 6d. Known gaps

- Lab series: each earlier reading of a test (for example potassium 3.5 on 5 Nov, before 3.3 on 7 Nov) is stored as its own row, but its `_source` points at the latest reading's page. Each reading needs its own `page` and `region`.
- 13 of 791 citations have no box: lines in checklists, score tables and margin notes that OCR cannot anchor. They fall back to the page outline.
- Handwritten values are boxed by their printed label. Where a form has no printed label next to the writing, the box must come from the extraction service.

## 7. Where the files are

| File | What |
|---|---|
| `public/case-file-local/manifest.json` | Page images of the folder |
| `public/case-file-local/regions.json` | Boxes, per page and region |
| `public/case-file-local/pages/NNN.jpg` | The page images |
| `src/components/archived-records/mock/archivedRecordsMock.local.js` | The facts of this folder, with citations |
| `docs/case-file/case-file-example.json` | The stored JSON of this folder |
| `scripts/case-file/` | OCR, locate, grid and check scripts |
