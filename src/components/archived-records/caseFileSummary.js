import { isNotableLab, isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { encounterMix, encounterType } from "./encounterTypes";

/**
 * How the structured record is assembled.
 *
 * The same rules build the page whatever the file holds: one admission, many
 * admissions, OPD visits only, or a mix. Nothing here is written by a model;
 * it is selection and ordering of facts that were read from the pages.
 *
 * 1. Medical history comes first, once, for the whole file: allergies, chronic
 *    conditions, past surgery, medicines the patient was already taking, and
 *    alerts a prescriber must know (steroids, blood products, held drugs).
 * 2. Then one block per encounter, newest first, titled by its kind as a
 *    hospital names it (IPD, OPD, Emergency, Day care: see encounterTypes.js).
 *    A stay gets the IPD sections, a visit gets the OPD sections. The first EXPANDED_ENCOUNTERS
 *    are open; older ones show their one-line gist and open on demand.
 * 3. Inside an encounter the sections follow the order of a discharge summary
 *    and are left out when the file has nothing for them:
 *      IPD  Chief complaint, Diagnosis, Surgery and procedures, Course in
 *           hospital, Investigations, Medicines given in hospital, Condition
 *           at discharge, Discharge medicines, Advice and follow-up
 *      OPD  Chief complaint, Diagnosis, Investigations, Medicines prescribed,
 *           Advice and follow-up
 * 4. Weight limits, so 100 pages stay one screen:
 *      Labs       only results out of range now, or earlier and since recovered;
 *                 always-normal ones are counted
 *      Vitals     only the last recorded set of the encounter
 *      Medicines  current ones are named (discharge list, or the prescription
 *                 of an OPD visit), LIST_LIMIT shown and the rest counted;
 *                 medicines given during a stay are named up to LIST_LIMIT
 *      Notes      shortened; the full text stays under Clinical data
 * 5. Safety: held readings and removed items never appear; a suspected
 *    diagnosis stays suspected; a missing allergy record is said, not assumed;
 *    what the file does not contain is listed at the end.
 */

export const EXPANDED_ENCOUNTERS = 3;
export const LIST_LIMIT = 5;

const by = (role) => (item) => item.role === role;

function encounterBlock(bundle, encounter, items) {
  const mine = items.filter((item) => item.encounterId === encounter.id);
  const of = (domain) => mine.filter((item) => item.domain === domain);
  const ipd = Boolean(encounterType(encounter.type).stay); // a stay: IPD or day care
  const labs = of("LAB");
  const abnormal = labs.filter(isNotableLab); // out of range now, or earlier and since recovered
  const reports = of("RPT");
  const vitals = of("VIT");
  const lastVitals = vitals.find(by("last")) || (ipd ? null : vitals[0]) || null;
  const dx = of("DX").filter((item) => item.role !== "chronic");
  const procedures = of("PROC").filter(by("procedure"));
  const meds = of("MED");
  const course = (bundle.timeline || []).filter((event) => event.encounterId === encounter.id);

  const sections = [
    { key: "complaint", label: "Chief complaint", kind: "notes", items: reports.filter(by("complaint")) },
    { key: "diagnosis", label: "Diagnosis", kind: "rows", domain: "DX", items: dx },
    ipd ? { key: "procedures", label: "Surgery and procedures", kind: "rows", domain: "PROC", items: procedures, notes: reports.filter(by("anaesthesia")) } : null,
    ipd ? { key: "course", label: "Course in hospital", kind: "course", events: course, items: reports.filter(by("course")) } : null,
    {
      key: "investigations",
      label: "Investigations",
      kind: "labs",
      domain: "LAB",
      items: abnormal,
      normalCount: labs.length - abnormal.length + (encounter.id === bundle.labsNotShown?.encounterId ? bundle.labsNotShown.count : 0),
      notes: reports.filter(by("investigation")),
    },
    ipd ? { key: "hospitalMeds", label: "Medicines given in hospital", kind: "meds", domain: "MED", items: meds.filter(by("inHospital")), notes: reports.filter(by("hospitalMeds")) } : null,
    ipd ? { key: "discharge", label: "Condition at discharge", kind: "condition", domain: "VIT", items: reports.filter(by("conditionAtDischarge")), vitals: lastVitals } : null,
    ipd
      ? { key: "dischargeMeds", label: "Discharge medicines", kind: "meds", domain: "MED", items: meds.filter(by("discharge")), current: true }
      : { key: "prescribed", label: "Medicines prescribed", kind: "meds", domain: "MED", items: meds.filter(by("prescribed")), current: true },
    !ipd && lastVitals ? { key: "vitals", label: "Vitals", kind: "condition", domain: "VIT", items: [], vitals: lastVitals } : null,
    { key: "followUp", label: "Advice and follow-up", kind: "notes", items: reports.filter(by("followUp")) },
  ]
    .filter(Boolean)
    .filter((section) => section.items.length || section.notes?.length || section.events?.length || section.vitals);

  const gist = [dx[0]?.title, procedures[0]?.title].filter(Boolean).join(" · ");
  return { encounter, ipd, title: encounterType(encounter.type).title, sections, gist, count: mine.length };
}

export function buildStructuredRecord(bundle, review) {
  const items = bundle.findings.filter((item) => isShownToDoctor(item, review));
  // Newest first; an encounter with no date goes last.
  const encounters = [...bundle.encounters].sort((a, b) => (b.sortKey || "").localeCompare(a.sortKey || ""));

  const allergies = items.filter((item) => item.domain === "ALG");
  // "Not recorded" would be false if a reading exists that is held or removed.
  const everyAllergy = bundle.findings.filter((item) => item.domain === "ALG");
  const allergyGap = everyAllergy.some((item) => item.hold && statusOf(review, item.id) === "draft")
    ? "An unclear reading is held back"
    : everyAllergy.some((item) => statusOf(review, item.id) === "rejected")
      ? "Entry removed in review"
      : "Not recorded in this file";
  const history = [
    { key: "allergies", label: "Allergies", domain: "ALG", items: allergies, empty: allergyGap },
    { key: "chronic", label: "Chronic conditions", domain: "DX", items: items.filter((item) => item.domain === "DX" && item.role === "chronic") },
    { key: "pastSurgery", label: "Past surgery", domain: "PROC", items: items.filter((item) => item.domain === "PROC" && item.role === "pastSurgery") },
    { key: "home", label: "Medicines before admission", domain: "MED", items: items.filter((item) => item.domain === "MED" && item.role === "home"), limit: LIST_LIMIT },
    { key: "alerts", label: "Keep in mind", domain: "RPT", kind: "notes", items: items.filter((item) => item.domain === "RPT" && item.role === "alert") },
  ].filter((group) => group.items.length || group.empty);

  const shape = encounterMix(bundle.encounters);

  return {
    shape,
    history,
    encounters: encounters.map((encounter) => encounterBlock(bundle, encounter, items)),
    gaps: {
      notFound: bundle.notFound,
      unread: bundle.source.pagesUnread,
      // Held and still waiting: a held reading a reviewer removed is not counted.
      held: bundle.findings.filter((item) => item.hold && statusOf(review, item.id) === "draft").length,
    },
  };
}
