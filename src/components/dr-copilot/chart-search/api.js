/**
 * Client for the Chart Search archive (Turbo Buffer) at
 * https://pm-turbopuffer-uat.tatvacare.in.
 *
 * The endpoint streams Server-Sent Events rather than returning JSON, so the
 * reader below parses the event framing by hand: `event: stage` lines report
 * retrieval progress, and a single `event: answer` carries the whole grounded
 * result.
 *
 * CORS, verified against the UAT service: it allows http://localhost:5173,
 * https://pmdoctorportal.tatvacare.in and its own origin, and rejects
 * http://localhost:3007 - the portal's own dev port - with "Disallowed CORS
 * origin". So in development the calls go same-origin through the dev
 * server's proxy (src/setupProxy.js), which forwards them; server-to-server
 * has no CORS. A build talks to the archive directly, as before.
 */

export const CHART_SEARCH_BASE_URL =
  process.env.REACT_APP_CHART_SEARCH_URL ||
  (process.env.NODE_ENV === "development"
    ? "/chart-search"
    : "https://pm-turbopuffer-uat.tatvacare.in");

const TOKEN_STORAGE_KEY = "chart_search_jwt";

/**
 * The archive is a separate service with its own doctor session, so it needs a
 * JWT minted for that environment rather than the portal's own login. Kept in
 * localStorage so a tester can paste one in without a rebuild.
 */
export function getChartSearchToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch (err) {
    return "";
  }
}

export function setChartSearchToken(token) {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, String(token || "").replace(/^Bearer\s+/i, ""));
  } catch (err) {
    /* storage unavailable (private window); the caller re-prompts */
  }
}

function authHeaders() {
  const token = getChartSearchToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Look a patient up in the doctor's organisation by name or MRN. */
export async function searchPatients(query, { signal } = {}) {
  const res = await fetch(`${CHART_SEARCH_BASE_URL}/patients/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query }),
    signal,
  });
  if (!res.ok) throw new Error(`Patient search failed (${res.status})`);
  return res.json();
}

/**
 * Ask a grounded question about one patient's record.
 *
 * Resolves with the parsed `answer` payload. `onStage` is called for each
 * retrieval stage so the UI can show what the archive is doing rather than an
 * anonymous spinner.
 */
export async function askChartSearch(
  { question, mrn, patientId, history = [], sessionId = null, context = {} },
  { signal, onStage } = {}
) {
  const res = await fetch(`${CHART_SEARCH_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      question,
      /* One identifier, not both.
         Either scopes the archive on its own - verified against UAT, an MRN
         and a patient_id return the same answer - but sending both narrows to
         their intersection, and an id from a different environment turns a
         good MRN into "nothing is indexed for this patient". So the MRN wins
         when there is one, and the portal's patient_unique_id is the fallback.
         Never a name: "Saurabh" matches four different people in this one
         organisation, and picking one silently is how a doctor ends up
         reading somebody else's chart. */
      context: {
        scope_kind: "patient",
        ...(mrn ? { mrn } : patientId ? { patient_id: String(patientId) } : {}),
        ...context,
      },
      history,
      session_id: sessionId,
    }),
    signal,
  });

  if (res.status === 401) {
    const err = new Error("Chart Search session has expired. Paste a fresh token.");
    err.code = "unauthorized";
    throw err;
  }
  if (!res.ok || !res.body) throw new Error(`Chart Search failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = null;

  // SSE frames are separated by a blank line; a frame may arrive split across
  // chunks, so only complete frames are consumed and the tail is carried over.
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let split;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);

      let eventName = "message";
      const dataLines = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;

      let payload;
      try {
        payload = JSON.parse(dataLines.join("\n"));
      } catch (err) {
        continue; // a frame we cannot read should not kill the stream
      }

      if (eventName === "stage" && onStage) onStage(payload);
      if (eventName === "answer") answer = payload;
    }
  }

  if (!answer) throw new Error("Chart Search returned no answer.");
  return answer;
}

/**
 * Join the answer's evidence to its citations.
 *
 * `segments[].citation_numbers` are 1-based indices into `citations`, and each
 * citation shares `source_path` with the evidence row that backs it. Returning
 * one list keyed by citation number is what lets every claim in the answer link
 * to the dated record it came from.
 */
export function buildCitedEvidence(answer) {
  if (!answer) return [];
  const evidenceByPath = new Map();
  for (const ev of answer.evidence || []) {
    if (ev && ev.source_path) evidenceByPath.set(ev.source_path, ev);
  }
  return (answer.citations || []).map((citation, index) => ({
    number: index + 1,
    citation,
    evidence: evidenceByPath.get(citation.source_path) || null,
  }));
}
