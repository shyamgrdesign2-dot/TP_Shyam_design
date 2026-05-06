/**
 * Vaccination History content panel.
 *
 * Three expandable cards: Overdue, Upcoming, Given. The
 * Overdue/Upcoming split is system-driven by comparing each row's
 * due date against today — the doctor never picks Overdue manually.
 *
 * Per-section row shape:
 *   • Overdue / Upcoming  → weeks + vaccine name + (Status, optional Notes)
 *   • Given               → weeks + vaccine name + (Given date · Brand
 *                           · Due date · optional Notes)
 *
 * Tone palette:
 *   • Heading: tp-slate-700 (primary)
 *   • Sub-heading / week label: tp-slate-700, semibold
 *   • Body label (Status / Brand / Due date / Notes): tp-slate-500 (muted)
 *   • Inline `|` separators: tp-slate-200
 *   • Status accents: due (tp-warning-500), overdue (tp-error-500)
 */
import React, { useState } from "react";
import { Calendar2 } from "iconsax-reactjs";
import {
  ActionButton,
  Bullet,
  Grey,
  Red,
  SectionCard,
  SectionScrollArea,
  Sep,
} from "../detail-shared";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";

// Today (UTC midnight) — used to bucket pending entries into
// Overdue vs Upcoming based on their dueDate. Frozen at module load
// to keep the demo output deterministic per render.
const TODAY = new Date();

// ── Mock schedule. Real backend would supply the same shape. ───────
const PENDING_VACCINES = [
  // Overdue (past due dates) — bucketed automatically against TODAY.
  { week: "12-18 Weeks", name: "HPV 1", dueDate: "2025-12-30", notes: "" },
  { week: "13 Weeks", name: "PPSV23", dueDate: "2025-09-12", notes: "Discuss with parents first" },
  { week: "18 Weeks", name: "Tdap Booster", dueDate: "2026-02-12", notes: "" },
  { week: "20 Weeks", name: "Influenza", dueDate: "2026-04-10", notes: "Seasonal — confirm stock" },
  // Upcoming (future due dates) — same bucket logic, render in
  // amber "Due" status. Several share a week so the grouped UI shows
  // multiple bullets under one week heading.
  { week: "24 Weeks", name: "Hepatitis A", dueDate: "2026-09-08", notes: "" },
  { week: "24 Weeks", name: "Varicella", dueDate: "2026-09-08", notes: "Confirm parental consent" },
  { week: "30 Weeks", name: "MMR Booster", dueDate: "2026-11-22", notes: "" },
  { week: "36 Weeks", name: "Meningococcal", dueDate: "2027-01-15", notes: "Annual review" },
];

const GIVEN_VACCINES = [
  { week: "Birth", name: "IPV B-1", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "" },
  { week: "6 Weeks", name: "DTP B1", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "Mild fever next day" },
  { week: "6 Weeks", name: "Hib B1", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "" },
  { week: "10 Weeks", name: "HEP A-2", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "" },
  { week: "10 Weeks", name: "PPSV 23", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "" },
  { week: "10 Weeks", name: "PPSV 23 (2)", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "" },
  { week: "2-3 years", name: "PPSV 23", givenDate: "14 Jan'25", brand: "Pneumovax 23 Vaccine", dueDate: "14 Jan'26", notes: "Booster" },
];

function parseDueDate(s) {
  // Accepts ISO ("2026-04-10") or "DD MMM'YY" ("14 Jan'26"). Returns Date or null.
  if (!s) return null;
  const isoTry = new Date(s);
  if (!Number.isNaN(isoTry.getTime())) return isoTry;
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]+)'(\d{2})$/);
  if (!m) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const month = months[m[2].slice(0, 3)];
  if (month == null) return null;
  return new Date(2000 + Number(m[3]), month, Number(m[1]));
}

function formatDateLabel(s) {
  const d = parseDueDate(s);
  if (!d) return s;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yr = String(d.getFullYear()).slice(-2);
  return `${d.getDate()} ${months[d.getMonth()]}'${yr}`;
}

