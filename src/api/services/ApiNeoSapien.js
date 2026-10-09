import api from './axiosService';
import config from '../../config';
import { jwtDecode } from 'jwt-decode';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../utils/constants';
import {
  getOrCreateVoiceSessionId,
  neoDebug,
  neoDebugError,
  NEO_TRANSCRIBE_CHUNK_TIMEOUT_MS,
  parseVoiceApiTimeoutMs,
} from '../../utils/neoConsultationUtils';

/** UAT pm-digitization — same host as snap_rx / voice upload elsewhere in the app. */
const neoSapienBaseUrl = {
  customBaseUrl: config.snap_rx_api_url,
  timeout: parseVoiceApiTimeoutMs(process.env.REACT_APP_AMBIENT_RX_TIMEOUT, 300000),
};

const NEO_VOICE_BASE = '/api/v1/digitization/neo-sapien/voice';

/** Dev-console helper — run `window.__inspectNeoVoiceAuth()` in browser. */
export function inspectNeoVoiceAuthState() {
  const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  let token = null;
  let parseError = null;

  try {
    token = raw ? JSON.parse(raw) : null;
  } catch (err) {
    parseError = err?.message || 'JSON parse failed';
  }

  let decoded = null;
  let decodeError = null;
  let isExpired = null;

  if (token) {
    try {
      decoded = jwtDecode(token);
      if (decoded?.exp) {
        isExpired = Date.now() >= decoded.exp * 1000;
      }
    } catch (err) {
      decodeError = err?.message || 'JWT decode failed';
    }
  }

  return {
    storageKey: PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
    hasRawToken: Boolean(raw),
    rawTokenLength: raw?.length ?? 0,
    tokenParsed: Boolean(token),
    parseError,
    decodeError,
    isExpired,
    expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
    issuedAt: decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : null,
    userId: decoded?.result?.user_id ?? decoded?.user_id ?? null,
    doctorUniqueId: decoded?.result?.doctor_unique_id ?? null,
    clinicId: decoded?.result?.clinic_id ?? null,
    tokenPreview: token ? `${String(token).slice(0, 14)}...${String(token).slice(-10)}` : null,
    apiBaseUrl: config.snap_rx_api_url,
    voiceSessionId: typeof window !== 'undefined' ? window.__TATVA_VOICE_SESSION_ID : null,
  };
}

function classifyTranscribeChunk401(authState, responseData) {
  if (!authState.hasRawToken) {
    return 'FRONTEND — no JWT in localStorage (user not logged in or session cleared)';
  }
  if (authState.parseError) {
    return 'FRONTEND — auth token in localStorage is malformed JSON';
  }
  if (authState.decodeError) {
    return 'FRONTEND — auth token is not a valid JWT';
  }
  if (authState.isExpired) {
    return 'FRONTEND — JWT is expired; log out and log in again';
  }
  if (responseData?.message?.toLowerCase?.().includes('jwt')) {
    return 'BACKEND — JWT rejected (signature/issuer/audience may not match UAT)';
  }
  return 'BACKEND — token looks valid on frontend; UAT returned 401 (check backend auth config for neo-sapien/voice)';
}

function logTranscribeChunkAuthDiagnostics(phase, details = {}) {
  const authState = inspectNeoVoiceAuthState();
  const label = `[Neo transcribe-chunk auth] ${phase}`;

  if (phase === '401') {
    const likelyCause = classifyTranscribeChunk401(authState, details.responseData);
    console.group(`${label} — Unauthorized`);
    console.warn('Likely cause:', likelyCause);
    console.table({
      ...authState,
      chunkIndex: details.chunkIndex,
      correlationId: details.correlationId,
      requestUrl: details.fullUrl,
      audioSize: details.audioSize,
      backendStatus: details.status,
      backendCode: details.responseData?.code ?? details.responseData?.error,
      backendMessage: details.responseData?.message ?? details.responseData?.error,
    });
    console.log('Full backend response:', details.responseData);
    console.log(
      'Compare with curl:\n',
      `curl -X POST "${details.fullUrl || TRANSCRIBE_CHUNK_URL}" \\\n`,
      '  -H "Authorization: Bearer $TOKEN" \\\n',
      `  -H "x-correlation-id: ${details.correlationId || '$CID'}" \\\n`,
      `  -F "session_id=${details.correlationId || '$CID'}" \\\n`,
      `  -F "sequence=${details.chunkIndex ?? 0}" \\\n`,
      '  -F "audio=@chunk.webm;type=audio/webm"'
    );
    console.groupEnd();
    return likelyCause;
  }

  console.log(label, {
    ...authState,
    ...details,
    authorizationExpected: 'Bearer <jwt from localStorage>',
    correlationHeader: details.correlationId || authState.voiceSessionId,
  });
  return null;
}

