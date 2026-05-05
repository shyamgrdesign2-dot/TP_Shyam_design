# Dr. Agent V0 — Simplified Variant Specification

## What is V0?

V0 is a **simplified, summary-only variant** of Dr. Agent. It provides the same core patient context intelligence (summaries, history, vitals) but strips away all advanced clinical action features (DDX, protocol meds, drug interactions, investigations, etc.).

V0 is designed for clinics and doctors who need a lightweight AI co-pilot focused purely on **context surfacing** — no clinical decision support, no action cards.

---

## Entry Points

V0 is accessible from the same entry points as the full variant, with one exception:

| Entry Point | V0 Behavior |
|-------------|-------------|
| **RxPad Panel** | V0 agent panel (summary-only experience) |
| **Patient Details Page** | V0 agent panel via FAB button |
| **Homepage** | Uses **full panel** (not V0) — operational features are always available |

---

## Component Architecture

- **Component**: `DrAgentPanelV0` — standalone panel, separate from the full `DrAgentPanel`
- **Mode toggle**: `useV0Mode()` hook — persists in localStorage, syncs across pages via custom events
- **Patient search**: Own patient search within the V0 panel
- **Canned actions**: Same smart priority system as full variant (4-card selection from 5 candidates)
- **Scroll-aware floating chip**: Patient context chip floats at top when scrolled
- **PatientSelector**: Shared bottom sheet component (radio-button selection, circular avatars, gender/age/phone metadata)

---

## Allowed Card Types

V0 renders only these 10 card kinds (defined in `V0_ALLOWED_KINDS`):

| Card Kind | Description |
|-----------|-------------|
| `sbar_overview` | SBAR clinical overview card |
| `patient_summary` | Patient summary snapshot |
| `symptom_collector` | Pre-visit intake data from patient |
| `last_visit` | Past visit summaries — any specific visit by date |
| `obstetric_summary` | Obstetric specialty summary |
| `gynec_summary` | Gynecology specialty summary |
| `pediatric_summary` | Pediatric specialty summary |
| `ophthal_summary` | Ophthalmology specialty summary |

| `vitals_summary` | Today's vitals table |
| `medical_history` | Medical history (expanded) |

---

## What's Excluded in V0

### UI Elements Not Shown

| Element | Present in Full | Present in V0 |
|---------|----------------|---------------|
| Gradient PillBar (above input) | Yes (all pills) | Yes (summary pills only) |
| SidebarPillBar (secondary sidebar) | Yes | No |
| RxPad AiTriggerChips (Suggest DDX, etc.) | Yes | No |
| Inline suggestion chips (below messages) | Yes | No |

### Card Types Not Available

All clinical action and advanced cards are excluded:

- `ddx` — Differential diagnosis
- `protocol_meds` — Protocol medications
- `investigation_bundle` — Investigation suggestions
- `drug_interaction` — Drug interaction alerts
- `allergy_conflict` — Allergy conflict alerts
- `lab_panel` — Lab panel details
- `lab_comparison` — Lab comparison
- `vitals_trend_bar` — Vital trends
- `advice_bundle` — Advice drafts
- `follow_up` — Follow-up planning
- `completeness_checker` — Completeness checker
- `translation` — Translation
- `referral` — Referral
- All homepage/operational cards (`schedule_overview`, `analytics`, `revenue`, etc.)

---

## Pill Filtering Logic

V0 uses a two-step filter to ensure only summary-relevant pills appear:

1. **PILL_TO_CARD_KINDS mapping**: Each pill label maps to one or more card kinds. Pills without a mapping are excluded (`return false`).
2. **V0_ALLOWED_KINDS check**: The mapped card kinds must include at least one kind in `V0_ALLOWED_KINDS`. If none match, the pill is excluded.

This guarantees every visible pill in V0 produces a real UI card — no text-only fallbacks.

### Pills Shown in V0

- Patient summary
- Medical history
- Past visit summaries
- Today's vitals
- Pre-visit intake (when symptom collector data exists)
- Specialty summaries (obstetric, gynec, pediatric, ophthal — when specialty data exists)

---

## Guard Behavior

When a doctor types a free-text query that maps to a non-V0 card type:

1. The reply engine processes normally and returns cards
2. V0 guard strips any cards not in `V0_ALLOWED_KINDS`
3. If no cards remain, a **helpful text fallback** is shown:
   > "Sorry, I couldn't help you with that at the moment. You can ask me about patient summaries, vitals, or medical history, or try the quick-action pills below to get started."
4. No inline suggestion chips are shown (V0 doesn't render them)

---

## Canned Action Smart Priority

V0 uses the same 4-card selection logic as the full variant on the WelcomeScreen:

| Candidate | Title | When Available |
|-----------|-------|----------------|
| **Intake** | "Details from patient" | Only when symptom collector data exists |
| **Summary** | "Patient summary" | Always available |
| **Medical history** (action) | "Medical history" | Always available. Same **Medical History** section bar and row label styling as full agent. |
| **Specialty** | Varies by specialty | Only when specialty data exists |
| **Vitals** | "Today's vitals" | Always available as fallback |

Selection rules (pick 4):
- **With intake + with specialty**: Intake → Summary → History → Specialty
- **With intake + no specialty**: Intake → Summary → History → Vitals
- **Without intake + with specialty**: Summary → History → Specialty → Vitals
- **Without intake + no specialty**: Summary → History → Vitals → Past visit details

---

## V0 Mode Sync

The `useV0Mode()` hook manages V0 state:

- **Storage**: `localStorage` key `dr-agent-v0-mode`
- **Cross-page sync**: Custom `dr-agent-v0-mode-change` event fires on toggle
- **Default**: V0 mode is **on** (simplified variant) unless explicitly disabled by the user
- **Persistence**: Survives page refreshes and navigation