function PendingVaccineItem({ name, dateLabel, dateColor, notes }) {
  // Mirrors the Given row shape: "Vaccine (Due date: <date> | Notes: …)".
  // Date value keeps its semantic colour (red for past-due, amber for
  // upcoming) and font-medium per the palette-weight rule.
  const dateEl =
    dateColor === "overdue" ? <span className="font-medium text-tp-error-500">{dateLabel}</span> :
    dateColor === "due" ? <span className="font-medium text-tp-warning-500">{dateLabel}</span> :
    <span className="font-medium text-tp-slate-700">{dateLabel}</span>;
  return (
    <div className="flex items-start gap-[6px]">
      <Bullet />
      <p className="font-sans text-[14px] leading-[22px] text-tp-slate-700 whitespace-pre-wrap min-w-0">
        <span className="font-medium">{name}</span>
        <span>{" ("}</span>
        <Grey>Due date: </Grey>
        {dateEl}
        {notes ? (
          <>
            <Sep />
            <Grey>Notes: </Grey>
            <span className="font-medium text-tp-slate-700">{notes}</span>
          </>
        ) : null}
        <span>)</span>
      </p>
    </div>
  );
}

// Pending vaccines (Overdue / Upcoming) grouped by week, same shape
// as GivenVaccineGroup so the three sections read alike: week heading
// up top, bullets stacked below.
function PendingVaccineGroup({ week, vaccines, dateColor }) {
  return (
    <div className="relative shrink-0 w-full px-[12px] py-[8px] flex flex-col gap-[6px]">
      {/* Week tag — same chrome as Symptoms / Examination section
          headers in Past Visits so the layout reads as one family. */}
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[4px]">
        <Calendar2 size={18} variant="Bulk" color="var(--tp-slate-500)" className="shrink-0" />
        <span className="flex min-h-0 min-w-0 flex-1 items-center text-left font-sans font-semibold text-tp-slate-500 text-[14px] leading-none">{week}</span>
      </div>
      <div className="flex flex-col gap-[4px] pl-[6px]">
        {vaccines.map((v, i) => (
          <PendingVaccineItem
            key={`${week}-${v.name}-${i}`}
            name={v.name}
            dateLabel={formatDateLabel(v.dueDate)}
            dateColor={dateColor}
            notes={v.notes} />
        ))}
      </div>
    </div>
  );
}

function groupByWeek(rows) {
  const order = [];
  const byWeek = new Map();
  for (const v of rows) {
    if (!byWeek.has(v.week)) {
      byWeek.set(v.week, []);
      order.push(v.week);
    }
    byWeek.get(v.week).push(v);
  }
  return order.map((week) => ({ week, vaccines: byWeek.get(week) }));
}

function GivenVaccineItem({ name, givenDate, brand, dueDate, notes }) {
  return (
    <div className="flex items-start gap-[6px]">
      <Bullet />
      <p className="font-sans text-[14px] leading-[22px] text-tp-slate-700 whitespace-pre-wrap min-w-0">
        <span className="font-medium">{name}</span>
        <span>{" ("}</span>
        <Grey>Given date: </Grey>
        <span className="font-medium text-tp-success-500">{givenDate}</span>
        <Sep />
        <Grey>Brand: </Grey>
        <span className="font-medium text-tp-slate-700">{brand}</span>
        <Sep />
        <Grey>Due date: </Grey>
        <span className="font-medium text-tp-slate-700">{dueDate}</span>
        {notes ? (
          <>
            <Sep />
            <Grey>Notes: </Grey>
            <span className="font-medium text-tp-slate-700">{notes}</span>
          </>
        ) : null}
        <span>)</span>
      </p>
    </div>
  );
}

function GivenVaccineGroup({ week, vaccines }) {
  return (
    <div className="relative shrink-0 w-full px-[12px] py-[8px] flex flex-col gap-[6px]">
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[4px]">
        <Calendar2 size={18} variant="Bulk" color="var(--tp-slate-500)" className="shrink-0" />
        <span className="flex min-h-0 min-w-0 flex-1 items-center text-left font-sans font-semibold text-tp-slate-500 text-[14px] leading-none">{week}</span>
      </div>
      <div className="flex flex-col gap-[4px] pl-[6px]">
        {vaccines.map((v, i) => (
          <GivenVaccineItem key={`${week}-${v.name}-${i}`} {...v} />
        ))}
      </div>
    </div>
  );
}

