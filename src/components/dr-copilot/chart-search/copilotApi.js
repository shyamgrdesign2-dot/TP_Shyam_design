import { isCopilotMock, mockRequest } from "./copilotMock";

/**
 * Client for the Copilot search service.
 *
 *   GET  /api/search/auth                          is this doctor's session good
 *   GET  /api/search/patients?q=                   name or MRN lookup
 *   GET  /api/search/patients/{uid}/starters       what this chart can be asked
 *   POST /api/search/patients/{uid}/sessions       open a conversation
 *   POST /api/search/patients/{uid}/ask            ask into that conversation
 *
 * Two things make this a better fit than the archive it replaces.
 *
 * It scopes on `patientUid` - the portal's own patient id - so the chart in
 * Copilot is the chart on screen, with no mapping table and no resolution by
 * name.
 *
 * And it answers in Markdown with `[n](#evidence-n)` citations plus an
 * `evidence[]` array keyed by `source_ref`, which is the shape the answer
 * renderer was written against.
 */

/**
 * Always same-origin, never the service's own host.
 *
 * The service sends no CORS headers at all - its preflight is a bare 405 - so
 * a browser refuses a direct call from any portal origin, deployed or local.
 * The page therefore calls `/copilot-search/*` on its own host and something
 * server-side forwards it: the dev server in development (src/setupProxy.js)
 * and nginx in a deployed build (nginx.conf). Server to server, CORS does not
 * apply.
 *
 * `REACT_APP_COPILOT_SEARCH_URL` still wins, for pointing at a local service.
 */
export const COPILOT_API_BASE =
  process.env.REACT_APP_COPILOT_SEARCH_URL || "/copilot-search/api/search";

const PORTAL_TOKEN_KEY = "persistant.storage.key.auth-token";

/**
 * Which token to send, most specific first.
 *
 *   1. `copilot_search_jwt` in localStorage - a per-browser override
 *   2. `REACT_APP_COPILOT_TOKEN` - a per-environment one, for when the
 *      signed-in doctor is not the one who owns the index
 *   3. the portal's own session token - the real answer, in production
 *
 * (2) exists because the service verifies tokens with a different signing key
 * than the portal environment issues them with. A UAT login's own token is
 * refused as "Invalid or expired bearer token" - byte for byte the answer a
 * forged signature gets - so no UAT session can authenticate on its own, and
 * the token the service does accept is supplied per environment. Once the
 * service trusts the portal's issuer, leave it unset and (3) carries it.
 *
 * The token is never committed. Locally it goes in `.env.dev`, which is
 * gitignored; a deployed build receives it as a Docker build-arg from a CI
 * secret (see Dockerfile and the deploy workflow).
 */
export function getCopilotToken() {
  /* Mock data needs no credentials, and must never send real ones. */
  if (isCopilotMock()) return "mock";
  try {
    const override = window.localStorage.getItem("copilot_search_jwt");
    if (override) return String(override).replace(/^Bearer\s+/i, "");
  } catch (err) {
    /* private window; fall through */
  }

  const fromEnv = process.env.REACT_APP_COPILOT_TOKEN;
  if (fromEnv) return String(fromEnv).replace(/^Bearer\s+/i, "");

  try {
    const raw = window.localStorage.getItem(PORTAL_TOKEN_KEY);
    if (!raw) return "";
    const parsed = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return String(parsed || "").replace(/^Bearer\s+/i, "");
  } catch (err) {
    return "";
  }
}

