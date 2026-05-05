"use client";

import React from "react";

/**
 * Shared clinical text highlighter — bolds conditions, medications, lab values,
 * vitals, durations, pregnancy context, and clinical events.
 *
 * Used across:
 * - GPSummaryCard (narrative)
 * - PatientReportedCard (snapshot)
 * - SbarCriticalCard (situation)
 * - CardRenderer (patient_narrative)
 * - AiPatientTooltip (summary hover)
 */

/**
 * PRIMARY highlight — semibold, dark text for important clinical terms.
 * Used for: conditions, medications, lab values, vitals, clinical events.
 * Follows secondary sidebar pattern: font-semibold text-tp-slate-700.
 */
function HighlightPrimary({ children }) {
  return <span className="font-semibold not-italic text-tp-slate-700">{children}</span>;
}

/**
 * SECONDARY highlight — normal weight, muted text for supportive context.
 * Used for: durations, dates, parenthetical info, age context, follow-up timing.
 * Follows secondary sidebar pattern: font-normal text-tp-slate-400.
 * This ensures doctor's eye goes to the clinical term first, not the duration.
 */
function HighlightSecondary({ children }) {
  return <span className="font-normal not-italic text-tp-slate-400">{children}</span>;
}

/** Backward compat alias */
function HighlightBold({ children }) {
  return <HighlightPrimary>{children}</HighlightPrimary>;
}

// ── PRIMARY patterns: important clinical data (bold + dark) ──
const PRIMARY_PATTERNS = [
// Conditions & diagnoses
/\bCKD\s+Stage\s+\d+\b/gi,
/\bType\s+\d+\s+D(?:M|iabetes(?:\s+Mellitus)?)\b/gi,
/\b(?:Hypertension|HTN|Diabetes(?:\s+Mellitus)?|Dyslipidemia|Hypothyroid(?:ism)?|Pre-?Diabetes|PCOS|Migraine|URTI|AUB|Primigravida|COPD|Asthma|Bronchial\s+Asthma|IHD|Ischemic\s+Heart\s+Disease|Diabetic\s+Nephropathy|Renal\s+Anemia|Hyperparathyroidism|Pre-?eclampsia|Gestational\s+DM|GDM|Anemia|Conjunctivitis|Viral\s+Fever|Pharyngitis|Otitis|Sinusitis|Pneumonia|UTI|Gastritis|Vertigo|Sciatica|Arthritis|Gout|Cellulitis|Fibroid\s+Uterus|Iron\s+Deficiency\s+Anemia|Fatigue\s+Syndrome|AUB-Ovulatory\s+Dysfunction|Migraine\s+without\s+Aura|Acute\s+URTI|Routine\s+ANC|Stable\s+Angina|Reactive\s+Airways)\b/gi,
/\bpost-?(?:MI|CABG|angioplasty)\b/gi,
// Common symptoms
/\b(?:Fever|Headache|Cough|Dry\s+Cough|Fatigue|Dizziness|Nausea|Vomiting|Chest\s+Pain|Back\s+Pain|Pedal\s+(?:Edema|Oedema)|Eye\s+Redness|Breathlessness|Palpitations|Abdominal\s+Pain|Joint\s+Pain|Weight\s+(?:Loss|Gain)|Leg\s+Swelling|Heavy\s+(?:Menstrual\s+)?Bleeding|Irregular\s+Cycles|Reduced\s+Appetite|Poor\s+Sleep|Braxton-?Hicks)\b/gi,
// Durations as standalone (e.g., "3 days", "2 weeks", "6 months", "18 years")
/\b\d+\s*(?:days?|weeks?|months?|years?|yr|wk|mo)\b/gi,
/\b(?:peritoneal|hemo)\s*dialysis\b/gi,
// Medications
/\b(?:Telma|Metsmall|Metsmail|Metformin|Paracetamol|Azithromycin|Sumatriptan|Naproxen|Vitamin\s+D\d*|Rosuvastatin|Melatonin|CoQ10|Thyronorm|Folic\s+Acid|Calcium|Amoxicillin|Salbutamol|Autrin|Tranexamic\s+Acid|Iron\+Folic|Amlodipine|Atorvastatin|Telmisartan|Erythropoietin|EPO|Calcitriol|Sevelamer|Pantoprazole|Insulin(?:\s+Glargine)?|Glimepiride|Aspirin|Clopidogrel|Levocetrizine|Budecort|Furosemide|Sulfonamides)\s*\d*\w*\b/gi,
// Lab values (e.g., HbA1c 9.2%, eGFR 7, Hb 10.2, Creatinine 8.2)
/\b(?:HbA1c|eGFR|Hb|Creatinine|TSH|LDL|HDL|Hemoglobin|Microalbumin|Triglycerides|FBS|IgE|K\+)\s*(?:\d+\.?\d*\s*%?(?:\s*mg\/dL|\s*mL\/min|\s*mIU\/L|\s*ng\/mL|\s*g\/dL|\s*IU\/mL|\s*mEq\/L)?)/gi,
/\bNT\s+Scan\b/gi,
/\bKt\/V\b/gi,
/\bEcho\b/gi,
// Vitals (e.g., BP 170/100, SpO2 94%, Pulse 88)
/\b(?:BP|SpO[₂2]|Pulse|HR)\s*\d+(?:\/\d+)?(?:\s*%|\s*bpm|\s*mmHg)?/gi,
// Clinical events & counts
/\b\d+\s*(?:ER|hospital)\s+admissions?\b/gi,
/\b(?:acute\s+)?fluid\s+overload\b/gi,
// Pregnancy context
/\bG\d+P\d+(?:L\d+)?(?:A\d+)?\b/gi,
/\bLMP\s+\S+/gi,
/\bEDD\s+\S+/gi,
// Follow-up overdue
/\bfollow-?up\s+overdue(?:\s+by\s+\d+\s*d(?:ays?)?)?\b/gi];


