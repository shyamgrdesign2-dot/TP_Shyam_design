/**
 * Local Neo integration — ws_server.py on the same Mac as the React dev server.
 * Default gateway: http://localhost:3021 (proxies WS + digitization + recordings).
 * Neo BLE server (ws_server.py) listens on :8081 when reached directly.
 */

const NEO_DEBUG_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.REACT_APP_NEO_DEBUG === "true";

export const neoDebug = (...args) => {
  if (NEO_DEBUG_ENABLED) {
    console.log("[NeoDebug]", new Date().toISOString(), ...args);
  }
};

export const neoDebugWarn = (...args) => {
  if (NEO_DEBUG_ENABLED) {
    console.warn("[NeoDebug]", new Date().toISOString(), ...args);
  }
};

export const neoDebugError = (...args) => {
  console.error("[NeoDebug]", new Date().toISOString(), ...args);
};

/** Send this much recorded audio to transcribe-chunk while capture continues (~60s per API guide). */
export const NEO_CHUNK_INTERVAL_MS = 60000;

/** HTTP timeout for transcribe-chunk — must exceed transcription latency (not chunk length). */
export const NEO_TRANSCRIBE_CHUNK_TIMEOUT_MS = 120000;

/** Env values ≤1000 are treated as seconds (e.g. REACT_APP_AMBIENT_RX_TIMEOUT=45 → 45000ms). */
export const parseVoiceApiTimeoutMs = (raw, fallbackMs = 300000) => {
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs;
  if (parsed < 1000) return parsed * 1000;
  return parsed;
};

const NEO_VOICE_SESSION_ID_KEY = "neo_voice_digitize_session_id";

/** ?id= on local POST /digitization/voice (env or last API response). */
export const getNeoVoiceSessionId = () => {
  if (process.env.REACT_APP_NEO_VOICE_SESSION_ID) {
    return process.env.REACT_APP_NEO_VOICE_SESSION_ID;
  }
  try {
    return sessionStorage.getItem(NEO_VOICE_SESSION_ID_KEY) || "";
  } catch {
    return "";
  }
};

export const setNeoVoiceSessionId = (id) => {
  if (!id) return;
  try {
    sessionStorage.setItem(NEO_VOICE_SESSION_ID_KEY, String(id));
  } catch {
    /* ignore */
  }
};

