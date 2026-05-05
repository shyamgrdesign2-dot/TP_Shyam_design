/**
 * Shared narrative builder — produces a structured intermediate format
 * that both GPSummaryCard (JSX) and SbarOverviewCard (plain text) consume.
 *
 * This ensures the patient summary narrative and SBAR situation line
 * always present the same clinical content, just formatted differently.
 */



// ── Types ──
























// ── Helpers ──

const ABBREV_MAP = {
  "DM": "Diabetes", "HTN": "Hypertension", "CKD": "Chronic Kidney Disease",
  "COPD": "Chronic Obstructive Pulmonary Disease", "CAD": "Coronary Artery Disease",
  "CHF": "Congestive Heart Failure", "RA": "Rheumatoid Arthritis",
  "SLE": "Systemic Lupus Erythematosus", "TB": "Tuberculosis",
  "GERD": "Gastroesophageal Reflux Disease"
};

export function expandAbbreviation(text) {
  return text.replace(/\b(DM|HTN|CKD|COPD|CAD|CHF|RA|SLE|TB|GERD)\b/g, (match) => {
    return ABBREV_MAP[match] || match;
  });
}

/** Shorten medication to drug name (+ strength if present) */
export function shortenMedication(raw) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 0) return raw;
  const drugName = parts[0];
  if (parts.length > 1 && /^\d+/.test(parts[1]) && !/^\d+-\d+/.test(parts[1])) {
    return `${drugName} ${parts[1]}`;
  }
  return drugName;
}

/** Specialty-relevant condition keywords */
const SPECIALTY_CONDITION_RELEVANCE = {
  obstetric: /pre-?eclampsia|gestational|GDM|HTN|hypertension|anemia|thyroid|diabetes/i,
  ophthal: /diabet|HTN|hypertension|glaucoma|cataract|retino|macula/i,
  gynec: /PCOS|endometri|fibroid|thyroid|anemia|hormonal/i,
  pediatrics: /asthma|allergy|anemia|epilepsy|growth|nutrition|congenital/i
};

function filterConditionsForSpecialty(
conditions,
specialty)
{
  if (!specialty || specialty === "gp") return conditions;
  const pattern = SPECIALTY_CONDITION_RELEVANCE[specialty];
  if (!pattern) return conditions;
  const relevant = conditions.filter((c) => pattern.test(c));
  const other = conditions.filter((c) => !pattern.test(c));
  return [...relevant, ...other];
}

/** Parse a condition string like "Diabetes (5 yrs)" into name + duration */
function parseCondition(raw) {
  const match = raw.match(/^(.+?)\s*(?:\(([^)]+)\)\s*)?$/);
  const name = match?.[1]?.replace(/\s*—\s*$/, "").trim() || raw;
  const duration = match?.[2];
  return { name, duration, raw };
}

// ── Specialty lead-in (plain text) ──

function buildSpecialtyLeadInText(
data,
specialty)
{
  if (!specialty || specialty === "gp") return undefined;

  if (specialty === "obstetric" && data.obstetricData) {
    const ob = data.obstetricData;
    const gp = [
    ob.gravida != null ? `G${ob.gravida}` : null,
    ob.para != null ? `P${ob.para}` : null,
    ob.living != null ? `L${ob.living}` : null,
    ob.abortion != null && ob.abortion > 0 ? `A${ob.abortion}` : null].
    filter(Boolean).join("");
    const details = [];
    if (ob.gestationalWeeks) details.push(`${ob.gestationalWeeks} wks`);
    if (ob.edd) details.push(`EDD ${ob.edd}`);
    if (ob.lmp) details.push(`LMP ${ob.lmp}`);
    return `${gp || "Obstetric patient"}${details.length > 0 ? ` — ${details.join(", ")}` : ""}`;
  }

  if (specialty === "ophthal" && data.ophthalData) {
    const oph = data.ophthalData;
    const vaDetails = [];
    if (oph.vaRight) vaDetails.push(`OD: ${oph.vaRight}`);
    if (oph.vaLeft) vaDetails.push(`OS: ${oph.vaLeft}`);
    if (oph.iop) vaDetails.push(`IOP: ${oph.iop}`);
    if (vaDetails.length > 0) return vaDetails.join(", ");
  }

  if (specialty === "gynec" && data.gynecData) {
    const gyn = data.gynecData;
    const details = [];
    if (gyn.lmp) details.push(`LMP ${gyn.lmp}`);
    if (gyn.cycleRegularity) details.push(`cycles ${gyn.cycleRegularity.toLowerCase()}`);
    if (gyn.painScore && parseInt(gyn.painScore, 10) > 5) details.push(`pain ${gyn.painScore}/10`);
    if (details.length > 0) return details.join(", ");
  }

  if (specialty === "pediatrics" && data.pediatricsData) {
    const ped = data.pediatricsData;
    const details = [];
    if (ped.ageDisplay) details.push(ped.ageDisplay);
    if (ped.weightKg != null) {
      details.push(`Wt ${ped.weightKg}kg${ped.weightPercentile ? ` (${ped.weightPercentile})` : ""}`);
    }
    if (ped.vaccinesOverdue && ped.vaccinesOverdue > 0) {
      details.push(`${ped.vaccinesOverdue} vaccines overdue`);
    } else if (ped.vaccinesPending && ped.vaccinesPending > 0) {
      details.push(`${ped.vaccinesPending} vaccines pending`);
    }
    if (details.length > 0) return details.join(", ");
  }

  return undefined;
}

