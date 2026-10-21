// Fictional demo-only longitudinal record. Never merge with live patient data.
const history = 'sunita-history';
const last = 'sunita-jul';
const labs = 'sunita-labs';
const fact = (id, label, text, detail, source, extra = {}) => ({id,label,text,detail,sources:[source],...extra});
export const SUNITA_VISITS = [
  { id:'sunita-jan', date:'2026-01-09', symptoms:'Fatigue and constipation for two weeks.', diagnosis:'Hypothyroidism; dyslipidaemia.', medication:'Levothyroxine 50 mcg once daily before breakfast; atorvastatin 10 mg at night. Both for 90 days.', vitals:'BP 128/82 mmHg; weight 69 kg.', results:'TSH 5.1 mIU/L; LDL 148 mg/dL.' },
  { id:'sunita-apr', date:'2026-04-21', symptoms:'Constipation improved; intermittent fatigue persists.', diagnosis:'Hypothyroidism; dyslipidaemia.', medication:'Levothyroxine 75 mcg once daily before breakfast; atorvastatin 10 mg at night. Both for 90 days.', vitals:'BP 126/80 mmHg; weight 68 kg.', results:'TSH 7.2 mIU/L; LDL 140 mg/dL.' },
  { id:last, date:'2026-07-21', symptoms:'Mild fatigue for one week; no fever or palpitations reported.', diagnosis:'Hypothyroidism; dyslipidaemia.', medication:'Levothyroxine 75 mcg once daily before breakfast; atorvastatin 10 mg at night. Both for 90 days.', vitals:'BP 124/80 mmHg; pulse 72 bpm; SpO2 99%; temperature 36.6 °C; weight 67 kg; height 160 cm.', results:'TSH 6.8 mIU/L; LDL 132 mg/dL; haemoglobin 12.6 g/dL.' },
];
export const sunitaVisitText = visit => `Sunita Sharma · consultation ${visit.date}.\nSymptoms: ${visit.symptoms}\nDiagnosis: ${visit.diagnosis}\nMedication: ${visit.medication}\nVitals: ${visit.vitals}\nLab results: ${visit.results}`;
export const SUNITA_DEMO_RECORD = {
  conditions:[['Hypothyroidism','2018-02-14'],['Dyslipidaemia','2024-05-10']],
  meds:[['Levothyroxine','75 mcg once daily before breakfast','2026-07-21'],['Atorvastatin','10 mg at night','2026-07-21']],
  labs:[['TSH',6.8,'mIU/L','0.4–4.0','high','2026-07-21'],['TSH',7.2,'mIU/L','0.4–4.0','high','2026-04-21'],['TSH',5.1,'mIU/L','0.4–4.0','high','2026-01-09'],['LDL cholesterol',132,'mg/dL','<100','high','2026-07-21'],['Haemoglobin',12.6,'g/dL','12.0–15.5','normal','2026-07-21']],
  bp:[['124/80','2026-07-21'],['126/80','2026-04-21'],['128/82','2026-01-09']],
  allergies:[['Penicillin','hives','2015-04-02']],
  family:[['Mother','Hypothyroidism'],['Father','Type 2 diabetes']],
  visit:{date:'2026-07-21',dept:'Endocrinology',doctor:'Dr. Mehul Shah',advice:'Take levothyroxine on an empty stomach; recheck TSH in 6 weeks.'},
};
export const SUNITA_SOURCES = [
  {id:'sunita-profile',kind:'patient_profile',date:'2026-10-19',text:'Fictional patient Sunita Sharma, 46-year-old woman as of 19 October 2026. Completed consultations on 9 January, 21 April and 21 July 2026.'},
  ...SUNITA_VISITS.map(visit=>({id:visit.id,kind:'visit',date:visit.date,text:sunitaVisitText(visit)})),
  {id:labs,kind:'lab_result',date:'2026-07-21',text:'Sunita Sharma: TSH 6.8 mIU/L (reference 0.4–4.0; high); LDL 132 mg/dL (reference <100; high); haemoglobin 12.6 g/dL (reference 12.0–15.5; normal). Synthetic lab record dated 21 July 2026.'},
  {id:history,kind:'history',date:'2026-10-19',text:'Sunita Sharma: Hypothyroidism since February 2018; dyslipidaemia since May 2024. Mother has hypothyroidism; father has type 2 diabetes. Vegetarian; no tobacco or alcohol use reported; walks 30 minutes four days/week. Caesarean delivery in 2008; laparoscopic cholecystectomy in 2021, uncomplicated recovery. Menstrual cycles regular; no heavy bleeding reported. Works as a school teacher; independent in daily activities. On 19 October 2026 she reports ongoing use of levothyroxine 75 mcg once daily before breakfast and atorvastatin 10 mg at night. Penicillin allergy (hives) recorded in 2015.'},
];
export const SUNITA_OVERVIEW = {
  situation:{text:'Sunita Sharma, a 46-year-old woman, has hypothyroidism (since 2018) and dyslipidaemia (since 2024). At her last visit on 21 Jul 2026, she reported mild fatigue for one week, without fever or palpitations. She reports ongoing use of levothyroxine and atorvastatin and has a recorded penicillin allergy (hives).',emphasis:['46-year-old','hypothyroidism','dyslipidaemia','mild fatigue','levothyroxine','atorvastatin','penicillin allergy'],sources:['sunita-profile',last,history]},
  sections:[
    {id:'background',label:'Background',icon:'medical-record',items:[
      {id:'chronic',label:'Chronic',separator:'comma',values:[fact('thyroid','','Hypothyroidism','since 2018',history),fact('lipids','','Dyslipidaemia','since 2024',history)]},
      {id:'family',label:'Family',separator:'comma',values:[fact('mother','','Hypothyroidism','mother',history),fact('father','','Type 2 diabetes','father',history)]},
      fact('lifestyle','Lifestyle','Vegetarian; no tobacco or alcohol reported','walks 30 min, 4 days/week',history),
      {id:'surgical',label:'Surgical',separator:'comma',values:[fact('cs','','Caesarean delivery','2008',history),fact('surgery','','Cholecystectomy','laparoscopic; 2021; uncomplicated',history)]},
      fact('gyn','Gynaecology','Regular menstrual cycles','no heavy bleeding reported',history),
      fact('additional','Additional','School teacher','independent in daily activities',history),
      {id:'ongoing',label:'Ongoing medications',separator:'comma',values:[fact('levo','','Levothyroxine 75 mcg','once daily before breakfast',history),fact('atorva','','Atorvastatin 10 mg','at night; patient-reported regimen',history)]},
    ]},
    {id:'assessment',label:'Assessment',icon:'Heart Rate',items:[],groups:[
      {id:'vitals',label:'Latest vitals',date:'21 Jul ’26',items:[{id:'vital-values',values:[fact('bp','BP','124/80 mmHg','',last),fact('pulse','Pulse','72 bpm','',last),fact('spo2','SpO₂','99%','',last),fact('temp','Temp','36.6 °C','',last),fact('weight','Weight','67 kg','',last),fact('height','Height','160\u00a0cm','',last)]}]},
      {id:'labs',label:'Latest key labs',items:[{id:'lab-values',values:[fact('tsh','TSH','6.8 mIU/L','',labs,{flag:'high'}),fact('ldl','LDL','132 mg/dL','',labs,{flag:'high'}),fact('hb','Hb','12.6 g/dL','',labs)]}]},
    ]},
    {id:'last-visit',label:'Last Visit',icon:'medical-record',date:'21 Jul ’26',items:[fact('sx','SX','Fatigue','mild; 1 week',last),fact('dx','DX','Hypothyroidism, dyslipidaemia','',last),fact('rx','RX','Levothyroxine 75 mcg before breakfast, atorvastatin 10 mg at night','once daily; 90 days',last)]},
  ],
};
