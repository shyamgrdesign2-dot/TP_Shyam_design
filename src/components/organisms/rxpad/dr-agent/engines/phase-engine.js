// ─────────────────────────────────────────────────────────────
// Consult Phase State Machine
// Infers consultation phase from latest user actions
// ─────────────────────────────────────────────────────────────



const PHASE_KEYWORDS = {
  symptoms_entered: ["symptom", "fever", "cough", "pain", "complaint", "sx"],
  dx_accepted: ["accept", "dx", "diagnosis", "differential", "ddx", "protocol"],
  meds_written: ["med", "drug", "prescription", "rx", "advice", "translate"],
  near_complete: ["completeness", "final", "follow-up", "follow up", "f/u", "done"],
  empty: []
};

export function inferPhase(
messages,
currentPhase)
{
  if (messages.length === 0) return "empty";

  // Find last user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return currentPhase;

  const text = lastUserMsg.text.toLowerCase();

  // Find last assistant message with rxOutput
  const lastAssistantOutput = [...messages].reverse().find((m) => m.role === "assistant" && m.rxOutput);

  // Check if DDX was accepted (assistant showed DDX and user responded)
  if (lastAssistantOutput?.rxOutput?.kind === "ddx" && currentPhase === "symptoms_entered") {
    return "dx_accepted";
  }

  // Check if meds were shown (protocol_meds card)
  if (lastAssistantOutput?.rxOutput?.kind === "protocol_meds" && currentPhase === "dx_accepted") {
    return "meds_written";
  }

  // Keyword-based inference
  for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
    if (phase === "empty") continue;
    if (keywords.some((kw) => text.includes(kw))) {
      return phase;
    }
  }

  // Progression: don't go backwards
  const ORDER = ["empty", "symptoms_entered", "dx_accepted", "meds_written", "near_complete"];
  const currentIdx = ORDER.indexOf(currentPhase);

  // If text has content and we're still in empty, move to symptoms_entered
  if (currentPhase === "empty" && text.length > 0) {
    return "symptoms_entered";
  }

  return currentPhase;
}

export function getPhaseLabel(phase) {
  const labels = {
    empty: "Getting started",
    symptoms_entered: "Symptoms captured",
    dx_accepted: "Diagnosis accepted",
    meds_written: "Medications written",
    near_complete: "Nearly complete"
  };
  return labels[phase];
}