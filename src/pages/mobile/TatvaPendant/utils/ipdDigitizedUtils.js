const IPD_MODULE_KEYS = [
  'ASSESSMENTS',
  'CONSULTANT_NOTES',
  'PROGRESS_NOTES',
  'OT_NOTES',
  'CROSS_REFERRAL',
  'DISCHARGE_SUMMARY',
];

export const IPD_CAPTURE_TABS = [
  { key: 'assessments', label: 'Assessments', copyKey: 'ASSESSMENTS' },
  { key: 'consultant', label: 'Consultant note', copyKey: 'CONSULTANT_NOTES' },
  { key: 'progress', label: 'Progress notes', copyKey: 'PROGRESS_NOTES' },
  { key: 'ot', label: 'OT notes', copyKey: 'OT_NOTES' },
  { key: 'cross_referral', label: 'Cross referral', copyKey: 'CROSS_REFERRAL' },
  { key: 'discharge', label: 'Discharge summary', copyKey: 'DISCHARGE_SUMMARY' },
];

const VITAL_LABELS = {
  pulse: 'Pulse',
  bloodPressure: 'Blood pressure',
  temperature: 'Temperature',
  spo2: 'SpO2',
  respiratoryRate: 'Respiratory rate',
  weight: 'Weight',
  height: 'Height',
  generalRBS: 'General RBS',
};

const FUNCTIONAL_LABELS = {
  bedActivity: 'Bed activity',
  sitting: 'Sitting',
  standing: 'Standing',
  ambulation: 'Ambulation',
  stairClimbing: 'Stair climbing',
  bedSoreOnAdmission: 'Bed sore on admission',
  referredToPhysiotherapy: 'Referred to physiotherapy',
  referredToPhysiotherapyForReview: 'Referred to physiotherapy',
};

const GENERAL_EXAM_LABELS = {
  pallor: 'Pallor',
  clubbing: 'Clubbing',
  cyanosis: 'Cyanosis',
  lymphadenopathy: 'Lymphadenopathy',
  edema: 'Edema',
  hydration: 'Hydration',
  cvs: 'CVS',
  breastChest: 'Breast / Chest',
  abdomen: 'Abdomen',
  neurologicalPsychosocial: 'Neurological / Psychosocial',
  back: 'Back',
  heent: 'HEENT',
};

/** Granular copy keys for assessment sub-cards (IPD field names in digitizedOutput.ASSESSMENTS). */
const ASSESSMENT_SECTION_COPY_KEYS = {
  ward_room: 'roomNumber',
  patient_details: 'patientName',
  informant: 'informant',
  presenting_complaints: 'presentingComplaints',
  current_medications: 'currentMedications',
  lab_results: 'labResults',
  past_medical_history: 'pastMedicalHistory',
  vitals: 'vitals',
  general_examination: 'examination',
  functional_assessment: 'functionalAssessment',
  provisional_diagnosis: 'provisionalDiagnosis',
  treatment_plan: 'treatmentPlan',
  additional_notes: 'additionalNotes',
};

function joinMeta(...parts) {
  const value = parts.filter((part) => part != null && String(part).trim()).join(' · ');
  return value || null;
}

function ipdItem(title, meta = null) {
  const text = String(title ?? '').trim();
  if (!text) return null;
  const metaText = meta != null && String(meta).trim() ? String(meta) : null;
  return { title: text, meta: metaText };
}

