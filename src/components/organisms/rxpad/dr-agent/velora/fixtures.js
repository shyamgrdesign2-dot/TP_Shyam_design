// All values are invented for UI review. No patient or service data is used.
export const SYNC_AT = '2026-09-24T03:45:00Z';
export const SYNC_LABEL = '24 Sep 2026, 9:15 AM IST';
export const DEMO_PATIENT = 'Aarav Mehta';
export const PREVIEW_STARTERS = [
  { label: "Summarise this patient's record.", short: "Patient summary", intent: "patient_summary" },
  { label: "What medications were recorded?", short: "Medications on record", intent: "medications" },
  { label: "What conditions are recorded?", short: "Conditions on record", intent: "diagnosis" },
  { label: "What advice was given?", short: "Advice on record", intent: "advice" },
].map(s => ({ ...s, wide: s.short, requires: [] }));

function record(id, code, title, eventDate, text, highlight, chips = []) {
  const start = Array.from(text.slice(0, text.indexOf(highlight))).length;
  return { id, evidenceId: id, source_ref: id, code, title, eventDate, text,
    highlights: [[start, start + Array.from(highlight).length]], chips,
    doctorName: 'Dr. Mira Shah (fictional)', departmentName: 'General Medicine',
    visitOrdinal: eventDate === '2026-09-22' ? 3 : eventDate === '2026-06-18' ? 2 : 1,
    visitTotal: 3, tableName: `demo_${code}`, caseId: `DEMO-${eventDate}` };
}
export const RECORDS = [
  record('demo-note', 'consultation', 'Follow-up consultation', '2026-09-22',
    'Fictional consultation. Type 2 diabetes reviewed. Patient reports taking medication regularly. No hypoglycaemic episodes reported. Repeat HbA1c in three months.',
    'Type 2 diabetes reviewed.', [{ label: 'Record', value: 'Consultation note' }]),
  record('demo-hba1c-sep', 'lab_result', 'HbA1c · September', '2026-09-22',
    'Fictional laboratory report. HbA1c: 7.2 %. Laboratory reference range: 4.0–5.6 %. Flag: High.', 'HbA1c: 7.2 %.',
    [{ label: 'Reference', value: '4.0–5.6 %' }, { label: 'Recorded flag', value: 'High' }]),
  record('demo-metformin', 'medicine', 'Recorded prescription', '2026-09-22',
    'Fictional prescription. Metformin 500 mg tablet. Morning: 1; afternoon: 0; evening: 0; night: 1. After meals. Duration: 30 days.', 'Metformin 500 mg tablet.',
    [{ label: 'Schedule', value: '1 / 0 / 0 / 1' }, { label: 'Duration', value: '30 days' }]),
  record('demo-hba1c-jun', 'lab_result', 'HbA1c · June', '2026-06-18',
    'Fictional laboratory report. HbA1c: 7.8 %. Laboratory reference range: 4.0–5.6 %. Flag: High.', 'HbA1c: 7.8 %.'),
  record('demo-hba1c-mar', 'lab_result', 'HbA1c · March', '2026-03-12',
    'Fictional laboratory report. HbA1c: 8.4 %. Laboratory reference range: 4.0–5.6 %. Flag: High.', 'HbA1c: 8.4 %.'),
  record('demo-creatinine', 'lab_result', 'Creatinine', '2026-09-22',
    'Fictional laboratory report. Serum creatinine: 0.9 mg/dL. Laboratory reference range: 0.7–1.3 mg/dL.', 'Serum creatinine: 0.9 mg/dL.',
    [{ label: 'Reference', value: '0.7–1.3 mg/dL' }]),
];
const measurements = { type: 'Measurements', props: { title: 'Recorded measurements', rows: [
  { label: 'HbA1c', value: '7.2', unit: '%', date: '22 Sep 2026', reference: '4.0–5.6 %', flag: 'High', questionable: false, sourceRef: 'demo-hba1c-sep' },
  { label: 'Serum creatinine', value: '0.9', unit: 'mg/dL', date: '22 Sep 2026', reference: '0.7–1.3 mg/dL', flag: '', questionable: false, sourceRef: 'demo-creatinine' },
] }, children: [] };
const prescriptions = { type: 'Prescriptions', props: { title: 'Recorded prescriptions', markdown: '', rows: [
  { name: 'Metformin', date: '22 Sep 2026', dose: '500', unit: 'mg', schedule: [
    { label: 'Morning quantity', value: '1' }, { label: 'Afternoon quantity', value: '0' },
    { label: 'Evening quantity', value: '0' }, { label: 'Night quantity', value: '1' },
    { label: 'Timing', value: 'After meals' }], duration: '30 days', instructions: '', recordedText: '', unitDerived: false, sourceRef: 'demo-metformin' },
] }, children: [] };
const trend = { type: 'Trend', props: { chart: { title: 'HbA1c over time', unit: '%', point_count: 3,
  change: 'Down 1.2 percentage points from March to September.', limitations: ['Three recorded observations; no values between visits.'],
  points: [
    { source_ref: 'demo-hba1c-mar', date: '12 Mar 2026', value: '8.4', y: 8.4 },
    { source_ref: 'demo-hba1c-jun', date: '18 Jun 2026', value: '7.8', y: 7.8 },
    { source_ref: 'demo-hba1c-sep', date: '22 Sep 2026', value: '7.2', y: 7.2 },
  ],
} }, children: [] };