if (typeof window !== 'undefined') {
  window.__inspectNeoVoiceAuth = inspectNeoVoiceAuthState;
}

/** Portal JWT — same token as curl `$TOKEN`. */
function getPortalAuthToken() {
  try {
    const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const TRANSCRIBE_CHUNK_URL =
  `${config.snap_rx_api_url}${NEO_VOICE_BASE}/transcribe-chunk`;

/**
 * POST transcribe-chunk — mirrors curl exactly:
 *   curl -X POST "$URL/transcribe-chunk" \
 *     -H "Authorization: Bearer $TOKEN" \
 *     -H "x-correlation-id: $CID" \
 *     -F "session_id=$CID" \
 *     -F "sequence=0" \
 *     -F "audio=@chunk.webm;type=audio/webm"
 * Uses native fetch (not axios) so headers/body match curl 1:1.
 */
async function postTranscribeChunkFetch(formData, correlationId, token) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    NEO_TRANSCRIBE_CHUNK_TIMEOUT_MS
  );

  try {
    const response = await fetch(TRANSCRIBE_CHUNK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-correlation-id': correlationId,
        // Do NOT set Content-Type — browser sets multipart boundary (same as curl -F)
      },
      body: formData,
      signal: controller.signal,
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(
        responseData?.message
        || responseData?.error
        || `Request failed with status code ${response.status}`
      );
      err.response = { status: response.status, data: responseData };
      throw err;
    }

    return responseData;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutErr = new Error(
        `Transcribe-chunk timed out after ${NEO_TRANSCRIBE_CHUNK_TIMEOUT_MS / 1000}s`
      );
      timeoutErr.code = 'ECONNABORTED';
      throw timeoutErr;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/** Consent object expected by Neo Sapien create API. */
export function buildNeoConsent(ip = '127.0.0.1') {
  return {
    accepted: true,
    given: true,
    timestamp: Date.now(),
    ip: ip || '127.0.0.1',
  };
}

export async function fetchNeoConsentIp() {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    return ipData?.ip || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

function withCorrelationId(sessionId) {
  if (sessionId) {
    window.__TATVA_VOICE_SESSION_ID = sessionId;
  }
  return {
    customBaseUrl: config.snap_rx_api_url,
    headers: sessionId ? { 'x-correlation-id': sessionId } : undefined,
  };
}

const neoJsonConfig = {
  ...neoSapienBaseUrl,
  headers: { 'Content-Type': 'application/json' },
};

export function extractPrescriptionUrl(uploadResponse) {
  const data = uploadResponse?.data ?? uploadResponse;
  return (
    data?.prescriptionUrl
    ?? data?.voice_prescription_url
    ?? data?.audioUrl
    ?? data?.audio_url
    ?? data?.url
    ?? ''
  );
}

/** POST .../voice/upload — full audio after voice create (Pause / recording_finished). */
export async function uploadNeoVoiceAudio(audioFile, options = {}) {
  if (!audioFile || !(audioFile instanceof Blob)) {
    throw new Error('Invalid audio file for Neo upload');
  }

  const fileName = options.fileName || audioFile.name || `neo-${Date.now()}.webm`;
  const formData = new FormData();
  formData.append('file', audioFile, fileName);

  neoDebug('[Neo upload]', { size: audioFile.size, fileName });
  return api.post(`${NEO_VOICE_BASE}/upload`, formData, {
    ...neoSapienBaseUrl,
    timeout: 300000,
  });
}

/**
 * POST .../voice/transcribe-chunk — every ~60s while recording continues (Flow A).
 * Contract (UAT):
 *   Authorization: Bearer <jwt>
 *   x-correlation-id: <uuid>  (same value for whole recording)
 *   Form: session_id=<uuid>, sequence=<n>, audio=@chunk.webm;type=audio/webm
 */
/** Neo device → WAV; browser MediaRecorder → webm. Send correct MIME (curl uses webm for webm files). */
function toTranscribeChunkAudioFile(audioBlob, fileName) {
  const blobType = String(audioBlob.type || '').toLowerCase();
  const isWav = blobType.includes('wav') || /\.wav$/i.test(fileName || '');
  const mimeType = isWav ? 'audio/wav' : 'audio/webm';
  const ext = isWav ? 'wav' : 'webm';
  let resolvedName = fileName || `neo-chunk-${Date.now()}.${ext}`;
  if (isWav && /\.webm$/i.test(resolvedName)) {
    resolvedName = resolvedName.replace(/\.webm$/i, '.wav');
  } else if (!isWav && /\.wav$/i.test(resolvedName)) {
    resolvedName = resolvedName.replace(/\.wav$/i, '.webm');
  } else if (!/\.(webm|wav)$/i.test(resolvedName)) {
    resolvedName = `${resolvedName}.${ext}`;
  }
  if (
    audioBlob instanceof File
    && audioBlob.name === resolvedName
    && audioBlob.type === mimeType
  ) {
    return audioBlob;
  }
  return new File([audioBlob], resolvedName, { type: mimeType });
}

export async function transcribeNeoChunk(audioBlob, options = {}) {
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    throw new Error('Invalid audio chunk for transcription');
  }
  if (audioBlob.size < 100) {
    throw new Error(`Audio chunk too small to transcribe (${audioBlob.size} bytes)`);
  }

  const token = getPortalAuthToken();
  if (!token) {
    throw new Error('Transcribe-chunk requires login — no auth token in localStorage');
  }

  const {
    sessionId = getOrCreateVoiceSessionId(),
    chunkIndex = 0,
    fileName = `neo-chunk-${String(chunkIndex).padStart(6, '0')}.webm`,
  } = options;

  const correlationId = String(sessionId);
  const audioFile = toTranscribeChunkAudioFile(audioBlob, fileName);

  const formData = new FormData();
  formData.append('session_id', correlationId);
  formData.append('sequence', String(chunkIndex));
  formData.append('audio', audioFile, audioFile.name);

  const fullUrl = TRANSCRIBE_CHUNK_URL;

  neoDebug('[Neo transcribe-chunk]', {
    sessionId: correlationId,
    chunkIndex,
    size: audioBlob.size,
    fileName: audioFile.name,
    mimeType: audioFile.type,
    url: fullUrl,
    transport: 'fetch (curl-equivalent)',
  });

  logTranscribeChunkAuthDiagnostics('before-request', {
    chunkIndex,
    correlationId,
    fullUrl,
    audioSize: audioBlob.size,
  });

  try {
    window.__TATVA_VOICE_SESSION_ID = correlationId;
    return await postTranscribeChunkFetch(formData, correlationId, token);
  } catch (error) {
    const status = error?.response?.status;
    const responseData = error?.response?.data;
    const isTimeout =
      error?.code === 'ECONNABORTED'
      || String(error?.message || '').toLowerCase().includes('timeout');
    neoDebugError('[Neo transcribe-chunk] failed', {
      status,
      url: fullUrl,
      sessionId: correlationId,
      chunkIndex,
      size: audioBlob.size,
      isTimeout,
      response: responseData,
      message: error?.message,
    });

    if (status === 401) {
      const likelyCause = logTranscribeChunkAuthDiagnostics('401', {
        chunkIndex,
        correlationId,
        fullUrl,
        audioSize: audioBlob.size,
        status,
        responseData,
      });
      throw new Error(`Transcribe-chunk 401: ${likelyCause}`);
    }
    if (isTimeout) {
      throw new Error(
        `Transcribe-chunk timed out after ${NEO_TRANSCRIBE_CHUNK_TIMEOUT_MS / 1000}s — chunk will retry on next interval`
      );
    }
    if (status === 404) {
      console.error('[Neo transcribe-chunk] 404 response:', responseData);
      throw new Error(
        `Transcribe-chunk returned 404. Backend route or STT service may be missing on UAT. `
        + `Response: ${JSON.stringify(responseData)}. `
        + `Audio sent as ${audioFile.type} (${audioFile.name}, ${audioBlob.size} bytes).`
      );
    }
    throw error;
  }
}

/** POST .../voice/ — create consultation / digitize (no um_id query — JWT only). */
export async function digitizeNeoConsultation(payload = {}, options = {}) {
  const sessionId = options.sessionId || payload.sessionId || getOrCreateVoiceSessionId();

  const rawConsent = payload.consent ?? buildNeoConsent();
  const consent = rawConsent?.given != null || rawConsent?.accepted != null
    ? { ...rawConsent, accepted: true }
    : buildNeoConsent(rawConsent?.ip);

  const body = {
    prescriptionUrls: payload.prescriptionUrls ?? [],
    transcription: payload.transcription ?? payload.text ?? '',
    conversation: payload.conversation ?? [],
    sourceDuration: payload.sourceDuration ?? payload.source_duration ?? 0,
    needConversation: payload.needConversation ?? false,
    version: payload.version ?? 'v2',
    previousContext: payload.previousContext ?? {},
    consent,
  };

  neoDebug('[Neo digitize]', {
    transcriptionLen: body.transcription?.length,
    conversationLines: body.conversation?.length,
    prescriptionUrls: body.prescriptionUrls?.length,
  });

  const response = await api.post(`${NEO_VOICE_BASE}/`, body, {
    ...withCorrelationId(options.correlationId || sessionId),
    timeout: neoSapienBaseUrl.timeout,
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': options.correlationId || sessionId,
    },
  });

  const responseData = response?.data ?? response;
  neoDebug('[Neo digitize] created', {
    id: responseData?.id ?? responseData?.data?.id,
  });

  return response;
}

