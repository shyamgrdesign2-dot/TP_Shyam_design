# UX Interaction Patterns

## Overview

This document standardizes the interaction patterns used across all Doctor Agent cards. Every card that requires doctor input must follow one of the patterns below to ensure consistency.

---

## Fill Eligibility Rules (Critical)

- Show **Fill** controls only for content that is newly generated in the current workflow (voice parsing, OCR extraction, patient-reported intake, active Rx drafting).
- Do **not** show Fill controls for already-fetched historical sections (`vitals`, `history`, `obstetric`, `gynec`, `ophthal`, `vaccine`, `growth`, older lab/history snapshots).
- `Last Visit` is the one allowed exception from fetched context: fill into RxPad is allowed as a convenience for current prescription drafting.
- Destination label must be explicit and context-bound:
  - Rx drafting fields → `Fill to RxPad`
  - Historical section targets → `Fill to Vitals`, `Fill to Medical History`, `Fill to Obstetric History`, etc.
- If content is already persisted in the same destination section, hide fill controls to avoid duplicate writes.
- RxPad-only section fills are limited to: `Symptoms`, `Examination`, `Diagnosis`, `Medication`, `Advice`, `Lab Investigation`, `Surgery`, `Additional Notes`, `Follow-up`.
- Historical destinations (`Past Visits`, `Vitals`, `Medical History`, `Ophthal`, `Gynec`, `Obstetric`, `Vaccination`, `Growth`, `Lab Results`) must only expose fill when data is newly provided/generated in-session, not when fetched from records.

---

## Pattern 1: Checkbox Multi-Select + Copy to RxPad

**When to use:** The doctor needs to select multiple items from a list and copy them to the RxPad.

**Used by:** `DDXCard`, `InvestigationCard`

### Behavior
- Each item has a checkbox (custom styled, color-aware)
- Multiple selections allowed
- Selection count shown in CTA: "Copy selected to RxPad (3)"
- When no items selected: "Copy all to RxPad" (or CTA hidden)
- CopyAll header button copies selected items to clipboard (text format)

### Layout
```
┌─ Card Header ─────────────────────── [Copy icon] ─┐
│                                                     │
│  ☑ Item A                          (rationale)      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (0.5px)        │
│  ☐ Item B                          (rationale)      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
│  ☑ Item C                          (rationale)      │
│                                                     │
│  [ Pill: Action 1 ]  [ Pill: Action 2 ]            │
├─────────────────────── 0.5px divider ───────────────┤
│  Copy selected to RxPad (2)                    →    │
└─────────────────────────────────────────────────────┘
```

### Component Pattern
```tsx
<CardShell
  copyAll={() => copySelectedToClipboard()}
  actions={<ChatPillButton ... />}
  sidebarLink={
    <SidebarLink
      text={`Copy selected to RxPad (${count})`}
      onClick={() => onCopyToRxPad?.(selectedItems)}
    />
  }
>
  {items.map((item) => (
    <CheckboxRow ... />
  ))}
</CardShell>
```

---

## Pattern 2: Checkbox Multi-Select + Submit

**When to use:** The agent asks a clarification question with multiple valid answers.

**Used by:** `FollowUpQuestionCard` (when `multiSelect: true`)

### Behavior
- Checkboxes for multi-select
- Submit button in CTA area, disabled until selection made
- Submit sends selected options back to agent
- No copy-to-RxPad (this is a conversational interaction)

### Layout
```
┌─ Question as title ────────────────────────────────┐
│                                                     │
│  ☑ Option A                                         │
│  ☐ Option B                                         │
│  ☑ Option C                                         │
│  ☐ Option D                                         │
│                                                     │
├─────────────────────── 0.5px divider ───────────────┤
│  [ Submit (2) ]                                     │
└─────────────────────────────────────────────────────┘
```

---

## Pattern 3: Radio Single-Select + Submit

**When to use:** The agent asks a question with exactly one valid answer.

**Used by:** `FollowUpQuestionCard` (when `multiSelect: false`), `FollowUpCard`

### Behavior
- Radio buttons for single-select
- Selecting one deselects all others
- Submit/CTA enabled when one option is selected
- For follow-up scheduling: recommended option highlighted

### Layout
```
┌─ Question as title ────────────────────────────────┐
│                                                     │
│  ○ Option A                         (detail text)   │
│  ● Option B                     (recommended) ★     │
│  ○ Option C                         (detail text)   │
│                                                     │
├─────────────────────── 0.5px divider ───────────────┤
│  [ Submit ]                                         │
└─────────────────────────────────────────────────────┘
```

---

## Pattern 4: Copy-to-RxPad (Section-Based)

**When to use:** The card presents structured data that maps directly to RxPad sections.

**Used by:** `LastVisitCard`, `VoiceStructuredRxCard`, `OCRFullExtractionCard`

### Behavior
- Each section has its own copy button (section-level copy)
- "Copy All" in header copies everything to RxPad at once
- No checkboxes needed — the doctor copies entire sections
- Copy destination is predetermined per section (e.g., "Symptoms" → Symptoms section)

