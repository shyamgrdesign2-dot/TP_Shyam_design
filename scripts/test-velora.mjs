import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET } from '../src/app/api/velora/[action]/route.js';
import { readAnswerStream } from '../src/components/organisms/rxpad/dr-agent/velora/liveClient.js';
import { normalizeLiveResult } from '../src/components/organisms/rxpad/dr-agent/velora/normalizeLiveResult.js';
import { buildPreviewAnswer } from '../src/components/organisms/rxpad/dr-agent/velora/fixtures.js';

test('proxy binds patient, preserves browser origin through Next, and contains credentials', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  try {
    process.env.VELORA_BACKEND_URL = 'https://backend.example';
    process.env.VELORA_TEST_PATIENT_IDS = '10002026594130';
    process.env.VELORA_BACKEND_TOKEN = 'synthetic-unit-test-secret';
    const ctx = { params: Promise.resolve({ action: 'session' }) };
    const request = (patientId, origin = 'http://127.0.0.1:3010') => new Request('http://localhost:3010/api/velora/session', {
      method: 'POST', headers: { Host: '127.0.0.1:3010', Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId }),
    });
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://backend.example/api/search/patients/10002026594130/sessions');
      assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-test-secret');
      return Response.json({ session_id: 'abc123ABC456d' }, { status: 201 });
    };
    assert.equal((await POST(request('not-approved'), ctx)).status, 403);
    assert.equal((await POST(request('10002026594130', 'https://other.example'), ctx)).status, 403);
    assert.equal((await GET(new Request('http://localhost:3010/api/velora/session?patientId=10002026594130'), ctx)).status, 405);
    const response = await POST(request('10002026594130'), ctx);
    assert.equal(response.status, 201);
    assert.equal((await response.text()).includes('synthetic-unit-test-secret'), false);
    globalThis.fetch = async () => new Response('', { status: 401 });
    assert.equal((await POST(request('10002026594130'), ctx)).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});

test('split SSE frames deliver activity but expose only the confirmed answer', async () => {
  const input = 'event: activity\r\ndata: {"label":"Reading records","status":"active"}\r\n\r\nevent: answer\ndata: {"answer":"provisional"}\n\nevent: final\ndata: {"request_id":"confirmed","answer":"Verified"}\n\n';
  const bytes = new TextEncoder().encode(input);
  let cursor = 0;
  const stream = new ReadableStream({ pull(controller) {
    if (cursor >= bytes.length) return controller.close();
    controller.enqueue(bytes.slice(cursor, cursor += 7));
  } });
  const activity = [];
  const result = await readAnswerStream(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }), step => activity.push(step));
  assert.equal(result.answer, 'Verified');
  assert.deepEqual(activity, [{ label: 'Reading records', status: 'active' }]);
  await assert.rejects(() => readAnswerStream(new Response('event: answer\ndata: {"answer":"unfinished"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } })), /confirmed/);
  await assert.rejects(() => readAnswerStream(new Response('event: error\ndata: {"detail":"Authentication failed","status":401}\n\n', { headers: { 'Content-Type': 'text/event-stream' } })), /Authentication failed/);
});

test('backend normalization retains evidence identity and falls back without inventing clinical values', () => {
  const result = normalizeLiveResult({ answer: 'Recorded finding [1](#evidence-1)', ui: { schemaVersion: 'unsupported' }, evidence: [{ id: 'row-7', evidenceId: 'evidence-1', text: 'Exact source' }] });
  assert.equal(result.ui.elements.narrative.props.markdown, 'Recorded finding [1](#evidence-1)');
  assert.equal(result.evidence[0].id, 'row-7');
  assert.equal(result.evidence[0].evidenceId, 'evidence-1');
  assert.deepEqual(result.evidence[0].highlights, []);
  assert.equal(result.corpus_updated_at, undefined);
});

test('all six sample card variants reference evidence belonging to their own answer', () => {
  for (const question of ['summary', 'medications', 'labs', 'HbA1c trend', 'conditions', 'advice']) {
    const result = buildPreviewAnswer(question, 'Test patient');
    const refs = new Set(result.evidence.map(row => row.source_ref));
    for (const node of Object.values(result.ui.elements)) {
      for (const row of node.props.rows || []) assert(refs.has(row.sourceRef));
      for (const point of node.props.chart?.points || []) assert(refs.has(point.source_ref));
    }
    for (const row of result.evidence) for (const [start, end] of row.highlights) assert(start >= 0 && end > start && end <= Array.from(row.text).length);
  }
});

test('evidence text highlights preserve Unicode and merge overlapping source ranges', async () => {
  const { evidenceTextParts } = await import('../src/components/organisms/rxpad/dr-agent/velora/evidenceText.js');
  const text = 'A 🩺 finding: diabetes.';
  const parts = evidenceTextParts(text, [[14, 22], [13, 18], [-1, 2], [0, 999]]);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.deepEqual(parts.filter(part => part.highlighted).map(part => part.text), ['diabetes.']);
  assert.deepEqual(evidenceTextParts('<script>x</script>', []), [{ text: '<script>x</script>', highlighted: false }]);
});