function headers(json, stream) {
  const token = getCopilotToken();
  return {
    /* Asking for the stream is what makes the service send its working steps
       as it goes; a server or proxy that cannot stream still answers JSON. */
    Accept: stream ? "text/event-stream, application/json" : "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* Longer than the service's slowest real answer, shorter than the proxy's
   120s, so the doctor hears "could not finish" from us rather than a 504. */
export const COPILOT_REQUEST_TIMEOUT_MS = 90 * 1000;

/**
 * Server-sent events, as the service's own chat reads them: blocks split on a
 * blank line, `event:` names the block, `data:` lines are its JSON. `final`
 * is the answer itself, `error` is a failure, anything else (`activity`,
 * `answer`, `charts`) is progress handed to `onEvent`.
 */
async function readEventStream(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let cut;
      while ((cut = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut + (buffer[cut] === "\r" ? 4 : 2));
        const lines = block.split(/\r?\n/);
        const event = (lines.find((l) => l.startsWith("event:")) || "").slice(6).trim();
        const data = lines
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        const parsed = JSON.parse(data);
        if (event === "error") {
          const err = new Error(parsed.detail || "Copilot could not finish that answer.");
          err.code = parsed.status >= 500 || !parsed.status ? "unavailable" : "rejected";
          err.status = parsed.status;
          throw err;
        }
        if (event === "final") return parsed;
        if (onEvent) onEvent(event, parsed);
      }
      if (done) {
        const err = new Error("The connection ended before the answer was confirmed.");
        err.code = "unavailable";
        throw err;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function request(path, { method = "GET", body, signal, onEvent } = {}) {
  /* Demo mode: the same endpoints answered from invented data, in the live
     shapes, so everything above this line runs unchanged. */
  if (isCopilotMock()) return mockRequest(path, { method, body, signal, onEvent });
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, COPILOT_REQUEST_TIMEOUT_MS);
  const forward = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forward, { once: true });
  }

  let res;
  try {
    res = await fetch(`${COPILOT_API_BASE}${path}`, {
      method,
      headers: headers(body !== undefined, !!onEvent),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) {
      const e = new Error("Copilot took too long to answer.");
      e.code = "unavailable";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", forward);
  }

  const fail = (message, code) => {
    const err = new Error(message);
    err.code = code;
    err.status = res.status;
    return err;
  };

  if (res.status === 401 || res.status === 403) {
    throw fail("Velora could not authenticate this session.", "unauthorized");
  }
  /* 404 is not a failure, it is an answer: this patient is not in the index.
     Verified against preprod - the same token that returns 200 for an indexed
     patient returns 404 for one that is not, so it says nothing about auth.
     On /ask it can also mean the session expired server-side; the caller
     tells the two apart by retrying once on a fresh session. */
  if (res.status === 404) {
    throw fail("This patient's record has not been indexed for Copilot yet.", "not_indexed");
  }
  /* The service fails in two ways a doctor can do something about - wait and
     ask again - and neither is theirs to diagnose. 502 is its own "the model
     did not return a complete answer; the turn was not saved", and 504 is the
     proxy giving up on a turn that never finished. */
  if (res.status >= 500) {
    throw fail(`Copilot request failed (${res.status})`, "unavailable");
  }
  if (!res.ok) throw fail(`Copilot request failed (${res.status})`, "rejected");
  if (onEvent && (res.headers.get("content-type") || "").includes("text/event-stream")) {
    return readEventStream(res, onEvent);
  }
  return res.json();
}

/** Whether the current token is accepted. */
export function verifyCopilotAuth({ signal } = {}) {
  return request("/auth", { signal });
}

/**
 * The auth check, done once and shared.
 *
 * `GET /auth` takes no patient - it answers `{ authenticated }` for the token,
 * identically whichever patient is open (verified against preprod), and the
 * service's own UI calls it once on load before a patient is chosen. So it is
 * a per-sign-in check, not a per-patient one:
 *
 *   - called first, the moment a patient page with Copilot loads
 *   - every patient call (`/starters`, `/sessions`, `/ask`) waits for it
 *   - the result is reused for every patient for 30 minutes
 *   - checked again when the token changes, after any 401, or after 30 min
 *
 * An in-flight check is shared, so the top bar and the panel loading together
 * make one `/auth` call, not two.
 */
const AUTH_TTL_MS = 30 * 60 * 1000;
let authState = null; // { token, at, promise }

export function ensureCopilotAuth() {
  const token = getCopilotToken();
  if (!token) {
    const err = new Error("Velora could not authenticate this session.");
    err.code = "unauthorized";
    return Promise.reject(err);
  }
  if (authState && authState.token === token && Date.now() - authState.at < AUTH_TTL_MS) {
    return authState.promise;
  }
  const promise = verifyCopilotAuth().then((res) => {
    if (!res || res.authenticated !== true) {
      const err = new Error("Velora could not authenticate this session.");
      err.code = "unauthorized";
      throw err;
    }
    return true;
  });
  authState = { token, at: Date.now(), promise };
  /* A failed check must not be remembered as the answer for 30 minutes if it
     was the network, and a 401 must be retried once the token changes. */
  promise.catch(() => {
    if (authState && authState.promise === promise) authState = null;
  });
  return promise;
}

/** Forget the auth result; the next patient call checks again. */
export function resetCopilotAuth() {
  authState = null;
}

/* Patient calls go through here: auth first, and a 401 anywhere clears the
   shared result so the following call re-checks rather than trusting it. */
function patientRequest(path, options) {
  return ensureCopilotAuth()
    .then(() => request(path, options))
    .catch((err) => {
      if (err && err.code === "unauthorized") resetCopilotAuth();
      throw err;
    });
}

/**
 * Name search over indexed patients, `{ patients: [{ patientUid, patientName }], hasMore }`.
 *
 * Not used by the portal, deliberately. It is the patient picker of the
 * service's own UI: it matches names loosely ("Hiyaan" also returns
 * "Dhiyaana ...") and cannot look a patient up by id (q=<patientUid> returns
 * nothing). The portal already knows exactly which patient is open and
 * scopes every call by `patientUid`, so resolving by name could only pick the
 * wrong chart.
 */
export function searchCopilotPatients(query, { signal } = {}) {
  return request(`/patients?q=${encodeURIComponent(query)}`, { signal });
}

/**
 * What this particular chart can be asked.
 *
 * The service decides, from what it actually holds: `starters` are the
 * questions worth offering, `availableKinds` the record types behind them,
 * `visitCount` the depth. This is the gate the portal used to guess at with a
 * hardcoded list - the promise that a starter question never dead-ends is the
 * service's to keep now, which is where it belongs.
 */
export function fetchCopilotStarters(patientUid, { signal } = {}) {
  return patientRequest(`/patients/${encodeURIComponent(patientUid)}/starters`, { signal });
}

/** Open a conversation for one patient. Returns `{ session_id, ... }`. */
export function createCopilotSession(patientUid, { signal } = {}) {
  return patientRequest(`/patients/${encodeURIComponent(patientUid)}/sessions`, {
    method: "POST",
    body: {},
    signal,
  });
}

/**
 * The doctor's recent conversations, newest first.
 *
 * Both scopes in one list: each row carries its `mode`, the `patient` it
 * belongs to when it has one, a `preview` of the opening question and
 * `updated_at`. The service keeps them for 30 days, which is why the portal
 * can offer a history at all.
 */
export function listCopilotSessions(offset = 0, { signal } = {}) {
  return patientRequest(`/sessions?offset=${encodeURIComponent(offset)}`, { signal });
}

/**
 * One conversation, whole: `turns[]` of `{ question, result }` plus the mode,
 * patient and `last_request_id` needed to carry on asking in it.
 */
export function restoreCopilotSession(sessionId, { signal } = {}) {
  return patientRequest(`/sessions/${encodeURIComponent(sessionId)}`, { signal });
}

/**
 * Clinic-wide search: a conversation with no patient selected.
 *
 * The service calls this mode Find Patients. It answers questions across the
 * doctor's whole organisation and returns supported patient cards rather than
 * a chart answer: `patients[]` with the exact facts that matched, plus
 * `result_scope` describing how far the search actually reached and
 * `discovery_actions` for Show more.
 *
 * It is a separate conversation from any patient chat and cannot be switched
 * into one; opening a result starts that patient's own conversation.
 */
export function createCopilotDiscoverySession({ signal } = {}) {
  return patientRequest("/discovery/sessions", { method: "POST", body: {}, signal });
}

export function askCopilotDiscovery(
  { sessionId, question, parentRequestId = null, more = false, group = "all" },
  { signal, onEvent } = {}
) {
  return patientRequest("/discovery/ask", {
    method: "POST",
    body: {
      session_id: sessionId,
      question,
      parent_request_id: parentRequestId,
      /* The service runs the saved search again for the next page rather than
         having the model rebuild it, so Show more must not resend criteria. */
      ...(more ? { intent: "discovery_more" } : {}),
      /* Only ever "mine" in demo data: the live service takes no doctor
         scope yet, so nothing extra is sent to it. */
      ...(group === "mine" ? { scope: "mine" } : {}),
    },
    signal,
    onEvent,
  });
}

/**
 * Ask into an open conversation.
 *
 * `parent_request_id` is what threads a follow-up onto the answer before it,
 * so "and what dose?" resolves against the right one rather than the whole
 * chart.
 */
export function askCopilot(
  patientUid,
  { sessionId, question, parentRequestId = null },
  { signal, onEvent } = {}
) {
  return patientRequest(`/patients/${encodeURIComponent(patientUid)}/ask`, {
    method: "POST",
    body: {
      session_id: sessionId,
      question,
      parent_request_id: parentRequestId,
    },
    signal,
    onEvent,
  });
}

/**
 * Join the answer's citations to the records behind them.
 *
 * The answer carries `[n](#evidence-n)` links; `cited_source_refs[n-1]` names
 * the record each one points at, and `evidence[]` holds it. One list keyed by
 * citation number is what lets every claim open the row it came from.
 */
export function buildCopilotEvidence(answer) {
  if (!answer) return [];
  const byRef = new Map();
  for (const ev of answer.evidence || []) {
    const ref = ev && (ev.source_ref || ev.sourcePath || ev.id);
    if (ref) byRef.set(ref, ev);
  }
  return (answer.cited_source_refs || []).map((ref, index) => {
    const ev = byRef.get(ref) || null;
    return {
      number: index + 1,
      sourceRef: ref,
      evidence: ev,
      /* The archive sent a separate `citation` object beside each evidence
         row; this service folds those fields into the row itself. The card,
         the evidence sheet and the vitals/conditions grouping all read
         `row.citation`, so it is projected here rather than teaching four
         call sites about two shapes. */
      citation: ev
        ? {
            source_path: ref,
            resource_kind: ev.code || null,
            section: ev.code || null,
            event_date: ev.eventDate || (ev.eventAt || "").slice(0, 10) || null,
            visit_id: ev.appointmentId || ev.caseId || null,
            provenance: ev.tableName || null,
          }
        : {},
    };
  });
}

/**
 * The records behind a hospital-wide answer, numbered the way the service
 * numbers them.
 *
 * Find Patients cites per patient rather than per sentence: each fact (or a
 * patient's `source_refs`) names a `source_ref`, and `evidence[]` holds that
 * record with its `evidenceId` ("evidence-3" is Source 3). Projected into the
 * same rows the chart answer uses, so the patient list opens the same
 * evidence viewer and a doctor checks a source the same way everywhere.
 */
export function buildDiscoveryEvidence(result) {
  const rows = (result && result.evidence) || [];
  return rows.map((ev, index) => {
    const ref = ev.source_ref || ev.id || ev.sourcePath;
    const fromId = /(\d+)$/.exec(String(ev.evidenceId || ""));
    return {
      number: fromId ? Number(fromId[1]) : index + 1,
      sourceRef: ref,
      evidence: ev,
      citation: {
        source_path: ref,
        resource_kind: ev.code || null,
        section: ev.code || null,
        event_date: ev.eventDate || (ev.eventAt || "").slice(0, 10) || null,
        visit_id: ev.appointmentId || ev.caseId || null,
        provenance: ev.tableName || null,
      },
    };
  });
}
