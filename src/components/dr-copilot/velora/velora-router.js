import { VELORA_BRIEF_OUTPUT, VELORA_FULL } from "./velora-scenarios"
import { isVeloraPatientId, } from "./velora-patients"

// ─── Preambles (1–2 short sentences max) ─────────────────────────

const BRIEF_PREAMBLE = {
  "velora-priya": "Quick brief on Priya — one gap, three silos.",
  "velora-rajesh": "Quick brief on Rajesh — one chain, three specialists.",
}

const FULL_PREAMBLE = {
  "velora-priya": "Full clinical assessment — pathway, gaps, and what matters clinically.",
  "velora-rajesh": "Full correlation assessment — KT/V ↔ BNP pair with the three specialist views.",
}

// ─── Suggestions per phase ───────────────────────────────────────

export function getBriefSuggestions(patientId) {
  if (patientId === "velora-priya") {
    return [
      { label: "Show full clinical assessment", message: "Show full clinical assessment" },
      { label: "What's overdue right now?", message: "What's overdue right now?" },
      { label: "Pre-Letrozole checklist", message: "Pre-Letrozole checklist" },
      { label: "Why is the rad-onc window 8 weeks?", message: "Why is the rad-onc window 8 weeks?" },
    ]
  }
  return [
    { label: "Show full correlation assessment", message: "Show full correlation assessment" },
    { label: "Show KT/V vs BNP trend", message: "Show KT/V vs BNP trend" },
    { label: "Predicted outcomes if untreated", message: "Predicted outcomes if untreated" },
    { label: "What would escalating PD do?", message: "What would escalating PD do?" },
  ]
}

function getFullSuggestions(patientId) {
  if (patientId === "velora-priya") {
    return [
      { label: "Book rad-onc consult", message: "Book rad-onc consult" },
      { label: "Order lipid panel", message: "Order lipid panel" },
      { label: "Review Letrozole safety", message: "Review Letrozole safety" },
      { label: "Compare to standard protocol", message: "Compare to standard protocol" },
    ]
  }
  return [
    { label: "Open unified timeline", message: "Open unified timeline" },
    { label: "Review last 2 admissions", message: "Review last 2 admissions" },
    { label: "Compare cardio + nephro notes", message: "Compare cardio + nephro notes" },
    { label: "CAPD prescription history", message: "CAPD prescription history" },
  ]
}

// ─── Helper builders ─────────────────────────────────────────────

function card(data) {
  return { kind: "velora_scenario_card", data }
}

function reply(
  text,
  rxOutput,
  suggestions,
) {
  return { text, rxOutput, suggestions }
}

/** Always append a "Show full X assessment" escape hatch if it isn't already in the list. */
function ensureFullAssessment(
  patientId,
  list,
) {
  const full =
    patientId === "velora-priya" ? "Show full clinical assessment" : "Show full correlation assessment"
  const existing = _nullishCoalesce(list, () => ( []))
  if (existing.some((s) => s.label === full)) return existing
  return [...existing, { label: full, message: full }]
}

// ─── Router ──────────────────────────────────────────────────────

export function getVeloraReply(userMessage, patientId) {
  if (!isVeloraPatientId(patientId)) return null
  const msg = userMessage.trim()
  const lower = msg.toLowerCase()

  if (/run clinical insight scan/i.test(lower)) {
    return {
      text: BRIEF_PREAMBLE[patientId],
      rxOutput: VELORA_BRIEF_OUTPUT[patientId],
      suggestions: getBriefSuggestions(patientId),
    }
  }

  if (/show full (clinical|correlation|care)/i.test(msg) || /show full assessment/i.test(msg)) {
    return {
      text: FULL_PREAMBLE[patientId],
      rxOutput: VELORA_FULL[patientId],
      suggestions: getFullSuggestions(patientId),
    }
  }

  const fn = patientId === "velora-priya" ? getPriyaReply : getRajeshReply
  const out = fn(lower, msg)
  if (!out) return null
  // Dynamic pill rail: guarantee the full-assessment escape hatch appears in every reply.
  return { ...out, suggestions: ensureFullAssessment(patientId , out.suggestions) }
}

// ─── Priya (Story 1) drill-downs ─────────────────────────────────