// ── Core builder ──

/**
 * Build structured narrative parts from patient data.
 * Both GPSummaryCard and SbarOverviewCard call this to ensure
 * they present the same clinical content.
 *
 * @param data - Patient summary data
 * @param specialty - Active specialty tab
 * @param maxConditions - Max conditions to show (default 3)
 * @param maxAllergies - Max allergies to show (default 2)
 * @param maxMeds - Max medications to show (default 3)
 */
export function buildCoreNarrative(
data,
specialty,
options)




{
  const maxConditions = options?.maxConditions ?? 3;
  const maxAllergies = options?.maxAllergies ?? 2;
  const maxMeds = options?.maxMeds ?? 3;

  const result = {};

  // Specialty lead-in
  const lead = buildSpecialtyLeadInText(data, specialty);
  if (lead) result.specialtyLead = lead;

  // Symptoms from collector
  if (data.symptomCollectorData?.symptoms?.length) {
    result.symptoms = data.symptomCollectorData.symptoms.slice(0, 3).map((s) => ({
      name: s.name,
      duration: s.duration
    }));
  }

  // Chronic conditions (filtered by specialty)
  if (data.chronicConditions && data.chronicConditions.length > 0) {
    const filtered = filterConditionsForSpecialty(data.chronicConditions, specialty);
    if (filtered.length > 0) {
      const items = filtered.slice(0, maxConditions).map(parseCondition);
      result.conditions = {
        items,
        hasMore: Math.max(0, filtered.length - maxConditions)
      };
    }
  }

  // Allergies (all types, not just drug allergies)
  if (data.allergies && data.allergies.length > 0) {
    result.allergies = data.allergies.slice(0, maxAllergies);
  }

  // Active medications
  if (data.activeMeds && data.activeMeds.length > 0) {
    result.meds = {
      names: data.activeMeds.slice(0, maxMeds).map(shortenMedication),
      hasMore: Math.max(0, data.activeMeds.length - maxMeds)
    };
  }

  // Last visit
  if (data.lastVisit) {
    const date = data.lastVisit.date || "";
    const dx = data.lastVisit.diagnosis || "";
    if (date && dx) {
      result.lastVisit = { date, dx };
    }
  }

  // Follow-up overdue
  if (data.followUpOverdueDays && data.followUpOverdueDays > 0) {
    result.followUpOverdue = data.followUpOverdueDays;
  }

  return result;
}

/**
 * Render NarrativeParts as a plain text string.
 * Used by SbarOverviewCard's buildSituationLine.
 *
 * @param parts - Structured narrative parts from buildCoreNarrative
 * @param maxChars - Character limit (default 220)
 */
