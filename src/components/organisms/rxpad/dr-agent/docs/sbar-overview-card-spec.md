# SBAR Overview Card — Complete Specification

## 1. What is SBAR?

SBAR (Situation, Background, Assessment, Recommendation) is a structured communication framework used in healthcare for concise patient handoffs. It ensures critical information is conveyed in a predictable, scannable order during shift changes, referrals, and pre-consult preparation.

The SBAR Overview Card applies this ontology to the Dr. Agent patient summary — the **first card** a doctor sees when opening a consultation.

---

## 2. Card Kind

`sbar_overview` — reuses `SmartSummaryData` (no new data interface needed).

```typescript
| { kind: "sbar_overview"; data: SmartSummaryData }
```

---

## 3. How the Patient Short Summary (Situation) is Generated

The **Situation** line is the most important part of the SBAR card — a 1-2 sentence clinical snapshot that gives the doctor immediate context. The generation follows a strict fallback chain:

### Generation Algorithm

```
Priority 1: data.patientNarrative (matches tooltip on appointment queue — preferred)
  ↓ if empty
Priority 2: data.sbarSituation (fallback, pre-written SBAR)
  ↓ if empty
Priority 3: Computed via buildSituationLine() from data fields
  ↓ if empty
Priority 4: symptomCollectorData.symptoms (top 3 symptoms with duration)
  ↓ if empty
Priority 5: lastVisit.symptoms + lastVisit.date
  ↓ if empty
Priority 6: "New patient — no prior clinical data available."
```

**Why `patientNarrative` is preferred:** The `patientNarrative` is the same text shown in the appointment queue tooltip (`AiPatientTooltip`). Using it as the primary Situation source ensures the doctor sees a consistent summary across both the queue hover preview and the SBAR card inside the consultation. This alignment reduces cognitive friction when transitioning from queue to consult.

### Priority 1 — `patientNarrative` (Tooltip-aligned)

When available, `patientNarrative` provides a pre-generated clinical summary that matches the appointment queue tooltip. It is truncated to 2 sentences / ~200 characters for the SBAR Situation line (the full narrative is available in GPSummaryCard).

### Priority 2 — `sbarSituation` (Pre-written)

When available, this is a clinician-quality summary written by the AI during patient intake or by the referring doctor. It follows the format:

> `[Age][Sex], [chief complaint + duration]. Known [conditions + duration]. [Key vitals if abnormal]. Working Dx: [diagnosis].`

Example: *"25M, 3-day fever with evening spikes, dry cough, bilateral conjunctivitis. Known Diabetes 1yr + Hypertension 6mo. BP 70/60, SpO₂ 93%, Temp 104°F. Working Dx: Viral fever, conjunctivitis."*

**Abbreviation expansion**: All medical abbreviations (DM, HTN, CKD, COPD, etc.) are expanded to their full form via `expandAbbreviation()`. This ensures readability for doctors across specialties and avoids ambiguity.

**Why this format**: Mirrors how doctors verbally hand off patients — age/sex, chief complaint, relevant history, concerning values, working diagnosis. All in one scan.

### Priority 3 — `buildSituationLine()` (Computed)

When neither `patientNarrative` nor `sbarSituation` is available, the Situation line is computed from structured data fields (chronic conditions, symptoms, vitals, last visit) via `buildSituationLine()`.

### Priority 4 — Symptom Collector Fallback

When the patient filled the intake form but no narrative was generated:
- Take top 3 symptoms from `symptomCollectorData.symptoms`
- Format: `"Presenting with [Symptom1] ([duration]), [Symptom2] ([duration])."`

### Priority 5 — Last Visit Fallback

For returning patients without current intake:
- Format: `"[symptoms from last visit]. Last seen [date]."`

### Priority 6 — Empty State

`"New patient — no prior clinical data available."`

### Display

- Violet left-bordered italic block (same style as GPSummaryCard narrative)
- Key clinical terms highlighted via `highlightClinicalText()`
- Wrapped in quotation marks for visual distinction

---

## 4. UI Card Generation — Section-by-Section Logic

### Section Layout

```
CardShell (title: "Patient Summary", icon: stethoscope)
│
├── S — Situation
│   └── Violet-bordered italic narrative block (1-2 sentences)
│
├── B — Medical History (SectionSummaryBar + ● list per subsection)
│   ├── Chronic: item | item (colon + pipe; formatWithHierarchy)
│   ├── Allergies: …
│   ├── Lifestyle / Family history / Surgical / Other when present
│   └── Vertical gap10px between pointer rows (same as Recommendations)
│
├── A — Today's Vitals (InlineDataRow with flag colors)
├── A — Key Labs (InlineDataRow with ↑/↓ indicators, max 4)
│
├── Last Visit (SectionSummaryBar + one-liner)
│
└── R — Recommendations (SectionSummaryBar + ● bullet pointers, 10px row gap)
    └── Severity-colored left-bordered items
```

