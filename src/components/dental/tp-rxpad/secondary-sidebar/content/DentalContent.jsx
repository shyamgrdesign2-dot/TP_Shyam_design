import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ToothIcon } from "../../../ToothIcon";
import { DENTAL_TOOTH_HISTORY } from "../../../mock-data";
import { TPMedicalIcon } from "../../../tp-ui";
import {
  ActionButton,
  SectionScrollArea,
  useStickyHeaderState } from
"../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import d from "./DentalContent.module.scss";
function ToothHistorySection({ title, medicalIcon, children }) {
  return (
    <div>
      <div className={d.sectionHeadRow}>
        <span className={d.iconWrap}>
          <TPMedicalIcon
            name={medicalIcon}
            variant="bulk"
            size={16}
            color="var(--tp-violet-400)"
            className={d.medIcon} />

        </span>
        <p className={d.sectionTitle}>{title}</p>
      </div>
      <div className={d.sectionBody}>{children}</div>
    </div>);

}
function renderMeta(parts) {
  const cleanParts = parts.filter(Boolean);
  return (
    <span className={d.metaWrap}>
      (
      {cleanParts.map((part, idx) =>
      <React.Fragment>
          {idx > 0 ? <span className={d.metaSep}> | </span> : null}
          {part}
        </React.Fragment>
      )}
      )
    </span>);

}
function formatHistoryDate(value) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!isoMatch) return value;
  const [, y, m, d0] = isoMatch;
  const dt = new Date(Number(y), Number(m) - 1, Number(d0));
  if (Number.isNaN(dt.getTime())) return value;
  const day = dt.getDate().toString().padStart(2, "0");
  const month = dt.toLocaleString("en-IN", {
    month: "short"
  });
  const year = dt.getFullYear().toString().slice(-2);
  return `${day} ${month}'${year}`;
}
function ToothHistoryCard({ entry }) {
  const { headerRef, isStuck } = useStickyHeaderState();
  return (
    <div className={d.cardRoot} style={tpSectionCardStyle}>
      <div
        ref={headerRef}
        className={`${d.stickyHead} ${isStuck ? d.stickyHeadStuck : d.stickyHeadOpen}`}>

        <div className={d.headRow}>
          <p className={d.toothTitle}>
            {entry.toothCode === "full-mouth" ?
            "Full Mouth" :
            `${entry.toothLabel} (T${entry.toothCode})`}
          </p>
        </div>
      </div>
      <div className={d.bodyPanel}>
        <ToothHistorySection
          title="Treatment History"
          medicalIcon="clipboard-activity">

          {entry.treatmentHistory.length > 0 ?
          <ul className={d.listLoose}>
              {entry.treatmentHistory.map((item) =>
            <li className={d.listItem}>
                  <span className={d.itemStrong}>{item.name}</span>{" "}
                  {renderMeta([
              item.surface,
              formatHistoryDate(item.since),
              item.notes]
              )}
                </li>
            )}
            </ul> :

          <p className={d.emptyLine}>No treatment history documented.</p>}

        </ToothHistorySection>
        <ToothHistorySection title="Findings" medicalIcon="diagnosis">
          {entry.findings.length > 0 ?
          <ul className={d.listTight}>
              {entry.findings.map((finding) =>
            <li className={d.listItem}>
                  <span className={d.itemStrong}>{finding.name}</span>{" "}
                  {renderMeta([
              finding.surface,
              formatHistoryDate(finding.since),
              finding.notes]
              )}
                </li>
            )}
            </ul> :

          <p className={d.emptyLine}>No findings added.</p>}

        </ToothHistorySection>
        <ToothHistorySection
          title="Procedures"
          medicalIcon="surgical-scissors-02">

          {entry.procedures.length > 0 ?
          <ul className={d.listLoose}>
              {entry.procedures.map((procedure) =>
            <li className={d.listItem}>
                  <span className={d.itemStrong}>{procedure.name}</span>{" "}
                  {renderMeta([
              procedure.surface,
              formatHistoryDate(procedure.date),
              procedure.status,
              procedure.notes]
              )}
                </li>
            )}
            </ul> :

          <p className={d.emptyLine}>No procedures recorded.</p>}

        </ToothHistorySection>
        <ToothHistorySection title="Overall Tooth Notes" medicalIcon="note-2">
          <ul className={d.listTight}>
            <li className={d.listItem}>
              {entry.overallNotes ?? "No additional notes."}
            </li>
          </ul>
        </ToothHistorySection>
      </div>
    </div>);

}
export function DentalContent() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams?.get("patientId") ?? "apt-1";
  const entries = DENTAL_TOOTH_HISTORY[patientId] ?? [];
  const [infoMessage, setInfoMessage] = useState("");
  const openDentalExamination = () => {
    if (typeof window === "undefined") return;
    const activeTab = window.localStorage.getItem("rxpad.active-tab");
    if (activeTab === "dental") {
      setInfoMessage(
        "You are already in Dental Examination. Add tooth findings/procedures to build history."
      );
      return;
    }
    window.dispatchEvent(new CustomEvent("tp:open-dental-exam"));
    setInfoMessage(
      "Switched to Dental Examination. Add tooth details to populate Dental History."
    );
  };
  if (entries.length === 0) {
    return (
      <div className={d.pageRoot}>
        <div className={d.emptyStack}>
          <div className={d.emptyIconCircle}>
            <ToothIcon size={38} color="var(--tp-blue-500)" variant="Linear" />
          </div>
          <div className={d.emptyTextCol}>
            <p className={d.emptyTitle}>No dental history yet</p>
            <p className={d.emptySubtitle}>
              Open Dental Examination to add treatment history, findings,
              procedures, and tooth notes.
            </p>
          </div>
          <button
            type="button"
            onClick={openDentalExamination}
            className={d.openExamBtn}>

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true">

              <path
                d="M6 12H18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5" />

              <path
                d="M12 18V6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5" />

            </svg>
            Open Dental Examination
          </button>
          {infoMessage ? <p className={d.infoMsg}>{infoMessage}</p> : null}
        </div>
      </div>);

  }
  return (
    <div className={d.pageRoot}>
      <ActionButton
        label="Open Dental Examination"
        icon="plus"
        onClick={openDentalExamination} />

      {infoMessage ?
      <div className={d.bannerWrap}>
          <p className={d.bannerText}>{infoMessage}</p>
        </div> :
      null}
      <SectionScrollArea>
        {entries.map((entry) =>
        <ToothHistoryCard entry={entry} />
        )}
      </SectionScrollArea>
    </div>);

}