export function narrativeToPlainText(
parts,
maxChars = 220)
{
  const sentences = [];

  // Specialty lead-in
  if (parts.specialtyLead) {
    sentences.push(`${parts.specialtyLead}.`);
  }

  // Symptoms
  if (parts.symptoms?.length) {
    const symptomStr = parts.symptoms.map((s) => {
      return s.duration ? `${s.name} (${s.duration})` : s.name;
    }).join(", ");
    sentences.push(`Presenting with ${symptomStr}.`);
  }

  // Conditions
  if (parts.conditions) {
    const condStr = parts.conditions.items.
    map((c) => c.duration ? `${expandAbbreviation(c.name)} (${c.duration})` : expandAbbreviation(c.name)).
    join(", ");
    const prefix = sentences.length > 0 ? "Known case of" : "Patient with";
    const more = parts.conditions.hasMore > 0 ? ` + ${parts.conditions.hasMore} more` : "";
    sentences.push(`${prefix} ${condStr}${more}.`);
  }

  // Allergies
  if (parts.allergies?.length) {
    const allergyStr = parts.allergies.map((a) => a.split("(")[0].trim()).join(", ");
    sentences.push(`Allergic to ${allergyStr}.`);
  }

  // Medications
  if (parts.meds) {
    const more = parts.meds.hasMore > 0 ? ` + ${parts.meds.hasMore} more` : "";
    sentences.push(`On ${parts.meds.names.join(", ")}${more}.`);
  }

  // Last visit
  if (parts.lastVisit) {
    sentences.push(`Last seen ${parts.lastVisit.date} — Dx: ${parts.lastVisit.dx}.`);
  }

  // Follow-up overdue
  if (parts.followUpOverdue) {
    sentences.push(`Follow-up overdue by ${parts.followUpOverdue} days.`);
  }

  if (sentences.length === 0) return "New patient, no prior clinical data available.";

  // Cap at maxChars
  let result = sentences.join(" ");
  if (result.length > maxChars) {
    // Progressively trim from the end
    result = "";
    for (const s of sentences) {
      const candidate = result ? `${result} ${s}` : s;
      if (candidate.length > maxChars && result.length > 0) break;
      result = candidate;
    }
  }

  return result;
}

function detectQuickSnapshotSpecialty(data) {
  if (data.obstetricData) return "obstetric";
  if (data.pediatricsData) return "pediatrics";
  if (data.gynecData && !data.obstetricData) return "gynec";
  if (data.ophthalData) return "ophthal";
  return "gp";
}

/** First clause of narrative — age + role (e.g. "76-year-old male", "26-year-old Primigravida at 38 weeks gestation") */
export function extractDemographicsLine(data) {
  const src = (data.patientNarrative || data.sbarSituation || "").trim();
  if (!src) return "Patient";
  const beforeWith = src.split(/\s+with\s+/i)[0];
  const beforePresenting = beforeWith.split(/\s+presenting\s+/i)[0];
  const firstSentence = beforePresenting.split(/\.\s+/)[0].trim();
  if (/^\d+-year-old/i.test(firstSentence)) return firstSentence;
  const m2 = src.match(/^(\d+)\s*([MF])\b/i);
  if (m2) {
    const gender = m2[2].toUpperCase() === "M" ? "male" : "female";
    return `${m2[1]}-year-old ${gender}`;
  }
  return "Patient";
}

/**
 * First chat message / text_quote when opening Dr. Agent (quick clinical snapshot):
 * demographics + intake symptoms when available + compact history (same permutation as SBAR), without duplicating symptoms in the history clause.
 */
/** ~10 lines at ~14px / 1.6 leading� 90 chars/line → allow full history clause without hard ellipsis */
const QUICK_SNAPSHOT_HISTORY_MAX_CHARS = 1100;

export function buildQuickClinicalSnapshotText(data) {
  const specialty = detectQuickSnapshotSpecialty(data);
  const parts = buildCoreNarrative(data, specialty, {
    maxConditions: 4,
    maxAllergies: 3,
    maxMeds: 3
  });

  const demo = extractDemographicsLine(data);

  const collectorSyms = data.symptomCollectorData?.symptoms;
  const symSource = collectorSyms?.length ?
  collectorSyms :
  parts.symptoms?.map((s) => ({ name: s.name, duration: s.duration })) ?? [];

  let symptomInline = "";
  if (symSource.length > 0) {
    const shown = symSource.map((s) => {
      const d = s.duration?.trim();
      return d ? `${s.name} ${d}` : s.name;
    });
    symptomInline = `presenting with ${shown.join(", ")}`;
  }

  const historyParts = {
    ...parts,
    symptoms: undefined,
    specialtyLead: undefined
  };
  let history = narrativeToPlainText(historyParts, QUICK_SNAPSHOT_HISTORY_MAX_CHARS).trim();

  const segments = [];
  if (parts.specialtyLead) {
    segments.push(`${parts.specialtyLead}.`);
  }

  const opener = symptomInline ? `${demo} ${symptomInline}` : demo;
  segments.push(opener.endsWith(".") ? opener : `${opener}.`);

  if (history && history !== "New patient, no prior clinical data available.") {
    segments.push(history.endsWith(".") ? history : `${history}.`);
  }

  let out = segments.join(" ").replace(/\s+/g, " ").replace(/\.+/g, ".").replace(/\.\s*\./g, ". ").trim();

  if (!symptomInline && (!out || out === "Patient.")) {
    const fallback = (data.patientNarrative || data.sbarSituation || "").trim();
    if (fallback) out = fallback;
  }

  return out || "New patient, no prior clinical data available.";
}

