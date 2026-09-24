import { readFile } from 'node:fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// This adapter is intentionally bound to the explicitly approved test patients.
// The browser never receives the backend credential or chooses an upstream URL.
function settings() {
  return {
    base: process.env.VELORA_BACKEND_URL?.replace(/\/$/, ''),
    patients: new Set((process.env.VELORA_TEST_PATIENT_IDS || '').split(',').filter(Boolean)),
    token: process.env.VELORA_BACKEND_TOKEN,
    tokenFile: process.env.VELORA_BACKEND_TOKEN_FILE,
  };
}

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function dispatch(request, context) {
  const { action } = await context.params;
  const config = settings();
  const url = new URL(request.url);
  const browserOrigin = request.headers.get('origin');
  const expectedOrigin = `${url.protocol}//${request.headers.get('host') || url.host}`;
  if (browserOrigin && browserOrigin !== expectedOrigin) return json({ detail: 'Same-origin requests only.' }, 403);
  if (!['status', 'starters', 'session', 'ask', 'restore'].includes(action)) return json({ detail: 'Unknown operation.' }, 404);
  if (['session', 'ask', 'restore'].includes(action) && request.method !== 'POST') return json({ detail: 'Use POST for this operation.' }, 405);
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch { return json({ detail: 'Invalid request.' }, 400); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ detail: 'Invalid request.' }, 400);
  const patientId = body.patientId || url.searchParams.get('patientId');
  if (!config.patients.has(patientId)) return json({ detail: 'This patient is not enabled for the test backend.' }, 403);
  const configured = Boolean(config.base && (config.token || config.tokenFile));
  if (action === 'status') return json({ configured, patientId });
  if (!configured) return json({ detail: 'The live test backend is not configured.' }, 503);
  const patientPath = `/api/search/patients/${encodeURIComponent(patientId)}`;
  let path, method = 'GET', payload;
  if (action === 'starters') path = `${patientPath}/starters`;
  if (action === 'session') { path = `${patientPath}/sessions`; method = 'POST'; }
  if (action === 'restore') {
    if (!/^[A-Za-z0-9]{13}$/.test(body.sessionId || '')) return json({ detail: 'Invalid session.' }, 400);
    path = `${patientPath}/sessions/${body.sessionId}`;
  }
  if (action === 'ask') {
    if (!/^[A-Za-z0-9]{13}$/.test(body.sessionId || '') || typeof body.question !== 'string' || !body.question.trim() || body.question.length > 20000) return json({ detail: 'Invalid question or session.' }, 400);
    if (body.parentRequestId != null && typeof body.parentRequestId !== 'string') return json({ detail: 'Invalid parent request.' }, 400);
    path = `${patientPath}/ask`; method = 'POST';
    payload = { session_id: body.sessionId, question: body.question, parent_request_id: body.parentRequestId ?? null };
  }
  try {
    const token = config.token || (await readFile(config.tokenFile, 'utf8')).trim();
    const upstream = await fetch(`${config.base}${path}`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(240000),
      headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json', Accept: 'text/event-stream' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    if (!upstream.ok) {
      const messages = { 401: 'The saved backend token is invalid or expired. Update the local token file to reconnect.', 403: 'The token does not grant access to this test patient.', 404: 'No indexed records or conversation were found for this test patient.', 409: 'The conversation changed. Refresh its state before asking again.' };
      return json({ detail: messages[upstream.status] || 'The backend could not complete this request. No sample answer was substituted.' }, upstream.status);
    }
    return new Response(upstream.body, { status: upstream.status, headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no',
    } });
  } catch {
    return json({ detail: 'The backend connection is unavailable. Check the local configuration and try again.' }, 502);
  }
}

export const GET = dispatch;
export const POST = dispatch;