/** GET .../voice/soap-notes?id= — read stored SOAP (no AI call). */
export async function getNeoSoapNotes(consultationId) {
  if (!consultationId) {
    throw new Error('SOAP notes require consultation id');
  }

  neoDebug('[Neo soap-notes GET]', { consultationId });

  return api.get(`${NEO_VOICE_BASE}/soap-notes`, {
    ...neoSapienBaseUrl,
    params: { id: consultationId },
  });
}

/** POST .../voice/soap-notes?id= — generate + persist when id is set; preview only without id. */
export async function generateNeoSoapNotes(payload = {}, options = {}) {
  const sessionId = options.sessionId || getOrCreateVoiceSessionId();
  const consultationId = options.consultationId || options.consultation_id;

  neoDebug('[Neo soap-notes POST]', {
    consultationId,
    transcriptionLen: payload.transcription?.length,
    conversationLines: payload.conversation?.length,
    encounterCount: payload.digitizeData?.patientEncounters?.length,
  });

  return api.post(`${NEO_VOICE_BASE}/soap-notes`, payload, {
    ...withCorrelationId(sessionId),
    ...neoJsonConfig,
    timeout: neoSapienBaseUrl.timeout,
    params: consultationId ? { id: consultationId } : undefined,
    headers: {
      ...neoJsonConfig.headers,
      ...(sessionId ? { 'x-correlation-id': sessionId } : {}),
    },
  });
}

