/**
 * Ophthal History content panel — date-grouped exam entries with
 * 7 clinical sub-sections rendered through the standard `SectionCard`
 * primitive (same chrome as Obstetric / Vaccine / Gynec).
 *
 * Per visit:
 *   1. Visual Acuity Test       (OD / OS — UC distance, UC near, pinhole, C distance, C near)
 *   2. Subjective Refraction    (Undilated + Dilated, OD/OS rows)
 *   3. Lensmeter Values         (OD / OS rows)
 *   4. Glass Prescription       (OD / OS + PD)
 *   5. Intra Ocular Pressure    (OD / OS — NCT, GAT, CCT, CIOP)
 *   6. Slit Lamp Examination    (Lids/Lacrimal, Conjuctiva/Sclera, Cornea — each labelled)
 *   7. Fundus Examination       (Disc, Macula, Choroid)
 *
 * Typography matches Obstetric / Vaccine:
 *   • Section / sub-group title  → SectionCard built-in (slate-700 semibold)
 *   • Field label                → tp-slate-500 (NO bold) — recedes
 *   • Field value                → tp-slate-700, font-medium — pops
 *   • Inline separators inside parens → comma `, `
 *   • OD / OS prefix             → semibold slate-700 (acts as the row heading)
 *   • Bullet                     → grey dot pointer
 */

import React, { useState } from "react";
import clsx from "clsx";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { ActionButton, Bullet, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";

// ─── Mock data — shape the OD/OS payload that `optalEntries(history)` will yield ──
const OPTAL_ENTRIES = [
  {
    id: "op-27",
    dateLabel: "27 Jan'26",
    visualAcuity: {
      OD: { "UC Dist": "6/120", "UC Near": "N5", PH: "6/12", "C Dist": "6/9", "C Near": "N6" },
      OS: { "UC Dist": "6/120", "UC Near": "N5", PH: "6/12", "C Dist": "6/9", "C Near": "N6" },
    },
    subjectiveRefraction: {
      Undilated: {
        OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
        OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      },
      Dilated: {
        OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
        OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      },
    },
    lensmeter: {
      OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
    },
    glassPrescription: {
      OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      PD: "0.25",
    },
    iop: {
      OD: { NCT: "1 mmhg", GAT: "3 mmhg", CCT: "302µm", CIOP: "2 MmHg" },
      OS: { NCT: "1 mmhg", GAT: "3 mmhg", CCT: "302µm", CIOP: "2 MmHg" },
    },
    slitLamp: [
      { name: "Lids/Lacrimal Apparatus", OD: "Normal", OS: "Blepharitis" },
      { name: "Conjuctiva/Sclera", OD: "Congestion / Hyperemia", OS: "NIL", Remarks: "Moderate" },
      { name: "Cornea", OD: "Corneal Edema", OS: "NIL", Remarks: "Mild" },
    ],
    fundus: [
      { name: "Disc", OD: "Vitreous Floaters", OS: "Vitreous Floaters", Remarks: "Looking Dense In OD" },
      { name: "Macula", OD: "Macular Scar", OS: "NIL" },
      { name: "Choroid", OD: "Choroidal Nevus", OS: "NIL" },
    ],
  },
  {
    id: "op-15",
    dateLabel: "15 Jan'26",
    visualAcuity: {
      OD: { "UC Dist": "6/9", PH: "6/6", "C Dist": "6/6", "C Near": "N6" },
      OS: { "UC Dist": "6/12", PH: "6/9", "C Dist": "6/9", "C Near": "N8" },
    },
    iop: {
      OD: { NCT: "12 mmhg", GAT: "14 mmhg" },
      OS: { NCT: "13 mmhg", GAT: "15 mmhg" },
    },
    slitLamp: [
      { name: "Lids/Lacrimal Apparatus", OD: "Normal", OS: "Normal" },
      { name: "Cornea", OD: "Clear", OS: "Clear" },
    ],
    fundus: [{ name: "Disc", OD: "WNL", OS: "WNL" }],
  },
];

// ─── Reusable rendering helpers — all label tones aligned with Obstetric ─────

/**
 * Inline `(LABEL: value, LABEL: value)` rendering. Labels use the
 * muted slate-500 (NO bold) and values use slate-700 with `font-medium`,
 * matching the InlineLabelledRow pattern from Obstetric so the
 * cross-section typography is one consistent voice.
 */
function InlineFields({ fields }) {
  const entries = Object.entries(fields).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return null;
  return (
    <span className="text-tp-slate-700">
      <span> (</span>
      {entries.map(([label, value], i) => (
        <span key={label}>
          {i > 0 ? <span>, </span> : null}
          <span className="text-tp-slate-500">{label}: </span>
          <span className="font-medium text-tp-slate-700">{value}</span>
        </span>
      ))}
      <span>)</span>
    </span>
  );
}

/** OD / OS row — eye prefix dark/semibold, fields in inline brackets. */
function EyeRow({ eye, fields }) {
  return (
    <div className="flex items-start gap-[6px]">
      <Bullet />
      <p className="flex-1 min-w-0 text-[14px] leading-[22px] text-tp-slate-700">
        <span className="font-semibold text-tp-slate-700">{eye}</span>
        <InlineFields fields={fields} />
      </p>
    </div>
  );
}

/** Two-eye block (OD + OS) used by every "left/right reading" group. */
function EyeRows({ eyes }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {eyes?.OD ? <EyeRow eye="OD" fields={eyes.OD} /> : null}
      {eyes?.OS ? <EyeRow eye="OS" fields={eyes.OS} /> : null}
    </div>
  );
}

