import React from "react";
import { TesseractThemeProvider, Badge, Button } from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias, webpack resolves it
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import AgentSpark from "./AgentSpark";
import styles from "./CorrelationDiagnosisIntro.module.css";

/**
 * The Correlation Agent's introduction, shown in the Diagnosis section of the
 * Rx pad in place of Differential Diagnosis whenever the agent is enabled and no
 * correlation has run yet. Both answer the same question — what does this point
 * to — so only one occupies the slot: before a run, this invitation; after one,
 * CorrelationRxCard with the claims themselves.
 *
 * It says three things and no more: what the agent is, what is on file to read
 * across (counted, never asserted), and the one way in. The count is split the
 * way a doctor files reports — lab results, pathology, radiology — so they can
 * see at a glance what the run has to work with.
 */

/* The glyphs the picker uses for each kind of record, so the counts here and the
   sections there read as the same things. */
const ICON_BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk";
const TUBE = `${ICON_BASE}/medical/test-tube-02.svg`;
const SCAN = `${ICON_BASE}/security/scanning.svg`;
const DOC = `${ICON_BASE}/content-edit/document-text.svg`;

function Glyph({ src, size = 15 }) {
  return (
    <span
      aria-hidden="true"
      className={styles.glyph}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
      }}
    />
  );
}

/* Pathology and radiology are told apart by the report's own modality; a lab
   result is structured data, so it is its own bucket whatever it examines. */
const isRadiology = (m) =>
  /radiolog|imaging|x-?ray|\bscan\b|\bmri\b|\bct\b|ultrason|ultra-?sound|usg|sonograph|doppler|mammogra|pet\b/i.test(
    m || ""
  );
const isPathology = (m) =>
  /patholog|haemat|hemat|biopsy|cytolog|histopath|microbiolog|serolog|blood/i.test(m || "");

function summarise(reports) {
  const eligible = (reports || []).filter((r) => r.eligible);
  const records = eligible.filter((r) => r.source === "records");
  return {
    total: eligible.length,
    labs: eligible.filter((r) => r.source === "labResults").length,
    pathology: records.filter((r) => isPathology(r.modality)).length,
    radiology: records.filter((r) => isRadiology(r.modality)).length,
  };
}

function Stat({ src, label, count }) {
  return (
    <span className={styles.stat} data-empty={count === 0 || undefined}>
      <Glyph src={src} />
      <b className={styles.statCount}>{count}</b>
      <span className={styles.statLabel}>{label}</span>
    </span>
  );
}

export default function CorrelationDiagnosisIntro({
  reports = [],
  /* A correlation has already been generated for this consultation. The card
     turns from an invitation into a result header: open it, or start a new one.
     The claims themselves render below, in CorrelationRxCard. */
  hasRun = false,
  onStart,
  onView,
  onKnowMore,
}) {
  const s = summarise(reports);

  return (
    <TesseractThemeProvider colorScheme="light">
      {/* Same anatomy as the Differential Diagnosis block this replaces: a
          standing mark in its own column, then a tinted panel. DDx wears the
          Apex indigo; the agent wears its violet. */}
      <div className={styles.shell}>
        <span className={styles.markCol} aria-hidden="true">
          <AgentSpark size={32} sparkSize={18} animated className={styles.markSquare} />
        </span>
        <div className={styles.root}>
          <div className={styles.head}>
            <span className={styles.title}>
              Correlation Agent
              <Badge variant="gradient" color="warning" size="xs" icons="none">
                BETA
              </Badge>
              {hasRun ? (
                <Badge variant="soft" color="success" size="xs" icons="none">
                  Ready
                </Badge>
              ) : null}
            </span>
            <p className={styles.sub}>
              {hasRun ? (
                "Your correlation is ready. Open it to trace the patterns and the reasoning, or record the diagnoses below."
              ) : (
                <>
                  Reads across this patient&apos;s reports to find links between findings,
                  argues against each link it proposes, and shows you only what survived.{" "}
                  {onKnowMore ? (
                    <button type="button" className={styles.inlineLink} onClick={onKnowMore}>
                      Know more
                    </button>
                  ) : null}
                </>
              )}
            </p>
          </div>

          {!hasRun ? (
            <div className={styles.stats}>
              <Stat src={TUBE} label={s.labs === 1 ? "Lab result" : "Lab results"} count={s.labs} />
              <Stat src={DOC} label="Pathology" count={s.pathology} />
              <Stat src={SCAN} label="Radiology" count={s.radiology} />
            </div>
          ) : null}

          {hasRun ? (
            /* Post-run: the result is the primary destination; starting over is
               the quieter second option beside it. */
            <div className={styles.actions}>
              <Button variant="solid" size="md" className={styles.cta} onClick={onView}>
                View correlation
              </Button>
              <Button
                variant="outline"
                theme="neutral"
                size="md"
                className={styles.secondary}
                onClick={onStart}
              >
                Create new correlation
              </Button>
            </div>
          ) : (
            /* Always live. Nothing on file simply means the second report is
               uploaded inside the drawer, so the way in is never barred. */
            <Button variant="solid" size="md" className={styles.cta} onClick={onStart}>
              Create correlation
            </Button>
          )}
        </div>
      </div>
    </TesseractThemeProvider>
  );
}