/** GET .../voice/?id= */
export async function getNeoConsultationById(consultationId) {
  return api.get(`${NEO_VOICE_BASE}/`, {
    ...neoSapienBaseUrl,
    params: { id: consultationId },
  });
}

/**
 * GET .../voice/consultations/today
 * Supports date range + pagination. Legacy: pass a YYYY-MM-DD string as `date`.
 * @param {string|{ startDate?: string, endDate?: string, date?: string, page?: number, limit?: number }} [options]
 */
export async function getTodayConsultations(options) {
  const params = {};

  if (typeof options === 'string') {
    params.date = options;
  } else if (options && typeof options === 'object') {
    const { startDate, endDate, date, page, limit } = options;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    // Legacy single-day `date` only when range params are omitted
    if (date && !startDate && !endDate) params.date = date;
    if (page != null) params.page = page;
    if (limit != null) params.limit = limit;
  }

  return api.get(`${NEO_VOICE_BASE}/consultations/today`, {
    ...neoSapienBaseUrl,
    params: Object.keys(params).length ? params : undefined,
  });
}

function formatNeoVoiceApiError(error) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.message) return String(data.message);
  if (data?.error) return String(data.error);
  return error?.message || 'Request failed';
}

/** PUT .../voice/?id= — update consultation (link patient, copy modules to RxPad). */
export async function putNeoConsultation({
  consultationId,
  patientUniqueId,
  patientLabel,
  patientName,
  previousLabel,
  roomNumber,
  wardTitle,
  admissionId,
  mrno,
  copy,
  review,
  finished,
}) {
  const body = {};

  if (patientUniqueId != null && Number(patientUniqueId) > 0) {
    body.patient_unique_id = patientUniqueId;
  }

  const label = String(patientLabel || patientName || '').trim();
  const priorLabel = String(previousLabel || '').trim();
  const name = String(patientName || patientLabel || '').trim();

  if (label) {
    body.patientLabel = label;
  }
  if (name) {
    body.patientName = name;
  }
  if (priorLabel) {
    body.previousLabel = priorLabel;
  }

  const room = String(roomNumber || '').trim();
  const ward = String(wardTitle || '').trim();
  const admission = String(admissionId || '').trim();
  const medicalRecordNo = String(mrno || '').trim();

  if (room) body.roomNumber = room;
  if (ward) body.wardTitle = ward;
  if (admission) body.admissionId = admission;
  if (medicalRecordNo) body.mrno = medicalRecordNo;

  if (review === true) {
    body.review = true;
  }

  if (finished === true) {
    body.finished = true;
  }

  // Backend expects: `copy` must be a non-empty string OR a non-empty string[].
  if (copy != null) {
    if (typeof copy === 'string') {
      const trimmed = copy.trim();
      if (trimmed) body.copy = trimmed;
    } else if (Array.isArray(copy)) {
      const sanitized = copy.map((v) => (v == null ? '' : String(v).trim())).filter(Boolean);
      if (sanitized.length) body.copy = sanitized;
    } else {
      // eslint-disable-next-line no-console
      console.warn('[putNeoConsultation] Ignoring invalid `copy` type:', typeof copy, copy);
    }
  }

  if (!Object.keys(body).length) {
    throw new Error('PUT requires patient_unique_id, copy, and/or finished');
  }

  neoDebug('[Neo PUT consultation]', {
    consultationId,
    patientUniqueId: body.patient_unique_id,
    patientLabel: label || undefined,
    patientName: name || undefined,
    previousLabel: priorLabel || undefined,
    roomNumber: body.roomNumber,
    wardTitle: body.wardTitle,
    admissionId: body.admissionId,
    mrno: body.mrno,
    review: body.review,
    finished: body.finished,
    copy: body.copy,
  });

  try {
    const result = await api.put(
      `${NEO_VOICE_BASE}/`,
      body,
      {
        ...neoJsonConfig,
        params: { id: consultationId },
      }
    );

    return result;
  } catch (error) {
    const apiMessage = formatNeoVoiceApiError(error);
    throw new Error(apiMessage);
  }
}

