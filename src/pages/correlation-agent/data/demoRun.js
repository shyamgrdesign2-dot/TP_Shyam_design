/**
 * Runtime store for the current correlation run.
 *
 * This file used to hold a hand-written fixture: an invented patient, 30
 * transcribed lab values, and a set of correlations and hypotheses authored to
 * look like a real run. All of that is gone. Nothing here is invented any more.
 *
 * The chart reads these bindings at module scope, so they exist and start
 * EMPTY. A live run fills them through `applyLiveRun`, and the chart renders
 * whatever the service actually returned. Before the first run there is nothing
 * to show, which is correct: there is no result until the agent has produced
 * one.
 *
 * The reports the picker offers do NOT live here. They are the patient's own
 * lab entries and medical records, built from the live APIs and handed to the
 * drawer as a prop. What lives here is only the OUTPUT of a run.
 */

export let FINDINGS = [];
export let CORRELATIONS = [];
export let HYPOTHESES = [];
export let LINKS = [];
export let REPORTS = [];
export let RUN_META = null;

function indexById(list) {
  const out = {};
  (list || []).forEach((x) => {
    if (x && x.id) out[x.id] = x;
  });
  return out;
}

export let byId = indexById([]);

/** Put a real run on screen. `reports` is what was sent, so the chart can draw
 *  the report brackets that group findings by their source. */
export function applyLiveRun({ findings, correlations, hypotheses, links, meta, reports }) {
  FINDINGS = findings || [];
  CORRELATIONS = correlations || [];
  HYPOTHESES = hypotheses || [];
  LINKS = links || [];
  RUN_META = meta || null;
  if (reports) REPORTS = reports;
  byId = indexById([...FINDINGS, ...CORRELATIONS, ...HYPOTHESES]);
}

/**
 * Clear the store.
 *
 * This module holds its state at module scope, which outlives any component —
 * including the patient. Nothing called this, so a run read from one patient
 * stayed in memory while the next patient was open. REPORTS is cleared too: it
 * names the documents the run was built from, so leaving it behind would label
 * a cleared chart with the previous patient's files.
 *
 * Called from SideNavbar whenever the open patient changes.
 */
export function resetRun() {
  FINDINGS = [];
  CORRELATIONS = [];
  HYPOTHESES = [];
  LINKS = [];
  REPORTS = [];
  RUN_META = null;
  byId = indexById([]);
}

/**
 * Parse a report's date to a timestamp, so the picker can group and window by
 * date. Handles the compact forms our own listings use ("10 Jul'26",
 * "10 Jul, 26") as well as anything Date.parse understands.
 */
export function reportTimestamp(report) {
  const raw = String(report?.date || "").trim();
  if (!raw) return 0;
  const m = raw.match(/^(\d{1,2})\s*([A-Za-z]{3,})[',\s]+(\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const t = Date.parse(`${m[1]} ${m[2]} ${year}`);
    if (!Number.isNaN(t)) return t;
  }
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}
