"use client";

import { useEffect, useState } from "react";
import { CopilotIcon } from "./CopilotIcon";
import { SyncDetails } from "./SyncDetails";
import { WelcomePrompts, resolveWelcomeActions } from "./WelcomeScreen";
import { usePatientSync } from "./usePatientSync";
import { PREVIEW_STARTERS } from "./fixtures";
import s from "./VeloraSearch.module.scss";

// Same fixed patient lead and rotating topics as PM Doctor Portal's CopilotSearchField.
const HINTS = ["medications", "last prescription", "recent lab results", "documented allergies", "blood pressure readings", "last visit notes"];
const STARTERS = resolveWelcomeActions({ suggestions: PREVIEW_STARTERS });

export function VeloraSearch({ patientId, patientName, patientAge, patientGender, onAsk, isOpen = false, fullWidth = false, showSync = false }) {
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
        {showSync && <SyncStatus patientId={patientId} patientName={patientName} patientAge={patientAge} patientGender={patientGender} />}
        <span className={s.micDivider} aria-hidden="true" />
        <button type="button" className={s.mic} aria-label="Dictate a question" onClick={() => onAsk("", { dictate: true })}><CopilotIcon name="microphone-2" variant="bulk" size={18} /></button>
      </div>
    </div>
  );
}

export function VeloraPatientHeader({ patientId, patientName, patientAge, patientGender, onBack, onAsk, isOpen }) {
  return (
    <header className={s.header} aria-label="Patient chart search">
      <div className={s.backCell}>
        <button type="button" className={s.back} aria-label="Go back" onClick={onBack}><CopilotIcon name="arrow-short-left" size={20} variant="linear" /></button>
      </div>
      <div className={s.inner}>
        <VeloraSearch fullWidth patientId={patientId} patientName={patientName} patientAge={patientAge} patientGender={patientGender} onAsk={onAsk} isOpen={isOpen} />
        <div className={s.metaRow}>
          <div className={s.starters}>
            <WelcomePrompts layout="row" actions={STARTERS} onActionClick={onAsk} />
          </div>
          <SyncStatus patientId={patientId} patientName={patientName} patientAge={patientAge} patientGender={patientGender} />
        </div>
      </div>
    </header>
  );
}

function SyncStatus({ patientId, patientName, patientAge, patientGender }) {
  const sync = usePatientSync(patientId);
  return <div className={s.syncStatus}><SyncDetails patientId={patientId} patientName={patientName} patientAge={patientAge} patientGender={patientGender}>
    <span className={s.syncText}>{sync.shortDate ? <><span className={s.syncPrefix}>Last synced </span><time dateTime={sync.syncedAt}>{sync.shortDate}<span className={s.syncTime}>, {sync.shortTime}</span></time></> : "Sync unavailable"}</span>
  </SyncDetails></div>;
}
