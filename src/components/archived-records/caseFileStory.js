import { isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { encounterMix, encounterType } from "./encounterTypes";

/**
 * The summary as a story.
 *
 * A doctor reads this first, to learn who the patient is and what the file
 * holds. It is told in the order things happened: how the patient came in,
 * what was found, what was done, how it went, how they left, what they went
 * home on, what was due next, then the background to keep in mind and what
 * the file does not contain.
 *
 * Every sentence is assembled here from facts read off the pages. No model
 * writes it, so it cannot say more than the file does. A beat with no facts
 * is left out; a fact that is held back or removed adds no words and no
 * numbers. The full rules, with examples for every shape of file, are in
 * docs/case-file/CASE-FILE-SUMMARY-ARCHITECTURE.md.
 *
 * Output: { level, beats: [{ key, text, cites }] }
 *   text   plain sentence(s); **double stars** mark the key words, which
 *          are shown in darker ink at the same weight (never bold)
 *   cites  ids of the facts the beat was built from (shown as [n])
 *   level  "full" | "partial" | "thin" | "none"   how much could be told
 */

export const STORY_LIMITS = {
  fullEncounters: 1, // told beat by beat: the latest
  lineEncounters: 3, // told in one line each, before that
  medicines: 5, // named; the rest are counted
  labs: 3, // abnormal results named; the rest are counted
  vitals: 4, // values quoted from the last set
  background: 4, // chronic conditions named
  gaps: 2, // missing items named
};

/* ------------------------------------------------------------- wording */

const bold = (text) => `**${text}**`; // marks key words; rendered as darker ink, not weight
const lowerFirst = (text = "") => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
const stripDot = (text = "") => text.trim().replace(/\.$/, "");
const sentence = (text = "") => (text ? `${stripDot(text)}.` : "");
// House date: 04 Mar'26. Leaves anything that is not a full date alone.
const shortDate = (label = "") => label.replace(/^(\d) /, "0$1 ").replace(/ 20(\d\d)$/, "'$1");
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

// "A, B and C"; past the limit: "A, B, C and 4 more".
function listOf(names, limit) {
  const shown = names.slice(0, limit);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} and ${rest} more`;
  if (shown.length < 2) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

// Doubt is carried in the sentence, never dropped. Two kinds:
//   about the page    (suspected, partly readable, two ways)  stays for good
//   about the reading (hard to read, pages differ)             clears when a
//                     reviewer verifies; until then the words are not bold
const PAGE_DOUBT = { suspected: "suspected", partlyRead: "partly readable", ambiguous: "can be read two ways" };
const READING_DOUBT = { conflict: "pages differ", conflictingValue: "pages differ", lowConfidence: "hard to read" };

function named(item, review = {}) {
  const verified = statusOf(review, item.id) === "verified";
  const flag = item.flags?.[0] || (item.confidence < 0.7 ? "lowConfidence" : null);
  const name = item.label || item.title;
  if (flag === "suspected") return bold(`${name} (suspected)`); // never separated from its diagnosis
  if (PAGE_DOUBT[flag]) return `${bold(name)} (${PAGE_DOUBT[flag]})`;
  if (READING_DOUBT[flag] && !verified) return `${name} (${READING_DOUBT[flag]})`;
  return bold(name);
}

// A medicine or other plain name inside a list: no emphasis, doubt kept.
function plain(item, review = {}) {
  const verified = statusOf(review, item.id) === "verified";
  const flag = item.flags?.[0] || (item.confidence < 0.7 ? "lowConfidence" : null);
  if (PAGE_DOUBT[flag]) return `${item.title} (${PAGE_DOUBT[flag]})`;
  if (READING_DOUBT[flag] && !verified) return `${item.title} (${READING_DOUBT[flag]})`;
  return item.title;
}

/* ---------------------------------------------------- how they came in */

const ADMIT_OPENING = {
  emergency: (date) => `Came to the emergency${date} and was admitted`,
  referral: (date) => `Referred in and admitted${date}`,
  fromOpd: (date) => `Admitted from OPD${date}`,
  transfer: (date) => `Transferred in from another hospital${date}`,
  planned: (date) => `Planned admission${date}`,
  direct: (date) => `Admitted directly${date}`,
};
const VISIT_OPENING = {
  first: (date) => `First OPD visit${date}`,
  followUp: (date) => `Follow-up OPD visit${date}`,
  workup: (date) => `Pre-admission work-up in OPD${date}`,
};
const OUTCOME = {
  discharged: "Discharged",
  lama: "Left against medical advice",
  transferred: "Transferred out",
  died: "Died in hospital",
};

const startOf = (encounter) => encounter.startLabel || (encounter.dateLabel || "").split(" to ")[0];
const endOf = (encounter) => encounter.endLabel || (encounter.dateLabel || "").split(" to ")[1] || "";
const on = (label) => (label ? ` on ${shortDate(label)}` : "");

function opening(encounter) {
  const date = on(startOf(encounter));
  if (encounter.type === "IPD") return (ADMIT_OPENING[encounter.entry] || ((value) => `Admitted${value}`))(date);
  if (encounter.type === "OPD") return (VISIT_OPENING[encounter.visitKind] || ((value) => `Seen in OPD${value}`))(date);
  if (encounter.type === "ER") return `Seen in the emergency${date}`;
  if (encounter.type === "DAYCARE") return `Day care admission${date}`;
  if (encounter.type === "TELE") return `Teleconsultation${date}`;
  return `Record dated${date ? date.replace(" on ", " ") : " (undated)"}`; // unknown kind: say only what is known
}

/* ------------------------------------------------------- one encounter */

function tell(encounter, mine, review) {
  const ipd = Boolean(encounterType(encounter.type).stay); // a stay: IPD or day care
  const role = (domain, name) => mine.filter((item) => item.domain === domain && item.role === name);
  const of = (domain) => mine.filter((item) => item.domain === domain);
  const beats = [];
  const add = (key, text, cites) => {
    if (text) beats.push({ key: `${encounter.id}-${key}`, kind: key, text, cites: cites.filter(Boolean).map((item) => item.id) });
  };

  // Arrival: how they came in, where, and with what.
  const complaint = role("RPT", "complaint")[0];
  const where = encounter.department && encounter.department !== "Outpatient" ? ` under ${encounter.department}` : "";
  add(
    "arrival",
    `${opening(encounter)}${where}${complaint ? ` with ${lowerFirst(stripDot(complaint.detail))}` : ""}.${complaint ? "" : ipd ? " The reason for admission is not recorded." : ""}`,
    [complaint],
  );

  // What was found.
  const dx = of("DX").filter((item) => item.role !== "chronic");
  const final = dx.filter((item) => item.role === "final");
  const working = dx.filter((item) => item.role === "working");
  const other = dx.filter((item) => item.role !== "final" && item.role !== "working");
  const dxParts = [
    final.length ? `${ipd ? "Final diagnosis" : "Diagnosis"}: ${listOf(final.map((item) => named(item, review)), 3)}` : null,
    working.length ? `Working diagnosis: ${listOf(working.map((item) => named(item, review)), 3)}` : null,
    other.length ? `Also ${listOf(other.map((item) => named(item, review)), 3)}` : null,
  ].filter(Boolean);
  add("diagnosis", dxParts.map(sentence).join(" "), dx);

  // What was done.
  const procedures = role("PROC", "procedure");
  if (procedures.length) {
    const dates = [...new Set(procedures.map((item) => item.dateLabel).filter(Boolean))];
    add("treatment", `${listOf(procedures.map((item) => named(item, review)), 3)}${dates.length === 1 ? on(dates[0]) : ""}.`, procedures);
  }

  // How it went: abnormal results, then what was given.
  // A number is quoted only with its unit; a value with no unit stays in the record.
  const flagged = of("LAB").filter((item) => item.abnormal);
  const abnormal = flagged.filter((item) => item.unit);
  const labText = abnormal.slice(0, STORY_LIMITS.labs).map((item) => {
    const first = item.series?.[0];
    const moved = first && String(first.v) !== String(item.value);
    const unit = item.unit ? ` ${item.unit}` : "";
    return `${bold(item.title)} ${moved ? `${first.v} to ` : ""}${item.value}${unit} (${item.abnormal === "H" ? "high" : "low"})`;
  });
  const moreLabs = flagged.length - labText.length; // includes any left unquoted for want of a unit
  const given = role("MED", "inHospital");
  const courseParts = [
    labText.length ? `Abnormal results: ${labText.join(", ")}${moreLabs > 0 ? ` and ${moreLabs} more` : ""}` : null,
    given.length ? `Given in hospital: ${listOf(given.map((item) => plain(item, review)), STORY_LIMITS.medicines)}` : null,
  ].filter(Boolean);
  add("course", courseParts.map(sentence).join(" "), [...abnormal.slice(0, STORY_LIMITS.labs), ...given.slice(0, STORY_LIMITS.medicines)]);

  // How they left (admissions only).
  const condition = role("RPT", "conditionAtDischarge")[0];
  const vitals = role("VIT", "last")[0] || (ipd ? null : of("VIT")[0]);
  const vitalsText = vitals?.facts?.length
    ? `Last vitals: ${vitals.facts.slice(0, STORY_LIMITS.vitals).map((fact) => `${fact.k} ${fact.v}`).join(", ")}`
    : null;
  if (ipd) {
    // "Discharged" is said only when the file says so (an outcome, or a
    // condition-at-discharge note). An end date alone is not an outcome.
    const out = OUTCOME[encounter.outcome] || (condition ? "Discharged" : endOf(encounter) ? "Stay ended" : null);
    // If the file gives two dates for leaving, say so; do not pick quietly.
    const dated = role("RPT", "dischargeDate")[0];
    const disputed = dated && dated.flags?.some((flag) => READING_DOUBT[flag]) && statusOf(review, dated.id) !== "verified";
    const leaving = out ? `${out}${on(endOf(encounter))}${disputed ? " (pages differ)" : ""}${condition ? `: ${lowerFirst(stripDot(condition.detail))}` : ""}` : null;
    add("leaving", [leaving, vitalsText].filter(Boolean).map(sentence).join(" ") || "How this admission ended is not in this file.", [condition, disputed ? dated : null, vitals]);
  } else if (vitalsText) {
    add("leaving", sentence(vitalsText), [vitals]);
  }

  if (encounter.outcome === "transferred") add("after", "What happened after the transfer is not in this file.", []);

  // What they went home on. Not said after a death in hospital.
  const died = encounter.outcome === "died";
  const current = ipd ? role("MED", "discharge") : role("MED", "prescribed");
  if (current.length && !died) {
    add(
      "medicines",
      `${bold(plural(current.length, "medicine"))} on the ${ipd ? "discharge list" : "prescription"}: ${listOf(current.map((item) => plain(item, review)), STORY_LIMITS.medicines)}.`,
      current.slice(0, STORY_LIMITS.medicines),
    );
  }

  // What was due next.
  const followUp = role("RPT", "followUp")[0];
  add("followUp", followUp && !died && encounter.outcome !== "transferred" ? `Follow-up planned: ${sentence(followUp.detail)}` : "", [followUp]);

  return beats;
}

// An earlier encounter, in one line: when, what kind, the headline.
function oneLine(encounter, mine, review) {
  const dx = mine.find((item) => item.domain === "DX" && item.role !== "chronic");
  const procedure = mine.find((item) => item.domain === "PROC" && item.role === "procedure");
  const complaint = mine.find((item) => item.role === "complaint");
  const reports = mine.filter((item) => item.domain === "RPT" && item.role === "investigation");
  const abnormal = mine.filter((item) => item.domain === "LAB" && item.abnormal);
  const tail = [
    dx ? named(dx, review) : null,
    procedure ? named(procedure, review) : null,
    !dx && !procedure && complaint ? lowerFirst(stripDot(complaint.detail)) : null,
    !dx && !procedure && !complaint && reports.length ? listOf(reports.map((item) => item.title), 3) : null,
    abnormal.length ? `${plural(abnormal.length, "abnormal result")}` : null,
  ].filter(Boolean);
  return {
    key: `${encounter.id}-line`,
    kind: "earlier",
    text: `${opening(encounter)}${tail.length ? `: ${tail.join("; ")}` : ""}.`,
    cites: [dx, procedure, complaint, ...reports.slice(0, 2), abnormal[0]].filter(Boolean).map((item) => item.id),
  };
}

/* ------------------------------------------------------------ the story */

// What to say about allergies. Never a negative the file does not state, and
// never "not recorded" while a reading exists that is only held or removed.
function allergyLine(bundle, facts, review) {
  const shown = facts.filter((item) => item.domain === "ALG");
  if (shown.length) {
    return shown
      .map((item) =>
        item.negative
          ? `${named(item, review)}${item.quals?.[0] ? `, ${lowerFirst(item.quals[0].v || item.quals[0])}` : ""}`
          : `Allergy: ${named(item, review)}${item.detail ? ` (${lowerFirst(stripDot(item.detail))})` : ""}`,
      )
      .join("; ");
  }
  const all = bundle.findings.filter((item) => item.domain === "ALG");
  if (all.some((item) => item.sensitive?.length && isShownToDoctor(item, review))) return "Allergies: an entry is marked sensitive and not shown here";
  if (all.some((item) => item.hold && statusOf(review, item.id) === "draft")) return "Allergies: an unclear reading is held back";
  if (all.some((item) => statusOf(review, item.id) === "rejected")) return "Allergies: entry removed in review";
  return "Allergies: not recorded in this file";
}

export function buildStory(bundle, review) {
  // A fact may speak only if it is shown to the doctor and not marked sensitive.
  const facts = bundle.findings.filter((item) => isShownToDoctor(item, review) && !item.sensitive?.length);
  const held = bundle.findings.filter((item) => item.hold && statusOf(review, item.id) === "draft").length;
  const sensitive = bundle.findings.filter((item) => item.sensitive?.length && isShownToDoctor(item, review)).length;
  const pages = bundle.source.totalPages;

  // Nothing may be told. Still say what the file is, and where to look.
  if (!facts.length) {
    const none = bundle.findings.length === 0;
    const text = none
      ? `No clinical facts were read from this file. It has ${bold(plural(pages, "page"))}. Open Documents to read the original.`
      : held
        ? `${bold(plural(held, "reading"))} ${held === 1 ? "was" : "were"} found in this file but ${held === 1 ? "is" : "are"} too unclear to summarise. ${held === 1 ? "It is" : "They are"} waiting for review.`
        : "Every reading from this file was removed in review.";
    return { level: none ? "none" : "withheld", beats: [{ key: "none", kind: "none", text, cites: [] }] };
  }

  // Oldest first: a story is told in the order it happened.
  // An encounter with no date sorts first, so it is never told as the latest.
  const encounters = [...bundle.encounters].sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || ""));
  const mineOf = (encounter) => facts.filter((item) => item.encounterId === encounter.id);
  const withFacts = encounters.filter((encounter) => mineOf(encounter).length);
  const full = withFacts.slice(-STORY_LIMITS.fullEncounters);
  const before = withFacts.slice(0, -STORY_LIMITS.fullEncounters);
  const lines = before.slice(-STORY_LIMITS.lineEncounters);
  const counted = before.slice(0, before.length - lines.length);

  const beats = [];
  if (counted.length) {
    beats.push({
      key: "counted",
      kind: "earlier",
      text: `Earlier in this file: ${encounterMix(counted).replace(/ · /g, ", ")}${
        counted.length === 1 ? on(startOf(counted[0])) : ` from ${shortDate(startOf(counted[0]))} to ${shortDate(startOf(counted[counted.length - 1]))}`
      }.`,
      cites: [],
    });
  }
  lines.forEach((encounter) => beats.push(oneLine(encounter, mineOf(encounter), review)));
  full.forEach((encounter) => beats.push(...tell(encounter, mineOf(encounter), review)));

  // Background that holds across visits. An allergy is only ever quoted.
  const chronic = facts.filter((item) => item.domain === "DX" && item.role === "chronic");
  const past = facts.filter((item) => item.domain === "PROC" && item.role === "pastSurgery");
  const allergies = facts.filter((item) => item.domain === "ALG");
  const allergyText = allergyLine(bundle, facts, review);
  const home = facts.filter((item) => item.domain === "MED" && item.role === "home");
  const alerts = facts.filter((item) => item.domain === "RPT" && item.role === "alert");
  const background = [
    chronic.length ? `Known ${listOf(chronic.map((item) => named(item, review)), STORY_LIMITS.background)}` : null,
    past.length ? `Past ${listOf(past.map((item) => lowerFirst(named(item, review))), 3)}` : null,
    allergyText,
    home.length ? `${bold(plural(home.length, "medicine"))} on the list taken before admission` : null,
    // An alert carries a short form written for exactly this sentence.
    alerts.length ? `Keep in mind: ${alerts.slice(0, 3).map((item) => bold(item.short || lowerFirst(item.title))).join("; ")}` : null,
  ].filter(Boolean);
  beats.push({
    key: "background",
    kind: "background",
    text: background.map(sentence).join(" "),
    cites: [...chronic, ...past, ...allergies, ...alerts, home[0]].filter(Boolean).map((item) => item.id),
  });

  // What the reader will not find, so silence is never read as "nothing".
  const missing = bundle.notFound || [];
  const unread = bundle.source.pagesUnread || 0;
  const removed = bundle.findings.filter((item) => statusOf(review, item.id) === "rejected").length;
  const known = new Set(bundle.encounters.map((item) => item.id));
  const loose = facts.filter((item) => !known.has(item.encounterId)).length;
  const noDiagnosis = !bundle.findings.some((item) => item.domain === "DX");
  const gaps = [
    noDiagnosis ? "No diagnosis is written in this file" : null,
    missing.length ? `Not in this file: ${listOf(missing.map((item) => lowerFirst(stripDot(item)).replace(/ \(.*\)$/, "")), STORY_LIMITS.gaps)}` : null,
    unread ? `${plural(unread, "page")} could not be read` : null,
    held ? `${plural(held, "unclear reading")} ${held === 1 ? "is" : "are"} held back until reviewed` : null,
    removed ? `${plural(removed, "entry", "entries")} removed in review` : null,
    loose ? `${plural(loose, "fact")} could not be tied to a visit; see Clinical data` : null,
    // The placeholder never names the kind of sensitive item.
    sensitive ? `${plural(sensitive, "item")} in this file ${sensitive === 1 ? "is" : "are"} marked sensitive and not shown here` : null,
  ].filter(Boolean);
  if (gaps.length) beats.push({ key: "gaps", kind: "gaps", text: gaps.map(sentence).join(" "), cites: [] });

  const kinds = new Set(beats.map((beat) => beat.kind));
  const level = kinds.has("diagnosis") && kinds.has("arrival") && (kinds.has("treatment") || kinds.has("medicines")) ? "full" : kinds.has("diagnosis") || kinds.has("medicines") ? "partial" : "thin";
  return { level, beats };
}
