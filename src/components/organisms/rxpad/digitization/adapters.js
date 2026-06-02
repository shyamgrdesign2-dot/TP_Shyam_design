/**
 * Pure mappers from a `PatientHistory` (AI-payload-shaped) into the view
 * models that individual sidebar sections render.
 *
 * Adding a new section = add a new function here. Component code stays
 * declarative — pick a slice, render. Backend swap is a single edit in
 * `mock-payload.ts`.
 */











// ─── Vitals ───────────────────────────────────────────────────────────────────





















/**
 * Display order + units. Keep this list as the single declaration of which
 * vitals are shown, in what order, with what unit.
 */
const VITAL_FIELDS = [
{ key: "temperature", label: "Temperature", unit: "Frh" },
{ key: "pulse", label: "Pulse", unit: "/min" },
{ key: "respiratoryRate", label: "Resp. Rate", unit: "/min" },
{ key: "systolic", label: "Systolic", unit: "mmhg" },
{ key: "diastolic", label: "Diastolic", unit: "mmhg" },
{ key: "spo2", label: "SpO2", unit: "%" },
{ key: "randomBloodSugar", label: "RBS", unit: "mg/dL" },
{ key: "height", label: "Height", unit: "cms" },
{ key: "weight", label: "Weight", unit: "kgs" },
{ key: "bmi", label: "BMI", unit: "kg/m²" },
{ key: "bmr", label: "BMR", unit: "kcals" },
{ key: "bsa", label: "BSA", unit: "m²" },
{ key: "headCircumference", label: "Head Circ.", unit: "cms" },
{ key: "waistCircumference", label: "Waist Circ.", unit: "cms" },
{ key: "fib4", label: "FIB-4", unit: "" }];


function vitalsBlockFromVisit(visit) {
  const v = visit.payload.vitalsAndBodyComposition;
  const rows = VITAL_FIELDS.flatMap((field) => {
    const value = v[field.key];
    if (typeof value !== "string" || !value.trim()) return [];
    return [{ label: field.label, unit: field.unit, value, schemaKey: field.key }];
  });
  return { id: visit.id, dateLabel: visit.dateLabel, rows };
}

export function vitalsByDate(history) {
  return history.visits.
  map(vitalsBlockFromVisit).
  filter((block) => block.rows.length > 0);
}

// ─── Medical history ──────────────────────────────────────────────────────────












const HISTORY_SECTION_ORDER =



[
{ id: "medical", title: "Medical Conditions", type: "Medical condition" },
{ id: "allergies", title: "Allergies", type: "Allergies" },
{ id: "family", title: "Family History", type: "Family History" },
{ id: "surgical", title: "Surgeries", type: "Surgical History" },
{ id: "lifestyle", title: "Lifestyle", type: "Lifestyle" },
{ id: "additional", title: "Additional Notes", type: "Additional Notes" }];


/**
 * Build "X year(s) | Active | <notes>" detail line from a schema entry.
 * Family entries lead with the relation instead.
 */
function historyDetailFor(entry) {
  if (entry.type === "Family History") {
    return valueDetail([entry.relation, entry.notes]) || undefined;
  }
  // "Active" / "Negated" only meaningful for chronic-style entries.
  const showsStatus =
  entry.type === "Medical condition" ||
  entry.type === "Allergies" ||
  entry.type === "Lifestyle";
  const status =
  showsStatus && entry.enable === "N" ?
  "Negated" :
  showsStatus && entry.enable === "Y" ?
  "Active" :
  "";
  return valueDetail([entry.duration, status, entry.notes]) || undefined;
}

export function historySections(history) {
  // Aggregate medicalHistory across ALL visits (newer entries win on duplicate name+type).
  const byKey = new Map();
  history.visits.forEach((visit) => {
    visit.payload.medicalHistory.forEach((entry) => {
      const key = `${entry.type}::${entry.name.toLowerCase()}`;
      byKey.set(key, entry);
    });
  });
  const aggregated = [...byKey.values()];

  return HISTORY_SECTION_ORDER.map(({ id, title, type }) => ({
    id,
    title,
    items: aggregated.
    filter((entry) => entry.type === type).
    map((entry) => ({ name: entry.name, detail: historyDetailFor(entry) }))
  }));
}

// ─── Past visits — digital Rx slice ───────────────────────────────────────────




































/**
 * Two detail formatters reflecting the visual contract:
 *
 * - `valueDetail`  → "value | value | value"   used for list-type sections
 *   (symptoms, diagnoses, medications, history items, etc.) where the
 *   field meaning is implicit from the section title. Empty values dropped.
 *
 * - `labelledDetail` → "Label: value | Label: value"  used for object-type
 *   sections (gynec, obstetric, antenatal exam) where labels are essential
 *   for disambiguation.
 *
 * Both filter empties per the schema's "leave empty if not present"
 * semantics. Numeric `0` is treated as "not mentioned" since the schema
 * uses 0 as the sentinel for missing numeric fields.
 */