function toBullets(items) {
  return items
    .filter(Boolean)
    .map(({ title, meta }) => ipdItem(meta ? `${title} · ${meta}` : title))
    .filter(Boolean);
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function appendSection(sections, section) {
  if (!section.items?.length) return;
  sections.push({ ...section, count: section.items.length });
}

function appendAssessmentSection(sections, section) {
  appendSection(sections, {
    ...section,
    copyKey: ASSESSMENT_SECTION_COPY_KEYS[section.key] || section.copyKey,
  });
}

function withMeta(items, meta) {
  return items.map((item) => ({ ...item, meta: item.meta || meta }));
}

function mapStringItems(values) {
  const list = Array.isArray(values) ? values : values != null ? [values] : [];
  return list
    .map((entry) => {
      if (typeof entry === 'string') return ipdItem(entry);
      if (!entry || typeof entry !== 'object') return null;
      const title = entry.title || entry.name || entry.symptom_name
        || entry.finding || entry.instruction || entry.text;
      return ipdItem(title, entry.notes || entry.note || entry.role || entry.since);
    })
    .filter(Boolean);
}

function mapTextField(value, meta = null) {
  if (value == null || value === '') return [];
  if (typeof value === 'string') return [ipdItem(value, meta)].filter(Boolean);
  return withMeta(mapStringItems(value), meta);
}

function mapComplaints(complaints = []) {
  return complaints
    .map((entry) => ipdItem(entry?.symptom_name || entry?.name, joinMeta(entry?.since, entry?.severity, entry?.note)))
    .filter(Boolean);
}

function mapMedications(medications = []) {
  return medications
    .map((entry) => ipdItem(
      entry?.name || entry?.groundedMedicineName,
      joinMeta(
        entry?.unitPerDose || entry?.dosage || entry?.dose,
        entry?.frequency,
        entry?.schedule,
        entry?.duration,
        entry?.notes
      )
    ))
    .filter(Boolean);
}

function mapDiagnosis(diagnosis = []) {
  return diagnosis
    .map((entry) => ipdItem(entry?.title || entry?.name, joinMeta(entry?.icdCode, entry?.status)))
    .filter(Boolean);
}

function mapLabResults(labResults = []) {
  const items = [];
  (labResults || []).forEach((entry) => {
    if (!entry) return;
    // New flat format: { testName, value, notes }
    if (entry.testName != null || (entry.value != null && !entry.inputs)) {
      items.push(ipdItem(entry.testName || entry.name, joinMeta(entry.value, entry.notes)));
      return;
    }
    // Old grouped format: { inputs: [{ testName, reportName, name, value, units, refRange }] }
    (entry.inputs || []).forEach((input) => {
      const title = input?.testName || input?.reportName || input?.name;
      items.push(ipdItem(title, joinMeta(input?.value, input?.units, input?.refRange)));
    });
  });
  return items.filter(Boolean);
}

function mapVitals(vitals = {}) {
  return Object.entries(vitals)
    .filter(([key, value]) => {
      if (value == null || String(value).trim() === '') return false;
      if ((key === 'systolic' || key === 'diastolic') && vitals.bloodPressure) return false;
      return true;
    })
    .map(([key, value]) => {
      const label = VITAL_LABELS[key]
        || key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
      return ipdItem(label, value);
    });
}

function mapExaminationSystems(examination = {}) {
  const items = [];
  Object.entries(examination).forEach(([systemKey, system]) => {
    if (!system || typeof system !== 'object') return;
    const systemLabel = GENERAL_EXAM_LABELS[systemKey]
      || system.title
      || systemKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
    // New schema: { status: "Present"|"Absent"|"WNL"|"Abnormal"|"Normal"|"Dehydrated", additionalNotes }
    if ('status' in system || 'additionalNotes' in system) {
      if (system.status) items.push(ipdItem(system.status, systemLabel));
      if (system.additionalNotes) items.push(ipdItem(system.additionalNotes, systemLabel));
    } else {
      // Old schema: { title, notes (array), value }
      (system.notes || []).forEach((note) => items.push(ipdItem(note, systemLabel)));
      if (system.value === 2 && !(system.notes || []).length) {
        items.push(ipdItem('Abnormal', systemLabel));
      }
    }
  });
  return items;
}

function mapPhysicalExamination(physicalExamination = {}) {
  return [
    ...mapVitals(physicalExamination?.vitals),
    ...mapExaminationSystems(physicalExamination?.examination),
    ...mapStringItems(physicalExamination?.others),
  ];
}

function mapFunctionalAssessment(functionalAssessment = {}) {
  const items = [];
  if (functionalAssessment.status) items.push(ipdItem('Functional status', functionalAssessment.status));
  if (functionalAssessment.mobility) items.push(ipdItem('Mobility', functionalAssessment.mobility));
  Object.entries(FUNCTIONAL_LABELS).forEach(([key, label]) => {
    if (functionalAssessment[key] != null && String(functionalAssessment[key]).trim()) {
      items.push(ipdItem(label, functionalAssessment[key]));
    }
  });
  return [...items, ...mapStringItems(functionalAssessment.others)];
}

function mapTreatmentPlan(treatmentPlan = {}) {
  const flatFields = [
    ['orders', 'Orders'],
    ['goals', 'Goals'],
    ['prevention', 'Prevention'],
    ['nursingOrders', 'Nursing orders'],
    ['immediateManagement', 'Immediate management'],
    ['desiredOutcome', 'Desired outcome'],
    ['preventiveActions', 'Preventive action'],
  ];
  const items = [];
  flatFields.forEach(([key, label]) => {
    const value = treatmentPlan[key];
    if (Array.isArray(value)) {
      items.push(...withMeta(mapStringItems(value), label));
    } else if (value != null && String(value).trim()) {
      items.push(ipdItem(value, label));
    }
  });
  // medications array in treatment plan
  items.push(...mapMedications(treatmentPlan.medications));
  // investigations (array of strings)
  (treatmentPlan.investigations || []).forEach((inv) => {
    if (inv != null && String(inv).trim()) items.push(ipdItem(inv, 'Investigation'));
  });
  if (treatmentPlan.followUp) items.push(ipdItem(treatmentPlan.followUp, 'Follow-up'));
  return items;
}

function mapCourseInHospital(course = {}) {
  const items = [];
  (course.chronologicalSummary || []).forEach((entry) => {
    const prefix = joinMeta(entry?.date, entry?.day) || 'Course in hospital';
    const lines = Array.isArray(entry?.text) ? entry.text : entry?.text ? [entry.text] : [];
    lines.forEach((line) => items.push(ipdItem(line, prefix)));
  });
  return [...items, ...withMeta(mapStringItems(course.treatmentGiven), 'Treatment given')];
}

function mapFluidBalance(fluidBalance = {}) {
  return [
    fluidBalance.fluidInput ? ipdItem('Fluid input', fluidBalance.fluidInput) : null,
    fluidBalance.fluidOutput ? ipdItem('Fluid output', fluidBalance.fluidOutput) : null,
    fluidBalance.balance ? ipdItem('Balance', fluidBalance.balance) : null,
  ].filter(Boolean);
}

function mapSurgeryTeam(team = {}) {
  const items = [];
  const pushRole = (role, value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((person) => items.push(ipdItem(person?.name || person, role)));
    } else {
      items.push(ipdItem(value, role));
    }
  };
  pushRole('Primary surgeon', team.primarySurgeon);
  pushRole('Secondary surgeon', team.secondarySurgeon);
  pushRole('Assistant', team.assistant);
  if (team.anaesthesiologist) items.push(ipdItem(team.anaesthesiologist, 'Anaesthesiologist'));
  pushRole('Scrub nurse', team.scrubNurse);
  pushRole('Circulating nurse', team.floorCirculatingNurse);
  return items.filter(Boolean);
}

