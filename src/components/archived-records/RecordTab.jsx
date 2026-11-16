import React, { useMemo } from "react";
import { Badge, Button, SectionCard } from "@dhspl-tatvacare/tesseract-ui";
import { ClipboardText, ShieldTick, Warning2 } from "iconsax-reactjs";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import { countsFor } from "./archivedRecordsStore";
import { buildStory } from "./caseFileStory";
import DataSections from "./DataSections";
import { encounterMix } from "./encounterTypes";
import { Cites, RichLine } from "./findingFormat";
import styles from "./ArchivedRecords.module.scss";

/**
 * Structured record: the file, for reading.
 *
 *   Review entry   says the data is not verified yet and opens Clinical data
 *   Summary        the story of the file, beat by beat (caseFileStory.js)
 *   Details        the same sections the Rx pad panel shows (DataSections):
 *                  Diagnosis, Allergies, Procedures, Med (Rx), Lab Results,
 *                  Vitals, Reports and Notes, then what is held back and what
 *                  is not in the file
 *
 * Nothing is decided here. A section name jumps to that kind of data under
 * Clinical data, where it is verified, corrected or removed.
 */

// The frame a section sits in on this page: a small picture, the name, tight
// rows. The name opens that kind of data under Clinical data.
function RecordSection({ code, title, icon, children, onOpenDomain }) {
  return (
    <section className={styles.rxSection}>
      <header>
        {icon}
        {code && onOpenDomain ? (
          <button type="button" onClick={() => onOpenDomain(code)} title="Review and verify these in Clinical data">{title}</button>
        ) : (
          <span>{title}</span>
        )}
      </header>
      <div className={styles.rxBody}>{children}</div>
    </section>
  );
}

export default function RecordTab({ bundle, review, onOpenDomain, onOpenAttention, onReview }) {
  const totals = countsFor(bundle.findings, review);
  const allDone = totals.pending === 0;
  const story = useMemo(() => buildStory(bundle, review, { brief: true }), [bundle, review]);
  const byId = useMemo(() => Object.fromEntries(bundle.findings.map((item) => [item.id, item])), [bundle]);

  return (
    <div className={styles.stack}>
      {/* The way in to verifying: this tab is for reading, nothing here is saved yet. */}
      <div className={styles.reviewEntry} data-done={allDone ? "true" : undefined}>
        {allDone ? <ShieldTick size={18} variant="Bold" aria-hidden="true" /> : <Warning2 size={18} variant="Bold" aria-hidden="true" />}
        <div>
          <strong>{allDone ? "Reviewed and saved" : totals.verified ? `${totals.verified} of ${totals.total} verified` : "Not verified yet"}</strong>
          <span>
            {allDone
              ? "Every item was checked against its source page."
              : "Read by AI from the scanned file. Review each item against its page, then it is saved to the patient record."}
          </span>
        </div>
        <Button variant={allDone ? "ghost" : "solid"} theme="primary" size="sm" onClick={onReview}>
          {allDone ? "Open review" : "Review and save"}
        </Button>
      </div>

      <SectionCard
        title="Summary"
        subtitle={`${encounterMix(bundle.encounters)} · ${bundle.source.totalPages} pages · told in the order it happened`}
        icon={<TpAiSparkIcon size={20} />}
        tone="violet"
        headerActions={<Badge variant="soft" color="violet" size="sm">AI draft</Badge>}
      >
        <ul className={styles.pointList}>
          {story.beats.map((beat) => (
            <li key={beat.key} data-kind={beat.kind}>
              <RichLine text={beat.text} />
              <Cites findings={beat.cites.map((id) => byId[id])} />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Details"
        subtitle="Everything read from the file, by kind. The same sections as on the Rx pad."
        icon={<ClipboardText size={20} variant="Bulk" />}
      >
        <div className={styles.rxGrid}>
          <DataSections
            bundle={bundle}
            review={review}
            onOpenReview={onOpenAttention}
            flow
            RxSection={(props) => <RecordSection {...props} onOpenDomain={onOpenDomain} />}
          />
        </div>
      </SectionCard>
    </div>
  );
}
