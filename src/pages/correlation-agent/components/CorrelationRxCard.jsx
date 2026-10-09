import React from "react";
import { TesseractThemeProvider, Button, Badge, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias, webpack resolves it
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import { HYPOTHESES } from "../data/demoRun";
import AgentSpark from "./AgentSpark";
import { notifyRun } from "../data/runStore";
import styles from "./CorrelationRxCard.module.css";

/* The two cards are separate instances in separate boxes of the pad, so
   recording a diagnosis in one has to reach the other. The run object on
   window is the shared record; this is just the nudge that says it moved. */
const DIAGNOSIS_EVENT = "correlation-diagnosis-recorded";

function recordedDiagnoses() {
  if (typeof window === "undefined") return {};
  return window.__correlationRun?.diagnosed || {};
}

/**
 * The correlation result, shown inside the prescription pad.
 *
 * This is the last link in the loop. The agent reads the reports, argues its
 * way to a set of claims, and this card is where those claims become entries
 * on the prescription. It takes the place of the Differential Diagnosis block
 * once a correlation has been run, because both answer the same question and
 * two AI blocks stacked on one section is noise.
 *
 * Two modes, because the pad has two destinations:
 *   mode="diagnosis"     the claims themselves, tap to record one
 *   mode="investigation" the tests that would confirm them, tap to order one
 *
 * It renders NOTHING until a correlation has actually been generated. An empty
 * shell inviting the doctor to run something belongs on the agent's own
 * surface, not in the middle of the pad.
 */

/* The same scale the agent uses everywhere else: how sure it is, drawn as
   filled steps so the rank is visible without reading the word. */
/* The API's word is "Moderate"; "Medium" is kept as an alias because the
   chart's own adapted tier uses it. Missing the API's spelling meant every
   Moderate pattern fell through to the bottom tier and drew red, one bar —
   indistinguishable from Low. */
const STEPS = { Strong: 3, Moderate: 2, Medium: 2, Low: 1, Speculative: 1 };
const TONE = {
  Strong: "strong",
  Moderate: "medium",
  Medium: "medium",
  Low: "low",
  Speculative: "low",
};

function Meter({ level }) {
  const n = STEPS[level] || 1;
  return (
    <span className={styles.meter} data-tone={TONE[level] || "low"} aria-label={`${level} evidence`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={styles.bar} />
      ))}
    </span>
  );
}