function noteEntryLabel(baseLabel, note, { includePeriod = false } = {}) {
  const parts = [note?.date, note?.time];
  if (includePeriod && (note?.period || note?.shift)) {
    parts.push(note.period || note.shift);
  }
  const suffix = parts.filter(Boolean).join(' · ');
  return suffix ? `${baseLabel} · ${suffix}` : baseLabel;
}

function extractProgressNoteText(note = {}) {
  if (!note || typeof note !== 'object') return '';
  if (typeof note.note === 'string' && note.note.trim()) return note.note.trim();
  if (typeof note.notes === 'string' && note.notes.trim()) return note.notes.trim();
  if (Array.isArray(note.notes)) {
    return note.notes.map((line) => String(line || '').trim()).filter(Boolean).join(' ');
  }
  return '';
}

function hasProgressStructure(note = {}) {
  return Boolean(
    (note.chiefComplaint || []).length
    || note.findings
    || note.plan
    || note.physicalExamination
    || note.courseInHospital
    || (note.vitals && Object.values(note.vitals).some((v) => v != null && String(v).trim()))
    || (note.examination && Object.keys(note.examination).length)
    || (note.generalExamination && Object.keys(note.generalExamination).length)
    || (Array.isArray(note.additionalRemarks) ? note.additionalRemarks.length : Boolean(note.additionalRemarks))
  );
}

function appendNoteSections(sections, notes, { prefix, includePeriod, blocks, moduleCopyKey }) {
  asList(notes).forEach((note, index) => {
    const keyPrefix = `${prefix}_${index}`;
    const label = (base) => noteEntryLabel(base, note, { includePeriod });
    blocks.forEach(({ suffix, labelBase, icon, layout, items }) => {
      appendSection(sections, {
        key: `${keyPrefix}_${suffix}`,
        label: label(labelBase),
        icon,
        layout,
        items: items(note),
        ...(moduleCopyKey ? { copyKey: moduleCopyKey } : {}),
      });
    });
  });
}

