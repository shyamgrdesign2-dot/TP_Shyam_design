# Dr. Agent — Card Architecture & Anatomy

> How every card is built, what params it needs, and how the rendering pipeline works.
> Written for backend/AI developers who need to generate the right JSON to produce the right card.

---

## The Card Rendering Pipeline

```
Reply Engine produces:  RxAgentOutput (discriminated union)
       ↓
ChatBubble receives:    output object with { kind, data }
       ↓
CardRenderer routes:    switch(output.kind) → correct card component
       ↓
Card component uses:    CardShell wrapper + shared primitives
       ↓
ChatBubble adds:        Feedback row (👍👎 + Source dropdown + optional Completeness donut)
```

### Key Concept: `RxAgentOutput`

This is the core type. Every card is a member of a **discriminated union** — the `kind` field determines which data shape is expected.

```typescript
type RxAgentOutput =
  | { kind: "patient_summary"; data: SmartSummaryData & { hideNarrative?: boolean } }
  | { kind: "ddx"; data: { context: string; options: DDXOption[] } }
  | { kind: "lab_panel"; data: LabPanelData }
  | { kind: "pomr_problem_card"; data: PomrProblemCardData }
  | ... // 63 total kinds
```

**For AI/backend developers:** You produce this JSON. The `kind` determines the card. The `data` must match the exact shape or the card won't render.

---

## The Universal Card Shell

Every full card (except text variants) is wrapped in `CardShell`:

```
┌─────────────────────────────────────────────────────────────┐
│  [Icon] Title                    [Badge] [HeaderExtra] [▼]  │  ← Header row
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Card-specific content (body)                               │  ← Children
│                                                             │
│  [ Pill: Action 1 ]  [ Pill: Action 2 ]                    │  ← Actions (optional)
├─────────────────────── 0.5px divider ───────────────────────┤
│  CTA link text                                          →   │  ← SidebarLink (optional)
└─────────────────────────────────────────────────────────────┘
```

### CardShell Props (What Backend Needs to Know)

| Prop | Type | What it controls |
|------|------|-----------------|
| `icon` | SVG component | Left icon in header |
| `tpIconName` | string | Alternative: TP design system icon name |
| `title` | string | Card title text |
| `date` | string | Date badge (e.g., "12 Mar'26") |
| `badge` | ReactNode | Custom badge (e.g., "13 flagged") |
| `headerExtra` | ReactNode | Slot after badge — used for completeness donut |
| `copyAll` | function | Copy-all button handler |
| `copyAllTooltip` | string | Tooltip text for copy button |
| `collapsible` | boolean | Can the card collapse? |
| `defaultCollapsed` | boolean | Start collapsed? |
| `dataSources` | string[] | Data source labels (legacy) |
| `actions` | ReactNode | Action pill buttons below body |
| `sidebarLink` | ReactNode | CTA at bottom below divider |

---

## Shared Primitives (Building Blocks)

These are the atomic components every card uses:

### InlineDataRow
Horizontal key-value display with optional provenance dots and flags.

```
[Tag Icon] Tag Label:  Key₁: Value₁ ↑  Key₂: Value₂  Key₃: Value₃ ↓
                                    ^green dot           ^amber dot
```

Props: `tag`, `tagIcon`, `values: {key, value, flag?, provenance?}[]`

Used by: GPSummaryCard, LastVisitCard, ObstetricExpandedCard, PomrProblemCard

### InsightBox
Colored callout for AI insights.

```
┌──────────────────────────────────────┐
│ 💡 Clinical insight text here        │  ← Red, Amber, Purple, or Teal variant
└──────────────────────────────────────┘
```

Variants: `red` (critical), `amber` (warning), `purple` (info), `teal` (suggestion)

Used by: LabPanelCard, LabComparisonCard, GPSummaryCard, FollowUpCard

