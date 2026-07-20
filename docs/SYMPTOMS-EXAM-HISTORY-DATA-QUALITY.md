# Symptoms, Examination & Medical History: data quality issues

**Date:** 2026-07-20
**Backend repo:** `DHSPL-Tatvacare/Pm-Core` (branch `uat`)
**Key file:** `care.helper.ts` (splitFreeText, jsonEntryNames, parseMhSection)

---

## How the data is stored (EMR side)

| Column | Type | What it holds |
|---|---|---|
| `tcm_history_box` | **longblob** | Symptoms entered during consultation |
| `tcm_examination_box` | **longblob** | Examination findings |
| `tcm_history_box_type` | int | Format flag: `0` = plain text/HTML, `1` = JSON listing |
| `tcm_mh_json` | json | Medical history (lifestyle, conditions, family) |

Symptoms and examination are stored in **two formats** depending on how the doctor enters them:

- **Type 0 (free-text):** Plain text or HTML string, e.g. `"Fever since 3 days, headache"`
- **Type 1 (structured listing):** JSON array, e.g. `[{"name":"Fever","severity":"Mild","since":"3 days"},{"name":"Headache","value":"Moderate"}]`

Medical history uses a separate JSON column (`tcm_mh_json`) with section IDs:
- `tmhs_id = 1` : Lifestyle habits
- `tmhs_id = 2` : Medical conditions
- `tmhs_id = 3` : Family history

---

## Issue 1: Severity text appears as symptom names

**What we see on the frontend:**
The "Top symptoms" donut shows entries like `severity -`, `Mild`, `Moderate` as if they are symptom names.

**Root cause in `care.helper.ts`:**

The function `jsonEntryNames()` extracts display names from JSON entries. It pulls from **all** of these fields: `name`, `title`, `value`, `label`, `text`.

```
Entry: {"name": "Fever", "value": "Mild", "severity": "Mild"}
```

`jsonEntryNames()` returns **both** `"Fever"` (from `name`) and `"Mild"` (from `value`), counting them as two separate symptom names. The `value` field here holds severity, not a symptom name.

**How to fix:**

In `jsonEntryNames()`, when `name` or `title` is present, skip the `value`/`label`/`text` fields. Only fall back to `value`/`label`/`text` when no `name` or `title` exists.

```
// Current (broken):
for (const key of ["name", "title", "value", "label", "text"]) {
  if (entry[key]) names.push(entry[key]);
}

// Fixed:
const primary = entry.name || entry.title;
if (primary) {
  names.push(primary);
} else {
  // fallback: try value/label/text
  const fallback = entry.value || entry.label || entry.text;
  if (fallback) names.push(fallback);
}
```

---

## Issue 2: Slashes and garbage in examination findings

**What we see on the frontend:**
The "Top examination findings" donut shows entries like `///`, `//`, `//Fever`, `test1`.

**Root cause:**

Same `splitFreeText()` pipeline as symptoms. Two sub-causes:

1. **Truncation:** The SQL query uses `LEFT(CONVERT(tcm_examination_box USING utf8mb4), 2048)` to cap the blob at 2048 characters. If a JSON array is longer than 2048 chars, it gets cut mid-value, producing broken JSON like `[{"name":"BP normal"},{"name":"Chest cle` which the parser recovers partially, yielding garbage fragments.

2. **Free-text noise:** When `tcm_history_box_type = 0`, the column holds raw text like `"BP - normal / Chest - clear / CVS - S1S2 normal"`. The text splitter breaks on newlines and common delimiters, but medical shorthand with slashes (`/`) produces fragments like `///` or `/CVS`.

**How to fix:**

- **Increase the truncation limit** from 2048 to at least 8192 (or remove it). Most JSON listings are under 4KB. Cutting at 2048 corrupts a significant percentage of entries.
- **In `splitFreeText()`:** After splitting, strip entries that are only punctuation/slashes. The frontend already has a `dropJunk()` filter, but the backend should do the same before ranking so that the counts are accurate.

```
// Add to rankFreeText output filtering:
.filter(name => /[a-zA-Z]/.test(name))  // must contain at least one letter
.filter(name => name.length > 2)         // skip 1-2 char fragments
```

---

## Issue 3: Medical history returns zero data

**What we see on the frontend:**
The History sub-tab (Conditions, Family history, Lifestyle) shows "No data" even with the "Till date" window.

**Root cause in `parseMhSection()`:**

The function parses `tcm_mh_json` by filtering entries with matching `tmhs_id`. The likely issues are:

1. **JSON structure mismatch:** `tcm_mh_json` may store data in a nested format that `parseMhSection()` doesn't expect. The EMR writes history as:
   ```json
   {
     "medicalHistory": [
       {"tmhs_id": 2, "name": "Diabetes", "status": "Yes"},
       {"tmhs_id": 3, "name": "Heart disease", "relation": "Father"}
     ]
   }
   ```
   If the parser expects a flat array but the column wraps it in an object, it will find nothing.

2. **Wrong table reference:** The schema has two history tables:
   - `tbl_consultation_master.tcm_mh_json` (per-consultation snapshot)
   - `tbl_patient_permanent_history.mh_json` (marked "Not Use" in schema comments)
   
   The reporting query may be reading from the wrong table or joining incorrectly.

**How to fix:**

- Log a sample `tcm_mh_json` value from a real consultation row to confirm the actual JSON shape.
- Update `parseMhSection()` to handle both the flat array format and the nested object format.
- Verify the SQL query in `clinic.model.ts` (`medicalHistoryRows`) is joining on the correct table and filtering by the date window properly.

---

## Summary of backend changes needed

| Issue | File | Function | Fix |
|---|---|---|---|
| Severity as symptom names | `care.helper.ts` | `jsonEntryNames()` | Prefer `name`/`title`; skip `value`/`label`/`text` when primary key exists |
| Truncation corruption | `clinic.model.ts` | `historyBoxRows` / `examinationRows` | Increase `LEFT(CONVERT(...), 2048)` to 8192+ |
| Slash/punctuation noise | `care.helper.ts` | `rankFreeText()` | Filter entries with no letters or under 3 chars |
| Medical history empty | `care.helper.ts` | `parseMhSection()` | Handle both flat array and nested object JSON shapes |
| Medical history empty | `clinic.model.ts` | `medicalHistoryRows` | Verify correct table join and date filter |

---

## What the frontend can do (workarounds)

These are stopgap measures until the backend is fixed:

1. **Filter known severity keywords** from the symptoms donut: strip entries matching `Mild`, `Moderate`, `Severe`, `severity -`, etc. before rendering.
2. **Filter slash-only entries** from examination: `dropJunk()` already exists but can be tightened to require at least 3 alphanumeric characters.
3. **Medical history:** No frontend workaround possible. The backend returns empty arrays, so there is nothing to display.