function getPriyaReply(lower, _msg) {
  if (/overdue/i.test(lower)) {
    return reply(
      "Overdue or due-very-soon for Priya.",
      card({
        title: "Overdue right now",
        subtitle: "Items that Velora flagged across the appointment system and LIS.",
        badge: { label: "Time-critical", tone: "critical" },
        sections: [
          {
            kind: "bullets",
            label: "Items",
            items: [
              {
                text: "Radiation oncology consult",
                badge: "Overdue",
                badgeTone: "critical",
                meta: "Day 54 of 56 · expected by Day 56",
              },
              {
                text: "Pre-Letrozole lipid baseline",
                badge: "Due",
                badgeTone: "warning",
                meta: "Required before Letrozole start · Day 60",
              },
              {
                text: "DEXA baseline bone-density",
                badge: "Due",
                badgeTone: "warning",
                meta: "Recommended before aromatase inhibitor start",
              },
            ],
          },
        ],
      }),
      [
        { label: "Book rad-onc consult", message: "Book rad-onc consult" },
        { label: "Order lipid panel", message: "Order lipid panel" },
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
      ],
    )
  }

  if (/letrozole checklist/i.test(lower) || /pre-?letrozole/i.test(lower)) {
    return reply(
      "Pre-Letrozole checklist — 2 missing before Day 60.",
      card({
        title: "Pre-Letrozole checklist",
        subtitle: "Required before aromatase-inhibitor start · Day 60.",
        badge: { label: "2 missing", tone: "warning" },
        sections: [
          {
            kind: "steps",
            label: "Checks",
            steps: [
              { text: "Lipid panel (fasting)", state: "missing", meta: "Order today · results tied to Day 60 start" },
              { text: "LFT (ALT / AST / ALP)", state: "done", meta: "Within normal limits" },
              { text: "DEXA baseline bone-density", state: "missing", meta: "Book within 7 days" },
              { text: "Bone-density risk review", state: "done", meta: "Low-risk · clinical note Day 28" },
              { text: "Counsel on AI side-effects", state: "pending", meta: "Hot flashes, arthralgia · at first visit" },
            ],
          },
        ],
        source: "NCCN survivorship guideline",
      }),
      [
        { label: "Order lipid panel", message: "Order lipid panel" },
        { label: "Book DEXA baseline", message: "Book DEXA baseline" },
        { label: "Review Letrozole safety", message: "Review Letrozole safety" },
      ],
    )
  }

  if (/8 weeks/i.test(lower) || /rad-onc window/i.test(lower)) {
    return reply(
      "Evidence behind the 8-week rad-onc window.",
      card({
        title: "Why 8 weeks for adjuvant RT",
        subtitle: "Post-mastectomy, IDC with N1 nodal disease.",
        badge: { label: "Evidence", tone: "info" },
        sections: [
          {
            kind: "narrative",
            label: "Guideline",
            paragraphs: [
              "Adjuvant radiation should start within 8 weeks of surgery in post-mastectomy IDC with N1 disease.",
              "Delay beyond that window correlates with higher loco-regional recurrence in multiple retrospective cohorts; NCCN and ESMO consensus both favour earlier initiation.",
            ],
          },
          {
            kind: "key_values",
            label: "Priya's timing",
            rows: [
              { key: "Surgery (MRM)", value: "Day 0" },
              { key: "Today", value: "Day 54", emphasize: true },
              { key: "Guideline window closes", value: "Day 56", emphasize: true },
              { key: "Letrozole scheduled", value: "Day 60" },
            ],
          },
        ],
        source: "NCCN Breast Cancer v5.2025 · ESMO clinical practice guideline",
      }),
      [
        { label: "Book rad-onc consult", message: "Book rad-onc consult" },
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
      ],
    )
  }

  if (/letrozole safety/i.test(lower)) {
    return reply(
      "Letrozole safety brief for Priya.",
      card({
        title: "Letrozole safety brief",
        subtitle: "Letrozole 2.5 mg PO OD · 5-year adjuvant plan.",
        badge: { label: "Safety", tone: "info" },
        sections: [
          {
            kind: "key_values",
            label: "Expected effects",
            rows: [
              { key: "Class", value: "Aromatase inhibitor" },
              { key: "Lipid rise", value: "~10–15%" },
              { key: "Bone-loss", value: "~2% per year", emphasize: true },
              { key: "Arthralgia", value: "Common · 20–30%" },
            ],
          },
          {
            kind: "bullets",
            label: "Monitoring plan",
            items: [
              { text: "Lipid panel", badge: "Every 6 mo", badgeTone: "info" },
              { text: "DEXA scan", badge: "Every 2 y", badgeTone: "info" },
              { text: "Annual fracture-risk review", badge: "Yearly", badgeTone: "info" },
            ],
          },
          {
            kind: "highlight",
            tone: "warning",
            label: "Stop criteria",
            text: "Grade-3 toxicity (symptomatic arthralgia limiting ADLs, fracture, severe dyslipidaemia not controlled) — discontinue and re-plan with med onc.",
          },
        ],
        source: "Letrozole PI · NCCN survivorship guideline",
      }),
      [
        { label: "Order lipid panel", message: "Order lipid panel" },
        { label: "Book DEXA baseline", message: "Book DEXA baseline" },
        { label: "Pre-Letrozole checklist", message: "Pre-Letrozole checklist" },
      ],
    )
  }

  if (/standard protocol/i.test(lower) || /compare to standard/i.test(lower)) {
    return reply(
      "Priya's pathway vs. the standard adjuvant protocol.",
      card({
        title: "Pathway comparison",
        subtitle: "Where Priya is on-track and where she's drifting.",
        badge: { label: "1 drift", tone: "warning" },
        sections: [
          {
            kind: "comparison",
            label: "Standard vs Priya",
            labelA: "Standard protocol",
            labelB: "Priya's pathway",
            itemsA: [
              "MRM · Day 0",
              "Histopath · Day 14",
              "Med onc · Day 28",
              "Rad onc · Day 42",
              "RT start · Day 56",
              "Letrozole · Day 60",
            ],
            itemsB: [
              "MRM · Day 0 (done)",
              "Histopath · Day 6 (ahead)",
              "Med onc · Day 28 (done)",
              "Rad onc · not booked (drift)",
              "RT start · blocked on rad onc",
              "Letrozole · scheduled Day 60",
            ],
          },
          {
            kind: "highlight",
            tone: "warning",
            label: "What's drifting",
            text: "Rad-onc referral never closed the loop with scheduling. Without rebooking now, Letrozole Day 60 start will be affected too.",
          },
        ],
      }),
      [
        { label: "Book rad-onc consult", message: "Book rad-onc consult" },
        { label: "What's overdue right now?", message: "What's overdue right now?" },
      ],
    )
  }

  if (/book rad-?onc/i.test(lower)) {
    return reply(
      "Review the booking summary and confirm or cancel.",
      card({
        title: "Rad-onc consult · order summary",
        subtitle: "Slot held for 2 hours. Review the details and commit below.",
        badge: { label: "Action staged", tone: "info" },
        sections: [
          {
            kind: "table",
            label: "Order summary",
            columns: ["Field", "Value"],
            rows: [
              ["Clinician", "Dr. N. Shah"],
              ["Date", "Tomorrow · 13 Mar"],
              ["Time", "11:30 am"],
              ["Mode", "In-person · Block A"],
              ["Duration", "30 min"],
            ],
          },
        ],
        actions: [
          { label: "Cancel", kind: "secondary", message: "Cancel booking" },
          { label: "Confirm and send", kind: "primary", message: "Confirm and send" },
        ],
      }),
      [
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
        { label: "What's overdue right now?", message: "What's overdue right now?" },
      ],
    )
  }

  if (/order lipid/i.test(lower) || /lipid panel/i.test(lower)) {
    return reply(
      "Review the order summary and confirm or cancel.",
      card({
        title: "Fasting lipid profile · order summary",
        subtitle: "Results unlock the Day 60 Letrozole start gate.",
        badge: { label: "Action staged", tone: "info" },
        sections: [
          {
            kind: "table",
            label: "Order summary",
            columns: ["Field", "Value"],
            rows: [
              ["Test", "Fasting lipid profile"],
              ["Collection", "Tomorrow · 8:00 am"],
              ["Fasting", "10 h"],
              ["Turnaround", "Same-day"],
              ["LIS auto-link", "Letrozole Day 60 start"],
            ],
          },
        ],
        actions: [
          { label: "Cancel", kind: "secondary", message: "Cancel order" },
          { label: "Confirm order", kind: "primary", message: "Confirm order" },
        ],
      }),
      [
        { label: "Pre-Letrozole checklist", message: "Pre-Letrozole checklist" },
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
      ],
    )
  }

  if (/book dexa/i.test(lower) || /dexa baseline/i.test(lower)) {
    return reply(
      "Review the DEXA booking summary and confirm or cancel.",
      card({
        title: "DEXA baseline · order summary",
        subtitle: "Whole-body + hip + lumbar spine.",
        badge: { label: "Action staged", tone: "info" },
        sections: [
          {
            kind: "table",
            label: "Order summary",
            columns: ["Field", "Value"],
            rows: [
              ["Regions", "Whole-body + hip + L-spine"],
              ["Next available", "In 3 days · 16 Mar"],
              ["Duration", "15 min"],
              ["Prep", "None"],
            ],
          },
        ],
        actions: [
          { label: "Cancel", kind: "secondary", message: "Cancel DEXA booking" },
          { label: "Confirm DEXA booking", kind: "primary", message: "Confirm DEXA booking" },
        ],
      }),
      [
        { label: "Pre-Letrozole checklist", message: "Pre-Letrozole checklist" },
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
      ],
    )
  }

  if (/cancel (booking|order|dexa)/i.test(lower)) {
    return reply(
      "Cancelled.",
      card({
        title: "Draft cancelled",
        subtitle: "Nothing was sent. The gap remains open for action.",
        badge: { label: "Cancelled", tone: "neutral" },
        sections: [
          {
            kind: "highlight",
            tone: "warning",
            label: "Note",
            text: "Velora still flags this item. Tap an action below to try again.",
          },
        ],
      }),
      [
        { label: "What's overdue right now?", message: "What's overdue right now?" },
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
      ],
    )
  }

  if (/confirm and send/i.test(lower) || /confirm order/i.test(lower) || /confirm dexa/i.test(lower)) {
    return reply(
      "Sent.",
      card({
        title: "Confirmed",
        subtitle: "Patient notified. Appointment system and LIS updated — Velora will re-verify the pathway shortly.",
        badge: { label: "Done", tone: "success" },
        sections: [
          {
            kind: "highlight",
            tone: "success",
            label: "Status",
            text: "Booking / order committed. The gap that triggered this is now cleared from Velora's view.",
          },
        ],
      }),
      [
        { label: "Show full clinical assessment", message: "Show full clinical assessment" },
        { label: "What's overdue right now?", message: "What's overdue right now?" },
      ],
    )
  }

  return null
}

