// Isolated fictional patient for a fuller catalog preview. Never a live clinical record.
const fact = (id, label, text, detail, source, extra = {}) => ({ id, label, text, detail, sources:[source], ...extra });
const history = 'arun-history';
const last = 'arun-oct';
const labs = 'arun-labs';

export const FILLED_PATIENT_SOURCES = [
  { id:'arun-profile', title:'Arun Mehta · Patient profile', date:'2026-10-21', resourceKind:'Patient profile', text:'Fictional catalog patient Arun Mehta, 58-year-old man on 21 October 2026. Three completed consultations: 12 May, 14 July and 9 October 2026.' },
  { id:'arun-may', title:'Consultation · 12 May 2026', date:'2026-05-12', text:'Arun Mehta, fictional patient. SX: Nocturia for two weeks. DX: Type 2 diabetes, hypertension, dyslipidaemia. BP 148/90 mmHg; weight 83 kg. HbA1c 8.6%. RX: Metformin 1 g twice daily after meals, telmisartan 40 mg each morning, atorvastatin 20 mg at night; each for 60 days.' },
  { id:'arun-jul', title:'Consultation · 14 Jul 2026', date:'2026-07-14', text:'Arun Mehta, fictional patient. SX: Nocturia resolved. DX: Type 2 diabetes, hypertension, dyslipidaemia. BP 140/86 mmHg; weight 82 kg. HbA1c 8.1%. RX: Metformin 1 g twice daily after meals, telmisartan 40 mg each morning, atorvastatin 20 mg at night; each for 60 days.' },
  { id:last, title:'Consultation · 9 Oct 2026', date:'2026-10-09', text:'Arun Mehta, fictional patient. SX: Mild fatigue for one week; no fever or chest pain reported. DX: Type 2 diabetes, hypertension, dyslipidaemia. Vitals: BP 134/82 mmHg; pulse 76 bpm; SpO2 98%; temperature 36.7 °C; weight 81 kg; height 172 cm. RX: Metformin 1 g twice daily after meals; telmisartan 40 mg each morning; atorvastatin 20 mg at night. All three courses prescribed for 30 days from 9 October 2026. No new diagnosis recorded at this encounter.' },
  { id:labs, title:'Lab record · 8 Oct 2026', date:'2026-10-08', resourceKind:'Lab record', text:'Arun Mehta, fictional patient. HbA1c 7.8% (reference 4.0–5.6%; high); LDL cholesterol 116 mg/dL (reference <100; high); creatinine 1.0 mg/dL (reference 0.7–1.3); urine albumin/creatinine ratio (uACR) 48 mg/g (reference <30; high). All results dated 8 October 2026. Flags are supplied by this synthetic lab record.' },
  { id:history, title:'Medical history · 21 Oct 2026', date:'2026-10-21', resourceKind:'Medical history', text:'Arun Mehta, fictional patient. Chronic: Type 2 diabetes for 10 years; hypertension for 7 years; dyslipidaemia for 5 years. Family: Father had type 2 diabetes; mother had hypertension. Lifestyle: Former smoker, 10 pack-years, stopped 2018; walks 30 minutes five days per week; occasional alcohol, 1–2 drinks/month. Surgical: Appendectomy in 2008; right cataract surgery in 2023, uncomplicated recovery. Additional: Works rotating shifts with irregular meal timings; independent in daily activities. On 21 October 2026, patient reports ongoing use of metformin 1 g twice daily after meals, telmisartan 40 mg each morning, and atorvastatin 20 mg at night. Allergy: Sulfonamides, rash; recorded in 2019.' },
];

export const FILLED_PATIENT_OVERVIEW = {
  situation:{
    text:'Arun Mehta, a 58-year-old man, has type 2 diabetes (10 years), hypertension (7 years) and dyslipidaemia (5 years). At his last visit on 9 Oct 2026, he reported mild fatigue for one week, without fever or chest pain. He reports ongoing use of metformin, telmisartan and atorvastatin and has a recorded sulfonamide allergy (rash).',
    emphasis:['58-year-old','type 2 diabetes','hypertension','dyslipidaemia','mild fatigue','metformin','telmisartan','atorvastatin','sulfonamide allergy'],
    sources:['arun-profile',last,history],
  },
  sections:[
    { id:'background', label:'Background', icon:'medical-record', items:[
      fact('chronic','Chronic','Type 2 diabetes (10 years), hypertension (7 years), dyslipidaemia (5 years)','',history),
      fact('family','Family','Type 2 diabetes (father), hypertension (mother)','',history),
      fact('lifestyle','Lifestyle','Former smoker','10 pack-years; stopped 2018',history),
      fact('activity','Activity','Walks 30 min, 5 days/week','alcohol 1–2 drinks/month',history),
      fact('surgical','Surgical','Appendectomy (2008), right cataract surgery (2023)','uncomplicated recovery',history),
      fact('additional','Additional','Rotating shifts; irregular meals','independent in daily activities',history),
      { id:'ongoing', label:'Ongoing medications', separator:'comma', values:[
        fact('metformin','','Metformin 1 g','twice daily; after meals',history),
        fact('telmisartan','','Telmisartan 40 mg','each morning',history),
        fact('atorvastatin','','Atorvastatin 20 mg','at night; patient-reported regimen',history),
      ] },
    ] },
    { id:'assessment', label:'Assessment', icon:'Heart Rate', items:[], groups:[
      { id:'vitals', label:'Latest vitals', date:'9 Oct ’26', items:[{ id:'measurements', values:[
        fact('bp','BP','134/82 mmHg','',last), fact('pulse','Pulse','76 bpm','',last),
        fact('spo2','SpO₂','98%','',last), fact('temp','Temp','36.7 °C','',last),
        fact('weight','Weight','81 kg','',last), fact('height','Height','172\u00a0cm','',last),
      ] }] },
      { id:'labs', label:'Latest key labs', items:[{ id:'results', values:[
        fact('hba1c','HbA1c','7.8%','',labs,{flag:'high'}),
        fact('ldl','LDL','116 mg/dL','',labs,{flag:'high'}),
        fact('creatinine','Creatinine','1.0 mg/dL','',labs),
        fact('uacr','uACR','48 mg/g','',labs,{flag:'high'}),
      ] }] },
    ] },
    { id:'last-visit', label:'Last Visit', icon:'medical-record', date:'9 Oct ’26', items:[
      fact('sx','SX','Fatigue','mild; 1 week',last),
      fact('dx','DX','Type 2 diabetes, hypertension, dyslipidaemia','',last),
      fact('rx','RX','Metformin 1 g twice daily, telmisartan 40 mg morning, atorvastatin 20 mg night','30 days',last),
    ] },
  ],
};
