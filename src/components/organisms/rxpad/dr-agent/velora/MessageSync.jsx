"use client";
import { SyncDetails } from './SyncDetails';
import { SYNC_AT } from './fixtures';
import s from './MessageSync.module.scss';

export function MessageSync({ result }) {
  // Use this response's snapshot, never a later sync from the patient header.
  const raw = result.live ? result.corpus_updated_at : SYNC_AT;
  const date = raw ? new Date(raw) : null;
  const valid = date && !Number.isNaN(date.valueOf());
  const options = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
  const short = valid ? new Intl.DateTimeFormat('en-IN', options).format(date) : null;
  return <div className={s.sync}>
    <SyncDetails patientName={result.patientName || result.patient?.name} patientAge={result.patient?.age} patientGender={result.patient?.gender} snapshot={{ syncedAt: raw }} side="top" variant="dark" iconSize={16}>
      <span>{valid ? <>Last synced <time dateTime={raw}>{short}</time></> : 'Sync unavailable'}</span>
    </SyncDetails>
  </div>;
}
