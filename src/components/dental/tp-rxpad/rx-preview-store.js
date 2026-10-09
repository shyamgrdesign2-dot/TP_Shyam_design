const STORAGE_PREFIX = "tp-rx-preview:";
const DENTAL_STORAGE_PREFIX = "tp-rx-preview-dental:";

function getStorageKey(patientId) {
  return `${STORAGE_PREFIX}${patientId || "apt-1"}`;
}

function getDentalStorageKey(patientId) {
  return `${DENTAL_STORAGE_PREFIX}${patientId || "apt-1"}`;
}

export function saveRxPreviewSnapshot(patientId, snapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getStorageKey(patientId),
    JSON.stringify(snapshot),
  );
}

export function loadRxPreviewSnapshot(patientId) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getStorageKey(patientId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDentalPreviewSnapshot(patientId, snapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getDentalStorageKey(patientId),
    JSON.stringify(snapshot),
  );
}

export function loadDentalPreviewSnapshot(patientId) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getDentalStorageKey(patientId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
