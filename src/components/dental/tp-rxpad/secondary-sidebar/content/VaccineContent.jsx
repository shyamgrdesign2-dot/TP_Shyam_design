/**
 * Vaccination content panel — expandable section cards.
 */
import React, { useState } from "react";
import {
  ActionButton,
  SectionCard,
  SectionScrollArea,
  Grey,
  Sep,
  Red,
} from "../detail-shared";
import layout from "./sidebarContentLayout.module.scss";
function VaccineItemRow({
  week,
  name,
  status,
  statusColor = "normal",
  givenDate = "14 Jan'26",
}) {
  const statusEl =
    statusColor === "overdue" ? (
      <Red>{status}</Red>
    ) : statusColor === "due" ? (
      <span className={layout.warningText}>{status}</span>
    ) : (
      <span>{status}</span>
    );
  return (
    <div className={layout.blockPad}>
      <p className={layout.blockTitle}>{week}</p>
      <p className={layout.vaccineMeta}>
        <span className={layout.vaccineMedium}>{name}</span>
        <span> (</span>
        <Grey>Status: </Grey>
        {statusEl}
        <span className={layout.detailPipe}> | </span>
        <Grey>Given date: </Grey>
        <span>{givenDate} )</span>
      </p>
    </div>
  );
}
function GivenVaccineItem({
  name,
  givenDate = "14 Jan'25",
  dueDate = "14 Jan'26",
}) {
  return (
    <li className={layout.givenLi}>
      <span className={layout.vaccineMedium}>{name}</span>
      <span> (</span>
      <Grey>Given date: </Grey>
      <span>{givenDate} </span>
      <Sep />
      <Grey>Brand: </Grey>
      <span>Pneumovax 23 Vaccine </span>
      <Sep />
      <Grey>Due date: </Grey>
      <span>{dueDate})</span>
    </li>
  );
}
function GivenVaccineGroup({ week, vaccines }) {
  return (
    <div className={layout.blockPad}>
      <p className={layout.blockTitle}>{week}</p>
      <ul className={layout.givenList}>
        {vaccines.map((v, i) => (
          <GivenVaccineItem name={v} />
        ))}
      </ul>
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
    <div className={layout.pageRoot}>
      <ActionButton label="Add/Edit Details" icon="plus" />
      <SectionScrollArea>
        <SectionCard
          title="Pending Vaccine (4)"
          expanded={expandedState.pending}
          onToggle={() =>
            setExpandedState((prev) => ({
              ...prev,
              pending: !prev.pending,
            }))
          }
        >
          <VaccineItemRow
            week="12-18 Weeks"
            name="HPV 1"
            status="Due"
            statusColor="due"
          />
          <div className={layout.divider} />
          <VaccineItemRow
            week="18 Weeks"
            name="Tdap Booster"
            status="Due"
            statusColor="due"
          />
        </SectionCard>
        <SectionCard
          title="Upcoming Vaccine (2)"
          expanded={expandedState.upcoming}
          onToggle={() =>
            setExpandedState((prev) => ({
              ...prev,
              upcoming: !prev.upcoming,
            }))
          }
        >
          <VaccineItemRow
            week="13 Weeks"
            name="PPSV23"
            status="Overdue"
            statusColor="overdue"
          />
          <div className={layout.divider} />
          <VaccineItemRow
            week="20 Weeks"
            name="Influenza"
            status="Due in 2 weeks"
          />
        </SectionCard>
        <SectionCard
          title="Given Vaccine (20)"
          expanded={expandedState.given}
          onToggle={() =>
            setExpandedState((prev) => ({
              ...prev,
              given: !prev.given,
            }))
          }
        >
          <GivenVaccineGroup week="Birth" vaccines={["IPV B-1"]} />
          <div className={layout.divider} />
          <GivenVaccineGroup week="6 Weeks" vaccines={["DTP B1", "Hib B1"]} />
          <div className={layout.divider} />
          <GivenVaccineGroup
            week="10 Weeks"
            vaccines={["HEP A-2", "PPSV 23", "PPSV 23 (2)"]}
          />
          <div className={layout.divider} />
          <GivenVaccineGroup week="2-3 years" vaccines={["PPSV 23"]} />
        </SectionCard>
      </SectionScrollArea>
    </div>
  );
}