---

### S — Situation (Narrative Snapshot)

| Attribute | Value |
|---|---|
| Source | `patientNarrative` (preferred) → `sbarSituation` → `buildSituationLine(data)` — see §3 above |
| Style | `rounded-[8px] bg-tp-slate-50 border-l-[3px] border-tp-violet-300` |
| Text | `text-[12px] italic leading-[1.7] text-tp-slate-500` |
| Max length | ~200 characters / 2 sentences |
| Empty state | "New patient — no prior clinical data available." |

**Why violet border**: Consistent with GPSummaryCard narrative styling. Violet is the AI brand color, signaling this is an AI-generated summary. Italic distinguishes narrative from structured data below.

---

### B — Medical History (SBAR Background)

**Heading:** `SectionSummaryBar` **"Medical History"** — standard bar chrome (`bg-tp-slate-100/70`, `text-tp-slate-500`, semibold).

**Layout:** One **● pointer row per populated subsection** (same bullet treatment as Recommendations). **`gap-[10px]`** between rows. Each row: **`Category:`** uses **`SECTION_INLINE_SUBKEY_CLASS`** (`shared/sectionInlineKey.ts`) + items joined by **` | `** with `formatWithHierarchy()` (primary `tp-slate-700`, parentheticals `tp-slate-400`). Same card code path for **V0 and full agent**.

#### Subsections (when data exists)

| Sub-category | Data Field | Row label |
|---|---|---|
| Chronic | `chronicConditions` | `Chronic:` |
| Allergies | `allergies` | `Allergies:` |
| Lifestyle | `lifestyleNotes` | `Lifestyle:` |
| Family history | `familyHistory` | `Family history:` |
| Surgical history | `surgicalHistory` | `Surgical history:` |
| Other | `additionalHistory` | `Other:` |

**Formatting — Color Hierarchy** (body only; section bar stays light):

- Each item uses `formatWithHierarchy()` — bracket detail stays **`text-tp-slate-400`**; same token family as subsection labels for consistency.
- **No** `InlineDataRow` for this block — comma splitting would break parenthetical commas inside conditions.

**Empty state**: Section hidden if no subsections have data.

**Note:** Full GP summary cards may still surface medications in separate rows; the SBAR overview card focuses on history lines above Assessment (vitals/labs).

---

### A — Today's Vitals

| Attribute | Value |
|---|---|
| Component | `InlineDataRow` |
| Source | `data.todayVitals` |
| Tag | `"Today's Vitals"` with icon (12px) |
| Vital order | BP → Pulse → SpO₂ → Temp → Weight → RR |
| Flag logic | `parseVitalFlag(key, raw)` — per-vital thresholds |

**Flag color logic** (`parseVitalFlag`):

| Vital | High | Low | Normal |
|---|---|---|---|
| BP | Systolic ≥ 140 | Systolic ≤ 90 | 91-139 |
| SpO₂ | — | Any abnormal | ≥ 95% |
| Temp | Any abnormal | — | 97-99°F |
| BMI | > 30 | < 18.5 | 18.5-30 |
| Others | > threshold | < threshold | Within range |

**Why flag colors**: Abnormal vitals need immediate visual attention. Red flags (high/low) draw the doctor's eye to values that may need intervention, without requiring them to mentally compare against reference ranges.

**Empty state**: Section hidden if no vitals recorded today.

---

### A — Key Labs

| Attribute | Value |
|---|---|
| Component | `InlineDataRow` |
| Source | `data.keyLabs` (max 4) |
| Tag | `"Key Labs"` with icon (12px) |
| Value format | `↑8.1 %` or `↓18 ng/mL` |
| Flag | Same as vital flags — `high`/`low` map to error colors |

**Why max 4**: More than 4 lab values overwhelm the summary. The full lab panel is accessible via the "Key Labs" tag click → sidebar navigation.

**Why ↑/↓ prefixes**: Universal medical shorthand for above/below reference range. Faster to scan than color alone.

**Empty state**: Section hidden if no labs available.

---

### Last Visit

| Attribute | Value |
|---|---|
| Source | `data.lastVisit` |
| Format | `[date] | Sx: [top 2 symptoms] | Dx: [diagnosis] | Rx: [shortened medication]` (pipe dividers with `mx-[6px]`, not `·`) |
| Style | `SectionTag` + inline text at `text-[14px] leading-[1.7]` |

