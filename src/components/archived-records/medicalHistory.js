/**
 * Medical History in the product's own structure.
 *
 * The Rx pad keeps a patient's history in six sections, each a list of tags
 * with a small, fixed set of fields. A fact read from an old paper file is
 * stored the same way, so it can be shown to the doctor, copied into the
 * patient's Medical History and counted in analytics without a second model:
 *
 *   section              tmmhs_id   a tag carries
 *   Medical Condition    2          title, enable, status, since, medication, note
 *   Allergies            4          title, enable, status, since, note
 *   Surgical History     5          title, enable, dateType, date, note
 *   Family History       3          title, enable, relationship, note
 *   Lifestyle            1          title, enable, status, since, note
 *   Additional History   6          free text (the section's remarks)
 *
 *   enable       "Y" the patient has it; "N" the page says they do not
 *                ("No smoking", "No ischaemic heart disease"). A denial is
 *                data too: it is stored as the same tag, switched off.
 *   status       "Active" | "Inactive"
 *   since        a count and a unit in the Rx pad's words: "18 Year(s)"
 *   medication   "Yes" | "No" (Medical Condition only)
 *   relationship one of the Rx pad's relations: "Father", "Sibling", ...
 *   dateType     "year" | "full", with date "2016" or "12 Mar 2016"
 *   note         whatever the page adds that has no field of its own
 *
 * A section the page marks as empty as a whole ("no known allergies", with
 * nothing named) is `no_know_history: true` on that section.
 *
 * In the sample each such fact carries this as `history`:
 *   history: { type, name, enable, status, since, medication, relationship, dateType, date, note }
 * `type` is VoiceRx's row type (medical_condition, allergy, surgery,
 * family_history, lifestyle, others), which the Rx pad already maps to the
 * sections above (utils/medicalHistoryConverters.js).
 *
 * Rules, the same as for every other fact:
 *   - A field is filled only from what the page says. "Known diabetic for 18
 *     years on OHAs" gives since, medication and a note; a status is written
 *     only when the page supports it (on treatment: Active; "no recurrence":
 *     Inactive).
 *   - The name is the clean name ("Squamous cell carcinoma, right gluteal
 *     skin"); what happened to it goes to the fields and the note. Clean
 *     names are what make the data countable.
 *   - A reading that could not be trusted is never turned into history.
 */

import { SECTION_TITLES } from "../medical-history/constants";

// In reading order: what a prescriber must know first.
export const HISTORY_SECTIONS = [
  { type: "medical_condition", id: 2 },
  { type: "allergy", id: 4 },
  { type: "surgery", id: 5 },
  { type: "family_history", id: 3 },
  { type: "lifestyle", id: 1 },
  { type: "others", id: 6 },
].map((section) => ({ ...section, title: SECTION_TITLES[section.id] }));

const SECTION_OF = Object.fromEntries(HISTORY_SECTIONS.map((section) => [section.type, section]));
export const HISTORY_TITLES = HISTORY_SECTIONS.map((section) => section.title);

// Which section of Medical History a fact belongs to, or null when it is not
// history at all. Older facts say it with their kind and role.
export function historyType(finding) {
  if (!finding) return null;
  if (finding.history?.type) return finding.history.type;
  if (finding.domain === "ALG") return "allergy";
  if (finding.domain === "DX" && finding.role === "chronic") return "medical_condition";
  if (finding.domain === "PROC" && finding.role === "pastSurgery") return "surgery";
  if (finding.domain === "RPT" && finding.role === "familyHistory") return "family_history";
  if (finding.domain === "RPT" && finding.role === "lifestyle") return "lifestyle";
  return null;
}

export const isHistory = (finding) => Boolean(historyType(finding));
export const historySection = (finding) => SECTION_OF[historyType(finding)] || null;
export const historyTitle = (finding) => historySection(finding)?.title || "";

// The kind a fact is listed under: everything that is Medical History is one
// kind ("HX"), whatever it was filed as when it was read.
export const kindOf = (finding) => (isHistory(finding) ? "HX" : finding.domain);