// ─── Rajesh (Story 2) drill-downs ────────────────────────────────

function getRajeshReply(lower, msg) {
  if (/kt\/?v/i.test(msg) && /bnp/i.test(msg)) {
    return reply(
      "KT/V and BNP move in near-perfect inverse over 6 visits.",
      card({
        title: "KT/V ↔ BNP trend",
        subtitle: "Dialysis adequacy drops; cardiac stress rises.",
        badge: { label: "Inverse correlation", tone: "info" },
        sections: [
          {
            kind: "key_values",
            label: "Last 6 visits",
            rows: [
              { key: "Visit −6", value: "KT/V 1.8 · BNP 180" },
              { key: "Visit −5", value: "KT/V 1.7 · BNP 245" },
              { key: "Visit −4 · admission", value: "KT/V 1.6 · BNP 380", emphasize: true },
              { key: "Visit −3", value: "KT/V 1.6 · BNP 520" },
              { key: "Visit −2 · admission", value: "KT/V 1.5 · BNP 690", emphasize: true },
              { key: "Today", value: "KT/V 1.4 · BNP 812", emphasize: true },
            ],
          },
          {
            kind: "highlight",
            tone: "info",
            label: "Signal",
            text: "Each step down in KT/V matches a step up in BNP — the classic under-dialysis → volume-overload pattern.",
          },
        ],
      }),
      [
        { label: "Predicted outcomes if untreated", message: "Predicted outcomes if untreated" },
        { label: "What would escalating PD do?", message: "What would escalating PD do?" },
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }

  if (/predicted outcomes/i.test(lower)) {
    return reply(
      "Likely trajectory if the PD prescription is unchanged.",
      card({
        title: "Predicted outcomes",
        subtitle: "Three events that fit the current trajectory.",
        badge: { label: "3 risks", tone: "warning" },
        sections: [
          {
            kind: "bullets",
            label: "If unchanged",
            items: [
              {
                text: "Volume-overload admission",
                badge: "~3 weeks",
                badgeTone: "critical",
                meta: "Matches prior pattern (admissions at BNP ≈ 380 and 690)",
              },
              {
                text: "AF episode frequency climbs",
                badge: "Likely",
                badgeTone: "warning",
                meta: "Volume-driven, rate control won't contain it",
              },
              {
                text: "Resistant hypertension persists",
                badge: "Likely",
                badgeTone: "warning",
                meta: "No 4th antihypertensive will fix a volume problem",
              },
            ],
          },
        ],
      }),
      [
        { label: "What would escalating PD do?", message: "What would escalating PD do?" },
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }

  if (/escalating pd/i.test(lower) || /escalate pd/i.test(lower)) {
    return reply(
      "Expected effect of escalating PD.",
      card({
        title: "PD escalation · expected effect",
        subtitle: "From 4 × 2 L exchanges to 4 × 2.5 L (or add an icodextrin long-dwell).",
        badge: { label: "Projection", tone: "info" },
        sections: [
          {
            kind: "key_values",
            label: "Projected at 6–8 weeks",
            rows: [
              { key: "KT/V", value: "↑ 0.2–0.3 (target >1.7)", emphasize: true },
              { key: "BNP", value: "↓ 30–50%", emphasize: true },
              { key: "AF burden", value: "Falls with volume" },
              { key: "BP control", value: "Improves (may drop a drug)" },
            ],
          },
          {
            kind: "highlight",
            tone: "info",
            label: "Guardrail",
            text: "Nephrology sign-off needed before prescribing. Icodextrin contraindicated in maltose-sensitive patients.",
          },
        ],
        source: "ISPD guidelines · peer-matched cohort from MediSys HMIS",
      }),
      [
        { label: "Open unified timeline", message: "Open unified timeline" },
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }

  if (/last 2 admissions/i.test(lower) || /review admissions/i.test(lower)) {
    return reply(
      "The two admissions from the past 6 months.",
      card({
        title: "Last 2 admissions",
        subtitle: "Both in the same trajectory — fluid overload driven.",
        badge: { label: "Fluid overload", tone: "warning" },
        sections: [
          {
            kind: "steps",
            label: "Admissions",
            steps: [
              {
                text: "Acute on chronic fluid overload",
                state: "info",
                meta: "Day −96 · 3-day stay · IV furosemide + extra PD dwell · discharged on same regimen",
              },
              {
                text: "Acute on chronic fluid overload + rapid AF",
                state: "info",
                meta: "Day −34 · 4-day stay · rate control added · PD dwells unchanged",
              },
            ],
          },
          {
            kind: "highlight",
            tone: "warning",
            label: "Pattern",
            text: "Both admissions sit at the same point of the KT/V ↓ / BNP ↑ curve. Neither visit escalated PD.",
          },
        ],
      }),
      [
        { label: "Show KT/V vs BNP trend", message: "Show KT/V vs BNP trend" },
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }

  if (/cardio.*nephro/i.test(lower) || /nephro.*cardio/i.test(lower) || /compare.*notes/i.test(lower)) {
    return reply(
      "Nephro + cardio notes on the same patient, last 2 visits.",
      card({
        title: "Specialist notes compared",
        subtitle: "Two clinicians, same patient, no cross-reference.",
        badge: { label: "Divergent", tone: "warning" },
        sections: [
          {
            kind: "comparison",
            label: "Notes",
            labelA: "Nephrology",
            labelB: "Cardiology",
            itemsA: [
              "KT/V 1.4 (low)",
              "Continue current PD",
              "Review residual renal fn in 6 weeks",
              "No mention of BNP / AF",
            ],
            itemsB: [
              "BNP 812, AF paroxysmal",
              "Rate control adjusted",
              "Volume status not referenced",
              "No mention of KT/V / PD",
            ],
          },
          {
            kind: "highlight",
            tone: "warning",
            label: "Gap",
            text: "Neither note references the other's primary signal. Velora is the only view that ties them together.",
          },
        ],
      }),
      [
        { label: "Show KT/V vs BNP trend", message: "Show KT/V vs BNP trend" },
        { label: "Flag for MDT", message: "Flag for MDT" },
      ],
    )
  }

  if (/capd prescription/i.test(lower) || /prescription history/i.test(lower)) {
    return reply(
      "CAPD prescription hasn't been escalated in 14 months.",
      card({
        title: "CAPD prescription history",
        subtitle: "Same dose, drifting adequacy.",
        badge: { label: "Not escalated", tone: "warning" },
        sections: [
          {
            kind: "key_values",
            label: "Timeline",
            rows: [
              { key: "Month 0", value: "4 × 2 L · KT/V 1.8" },
              { key: "Month 6", value: "4 × 2 L · KT/V 1.7" },
              { key: "Month 10", value: "4 × 2 L · KT/V 1.6" },
              { key: "Month 14 (today)", value: "4 × 2 L · KT/V 1.4", emphasize: true },
            ],
          },
          {
            kind: "highlight",
            tone: "warning",
            label: "Why it matters",
            text: "Adequacy has drifted four tenths without a prescription change. This is the root of the chain.",
          },
        ],
      }),
      [
        { label: "What would escalating PD do?", message: "What would escalating PD do?" },
        { label: "Show KT/V vs BNP trend", message: "Show KT/V vs BNP trend" },
      ],
    )
  }

  if (/unified timeline/i.test(lower)) {
    return reply(
      "Key events across all three specialists.",
      card({
        title: "Unified timeline",
        subtitle: "Newest first. Velora stitches nephro + cardio + internal-med entries onto one rail.",
        badge: { label: "6 events", tone: "info" },
        sections: [
          {
            kind: "steps",
            label: "Events",
            steps: [
              { text: "KT/V 1.4 · BNP 812 · BP 172/98", state: "info", meta: "Today" },
              { text: "Admission · fluid overload + rapid AF", state: "info", meta: "Day −34" },
              { text: "Admission · fluid overload", state: "info", meta: "Day −96" },
              { text: "Antihypertensives escalated to 3 agents", state: "info", meta: "Month −4 · internal medicine" },
              { text: "AF first documented", state: "info", meta: "Month −10 · cardiology" },
              { text: "CAPD initiated", state: "done", meta: "Month −14 · nephrology" },
            ],
          },
        ],
      }),
      [
        { label: "Show KT/V vs BNP trend", message: "Show KT/V vs BNP trend" },
        { label: "Compare cardio + nephro notes", message: "Compare cardio + nephro notes" },
      ],
    )
  }

  if (/flag for mdt/i.test(lower)) {
    return reply(
      "Review the MDT summary and confirm or cancel.",
      card({
        title: "MDT · Rajesh Iyer · booking summary",
        subtitle: "Nephrology + cardiology + internal medicine.",
        badge: { label: "Action staged", tone: "info" },
        sections: [
          {
            kind: "table",
            label: "Proposed slot",
            columns: ["Field", "Value"],
            rows: [
              ["Date", "Thursday · 15 Mar"],
              ["Time", "3:00 pm"],
              ["Mode", "Hybrid"],
              ["Agenda", "PD adequacy + volume chain"],
              ["Velora output", "Pre-aggregated notes + trend"],
            ],
          },
        ],
        actions: [
          { label: "Cancel", kind: "secondary", message: "Cancel MDT" },
          { label: "Confirm MDT slot", kind: "primary", message: "Confirm MDT slot" },
        ],
      }),
      [
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }
  if (/cancel mdt/i.test(lower)) {
    return reply(
      "MDT draft cancelled.",
      card({
        title: "MDT cancelled",
        subtitle: "Nothing sent. The correlation chain remains unresolved.",
        badge: { label: "Cancelled", tone: "neutral" },
        sections: [
          {
            kind: "highlight",
            tone: "warning",
            label: "Note",
            text: "Velora will keep flagging the KT/V ↔ BNP pattern until it's addressed.",
          },
        ],
      }),
      [
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }

  if (/confirm mdt/i.test(lower)) {
    return reply(
      "Sent.",
      card({
        title: "MDT confirmed",
        subtitle: "All three specialists invited. Notes aggregation queued.",
        badge: { label: "Done", tone: "success" },
        sections: [
          {
            kind: "highlight",
            tone: "success",
            label: "Status",
            text: "MDT scheduled. Velora will re-score the chain after the meeting closes the loop.",
          },
        ],
      }),
      [
        { label: "Show full correlation assessment", message: "Show full correlation assessment" },
      ],
    )
  }

  if (/open unified timeline/i.test(lower)) {
    // Convenience alias.
    return getRajeshReply("unified timeline", "unified timeline")
  }

  return null
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
