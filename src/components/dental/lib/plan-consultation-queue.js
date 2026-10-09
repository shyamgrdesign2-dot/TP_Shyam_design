import {
  formatComposedRxSnapshotSummary,
  getComposedRxPreviewSnapshot } from
"../tp-rxpad/rx-preview-composer";

export const PLAN_CONSULTATION_QUEUE_PREFIX = "tp.plan.consultation.queue.";
export const PLAN_CONSULTATION_FLUSH_EVENT = "tp-plan-flush-consultations";

function queueKey(patientId) {
  return `${PLAN_CONSULTATION_QUEUE_PREFIX}${patientId || "apt-1"}`;
}

/** Call before navigating to End Visit when the Rx URL includes planId + serviceId. */
export function pushPlanConsultationFromRxPage(patientId) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const planId = params.get("planId");
  const serviceId = params.get("serviceId");
  if (!planId || !serviceId) return;

  const snapshot = getComposedRxPreviewSnapshot(patientId);
  const summaryText = formatComposedRxSnapshotSummary(snapshot);
  const appointmentId = params.get("appointmentId") ?? undefined;

  const item = {
    patientId,
    planId,
    serviceId,
    appointmentId,
    summaryText,
    endedAt: new Date().toISOString(),
    id: `cns-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    source: appointmentId ? "appointment" : "treatment-row"
  };

  const key = queueKey(patientId);
  let prev = [];
  try {
    prev = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(prev)) prev = [];
  } catch {
    prev = [];
  }
  prev.push(item);
  localStorage.setItem(key, JSON.stringify(prev));
  window.dispatchEvent(new Event(PLAN_CONSULTATION_FLUSH_EVENT));
}