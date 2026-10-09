import React from "react";
import {
  TesseractThemeProvider,
  SectionCard,
  Badge,
  Tooltip,
  Button,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias, webpack resolves it
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import AgentSpark from "./AgentSpark";
import styles from "./CorrelationEntryCard.module.css";

/**
 * The Correlation Agent entry, composed from Tesseract: a violet-toned
 * SectionCard (violet marks AI across the system), Badge for the counts,
 * Button for the one action.
 *
 * It lives in a 250px rail, so it is built to one rule: one count carrier, one
 * short line that the count does not already say, one primary action. The
 * count and the explanation (an eye, "How this works") ride beside the heading,
 * so the body carries nothing but what the doctor has not already read.
 *
 * The action sits in the card FOOTER rather than the body, because SectionCard
 * keeps a footer mounted while the body collapses. Collapsing the card is a
 * request for less reading matter, not for less action.
 *
 * Everything it says is a count of something visible on the surface it sits in,
 * supplied by resolveEntry(). It never previews a conclusion.
 *
 * Deviation on record: the CTA carries the VoiceRx gradient rather than the
 * blue primary fill the system reserves for primary actions. That is a
 * deliberate product decision so every agent surface reads as one family, and
 * it matches the existing Generate DDx button in the live Rx pad.
 */
/* What "correlation" actually means here, in the doctor's own terms. A panel
   read alone answers one question; read together they answer a different one,
   and that difference is the whole feature. */
export const WHAT_CORRELATION_IS =
  "Reads several reports as one picture: finds values that move together, tests whether the pattern holds, and names what it points to.";

/* The line the rail actually shows.
   WHAT_CORRELATION_IS describes the MECHANISM, which is the right thing to say
   on hover and in the walkthrough, and the wrong thing to say on the card: it
   spent four lines of a 250px rail explaining how the agent works, sitting
   between the abnormal count and the button, so the doctor had to read past an
   explanation to reach the action. On the card the only useful claim is what
   this will do for THIS patient, in one line, with the patient's own number in
   it. The how stays one hover away. */
/* WHAT IS ON FILE, plainly.
   This card used to lead with an "N abnormal" badge in error red. Two problems
   with that. It is a count the agent has not earned yet, since nothing has been
   correlated, so red was pre-judging the patient before any reading happened.
   And on the Records card it was worse than unearned, it was unknowable: a PDF
   yields no abnormal count until something extracts it, so any number there was
   invented. What a doctor needs before pressing the button is simply what the
   agent has to work with. */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function whatIsOnFile(entry, source) {
  const n = Number(entry?.poolCount) || 0;
  const days = Number(entry?.dayCount) || 0;
  if (!n) return "No reports on file yet for this patient.";

  const span = days > 1 ? ` across ${plural(days, "day", "days")}` : "";
  if (source === "records") {
    return `${plural(n, "medical record", "medical records")} on file${span}. Read together when correlated.`;
  }
  if (source === "labResults") {
    return `${plural(n, "lab result", "lab results")} on file${span}.`;
  }
  return `${plural(n, "report", "reports")} on file${span}, ready to read against each other.`;
}

export default function CorrelationEntryCard({
  entry,
  lastRun = null,
  dense = false,
  onBuild,
  onKnowMore,
  onViewResult,
}) {
  if (!entry) return null;

  const count = lastRun ? lastRun.correlations : entry.seedCount;

  const heading = (
    <span className={styles.heading}>
      <span className={styles.headingText}>{dense ? "Correlation" : entry.title}</span>
      {/* In the 250px rail the row was carrying a spark, the name, this badge,
          an info button and a collapse chevron, and the first thing to give was
          the name: the card clipped its own title to "Correlati...". The count
          is the one passenger that is already said elsewhere, in full words, in
          the body right underneath ("8 records ready to correlate"). So it
          steps out of the header there and the card can say what it is. */}
      {count > 0 && !dense && (
        <Badge variant="soft" color="violet" size="sm" icons="none">
          {count}
        </Badge>
      )}
      {/* Hovering explains it in a line, clicking opens the full tutorial, the
          same split every other AI feature in this product uses. */}
      {onKnowMore && (
        <Tooltip
          content={`${WHAT_CORRELATION_IS} Click to open the walkthrough.`}
          side="bottom"
          align="start"
          maxWidth={300}
        >
          <Button
            variant="ghost"
            theme="neutral"
            size="sm"
            className={styles.eye}
            aria-label="How this works"
            icon={<TPLibraryIcon name="info-circle" family="arrow" variant="linear" size={16} />}
            onClick={onKnowMore}
          />
        </Tooltip>
      )}
    </span>
  );

  const body = lastRun ? (
    <div className={styles.body}>
      <div className={styles.badges}>
        {lastRun.excluding > 0 && (
          <Badge variant="soft" color="warning" size="sm" icons="none">
            {lastRun.excluding} worth excluding
          </Badge>
        )}
        {lastRun.incidental > 0 && (
          <Badge variant="soft" color="neutral" size="sm" icons="none">
            {lastRun.incidental} incidental
          </Badge>
        )}
        {lastRun.incomplete && (
          <Badge variant="soft" color="error" size="sm" icons="none">
            Incomplete
          </Badge>
        )}
      </div>

      <p className={styles.copy}>
        {lastRun.reports} reports, {lastRun.findings} findings.
      </p>

      <div className={styles.quiet}>
        <Button variant="link" size="sm" theme="neutral" onClick={onBuild}>
          Change reports
        </Button>
      </div>
    </div>
  ) : (
    <div className={styles.body}>
      {entry.ready ? (
        <>
          <p className={styles.copy}>{whatIsOnFile(entry, entry.source)}</p>
        </>
      ) : (
        <p className={styles.copy}>{entry.blurb}</p>
      )}
    </div>
  );

  /* Stays mounted when the body collapses, so the rail always offers the run. */
  const footer = lastRun ? (
    <Button
      variant="solid"
      size={dense ? "sm" : "md"}
      fullWidth
      className={styles.gradientCta}
      onClick={onViewResult}
    >
      View correlation
    </Button>
  ) : (
    /* Always live. Even with nothing (or one report) on file, the doctor can
       correlate by uploading the second report inside the drawer, so the door
       is never barred here. entry.ready still shapes the copy above; it no
       longer disables the way in. */
    <Button
      variant="solid"
      size={dense ? "sm" : "md"}
      fullWidth
      className={styles.gradientCta}
      onClick={onBuild}
    >
      {entry.cta}
    </Button>
  );

  return (
    <TesseractThemeProvider colorScheme="light">
      <SectionCard
        className={styles.card}
        tone="violet"
        title={heading}
        leading={<AgentSpark size={22} sparkSize={12} animated />}
        footer={footer}
        footerAlign="start"
        collapsible
        bordered
        divided={false}
      >
        {body}
      </SectionCard>
    </TesseractThemeProvider>
  );
}
