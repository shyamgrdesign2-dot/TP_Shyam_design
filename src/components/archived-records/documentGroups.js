import { encounterType } from "./encounterTypes";

/**
 * Documents by period.
 *
 * A paper file is easiest to find your way in by when it was written: one
 * entry per visit or stay ("IPD · Orthopaedics, 09 Jul-16 Jul'26"), newest
 * first, and under it the papers of that period. Papers that carry the same
 * name within a period (eleven consultation records, four sheets of one chart,
 * a copy of the same record in two PDFs) are one line that opens to its parts.
 *
 * Nothing here depends on one hospital's naming: a period is whatever
 * encounter the document names, and two papers are "the same" only when their
 * names agree.
 */

const pagesIn = (docs) => docs.reduce((sum, doc) => sum + (doc.to - doc.from + 1), 0);

export const periodName = (encounter) =>
  encounter ? [encounterType(encounter.type).label, encounter.department].filter(Boolean).join(" · ") : "Not tied to a visit";

// One entry per encounter that has documents, newest first; papers that name
// no encounter come last under "Not tied to a visit".
export function documentPeriods(bundle, docs = bundle.documents) {
  const byId = Object.fromEntries(bundle.encounters.map((item) => [item.id, item]));
  const order = [...bundle.encounters].sort((a, b) => String(b.sortKey || "").localeCompare(String(a.sortKey || "")) || (encounterType(a.type).stay ? -1 : 1));
  const periods = order
    .map((encounter) => ({ id: encounter.id, encounter, list: docs.filter((doc) => doc.encounterId === encounter.id) }))
    .filter((period) => period.list.length);
  const loose = docs.filter((doc) => !byId[doc.encounterId]);
  if (loose.length) periods.push({ id: "none", encounter: null, list: loose });
  return periods.map((period) => ({
    ...period,
    name: periodName(period.encounter),
    dates: period.encounter?.shortDate || "",
    pages: pagesIn(period.list),
  }));
}

// A paper's name without what makes one copy differ from the next: the
// bracketed remark, the date, the case of the letters.
const DATE = /,?\s*\(?\b\d{1,2}(?:\s*(?:to|and|-)\s*\d{1,2})?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?\)?|,?\s*\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/g;
const plain = (title = "") => title.replace(/\s*\([^)]*\)/g, "").replace(DATE, "").replace(/\s+/g, " ").replace(/[\s,:]+$/, "").trim();
const lead = (title = "") => {
  const at = plain(title).indexOf(": ");
  const head = at > 0 ? plain(title).slice(0, at) : "";
  // "Consultation record: Cardiology" shares its lead with its neighbours; a
  // one-word lead ("Orthopaedics: history…") is a department, not a name.
  return head.split(" ").length >= 2 ? head : "";
};

// Papers of one period, same-named ones folded into one line. A line is
// { name, docs, from, pages }; `docs.length === 1` is a paper on its own.
export function foldPapers(docs) {
  const count = (keyOf) => docs.reduce((map, doc) => map.set(keyOf(doc), (map.get(keyOf(doc)) || 0) + 1), new Map());
  const whole = count((doc) => plain(doc.title).toLowerCase());
  const leads = count((doc) => lead(doc.title).toLowerCase());
  const lines = new Map();
  docs.forEach((doc) => {
    const same = plain(doc.title).toLowerCase();
    const head = lead(doc.title).toLowerCase();
    // A shared lead gathers the most ("Consultation record": every department's);
    // failing that, papers whose whole name agrees (a copy in a second PDF).
    const key = head && leads.get(head) > 1 ? `l:${head}` : whole.get(same) > 1 ? `w:${same}` : `d:${doc.id}`;
    const name = key.startsWith("w:") ? plain(doc.title) : key.startsWith("l:") ? lead(doc.title) : doc.title;
    if (!lines.has(key)) lines.set(key, { key, name, docs: [] });
    lines.get(key).docs.push(doc);
  });
  return [...lines.values()].map((line) => ({ ...line, from: Math.min(...line.docs.map((doc) => doc.from)), pages: pagesIn(line.docs) }));
}

// What tells one folded paper from the next: the part of its name the line
// does not already say ("Cardiology, 9 to 10 Jul 2026"). Empty for a plain
// copy; the caller then names it by where it is filed.
export function partName(doc, line) {
  const title = doc.title.replace(/\s*\([^)]*\)/g, "").trim();
  const rest = title.toLowerCase().startsWith(line.name.toLowerCase()) ? title.slice(line.name.length).replace(/^[\s,:]+/, "") : title;
  return rest;
}
