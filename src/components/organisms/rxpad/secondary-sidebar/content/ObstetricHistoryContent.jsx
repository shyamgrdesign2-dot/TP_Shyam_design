/**
 * Obstetric History content panel — structured cards with inline VoiceRx highlights.
 *
 * Sections render in three modes:
 *
 *   1. `patientInfo` — three contextual chunks (LMP/EDD, gestation /
 *      blood-groups, marriage) separated by the neutral gradient
 *      divider. Inline labelled segments, pipe-separated.
 *
 *   2. `gplae` — short obstetric formula block. The free-text qualifier
 *      ("Primigravida", "Multipara", etc.) is lifted out of the body
 *      and rendered as a violet pill in the section title's right-hand
 *      slot so it reads as a standalone tag.
 *
 *   3. `pregnancy` / `examination` / `anc` / `immunisation` — one
 *      bullet per item. The first segment of every line becomes the
 *      heading (Gravida no, exam date, test name, vaccine name) and
 *      the remaining segments render inside `( … )` parentheses with
 *      `, ` separators. This converts dense pipe rows into a scannable
 *      "title + body" layout.
 */
import React, { useState } from "react";

import { ActionButton, Bullet, GradientDivider, SectionCard, SectionScrollArea } from "../detail-shared";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import {
  HistoricalInlineTooltip,
  historicalInlineHighlightClass,
  historicalInlineTextClass,
  isHistoricalMetaLine,
  useHistoricalSectionHighlights,
} from "../HistoricalInlineUpdates";

const BASE_SECTIONS = [
  {
    id: "patientInfo",
    title: "Patient Info",
    lines: [
      { text: "LMP: 14 Jan'26 | EDD: 21 Oct'26 | C.E.D.D: 25 Oct'26" },
      { text: "Gestation: 14 Weeks 2 Days | Patient Blood Group: B+ve | Husband's Blood Group: O+ve" },
      { text: "Marital Status: Married | Marriage Duration: 3 Years 6 Months | Consanguineous: No" },
    ],
  },
  {
    id: "gplae",
    title: "GPLAE",
    lines: [
      { text: "G: 1 | P: 0 | L: 0 | A: 0 | E: 0" },
      { text: "Primigravida" },
    ],
  },
  {
    id: "pregnancy",
    title: "Pregnancy History",
    collapsible: true,
    lines: [
      { text: "Gravida no: 1 | Mode of Delivery: LSCS | Date of Delivery: 14 Nov'24 | Gender: Male | Baby's Weight: 3.2 Kgs" },
      { text: "Gravida no: 2 | Mode of Delivery: NVD | Date of Delivery: 22 Mar'22 | Gender: Female | Baby's Weight: 2.8 Kgs | Remarks: Uneventful delivery" },
    ],
  },
  {
    id: "examination",
    title: "Current Examination",
    collapsible: true,
    lines: [
      { text: "17 Jan'26 | Pallor: Absent | Oedema: Mild | BMI: 23 Kg/m² | BP: 128/82 mmHg | Fundus Height: 14 cm | Presentation: Cephalic | Liquor: Adequate | FHR: 142 bpm" },
      { text: "24 Jan'26 | Pallor: Absent | Oedema: Absent | BMI: 23.2 Kg/m² | BP: 122/80 mmHg | Fundus Height: 16 cm | Presentation: Cephalic | Liquor: Adequate | FHR: 138 bpm" },
    ],
  },
  {
    id: "anc",
    title: "ANC Scheduler",
    collapsible: true,
    lines: [
      { text: "Complete Blood Count | Week Range: 8-12 Weeks | Due Date: 11 Mar'26 | Status: Done | Remarks: All values within normal limits" },
      { text: "Glucose Tolerance Test | Week Range: 24-28 Weeks | Due Date: 08 Jul'26 | Status: Due" },
    ],
  },
  {
    id: "immunisation",
    title: "Immunisation History",
    collapsible: true,
    lines: [
      { text: "Tetanus Toxoid (TT-1) | Status: Done | Given Date: 20 Feb'26 | Remarks: No adverse reaction" },
      { text: "Tetanus Toxoid (TT-2) | Status: Due | Remarks: Scheduled for next visit" },
    ],
  },
];