/** Same placeholder string as the final fallback in {@link buildQuickClinicalSnapshotText}. */
export const QUICK_SNAPSHOT_EMPTY_PLACEHOLDER = "New patient, no prior clinical data available.";

/**
 * True when the chart has enough context to show a quick clinical snapshot (Rx pad / V0 default open).
 * When false, keep the greeting + quick-action welcome instead of an empty or placeholder-only glance.
 */
export function patientHasQuickClinicalSnapshotData(data) {
  const text = buildQuickClinicalSnapshotText(data).trim();
  if (!text) return false;
  if (text === QUICK_SNAPSHOT_EMPTY_PLACEHOLDER) return false;
  return true;
}

/**
 * Inline canned actions under the first “situation at a glance” message only.
 * After the user sends anything, the parent clears these so pills move to the footer (full agent) or stay there (v0).
 */
export function buildQuickClinicalSnapshotInlineSuggestions(
data,
variant)
{
  const out = [];
  if (variant === "full") {
    out.push({ label: "Detailed summary", message: "Patient's detailed summary" });
  }
  if (data.symptomCollectorData) {
    out.push({ label: "Reported by patient", message: "Show reported intake" });
  }
  out.push({ label: "Medical history", message: "Medical history" });
  if (variant === "v0" && data.todayVitals && Object.keys(data.todayVitals).length > 0) {
    out.push({ label: "Today's vitals", message: "Today's vitals" });
  }
  if (data.lastVisit) {
    out.push({ label: "Last visit", message: "Last visit details" });
  }
  return out;
}

/**
 * Quoted opening in SBAR / detailed patient summary cards: intake-only when collector exists;
 * otherwise a short 2–3 line fallback (no full EMR narrative — details live in sections below).
 */
export function buildCardSituationQuote(
data,
specialty)
{
  const spec = specialty ?? detectQuickSnapshotSpecialty(data);
  const maxLen = 420;
  const sc = data.symptomCollectorData;

  if (sc?.symptoms?.length) {
    const segs = [];
    const symLine = sc.symptoms.slice(0, 6).map((s) => {
      const d = s.duration?.trim();
      return d ? `${s.name} ${d}` : s.name;
    }).join(", ");
    segs.push(`Presenting with ${symLine}.`);
    if (sc.questionsToDoctor?.[0]?.trim()) {
      segs.push(`Patient asks: ${sc.questionsToDoctor[0].trim()}`);
    }
    if (sc.medicalHistory?.length) {
      const mh = sc.medicalHistory.slice(0, 3).join("; ");
      if (mh) segs.push(`Intake medical history: ${mh}.`);
    }
    let out = expandAbbreviation(segs.join(" "));
    if (out.length > maxLen) out = `${out.slice(0, maxLen - 3)}...`;
    return out;
  }

  const lines = [];
  const core = buildCoreNarrative(data, spec, { maxConditions: 0, maxAllergies: 0, maxMeds: 0 });
  if (core.specialtyLead) lines.push(`${core.specialtyLead}.`);
  const demo = extractDemographicsLine(data);
  lines.push(demo.endsWith(".") ? demo : `${demo}.`);

  if (data.lastVisit?.symptoms?.trim()) {
    const sx = data.lastVisit.symptoms.trim();
    const short = sx.length > 180 ? `${sx.slice(0, 177)}...` : sx;
    lines.push(`Recent visit symptoms: ${short}.`);
  } else if (data.sbarSituation?.trim()) {
    const one = data.sbarSituation.trim().split(/\.\s+/)[0];
    if (one && one.length < 200) lines.push(`${one}.`);
  }

  let out = lines.join(" ").replace(/\s+/g, " ").trim();
  out = expandAbbreviation(out);
  if (!out || out === "Patient.") {
    out = "Clinical context is in the sections below.";
  }
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 3)}...`;
  return out;
}