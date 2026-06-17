import { trackEvent } from "../../../utils/utils";

export const DR_AGENT_COPY_EVENT = "TP_DrAgent_Copy_Used";

function cleanValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanMeta(meta = {}) {
  return Object.entries(meta).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") return acc;
    acc[key] = value;
    return acc;
  }, {});
}

export function trackDrAgentCopyUsed(meta = {}) {
  const payload = cleanMeta({
    source: cleanValue(meta.source),
    source_section: cleanValue(meta.sourceSection || meta.source_section),
    component: cleanValue(meta.component),
    component_key: cleanValue(meta.componentKey || meta.component_key),
    destination: cleanValue(meta.destination),
    copy_scope: cleanValue(meta.copyScope || meta.copy_scope),
    cta: cleanValue(meta.cta),
    visit_id: cleanValue(meta.visitId || meta.visit_id),
    visit_date: cleanValue(meta.visitDate || meta.visit_date),
    is_bulk: Boolean(meta.isBulk || meta.is_bulk),
    timestamp: new Date().toISOString(),
  });

  trackEvent(DR_AGENT_COPY_EVENT, payload);
}

export function buildClinicalNotesCopyMeta(meta = {}) {
  return cleanMeta({
    source: "clinical_notes",
    source_section: "clinical_notes",
    destination: meta.destination || "rxpad",
    ...meta,
  });
}

export function buildPastVisitCopyMeta(meta = {}) {
  return cleanMeta({
    source: "past_visits",
    source_section: "past_visits",
    destination: "rxpad",
    ...meta,
  });
}