**Color hierarchy** (same pattern as Medical History body lines):
- Date → `font-medium text-tp-slate-700` (dark, prominent)
- Labels (`Sx:`, `Dx:`, `Rx:`) → `text-tp-slate-400` (lighter, de-emphasized)
- Symptoms → `text-tp-slate-700` (normal weight)
- Diagnosis → `font-medium text-tp-slate-700` (dark, important clinical data)
- Medication → `text-tp-slate-700` (normal weight, shortened via `splitRespectingParens` + `shortenMedication`)
- Pipe separators (`|`) → `text-tp-slate-200` with `mx-[6px]` spacing

**Why include**: Continuity of care — the doctor needs to know what happened last time (symptoms, diagnosis, and what was prescribed) to understand the current visit in context.

**Symptom shortening**: `"Fever (2d, high, evening spikes)"` → `"Fever (2d)"` — only the duration is clinically relevant in a summary context.
**Medication shortening**: `"Telma 20mg (Twice daily | Before food)"` → `"Telma 20mg"` — only the drug name and dosage are shown in the summary.

**Empty state**: Section hidden if no last visit data.

---

### R — Recommendations (Concise Action Items)

The Recommendations section uses a `SectionTag` heading followed by simple bullet points. The design principle is **less is more** — only surface what the doctor needs to act on right now.

#### What gets shown (and what doesn't)

| Shown | NOT shown (by design) |
|---|---|
| Follow-up overdue | Individual abnormal lab values (already visible in Key Labs with ↑/↓ flags) |
| Critical vitals (life-threatening only) | Missing data fields (belongs in completeness card) |
| Due clinical alerts (max 2) | Non-critical warnings |
| Critical cross-problem flags (max 1) | Medication suggestions (belongs in DDX/protocol cards) |

#### Generation Logic

| Priority | Type | Trigger Condition | Example |
|---|---|---|---|
| 1 | Follow-up overdue | `followUpOverdueDays > 0` | "Follow-up overdue by 5 days" |
| 2 | Critical vitals | BP ≤90 or ≥160, SpO₂ <92, Temp ≥104 | "BP critically low at 70/60 — assess for hypotension" |
| 3 | Due alerts | `dueAlerts` present (max 2) | "HbA1c recheck (quarterly)" |
| 4 | Critical cross-problem | `crossProblemFlags` with severity "critical" (max 1) | "Metformin contraindicated in CKD stage 3" |

#### Critical Vital Thresholds

Only life-threatening values generate recommendations. Mildly abnormal vitals are already flagged with colors in the Vitals row — repeating them as recommendations creates noise.

| Vital | Threshold |
|---|---|
| BP (systolic) | ≤ 90 (hypotension) or ≥ 160 (urgency) |
| SpO₂ | < 92% |
| Temperature | ≥ 104°F |

#### Visual Style

Bullet list under the **"Recommendations"** `SectionSummaryBar` (same bar chrome as other sections):
- Bullet: `●` in `text-tp-slate-400`
- **Row spacing:** `gap-[10px]` between list items (matches Medical History subsection list)
- Text: `text-tp-slate-600` at `14px` / `leading-[1.5]` — **no `line-clamp`**; each bullet shows **full text**
- Long source lines are **split** at `;`, em-dash clauses, comma-grouped phrases (~88 chars per chunk), or word boundaries into **extra bullets** — **no ellipsis truncation** (`…`). Up to **12** display bullets after split; up to **6** raw source lines collected.
- `highlightRecommendation`: critical / electrolyte / acidosis phrases (`text-tp-error-600`); labs, vitals, `K+`, bicarb, `PD`, numeric values (`font-semibold text-tp-slate-700`)
- No colored cards, no severity boxes — clean and scannable

**Why no severity cards**: The previous version used colored left-border cards for each recommendation. This was visually heavy and made the recommendation section look like an alert wall. Doctors respond better to a concise list they can scan in 5 seconds.

**Why strict filtering**: Alert fatigue is a real clinical problem. If every abnormal value generates a recommendation, doctors learn to ignore the section. By only surfacing truly critical items, every bullet point earns attention.

**Empty state**: Entire Recommendations section hidden if no recommendations are generated.

---

## 5. Graceful Degradation (Permutations)

| State | Visible Sections |
|---|---|
| P1 — New patient, no history | Situation only ("New patient...") |
| P2 — Returning, no intake | Situation, Medical History, Vitals, Labs, Last Visit, Recommendations |
| P3 — Returning with intake | All sections (richest state) |
| P4 — Limited history | Situation + whatever data is available |

