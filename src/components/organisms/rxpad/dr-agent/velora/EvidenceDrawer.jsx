"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@dhspl-tatvacare/tesseract-ui';
import { CopilotIcon, EvidenceIcon } from './CopilotIcon';
import { SyncDetails } from './SyncDetails';
import { evidenceTextParts } from './evidenceText';
import { EvidenceDocument } from './EvidenceDocument';
import { DEMO_PATIENT, SYNC_AT } from './fixtures';
import s from './EvidenceDrawer.module.scss';

function displayDate(raw, time = false) {
  if (!raw || Number.isNaN(new Date(raw).valueOf())) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' } : { timeZone: 'UTC' }) }).format(new Date(raw));
}

export function EvidenceDrawer({ result, selected, onSelect, onClose }) {
  const surface = useRef(null), records = useRef({});
  const [expanded, setExpanded] = useState(selected);
  const patient = useMemo(() => ({ name: result.patientName || (result.live ? 'Test patient' : DEMO_PATIENT), ...result.patient }), [result]);
  const sync = result.live ? result.corpus_updated_at : SYNC_AT;
  const count = result.evidence.length;
  useEffect(() => {
    const panel = surface.current;
    // Tesseract owns its portalled scrim. Raise that scrim above the copilot too.
    const overlay = panel?.previousElementSibling;
    const origin = document.activeElement;
    overlay?.classList.add(s.overlay);
    return () => { overlay?.classList.remove(s.overlay); if (origin?.isConnected) origin.focus(); };
  }, []);
  useEffect(() => { records.current[selected]?.querySelector('button')?.scrollIntoView({ block: 'nearest' }); }, [selected]);
  return <Drawer open onOpenChange={open => { if (!open) onClose(); }}>
    <DrawerContent ref={surface} side="right" width={640} bodyPadding={0} className={s.drawer} bodyClassName={s.body} showClose={false}
      onEscapeKeyDown={event => event.stopPropagation()}
      header={<DrawerHeader showClose={false} className={s.header}>
        <span className={s.headerIcon}><EvidenceIcon size={24} /></span>
        <div className={s.headerText}><div className={s.titleLine}><DrawerTitle className={s.title}>Evidence</DrawerTitle><span className={s.recordCount}>{count} {count === 1 ? 'record' : 'records'}</span></div>
          <DrawerDescription className={s.description}><SyncDetails patientName={patient.name} patientAge={patient.age} patientGender={patient.gender} snapshot={{ syncedAt: sync }}>Last synced {sync ? `${displayDate(sync, true)} IST` : 'date unavailable'}</SyncDetails></DrawerDescription>
        </div>
        <DrawerClose className={s.close} aria-label="Close evidence"><CopilotIcon name="close-square" variant="bold" size={22} /></DrawerClose>
      </DrawerHeader>}>
      <div className={s.records}>{result.evidence.map((row, index) => {
        const active = expanded === row.id;
        const type = row.code === 'medicine' || row.code === 'consultation' ? 'Prescription' : row.code === 'lab_result' ? 'Laboratory report' : row.code === 'radiology' ? 'Radiology report' : 'Medical record';
        return <article key={row.id} ref={node => { records.current[row.id] = node; }} className={`${s.record} ${active ? s.active : ''}`}>
          <button className={s.recordHeader} aria-expanded={active} aria-controls={`record-body-${row.id}`} aria-label={`${active ? 'Collapse' : 'Expand'} evidence ${index + 1}: ${row.title}`} onClick={() => { setExpanded(active ? null : row.id); if (!active) onSelect(row.id); }}>
            <span className={s.number}>{index + 1}</span>
            <span className={s.recordHeading}><strong>{type}</strong><span>{row.title && row.title !== 'Recorded prescription' ? `${row.title} · ` : ''}{displayDate(row.eventDate)}</span></span>
            <span className={s.disclosure}><CopilotIcon name={active ? 'arrow-short-up' : 'arrow-short-down'} variant="linear" size={16} /></span>
          </button>
          {active && <div id={`record-body-${row.id}`}>
            <section className={s.sourceSection} aria-label="Evidence Text">
              <h3>Evidence Text</h3>
              <p>{row.text ? evidenceTextParts(row.text, row.highlights).map((part, i) => part.highlighted ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>) : 'Source text is unavailable for this record.'}</p>
            </section>
            <EvidenceDocument row={row} patient={patient} live={result.live} />
            <details className={s.details}><summary>Record details<CopilotIcon name="arrow-short-down" variant="linear" size={14} /></summary><dl>{[['Document', row.title], ['Source ID', row.source_ref], ['Record type', row.code], ['Visit ID', row.caseId], ['Source table', row.tableName]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl></details>
          </div>}
        </article>;
      })}</div>
    </DrawerContent>
  </Drawer>;
}
