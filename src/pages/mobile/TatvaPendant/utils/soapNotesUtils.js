const SOAP_SECTIONS = [
  { key: 'subjective', label: 'Subjective' },
  { key: 'objective', label: 'Objective' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'plan', label: 'Plan' },
];

export function rtfToPlainText(rtf) {
  if (!rtf || typeof rtf !== 'string') return '';

  const looksLikeRtf = rtf.trim().startsWith('{\\rtf') || rtf.includes('\\par') || rtf.includes('\\bullet');
  if (!looksLikeRtf) return rtf.trim();

  return rtf
    .replace(/\{\\colortbl[^}]*\}/g, '')
    .replace(/\{\\fonttbl[^}]*\}/g, '')
    .replace(/\{\\stylesheet[^}]*\}/g, '')
    .replace(/\{\\info[^}]*\}/g, '')
    .replace(/\{\\\*[^}]*\}/g, '')
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\bullet\b ?/g, '• ')
    .replace(/\\(?:[a-zA-Z]+-?\d* ?)/g, ' ')
    .replace(/\\[^a-zA-Z]/g, '')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SOAP_SECTION_ALIASES = {
  subjective: ['subjective', 's'],
  objective: ['objective', 'o'],
  assessment: ['assessment', 'a'],
  plan: ['plan', 'p'],
};

function normalizeSoapLabelToken(value = '') {
  return String(value)
    .replace(/[:\-–—•]+$/g, '')
    .trim()
    .toLowerCase();
}

function isRedundantSoapSectionLabel(line, sectionKey) {
  const token = normalizeSoapLabelToken(line);
  const aliases = SOAP_SECTION_ALIASES[sectionKey] || [sectionKey];
  return aliases.includes(token);
}

function stripLeadingSoapSectionLabel(text, sectionKey) {
  if (!text) return '';

  const label = sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
  const pattern = new RegExp(
    `^\\s*(?:${sectionKey}|${label})\\s*(?:[:\\-–—•]|\\n|$)`,
    'i'
  );

  return text.replace(pattern, '').trim();
}

export function splitSoapBullets(text, sectionKey) {
  if (!text) return [];

  const cleaned = sectionKey ? stripLeadingSoapSectionLabel(text, sectionKey) : text;

  return cleaned
    .replace(/\r/g, '')
    .replace(/•\s*/g, '\n')
    .split(/\n+/)
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean)
    .filter((line) => !sectionKey || !isRedundantSoapSectionLabel(line, sectionKey));
}

export function normalizeSoapSections(soapNotes) {
  if (!soapNotes || typeof soapNotes !== 'object') return [];

  return SOAP_SECTIONS.map((section) => {
    const raw = soapNotes[section.key];
    const text = stripLeadingSoapSectionLabel(rtfToPlainText(raw), section.key);
    let items = splitSoapBullets(text, section.key);
    if (!items.length) {
      items = ['(Not documented)'];
    }

    return {
      ...section,
      text: text || '(Not documented)',
      items,
      raw,
    };
  });
}

function getEncounterFromConsultation(consultation, encounterIndex = 0) {
  const digitizeRoot = consultation?.digitizeData || {};
  const encounters = digitizeRoot?.patientEncounters?.length
    ? digitizeRoot.patientEncounters
    : digitizeRoot?.patientLabel || digitizeRoot?.patientDetails
      ? [digitizeRoot]
      : [];
  return encounters[encounterIndex] || null;
}

export function getStoredSoapNotes(encounter, consultation, encounterIndex = 0) {
  if (encounter?.soapNotes) return encounter.soapNotes;

  const fromConsultationEncounter = getEncounterFromConsultation(consultation, encounterIndex);
  if (fromConsultationEncounter?.soapNotes) {
    return fromConsultationEncounter.soapNotes;
  }

  const patientSoapNotes = consultation?.patientSoapNotes;
  if (Array.isArray(patientSoapNotes) && patientSoapNotes.length) {
    const patientUniqueId = Number(encounter?.patient_unique_id) || 0;
    const match = patientSoapNotes.find(
      (item) => patientUniqueId > 0 && Number(item.patient_unique_id) === patientUniqueId
    ) || patientSoapNotes[encounterIndex] || patientSoapNotes[0];
    if (match?.soapNotes) return match.soapNotes;
  }

  if (consultation?.soapNotes) return consultation.soapNotes;

  const patients = consultation?.patients;
  if (Array.isArray(patients) && patients.length) {
    const patientUniqueId = encounter?.patient_unique_id;
    const match = patients.find(
      (item) => patientUniqueId && Number(item.patient_unique_id) === Number(patientUniqueId)
    ) || patients[encounterIndex] || patients[0];
    if (match?.soapNotes) return match.soapNotes;
  }

  return null;
}

export function buildSoapNotesRequest(consultation, encounter, encounterIndex = 0) {
  const transcription =
    consultation?.transcription
    || encounter?.transcription
    || '';

  const conversation = consultation?.conversation || encounter?.conversation || [];

  const digitizeRoot = consultation?.digitizeData || {};
  const encounters = digitizeRoot?.patientEncounters?.length
    ? digitizeRoot.patientEncounters
    : encounter
      ? [encounter]
      : digitizeRoot?.patientLabel || digitizeRoot?.patientDetails
        ? [digitizeRoot]
        : [];

  const payload = {
    transcription,
    conversation,
  };

  const targetEncounter = encounters[encounterIndex] || encounter;
  if (targetEncounter) {
    payload.digitizeData = {
      patientEncounters: [targetEncounter],
    };
  } else if (encounters.length) {
    payload.digitizeData = { patientEncounters: encounters };
  }

  return payload;
}

export function resolveSoapNotesFromResponse(response, encounter, encounterIndex = 0) {
  const root = response?.data ?? response;
  const patients = root?.patients || root?.data?.patients || [];

  if (!Array.isArray(patients) || !patients.length) {
    return root?.soapNotes || null;
  }

  const patientUniqueId = Number(encounter?.patient_unique_id) || 0;
  const match = patients.find(
    (item) => patientUniqueId > 0 && Number(item.patient_unique_id) === patientUniqueId
  ) || patients[encounterIndex] || patients[0];

  return match?.soapNotes || null;
}