### Layout
```
┌─ Card Header ──────────────── [Copy All to RxPad] ─┐
│                                                     │
│  Symptoms                              [Copy icon]  │
│  • Headache (3 days)                                │
│  • Dizziness                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
│  Diagnosis                             [Copy icon]  │
│  • Hypertensive Urgency                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
│  Medication                            [Copy icon]  │
│  • Amlodipine 10mg OD                              │
│                                                     │
│  [ Pill: Edit Rx ]                                  │
├─────────────────────── 0.5px divider ───────────────┤
│  View in sidebar                               →    │
└─────────────────────────────────────────────────────┘
```

### When to Use Instead of Checkboxes
- The data maps 1:1 to RxPad sections (OCR extraction, last visit)
- The doctor typically wants ALL items in a section, not a subset
- Items are structured (not flat lists of alternatives)

---

## Pattern 5: Review-Only with Follow-Up Actions

**When to use:** The card shows data for review; the doctor's next action is handled by pill buttons.

**Used by:** `LabPanelCard`, `LabComparisonCard`, `PatientSummaryCard`, `DrugInteractionCard`, `AllergyConflictCard`

### Behavior
- No checkboxes or radio buttons
- CopyAll copies relevant data to clipboard
- Pills suggest follow-up actions (e.g., "Compare prev", "HbA1c trend")
- SidebarLink navigates to detailed view

### Layout
```
┌─ Card Header ────────────── [Badge] ── [Copy] ─┐
│                                                  │
│  (Data display: grid table, timeline, etc.)      │
│                                                  │
│  💡 AI Insight text                              │
│                                                  │
│  [ Pill: Action 1 ]  [ Pill: Action 2 ]         │
├─────────────────────── 0.5px divider ────────────┤
│  View full report (+14 normal)              →    │
└──────────────────────────────────────────────────┘
```

---

## Pattern 6: Tiered Checkbox Selection

**When to use:** Items are grouped into priority tiers with different visual treatments.

**Used by:** `DDXCard`

### Behavior
- Items grouped by tier (Can't Miss, Most Likely, Extended)
- Each tier has its own accent color for borders and checkboxes
- Selecting items across tiers is allowed
- CTA shows total selected count across all tiers

### Layout
```
┌─ Differential Diagnosis ────────── [Copy] ─┐
│                                              │
│  ┌─ CAN'T MISS (red accent) ─────────────┐ │
│  │ ☑ Hypertensive urgency               │ │
│  │ ☐ Intracranial mass                   │ │
│  └────────────────────────────────────────┘ │
│  ┌─ MOST LIKELY (blue accent) ────────────┐ │
│  │ ☑ Tension headache                    │ │
│  │ ☐ Migraine with aura                 │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [ Generate cascade (2) ]  [ Investigations ]│
├──────────────────── 0.5px divider ───────────┤
│  Copy selected to RxPad (2)             →    │
└──────────────────────────────────────────────┘
```

---

## Pattern 7: Grid Table (Read-Only Data)

**When to use:** Tabular data with columns, rows, and optional flagging.

**Used by:** `LabPanelCard`, `LabComparisonCard`, `VaccinationScheduleCard`, `BillingSummaryCard`, `AnalyticsTableCard`

### Standard Grid Structure
```
┌────────────────────────────────────────────┐
│  Col A     Col B      Col C      Col D     │  ← Header: bg-tp-slate-100, 9px uppercase
├────────────────────────────────────────────┤
│  Value     Value      Value      Value     │  ← Row: 11px, alternating white/slate-50
│  Value     Value      Value      Value     │
│  Value     Value      Value      Value     │  ← Flagged: border-l-[2px] error-300
└────────────────────────────────────────────┘
```

---

## Decision Matrix: Which Pattern to Use

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| Agent needs multiple items selected for RxPad | Pattern 1 (Checkbox + Copy) | Doctor picks what they want |
| Agent asks a clarification question (multi-answer) | Pattern 2 (Checkbox + Submit) | Conversational, not RxPad-bound |
| Agent asks a clarification question (single answer) | Pattern 3 (Radio + Submit) | Mutual exclusion needed |
| Card data maps to RxPad sections | Pattern 4 (Section Copy) | Bulk copy, no per-item selection |
| Data display with follow-up actions | Pattern 5 (Review + Pills) | Read then act |
| Prioritized selection across groups | Pattern 6 (Tiered Checkbox) | Visual hierarchy matters |
| Tabular comparison data | Pattern 7 (Grid Table) | Clean data presentation |

---

## Consistency Rules

1. **CTA placement:** Always in `sidebarLink` prop area, below a 0.5px divider with 10px padding
2. **CTA style:** Secondary outline button — `border-[1.5px] border-tp-blue-500 bg-transparent text-tp-blue-600 rounded-[10px] h-[28px]`
3. **Fill icon:** `Copy` icon from iconsax, `text-tp-blue-500` default, `text-tp-blue-600` hover, Linear→Bulk on hover
4. **Dividers:** 0.5px, `var(--tp-slate-50)` or `var(--tp-slate-100)` for structural
5. **Font weights:** Only `font-semibold` for card title and section tags; `font-medium` for all content
6. **Pill buttons:** Always in `actions` prop area, using `ChatPillButton` component
7. **Selection state:** Always local to the card (`useState<Record<string, boolean>>`)
8. **Disabled CTA:** Use `disabled:border-tp-slate-200 disabled:text-tp-slate-400` when no selection
