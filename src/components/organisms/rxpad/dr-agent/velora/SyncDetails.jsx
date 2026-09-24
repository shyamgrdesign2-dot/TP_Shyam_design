"use client";
import { useState } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@dhspl-tatvacare/tesseract-ui';
import { CopilotIcon } from './CopilotIcon';
import { usePatientSync } from './usePatientSync';
import s from './SyncDetails.module.scss';


export function SyncDetails({ patientId, patientName, patientAge, patientGender, snapshot, children, side = 'bottom', align = 'end', variant = 'light', iconSize = 14 }) {
  const current = usePatientSync(patientId);
  const sync = snapshot || current;
  const [open, setOpen] = useState(false);
  const gender = { M: 'Male', F: 'Female', O: 'Other' }[patientGender] || patientGender;
  const age = patientAge != null && String(patientAge).trim() && patientAge !== '—' ? `${patientAge} years` : null;
  const demographics = [age, gender && gender !== '—' ? gender : null].filter(Boolean).join(' · ');
  const date = sync.syncedAt ? new Date(sync.syncedAt) : null;
  const dateLabel = date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(date) + ' IST' : 'Sync time unavailable';
  return <Tooltip open={open} onOpenChange={setOpen} delayDuration={180} closeDelay={140} variant={variant} arrow maxWidth={320} interactive>
    <TooltipTrigger asChild><button type="button" className={s.trigger} aria-label={`Record sync details for ${patientName || 'this patient'}`} onClick={() => setOpen(value => !value)}>
      {children}<CopilotIcon name="info-circle" variant="linear" size={iconSize} aria-hidden="true" />
    </button></TooltipTrigger>
    <TooltipContent side={side} align={align} sideOffset={8} className={`${s.tooltip} ${variant === "dark" ? s.dark : ""}`}>
      <div className={s.identity}>
        <strong className={s.heading}>{patientName || 'This patient'}</strong>
        {demographics && <p className={s.demographics}>{demographics}</p>}
      </div>
      <p className={s.label}>Last Sync Summary</p>
      <div className={s.date}><CopilotIcon name="clock" variant="bulk" size={17} /><time dateTime={sync.syncedAt || undefined}>{dateLabel}</time></div>
      <p className={s.available}>Available records</p>
      <dl className={s.counts}>
        <div><dt><CopilotIcon name="clipboard-activity" size={17} />Lab records</dt><dd>{sync.labResults ?? 'Included'}</dd></div>
        <div><dt><CopilotIcon name="calendar" size={17} />Prescriptions</dt><dd>{sync.visits ?? 'Included'}</dd></div>
      </dl>
      <p className={s.note}><CopilotIcon name="danger" variant="bulk" size={17} aria-hidden="true" /><span>Records added after the sync may not be included.</span></p>
    </TooltipContent>
  </Tooltip>;
}
