const SOAP_SECTION_KEYS = ["subjective", "objective", "assessment", "plan"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function firstNonEmptyString(values) {
  return values.find(isNonEmptyString) || "";
}

function hasNonEmptyObject(value) {
  return value && typeof value === "object" && Object.keys(value).length > 0;
}

function hasSoapSectionKeys(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    SOAP_SECTION_KEYS.some((key) => value[key] != null && value[key] !== "")
  );
}

function pickSoapSections(value) {
  if (!hasSoapSectionKeys(value)) return null;
  return SOAP_SECTION_KEYS.reduce((acc, key) => {
    if (value[key] != null && value[key] !== "") {
      acc[key] = value[key];
    }
    return acc;
  }, {});
}

export function resolveVoiceSoapHtml(payload = {}) {
  if (!payload || typeof payload !== "object") return "";
  const soap = payload.soap && typeof payload.soap === "object" ? payload.soap : {};
  const soapNotes = payload.soapNotes && typeof payload.soapNotes === "object" ? payload.soapNotes : {};
  const soapNote = payload.soapNote && typeof payload.soapNote === "object" ? payload.soapNote : {};

  return firstNonEmptyString([
    soap.soapHtml,
    soap.soapHTML,
    soap.soap_html,
    soap.html,
    soap.contentHtml,
    soap.htmlContent,
    payload.soapHtml,
    payload.soapHTML,
    payload.soap_html,
    payload.soapNoteHtml,
    payload.soapNotesHtml,
    payload.soap_note_html,
    payload.soap_notes_html,
    soapNotes.soapHtml,
    soapNotes.soap_html,
    soapNotes.html,
    soapNote.soapHtml,
    soapNote.soap_html,
    soapNote.html,
  ]);
}

export function resolveVoiceSoapSections(payload = {}) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.soap,
    payload.soapRtf,
    payload.soapRTF,
    payload.soap_rtf,
    payload.soapStructured,
    payload.soap_structured,
    payload.soapSections,
    payload.soap_sections,
    payload.soapNotes,
    payload.soapNote,
    payload.soap?.rtf,
    payload.soap?.data,
    payload.soap?.structured,
    payload.soap?.sections,
  ];

  const candidate = candidates.find(hasSoapSectionKeys);
  return pickSoapSections(candidate);
}

export function hasMeaningfulVoicePayloadData(payload = {}) {
  if (!payload || typeof payload !== "object") return false;
  return Boolean(
    (Array.isArray(payload.history) && payload.history.length > 0) ||
    hasNonEmptyObject(payload.digitizeData) ||
    hasNonEmptyObject(payload.editedData) ||
    hasNonEmptyObject(payload.clinicNotes) ||
    hasSoapSectionKeys(resolveVoiceSoapSections(payload)) ||
    isNonEmptyString(resolveVoiceSoapHtml(payload))
  );
}

export function buildVoiceSoapStoreFields({ soap, soapHtml } = {}) {
  const safeSoapHtml = isNonEmptyString(soapHtml) ? soapHtml : "";
  const soapSections = pickSoapSections(soap);
  return {
    soap: soapSections || safeSoapHtml
      ? {
          ...(soapSections || {}),
          ...(safeSoapHtml ? { soapHtml: safeSoapHtml } : {}),
        }
      : null,
  };
}
