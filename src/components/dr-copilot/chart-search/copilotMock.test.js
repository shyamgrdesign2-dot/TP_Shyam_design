import { chartAnswer, isCopilotMock, mockListPatients, mockRequest, registerMockPatient } from './copilotMock';

const originalTimeout = global.setTimeout;
beforeEach(() => {
  window.history.replaceState({}, '', '/copilot-v0?veloraMock=0');
  jest.spyOn(global, 'setTimeout').mockImplementation((fn) => originalTimeout(fn, 0));
});
afterEach(() => jest.restoreAllMocks());

async function ask(uid, question) {
  const session = await mockRequest(`/patients/${uid}/sessions`, { method: 'POST' });
  return mockRequest(`/patients/${uid}/ask`, { method: 'POST', body: { session_id: session.session_id, question } });
}

test('catalog demo override does not persist when returning to a live screen', () => {
  localStorage.removeItem('velora:mock');
  expect(isCopilotMock()).toBe(true);
  window.history.replaceState({}, '', '/patient_details?veloraMock=0');
  expect(isCopilotMock()).toBe(false);
  registerMockPatient({ id: 'live-only', label: 'Live patient' });
  return expect(mockRequest('/patients/live-only/starters')).rejects.toMatchObject({ code: 'not_indexed' });
});

test('every appointment patient can answer a summary with patient-bound evidence', async () => {
  const patients = await mockListPatients({ isToday: true });
  expect(patients.length).toBeGreaterThanOrEqual(6);
  for (const patient of patients) {
    const result = await ask(patient.id, "Summarise this patient's record.");
    expect(result.demoSummary.situation.text).toContain(patient.label);
    expect(result.demoSummary.sections.map(s => s.id)).toEqual(['background', 'assessment', 'last-visit']);
    expect(result.evidence.every(row => row.patientUid === patient.id)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    for (const suggestion of result.suggestions) {
      const followUp = await ask(patient.id, suggestion.ask);
      expect(followUp.answer).toBeTruthy();
      expect(followUp.intent).toBe(suggestion.intent);
      expect(followUp.evidence.every(row => row.patientUid === patient.id)).toBe(true);
    }
  }
});

test('an arbitrary selected demo patient keeps their identity and does not borrow demographics', async () => {
  registerMockPatient({ id: 'dummy-today-42', label: 'Mr New Test' });
  const result = await ask('dummy-today-42', 'Summarize this patient');
  expect(result.demoSummary.situation.text).toContain('Mr New Test');
  expect(result.demoSummary.situation.text).not.toContain('year-old');
  expect(result.evidence.every(row => row.patientUid === 'dummy-today-42')).toBe(true);
  expect(result.evidence.find(row => row.code === 'visit').text).toContain('Mr New Test');
});

test('medical history and drug allergy are not mistaken for medication questions', () => {
  const p = { uid: 'test', name: 'Test', age: 45, gender: 'M', conditions: [['Hypertension','2026-10-01']], meds: [], labs: [], bp: [], family: [], allergies: [], visit: { date: '2026-10-01', dept: 'Medicine' } };
  expect(chartAnswer(p, 'Show medical history').intent).toBe('diagnosis');
  expect(chartAnswer(p, 'Any documented drug allergy?').intent).toBe('allergy');
});


test('searchable patients outside today also get their own summary', async () => {
  const patients = await mockListPatients({ search: 'MOCK' });
  expect(patients.length).toBeGreaterThan(6);
  for (const patient of patients.filter(p => !p.isToday)) {
    const result = await ask(patient.id, 'Summarize this patient');
    expect(result.demoSummary.situation.text).toContain(patient.label);
    expect(result.evidence.every(row => row.patientUid === patient.id)).toBe(true);
  }
});

test('a patient cannot append an answer to another patient’s demo session', async () => {
  const session = await mockRequest('/patients/MOCK1001/sessions', { method: 'POST' });
  await expect(mockRequest('/patients/MOCK1002/ask', { method: 'POST', body: { session_id: session.session_id, question: 'Summarize this patient' } })).rejects.toMatchObject({ code: 'not_indexed' });
});


test('latest lab follow-up selects the latest result for each test', async () => {
  const result = await ask('MOCK1002', 'What are the latest lab results?');
  expect(result.answer).toContain('6.8 mIU/L');
  expect(result.answer).not.toContain('5.1 mIU/L');
  expect(result.evidence).toHaveLength(3);
  expect(result.answer).toContain('132 mg/dL');
  expect(result.answer).not.toContain('7.2 mIU/L');
});

test('Sunita has a fuller three-visit overview with isolated sources and ongoing-use evidence', async () => {
  const result = await ask('MOCK1002', 'Summarize this patient');
  expect(result.demoSummary.situation.text).toContain('Sunita Sharma');
  expect(result.demoSummary.situation.text).not.toContain('Arun');
  expect(result.evidence.filter(row=>row.code==='visit').map(row=>row.eventDate)).toEqual(['2026-01-09','2026-04-21','2026-07-21']);
  expect(result.evidence.every(row=>row.patientUid==='MOCK1002')).toBe(true);
  expect(result.evidence.find(row=>row.code==='history').text).toContain('reports ongoing use');
  const check = item => {
    if (!item || typeof item !== 'object') return;
    if (item.sources) item.sources.forEach(number=>expect(result.evidence[number-1]).toBeDefined());
    Object.values(item).forEach(value=> { if (typeof value === 'object') Array.isArray(value) ? value.forEach(check) : check(value); });
  };
  check(result.demoSummary);
  const ramesh = await ask('MOCK1001', 'Summarize this patient');
  expect(JSON.stringify(ramesh.demoSummary)).not.toContain('Sunita');
});
