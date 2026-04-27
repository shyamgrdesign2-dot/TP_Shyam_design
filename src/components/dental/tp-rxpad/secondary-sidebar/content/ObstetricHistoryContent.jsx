/**
 * Obstetric History content panel — expandable sections.
 * Patient Info is intentionally non-collapsible (no chevron).
 */
import React, { useState } from "react";
import {
  ActionButton,
  SectionCard,
  ContentRow,
  SectionScrollArea,
  Grey,
  Sep,
} from "../detail-shared";
import layout from "./sidebarContentLayout.module.scss";
function PatientInfoCard() {
  return (
    <SectionCard title="Patient Info" hideChevron={true}>
      <ContentRow>
        <p className={layout.bodyPara}>
          <Grey>LMP: </Grey>
          <span>14 Jan'26 </span>
          <Sep />
          <Grey>EDD: </Grey>
          <span>21 Oct'26 </span>
          <Sep />
          <Grey>Gestation: </Grey>
          <span>14 Weeks 2 Days</span>
        </p>
      </ContentRow>
    </SectionCard>
  );
}
function GPLAECard() {
  return (
    <SectionCard
      title="GPLAE"
      hideChevron={true}
      titleAddon={
        <span className={layout.badgePrimigravida}>Primigravida</span>
      }
    >
      <ContentRow>
        <p className={layout.bodyPara}>
          <span>G: 1 </span>
          <Sep />
          <span>P: 0 </span>
          <Sep />
          <span>L: 0 </span>
          <Sep />
          <span>A: 0 </span>
          <Sep />
          <span>E: 0</span>
        </p>
      </ContentRow>
    </SectionCard>
  );
}
function GravidaEntry({ no, hasRemarks }) {
  return (
    <div className={layout.blockPad}>
      <p className={layout.blockTitle}>Gravida no: {no}</p>
      <p className={`${layout.blockBody} ${layout.blockBodyBreak}`}>
        <Grey>LMP: </Grey>
        <span>14 Jan'25 </span>
        <Sep />
        <Grey>EDD: </Grey>
        <span>21 Oct'25 </span>
        <Sep />
        <Grey>Gestation: </Grey>
        <span>40 Weeks </span>
        <Sep />
        <Grey>MOD: </Grey>
        <span>NVD </span>
        <Sep />
        <Grey>Delivery Date: </Grey>
        <span>14 Nov'25 </span>
        <Sep />
        <Grey>Baby Weight: </Grey>
        <span>2.8 Kgs</span>
        {hasRemarks ? (
          <>
            <Sep />
            <Grey>Remarks: </Grey>
            <span>
              Postnatal period was uneventful; breastfeeding initiated within
              first hour.
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
function PregnancyHistoryCard({ expanded, onToggle }) {
  return (
    <SectionCard
      title="Pregnancy History"
      expanded={expanded}
      onToggle={onToggle}
    >
      <GravidaEntry no={1} />
      <div className={layout.divider} />
      <GravidaEntry no={2} hasRemarks={true} />
    </SectionCard>
  );
}
function ExaminationCard({ expanded, onToggle }) {
  return (
    <SectionCard title="Examination" expanded={expanded} onToggle={onToggle}>
      <div className={layout.blockPad}>
        <p className={layout.blockTitle}>17 Jan'26</p>
        <p className={layout.vaccineMeta}>
          <Grey>Pedal Oedema: </Grey>
          <span>Mild </span>
          <Sep />
          <Grey>BMI: </Grey>
          <span>23 Kg/m² </span>
          <Sep />
          <Grey>BP: </Grey>
          <span>128/82 mmHg</span>
        </p>
      </div>
      <div className={layout.divider} />
      <div className={layout.blockPad}>
        <p className={layout.blockTitle}>24 Jan'26</p>
        <p className={layout.vaccineMeta}>
          <Grey>Pedal Oedema: </Grey>
          <span>Absent </span>
          <Sep />
          <Grey>BMI: </Grey>
          <span>23.2 Kg/m² </span>
          <Sep />
          <Grey>BP: </Grey>
          <span>122/80 mmHg</span>
        </p>
      </div>
    </SectionCard>
  );
}
export function ObstetricHistoryContent() {
  const [expandedState, setExpandedState] = useState({
    pregnancy: true,
    examination: true,
  });
  return (
    <div className={layout.pageRoot}>
      <ActionButton label="Add/Edit Details" icon="plus" />
      <SectionScrollArea>
        <PatientInfoCard />
        <GPLAECard />
        <PregnancyHistoryCard
          expanded={expandedState.pregnancy}
          onToggle={() =>
            setExpandedState((prev) => ({
              ...prev,
              pregnancy: !prev.pregnancy,
            }))
          }
        />
        <ExaminationCard
          expanded={expandedState.examination}
          onToggle={() =>
            setExpandedState((prev) => ({
              ...prev,
              examination: !prev.examination,
            }))
          }
        />
      </SectionScrollArea>
    </div>
  );
}
