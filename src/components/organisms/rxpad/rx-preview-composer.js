"use client";

import {
  loadRxPreviewSnapshot,
  useRxPreviewSnapshot } from
"@/src/components/organisms/rxpad/rx-preview-store";

/** Empty snapshot — body renders blank until the doctor fills the RxPad. */
function emptySnapshot(patientId) {
  return {
    patientId,
    updatedAt: new Date().toISOString(),
    symptoms: [],
    examinations: [],
    diagnoses: [],
    labInvestigations: [],
    medications: [],
    advice: [],
    surgeries: [],
    customModules: [],
    followUp: "",
    followUpDate: "",
    additionalNotes: "",
    vitals: [],
    history: [],
    labResults: [],
    gynec: [],
    obstetric: [],
    vaccines: [],
    growth: [],
    optal: []
  };
}

/**
 * Returns a ready-to-render Rx preview snapshot for the given patient.
 * Loads from the live store (memory + localStorage). Sections populate
 * only as the doctor fills the RxPad.
 */
export function getComposedRxPreviewSnapshot(patientId) {
  const base = loadRxPreviewSnapshot(patientId);
  if (!base) return emptySnapshot(patientId);
  return { ...emptySnapshot(patientId), ...base };
}

/** React hook — re-renders when the snapshot updates. */
export function useComposedRxPreviewSnapshot(patientId) {
  const live = useRxPreviewSnapshot(patientId);
  if (!live) return emptySnapshot(patientId);
  return { ...emptySnapshot(patientId), ...live };
}

/** Plain-text summary — used when saving a visit record to the patient. */
export function formatRxSnapshotSummary(snapshot) {
  if (!snapshot) return "No consultation details were captured on this visit.";
  const lines = [];
  const push = (title, rows) => {
    if (!rows?.length) return;
    const body = rows.
    map((r) => r.metaParts?.length ? `${r.title} (${r.metaParts.join(" | ")})` : r.title).
    join("; ");
    lines.push(`${title}: ${body}`);
  };
  push("Symptoms", snapshot.symptoms);
  push("Examination", snapshot.examinations);
  push("Diagnosis", snapshot.diagnoses);
  push("Lab investigation", snapshot.labInvestigations);
  push("Medication", snapshot.medications);
  push("Advice", snapshot.advice);
  push("Surgery", snapshot.surgeries);
  if (snapshot.customModules?.length) {
    snapshot.customModules.forEach((m) => push(m.title, m.rows));
  }
  if (snapshot.followUp?.trim()) lines.push(`Follow-up: ${snapshot.followUp.trim()}`);
  if (snapshot.additionalNotes?.trim()) lines.push(`Notes: ${snapshot.additionalNotes.trim()}`);
  return lines.join("\n") || "Visit completed — no structured Rx sections were filled.";
}