export default function CorrelationRxCard({
  mode = "diagnosis",
  hasRun = false,
  added = {},
  onAdd,
  onOpenAgent,
  onCreateNew,
  /* The diagnosis names currently on the prescription table. The card reads
     these as the source of truth for what is "already recorded", so a chip
     leaves when its diagnosis is added and RETURNS the moment the doctor deletes
     that row from the table. */
  recordedNames = [],
}) {
  const [open, setOpen] = React.useState(true);
  /* What has been tapped in this card. The published run only knows about
     actions taken inside the agent, so the card tracks its own too. */
  const [taken, setTaken] = React.useState({});
  /* Re-read the recorded diagnoses whenever any card records one. */
  const [recorded, setRecorded] = React.useState(recordedDiagnoses);
  React.useEffect(() => {
    const sync = () => setRecorded({ ...recordedDiagnoses() });
    window.addEventListener(DIAGNOSIS_EVENT, sync);
    return () => window.removeEventListener(DIAGNOSIS_EVENT, sync);
  }, []);
  if (!hasRun) return null;

  const isDx = mode === "diagnosis";

  /* Every entry in the agent's last column is a candidate diagnosis now, so all
     of them can be offered here. How much to trust each one is what the meter
     says. */
  /* TESTS FOLLOW THE DIAGNOSIS, and only the diagnoses the doctor actually
     recorded. Offering every candidate's confirmatory tests up front asks them
     to order investigations for diagnoses they have not accepted, which is the
     agent prescribing rather than assisting. Record nothing and this card
     renders nothing. */
  const chosen = isDx ? null : HYPOTHESES.filter((h) => recorded[h.id]);

  const items = isDx
    ? HYPOTHESES.map((h) => ({
      id: h.id,
      label: h.name,
      level: h.confidence,
    }))
    : chosen.filter((h) => (h.investigations || []).length).flatMap((h) =>
      h.investigations.map((t) => ({
        id: `${h.id}:${t}`,
        label: t,
        level: h.confidence,
        forWhat: h.name,
      }))
    );

  /* Once a chip is on the prescription it leaves the card. It is already in the
     table below, and leaving a struck-through copy here made the doctor read
     the same entry twice.

     For diagnoses the TABLE is the source of truth, so a chip is gone only while
     its diagnosis sits in the table and comes back the instant that row is
     deleted. (Investigation mode keeps its own added/taken tracking, since those
     are ordered tests, not diagnosis rows.) */
  const isRecorded = (it) =>
    isDx ? recordedNames.includes(it.label) : Boolean(added[it.id] || taken[it.id]);
  const remaining = items.filter((it) => !isRecorded(it));
  /* The diagnosis card is the section's primary surface once a correlation has
     run, so it stays even when every claim has been recorded (or none came
     back): its footer still offers View correlation / Create new correlation.
     Only the supplementary investigation card bows out with nothing to add. */
  if (remaining.length === 0 && !isDx) return null;

  /* One group per recorded diagnosis, in the order the agent ranked them. */
  const groups = isDx
    ? []
    : (chosen || [])
      .map((h) => ({
        id: h.id,
        name: h.name,
        level: h.confidence,
        tests: remaining.filter((it) => it.forWhat === h.name),
      }))
      .filter((g) => g.tests.length);

  return (
    <TesseractThemeProvider colorScheme="light">
      {/* SAME ANATOMY AS DIFFERENTIAL DIAGNOSIS, which this block replaces in
          the pad: a standing mark in its own column, then a tinted panel
          holding the heading, the body and the actions. Two AI blocks that do
          the same job in the same slot should not be two different shapes. The
          colour is what separates them: DDx wears the Apex indigo, this wears
          the agent's violet. */}
      <div className={styles.shell}>
        <span className={styles.markCol} aria-hidden="true">
          <AgentSpark size={32} sparkSize={18} />
        </span>
        <div className={styles.root}>
        <div className={styles.head}>
          <span className={styles.headText}>
            <span className={styles.title}>
              {isDx ? "Correlation Agent" : "Suggested to confirm"}
              {isDx ? (
                <>
                  <Badge variant="gradient" color="warning" size="xs" icons="none">
                    BETA
                  </Badge>
                  <Badge variant="soft" color="success" size="xs" icons="none">
                    Ready
                  </Badge>
                </>
              ) : null}
              {/* The reasoning is one click away from the name of the thing
                  that produced it, not only from a button at the foot of the
                  card. */}
              <button
                type="button"
                className={styles.info}
                aria-label="How this was worked out"
                title="How this was worked out"
                onClick={onOpenAgent}
              >
                <span aria-hidden="true" className={styles.infoGlyph} />
              </button>
            </span>
            <span className={styles.sub}>
              {isDx
                ? remaining.length > 0
                  ? "Read across this patient's own reports. Tap one to record it."
                  : "Every correlated diagnosis is recorded. Open the correlation for the full reasoning."
                : "To confirm the diagnoses you recorded above. Tap one to order it."}
            </span>
          </span>
          <button
            type="button"
            className={styles.collapse}
            aria-expanded={open}
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className={styles.chevron} data-open={open || undefined} />
          </button>
        </div>

        {open && !isDx ? (
          /* Grouped by the diagnosis they belong to. Several diagnoses can be
             recorded at once and each brings its own tests, so a flat row of
             chips left the doctor unable to tell which test was answering
             which question. The caption says it once per group rather than
             repeating it on every chip. */
          <div className={styles.groups}>
            {groups.map((g) => (
              <div key={g.id} className={styles.group}>
                <p className={styles.groupCap} data-tone={TONE[g.level] || "low"}>
                  To confirm <strong>{g.name}</strong>
                </p>
                <div className={styles.chips}>
                  {g.tests.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      className={styles.chip}
                      data-tone={TONE[it.level] || "low"}
                      title={`Suggested to confirm ${it.forWhat}, which the reports left open`}
                      onClick={() => {
                        setTaken((t) => ({ ...t, [it.id]: true }));
                        if (onAdd) onAdd(it);
                      }}
                    >
                      <span className={styles.chipLabel}>{it.label}</span>
                      <Meter level={it.level} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {open && isDx ? (
          <div className={styles.chips}>
            {remaining.map((it) => (
              <button
                key={it.id}
                type="button"
                className={styles.chip}
                data-tone={TONE[it.level] || "low"}
                title={`${it.level} evidence. Tap to record this diagnosis and see the tests that would confirm it.`}
                onClick={() => {
                  /* No local "taken" latch here: the chip's presence is derived
                     from the table (recordedNames), so it leaves when the row is
                     added and returns when the row is deleted. */
                  /* Recording a diagnosis is what unlocks its confirmatory
                     tests in the Investigation box below. */
                  if (isDx && typeof window !== "undefined") {
                    window.__correlationRun = window.__correlationRun || { diagnosed: {}, ordered: {} };
                    window.__correlationRun.diagnosed[it.id] = true;
                    window.dispatchEvent(new Event(DIAGNOSIS_EVENT));
                    notifyRun();
                  }
                  if (onAdd) onAdd(it);
                }}
              >
                <span className={styles.chipLabel}>{it.label}</span>
                <Meter level={it.level} />
              </button>
            ))}
          </div>
        ) : null}

        <div className={styles.foot}>
          {isDx ? (
            /* One card, two ways forward: open the full correlation, or start a
               fresh one. The reasoning lives inside "View correlation" now, so
               the card no longer needs its own quiet link to it. */
            <div className={styles.footActions}>
              <Button
                variant="solid"
                size="sm"
                className={styles.viewCta}
                onClick={onOpenAgent}
              >
                View correlation
              </Button>
              <Button
                variant="outline"
                theme="neutral"
                size="sm"
                className={styles.newCta}
                leftIcon={<TPLibraryIcon name="add" family="essential" size={16} />}
                onClick={onCreateNew}
              >
                Create new correlation
              </Button>
            </div>
          ) : (
            /* The reasoning never gets copied into the pad. It stays in the
               agent, one click away, so this card can never drift out of step
               with the argument behind it. */
            <Button variant="link" theme="primary" size="sm" onClick={onOpenAgent}>
              View the reasoning
            </Button>
          )}
        </div>
        </div>
      </div>
    </TesseractThemeProvider>
  );
}