**Rule**: Each section is hidden entirely if its data source is empty. No placeholder "—" values. No empty rows.

---

## 6. Dr. Agent Intro — Patient Context & Clinical Review

### WelcomeScreen Canned Actions (RxPad)

The WelcomeScreen shows 4 quick action cards. In RxPad (patient consultation context), the actions are **dynamic** — they change based on what data is available for the patient.

#### Selection Logic

| Condition | Action 1 | Action 2 | Action 3 | Action 4 |
|---|---|---|---|---|
| Patient has pre-visit intake | **Pre-visit Intake** | Patient Summary | Suggest Diagnosis | Investigations |
| Returning patient, no intake | **Patient Summary** | Suggest Diagnosis | Drug Interactions | Investigations |
| New patient | **Patient Summary** | Suggest Diagnosis | Investigations | Drug Interactions |

**Why this order**:
- **With intake**: The pre-visit intake is the freshest, most relevant data — the patient literally just reported symptoms, history, and questions. The doctor should review this first before seeing the AI-generated summary.
- **Without intake**: The SBAR patient summary gives the best starting context for a returning patient. Drug interactions are prioritized over investigations because existing medications are more immediately relevant.
- **New patient**: Patient summary shows empty state gracefully. Diagnosis and investigations help start the clinical reasoning process.

#### Criteria for Each Action

| Action | Trigger Message | When Shown | Why |
|---|---|---|---|
| Pre-visit Intake | `"Show pre-visit intake"` | Patient has `symptomCollectorData` | Most recent patient-reported data — review before anything else. Pill label: "Pre-visit intake" (not "Review intake data") |
| Patient Summary | `"Patient summary"` | Always available | SBAR overview is the universal starting point |
| Suggest Diagnosis | `"Suggest DDX based on current symptoms"` | Always available | Core clinical decision support |
| Investigations | `"Suggest investigations for this patient"` | Always available | Actionable next step |
| Drug Interactions | `"Check drug interactions for current medications"` | Patient has medications | Safety check for polypharmacy |

### No Auto-Generated Messages

In RxPad mode, no messages are pre-loaded. The WelcomeScreen handles the first-time experience. When the doctor clicks a canned action, **only that response appears** — no auto-generated pre-intake or summary cards.

**Why**: The doctor should control what they see. Auto-generating cards before the doctor asks creates noise and takes away agency. The welcome screen's canned actions guide the doctor to the right starting point.

### Other Page Contexts

| Context | Actions | Notes |
|---|---|---|
| Homepage | Follow-up Dues, Weekly KPIs, Today's Collection, Chronic Conditions | Clinic-wide operational focus |
| Patient Detail | Patient Summary, Vital Trends, Lab Results, Last Visit | Read-only review focus |
| Billing | Today's Billing, Revenue Trends, Pending Dues, Generate Invoice | Financial operations |

---

## 7. Trigger Keywords

| User Query | Card Returned |
|---|---|
| "patient summary", "summary", "snapshot" | `sbar_overview` |
| "sbar", "s-bar", "handoff" | `sbar_overview` |
| Pre-consult prep | `sbar_overview` |
| "detailed summary" pill | `patient_summary` (GPSummaryCard — unchanged) |

---

## 7. Comparison: SBAR Overview vs GPSummaryCard

| Aspect | SBAR Overview | GPSummaryCard |
|---|---|---|
| Purpose | Quick structured handoff | Comprehensive detail view |
| Narrative | 1-2 sentences max | Full 5-6 line narrative |
| Medical History | ● subsection rows (colon + pipe items) | GP summary may use different InlineDataRow layout |
| Sections | Flat list with SBAR ordering | Grouped with specialty embeds |
| Recommendations | Smart bullet pointers with severity | Due alerts as inline list |
| Specialty | No specialty adaptation | Full specialty overlays |
| Trigger | Default "summary" query | "Detailed summary" pill |
| Target scan time | ~30 seconds | ~2 minutes |

---

## 8. Files

| File | Purpose |
|---|---|
| `cards/summary/SbarOverviewCard.tsx` | Main component |
| `types.ts` | `{ kind: "sbar_overview"; data: SmartSummaryData }` |
| `cards/CardRenderer.tsx` | `case "sbar_overview"` |
| `engines/reply-engine.ts` | Summary/sbar keyword handlers |
| `CardCatalogLive.tsx` | Demo entry in Summary family |
| `docs/sbar-overview-card-spec.md` | This specification |