// The fact as VoiceRx's flat medical_history row, read from the page.
export function historyRow(finding) {
  const type = historyType(finding);
  const said = finding.history || {};
  const none = said.enable === "N" || (said.enable === undefined && Boolean(finding.negative));
  const row = { type, name: said.name || finding.title, enable: none ? "N" : "Y" };
  const notes = said.note !== undefined ? said.note : finding.history ? "" : finding.detail || "";
  switch (type) {
    case "medical_condition":
      return { ...row, status: none ? "" : said.status || "", duration: said.since || "", medication: none ? "" : said.medication || "", notes };
    case "allergy":
    case "lifestyle":
      return { ...row, status: none ? "" : said.status || "", duration: said.since || "", notes };
    case "family_history":
      return { ...row, relation: said.relationship || "", notes };
    case "surgery":
      return { ...row, dateType: said.dateType || "", date: said.date || "", notes };
    default:
      // Additional History is free text: the remark is the row.
      return { type: "others", name: said.name || finding.title, notes };
  }
}

const lowerFirst = (text) => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
const NOTE_FITS = 40;

// The light bracket after a history item's name, from its row. Fields in the
// Rx pad's order, and only what tells the doctor something:
//   Type 2 diabetes mellitus (18y, on OHAs)
//   Hypertension (18y, on medication)
//   Squamous cell carcinoma, right gluteal skin (Inactive, excised 2016)
//   Diabetes (Father, Mother)
//   Appendicectomy (2009)
// "Active" is the usual state and is not said; "Inactive" is. A long note
// waits behind the word "note".
export function historyQuals(row) {
  const out = [];
  const note = String(row.notes || "").trim();
  if (row.relation) out.push(row.relation);
  if (row.duration) out.push(row.duration);
  if (row.date) out.push(row.date);
  if (row.status === "Inactive") out.push("Inactive");
  if (row.medication === "Yes" && !/^on\b/i.test(note)) out.push("on medication");
  if (row.medication === "No") out.push("not on medication");
  if (note) out.push(note.length <= NOTE_FITS ? lowerFirst(note) : { v: "note", tip: note });
  return out;
}

// History that can change with time says when it was written down.
const DATED = ["allergy", "lifestyle", "family_history", "others"];
export const historyNeedsDate = (finding) => DATED.includes(historyType(finding));

// The patient's Medical History as the product stores it
// (tbl_micro_patient_medical_history.medical_history): one entry per section
// with its tags, Additional History as the remarks. `rowOf(finding)` gives
// the row to store (a reviewer's correction stands in for the reading).
export function buildMedicalHistory(findings, rowOf = historyRow) {
  const remarks = [];
  const sections = new Map();
  findings.filter(isHistory).forEach((finding) => {
    const section = historySection(finding);
    const row = rowOf(finding);
    if (section.type === "others") {
      remarks.push([row.name, row.notes].filter(Boolean).join(": "));
      return;
    }
    if (!sections.has(section.id)) sections.set(section.id, { tmmhs_id: section.id, title: section.title, no_know_history: false, tags: [] });
    const entry = sections.get(section.id);
    if (finding.history?.none) {
      entry.no_know_history = true;
      return;
    }
    entry.tags.push({
      tmmhst_id: 0,
      title: row.name,
      enable: row.enable,
      ...(row.status !== undefined ? { status: row.status } : null),
      ...(row.duration !== undefined ? { since: row.duration } : null),
      ...(row.medication !== undefined ? { medication: row.medication } : null),
      ...(row.relation !== undefined ? { relationship: row.relation } : null),
      ...(row.date !== undefined ? { dateType: row.dateType, date: row.date } : null),
      note: row.notes || "",
      _source: { factId: finding.id, page: finding.cite?.page, region: finding.cite?.rid, asWritten: (finding.original || finding).verbatim },
    });
  });
  const list = HISTORY_SECTIONS.filter((section) => sections.has(section.id)).map((section) => sections.get(section.id));
  if (remarks.length) {
    if (!list.length) list.push({ tmmhs_id: 2, title: SECTION_TITLES[2], no_know_history: false, tags: [] });
    list[0].medical_history_remarks = remarks.join("\n");
  }
  return list;
}
