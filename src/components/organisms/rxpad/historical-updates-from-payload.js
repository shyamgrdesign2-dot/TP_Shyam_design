


function uid() {
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const TARGET_TO_NAV = {
  vitals: "vitals",
  history: "history",
  ophthal: "ophthal",
  gynec: "gynec",
  obstetric: "obstetric",
  vaccine: "vaccine",
  growth: "growth",
  labResults: "labResults",
  medicalRecords: "medicalRecords",
  followUp: "personalNotes"
};

/** Map copy-to-RxPad payload fields → sidebar sections + human-readable lines. */
export function buildHistoricalUpdatesFromPayload(
payload)
{
  const out = {};
  const push = (nav, bullets) => {
    const b = bullets.map((s) => String(s).trim()).filter(Boolean);
    if (!b.length) return;
    if (!out[nav]) out[nav] = [];
    out[nav].push({ id: uid(), bullets: b });
  };

  const vitals = payload.vitals;
  if (vitals && typeof vitals === "object") {
    const parts = [];
    if (vitals.bpSystolic || vitals.bpDiastolic) {
      parts.push(`BP ${vitals.bpSystolic ?? "—"}/${vitals.bpDiastolic ?? "—"}`);
    }
    if (vitals.temperature) parts.push(`Temp ${vitals.temperature}`);
    if (vitals.heartRate) parts.push(`HR ${vitals.heartRate}`);
    if (vitals.respiratoryRate) parts.push(`RR ${vitals.respiratoryRate}`);
    if (vitals.weight) parts.push(`Wt ${vitals.weight}`);
    if (vitals.surgeryProcedure) parts.push(`Procedure: ${vitals.surgeryProcedure}`);
    if (parts.length) push("vitals", [`Vitals update (${payload.sourceDateLabel})`, ...parts]);
  }

  if (payload.labInvestigations?.length) {
    push("labResults", [
    `New investigations (${payload.sourceDateLabel})`,
    ...payload.labInvestigations.map((x) => `• ${x}`)]
    );
  }

  const clinical = [];
  if (payload.symptoms?.length) {
    clinical.push(`Symptoms: ${payload.symptoms.join("; ")}`);
  }
  if (payload.examinations?.length) {
    clinical.push(`Examination: ${payload.examinations.join("; ")}`);
  }
  if (payload.diagnoses?.length) {
    clinical.push(`Diagnosis: ${payload.diagnoses.join("; ")}`);
  }
  if (payload.medications?.length) {
    clinical.push(
      `Medications: ${payload.medications.map((m) => m.medicine).join(", ")}`
    );
  }
  if (payload.advice) clinical.push(`Advice: ${payload.advice}`);
  if (payload.followUpDate || payload.followUpNotes || payload.followUp) {
    clinical.push(
      `Follow-up: ${[payload.followUpDate, payload.followUpNotes || payload.followUp].filter(Boolean).join(" · ")}`
    );
  }
  if (payload.additionalNotes) {
    clinical.push(`Notes: ${payload.additionalNotes}`);
  }

  // Voice / RxPad capture — prefer concise history deltas when the payload carries them.
  const summaries = (payload.historyChangeSummaries ?? []).
  map((s) => String(s).trim()).
  filter(Boolean);
  if (summaries.length) {
    const head = payload.sourceDateLabel ?
    `History update (${payload.sourceDateLabel})` :
    "History update";
    push("history", [
    head,
    ...summaries.map((s) => s.includes("→") || /^added\b/i.test(s) ? s : `Updated: ${s}`)]
    );
  } else if (payload.targetSection === "history" && clinical.length) {
    push("history", [`History update (${payload.sourceDateLabel})`, ...clinical]);
  }

  const target = payload.targetSection;
  if (target && target !== "rxpad") {
    const nav = TARGET_TO_NAV[target];
    if (nav) {
      // Clinical / history summaries already update `history`; skip redundant chunk for the same nav.
      if (nav === "history" && (clinical.length || summaries.length)) {

        /* covered above */} else {
        const lines =
        clinical.length > 0 ?
        clinical.slice(0, 8) :
        payload.labInvestigations?.length ?
        [`Labs: ${payload.labInvestigations.join(", ")}`] :
        [`Synced (${payload.sourceDateLabel})`];
        push(nav, [`Section: ${target}`, ...lines]);
      }
    }
  }

  return out;
}