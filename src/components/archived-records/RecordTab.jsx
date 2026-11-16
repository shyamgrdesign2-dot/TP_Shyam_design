import React, { useMemo, useState } from "react";
import { Badge, Button, SectionCard } from "@dhspl-tatvacare/tesseract-ui";
import { Health, Hospital, InfoCircle, ShieldTick, Stickynote, Warning2 } from "iconsax-reactjs";
import { ASSETS } from "../../assets";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import { countsFor, statusOf } from "./archivedRecordsStore";
import { buildStory } from "./caseFileStory";
import { buildStructuredRecord, EXPANDED_ENCOUNTERS, LIST_LIMIT } from "./caseFileSummary";
import { CiteChip, Cites, FindingBody, RichLine, RowMarks, houseDate } from "./findingFormat";
import styles from "./ArchivedRecords.module.scss";

/**
 * Structured record: the whole file retold in a fixed order, for reading.
 *
 *   Summary           the story of the file, beat by beat (caseFileStory.js)
 *   Medical history   allergies, chronic conditions, past surgery, medicines
 *                     the patient was already on, things to keep in mind
 *   One block per encounter, newest first: an IPD summary for an admission,
 *   an OPD summary for a visit
 *   Not in this file  what a reader might expect and will not find
 *
 * Nothing is decided here. Verifying, correcting and removing happen under
 * Clinical data; a field label jumps there. The rules for what is shown and
 * what is only counted live in caseFileSummary.js.
 */

// The same pictures the blue sidebar uses for these sections.
const ICONS = {
  complaint: ASSETS.images.notes,
  diagnosis: ASSETS.images.diagnosis,
  procedures: ASSETS.images.surgery,
  course: ASSETS.images.notes,
  investigations: ASSETS.images.lab,
  hospitalMeds: ASSETS.images.medication,
  discharge: ASSETS.images.examination,
  dischargeMeds: ASSETS.images.medication,
  prescribed: ASSETS.images.medication,
  vitals: ASSETS.images.examination,
  followUp: ASSETS.images.notes,
  allergies: ASSETS.images.medicalHistory,
  chronic: ASSETS.images.diagnosis,
  pastSurgery: ASSETS.images.surgery,
  home: ASSETS.images.medication,
  alerts: ASSETS.images.notes,
};

// A row's date is left out when it only repeats the date of a one-day visit.
const DayContext = React.createContext(null);

function Rows({ items, review, limit }) {
  const day = React.useContext(DayContext);
  const [open, setOpen] = useState(false);
  const shown = limit && !open ? items.slice(0, limit) : items;
  const rest = items.length - shown.length;
  return (
    <>
      <ul className={styles.rows}>
        {shown.map((item) => (
          <li key={item.id} className={styles.row}>
            <FindingBody finding={item} compact dated={item.dateLabel !== day} marks={<RowMarks finding={item} status={statusOf(review, item.id)} />} />
          </li>
        ))}
      </ul>
      {limit && items.length > limit ? (
        <button type="button" className={styles.moreLink} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Show fewer" : `+${rest} more`}
          {open ? null : <span> ({items.slice(limit).map((item) => item.label || item.title).join(", ")})</span>}
        </button>
      ) : null}
    </>
  );
}