function pickObstetricSection(text) {
  const lower = text.toLowerCase();
  if (/(lmp|edd|blood group|marital|consanguineous|gestation)/i.test(lower)) return "patientInfo";
  if (/\bg:\s|\bp:\s|\bl:\s|\ba:\s|\be:\s|primigravida/i.test(lower)) return "gplae";
  if (/(gravida|delivery|baby|pregnancy history)/i.test(lower)) return "pregnancy";
  if (/(bp|oedema|pallor|fundus|presentation|liquor|fhr|examination)/i.test(lower)) return "examination";
  if (/(anc|week range|due date|scheduler|glucose tolerance|cbc)/i.test(lower)) return "anc";
  if (/(tt-|tetanus|immunisation|vaccine)/i.test(lower)) return "immunisation";
  return "examination";
}

function buildObstetricSections(lines) {
  const next = BASE_SECTIONS.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({ ...line })),
  }));

  lines.forEach((line) => {
    const text = line.text.trim();
    if (!text || isHistoricalMetaLine(text)) return;
    const section = next.find((entry) => entry.id === pickObstetricSection(text));
    if (!section) return;
    section.lines.push({
      text,
      isHighlighted: true,
      isFresh: line.isFresh,
    });
  });

  return next;
}

/** Split a `"Label: value | Label: value"` row into segments. */
function parseLabelledSegments(text) {
  return text
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const idx = seg.indexOf(":");
      if (idx === -1) return { value: seg };
      return { label: seg.slice(0, idx).trim(), value: seg.slice(idx + 1).trim() };
    });
}

// ─── Renderers ────────────────────────────────────────────────────────────────

/**
 * Default labelled-row renderer. Inline pipes between segments, label
 * muted, value dark. Used by `patientInfo` + `gplae`.
 */
function InlineLabelledRow({ line, showTooltip }) {
  const segments = parseLabelledSegments(line.text);
  const row = (
    <div className={historicalInlineHighlightClass(line.isHighlighted, line.isFresh)}>
      <p className="whitespace-pre-wrap text-[14px] leading-[22px] text-tp-slate-700">
        <span className={historicalInlineTextClass(line.isHighlighted, line.isFresh)}>
          {segments.map((seg, i) => (
            <span key={i}>
              {i > 0 ? <span className="text-tp-slate-300"> | </span> : null}
              {seg.label ? (
                <>
                  <span className="text-tp-slate-500">{seg.label}: </span>
                  <span className="font-medium text-tp-slate-700">{seg.value}</span>
                </>
              ) : (
                <span className="text-tp-slate-700">{seg.value}</span>
              )}
            </span>
          ))}
        </span>
      </p>
    </div>
  );

  return <HistoricalInlineTooltip enabled={showTooltip}>{row}</HistoricalInlineTooltip>;
}

/**
 * Heading + bracketed-body row renderer.
 *
 * First segment becomes the bold heading (e.g. "Gravida no: 1",
 * "17 Jan'26", "Complete Blood Count", "Tetanus Toxoid (TT-1)"). The
 * remaining segments render inside `( … )` joined by `, ` so the
 * dense pipe rows turn into scannable "title (label: value, label: value)"
 * lines.
 */
function HeadingBracketRow({ line, showTooltip }) {
  const segments = parseLabelledSegments(line.text);
  if (!segments.length) return null;
  const [head, ...body] = segments;

  const row = (
    <div className={historicalInlineHighlightClass(line.isHighlighted, line.isFresh)}>
      <p className="whitespace-pre-wrap text-[14px] leading-[22px] text-tp-slate-700">
        <span className={historicalInlineTextClass(line.isHighlighted, line.isFresh)}>
          {/* Heading — both label AND value render dark/semibold so
               the entire phrase ("Gravida no: 1", "17 Jan'26",
               "Complete Blood Count", "Tetanus Toxoid (TT-1)") reads as
               a single bold heading rather than a label/value pair. */}
          {head.label ? (
            <>
              <span className="font-semibold text-tp-slate-700">{head.label}: </span>
              <span className="font-semibold text-tp-slate-700">{head.value}</span>
            </>
          ) : (
            <span className="font-semibold text-tp-slate-700">{head.value}</span>
          )}

          {body.length ? (
            <span className="text-tp-slate-700">
              <span> (</span>
              {body.map((seg, i) => (
                <span key={i}>
                  {i > 0 ? <span>, </span> : null}
                  {seg.label ? (
                    <>
                      <span className="text-tp-slate-500">{seg.label}: </span>
                      <span className="font-medium text-tp-slate-700">{seg.value}</span>
                    </>
                  ) : (
                    <span className="text-tp-slate-700">{seg.value}</span>
                  )}
                </span>
              ))}
              <span>)</span>
            </span>
          ) : null}
        </span>
      </p>
    </div>
  );

  return <HistoricalInlineTooltip enabled={showTooltip}>{row}</HistoricalInlineTooltip>;
}

