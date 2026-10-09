/**
 * Correlation is a cross-cutting read over the patient's record, not a feature
 * that lives in one card. So it is offered from several places, and **where it
 * was invoked from seeds what goes in the bucket**. Opening it from Lab Results
 * pre-selects the lab panels; from Records, the imaging; from a diagnosis, the
 * reports that bear on it.
 *
 * Every entry states a count of something the doctor can actually see on the
 * surface it was invoked from. No entry ever previews a conclusion.
 */

export const SOURCES = {
  labResults: "labResults",
  records: "records",
  agentPanel: "agentPanel",
  patientBar: "patientBar",
  diagnosis: "diagnosis",
};

/* Everything is derived from the LIVE reports the host passes in, the same list
   the picker and the side rail render. There is no fixture catalogue any more. */
const eligibleOf = (reports) => (reports || []).filter((r) => r.eligible);

function reportsFor(reports, source) {
  const e = eligibleOf(reports);
  if (source === SOURCES.labResults) return e.filter((r) => r.source === "labResults");
  if (source === SOURCES.records) return e.filter((r) => r.source === "records");
  return e;
}

/* The most recent day on file is what a doctor most often means, so it seeds
   the bucket. Newest report wins; ties on the same date come together. */
function newestDayReports(pool) {
  if (!pool.length) return [];
  const dated = pool.map((r) => ({ r, d: String(r.date || "") }));
  const newest = dated.map((x) => x.d).filter(Boolean).sort().pop();
  const day = dated.filter((x) => x.d === newest).map((x) => x.r);
  return day.length ? day : pool.slice(0, 3);
}

/**
 * Resolves an entry point into everything its surface needs to render honestly:
 * what it can say, whether it may offer a run, and what the bucket starts with.
 */
export function resolveEntry(source, context = {}) {
  const reports = context.reports || [];
  const pool = reportsFor(reports, source);
  const seedReports = newestDayReports(pool);
  const seed = seedReports.map((r) => r.id);
  const abnormal = seedReports.reduce((n, r) => n + (r.abnormal || 0), 0);

  /* Seed and gate are two different questions. The SEED comes from the section
     the doctor invoked from, because that is what they were looking at. The
     GATE is about the patient: correlation reads across the whole record, and
     the drawer lets any eligible report be added. Records holds one eligible
     report, so gating on the section's own modalities would disable the offer
     there forever, even though the labs it should be read against are on file. */
  const correlatable = eligibleOf(reports);

  const base = {
    source,
    seed,
    poolCount: pool.length,
    seedCount: seedReports.length,
    /* How many distinct days the pool spans. The card says what is on file, and
       "across 2 days" is the part that tells a doctor whether there is anything
       to read ACROSS in the first place. */
    dayCount: new Set(pool.map((r) => r.date).filter(Boolean)).size,
    abnormal,
    correlatableCount: correlatable.length,
    /* Two or more eligible reports, whatever their modality. Reading several
       lab panels against each other is a legitimate correlation. */
    ready: correlatable.length >= 2,
  };

  switch (source) {
    case SOURCES.labResults:
      return {
        ...base,
        title: "Correlation Agent",
        blurb: base.ready
          ? `Read these ${base.seedCount} lab reports against this visit's imaging, and test every link it finds.`
          : "Read across this visit's labs. Pick or upload a second report in the next step.",
        cta: "Create correlation",
        notReady: "Add an imaging report to correlate across.",
      };

    case SOURCES.records:
      return {
        ...base,
        title: "Correlation Agent",
        blurb: base.ready
          ? `Read ${base.seedCount} ${base.seedCount === 1 ? "record" : "records"} against this visit's lab values, and test every link it finds.`
          : "Read across this visit's records. Pick or upload a second report in the next step.",
        cta: "Create correlation",
        notReady: "Add a lab result to correlate across.",
      };

    case SOURCES.agentPanel:
      return {
        ...base,
        title: "Correlation Agent",
        blurb: `${base.seedCount} reports arrived for this visit, with ${abnormal} values outside their reference range.`,
        cta: "Create correlation",
        notReady: "Nothing new to read across yet.",
      };

    case SOURCES.patientBar:
      return {
        ...base,
        seed: newestDayReports(eligibleOf(reports)).map((r) => r.id),
        title: "Correlate reports",
        blurb: `${pool.length} reports on file for this patient.`,
        cta: "Create correlation",
        notReady: "Not enough reports on file.",
      };

    case SOURCES.diagnosis: {
      const dx = context.diagnosis || "this diagnosis";
      return {
        ...base,
        title: "Correlation Agent",
        blurb: `Check what this visit's reports say for and against ${dx}.`,
        cta: "Create correlation",
        notReady: "Add a report from a second modality first.",
      };
    }

    default:
      return base;
  }
}

/** Turns a seed list into the drawer's checkbox state. */
export function seedToPicked(seed) {
  return (seed || []).reduce((acc, id) => ({ ...acc, [id]: true }), {});
}
