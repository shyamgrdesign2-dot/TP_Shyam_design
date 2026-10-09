import React from "react";
import { TesseractThemeProvider, Button } from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias, webpack resolves it
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import AgentSpark from "./AgentSpark";
import styles from "./CorrelationIntro.module.css";

/**
 * The Correlation Agent's own side-nav section, built on the same shape the
 * Drawing Canvas section already uses: a mark, a one-paragraph introduction
 * with a Know more link, a single primary action, and a how-it-works video.
 *
 * This is the educational surface. It is where a doctor who has never run a
 * correlation finds out what it is. The action opens the same bucket drawer
 * that Lab Results and Records open, so there is one flow, reached three ways.
 */
/** Placeholder until a Correlation Agent tutorial is recorded. */

/* The same glyphs the picker uses for each kind of record, so the counts here
   and the sections there are visibly the same things. */
const ICON_BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk";
const TUBE = `${ICON_BASE}/medical/test-tube-02.svg`;
const SCAN = `${ICON_BASE}/security/scanning.svg`;
const DOC = `${ICON_BASE}/content-edit/document-text.svg`;

function Glyph({ src, size = 14 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

/** What is actually on file, counted from the patient's own reports. */
function summarise(reports) {
  const eligible = (reports || []).filter((r) => r.eligible);
  const labs = eligible.filter((r) => r.source === "labResults").length;
  const docs = eligible.filter((r) => r.source === "records").length;
  const kinds = [...new Set(eligible.map((r) => r.modality))];
  return { total: eligible.length, labs, docs, kinds };
}

export default function CorrelationIntro({
  onStart,
  onKnowMore,
  onWatch,
  lastRun = null,
  reportCount = 0,
  reports = [],
}) {
  const summary = summarise(reports);

  return (
    <TesseractThemeProvider colorScheme="light">
      <div className={styles.root}>
        <div className={styles.hero}>
          <AgentSpark size={48} sparkSize={26} animated className={styles.mark} />

          <h2 className={styles.title}>
            Introducing
            <br />
            Correlation Agent
          </h2>

          <p className={styles.body}>
            Reads across this patient&apos;s reports to find links between findings, argues
            against each link it proposes, and shows you only what survived.{" "}
            <button type="button" className={styles.inlineLink} onClick={onKnowMore}>
              Know more
            </button>
          </p>

          <Button
            variant="solid"
            size="lg"
            fullWidth
            className={styles.cta}
            onClick={onStart}
          >
            {lastRun ? "View correlation" : "Create correlation"}
          </Button>

          {summary.total > 0 && (
            <div className={styles.summary}>
              <span className={styles.summaryIcon} aria-hidden="true">
                <Glyph src={DOC} size={20} />
              </span>
              <span className={styles.summaryMain}>
                <span className={styles.summaryLead}>
                  <b>{summary.total}</b> records ready to correlate
                </span>
                {/* Counted per kind, each with the glyph the picker uses, so a
                    doctor recognises what is on file before opening it. */}
                <span className={styles.summaryTags}>
                  {summary.labs > 0 && (
                    <span className={styles.summaryTag}>
                      <Glyph src={TUBE} />
                      {summary.labs} lab {summary.labs === 1 ? "result" : "results"}
                    </span>
                  )}
                  {summary.docs > 0 && (
                    <span className={styles.summaryTag}>
                      <Glyph src={SCAN} />
                      {summary.docs} imaging {summary.docs === 1 ? "report" : "reports"}
                    </span>
                  )}
                </span>
                <span className={styles.summaryKinds}>{summary.kinds.join(" · ")}</span>
              </span>
            </div>
          )}
        </div>

      </div>
    </TesseractThemeProvider>
  );
}