function isPresent(v) {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s === "0") return false;
  return true;
}

// Bracketed details inside Past Visits + History sections render the
// joined string in parentheses (e.g. `Symptom (2 days, mild, sometimes)`).
// Per design feedback we use comma separators instead of pipes — the
// pipe reads as a competing micro-divider whereas the comma keeps the
// content as ordinary prose. Object-shape sections (Gynec, Obstetric)
// still render their labels via inline JSX with a `text-tp-slate-300 |`
// span where a divider is genuinely useful.
function valueDetail(values) {
  return values.filter(isPresent).map((v) => String(v).trim()).join(", ");
}

function labelledDetail(pairs) {
  return pairs.
  filter(([, v]) => isPresent(v)).
  map(([label, v]) => `${label}: ${String(v).trim()}`).
  join(", ");
}

function symptomToItem(s) {
  return {
    label: s.name,
    detail: valueDetail([s.duration, s.severity, s.notes])
  };
}

function diagnosisToItem(d) {
  return {
    label: d.name,
    detail: valueDetail([d.since, d.status, d.notes])
  };
}

function medicationToItem(m) {
  return {
    label: m.name,
    detail: valueDetail([m.dosage, m.frequency, m.schedule, m.duration, m.notes, m.quantity]),
    row: {
      medicine: m.name,
      unitPerDose: m.dosage,
      frequency: m.frequency,
      when: m.schedule,
      duration: m.duration,
      note: m.notes
    }
  };
}








export function pastVisits(history) {
  return history.visits.map((visit) => {
    const p = visit.payload;
    const hasDigitalContent =
    p.symptoms.length || p.examinations.length || p.diagnosis.length || p.medications.length;

    const digitalRx = hasDigitalContent ?
    {
      symptoms: p.symptoms.map(symptomToItem),
      examinations: p.examinations.map((e) => ({
        label: e.name,
        detail: valueDetail([e.notes])
      })),
      diagnoses: p.diagnosis.map(diagnosisToItem),
      medications: p.medications.map(medicationToItem),
      advice: Array.isArray(p.advice) ? p.advice : (p.advice ? [p.advice] : []),
      followUp: p.followUp ? `After ${p.followUp}` : "",
      // Resolved referral object (or null). Read-only in the past-visit Rx;
      // never surfaced as a historical sidebar update.
      referral: p.referral ?? null,
      labInvestigations: p.labInvestigation.map((li) => li.name).filter(Boolean),
      vitals: {
        bpSystolic: p.vitalsAndBodyComposition.systolic || undefined,
        bpDiastolic: p.vitalsAndBodyComposition.diastolic || undefined,
        temperature: p.vitalsAndBodyComposition.temperature || undefined,
        heartRate: p.vitalsAndBodyComposition.pulse || undefined,
        respiratoryRate: p.vitalsAndBodyComposition.respiratoryRate || undefined,
        weight: p.vitalsAndBodyComposition.weight || undefined
      },
      additionalNotes: p.others.join(" ")
    } :
    undefined;

    const firstAttachment = visit.attachments?.[0];
    return {
      id: visit.id,
      dateLabel: visit.dateLabel,
      doctorName: visit.doctor?.name ?? firstAttachment?.doctorName,
      doctorSpecialty: visit.doctor?.specialty ?? firstAttachment?.doctorSpecialty,
      digitalRx,
      writtenRx: visit.attachments ?? []
    };
  });
}
// ─── Ophthal (Optal) — pulled from dynamicFields[] ────────────────────────────
//
// The DIGITIZATION_PRESCRIPTION_FIELDS schema treats ophthalmology as a
// custom module under `dynamicFields[]` (see the schema description
// "Opthal module"). Each visit can carry one such entry whose `notes`
// blob is shaped by the doctor's chosen Opthal template.
//
// This adapter walks every visit's dynamicFields[], picks entries whose
// `title` looks ophthal-related, and surfaces them as a flat list of
// dated entries the OptalContent panel can render. The exact OD/OS
// table parsing (Visual Acuity, IOP, Refraction, Slit Lamp, Fundus) is
// done downstream once the real backend payload is wired — for the
// demo we keep the mock-shaped data inline in OptalContent.
//
// Returns: `[{ id, dateLabel, title, notes }]` ordered newest-first.
export function optalEntries(history) {
  const isOpthalTitle = (t) => /opthal|ophthal|optal|eye/i.test(t || "");
  const out = [];
  history.visits.forEach((visit) => {
    (visit.payload.dynamicFields || []).forEach((entry, idx) => {
      if (!isOpthalTitle(entry.title)) return;
      out.push({
        id: `${visit.id || visit.dateLabel}-optal-${idx}`,
        dateLabel: visit.dateLabel,
        title: entry.title,
        notes: entry.notes || "",
      });
    });
  });
  return out;
}
