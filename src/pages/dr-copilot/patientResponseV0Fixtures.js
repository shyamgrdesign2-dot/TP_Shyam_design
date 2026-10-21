import { FILLED_PATIENT_OVERVIEW, FILLED_PATIENT_SOURCES } from './filledPatientOverviewFixture';
import complete from './completeConsultationFixture.json';
import { todayInIndia } from './prescriptionWindow';
import { COMPACT_OVERVIEW, overviewWithMedications, COMPACT_HISTORY, ATTENTION_OVERVIEW, ATTENTION_SOURCES } from './compactSummaryFixtures';
// Synthetic design-review fixtures only. Never imported by the live answer pipeline.
export const REVIEW_SOURCES = [
  { id:'patient-profile', title:'Demographics · 19 Oct 2026', date:'2026-10-19', resourceKind:'Patient profile', text:'Synthetic design-review patient: age 45 years on 19 October 2026; gender recorded as male. This profile is separate from any live patient.' },
  { id: 'visit-jan', title: 'Prescription · 12 Jan 2026', date: '2026-01-12', text: 'Synthetic visit: blood pressure 148/92 mmHg; weight 78 kg. Type 2 diabetes and hypertension documented. Metformin 500 mg once daily for 30 days. HbA1c 8.4%; creatinine 1.1 mg/dL.' },
  { id: 'visit-apr', title: 'Prescription · 20 Apr 2026', date: '2026-04-20', text: 'Synthetic visit: blood pressure 142/88 mmHg; weight 77 kg. Metformin 500 mg twice daily for 30 days. HbA1c 8.0%; creatinine 1.0 mg/dL.' },
  { id: 'visit-jul', title: 'Prescription · 14 Jul 2026', date: '2026-07-14', text: 'Synthetic visit: blood pressure 138/86 mmHg; weight 76 kg. Metformin 500 mg twice daily and amlodipine 5 mg once daily, each for 30 days. HbA1c 7.7%; creatinine 1.1 mg/dL.' },
  { id: 'visit-sep', title: 'Prescription · 22 Sept 2026', date: '2026-09-22', text: 'Synthetic consultation: routine diabetes follow-up. Type 2 diabetes and hypertension recorded. Blood pressure 136/84 mmHg; weight 75 kg. Recorded assessment: glycaemic control reviewed. Recorded plan: repeat HbA1c in three months. Metformin 500 mg, twice daily after meals, 30 days. Amlodipine 5 mg, once daily, 30 days. Current use was not confirmed. No allergy status recorded.' },
  { id: 'lab-sep', title: 'Lab record · 22 Sept 2026', date: '2026-09-22', text: 'Synthetic lab record: HbA1c 7.4% (lab reference 4.0–5.6%; flagged high); creatinine 1.0 mg/dL (0.7–1.3 mg/dL); haemoglobin 14.0 g/dL (13.0–17.0 g/dL). Reference ranges are supplied by this example lab record, not treatment targets.' },
];