/** Fresh x-correlation-id / session_id per recording (guide: one UUID per session). */
export const createNewVoiceCorrelationId = () => {
  if (process.env.REACT_APP_NEO_VOICE_SESSION_ID) {
    return process.env.REACT_APP_NEO_VOICE_SESSION_ID;
  }
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `neo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  setNeoVoiceSessionId(id);
  if (typeof window !== "undefined") {
    window.__TATVA_VOICE_SESSION_ID = id;
  }
  return id;
};

export const getOrCreateVoiceSessionId = () => {
  const existing = getNeoVoiceSessionId();
  if (existing) return existing;
  return createNewVoiceCorrelationId();
};

export const isNeoEnabled = () =>
  process.env.REACT_APP_NEO_ENABLED === "true" ||
  process.env.REACT_APP_NEO_USE_LOCAL_PROXY === "true";

export const NEO_SAPIEN_ROUTE_PREFIXES = ["/tatva-pendant", "/neo-consult"];

export const isNeoSapienRoute = (pathname = "") =>
  NEO_SAPIEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export const CREDENTIAL_ALERT_PATTERN =
  /mci|mrc|certificate|doctor credentials|validate your doctor|click to upload/i;

export function clearGlobalCredentialAlerts() {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll(".ant-message-notice, .ant-notification-notice")
    .forEach((node) => {
      if (CREDENTIAL_ALERT_PATTERN.test(node.textContent || "")) {
        node.remove();
      }
    });
}

export const NEO_DEVICE_HTTP = "http://localhost:8081";

export const NEO_WS_PHASE = {
  IDLE: "idle",
  WS_OPEN: "ws_open",
  SCANNING: "scanning",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECORDING: "recording",
  PROCESSING: "processing",
  READY: "ready",
  ERROR: "error",
  DISCONNECTED: "disconnected",
  SCAN_NO_DEVICE: "scan_no_device",
  CONNECT_FAILED: "connect_failed",
  PAIRING: "pairing",
  PAIRED: "paired",
};

const NEO_PAIRED_DEVICE_KEY = "neo_paired_device";

export const getStoredPairedDevice = () => {
  try {
    const raw = localStorage.getItem(NEO_PAIRED_DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredPairedDevice = (device) => {
  try {
    if (!device) {
      localStorage.removeItem(NEO_PAIRED_DEVICE_KEY);
      return;
    }
    localStorage.setItem(NEO_PAIRED_DEVICE_KEY, JSON.stringify(device));
  } catch {
    /* ignore */
  }
};

export const clearStoredPairedDevice = () => setStoredPairedDevice(null);

export const rssiToBars = (rssi) => {
  if (rssi == null || Number.isNaN(rssi)) return 0;
  if (rssi >= -55) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  if (rssi >= -85) return 1;
  return 0;
};

export const rssiToLabel = (rssi) => {
  const bars = rssiToBars(rssi);
  return ["Out of range", "Weak", "Fair", "Good", "Excellent"][bars];
};

/**
 * Parse battery fields from ws_server device_state / status events.
 * UI must display battery_pct (0–100), not battery_mv.
 */
export const parseNeoBatteryFromMessage = (msg = {}) => {
  let batteryPct;
  if (typeof msg.battery_pct === "number") {
    batteryPct = msg.battery_pct;
  } else if (typeof msg.battery_percent === "number") {
    batteryPct = msg.battery_percent;
  } else if (typeof msg.batteryPercent === "number") {
    batteryPct = msg.batteryPercent;
  }

  let isCharging;
  if (msg.is_charging != null) {
    isCharging = Boolean(msg.is_charging);
  } else if (msg.isCharging != null) {
    isCharging = Boolean(msg.isCharging);
  }

  const batteryMv =
    typeof msg.battery_mv === "number"
      ? msg.battery_mv
      : typeof msg.batteryMv === "number"
        ? msg.batteryMv
        : undefined;

  return { batteryPct, isCharging, batteryMv };
};

const TODAY_CAPTURED_EXTRA_KEY = "neo_tp_today_captured_sec";
const TODAY_CAPTURED_DATE_KEY = "neo_tp_today_date";
const LAST_RECORDING_START_KEY = "neo_tp_last_recording_start";

const getTodayDateKey = () => {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

/** Extra seconds captured today not yet reflected in consultations API (cleared after refetch). */
export const getTodayCapturedExtraSeconds = () => {
  try {
    const today = getTodayDateKey();
    if (sessionStorage.getItem(TODAY_CAPTURED_DATE_KEY) !== today) return 0;
    return Number(sessionStorage.getItem(TODAY_CAPTURED_EXTRA_KEY)) || 0;
  } catch {
    return 0;
  }
};

export const addTodayCapturedExtraSeconds = (seconds = 0) => {
  const delta = Math.max(0, Math.round(Number(seconds) || 0));
  if (!delta) return;
  try {
    const today = getTodayDateKey();
    const current = getTodayCapturedExtraSeconds();
    sessionStorage.setItem(TODAY_CAPTURED_DATE_KEY, today);
    sessionStorage.setItem(TODAY_CAPTURED_EXTRA_KEY, String(current + delta));
  } catch {
    /* optional */
  }
};

export const clearTodayCapturedExtraSeconds = () => {
  try {
    sessionStorage.setItem(TODAY_CAPTURED_DATE_KEY, getTodayDateKey());
    sessionStorage.removeItem(TODAY_CAPTURED_EXTRA_KEY);
  } catch {
    /* optional */
  }
};

export const setLastRecordingStartedAt = (timestamp) => {
  if (!timestamp) return;
  try {
    sessionStorage.setItem(LAST_RECORDING_START_KEY, String(timestamp));
  } catch {
    /* optional */
  }
};

export const getLastRecordingStartedAt = () => {
  try {
    const value = sessionStorage.getItem(LAST_RECORDING_START_KEY);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
};

const isNeoLocalGatewayEnabled = () =>
  process.env.REACT_APP_NEO_USE_LOCAL_PROXY === "true";

/** ws_server.py HTTP origin — always :8081 (CORS *), never CRA proxy. */
export const getNeoDeviceHttpBase = () => {
  const fromEnv = process.env.REACT_APP_NEO_DEVICE_API_URL;
  return (fromEnv || NEO_DEVICE_HTTP).replace(/\/$/, "");
};

/**
 * WebSocket URL → ws_server.py on :8081.
 * Default: direct ws://localhost:8081/ws (same Mac, no proxy needed).
 * Set REACT_APP_NEO_WS_USE_PROXY=true to use CRA /neo-ws → :8081 instead.
 */
export const getNeoWsUrl = () => {
  if (process.env.REACT_APP_NEO_WS_URL) {
    return process.env.REACT_APP_NEO_WS_URL;
  }

  const useProxy =
    process.env.REACT_APP_NEO_WS_USE_PROXY === "true" &&
    isNeoLocalGatewayEnabled() &&
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined";

  if (useProxy) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/neo-ws`;
  }

  return "ws://localhost:8081/ws";
};

