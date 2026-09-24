"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from '@dhspl-tatvacare/tesseract-ui';
import { CopilotIcon } from './CopilotIcon';
import { SYNC_AT } from './fixtures';
import s from './MessageSync.module.scss';

export function MessageSync({ result }) {
  // Use this response's snapshot, never a later sync from the patient header.
  const raw = result.live ? result.corpus_updated_at : SYNC_AT;
  const date = raw ? new Date(raw) : null;
  const valid = date && !Number.isNaN(date.valueOf());
  const options = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
  const short = valid ? new Intl.DateTimeFormat('en-IN', options).format(date) : null;
  const full = valid ? new Intl.DateTimeFormat('en-IN', { ...options, year: 'numeric' }).format(date) : null;
  return <div className={s.sync}>
    <CopilotIcon name="clock" variant="bulk" size={12} aria-hidden="true" />
    <span>{valid ? <>Synced <time dateTime={raw}>{short}</time></> : 'Sync unavailable'}</span>
    <Tooltip variant="dark" arrow arrowSize={6} maxWidth={280} delayDuration={180}>
      <TooltipTrigger asChild><button type="button" className={s.info} aria-label="About this answer’s sync time"><CopilotIcon name="info-circle" variant="linear" size={14} aria-hidden="true" /></button></TooltipTrigger>
      <TooltipContent side="top" align="end" sideOffset={8} className={s.tooltip}>
        <strong>Based on last synced records</strong>
        <p>{valid ? `This answer uses records synced on ${full} IST. More recent records may not be included.` : 'The backend did not provide a sync time for this answer.'}</p>
      </TooltipContent>
    </Tooltip>
  </div>;
}