const dates = ['2026-01-12', '2026-04-20', '2026-07-14', '2026-09-22'];
const sourceIds = ['visit-jan', 'visit-apr', 'visit-jul', 'visit-sep'];
const points = (values, sourceOverride) => dates.map((date, index) => ({ date, value: values[index], sourceId: sourceOverride && index === 3 ? sourceOverride : sourceIds[index] }));
export const REVIEW_SERIES = {
  vital: [
    { id: 'systolic', name: 'Systolic BP', unit: 'mmHg', points: points([148, 142, 138, 136]) },
    { id: 'diastolic', name: 'Diastolic BP', unit: 'mmHg', points: points([92, 88, 86, 84]) },
    { id: 'weight', name: 'Weight', unit: 'kg', points: points([78, 77, 76, 75]) },
  ],
  lab: [
    { id: 'hba1c', name: 'HbA1c', unit: '%', points: points([8.4, 8.0, 7.7, 7.4], 'lab-sep') },
    { id: 'creatinine', name: 'Creatinine', unit: 'mg/dL', points: points([1.1, 1.0, 1.1, 1.0], 'lab-sep') },
  ],
};
export const REVIEW_EXAMPLES = [
  { id: 'summary', label: 'Patient summary', family: 'Summary', title: 'Patient overview', icon: 'clipboard-activity', question: 'Summarize this patient before the consultation.', rationale: 'A concise Situation, historical Background and observation-only Assessment, with source evidence.', sources: [...sourceIds, 'lab-sep', 'patient-profile', 'medical-history'] },
  { id: 'vital', label: 'Vital trends', family: 'Trend', title: 'Vital trends', icon: 'heart', question: 'Show me this patient’s vital trends.', rationale: 'Select one measurement at a time so different units never share an axis. Every plotted point has a date and source.', sources: sourceIds },
  { id: 'lab', label: 'Lab trends', family: 'Trend', title: 'Lab trends', icon: 'clipboard-activity', question: 'How has this patient’s HbA1c changed?', rationale: 'Dated numeric observations support a chart. A single or missing observation stays as an honest text response in the same card.', sources: ['visit-jan', 'visit-apr', 'visit-jul', 'lab-sep'] },
  { id: 'labs', label: 'Lab records', family: 'Table', title: 'Latest lab records', icon: 'clipboard-activity', question: 'Show me the latest lab results.', rationale: 'A compact table preserves dates, units, record-supplied reference ranges and sources.', sources: ['lab-sep'] },
  { id: 'meds', label: 'Current medications', family: 'Table', title: 'Current prescription window', icon: 'note-2', question: 'What medications is this patient taking?', rationale: 'Prescription details are displayed with their date. A prescription does not establish current use, adherence or continuation.', sources: ['visit-sep'] },
];

export const REVIEW_OVERVIEW = COMPACT_OVERVIEW;

export const REVIEW_MEDICATIONS = [
  { id: 'met-jan', medicationKey: 'metformin-oral', name: 'Metformin', strength: '500 mg', schedule: 'Once daily', start: '2026-01-12', durationDays: 30, sourceId: 'visit-jan' },
  { id: 'met-apr', medicationKey: 'metformin-oral', name: 'Metformin', strength: '500 mg', schedule: 'Twice daily', start: '2026-04-20', durationDays: 30, sourceId: 'visit-apr' },
  { id: 'met-jul', medicationKey: 'metformin-oral', name: 'Metformin', strength: '500 mg', schedule: 'Twice daily', start: '2026-07-14', durationDays: 30, sourceId: 'visit-jul' },
  { id: 'amlo-jul', medicationKey: 'amlodipine-oral', name: 'Amlodipine', strength: '5 mg', schedule: 'Once daily', start: '2026-07-14', durationDays: 30, sourceId: 'visit-jul' },
  { id: 'met-sep', medicationKey: 'metformin-oral', name: 'Metformin', strength: '500 mg', schedule: 'Twice daily · after meals', start: '2026-09-22', durationDays: 30, sourceId: 'visit-sep' },
  { id: 'amlo-sep', medicationKey: 'amlodipine-oral', name: 'Amlodipine', strength: '5 mg', schedule: 'Once daily', start: '2026-09-22', durationDays: 30, sourceId: 'visit-sep' },
].map(record => {
  const prescription = record.sourceId === 'visit-sep'
    ? complete.prescriptionData.medications.find(item => item.name === record.name)
    : null;
  return {
    ...record,
    dosage: prescription?.dosage || record.strength,
    frequency: prescription?.frequency || record.schedule,
    timing: prescription?.schedule,
  };
});

export const REVIEW_SUMMARIES = { history: COMPACT_HISTORY };

export const REVIEW_VISITS = [
  { id: 'visit-sep', date: '2026-09-22', title: 'Diabetes follow-up', bp: '136/84 mmHg', weight: '75 kg', assessment: 'Glycaemic control reviewed.' },
  { id: 'visit-jul', date: '2026-07-14', title: 'Recorded consultation', bp: '138/86 mmHg', weight: '76 kg' },
  { id: 'visit-apr', date: '2026-04-20', title: 'Recorded consultation', bp: '142/88 mmHg', weight: '77 kg' },
  { id: 'visit-jan', date: '2026-01-12', title: 'Recorded consultation', bp: '148/92 mmHg', weight: '78 kg' },
];

