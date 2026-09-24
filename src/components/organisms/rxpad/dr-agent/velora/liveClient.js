// Session state belongs to the backend; this map only holds its current cursor.
const conversations = new Map();
export const LIVE_TEST_PATIENTS = ['10002026594130', '10002020241797'];
export const isLiveTestPatient = id => LIVE_TEST_PATIENTS.includes(id);

async function request(action, patientId, body) {
  const response = await fetch(`/api/velora/${action}${body ? '' : `?patientId=${encodeURIComponent(patientId)}`}`, {
    cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId, ...body }) } : {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.detail || 'The backend request failed.');
    error.status = response.status;
    throw error;
  }
  return response;
}

export async function readAnswerStream(response, onActivity) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) return response.json();
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary;
      while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + (buffer[boundary] === '\r' ? 4 : 2));
        const lines = frame.split(/\r?\n/);
        const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const raw = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (event === 'error') { const error = new Error(data.detail || 'The backend could not complete the answer.'); error.status = data.status; throw error; }
        if (event === 'activity') onActivity?.(data);
        // Provisional text/UI is withheld until final validation and commit.
        if (event === 'final') return data;
      }
      if (done) throw new Error('The connection ended before the answer was confirmed.');
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function askLivePatient(patientId, question, onActivity) {
  let conversation = conversations.get(patientId);
  if (!conversation) {
    onActivity({ id: 'connect', label: 'Opening the test patient’s chart', status: 'active' });
    conversation = await (await request('session', patientId, {})).json();
    conversations.set(patientId, conversation);
  }
  const previous = conversation.last_request_id || null;
  let result;
  try {
    result = await readAnswerStream(await request('ask', patientId, { sessionId: conversation.session_id, question, parentRequestId: previous }), onActivity);
  } catch (error) {
    // Recover a committed turn after a lost connection; never replay the ask.
    if (!error.status || error.status >= 500 || error.status === 409) {
      const restored = await request('restore', patientId, { sessionId: conversation.session_id }).then(r => r.json()).catch(() => null);
      if (restored) conversations.set(patientId, restored);
      if (restored?.last_request_id !== previous && restored?.last_result?.question === question) result = restored.last_result;
    }
    if (!result) throw error;
  }
  if (!result?.request_id || typeof result.answer !== 'string') throw new Error('The backend returned an unconfirmed answer.');
  conversations.set(patientId, { ...conversation, last_request_id: result.request_id, last_result: result });
  window.dispatchEvent(new CustomEvent('velora:sync', { detail: { patientId, syncedAt: result.corpus_updated_at || null } }));
  return { ...result, patientName: conversation.patient?.patientName || `Test patient ${patientId}`, patientId, live: true };
}
