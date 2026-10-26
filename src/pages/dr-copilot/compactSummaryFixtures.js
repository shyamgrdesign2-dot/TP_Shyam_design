import { summaryMedications } from './prescriptionWindow';
import complete from './completeConsultationFixture.json';
// Isolated source-linked presentation examples. No live-patient classification happens here.
const value = (id, label, text, detail, sources, extra = {}) => ({ id, label, text, detail, sources, ...extra });
const row = (id, label, values, separator = 'pipe') => ({ id, label, values, separator });
const section = (id, label, icon, items, date) => ({ id, label, icon, items, date });
const sep = ['visit-sep'];
const historyLabels = {2:'Chronic',4:'Allergies',3:'Family',1:'Lifestyle',5:'Surgical'};
const historyRows = complete.medical_history.map(history => row(`history-${history.tmmhs_id}`,historyLabels[history.tmmhs_id],history.tags.filter(tag => tag.enable === 'Y').map((tag,index) =>
  value(`${history.tmmhs_id}-${index}`,'',tag.title,[tag.since,tag.status,tag.relationship,tag.date,tag.note].filter(Boolean).filter(detail => detail !== 'Patient reports ongoing use.').join('; '),['medical-history'])),'comma'));
historyRows.push(value('additional','Additional',complete.additional_history,'',['medical-history']));
const vitalRows = [row('vitals', '', complete.vitals.map((item,index) => value(`vital-${index}`,item.label,`${item.value} ${item.unit}`,'',sep)))];
const labRows = [row('labs', '', [value('hba1c', 'HbA1c', '7.4%', 'ref 4.0–5.6%', ['lab-sep'], { flag:'high' })])];
const allergySentence = 'He has a recorded sulfonamide allergy (rash).';
const situation = { text:'45-year-old man with type 2 diabetes and hypertension. At the 22 Sep visit, he reported mild fatigue for three days, without fever.', emphasis:['45-year-old','type 2 diabetes','hypertension','mild fatigue','sulfonamide allergy'], sources:['patient-profile','visit-sep','medical-history'] };
const rx = complete.prescriptionData;
const lastVisit = section('last-visit','Last Visit','medical-record',[
  row('last-sx','SX',rx.symptoms.map((item,index)=>value(`sx-${index}`,'',item.symptom_name,[item.severity.toLowerCase(),item.since,item.note].filter(Boolean).join('; '),sep)),'comma'),
  row('last-dx','DX',rx.diagnosis.map((item,index)=>value(`dx-${index}`,'',item.tds_name,'',sep)),'comma'),
  row('last-rx','RX',rx.medications.map((item,index)=>value(`rx-${index}`,'',`${item.name} ${item.dosage}`,`${item.frequency.toLowerCase()}, ${item.schedule.toLowerCase()}, ${item.duration}; ${item.quantity}`,sep)),'comma'),
], '22 Sep ’26');