function buildAssessmentSections(assessments) {
  if (!assessments || typeof assessments !== 'object') return [];

  const basic = assessments.basicInfo || {};
  const physical = assessments.physicalExamination || {};
  const additional = assessments.additionalNotes || {};
  const sections = [];

  appendAssessmentSection(sections, {
    key: 'ward_room',
    label: 'Ward / room',
    icon: 'activity',
    layout: 'split',
    items: [ipdItem(joinMeta(assessments.wardTitle, assessments.roomNumber))].filter(Boolean),
  });

  appendAssessmentSection(sections, {
    key: 'patient_details',
    label: 'Patient details',
    icon: 'activity',
    layout: 'split',
    items: [
      ipdItem(assessments.patientName, 'Patient'),
      ipdItem([assessments.age, assessments.gender].filter(Boolean).join(' / '), 'Age / gender'),
    ].filter(Boolean),
  });

  appendAssessmentSection(sections, {
    key: 'informant',
    label: 'Informant',
    icon: 'activity',
    layout: 'split',
    items: [ipdItem(basic.informant)].filter(Boolean),
  });

  appendAssessmentSection(sections, {
    key: 'presenting_complaints',
    label: 'Presenting complaints',
    icon: 'diagnosis',
    layout: 'bullets',
    items: toBullets(mapComplaints(basic.presentingComplaints)),
  });

  appendAssessmentSection(sections, {
    key: 'current_medications',
    label: 'Meds (Rx)',
    icon: 'pill',
    layout: 'meds',
    items: mapMedications(basic.currentMedications),
  });

  appendAssessmentSection(sections, {
    key: 'lab_results',
    label: 'Lab results',
    icon: 'lab',
    layout: 'split',
    items: mapLabResults(basic.labResults),
  });

  appendAssessmentSection(sections, {
    key: 'past_medical_history',
    label: 'Past medical history',
    icon: 'activity',
    layout: 'bullets',
    items: toBullets((basic.pastMedicalHistory || [])
      .map((entry) => ipdItem(entry?.title, joinMeta(entry?.since, entry?.notes)))
      .filter(Boolean)),
  });

  appendAssessmentSection(sections, {
    key: 'obstetric_history',
    label: 'Obstetric history',
    icon: 'activity',
    layout: 'bullets',
    items: mapStringItems(basic.obstetricHistory),
  });

  appendAssessmentSection(sections, {
    key: 'gyneac_history',
    label: 'Gynaec history',
    icon: 'activity',
    layout: 'bullets',
    items: mapStringItems(basic.gyneacHistory),
  });

  appendAssessmentSection(sections, {
    key: 'vitals',
    label: 'Vitals',
    icon: 'activity',
    layout: 'split',
    items: mapVitals(physical.vitals),
  });

  appendAssessmentSection(sections, {
    key: 'general_examination',
    label: 'General examination',
    icon: 'stethoscope',
    layout: 'bullets',
    items: [
      ...mapExaminationSystems(physical.generalExamination || physical.examination),
      ...mapStringItems(physical.others),
    ],
  });

  appendAssessmentSection(sections, {
    key: 'functional_assessment',
    label: 'Functional assessment',
    icon: 'activity',
    layout: 'split',
    items: mapFunctionalAssessment(assessments.functionalAssessment),
  });

  appendAssessmentSection(sections, {
    key: 'provisional_diagnosis',
    label: 'Provisional diagnosis',
    icon: 'diagnosis',
    layout: 'split',
    items: mapDiagnosis(assessments.provisionalDiagnosis),
  });

  appendAssessmentSection(sections, {
    key: 'treatment_plan',
    label: 'Treatment plan',
    icon: 'lightbulb',
    layout: 'bullets',
    items: mapTreatmentPlan(assessments.treatmentPlan),
  });

  appendAssessmentSection(sections, {
    key: 'additional_notes',
    label: 'Additional notes',
    icon: 'lightbulb',
    layout: 'bullets',
    items: [
      // new schema: specialInstruction (singular); old schema: specialInstructions (plural)
      ...withMeta(mapTextField(additional.specialInstruction || additional.specialInstructions), 'Special instructions'),
      ...withMeta(mapTextField(additional.dischargeCriteria), 'Discharge criteria'),
      ...withMeta(mapTextField(additional.advice), 'Advice'),
      ...withMeta(mapTextField(additional.followUp), 'Follow-up'),
      ...mapStringItems(assessments.others),
    ],
  });

  return sections;
}

