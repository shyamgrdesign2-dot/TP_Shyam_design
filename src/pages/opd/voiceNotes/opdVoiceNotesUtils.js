import { digitizationToSections } from "../../../components/dr-agent/voicerx/utils/result-formatters";

const COPY_MODULE_TO_SECTION = {
  all: "all",
  vitals: "vitals",
  examination: "examinations",
  examinations: "examinations",
  symptoms: "symptoms",
  diagnosis: "diagnosis",
  medications: "medications",
  medicine: "medications",
  advice: "advice",
  investigations: "lab-investigation",
  investigation: "lab-investigation",
  "lab-investigation": "lab-investigation",
  labinvestigation: "lab-investigation",
  lab_investigation: "lab-investigation",
};

const SECTION_FIELD = {
  vitals: "vitals_and_body_composition",
  symptoms: "symptoms",
  examinations: "examinations",
  diagnosis: "diagnosis",
  medications: "medications",
  "medical-history": "medical_history",
  "lab-investigation": "lab_investigation",
  advice: "advice",
  "follow-up": "follow_up",
  others: "others",
};

function resolveCopySectionId(moduleName) {
  const normalized = String(moduleName || "").trim().toLowerCase();
  return COPY_MODULE_TO_SECTION[normalized] || normalized;
}

function copyAllowsSection(copy, sectionId) {
  if (!Array.isArray(copy) || !copy.length) return false;
  if (copy.some((value) => resolveCopySectionId(value) === "all")) return true;
  return copy.some((value) => resolveCopySectionId(value) === sectionId);
}

function pickDigitizationForCopy(digitization, copy = []) {
  if (!digitization || copy.some((value) => resolveCopySectionId(value) === "all")) {
    return digitization;
  }

  const picked = {};
  copy.forEach((module) => {
    const field = SECTION_FIELD[resolveCopySectionId(module)];
    if (field && digitization[field] != null) {
      picked[field] = digitization[field];
    }
  });

  return Object.keys(picked).length ? picked : digitization;
}

export const extractConsultationCopy = (consultation = {}) => {
  const raw = consultation?.digitizeData?.copy;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(Boolean))];
};

const normalizeOpdStructuredData = (flat = {}) => ({
  symptoms: flat.symptoms || [],
  examinations: flat.examination || flat.examinations || [],
  diagnosis: flat.diagnosis || [],
  medications: flat.medications || flat.medicine || [],
  medical_history: flat.medicalHistory || flat.medical_history || [],
  // Neo Sapien digitize payloads use camelCase `labInvestigation`.
  lab_investigation:
    flat.labInvestigation
    || flat.investigations
    || flat.lab_investigation
    || [],
  advice: flat.advice || [],
  surgeries: flat.surgeries || [],
  vitals_and_body_composition:
    flat.vitalsAndBodyComposition
    || flat.vitals
    || flat.vitals_and_body_composition
    || null,
  follow_up: flat.followUp || flat.follow_up || "",
  others: flat.others || [],
});

export const extractOpdVoiceDigitization = (consultation = {}) =>
  normalizeOpdStructuredData(consultation?.digitizeData || {});

function normalizeConversationTurn(turn) {
  if (typeof turn === "string") {
    const text = turn.trim();
    return text ? { speaker: "Speaker", text } : null;
  }
  if (!turn || typeof turn !== "object") return null;

  const text = String(turn.text ?? turn.message ?? turn.content ?? "").trim();
  if (!text) return null;

  const speaker = String(turn.speaker ?? turn.role ?? "Speaker").trim() || "Speaker";
  return { speaker, text };
}

function buildConversationSegments(consultation = {}) {
  const digitizeData = consultation?.digitizeData || {};
  const raw = digitizeData.conversation;
  if (!Array.isArray(raw) || !raw.length) return [];

  const body = raw.map(normalizeConversationTurn).filter(Boolean);
  if (!body.length) return [];

  const createdAt = consultation?.updatedAt || consultation?.createdAt || new Date().toISOString();
  const durationMs =
    Math.max(0, Number(consultation?.sourceDurationInSeconds ?? digitizeData?.sourceDurationInSeconds ?? 0)) *
    1000;

  return [
    {
      id: "neo-conversation",
      body,
      mode: "ambient_consultation",
      durationMs,
      createdAt,
      moduleName: "Clinical Notes",
      isDoctorAgent: true,
    },
  ];
}

export const extractVoiceTranscript = (consultation = {}) => {
  const conversationSegments = buildConversationSegments(consultation);
  if (conversationSegments.length) {
    return { transcript: "", transcriptSegments: conversationSegments };
  }

  const digitizeData = consultation?.digitizeData || {};
  const transcription = digitizeData.transcription || "";
  if (!transcription) {
    return { transcript: "", transcriptSegments: [] };
  }

  const durationMs =
    Math.max(0, Number(consultation?.sourceDurationInSeconds ?? digitizeData?.sourceDurationInSeconds ?? 0)) *
    1000;

  return {
    transcript: transcription,
    transcriptSegments: [
      {
        id: "neo-dictation",
        body: transcription,
        mode: "dictation_consultation",
        durationMs,
        createdAt: consultation?.updatedAt || consultation?.createdAt || new Date().toISOString(),
        moduleName: "Clinical Notes",
        isDoctorAgent: true,
      },
    ],
  };
};

export const buildVoiceStructuredCardData = (digitization, copy = []) => {
  const scopedDigitization = pickDigitizationForCopy(digitization, copy);
  // No copied modules yet → show every available section so the doctor can
  // pick what to copy. Once `copy` is set, scope to those modules only.
  const hasCopyFilter = Array.isArray(copy) && copy.length > 0;
  const sections = digitizationToSections(digitization)
    .filter(
      (section) =>
        section?.items?.length
        && (!hasCopyFilter || copyAllowsSection(copy, section.id))
    )
    .map((section) => ({
      sectionId: section.id,
      title: section.title,
      tpIconName: section.tpIconName,
      items: section.items.map((item) =>
        typeof item === "string"
          ? { name: item, detail: "" }
          : { name: item?.name ?? "", detail: item?.detail ?? "" }
      ),
    }));

  return {
    sections,
    copyAllPayload: scopedDigitization ? { digitization: scopedDigitization } : undefined,
  };
};
