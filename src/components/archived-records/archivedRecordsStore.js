import { useSyncExternalStore } from "react";
import ARCHIVED_RECORDS_MOCK, { DOMAINS } from "./mock/archivedRecordsMock";
import { RX_COLUMNS, factFromRx, rxEditKeys } from "./rxFormat";

/**
 * Review state for archived records.
 *
 * One tiny external store so the Rx-pad rail panel, the review drawer and the
 * patient-details page all show the same verified / to-review picture without
 * a provider. In the real build this becomes the cache in front of the
 * extraction service: `verify` and `reject` turn into API calls and the
 * reviewer + timestamp come back from the server (schema domain QC).
 */

export const CLEAR_CONFIDENCE = 0.85;

// viewer.n is a counter so that opening the same page twice still scrolls to it.
// edits holds a reviewer's corrections, keyed by finding id, each as the
// corrected Rx pad row: { rx: { name, dosage, frequency, ... } }. The reading
// itself (verbatim, source page) is never changed: an edit sits on top of it
// and can be undone.
let state = { review: {}, edits: {}, viewer: { page: 2, rid: null, n: 0 }, quickView: false, focusDomain: null };
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());
const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

const stamp = (status, reviewer, extra) => ({
  status,
  by: reviewer || "You",
  at: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }),
  ...extra,
});

export const archivedRecordsStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
  verify(ids, reviewer) {
    const review = { ...state.review };
    [].concat(ids).forEach((id) => {
      review[id] = stamp("verified", reviewer, state.edits[id] ? { edited: true } : undefined);
    });
    set({ review });
  },
  // "Remove" in the UI. Nothing is deleted: the item is left out of the
  // patient record, stays listed as removed, and can be brought back.
  reject(ids, reviewer) {
    const review = { ...state.review };
    [].concat(ids).forEach((id) => {
      review[id] = stamp("rejected", reviewer);
    });
    set({ review });
  },
  reset(ids) {
    const review = { ...state.review };
    [].concat(ids).forEach((id) => delete review[id]);
    set({ review });
  },
  // Saving a correction also verifies it: the reviewer has read the page and
  // typed what it should say. `patch` is { rx: the corrected Rx pad row }.
  edit(id, patch, reviewer) {
    set({
      edits: { ...state.edits, [id]: patch },
      review: { ...state.review, [id]: stamp("verified", reviewer, { edited: true }) },
    });
  },
  // Back to what was read from the page, and back to "to review".
  revertEdit(id) {
    const edits = { ...state.edits };
    const review = { ...state.review };
    delete edits[id];
    delete review[id];
    set({ edits, review });
  },
  // quick: true also opens the light "source page" drawer used on the Rx pad.
  openSource(page, rid = null, { quick = false } = {}) {
    set({ viewer: { page, rid, n: state.viewer.n + 1 }, quickView: quick ? true : state.quickView });
  },
  closeQuickView() {
    set({ quickView: false });
  },
  focusDomain(code) {
    set({ focusDomain: code });
  },
};

/* ----------------------------------------------------------------- edits */

// Which fields a reviewer may correct, by kind of fact: the Rx pad's own
// fields for that kind (see rxFormat.js). A lab also has its high / low flag.
export const EDIT_FIELDS = {
  ...Object.fromEntries(Object.entries(RX_COLUMNS).map(([domain, columns]) => [domain, columns.map((column) => column.key)])),
  LAB: [...RX_COLUMNS.LAB.map((column) => column.key), "arrowDirection"],
  default: RX_COLUMNS.RPT.map((column) => column.key),
};
export const editFieldsFor = rxEditKeys;

// A finding as it should be shown: the reading with the correction on top.
// The correction is stored as the Rx pad row (`rx`), which is what the table
// and the copied JSON read. The fact's own fields are rewritten from it, so
// the sentence views, the summary and search show the same correction.
// `original` keeps what was read so the UI can always show both.
function applyEdit(finding, patch) {
  if (!patch?.rx) return finding;
  return { ...finding, ...factFromRx(finding, patch.rx), rx: patch.rx, edited: true, original: finding };
}