// Verbatim excerpts from REVIEW_SOURCES; no fabricated symptoms, exams or orders.
const writtenSections = {
  'visit-sep': { diagnosis:['Type 2 diabetes and hypertension recorded.'], medication:['Metformin 500 mg, twice daily after meals, 30 days.','Amlodipine 5 mg, once daily, 30 days.'], vitals:['Blood pressure 136/84 mmHg; weight 75 kg.'], notes:['routine diabetes follow-up.','Recorded assessment: glycaemic control reviewed.','Recorded plan: repeat HbA1c in three months.','Current use was not confirmed.','No allergy status recorded.'] },
  'visit-jul': { medication:['Metformin 500 mg twice daily and amlodipine 5 mg once daily, each for 30 days.'], vitals:['blood pressure 138/86 mmHg; weight 76 kg.'], notes:['HbA1c 7.7%; creatinine 1.1 mg/dL.'] },
  'visit-apr': { medication:['Metformin 500 mg twice daily for 30 days.'], vitals:['blood pressure 142/88 mmHg; weight 77 kg.'], notes:['HbA1c 8.0%; creatinine 1.0 mg/dL.'] },
  'visit-jan': { diagnosis:['Type 2 diabetes and hypertension documented.'], medication:['Metformin 500 mg once daily for 30 days.'], vitals:['blood pressure 148/92 mmHg; weight 78 kg.'], notes:['HbA1c 8.4%; creatinine 1.1 mg/dL.'] },
};
const rx = complete.prescriptionData;
writtenSections['visit-sep'] = {
  symptoms:rx.symptoms.map(item => `${item.symptom_name} (${item.severity.toLowerCase()}, ${item.since}). ${item.note}.`),
  diagnosis:rx.diagnosis.map(item => `${item.tds_name} (${item.since}, ${item.status.toLowerCase()}).`),
  medication:rx.medications.map(item => `${item.name} ${item.dosage}, ${item.frequency.toLowerCase()}, ${item.schedule.toLowerCase()}, ${item.duration}. Quantity: ${item.quantity}.`),
  vitals:[complete.vitals.map(item => `${item.label}: ${item.value} ${item.unit}`).join('; ') + '.'],
  examination:rx.examinations.map(item => `${item.examination_name}: ${item.note}`),
  investigations:rx.investigations.map(item => `${item.name}: ${item.note}.`),
  notes:[rx.additionalNotes],
};
REVIEW_SOURCES.find(source => source.id === 'visit-sep').text = 'Synthetic doctor-entered consultation · 22 September 2026.\n' + Object.values(writtenSections['visit-sep']).flat().join('\n');
REVIEW_SOURCES.push({ id:'medical-history',title:'Medical history · 22 Sept 2026', date:complete.recorded_at,resourceKind:'Medical history',
  text:'Synthetic doctor-entered medical history.\n' + complete.medical_history.map(section => `${section.title}: ` + section.tags.map(tag => [tag.title,tag.since,tag.status,tag.relationship,tag.date,tag.note,tag.medication].filter(Boolean).join('; ')).join(' | ')).join('\n') + '\nAdditional history: ' + complete.additional_history });
REVIEW_SOURCES.push({id:'symptom-collector',title:'Symptom collector · 19 Oct 2026',date:'2026-10-19',resourceKind:'Patient-reported symptoms',text:'Synthetic current-encounter symptom collector: intermittent dizziness, mild, for 2 days. No fainting reported. Patient-reported; not yet a clinician-confirmed finding.'});
REVIEW_VISITS.forEach(visit => { visit.writtenSections = writtenSections[visit.id]; });

