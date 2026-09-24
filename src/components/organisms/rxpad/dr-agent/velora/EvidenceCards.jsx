"use client";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ChevronRight as ArrowRight, Clock as Clock3, FileText, FlaskConical, Pill, X } from '@/src/components/atoms/icons/lucide';
import { DEMO_PATIENT, SYNC_AT, SYNC_LABEL } from './fixtures';
import s from './EvidenceCards.module.scss';
import { CardShell } from '../cards/CardShell';

export function SyncStamp() {
  return <span className={s.sync}><Clock3 size={13} /> Last synced <time dateTime={SYNC_AT}>{SYNC_LABEL}</time></span>;
}

export function PreviewAnswer({ data }) {
  const [selected, setSelected] = useState(null);
  return <>
    <ClinicalPreviewCard result={data} onEvidence={id => setSelected(id || data.evidence[0]?.id)} />
    {selected && <PreviewEvidence result={data} selected={selected} onSelect={setSelected} onClose={() => setSelected(null)} />}
  </>;
}

function Citation({ sourceRef, result, onEvidence }) {
  const number = result.evidence.findIndex(row => row.source_ref === sourceRef) + 1;
  return number ? <button className={s.citation} aria-label={`View source ${number}`} onClick={() => onEvidence(sourceRef)}>[{number}]</button> : null;
}

