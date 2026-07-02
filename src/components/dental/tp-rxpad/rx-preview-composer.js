import {
  loadDentalPreviewSnapshot,
  loadRxPreviewSnapshot } from
"./rx-preview-store";

function pushSectionLines(lines, title, rows) {
  if (!rows.length) return;
  const body = rows.
  map((row) => {
    const suffix = row.metaParts.length ?
    ` (${row.metaParts.join(" | ")})` :
    "";
    return `${row.title}${suffix}`;
  }).
  join("; ");
  lines.push(`${title}: ${body}`);
}

/** Plain-text summary saved on the treatment plan after End Visit (from composed Rx snapshot). */
export function formatComposedRxSnapshotSummary(snapshot) {
  if (!snapshot) {
    return "No consultation details were captured on this visit.";
  }
  const lines = [];

  pushSectionLines(lines, "Symptoms", snapshot.symptoms);
  pushSectionLines(lines, "Examination", snapshot.examinations);
  pushSectionLines(lines, "Diagnosis", snapshot.diagnoses);
  pushSectionLines(lines, "Lab investigation", snapshot.labInvestigations);
  pushSectionLines(lines, "Medication", snapshot.medications);
  pushSectionLines(lines, "Advice", snapshot.advice);

  if (snapshot.followUp?.trim()) {
    lines.push(`Follow-up: ${snapshot.followUp.trim()}`);
  }
  if (snapshot.additionalNotes?.trim()) {
    lines.push(`Notes: ${snapshot.additionalNotes.trim()}`);
  }

  if (snapshot.dentalExamination.length) {
    for (const block of snapshot.dentalExamination) {
      const bits = [`Tooth ${block.toothLabel}`];
      for (const item of block.treatmentHistory) {
        const suffix = item.metaParts.length ?
        ` (${item.metaParts.join(" | ")})` :
        "";
        bits.push(`Tx history: ${item.title}${suffix}`);
      }
      for (const item of block.findings) {
        const suffix = item.metaParts.length ?
        ` (${item.metaParts.join(" | ")})` :
        "";
        bits.push(`Finding: ${item.title}${suffix}`);
      }
      for (const item of block.procedures) {
        const suffix = item.metaParts.length ?
        ` (${item.metaParts.join(" | ")})` :
        "";
        bits.push(`Procedure: ${item.title}${suffix}`);
      }
      if (block.overallToothNote?.trim()) {
        bits.push(`Tooth note: ${block.overallToothNote.trim()}`);
      }
      lines.push(bits.join(" · "));
    }
  }

  const out = lines.filter(Boolean).join("\n").trim();
  return out || "Visit completed — no structured Rx sections were filled.";
}

export function getComposedRxPreviewSnapshot(patientId) {
  const base = loadRxPreviewSnapshot(patientId);
  const dental = loadDentalPreviewSnapshot(patientId);

  if (!base && !dental) {
    return null;
  }

  const fallback = {
    patientId,
    updatedAt: new Date().toISOString(),
    symptoms: [],
    examinations: [],
    diagnoses: [],
    labInvestigations: [],
    medications: [],
    advice: []
  };

  const snapshot = base ?? fallback;
  return {
    ...snapshot,
    vitals: [],
    labResults: [],
    dentalUpdatedAt: dental?.updatedAt,
    dentalExamination: dental?.sections ?? []
  };
}