let cache = { edits: null, bundle: ARCHIVED_RECORDS_MOCK };
const bundleWith = (edits) => {
  if (cache.edits !== edits) {
    cache = {
      edits,
      bundle: Object.keys(edits).length
        ? { ...ARCHIVED_RECORDS_MOCK, findings: ARCHIVED_RECORDS_MOCK.findings.map((item) => applyEdit(item, edits[item.id])) }
        : ARCHIVED_RECORDS_MOCK,
    };
  }
  return cache.bundle;
};

export function useArchivedRecords() {
  const snapshot = useSyncExternalStore(archivedRecordsStore.subscribe, archivedRecordsStore.getSnapshot);
  return { ...snapshot, bundle: bundleWith(snapshot.edits) };
}

/* ------------------------------------------------------------- selectors */

export const statusOf = (review, id) => review[id]?.status || "draft";

// "Clear" = read with high confidence and carrying no flag. Only these may be
// verified in bulk; anything flagged has to be looked at on its own.
export const isClear = (finding) => finding.confidence >= CLEAR_CONFIDENCE && finding.flags.length === 0 && !finding.hold;

// A held finding was read too poorly to put in front of a doctor. It stays out
// of the reading view until a reviewer verifies it.
export const isShownToDoctor = (finding, review) => {
  const status = statusOf(review, finding.id);
  if (status === "rejected") return false;
  return !finding.hold || status === "verified";
};

// Needs a person to look: flagged, held back, or hard to read. These are never
// verified in bulk.
// A reading that arrives with no confidence at all is treated as hard to read.
export const needsAttention = (finding) => finding.flags.length > 0 || Boolean(finding.hold) || !(finding.confidence >= 0.7);

export const exceptionFor = (bundle, findingId) => bundle.exceptions.find((item) => item.findingId === findingId) || null;

// A lab result earns a place in the reading views when its latest value is
// out of range, or when it was out of range earlier and has come back
// (the recovery is itself worth seeing). Always-normal results are counted.
export const isNotableLab = (finding) => Boolean(finding.abnormal) || Boolean(finding.series?.some((point) => point.f));

export const confidenceBand = (value) => (value >= CLEAR_CONFIDENCE ? "high" : value >= 0.7 ? "medium" : "low");

export function countsFor(findings, review) {
  const total = findings.length;
  const verified = findings.filter((item) => statusOf(review, item.id) === "verified").length;
  const rejected = findings.filter((item) => statusOf(review, item.id) === "rejected").length;
  return { total, verified, rejected, pending: total - verified - rejected };
}

export function domainSummaries(bundle, review) {
  return DOMAINS.map((domain) => {
    const items = bundle.findings.filter((item) => item.domain === domain.code);
    return { ...domain, items, ...countsFor(items, review) };
  });
}

// What the patient's Medical History gains from this review, by TP section.
export function historyAdditions(bundle, review) {
  const sections = {};
  DOMAINS.filter((domain) => domain.historySection).forEach((domain) => {
    sections[domain.historySection] = bundle.findings.filter(
      (item) => item.domain === domain.code && statusOf(review, item.id) === "verified",
    );
  });
  return sections;
}

export const documentForPage = (bundle, page) =>
  bundle.documents.find((doc) => page >= doc.from && page <= doc.to) || null;

// Citations are numbered by document: [2] is always the discharge summary.
export const citeNumberForPage = (bundle, page) => {
  const index = bundle.documents.findIndex((doc) => page >= doc.from && page <= doc.to);
  return index < 0 ? null : index + 1;
};

// All the places a finding can be checked, without repeating a document.
export const citesOf = (bundle, finding) => {
  const seen = new Set();
  return [finding.cite, ...(finding.also || [])].filter((cite) => {
    const number = citeNumberForPage(bundle, cite.page);
    if (seen.has(number)) return false;
    seen.add(number);
    return true;
  });
};