### SectionSummaryBar
Full-width subsection header (e.g. **Medical History**, **Today's Vitals**, **Key Labs**, **Last Visit**, **Recommendations**). **`bg-tp-slate-100/70`**, label and icon **`text-tp-slate-500`**, **`font-semibold`** (14px). Specialty: **`bg-tp-violet-50`** + **`text-tp-violet-600`**.

**Sub-labels inside rows** (not this bar): use the shared export **`SECTION_INLINE_SUBKEY_CLASS`** from `shared/sectionInlineKey.ts` (`text-tp-slate-400 font-semibold`) — applied in `InlineDataRow`, `SbarOverviewCard`, POMR lab lines, pediatric vaccine sub-labels, etc. **V0 and full agent** share these components via `CardRenderer`.

Used by: `SbarOverviewCard`, `GPSummaryCard`, specialty summary cards, and other stacked-section layouts.

### SectionTag
Inline section chip: **`bg-tp-slate-100/70`**, **`text-tp-slate-500`**, **`font-semibold`**; hover **`bg-tp-slate-100`**. Specialty: violet-50 / violet-600. Same chrome as `SectionSummaryBar`.

Used by: PomrProblemCard, SbarCriticalCard, OCR cards, inline tag+value rows

### DataRow
Simple key-value row with optional copy button.

```
Hemoglobin:  8.2 g/dL  ↓  [Copy]
```

Used by: OCRPathologyCard, LabPanelCard

### CheckboxRow / RadioRow
Selection rows with custom-styled inputs.

```
☑ Hypertensive Urgency               (rationale text)
☐ Intracranial hemorrhage             (rationale text)
```

Used by: DDXCard, InvestigationCard, FollowUpQuestionCard

### ChatPillButton
Action button within cards.

```
[ Compare previous ]  [ Suggest investigations ]
```

Slate-50 background, blue text. Triggers a new canned message when tapped.

### CopyIcon
Copy-to-clipboard with Linear→Bulk animation on hover.

### DataCompletenessDonut
18px SVG donut chart — 3 arcs:
- Green = EMR data (verified, structured)
- Amber = AI-extracted data (needs verification)
- Gray = Missing data (not available)

Only used internally by PomrProblemCard in the `headerExtra` slot.

---

## Data Completeness: Where It Shows and Why

### Rule
Only show the completeness donut on cards with a **fixed expected data set** where missing data is clinically meaningful.

### Why NOT on All Cards

| Card type | Why no donut |
|-----------|-------------|
| patient_summary | Displays whatever data is available — no "expected" set |
| lab_panel | Shows flagged labs — whatever exists |
| vitals_trend | Shows available readings — no fixed expectation |
| ddx | AI-generated suggestions — no "missing" concept |
| protocol_meds | Protocol-driven — completeness doesn't apply |
| advice_bundle | Generated text — no data gaps |
| symptom_collector | Patient-reported — no EMR expectation |

### Where It IS Shown

| Card | Why donut makes sense |
|------|----------------------|
| `pomr_problem_card` | CKD expects: Creatinine, GFR, Hb, Ca, PO4, PTH. Missing any = clinically meaningful |
| `sbar_critical` | Emergency summary — shows EMR 70% + AI 20% + Missing 10% |
| `ocr_extraction` | Document extraction — shows AI 90% + Missing 10% |

---

## Data Provenance Indicators

### Provenance Dots (on Lab Values)
- 5px inline circle after value text
- Green (#22c55e) = EMR data — structured, reliable, from lab orders
- Amber (#f59e0b) = AI-extracted — parsed from uploaded documents, needs verification

### When Shown
- Only when `dataProvenance` mapping exists for that specific lab name
- Only on InlineDataRow within PomrProblemCard and GPSummaryCard

### Data Structure
```typescript
dataProvenance: {
  [labName: string]: {
    source: "emr" | "ai_extracted" | "not_available"
    confidence: "high" | "medium" | "low"
    extractedFrom?: string  // e.g., "Lab report PDF (Feb 2026)"
  }
}
```

---

## Source Provenance System

### Architecture
```
ChatBubble renders card
       ↓
getSourcesForOutput(output, documents) called
       ↓
Returns SourceEntry[] based on card kind + actual data
       ↓
SourceDropdown renders as portal (viewport-aware)
       ↓
Click or hover (200ms delay) opens dropdown
```

### SourceEntry Structure
```typescript
interface SourceEntry {
  label: string      // "EMR", "Lab", "Records", "Visit", "Intake", "AI", "Protocol", etc.
  description: string // Short description: "Patient's EMR records"
  date?: string       // Optional date in brackets: "(02 Mar'26)"
}
```

### Source Derivation Per Card Kind
Each card kind has its own source logic. The function inspects the card's actual data to determine sources:

- `patient_summary` → checks keyLabs (count), documents (count), lastVisit (date), symptomCollector (date)
- `pomr_problem_card` → EMR + Lab + Records based on what data the problem card contains
- `ddx` → Context + Protocol (AI-driven)
- `protocol_meds` → Context + Protocol
- `lab_panel` → Lab Results (from EMR)
- `vitals_trend_*` → Vitals data
- `ocr_pathology` → Records (uploaded document)
- `symptom_collector` → Symptom Collector (patient-reported)

---

## Text Variants (No CardShell)

These render as styled inline chat content — no header, no wrapper:

| Kind | Rendering | Structure |
|------|-----------|-----------|
| `text_fact` | Large value + context + source citation | `{ value, context, source }` |
| `text_alert` | Severity-colored left border box | `{ message, severity }` |
| `text_list` | Bulleted list | `{ items: string[] }` |
| `text_step` | Numbered steps with blue left border | `{ steps: string[] }` |
| `text_quote` | Italic blockquote with violet border | `{ quote, source }` |
| `text_comparison` | Two-column grid | `{ labelA, labelB, itemsA, itemsB }` |

---

## Formatting Rules

### Text Formatting in Responses
- **Heading tags**: Used for section titles within text responses — `##` for main sections, `###` for sub-sections
- **Bold**: Key terms, drug names, critical values
- **Italic**: Clinical narratives, patient-reported quotes
- **Bullet points**: Lists of symptoms, medications, advice items
- **Numbered lists**: Step-by-step procedures, investigation sequences

### Copy Functionality
- **Copy-all (header)**: Copies entire card content as formatted text
- **Per-item copy**: Individual copy buttons on hover (protocol meds, advice items, lab values)
- **Per-section copy**: Section-level copy for voice-structured-rx, OCR extraction, last visit
- **Copied feedback**: Brief "Copied" flash animation on the copy icon

### Color System
| Element | Color | Usage |
|---------|-------|-------|
| Critical/High flag | Red (#ef4444) | Abnormal lab values, safety alerts |
| Warning flag | Amber (#f59e0b) | Borderline values, AI-extracted data |
| Normal/Good | Green (#22c55e) | Normal values, EMR-verified data |
| Neutral/Info | Slate (#64748b) | Labels, secondary text, neutral badges |
| Action/Link | Blue (#3b82f6) | Clickable pills, CTAs, sidebar links |
| AI/Insight | Violet/Purple (#8b5cf6) | Narratives, AI insights, insight boxes |

---

## For AI/Backend Developers: Producing Card JSON

### Minimum Required Output
```json
{
  "kind": "patient_summary",
  "data": {
    "specialtyTags": ["General Medicine"],
    "followUpOverdueDays": 0,
    "labFlagCount": 8,
    "patientNarrative": "76-year-old male with CKD Stage 5...",
    "todayVitals": [...],
    "keyLabs": [...],
    "chronicConditions": [...]
  }
}
```

### Rules for Generating Output
1. The `kind` field MUST be one of the 63 defined card kinds
2. The `data` shape MUST match the TypeScript interface for that kind
3. Empty arrays are allowed — the card will hide those sections
4. `undefined` fields are allowed for optional props — the card will suppress those sections
5. Never send empty strings where data is expected — either send real data or omit the field
6. Card will not render if minimum required fields are missing (see card-data-structuring.md)

### Response Wrapping
The reply engine wraps the output in a chat message:
```typescript
{
  role: "assistant",
  content: "Here's Ramesh's clinical summary.",  // Text portion (optional)
  output: { kind: "patient_summary", data: {...} }  // Card portion
}
```

Text streams in real-time. Card JSON is sent as a complete block.