function Narrative({ text, result, onEvidence }) {
  return <p className={s.narrative}>{text.split(/(\[\d+\]\(#evidence-[^)]+\))/g).map((part, index) => {
    const match = /^\[\d+\]\(#evidence-(.+)\)$/.exec(part);
    return match ? <Citation key={index} sourceRef={match[1]} result={result} onEvidence={onEvidence} /> : part;
  })}</p>;
}

function ClinicalPreviewCard({ result, onEvidence }) {
  const elements = result.ui.elements;
  const card = elements.card;
  return <CardShell icon={<FileText size={18} />} title={card.props.title} headerExtra={<button className={s.recordCount} onClick={() => onEvidence()}>{result.evidence.length} records</button>}>
    <div className={s.sampleLabel}>Fictional reference chart · {DEMO_PATIENT}</div>
    <div className={s.cardBody}>{card.children.map(key => {
      const { type, props } = elements[key];
      if (type === 'Narrative') return <Narrative key={key} text={props.markdown} result={result} onEvidence={onEvidence} />;
      if (type === 'Trend') return <Trend key={key} chart={props.chart} result={result} onEvidence={onEvidence} />;
      const rx = type === 'Prescriptions';
      return <section key={key}><h3 className={s.sectionTitle}>{rx ? <Pill size={16} /> : <FlaskConical size={16} />}{props.title}</h3>
        <div className={s.tableWrap} role="region" aria-label={props.title} tabIndex={0}><table>
          <thead><tr>{(rx ? ['Medication / date', 'Dose', 'Schedule · M / A / E / N', 'Timing / duration', 'Source'] : ['Measurement / date', 'Recorded value', 'Reference']).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{props.rows.map(row => <tr key={row.sourceRef}><th scope="row">{rx ? row.name : row.label}<small>{row.date}</small></th>
            <td><strong>{rx ? row.dose : row.value}</strong> {row.unit}{!rx && <><span className={s.flag}>{row.flag}</span> <Citation sourceRef={row.sourceRef} result={result} onEvidence={onEvidence} /></>}</td>
            {rx ? <><td><div className={s.slots}>{row.schedule.filter(field => field.label.includes('quantity')).map((field, i) => <span key={field.label}><small>{['M', 'A', 'E', 'N'][i]}</small>{field.value}</span>)}</div></td><td>{row.schedule.find(field => field.label === 'Timing')?.value}<small>{row.duration}</small></td><td><Citation sourceRef={row.sourceRef} result={result} onEvidence={onEvidence} /></td></> : <td>{row.reference || 'Not recorded'}</td>}
          </tr>)}</tbody>
        </table></div>
      </section>;
    })}<p className={s.limitation}>Sample record only. Missing information is not confirmation that a condition or medication is absent.</p></div>
    <button className={s.evidenceFooter} onClick={() => onEvidence()} aria-label="Open evidence"><FileText size={17} /><span><strong>Evidence <span className={s.muted}>· {result.evidence.length} records</span></strong><small>View the exact records behind this answer</small><SyncStamp /></span><ArrowRight size={17} /></button>
  </CardShell>;
}

function Trend({ chart, result, onEvidence }) {
  const points = chart.points.map((point, i) => ({ ...point, px: 60 + i * 210, py: 145 - (point.y - 7) * 70 }));
  return <section><h3 className={s.sectionTitle}><Activity size={16} />{chart.title}</h3><div className={s.trend}>
    <div className={s.trendValue}>7.2<span>%</span><small>Latest · 22 Sep 2026</small></div>
    <svg viewBox="0 0 540 185" role="img" aria-label="HbA1c: 8.4 percent in March, 7.8 in June, 7.2 in September">
      {[7, 8, 9].map(value => <g key={value}><line x1="42" x2="505" y1={145 - (value - 7) * 70} y2={145 - (value - 7) * 70} stroke="#e9eaf1" /><text x="16" y={149 - (value - 7) * 70} fill="#8b8e9d" fontSize="11">{value}</text></g>)}
      <polyline points={points.map(p => `${p.px},${p.py}`).join(' ')} fill="none" stroke="#6861d8" strokeWidth="3" />
      {points.map(p => <g key={p.source_ref} role="button" tabIndex={0} aria-label={`View evidence for ${p.value} percent on ${p.date}`} onClick={() => onEvidence(p.source_ref)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEvidence(p.source_ref); } }}><circle cx={p.px} cy={p.py} r="14" fill="transparent" /><circle cx={p.px} cy={p.py} r="5" fill="#6861d8" stroke="white" strokeWidth="2" /><text x={p.px} y={p.py - 16} textAnchor="middle" fill="#494275" fontWeight="600" fontSize="12">{p.value}%</text><text x={p.px} y="179" textAnchor="middle" fill="#747887" fontSize="11">{p.date.slice(0, 6)}</text></g>)}
    </svg><p>{chart.change}</p><small>{chart.limitations[0]}</small></div>
    <div className={s.trendSources}>{chart.points.map(point => <span key={point.source_ref}>{point.date} <Citation sourceRef={point.source_ref} result={result} onEvidence={onEvidence} /></span>)}</div>
  </section>;
}

function PreviewEvidence({ result, selected, onSelect, onClose }) {
  const dialog = useRef(null);
  const entries = useRef({});
  useEffect(() => {
    const origin = document.activeElement;
    const node = dialog.current;
    node.showModal();
    return () => { node.close(); if (origin?.isConnected) origin.focus(); };
  }, []);
  useEffect(() => { entries.current[selected]?.scrollIntoView({ block: 'nearest' }); }, [selected]);
  return createPortal(<dialog ref={dialog} className={s.drawer} aria-labelledby="velor-evidence-title" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onKeyDown={event => event.stopPropagation()} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className={s.drawerInner}><header className={s.drawerHead}><FileText size={21} /><div><h2 id="velor-evidence-title">Evidence</h2><small>{result.evidence.length} supporting records</small></div><button autoFocus className={s.iconButton} aria-label="Close evidence" onClick={onClose}><X size={20} /></button></header>
      <div className={s.drawerContext}><strong>{DEMO_PATIENT}</strong><span className={s.fictional}>Fictional patient</span><p>Source records for “{result.ui.elements.card.props.title}”</p><SyncStamp /></div>
      <nav className={s.evidenceNav} aria-label="Evidence citations">{result.evidence.map((row, index) => <button key={row.id} aria-label={`Show evidence ${index + 1}`} aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}>[{index + 1}]</button>)}</nav>
      <div className={s.evidenceScroll}>{result.evidence.map((row, index) => {
        const active = selected === row.id;
        const chars = Array.from(row.text);
        const [start, end] = row.highlights[0];
        return <article ref={el => { entries.current[row.id] = el; }} key={row.id} className={`${s.sourceCard} ${active ? s.sourceActive : ''}`}>
          <button className={s.sourceHeading} onClick={() => onSelect(row.id)}><span className={s.citation}>[{index + 1}]</span><strong>{row.title}</strong>{active && <span className={s.selected}>Selected</span>}</button>
          <div className={s.sourceMeta}><time>{row.eventDate}</time><span>Visit {row.visitOrdinal} of {row.visitTotal}</span></div>
          <p className={s.clinician}>{row.departmentName} · {row.doctorName}</p>
          <div className={s.sourceText}>{chars.slice(0, start).join('')}<mark>{chars.slice(start, end).join('')}</mark>{chars.slice(end).join('')}</div>
          <div className={s.chips}>{row.chips.map(chip => <span key={chip.label}>{chip.label}: <strong>{chip.value}</strong></span>)}</div>
          <details className={s.provenance}><summary>Record details</summary><dl><dt>Source ID</dt><dd>{row.source_ref}</dd><dt>Record type</dt><dd>{row.code}</dd><dt>Visit ID</dt><dd>{row.caseId}</dd><dt>Source table</dt><dd>{row.tableName}</dd></dl></details>
        </article>;
      })}</div><footer className={s.drawerFoot}>Highlighted text is the cited passage in this sample source.</footer>
    </div>
  </dialog>, document.body);
}