REVIEW_EXAMPLES.splice(1, 0,
  { id: 'history', label: 'Medical history', family: 'Summary', title: 'Medical history', icon: 'note-2', question: "Summarize this patient’s medical history.", sources: ['medical-history'] },
  { id: 'visit-summary', label: 'Visit summary', family: 'Summary', title: 'Latest visit summary', icon: 'note-2', question: 'Summarize the last consultation.', sources: ['visit-sep'] },
);
REVIEW_EXAMPLES.splice(REVIEW_EXAMPLES.length - 1, 0,
  { id: 'med-history', label: 'Medication history', family: 'Table', title: 'Medication history', icon: 'note-2', question: 'Show the medication history and changes over time.', sources: sourceIds },
  { id: 'visits', label: 'Visit history', family: 'Timeline', title: 'Visit history', icon: 'note-2', question: 'Show the visit history. Let me review each consultation.', sources: sourceIds },
);


REVIEW_EXAMPLES.push({ id:'vitals', label:'Vital records', family:'Table', title:'Vital records', icon:'heart', question:'Show the recorded vital signs.', sources:sourceIds });

// Categories describe the intent; formats are reusable within them.
REVIEW_EXAMPLES.forEach(example => {
  example.category = ['summary', 'history', 'visit-summary', 'visits'].includes(example.id) ? 'Summary'
    : ['vital', 'lab'].includes(example.id) ? 'Data analytics' : 'Data tables';
});


// Separate limited source: never reuse a complete record as evidence for missing fields.
export const PARTIAL_SOURCE = {
  id: 'partial-visit', title: 'Consultation · 22 Sept 2026', date: '2026-09-22',
  text: 'Diabetes follow-up on 22 September 2026. Type 2 diabetes documented. Metformin 500 mg is listed. Frequency, duration, other medication information, allergies, vital signs, lab results, assessment and follow-up plan are not documented in this available extract.',
};
const partialItem = (id, label, text) => ({ id, label, text, sources: ['partial-visit'] });
export const PARTIAL_SUMMARIES = {
  summary: {
    situation: { text:'Recorded history of type 2 diabetes.', sources:['partial-visit'] },
    sections:[{ id:'history', label:'Background', icon:'medical-record', items:[
      partialItem('condition','Chronic','Type 2 diabetes documented.'),
    ] }],
  },
  history: { sections:[
    { id:'conditions', label:'Medical conditions', icon:'medical-record', items:[partialItem('condition','Chronic','Type 2 diabetes documented.')] },
  ] },
  'visit-summary': { sections:[
    { id:'diagnosis', label:'Diagnosis', icon:'medical-record', items:[partialItem('condition','','Type 2 diabetes documented.')] },
    { id:'rx', label:'Medication', icon:'Tablets', items:[partialItem('rx','','Metformin 500 mg is listed.')] },
    { id:'notes', label:'Additional notes', icon:'medical-record', items:[
      partialItem('reason','','Diabetes follow-up on 22 September 2026.'),
      partialItem('scope','','Frequency, duration, other medication information, allergies, vital signs, lab results, assessment and follow-up plan are not documented in this available extract.'),
    ] },
  ] },
};
export function summaryRecordSet(id, availability, asOf = todayInIndia()) {
  if (availability === 'longitudinal' && id === 'summary') return { data:FILLED_PATIENT_OVERVIEW, sources:FILLED_PATIENT_SOURCES };
  if (availability === 'attention' && id === 'summary') return { data: ATTENTION_OVERVIEW, sources: ATTENTION_SOURCES };
  if (availability === 'none') return { data: null, sources: [] };
  if (availability === 'partial') return { data: PARTIAL_SUMMARIES[id], sources: [PARTIAL_SOURCE] };
  const example = REVIEW_EXAMPLES.find(item => item.id === id);
  const data = id === 'summary' ? overviewWithMedications({ ongoing:complete.ongoing_medications, prescriptions:REVIEW_MEDICATIONS, asOf, collector:availability === 'collector' ? complete.symptom_collector_example : undefined }) : REVIEW_SUMMARIES[id];
  const cited = new Set();
  const collect = item => {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item.sources)) item.sources.forEach(source => cited.add(source));
    Object.values(item).forEach(value => { if (typeof value === 'object') collect(value); });
  };
  collect(data);
  return { data, sources:REVIEW_SOURCES.filter(source => data ? cited.has(source.id) : example.sources.includes(source.id)) };
}