const assessment = { id:'assessment', label:'Assessment', icon:'Heart Rate', items:[], groups:[
  { id:'vitals', label:'Latest vitals', icon:'Heart Rate', date:'22 Sep ’26', items:vitalRows },
  { id:'labs', label:'Latest key labs', icon:'Lab', items:labRows },
] };
export const COMPACT_OVERVIEW = {
  situation:{...situation,text:`${situation.text} ${allergySentence}`},
  sections:[section('history','Background','medical-record',historyRows.filter(item=>item.label!=='Allergies')), assessment, lastVisit],
};
export function overviewWithMedications({ ongoing = [], prescriptions = [], asOf, collector }) {
  const medicines = summaryMedications({ ongoing, prescriptions, asOf });
  const currentSymptoms = collector?.matchesCurrentEncounter && collector.recordedAt === asOf
    ? collector.summary_json_doctor?.symptoms?.filter(item=>item.name) || [] : [];
  const currentSituation = currentSymptoms.length ? {
    ...situation,
    text:`45-year-old man with type 2 diabetes and hypertension. At intake, he reports ${currentSymptoms.map(item=>[item.name.toLowerCase(), [item.severity?.toLowerCase(),item.duration].filter(Boolean).join(', ')].filter(Boolean).join(' — ')).join('; ')}. ${currentSymptoms.map(item=>item.notes).filter(Boolean).join('; ')}.`,
    emphasis:[...situation.emphasis,...currentSymptoms.map(item=>item.name.toLowerCase())],
    sources:['patient-profile','medical-history',collector.sourceId],
  } : situation;
  const medicineName = item => [item.name, item.strength].filter(Boolean).join(' ');
  const listNames = records => new Intl.ListFormat('en', { style:'long', type:'conjunction' }).format(records.map(medicineName));
  const groups = [
    ['documented-ongoing', 'Ongoing medications', medicines.filter(item=>item.basis==='documented-ongoing').every(item=>item.attribution==='patient-reported') ? 'He reports taking' : 'His records document ongoing treatment with'],
    ['prescription-window', 'Current medications', 'His medication record lists'],
  ].map(([basis, label, sentence]) => ({ basis, label, sentence, records:medicines.filter(item => item.basis === basis) })).filter(group => group.records.length);
  return {
    ...COMPACT_OVERVIEW,
    situation:{ ...currentSituation,
      text:[currentSituation.text, ...groups.map(group => `${group.sentence} ${listNames(group.records)}.`),allergySentence].join(' '),
      emphasis:[...currentSituation.emphasis, ...medicines.map(item => item.name)],
      sources:[...new Set([...currentSituation.sources, ...medicines.map(item => item.sourceId)])],
    },
    sections:[section('history','Background','medical-record',[
      ...historyRows.filter(item=>item.label!=='Allergies'),
      ...groups.map(group => row(group.basis,group.label,group.records.map(item => value(item.id,'',medicineName(item),item.schedule,[item.sourceId])),'comma')),
    ]), assessment, lastVisit],
  };
}
export const COMPACT_HISTORY = {
  sections:historyRows.map((item,index)=>section(`history-${index}`,item.label,'medical-record',[{...item,label:''}])),
};
export function compactVisitSummary(visit) {
  // These are verbatim source sections. Never shorten drug names or rewrite clinician text.
  const fields = [
    ['symptoms','Symptoms','medical-record'], ['diagnosis','Diagnosis','Diagnosis'],
    ['medication','Medication','Tablets'], ['vitals','Vitals','Heart Rate'],
    ['examination','Examination','medical-report'], ['investigations','Lab investigations','Lab'],
    ['notes','Additional notes','medical-record'],
  ];
  // No date on each section: every section is from this one visit, and the
  // visit's date is shown once, on the visit itself.
  return { sections:fields.map(([id,label,icon])=>section(id,label,icon,
    (visit.writtenSections?.[id] || []).map((text,index)=>value(`${id}-${index}`,'',text,'',[visit.id])))).filter(item=>item.items.length) };
}

// Separate synthetic case; never attach these conditions to the routine example patient.
export const ATTENTION_SOURCES = [
  { id:'attention-history', title:'Medical history · 18 Oct 2026', date:'2026-10-18', resourceKind:'Medical history', text:'Separate synthetic example. Colon cancer diagnosed in 2019; resection completed in 2019; remission documented on 18 October 2026. HIV diagnosis recorded in 2016. ART is listed in the record, but regimen and current adherence are unavailable. No viral load or CD4 result available in this extract. No new symptoms documented. Family and social history unavailable.' },
  { id:'attention-allergy', title:'Allergy record · 18 Oct 2026', date:'2026-10-18', resourceKind:'Allergy record', text:'Separate synthetic example. Penicillin allergy: anaphylaxis documented, reaction dated 2024; reviewed 18 October 2026. No correction or reconciliation removing this allergy is present.' },
];
export const ATTENTION_OVERVIEW = {
  attention:[
    {...value('cancer','Cancer history','Colon cancer','resected 2019; remission documented 18 Oct 2026',['attention-history']),priority:'important'},
    {...value('hiv','HIV','Diagnosis documented in 2016','ART listed',['attention-history']),priority:'important'},
  ],
  situation:{text:'History of treated colon cancer and documented HIV infection, with antiretroviral treatment listed in the record. He has a documented penicillin allergy with anaphylaxis.',emphasis:['colon cancer','HIV','antiretroviral treatment','penicillin allergy','anaphylaxis'],sources:['attention-history','attention-allergy']},
  sections:[
    section('background','Background','medical-record',[
      row('conditions','Conditions',[value('cancer','','Colon cancer','resection 2019; recorded remission',['attention-history']),value('hiv','','HIV','ART listed',['attention-history'])],'comma'),
    ]),
  ],
};