/** GET /recordings list — direct to ws_server :8081 (avoids broken CRA proxy). */
export const getNeoRecordingsListUrl = () =>
  `${getNeoDeviceHttpBase()}/recordings`;

/** Build absolute URL for a server-relative recording path. */
export const getNeoRecordingFetchUrl = (fileUrl) => {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }
  const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${getNeoDeviceHttpBase()}${path}`;
};

export const wavBase64ToBlob = (wavBase64, mimeType = "audio/wav") => {
  const binary = atob(wavBase64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes.buffer], { type: mimeType });
};

export const normalizeNeoSpeaker = (speaker = "") => {
  const value = String(speaker).toLowerCase();
  if (value.includes("doctor") || value.includes("dr")) return "Doctor";
  if (value.includes("patient")) return "Patient";
  return speaker || "Unknown";
};

export const formatConversationToTranscription = (conversation = []) => {
  return conversation
    .filter((line) => line?.text)
    .map((line) => {
      const speaker = normalizeNeoSpeaker(line.speaker);
      return `${speaker}: ${line.text}`;
    })
    .join(" ");
};

export const createNeoRecordingSession = (sessionId) => ({
  sessionId,
  chunkIndex: 0,
  transcription: "",
  previousTranscript: "",
  conversation: [],
  prescriptionUrls: [],
  recordingStartedAt: Date.now(),
  chunkInFlight: false,
});

const normalizeConversationLine = (item) => {
  if (!item) return null;
  if (typeof item === "string") {
    return { speaker: "Unknown", text: item };
  }
  const text = item.text ?? item.content ?? item.message ?? "";
  if (!text) return null;
  return {
    speaker: normalizeNeoSpeaker(item.speaker || item.role || "unknown"),
    text: String(text),
  };
};

const conversationLinesEqual = (a, b) =>
  a?.speaker === b?.speaker && a?.text === b?.text;

/** Append incremental lines, or replace when API returns a cumulative transcript array. */
export const mergeConversationLines = (existing = [], incoming = []) => {
  if (!incoming?.length) return existing;
  if (!existing?.length) return incoming;

  let prefixMatch = true;
  for (let i = 0; i < existing.length; i += 1) {
    if (!incoming[i] || !conversationLinesEqual(existing[i], incoming[i])) {
      prefixMatch = false;
      break;
    }
  }
  if (prefixMatch && incoming.length >= existing.length) {
    return incoming;
  }

  const merged = [...existing];
  incoming.forEach((line) => {
    if (!merged.some((item) => conversationLinesEqual(item, line))) {
      merged.push(line);
    }
  });
  return merged;
};

export const mergeChunkTranscriptResponse = (session, chunkResponse) => {
  const root = chunkResponse?.data ?? chunkResponse;
  const data = root?.data ?? root;

  const chunkText =
    data?.transcription
    ?? data?.transcriptText
    ?? root?.transcription
    ?? chunkResponse?.transcription
    ?? "";

  const rawConversation =
    data?.transcript
    ?? data?.conversation
    ?? root?.transcript
    ?? root?.conversation
    ?? chunkResponse?.transcript
    ?? chunkResponse?.conversation
    ?? [];

  let newLines = [];
  if (Array.isArray(rawConversation)) {
    newLines = rawConversation.map(normalizeConversationLine).filter(Boolean);
  } else if (typeof rawConversation === "string" && rawConversation.trim()) {
    newLines = [{ speaker: "Unknown", text: rawConversation.trim() }];
  }

  if (newLines.length === 0 && chunkText) {
    newLines = [{ speaker: "Unknown", text: String(chunkText).trim() }];
  }

  let conversation = mergeConversationLines(session.conversation || [], newLines);

  // Some chunks return only a plain transcription string (no transcript array).
  if (chunkText && newLines.length === 0) {
    const chunk = String(chunkText).trim();
    const covered = conversation.some(
      (line) => line.text === chunk || line.text.includes(chunk) || chunk.includes(line.text)
    );
    if (chunk && !covered) {
      conversation = [...conversation, { speaker: "Unknown", text: chunk }];
    }
  }

  const transcription = formatConversationToTranscription(conversation);

  return {
    conversation,
    transcription,
    previousTranscript: transcription,
    chunkIndex: (session.chunkIndex || 0) + 1,
    // Keep the recording CID stable — x-correlation-id / session_id must not change mid-session.
    sessionId: session.sessionId,
    chunkInFlight: false,
  };
};

export const sessionHasTranscript = (session) => {
  if (!session) return false;
  return Boolean(
    session.conversation?.length
    || String(session.transcription || "").trim()
    || String(session.previousTranscript || "").trim()
  );
};

export const getSessionTranscriptPayload = (session) => {
  const conversation = session?.conversation || [];
  const transcription =
    formatConversationToTranscription(conversation)
    || String(session?.transcription || session?.previousTranscript || "").trim();
  return { conversation, transcription };
};

export const neoStatusStateToPhase = (state, currentPhase) => {
  switch (state) {
    case "scanning":
      return NEO_WS_PHASE.SCANNING;
    case "connecting":
      return NEO_WS_PHASE.CONNECTING;
    case "connected":
    case "already_connected":
      return NEO_WS_PHASE.CONNECTED;
    case "scan_no_device":
      return NEO_WS_PHASE.SCAN_NO_DEVICE;
    case "connect_failed":
      return NEO_WS_PHASE.CONNECT_FAILED;
    case "disconnected":
    case "not_connected":
      return NEO_WS_PHASE.DISCONNECTED;
    case "idle":
      if (
        currentPhase === NEO_WS_PHASE.RECORDING ||
        currentPhase === NEO_WS_PHASE.PROCESSING
      ) {
        return currentPhase;
      }
      return NEO_WS_PHASE.WS_OPEN;
    default:
      return currentPhase;
  }
};

export const deviceStateLabel = (phase, deviceStatus) => {
  switch (phase) {
    case NEO_WS_PHASE.CONNECTED:
    case NEO_WS_PHASE.RECORDING:
    case NEO_WS_PHASE.PROCESSING:
    case NEO_WS_PHASE.READY:
    case NEO_WS_PHASE.PAIRED:
      return "Neo connected";
    case NEO_WS_PHASE.SCANNING:
      return "Searching for Neo…";
    case NEO_WS_PHASE.PAIRING:
      return "Pairing Neo…";
    case NEO_WS_PHASE.CONNECTING:
    case NEO_WS_PHASE.WS_OPEN:
      return "Connecting…";
    case NEO_WS_PHASE.SCAN_NO_DEVICE:
      return "Neo not found";
    case NEO_WS_PHASE.CONNECT_FAILED:
      return "Connect failed";
    case NEO_WS_PHASE.DISCONNECTED:
      return "Neo disconnected";
    case NEO_WS_PHASE.ERROR:
      return "Neo server unreachable";
    default:
      return deviceStatus ? `Neo: ${deviceStatus}` : "Initializing…";
  }
};

export const isNeoDeviceConnected = (phase) =>
  [
    NEO_WS_PHASE.CONNECTED,
    NEO_WS_PHASE.RECORDING,
    NEO_WS_PHASE.PROCESSING,
    NEO_WS_PHASE.READY,
  ].includes(phase);

export const extractDigitizeResult = (digitizeResponse) => {
  const responseData = digitizeResponse?.data ?? digitizeResponse;
  const actualData = responseData?.data ?? responseData?.response ?? responseData;

  const digitizeDataRaw =
    actualData?.digitizeData
    ?? responseData?.digitizeData
    ?? actualData?.history?.[0]?.digitize
    ?? null;

  const transcription =
    actualData?.transcription
    ?? responseData?.transcription
    ?? actualData?.history?.[0]?.transcription
    ?? responseData?.history?.[0]?.transcription
    ?? "";

  const conversation =
    actualData?.conversation
    ?? responseData?.conversation
    ?? [];

  const recordId =
    actualData?.id
    ?? responseData?.id
    ?? actualData?._id
    ?? responseData?._id
    ?? "";

  const review = actualData?.review ?? responseData?.review ?? false;

  let patientEncounters = [];
  if (digitizeDataRaw?.patientEncounters && Array.isArray(digitizeDataRaw.patientEncounters)) {
    patientEncounters = digitizeDataRaw.patientEncounters;
  } else if (Array.isArray(digitizeDataRaw)) {
    patientEncounters = digitizeDataRaw;
  } else if (digitizeDataRaw && typeof digitizeDataRaw === "object") {
    patientEncounters = [digitizeDataRaw];
  }

  return {
    recordId,
    transcription,
    conversation,
    review,
    digitizeData: digitizeDataRaw,
    patientEncounters,
    raw: actualData || responseData,
  };
};

export const matchEncountersToAppointments = (encounters, appointments) => {
  const list = Array.isArray(appointments) ? appointments : [];
  return (encounters || []).map((encounter, index) => {
    const patientUniqueId = Number(encounter?.patient_unique_id) || 0;
    const matchedAppointment =
      patientUniqueId > 0
        ? list.find(
            (appt) => Number(appt?.patient_unique_id) === patientUniqueId
          )
        : null;
    const candidates = encounter?.dbMatchCandidates || [];
    const candidateMatch =
      !matchedAppointment && candidates.length === 1
        ? list.find(
            (appt) =>
              Number(appt?.patient_unique_id) ===
              Number(candidates[0]?.patient_unique_id)
          )
        : null;

    return {
      encounter,
      index,
      patientUniqueId,
      matchedAppointment: matchedAppointment || candidateMatch || null,
      isMatched: !!(matchedAppointment || candidateMatch),
    };
  });
};

const formatList = (items, key = "name") => {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => item?.[key] || item?.lineItem || "")
    .filter(Boolean)
    .join(", ");
};

export const formatEncounterConsultationText = (encounter) => {
  if (!encounter) return "";
  const name =
    encounter?.patientDetails?.name ||
    encounter?.patientLabel ||
    "Unknown patient";
  const lines = [`Patient: ${name}`];

  const symptoms = formatList(encounter?.symptoms);
  if (symptoms) lines.push(`Symptoms: ${symptoms}`);

  const diagnosis = formatList(encounter?.diagnosis);
  if (diagnosis) lines.push(`Diagnosis: ${diagnosis}`);

  const medications = (encounter?.medications || [])
    .map((m) => m?.lineItem || m?.name)
    .filter(Boolean)
    .join("; ");
  if (medications) lines.push(`Medications: ${medications}`);

  const examinations = formatList(encounter?.examinations);
  if (examinations) lines.push(`Examination: ${examinations}`);

  const labInvestigation = formatList(encounter?.labInvestigation);
  if (labInvestigation) lines.push(`Investigations: ${labInvestigation}`);

  if (encounter?.evidence?.length) {
    lines.push(`Evidence: ${encounter.evidence.join(" ")}`);
  }

  return lines.join("\n");
};

export const getHospitalPatientsFromAppointments = (appointments) => {
  const seen = new Set();
  const patients = [];
  (appointments || []).forEach((appt) => {
    const id = appt?.patient_unique_id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    patients.push({
      patient_unique_id: id,
      pm_fullname: appt?.pm_fullname,
      pm_salutation: appt?.pm_salutation,
      pm_contact_no: appt?.pm_contact_no,
      pam_id: appt?.pam_id,
      record: appt,
    });
  });
  return patients.sort((a, b) =>
    (a.pm_fullname || "").localeCompare(b.pm_fullname || "")
  );
};

/**
 * Maps a single Neo patientEncounter to the `caseManagerData` shape that
 * Prescription.js uses to hydrate all Rx modules via its useEffect.
 *
 * Prescription module IDs:
 *  1  = Vitals (left panel)
 *  5  = Symptoms
 *  10 = Examination
 *  11 = Diagnosis
 *  12 = Medications
 *  15 = Follow-up / advice
 */
export const mapNeoEncounterToCaseManagerData = (encounter) => {
  if (!encounter) return null;

  // ── symptoms ──────────────────────────────────────────────────────────────
  const symptoms = (encounter.symptoms || [])
    .map((s) => {
      const name = s?.name || s?.lineItem;
      if (!name) return null;
      return {
        symptom_name: name,
        since: s.duration || "",
        severity: s.severity || "",
        note: s.notes || "",
      };
    })
    .filter(Boolean);

  // ── examination ───────────────────────────────────────────────────────────
  const examination = (encounter.examinations || [])
    .map((e) => {
      const name = e?.name || e?.lineItem;
      if (!name) return null;
      return { examination_name: name, note: "" };
    })
    .filter(Boolean);

  // ── diagnosis ─────────────────────────────────────────────────────────────
  const diagnosis = (encounter.diagnosis || [])
    .map((d) => {
      const name = d?.name || d?.lineItem;
      if (!name) return null;
      return {
        tds_name: name,
        since: d.duration || "",
        status: d.status || "",
        note: d.notes || "",
        icd_code: d.icdCode || d.icd_code || "",
      };
    })
    .filter(Boolean);

  // ── vitals ────────────────────────────────────────────────────────────────
  // Prescription.js stores vitals as an array of rows; each row is one visit
  // measurement. We build a single row from the Neo encounter.
  const v = encounter.vitalsAndBodyComposition;
  const vitals = v
    ? [
        {
          blood_press: v.bloodPressure || "",
          systolic: v.bloodPressure ? (v.bloodPressure.split("/")[0] || "") : "",
          diastolic: v.bloodPressure ? (v.bloodPressure.split("/")[1] || "") : "",
          pulse: v.pulse || "",
          spo2: v.spo2 || "",
          temperature: v.temperature || "",
          resp_rate: v.respiratoryRate || "",
          height: v.height || "",
          weight: v.weight || "",
          bmi: v.bmi || "",
          blood_sugar: v.randomBloodSugar || "",
        },
      ]
    : [];

  // ── advice ────────────────────────────────────────────────────────────────
  // Prescription.js expects `advice` as an array of { advice_name } AND
  // `visit_advice` as a free-text fallback that fills the "Additional notes"
  // section. We populate both — the dedicated Advice module will pick up the
  // array while the visit-notes will receive the joined text.
  const adviceLines = (encounter.advice || [])
    .map((a) => a?.name || a?.lineItem || String(a))
    .filter(Boolean);
  const advice = adviceLines.map((a) => ({ advice_name: a }));
  const visit_advice = adviceLines.join("\n");

  // ── investigations ────────────────────────────────────────────────────────
  // Prescription.js expects `investigation` as an array of { investigation_name }
  const investigation = (encounter.labInvestigation || [])
    .map((l) => {
      const name = l?.name || l?.lineItem;
      if (!name) return null;
      return { investigation_name: name };
    })
    .filter(Boolean);

  // Follow-up date — Neo emits a free-text follow-up; we keep it as-is
  // and the prescription page's "follow_up_date" field will receive it.
  const follow_up_date = encounter.followUp || "";

  return {
    symptoms,
    examination,
    diagnosis,
    vitals,
    advice,
    investigation,
    visit_advice,
    follow_up_date,
    // medicine is intentionally omitted; medication autofill requires
    // matching drug IDs from the backend catalogue which we don't have locally.
    // The doctor can review medications on the Neo Consult page and copy them.
  };
};

/**
 * Per-section autofill — returns a `caseManagerData` object with ONLY the
 * requested section populated. Used by the section-level "Move to Rx Pad"
 * action so the doctor can copy a single module (e.g. just symptoms) into
 * the prescription without touching the others.
 *
 * `section` is one of:
 *   "symptoms" | "examinations" | "diagnosis" | "vitals" |
 *   "labInvestigation" | "advice"
 */
export const mapNeoSectionToCaseManagerData = (section, encounter) => {
  if (!encounter || !section) return null;
  const full = mapNeoEncounterToCaseManagerData(encounter) || {};
  const empty = {
    symptoms: [],
    examination: [],
    diagnosis: [],
    vitals: [],
    advice: [],
    investigation: [],
    visit_advice: "",
    follow_up_date: "",
  };

  switch (section) {
    case "symptoms":
      return { ...empty, symptoms: full.symptoms || [] };
    case "examinations":
      return { ...empty, examination: full.examination || [] };
    case "diagnosis":
      return { ...empty, diagnosis: full.diagnosis || [] };
    case "vitals":
      return { ...empty, vitals: full.vitals || [] };
    case "labInvestigation":
    case "investigations":
      return { ...empty, investigation: full.investigation || [] };
    case "advice":
      // Advice + follow-up share the "Advice & Follow-up" card in Neo, so
      // copying that card includes both fields for the prescription page.
      return {
        ...empty,
        advice: full.advice || [],
        visit_advice: full.visit_advice || "",
        follow_up_date: full.follow_up_date || "",
      };
    default:
      return null;
  }
};

export const copyTextToClipboard = async (text) => {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
};
