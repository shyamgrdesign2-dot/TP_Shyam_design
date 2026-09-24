"use client";

import { useEffect, useState } from "react";
import { CopilotIcon } from "./CopilotIcon";
import { Tooltip, TooltipTrigger, TooltipContent } from "@dhspl-tatvacare/tesseract-ui";
import { WelcomePrompts, resolveWelcomeActions } from "./WelcomeScreen";
import { usePatientSync } from "./usePatientSync";
import { PREVIEW_STARTERS } from "./fixtures";
import s from "./VeloraSearch.module.scss";

// Same fixed patient lead and rotating topics as PM Doctor Portal's CopilotSearchField.
const HINTS = ["medications", "last prescription", "recent lab results", "documented allergies", "blood pressure readings", "last visit notes"];
const STARTERS = resolveWelcomeActions({ suggestions: PREVIEW_STARTERS });

export function VeloraSearch({ patientId, patientName, onAsk, isOpen = false, fullWidth = false, showSync = false }) {
  const [hint, setHint] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer;
    const start = () => {
      clearInterval(timer);
      if (!isOpen && !motion.matches) timer = setInterval(() => setHint(index => (index + 1) % HINTS.length), 3000);
    };
    start();
    motion.addEventListener("change", start);
    return () => { clearInterval(timer); motion.removeEventListener("change", start); };
  }, [isOpen]);
  const firstName = String(patientName || "").trim().split(/\s+/)[0];
  const label = `Ask Dr.Velora about ${patientName || "this patient"}`;
  return (
    <div className={`${s.wrap} ${fullWidth ? s.fullWidth : ""}`}>
      <div className={s.field}>
        <span className={s.wash} aria-hidden="true" />
        <div className={s.inputArea} onClick={() => onAsk("")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/dr-agent/agent-spark.svg" alt="" width={22} height={22} className={s.spark} />
        <span className={s.ghost} aria-hidden="true">
          <span className={s.lead}>Ask Dr.Velora about {firstName ? `${firstName}'s` : "this patient's"}</span>
          <span className={s.roll}><span key={hint} className={s.rollIn}>{HINTS[hint]}</span></span>
        </span>
        <input className={s.input} aria-label={label} aria-haspopup="dialog" readOnly value="" onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onAsk(""); }
        }} />
        </div>
        {showSync && <SyncStatus patientId={patientId} patientName={patientName} />}
      </div>
    </div>
  );
}

export function VeloraPatientHeader({ patientId, patientName, onBack, onAsk, isOpen }) {
  return (
    <header className={s.header} aria-label="Patient chart search">
      <div className={s.backCell}>
        <button type="button" className={s.back} aria-label="Go back" onClick={onBack}><CopilotIcon name="arrow-short-left" size={20} variant="linear" /></button>
      </div>
      <div className={s.inner}>
        <VeloraSearch fullWidth showSync patientId={patientId} patientName={patientName} onAsk={onAsk} isOpen={isOpen} />
        <div className={s.metaRow}>
          <div className={s.starters}>
            <WelcomePrompts layout="row" actions={STARTERS} onActionClick={onAsk} />
          </div>
        </div>
      </div>
    </header>
  );
}

function SyncStatus({ patientId, patientName }) {
  const sync = usePatientSync(patientId);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const counts = [
    ["Prescriptions", sync.prescriptions, "capsule"],
    ["Pathology reports", sync.pathologyReports, "clipboard-activity"],
    ["Radiology reports", sync.radiologyReports, "medical-record"],
    ["Visits", sync.visits, "calendar"],
  ];
  const { shortDate, shortTime } = sync;
  return (
    <div className={s.syncStatus}>
      <CopilotIcon name="clock" size={14} variant="linear" aria-hidden="true" />
      <span className={s.syncText}>{shortDate ? <><span className={s.syncPrefix}>Last synced </span><time dateTime={sync.syncedAt}>{shortDate}<span className={s.syncTime}>, {shortTime}</span></time></> : "Sync unavailable"}</span>
      <Tooltip open={detailsOpen} onOpenChange={setDetailsOpen} delayDuration={180} variant="light" arrow arrowSize={6} maxWidth={320} interactive closeDelay={140}>
        <TooltipTrigger asChild>
          <button type="button" className={s.syncInfo} aria-label={`Sync details for ${patientName || "this patient"}`} onClick={() => setDetailsOpen(true)}>
            <CopilotIcon name="info-circle" size={16} variant="linear" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" sideOffset={10} className={s.syncTooltip}>
          <div className={s.tooltipHeading}><strong>Record sync details</strong><span className={s.demoBadge}>{sync.live ? "Live test patient" : "Sample data"}</span></div>
          <p className={s.syncPatient}>{patientName || "This patient"}</p>
          <p className={s.syncDescription}>{sync.label ? "Last synced successfully" : "Sync time not available"}</p>
          <time className={s.fullSyncDate} dateTime={sync.syncedAt}>{sync.label ? `${sync.label} IST` : "—"}</time>
          <dl className={s.syncCounts}>
            {counts.map(([label, count, icon]) => <div key={label}><dt><CopilotIcon name={icon} size={16} />{label}</dt><dd>{count ?? "Unavailable"}</dd></div>)}
          </dl>
          <p className={s.syncCoverage}>Answers cite available source records. Records added after this sync may not be included.</p>
          <p className={s.demoNote}>{sync.live ? sync.error || "Coverage counts are shown only when the backend supplies them." : "Preview uses fictional records. No live sync is connected."}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