/** Examination-style group (slit lamp / fundus) — one bullet per anatomical part. */
function ExamRows({ items }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {items.map((entry) => {
        const { name, ...fields } = entry;
        return (
          <div key={name} className="flex items-start gap-[6px]">
            <Bullet />
            <p className="flex-1 min-w-0 text-[14px] leading-[22px] text-tp-slate-700">
              <span className="font-semibold text-tp-slate-700">{name}</span>
              <InlineFields fields={fields} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Plain group card used for each Ophthal sub-section. Deliberately
 * NON-sticky — the date header on the parent OptalDateCard is the
 * only sticky element so the sub-section titles (Visual Acuity Test,
 * Subjective Refraction, etc.) scroll under the date band instead of
 * overlapping it. Visual treatment matches a SectionCard at rest:
 * slate-100 title bar + white body + slate-200 hairline border.
 */
function GroupCard({ id, title, children, sectionLabelLower }) {
  return (
    <div
      key={id}
      className="relative shrink-0 w-full overflow-hidden rounded-[10px] border border-tp-slate-200 bg-white">
      <div className="flex items-center justify-between bg-tp-slate-100 px-[12px] py-[8px] w-full">
        <p className="font-['Inter',sans-serif] font-semibold text-tp-slate-700 text-[14px] leading-[20px] tracking-[0.012px]">
          {title}
        </p>
        <AiTriggerIcon
          tooltip={`Summarize ${sectionLabelLower}`}
          signalLabel={`Summarize ${sectionLabelLower}`}
          sectionId="optal"
          size={12}
          as="span"
        />
      </div>
      <div className="bg-white px-[12px] py-[10px] w-full">{children}</div>
    </div>
  );
}

// ─── Date card (collapsible — matches Growth / Past Visits) ──────────────────

function OptalDateCard({ entry, expanded, onToggle }) {
  const { headerRef, isStuck } = useStickyHeaderState();

  return (
    <div className="group/date-card relative shrink-0 w-full" style={tpSectionCardStyle}>
      <button
        ref={headerRef}
        type="button"
        onClick={onToggle}
        className={clsx(
          "group bg-tp-slate-100 sticky top-0 z-[2] shrink-0 w-full text-left",
          expanded
            ? isStuck
              ? "rounded-tl-none rounded-tr-none"
              : "rounded-tl-[10px] rounded-tr-[10px]"
            : "rounded-[10px]"
        )}>
        <div className="flex items-center justify-between px-[10px] py-[8px] w-full">
          <div className="font-['Inter',sans-serif] font-semibold text-tp-slate-700 text-[14px] tracking-[0.012px] whitespace-nowrap leading-[20px]">
            {entry.dateLabel}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="opacity-0 transition-opacity group-hover/date-card:opacity-100">
              <AiTriggerIcon
                tooltip={`Summarize ${entry.dateLabel} ophthal exam`}
                signalLabel={`Summarize ${entry.dateLabel} ophthalmology exam`}
                sectionId="optal"
                size={12}
                as="span"
              />
            </span>
            <div className="relative shrink-0 size-[18px]">
              {expanded ? (
                <ArrowSquareUp color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
              ) : (
                <ArrowSquareDown color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="bg-white rounded-bl-[10px] rounded-br-[10px] w-full px-[10px] py-[10px] flex flex-col gap-[10px]">

          {/* 1. Visual Acuity Test */}
          {(entry.visualAcuity?.OD || entry.visualAcuity?.OS) ? (
            <GroupCard
              id={`${entry.id}-va`}
              title="Visual Acuity Test"
              sectionLabelLower="visual acuity">
              <EyeRows eyes={entry.visualAcuity} />
            </GroupCard>
          ) : null}

          {/* 2. Subjective Refraction (Undilated / Dilated) */}
          {entry.subjectiveRefraction ? (
            <GroupCard
              id={`${entry.id}-sr`}
              title="Subjective Refraction"
              sectionLabelLower="subjective refraction">
              <div className="flex flex-col gap-[10px]">
                {entry.subjectiveRefraction.Undilated ? (
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tp-slate-500">
                      Undilated
                    </p>
                    <EyeRows eyes={entry.subjectiveRefraction.Undilated} />
                  </div>
                ) : null}
                {entry.subjectiveRefraction.Dilated ? (
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tp-slate-500">
                      Dilated
                    </p>
                    <EyeRows eyes={entry.subjectiveRefraction.Dilated} />
                  </div>
                ) : null}
              </div>
            </GroupCard>
          ) : null}

          {/* 3. Lensmeter Values */}
          {(entry.lensmeter?.OD || entry.lensmeter?.OS) ? (
            <GroupCard
              id={`${entry.id}-lm`}
              title="Lensmeter Values"
              sectionLabelLower="lensmeter values">
              <EyeRows eyes={entry.lensmeter} />
            </GroupCard>
          ) : null}

          {/* 4. Glass Prescription (+ optional PD) */}
          {entry.glassPrescription ? (
            <GroupCard
              id={`${entry.id}-gp`}
              title="Glass Prescription"
              sectionLabelLower="glass prescription">
              <div className="flex flex-col gap-[8px]">
                {entry.glassPrescription.OD ? <EyeRow eye="OD" fields={entry.glassPrescription.OD} /> : null}
                {entry.glassPrescription.OS ? <EyeRow eye="OS" fields={entry.glassPrescription.OS} /> : null}
                {entry.glassPrescription.PD ? (
                  <div className="flex items-start gap-[6px]">
                    <Bullet />
                    <p className="flex-1 min-w-0 text-[14px] leading-[22px] text-tp-slate-700">
                      <span className="font-semibold text-tp-slate-700">PD</span>
                      <span className="text-tp-slate-700"> ({entry.glassPrescription.PD})</span>
                    </p>
                  </div>
                ) : null}
              </div>
            </GroupCard>
          ) : null}

          {/* 5. Intra Ocular Pressure */}
          {(entry.iop?.OD || entry.iop?.OS) ? (
            <GroupCard
              id={`${entry.id}-iop`}
              title="Intra Ocular Pressure"
              sectionLabelLower="intra ocular pressure">
              <EyeRows eyes={entry.iop} />
            </GroupCard>
          ) : null}

          {/* 6. Slit Lamp Examination */}
          {entry.slitLamp?.length ? (
            <GroupCard
              id={`${entry.id}-sl`}
              title="Slit Lamp Examination"
              sectionLabelLower="slit lamp examination">
              <ExamRows items={entry.slitLamp} />
            </GroupCard>
          ) : null}

          {/* 7. Fundus Examination */}
          {entry.fundus?.length ? (
            <GroupCard
              id={`${entry.id}-fu`}
              title="Fundus Examination"
              sectionLabelLower="fundus examination">
              <ExamRows items={entry.fundus} />
            </GroupCard>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Public ──────────────────────────────────────────────────────────────────

export function OptalContent() {
  const [expandedId, setExpandedId] = useState(OPTAL_ENTRIES[0]?.id);

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="optal" />
      <HistoricalNewDataBanner activeId="optal" />
      <div
        className="flex-[1_0_0] min-h-px min-w-px overflow-y-auto relative w-full"
        data-sticky-scroll-root="true">
        <div className="content-stretch flex flex-col gap-[12px] items-center p-[12px] relative w-full">
          {OPTAL_ENTRIES.map((entry) => (
            <OptalDateCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