export function VaccineContent() {
  // Bucket pending vaccines by due-date vs today, then group by week
  // so the rendered list reads as week-heading + bullets (matching
  // the Given Vaccines layout).
  const { overdueGroups, upcomingGroups, overdueCount, upcomingCount } = React.useMemo(() => {
    const overdue = [];
    const upcoming = [];
    for (const v of PENDING_VACCINES) {
      const d = parseDueDate(v.dueDate);
      if (d && d < TODAY) overdue.push(v);
      else upcoming.push(v);
    }
    return {
      overdueGroups: groupByWeek(overdue),
      upcomingGroups: groupByWeek(upcoming),
      overdueCount: overdue.length,
      upcomingCount: upcoming.length
    };
  }, []);

  const givenByWeek = React.useMemo(() => groupByWeek(GIVEN_VACCINES), []);

  const [expandedState, setExpandedState] = useState({
    overdue: true,
    upcoming: true,
    given: true,
  });

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="vaccine" />
      <HistoricalNewDataBanner activeId="vaccine" />
      <SectionScrollArea>
        <SectionCard
          title={`Overdue Vaccines (${overdueCount})`}
          expanded={expandedState.overdue}
          onToggle={() => setExpandedState((prev) => ({ ...prev, overdue: !prev.overdue }))}
          titleAddon={
            <AiTriggerIcon
              tooltip="Summarize overdue vaccines"
              signalLabel="Summarize overdue vaccines"
              sectionId="vaccine"
              size={12}
              as="span"
            />
          }>
          {overdueCount === 0 ? (
            <p className="px-[10px] py-[10px] font-sans text-[13px] italic text-tp-slate-500">No overdue vaccines.</p>
          ) : (
            overdueGroups.map((g, idx) => (
              <React.Fragment key={`overdue-${g.week}-${idx}`}>
                <PendingVaccineGroup
                  week={g.week}
                  vaccines={g.vaccines}
                  dateColor="overdue" />
              </React.Fragment>
            ))
          )}
        </SectionCard>

        <SectionCard
          title={`Upcoming Vaccines (${upcomingCount})`}
          expanded={expandedState.upcoming}
          onToggle={() => setExpandedState((prev) => ({ ...prev, upcoming: !prev.upcoming }))}
          titleAddon={
            <AiTriggerIcon
              tooltip="Summarize upcoming vaccines"
              signalLabel="Summarize upcoming vaccines"
              sectionId="vaccine"
              size={12}
              as="span"
            />
          }>
          {upcomingCount === 0 ? (
            <p className="px-[10px] py-[10px] font-sans text-[13px] italic text-tp-slate-500">No upcoming vaccines.</p>
          ) : (
            upcomingGroups.map((g, idx) => (
              <React.Fragment key={`upcoming-${g.week}-${idx}`}>
                <PendingVaccineGroup
                  week={g.week}
                  vaccines={g.vaccines}
                  dateColor="due" />
              </React.Fragment>
            ))
          )}
        </SectionCard>

        <SectionCard
          title={`Given Vaccines (${GIVEN_VACCINES.length})`}
          expanded={expandedState.given}
          onToggle={() => setExpandedState((prev) => ({ ...prev, given: !prev.given }))}
          titleAddon={
            <AiTriggerIcon
              tooltip="Summarize given vaccines"
              signalLabel="Summarize given vaccines"
              sectionId="vaccine"
              size={12}
              as="span"
            />
          }>
          {givenByWeek.map((g, idx) => (
            <GivenVaccineGroup key={`given-${g.week}-${idx}`} week={g.week} vaccines={g.vaccines} />
          ))}
        </SectionCard>
      </SectionScrollArea>
    </div>
  );
}