/** Violet pill — used for the GPLAE qualifier ("Primigravida"). */
function GravidaTag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-tp-violet-300 bg-tp-violet-50 px-[8px] py-[1px] text-[11px] font-semibold leading-[16px] text-tp-violet-700">
      {children}
    </span>
  );
}

const BRACKET_SECTIONS = new Set(["pregnancy", "examination", "anc", "immunisation"]);

export function ObstetricHistoryContent() {
  const { lines, showTooltipOnFirstOpen } = useHistoricalSectionHighlights("obstetric");
  const sections = buildObstetricSections(lines);
  const firstTooltipSectionId = sections.find((section) =>
    section.lines.some((line) => line.isHighlighted)
  )?.id;
  const [expandedState, setExpandedState] = useState({
    pregnancy: true,
    examination: true,
    anc: true,
    immunisation: true,
  });

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="obstetric" />
      <SectionScrollArea>
        {sections.map((section) => {
          const expanded = !section.collapsible || expandedState[section.id] !== false;
          const firstHighlightedIndex = section.lines.findIndex((line) => line.isHighlighted);

          // GPLAE: extract qualifier rows ("Primigravida" etc.) and surface
          // them as inline violet pills in the section title's right-hand
          // slot. The numeric formula row stays in the body.
          let renderedLines = section.lines;
          let qualifierTags = null;
          if (section.id === "gplae") {
            const tags = section.lines.filter((l) => !l.text.includes(":"));
            renderedLines = section.lines.filter((l) => l.text.includes(":"));
            if (tags.length) {
              qualifierTags = (
                <span className="flex flex-wrap items-center gap-[6px]">
                  {tags.map((t, i) => (
                    <GravidaTag key={`g-tag-${i}`}>{t.text}</GravidaTag>
                  ))}
                </span>
              );
            }
          }

          return (
            <SectionCard
              key={section.id}
              title={section.title}
              expanded={expanded}
              hideChevron={!section.collapsible}
              onToggle={
                section.collapsible
                  ? () =>
                      setExpandedState((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                  : undefined
              }
              titleAddon={
                <span className="flex items-center gap-[8px]">
                  {qualifierTags}
                  <AiTriggerIcon
                    tooltip={`Summarize ${section.title.toLowerCase()}`}
                    signalLabel={`Summarize ${section.title.toLowerCase()}`}
                    sectionId="obstetric"
                    size={12}
                    as="span"
                  />
                </span>
              }>

              <div className="bg-white px-[12px] py-[12px] flex flex-col gap-[8px] w-full">
                {renderedLines.map((line, index) => {
                  const showTooltip = Boolean(
                    line.isHighlighted &&
                    line.isFresh &&
                    showTooltipOnFirstOpen &&
                    section.id === firstTooltipSectionId &&
                    index === firstHighlightedIndex
                  );

                  // Patient Info: gradient divider between sub-blocks.
                  if (section.id === "patientInfo") {
                    return (
                      <React.Fragment key={`${section.id}-${index}`}>
                        {index > 0 ? <GradientDivider className="my-[8px]" /> : null}
                        <InlineLabelledRow line={line} showTooltip={showTooltip} />
                      </React.Fragment>
                    );
                  }

                  // GPLAE numeric formula — plain inline row.
                  if (section.id === "gplae") {
                    return (
                      <InlineLabelledRow
                        key={`${section.id}-${index}`}
                        line={line}
                        showTooltip={showTooltip}
                      />
                    );
                  }

                  // Pregnancy / Examination / ANC / Immunisation —
                  // bullet + heading + bracketed body.
                  if (BRACKET_SECTIONS.has(section.id)) {
                    return (
                      <div
                        key={`${section.id}-${index}`}
                        className="flex items-start gap-[6px]">
                        <Bullet tone={line.isFresh ? "fresh" : "default"} />
                        <div className="flex-1 min-w-0">
                          <HeadingBracketRow line={line} showTooltip={showTooltip} />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <InlineLabelledRow
                      key={`${section.id}-${index}`}
                      line={line}
                      showTooltip={showTooltip}
                    />
                  );
                })}
              </div>
            </SectionCard>
          );
        })}
      </SectionScrollArea>
    </div>
  );
}