/** PUT .../voice/?id= — link consultation encounter to a hospital patient. */
export async function matchNeoConsultationPatient(params) {
  return putNeoConsultation({ ...params, review: true });
}

/**
 * Flow A — chunked live recording (preferred):
 * 1. Accumulate transcript via /transcribe-chunk during recording
 * 2. POST / with prescriptionUrls: [] + merged transcript/conversation
 *
 * Flow B upload (optional): pass uploadAudioAfterCreate: true
 */
export async function processNeoRecording({
  audioBlob,
  sessionId: sessionIdOverride,
  transcription = '',
  conversation = [],
  sourceDuration = 0,
  consent,

  previousContext = {},
  fileName: fileNameOverride,
  uploadAudioAfterCreate = false,
}) {
  const sessionId = sessionIdOverride || getOrCreateVoiceSessionId();
  const fileName = fileNameOverride || `neo-${Date.now()}.webm`;
  const digitizeStartedAt = Date.now();

  neoDebug('[Neo process] Flow A start', {
    sessionId,
    transcriptionLen: transcription?.length,
    conversationLines: conversation?.length,
    uploadAudioAfterCreate,
  });

  let resolvedDuration = sourceDuration;
  if (!resolvedDuration && audioBlob) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      resolvedDuration = Math.round(audioBuffer.duration);
      await audioContext.close?.();
    } catch {
      resolvedDuration = 0;
    }
  }

  if (!String(transcription || '').trim() && !(conversation?.length)) {
    throw new Error('Voice create requires transcript and conversation from transcribe-chunk');
  }

  const resolvedConsent = consent?.given != null || consent?.accepted != null
    ? { ...consent, accepted: true }
    : buildNeoConsent(consent?.ip);

  const digitizeResponse = await digitizeNeoConsultation(
    {
      prescriptionUrls: [],
      transcription,
      conversation,
      sourceDuration: resolvedDuration,
      needConversation: conversation?.length > 0,
      consent: resolvedConsent,
      version: 'v2',
      previousContext,
    },
    { sessionId, correlationId: sessionId }
  );

  const voiceApiLatencyMs = Date.now() - digitizeStartedAt;

  let prescriptionUrl = '';
  let prescriptionUrls = [];

  if (uploadAudioAfterCreate && audioBlob) {
    neoDebug('[Neo process] Flow B — uploading audio after create');
    const audioFile =
      audioBlob instanceof File
        ? audioBlob
        : new File([audioBlob], fileName, { type: audioBlob?.type || 'audio/webm' });
    const uploadResponse = await uploadNeoVoiceAudio(audioFile, { fileName });
    prescriptionUrl = extractPrescriptionUrl(uploadResponse);
    prescriptionUrls = prescriptionUrl ? [prescriptionUrl] : [];
  }

  return {
    prescriptionUrl,
    prescriptionUrls,
    digitizeResponse,
    correlationId: sessionId,
    sessionId,
    sourceDuration: resolvedDuration,
    voiceApiLatencyMs,
  };
}