const CONSULTANT_NOTE_BLOCKS = [
  {
    suffix: 'clinical',
    labelBase: 'Clinical assessment & plan',
    icon: 'stethoscope',
    layout: 'bullets',
    items: (note) => [
      // new schema: clinicalAssessmentAndPlan; old schema: clinicalAssessmentPlan
      ...mapTextField(note.clinicalAssessmentAndPlan || note.clinicalAssessmentPlan),
      ...mapTextField(note.findings, 'Findings'),
      ...mapTextField(note.recommendations, 'Recommendations'),
    ],
  },
  {
    suffix: 'vitals',
    labelBase: 'Vitals',
    icon: 'activity',
    layout: 'split',
    items: (note) => [...mapVitals(note.vitals), ...mapStringItems(note.others)],
  },
  {
    suffix: 'fluid',
    labelBase: 'Fluid balance',
    icon: 'lab',
    layout: 'split',
    items: (note) => mapFluidBalance(note.fluidBalance),
  },
  {
    suffix: 'examination',
    labelBase: 'General examination',
    icon: 'stethoscope',
    layout: 'bullets',
    // new schema: generalExamination; old schema: examination
    items: (note) => mapExaminationSystems(note.generalExamination || note.examination),
  },
  {
    suffix: 'meds',
    labelBase: 'Medications',
    icon: 'pill',
    layout: 'meds',
    // new schema: medications; old schema: currentMedication
    items: (note) => mapMedications(note.medications || note.currentMedication),
  },
  {
    suffix: 'labs',
    labelBase: 'Lab investigations',
    icon: 'lab',
    layout: 'split',
    items: (note) => (note.labInvestigation || [])
      .map((entry) => ipdItem(entry?.name, entry?.notes))
      .filter(Boolean),
  },
  {
    suffix: 'remarks',
    labelBase: 'Additional remarks',
    icon: 'lightbulb',
    layout: 'bullets',
    items: (note) => mapTextField(note.additionalRemarks),
  },
];

function buildConsultantNoteSections(notes) {
  const sections = [];
  appendNoteSections(sections, notes, {
    prefix: 'consultant',
    includePeriod: false,
    blocks: CONSULTANT_NOTE_BLOCKS,
    moduleCopyKey: 'CONSULTANT_NOTES',
  });
  return sections;
}

function buildProgressNoteSections(notes) {
  const sections = [];

  asList(notes).forEach((rawNote, index) => {
    const prefix = `progress_${index}`;
    const label = (base) => noteEntryLabel(base, rawNote, { includePeriod: true });
    const noteText = extractProgressNoteText(rawNote);

    if (noteText && !hasProgressStructure(rawNote)) {
      appendSection(sections, {
        key: `${prefix}_summary`,
        label: label('Progress note'),
        icon: 'activity',
        layout: 'bullets',
        items: [ipdItem(noteText)],
      });
      return;
    }

    const note = {
      ...rawNote,
      period: rawNote.period || rawNote.shift,
      additionalRemarks: [
        ...(Array.isArray(rawNote.additionalRemarks)
          ? rawNote.additionalRemarks
          : rawNote.additionalRemarks
            ? [rawNote.additionalRemarks]
            : []),
        ...(noteText ? [noteText] : []),
      ],
    };

    appendSection(sections, {
      key: `${prefix}_chief_complaint`,
      label: label('Chief complaint'),
      icon: 'activity',
      layout: 'split',
      items: mapComplaints(note.chiefComplaint),
    });

    appendSection(sections, {
      key: `${prefix}_findings`,
      label: label('Findings'),
      icon: 'stethoscope',
      layout: 'bullets',
      items: [...mapTextField(note.findings), ...mapPhysicalExamination(note.physicalExamination)],
    });

    appendSection(sections, {
      key: `${prefix}_vitals`,
      label: label('Vitals'),
      icon: 'activity',
      layout: 'split',
      items: mapVitals(note.vitals),
    });

    appendSection(sections, {
      key: `${prefix}_examination`,
      label: label('General examination'),
      icon: 'stethoscope',
      layout: 'bullets',
      // new schema: generalExamination; old schema: examination
      items: mapExaminationSystems(note.generalExamination || note.examination),
    });

    appendSection(sections, {
      key: `${prefix}_course`,
      label: label('Course in hospital'),
      icon: 'activity',
      layout: 'bullets',
      items: mapCourseInHospital(note.courseInHospital),
    });

    appendSection(sections, {
      key: `${prefix}_plan`,
      label: label('Plan'),
      icon: 'lightbulb',
      layout: 'bullets',
      items: mapTextField(note.plan),
    });

    appendSection(sections, {
      key: `${prefix}_remarks`,
      label: label('Additional remarks'),
      icon: 'lightbulb',
      layout: 'bullets',
      items: mapStringItems(note.additionalRemarks),
    });

    if (!sections.some((section) => section.key.startsWith(`${prefix}_`)) && noteText) {
      appendSection(sections, {
        key: `${prefix}_summary`,
        label: label('Progress note'),
        icon: 'activity',
        layout: 'bullets',
        items: [ipdItem(noteText)],
      });
    }
  });

  return sections;
}

