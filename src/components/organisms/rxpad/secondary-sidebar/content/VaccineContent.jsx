/**
 * Vaccination History content panel.
 *
 * Three expandable cards: Pending, Upcoming, Given. Each schedule entry
 * is rendered as a bullet pointer (week label + vaccine row) so dense
 * pipe-separated metadata becomes scannable. Cards are split with the
 * canonical TP-AI gradient divider — the same one painted on the top
 * brand bar — so the section reads as a single connected family.
 *
 * Tone palette:
 *   • Heading: tp-slate-700 (primary)
 *   • Sub-heading / week label: tp-slate-700, semibold
 *   • Body label (Status / Brand / Due date): tp-slate-500 (muted)
 *   • Inline `|` separators: tp-slate-300 (lightest divider)
 *   • Status accents: due (tp-warning-500), overdue (tp-error-500)
 */
import React, { useState } from "react";
import {
  ActionButton,
  Bullet,
  GradientDivider,
  Grey,
  Red,
  SectionCard,
  SectionScrollArea,
  Sep,
} from "../detail-shared";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";

function VaccineItemRow({
  week,
  name,
  status,
  statusColor = "normal",
  givenDate = "14 Jan'26",
}) {
  const statusEl =
    statusColor === "overdue" ? <Red>{status}</Red> :
    statusColor === "due" ? <span className="text-tp-warning-500">{status}</span> :
    <span>{status}</span>;

  return (
    <div className="flex items-start gap-[6px] px-[10px] py-[8px]">
      <Bullet />
      <div className="flex flex-col gap-[4px] min-w-0">
        <p className="font-sans font-semibold text-[14px] leading-[22px] text-tp-slate-700">
          {week}
        </p>
        <p className="font-sans text-[14px] leading-[22px] text-tp-slate-700 whitespace-pre-wrap">
          <span className="font-sans font-medium">{name}</span>
          <span>{" ("}</span>
          <Grey>Status: </Grey>
          {statusEl}
          <span className="text-tp-slate-700">{", "}</span>
          <Grey>Given date: </Grey>
          <span>{givenDate})</span>
        </p>
      </div>
    </div>
  );
}

function GivenVaccineItem({ name, givenDate = "14 Jan'25", dueDate = "14 Jan'26" }) {
  return (
    <div className="flex items-start gap-[6px]">
      <Bullet />
      <p className="font-sans text-[14px] leading-[22px] text-tp-slate-700 whitespace-pre-wrap min-w-0">
        <span className="font-sans font-medium">{name}</span>
        <span>{" ("}</span>
        <Grey>Given date: </Grey>
        <span>{givenDate} </span>
        <Sep />
        <Grey>Brand: </Grey>
        <span>Pneumovax 23 Vaccine </span>
        <Sep />
        <Grey>Due date: </Grey>
        <span>{dueDate})</span>
      </p>
    </div>
  );
}

function GivenVaccineGroup({ week, vaccines }) {
  return (
    <div className="relative shrink-0 w-full px-[10px] py-[8px] flex flex-col gap-[6px]">
      <p className="font-sans font-semibold text-[14px] leading-[22px] text-tp-slate-700">
        {week}
      </p>
      <div className="flex flex-col gap-[4px]">
        {vaccines.map((v, i) => (
          <GivenVaccineItem key={`${week}-${v}-${i}`} name={v} />
        ))}
      </div>
    </div>
  );
}

export function VaccineContent() {
  const [expandedState, setExpandedState] = useState({
    pending: true,
    upcoming: true,
    given: true,
  });

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="vaccine" />
      <HistoricalNewDataBanner activeId="vaccine" />
      <SectionScrollArea>
        <SectionCard
          title="Vaccination History — Pending (4)"
          expanded={expandedState.pending}
          onToggle={() => setExpandedState((prev) => ({ ...prev, pending: !prev.pending }))}
          titleAddon={
            <AiTriggerIcon
              tooltip="Summarize pending vaccines"
              signalLabel="Summarize pending vaccines"
              sectionId="vaccine"
              size={12}
              as="span"
            />
          }>
          <VaccineItemRow week="12-18 Weeks" name="HPV 1" status="Due" statusColor="due" />
          <GradientDivider />
          <VaccineItemRow week="18 Weeks" name="Tdap Booster" status="Due" statusColor="due" />
        </SectionCard>

        <SectionCard
          title="Vaccination History — Upcoming (2)"
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
          <VaccineItemRow week="13 Weeks" name="PPSV23" status="Overdue" statusColor="overdue" />
          <GradientDivider />
          <VaccineItemRow week="20 Weeks" name="Influenza" status="Due in 2 weeks" />
        </SectionCard>

        <SectionCard
          title="Vaccination History — Given (20)"
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
          <GivenVaccineGroup week="Birth" vaccines={["IPV B-1"]} />
          <GradientDivider />
          <GivenVaccineGroup week="6 Weeks" vaccines={["DTP B1", "Hib B1"]} />
          <GradientDivider />
          <GivenVaccineGroup week="10 Weeks" vaccines={["HEP A-2", "PPSV 23", "PPSV 23 (2)"]} />
          <GradientDivider />
          <GivenVaccineGroup week="2-3 years" vaccines={["PPSV 23"]} />
        </SectionCard>
      </SectionScrollArea>
    </div>
  );
}