const extractConsultationId = (latestResponse = {}) =>
  latestResponse?._id ||
  latestResponse?.id ||
  latestResponse?.data?._id ||
  latestResponse?.data?.id ||
  null;

/** POST .../voice/consultations/latest */
async function getLatestNeoVoiceConsultation(patientUniqueId) {
  if (!patientUniqueId) {
    throw new Error("patient_unique_id is required");
  }

  try {
    const response = await api.post(
      `${NEO_VOICE_BASE}/consultations/latest`,
      { patient_unique_id: patientUniqueId },
      neoSapienBaseUrl
    );

    return response?.data?.data ?? response?.data ?? response;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function fetchNeoVoiceConsultationForPatient(patientUniqueId) {
  const latest = await getLatestNeoVoiceConsultation(patientUniqueId);
  if (!latest) return null;

  if (latest?.digitizeData) {
    return latest;
  }

  const consultationId = extractConsultationId(latest);
  if (!consultationId) {
    return null;
  }

  const response = await getNeoConsultationById(consultationId);
  return response?.data?.data ?? response?.data ?? response;
}

/** End Visit — mark latest unfinished Neo consultation finished. */
export async function markLatestNeoVoiceConsultationFinishedForPatient(patientUniqueId) {
  if (!patientUniqueId) return null;

  const latest = await getLatestNeoVoiceConsultation(patientUniqueId);
  const consultationId = extractConsultationId(latest);
  if (!consultationId) return null;

  return putNeoConsultation({ consultationId, finished: true });
}