// ── SECONDARY patterns: ONLY parenthetical/bracketed content (tp-slate-400) ──
// Simple rule: only text inside parentheses is secondary.
// Standalone durations, dates, numbers are PRIMARY (dark).
const SECONDARY_PATTERNS = [
// Full parenthetical blocks: (2yr), (5yr | Active), (childhood), (2019, resolved), etc.
/\([^)]+\)/gi];




/**
 * Highlight clinical terms in text — returns React nodes with two-tier highlighting:
 *
 * **Primary** (semibold + dark): Conditions, medications, lab values, vitals
 * **Secondary** (normal + muted): Durations, dates, supportive context
 *
 * This creates a visual hierarchy where the doctor's eye is drawn to the
 * clinical term first, not the supporting temporal/contextual data.
 *
 * Pattern follows the secondary historical sidebar: primary data in tp-slate-700,
 * supportive data in tp-slate-400.
 */
export function highlightClinicalText(text) {
  const matches = [];

  // Collect primary matches
  for (const pat of PRIMARY_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    let safety = 0;
    while ((m = pat.exec(text)) !== null && safety++ < 100) {
      matches.push({ start: m.index, end: m.index + m[0].length, type: "primary" });
      if (!pat.global) break;
    }
  }

  // Collect secondary matches
  for (const pat of SECONDARY_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    let safety = 0;
    while ((m = pat.exec(text)) !== null && safety++ < 100) {
      matches.push({ start: m.index, end: m.index + m[0].length, type: "secondary" });
      if (!pat.global) break;
    }
  }

  if (matches.length === 0) return text;

  // Sort by start position; primary wins over secondary when overlapping
  matches.sort((a, b) => a.start - b.start || (a.type === "primary" ? -1 : 1));

  // Merge overlapping — primary takes precedence
  const merged = [matches[0]];
  for (let i = 1; i < matches.length; i++) {
    const last = merged[merged.length - 1];
    if (matches[i].start <= last.end) {
      // Overlap: extend range, primary wins
      last.end = Math.max(last.end, matches[i].end);
      if (matches[i].type === "primary") last.type = "primary";
    } else {
      merged.push(matches[i]);
    }
  }

  const parts = [];
  let cursor = 0;
  merged.forEach((m, i) => {
    if (m.start > cursor) {
      parts.push(text.slice(cursor, m.start));
    }
    const segment = text.slice(m.start, m.end);
    if (m.type === "primary") {
      parts.push(<HighlightPrimary key={`h-${i}`}>{segment}</HighlightPrimary>);
    } else {
      parts.push(<HighlightSecondary key={`h-${i}`}>{segment}</HighlightSecondary>);
    }
    cursor = m.end;
  });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
}