export function buildPreviewAnswer(question) {
  const q = question.toLowerCase();
  const kind = /trend|over time/.test(q) ? 'trend' : /medicat|prescri|dose|metformin/.test(q) ? 'medications' : /lab|result|creatinine/.test(q) ? 'labs' : /condition|diagnos/.test(q) ? 'conditions' : /advice|follow.?up/.test(q) ? 'advice' : /summar|record|overview/.test(q) ? 'summary' : null;
  if (!kind) return { question, unsupported: true };
  const refs = kind === 'trend' ? ['demo-hba1c-mar', 'demo-hba1c-jun', 'demo-hba1c-sep']
    : kind === 'medications' ? ['demo-metformin'] : kind === 'labs' ? ['demo-hba1c-sep', 'demo-creatinine']
    : ['conditions', 'advice'].includes(kind) ? ['demo-note'] : ['demo-note', 'demo-hba1c-sep', 'demo-creatinine', 'demo-metformin'];
  const narrative = kind === 'conditions' ? 'Type 2 diabetes is documented in the latest sample consultation. [1](#evidence-demo-note)' : kind === 'advice' ? 'The sample consultation records advice to repeat HbA1c in three months. [1](#evidence-demo-note)' : kind === 'summary' ? 'Type 2 diabetes was reviewed at the last consultation. The note records regular medication use and no reported hypoglycaemic episodes. [1](#evidence-demo-note)'
    : kind === 'medications' ? 'One prescription is included in this sample. These are recorded instructions; current use has not been confirmed.'
    : kind === 'labs' ? 'Two results were recorded on 22 September. Flags and reference ranges are shown exactly as recorded.'
    : 'Three HbA1c observations are available. Select a plotted value or its citation to inspect the source.';
  const blocks = ['conditions', 'advice'].includes(kind) ? ['narrative'] : kind === 'summary' ? ['narrative', 'measurements', 'prescriptions'] : kind === 'trend' ? ['narrative', 'trend'] : kind === 'labs' ? ['narrative', 'measurements'] : ['narrative', 'prescriptions'];
  const title = { conditions: 'Conditions on record', advice: 'Advice on record', summary: 'Patient summary', medications: 'Medications on record', labs: 'Recent lab results', trend: 'HbA1c trend' }[kind];
  const all = { narrative: { type: 'Narrative', props: { markdown: narrative }, children: [] }, measurements, prescriptions, trend };
  return { question, kind, corpus_updated_at: SYNC_AT, evidence: refs.map(ref => RECORDS.find(r => r.id === ref)),
    ui: { schemaVersion: 'doctor-agent.ui.v1', root: 'response', elements: {
      response: { type: 'Response', props: {}, children: ['card'] },
      card: { type: 'ClinicalCard', props: { title }, children: blocks },
      ...Object.fromEntries(blocks.map(key => [key, all[key]])),
    } } };
}

export function previewReply(question) {
  const result = buildPreviewAnswer(question);
  return result.unsupported ? { text: "This UI preview has sample summaries, medications, conditions, advice, lab results and an HbA1c trend. Try one of those questions." }
    : { text: "Here’s what the fictional sample record shows.", rxOutput: { kind: "chart_answer", data: { preview: result } } };
}