function buildCrossReferralSections(crossReferral) {
  if (!crossReferral || typeof crossReferral !== 'object') return [];

  const sections = [];
  const isFlat = !crossReferral.referralInformation
    && Boolean(crossReferral.referredTo || crossReferral.reason);

  if (isFlat) {
    const referredTo = crossReferral.referredTo;
    appendSection(sections, {
      key: 'referral_information',
      label: 'Referral information',
      icon: 'diagnosis',
      layout: 'split',
      items: [
        typeof referredTo === 'string' ? ipdItem(referredTo, 'Referred to') : ipdItem(referredTo?.name, 'Referred to'),
        ipdItem(crossReferral.reason, 'Reason for referral'),
        ipdItem(crossReferral.referralDate, 'Referral date'),
      ].filter(Boolean),
    });
    return sections;
  }

  const info = crossReferral.referralInformation || {};
  // new schema: relativesInformed is at the top level of crossReferral
  // old schema: relativesInformed was inside referralInformation
  const relatives = crossReferral.relativesInformed || info.relativesInformed || {};

  appendSection(sections, {
    key: 'referral_information',
    label: 'Referral information',
    icon: 'diagnosis',
    layout: 'split',
    items: [
      ipdItem(info.referringDepartment, 'Referring department'),
      // new schema: referringTo is a string; old schema: referringTo was an object with .name
      ipdItem(typeof info.referringTo === 'string' ? info.referringTo : info.referringTo?.name, 'Referring to'),
      ipdItem(info.referralDate, 'Referral date'),
      ...withMeta(mapTextField(info.reasonForReferral), 'Reason for referral'),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'relatives_informed',
    label: 'Relatives informed',
    icon: 'activity',
    layout: 'split',
    items: [
      // new schema: informedByDoctorName; old schema: informedByDoctor.name
      ipdItem(relatives.informedByDoctorName || relatives.informedByDoctor?.name, 'Informed by'),
      ipdItem(relatives.informedTo, 'Informed to'),
      // new schema: informedOnDate/informedOnTime; old schema: informedDate/informedTime
      ipdItem(relatives.informedOnDate || relatives.informedDate, 'Informed on date'),
      ipdItem(relatives.informedOnTime || relatives.informedTime, 'Informed on time'),
    ].filter(Boolean),
  });

  (crossReferral.consultationNotes || []).forEach((note, index) => {
    appendSection(sections, {
      key: `cross_consult_${index}`,
      label: noteEntryLabel('Consultation notes', note),
      icon: 'stethoscope',
      layout: 'bullets',
      items: [
        ...withMeta(mapStringItems(note.clinicalAssessment), 'Clinical assessment'),
        ...withMeta(mapStringItems(note.impression), 'Impression'),
        ...mapStringItems(note.additionalRemarks),
        note.followUp ? ipdItem(note.followUp, 'Follow-up') : null,
      ].filter(Boolean),
    });
  });

  return sections;
}

function buildDischargeSummarySections(discharge) {
  if (!discharge || typeof discharge !== 'object') return [];

  const sections = [];
  const patientInfo = discharge.patientInformation || {};
  const wardLine = joinMeta(patientInfo.wardTitle, patientInfo.roomNumber)
    || patientInfo.wardBedNo;

  appendSection(sections, {
    key: 'discharge_patient',
    label: 'Patient information',
    icon: 'activity',
    layout: 'bullets',
    items: mapStringItems([
      patientInfo.patientName,
      wardLine,
      patientInfo.admissionDate,
      patientInfo.dateOfDischarge,
    ].filter(Boolean)),
  });

  appendSection(sections, {
    key: 'discharge_dx',
    label: 'Final diagnosis',
    icon: 'diagnosis',
    layout: 'split',
    items: mapDiagnosis(discharge.diagnosisAndSurgery?.finalDiagnosis),
  });

  const course = discharge.courseInHospital || {};
  appendSection(sections, {
    key: 'discharge_course',
    label: 'Course in hospital',
    icon: 'stethoscope',
    layout: 'bullets',
    items: [
      ...mapStringItems(course.treatmentGiven),
      ...mapCourseInHospital({ chronologicalSummary: course.chronologicalSummary }),
    ],
  });

  const dischargeNotes = discharge.dischargeNotes || {};
  appendSection(sections, {
    key: 'discharge_condition',
    label: 'Condition at discharge',
    icon: 'activity',
    layout: 'bullets',
    items: mapStringItems(dischargeNotes.patientCondition),
  });

  appendSection(sections, {
    key: 'discharge_meds',
    label: 'Discharge medications',
    icon: 'pill',
    layout: 'meds',
    items: mapMedications(dischargeNotes.dischargeMedications),
  });

  const advice = discharge.dischargeAdvice || {};
  appendSection(sections, {
    key: 'discharge_advice',
    label: 'Discharge advice',
    icon: 'lightbulb',
    layout: 'bullets',
    items: [
      ...withMeta(mapStringItems(advice.diet), 'Diet'),
      ...withMeta(mapStringItems(advice.physicalActivities), 'Activity'),
      ...mapStringItems(advice.otherAdvice),
      ...withMeta(mapStringItems(advice.warningSigns), 'Warning signs'),
      ...withMeta(mapStringItems(advice.emergencyInstructions), 'Emergency'),
    ],
  });

  return sections;
}

function isCompactOtNotes(otNotes) {
  return !otNotes.surgeryDetails && Boolean(
    otNotes.procedure || otNotes.procedureName || otNotes.primarySurgeon
    || otNotes.surgeon || otNotes.operativeFindings || otNotes.anesthesia
    || otNotes.anaesthetistType || otNotes.procedureDetails || otNotes.postOperativeOrders
  );
}

function buildCompactOtNoteSections(otNotes) {
  const sections = [];

  appendSection(sections, {
    key: 'ot_surgery_details',
    label: 'Surgery details',
    icon: 'diagnosis',
    layout: 'split',
    items: [
      ipdItem(otNotes.date, 'Date'),
      ipdItem(otNotes.time, 'Time'),
      ...withMeta(mapStringItems(otNotes.procedureName || otNotes.procedure), 'Procedure'),
      ipdItem(otNotes.procedureDetails, 'Procedure details'),
      ipdItem(otNotes.anaesthetistType || otNotes.anesthesia, 'Anaesthesia'),
      ipdItem(otNotes.startTime, 'Start time'),
      ipdItem(otNotes.endTime, 'End time'),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'ot_surgery_team',
    label: 'Surgery team',
    icon: 'activity',
    layout: 'split',
    items: [
      ipdItem(otNotes.primarySurgeon, 'Primary surgeon'),
      ...(otNotes.assistants || []).map((name) => ipdItem(name, 'Assistant')),
      ...withMeta(mapStringItems(otNotes.surgeon), 'Surgery team'),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'ot_operative',
    label: 'Operation notes',
    icon: 'stethoscope',
    layout: 'bullets',
    items: [
      ...withMeta(mapStringItems(otNotes.operativeFindings), 'Operative findings'),
      ipdItem(otNotes.complications, 'Complications'),
      ipdItem(otNotes.bloodLoss || otNotes.estimatedBloodLoss, 'Estimated blood loss'),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'ot_post',
    label: 'Post operation notes',
    icon: 'lightbulb',
    layout: 'bullets',
    items: withMeta(mapStringItems(otNotes.postOperativeOrders), 'Post-op orders'),
  });

  return sections;
}

function buildNestedOtNoteSections(otNotes) {
  const sections = [];
  const surgery = otNotes.surgeryDetails || {};
  const operative = otNotes.operativeNotes || {};
  const intra = otNotes.intraOperativeNotes || {};
  const postOp = otNotes.postOperativeNotes || {};

  appendSection(sections, {
    key: 'ot_surgery_details',
    label: 'Surgery details',
    icon: 'diagnosis',
    layout: 'split',
    items: [
      // new schema: surgeryProcedureName (array of strings); old schema: procedureName
      ...withMeta(mapStringItems(surgery.surgeryProcedureName || surgery.procedureName), 'Procedure'),
      ipdItem(surgery.anaesthesiaType, 'Anaesthesia type'),
      ipdItem(surgery.surgeryDate, 'Surgery date'),
      ipdItem(surgery.surgeryStartTime, 'Start time'),
      ipdItem(surgery.surgeryEndTime, 'End time'),
      // new schema: preOperativeDiagnosis (string); old schema: diagnosis
      ...withMeta(mapTextField(surgery.preOperativeDiagnosis || surgery.diagnosis), 'Diagnosis'),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'ot_surgery_team',
    label: 'Surgery team',
    icon: 'activity',
    layout: 'split',
    items: mapSurgeryTeam(otNotes.surgeryTeam),
  });

  appendSection(sections, {
    key: 'ot_operative',
    label: 'Operation notes',
    icon: 'stethoscope',
    layout: 'bullets',
    items: [
      ...withMeta(mapStringItems(operative.operativeFindings), 'Operative findings'),
      ...withMeta(mapStringItems(operative.procedure), 'Procedure'),
      ...mapStringItems(operative.additionalNotes),
    ],
  });

  appendSection(sections, {
    key: 'ot_intra',
    label: 'Intra operation notes',
    icon: 'activity',
    layout: 'split',
    items: [
      // new schema: complicationsAndSeverity (string); old: complicationsSeverity
      ...withMeta(mapTextField(intra.complicationsAndSeverity || intra.complicationsSeverity), 'Complications / severity'),
      ...withMeta(mapTextField(intra.specimensSent), 'Specimens sent'),
      // new schema: implantsProstheticsUsed (string); old: implantsUsed
      ...withMeta(mapTextField(intra.implantsProstheticsUsed || intra.implantsUsed), 'Implants used'),
      ipdItem(intra.estimatedBloodLoss, 'Estimated blood loss (ml)'),
      ipdItem(intra.swabCount, 'Swab count'),
      ipdItem(intra.fluidCount, 'Fluid count'),
      // new schema: sutureTypeCount; old: sutureType
      ipdItem(intra.sutureTypeCount || intra.sutureType, 'Suture type'),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'ot_post',
    label: 'Post operation notes',
    icon: 'lightbulb',
    layout: 'bullets',
    items: [
      ipdItem(postOp.postOpDestination, 'Post-op destination'),
      ...mapStringItems(postOp.additionalInstructions),
    ].filter(Boolean),
  });

  appendSection(sections, {
    key: 'ot_others',
    label: 'Other notes',
    icon: 'activity',
    layout: 'bullets',
    items: mapStringItems(otNotes.others),
  });

  return sections;
}

export function hasIpdDigitizedModules(digitizedOutput) {
  if (!digitizedOutput || typeof digitizedOutput !== 'object') return false;
  return IPD_MODULE_KEYS.some((key) => digitizedOutput[key]);
}

export function getOtNoteSections(digitizedOutput) {
  const otNotes = digitizedOutput?.OT_NOTES;
  if (!otNotes || typeof otNotes !== 'object') return [];
  return isCompactOtNotes(otNotes)
    ? buildCompactOtNoteSections(otNotes)
    : buildNestedOtNoteSections(otNotes);
}

export function buildIpdNoteSections(digitizedOutput) {
  if (!digitizedOutput || typeof digitizedOutput !== 'object') return [];
  return [
    ...buildAssessmentSections(digitizedOutput.ASSESSMENTS),
    ...buildConsultantNoteSections(digitizedOutput.CONSULTANT_NOTES),
    ...buildProgressNoteSections(digitizedOutput.PROGRESS_NOTES),
    ...getOtNoteSections(digitizedOutput),
    ...buildCrossReferralSections(digitizedOutput.CROSS_REFERRAL),
    ...buildDischargeSummarySections(digitizedOutput.DISCHARGE_SUMMARY),
  ];
}

export function getIpdTabSections(digitizedOutput, tabKey) {
  if (!digitizedOutput || typeof digitizedOutput !== 'object') return [];

  switch (tabKey) {
    case 'assessments':
      return buildAssessmentSections(digitizedOutput.ASSESSMENTS);
    case 'consultant':
      return buildConsultantNoteSections(digitizedOutput.CONSULTANT_NOTES);
    case 'progress':
      return buildProgressNoteSections(digitizedOutput.PROGRESS_NOTES);
    case 'ot':
      return getOtNoteSections(digitizedOutput);
    case 'cross_referral':
      return buildCrossReferralSections(digitizedOutput.CROSS_REFERRAL);
    case 'discharge':
      return buildDischargeSummarySections(digitizedOutput.DISCHARGE_SUMMARY);
    default:
      return [];
  }
}

export function getVisibleIpdCaptureTabs(
  digitizedOutput,
  { conversation = [], transcription = '', tasks = [] } = {}
) {
  const tabs = IPD_CAPTURE_TABS.filter(
    (tab) => getIpdTabSections(digitizedOutput, tab.key).length > 0
  );

  const hasTranscript = conversation.length > 0 || String(transcription || '').trim().length > 0;
  if (hasTranscript) tabs.push({ key: 'transcript', label: 'Transcript' });
  if (tasks.length > 0) tabs.push({ key: 'tasks', label: 'Tasks', count: tasks.length });

  return tabs;
}