// A note under a section that already names it: just the text, its date, [n].
function Notes({ items, review, titled = false }) {
  const day = React.useContext(DayContext);
  return (
    <ul className={styles.rows}>
      {items.map((item) => (
        <li key={item.id} className={styles.row}>
          <p className={styles.rowLine}>
            {titled ? <><span className={styles.rowLabel}>{item.title}:</span>{" "}</> : null}
            <span className={styles.rowText}>{item.detail}</span>
            {item.dateLabel && item.dateLabel !== day ? <span className={styles.rowSecondary}> ({houseDate(item.dateLabel)})</span> : null}
            <RowMarks finding={item} status={statusOf(review, item.id)} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function Course({ events }) {
  const [open, setOpen] = useState(false);
  const limit = LIST_LIMIT + 1;
  const shown = open ? events : events.slice(0, limit);
  return (
    <>
      <ul className={styles.rows}>
        {shown.map((event) => (
          <li key={event.id} className={styles.row}>
            <p className={styles.rowLine}>
              <span className={styles.rowKey}>{event.date}:</span>{" "}
              <span className={styles.rowLabel}>{event.title}.</span>{" "}
              <span className={styles.rowText}>{event.detail}</span>
              <span className={styles.cites}><CiteChip page={event.cite.page} rid={event.cite.rid} /></span>
            </p>
          </li>
        ))}
      </ul>
      {events.length > limit ? (
        <button type="button" className={styles.moreLink} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Show fewer" : `+${events.length - limit} more days`}
        </button>
      ) : null}
    </>
  );
}

// One section, drawn the way the blue sidebar draws Past Visits and Medical
// History: a small picture, the section name, then tight rows beneath. The
// name opens that kind of data under Clinical data, where it is verified.
function Section({ name, label, count, domain, wide, onOpenDomain, children }) {
  const title = (
    <>
      {label}
      {count ? <small> ({count})</small> : null}
    </>
  );
  return (
    <section className={styles.rxSection} data-wide={wide ? "true" : undefined}>
      <header>
        <img src={ICONS[name]} alt="" aria-hidden="true" />
        {domain && onOpenDomain ? (
          <button type="button" onClick={() => onOpenDomain(domain)} title="Review and verify these in Clinical data">{title}</button>
        ) : (
          <span>{title}</span>
        )}
      </header>
      <div className={styles.rxBody}>{children}</div>
    </section>
  );
}

function EncounterSection({ section, review, onOpenDomain }) {
  const { kind, items, notes } = section;
  return (
    <Section
      name={section.key}
      label={section.label}
      count={kind === "meds" && items.length ? items.length : null}
      domain={section.domain}
      wide={kind === "course" || section.key === "complaint"}
      onOpenDomain={onOpenDomain}
    >
      {kind === "notes" ? <Notes items={items} review={review} /> : null}
      {kind === "rows" ? <Rows items={items} review={review} /> : null}
      {kind === "course" ? (
        <>
          {section.events.length ? <Course events={section.events} /> : null}
          {items.length ? <Notes items={items} review={review} titled /> : null}
        </>
      ) : null}
      {kind === "labs" ? (
        <>
          {items.length ? <Rows items={items} review={review} /> : <p className={styles.fieldEmpty}>No abnormal results recorded</p>}
          {section.normalCount > 0 ? (
            <button type="button" className={styles.moreLink} onClick={() => onOpenDomain("LAB")}>
              +{section.normalCount} normal results <span>(in Clinical data)</span>
            </button>
          ) : null}
        </>
      ) : null}
      {kind === "meds" ? (
        items.length ? <Rows items={items} review={review} limit={LIST_LIMIT} /> : section.current ? <p className={styles.fieldEmpty}>None recorded</p> : null
      ) : null}
      {kind === "condition" ? (
        <>
          {items.length ? <Notes items={items} review={review} /> : null}
          {section.vitals ? <Rows items={[section.vitals]} review={review} /> : null}
        </>
      ) : null}
      {notes?.length ? <Notes items={notes} review={review} titled /> : null}
    </Section>
  );
}

export default function RecordTab({ bundle, review, onOpenDomain, onOpenAttention, onReview }) {
  const totals = countsFor(bundle.findings, review);
  const allDone = totals.pending === 0;
  const record = useMemo(() => buildStructuredRecord(bundle, review), [bundle, review]);
  const story = useMemo(() => buildStory(bundle, review), [bundle, review]);
  const byId = useMemo(() => Object.fromEntries(bundle.findings.map((item) => [item.id, item])), [bundle]);
  const { gaps } = record;

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
        subtitle={`${record.shape} · ${bundle.source.totalPages} pages · told in the order it happened`}
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
        title="Medical history"
        subtitle="What stays true beyond one visit"
        icon={<Health size={20} variant="Bulk" />}
        tone="warning"
      >
        <div className={styles.rxGrid}>
          {record.history.map((group) => (
            <Section key={group.key} name={group.key} label={group.label} count={group.limit && group.items.length ? group.items.length : null} domain={group.domain} onOpenDomain={onOpenDomain}>
              {group.items.length === 0 ? (
                <p className={styles.fieldEmpty}>{group.empty}</p>
              ) : group.kind === "notes" ? (
                <Notes items={group.items} review={review} titled />
              ) : (
                <Rows items={group.items} review={review} limit={group.limit} />
              )}
            </Section>
          ))}
        </div>
      </SectionCard>

      {record.encounters.map((block, index) => (
        <SectionCard
          key={block.encounter.id}
          title={`${block.title} · ${block.encounter.shortDate}`}
          subtitle={[block.encounter.department, block.gist].filter(Boolean).join(" · ")}
          icon={block.ipd ? <Hospital size={20} variant="Bulk" /> : <Stickynote size={20} variant="Bulk" />}
          headerActions={<Badge variant="soft" color={block.ipd ? "primary" : "neutral"} size="sm">{block.encounter.pages} pages</Badge>}
          collapsible
          defaultCollapsed={index >= EXPANDED_ENCOUNTERS}
        >
          {block.sections.length ? (
            <DayContext.Provider value={block.ipd ? null : block.encounter.startLabel || block.encounter.dateLabel}>
              <div className={styles.rxGrid}>
                {block.sections.map((section) => (
                  <EncounterSection key={section.key} section={section} review={review} onOpenDomain={onOpenDomain} />
                ))}
              </div>
            </DayContext.Provider>
          ) : (
            <p className={styles.fieldEmpty}>Nothing readable was found for this encounter.</p>
          )}
        </SectionCard>
      ))}

      <div className={styles.gapNote}>
        <InfoCircle size={16} aria-hidden="true" />
        <div>
          {gaps.notFound.length ? (
            <p><strong>Not in this file:</strong> {gaps.notFound.map((item) => item.replace(/\.$/, "")).join("; ")}.</p>
          ) : null}
          {gaps.unread ? (
            <p><strong>{gaps.unread} {gaps.unread === 1 ? "page" : "pages"} could not be read.</strong> Open Documents to see {gaps.unread === 1 ? "it" : "them"}.</p>
          ) : null}
          {gaps.held ? (
            <p>
              <strong>{gaps.held} unclear readings are held back</strong> and not shown above.{" "}
              <Button variant="link" theme="primary" size="sm" onClick={onOpenAttention}>Check them</Button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
