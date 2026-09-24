"use client";
import React, { useState } from 'react';
import { EvidenceDrawer } from './EvidenceDrawer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopilotIcon, EvidenceIcon } from './CopilotIcon';
const cdnIcon = name => function Icon(props) { return <CopilotIcon name={name} {...props} />; };
const Activity = cdnIcon('status-up');
import s from './EvidenceCards.module.scss';
import { CardShell } from '../cards/CardShell';

function sourceRecord(result, ref) {
  return result.evidence.find(row => row.id === ref || row.source_ref === ref || row.evidenceId === ref);
}

export function PreviewAnswer({ data }) {
  const [selected, setSelected] = useState(null);
  return <>
    <ClinicalPreviewCard result={data} onEvidence={id => setSelected(sourceRecord(data, id)?.id || data.evidence[0]?.id)} />
    {selected && <EvidenceDrawer result={data} selected={selected} onSelect={setSelected} onClose={() => setSelected(null)} />}
  </>;
}

function Citation({ sourceRef, result, onEvidence }) {
  const row = sourceRecord(result, sourceRef);
  const number = result.evidence.indexOf(row) + 1;
  return number ? <button className={s.citation} aria-label={`View source ${number}`} onClick={() => onEvidence(row.id)}>[{number}]</button> : null;
}

function Narrative({ text, result, onEvidence }) {
  return <div className={s.narrative}><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ href, children }) => {
      if (href?.startsWith('#evidence-')) {
        const ref = href.slice(1);
        return <Citation sourceRef={sourceRecord(result, ref) ? ref : ref.slice(9)} result={result} onEvidence={onEvidence} />;
      }
      return <span>{children}</span>;
    },
    table: ({ children }) => <div className={s.tableWrap}><table>{children}</table></div>,
  }}>{text}</ReactMarkdown></div>;
}

function prescriptionSchedule(fields = []) {
  const slots = ['Morning quantity', 'Afternoon quantity', 'Evening quantity', 'Night quantity'];
  if (fields.some(field => slots.includes(field.label))) return slots.map(label => fields.find(field => field.label === label)?.value ?? '–').join('-');
  return fields.find(field => ['Frequency', 'Slots'].includes(field.label))?.value || 'Not recorded';
}

function ClinicalPreviewCard({ result, onEvidence }) {
  const elements = result.ui.elements;
  const root = elements[result.ui.root];
  const card = (root?.children || []).map(key => elements[key]).find(node => node?.type === 'ClinicalCard');
  if (!card) return <p className={s.narrative}>This sample response has no supported card.</p>;
  const count = result.evidence.length;
  const icons = { medications: 'capsule', labs: 'clipboard-activity', trend: 'status-up', conditions: 'health', advice: 'message-question', summary: 'document-text' };
  const sectionCount = card.children.filter(key => elements[key]?.type !== 'Narrative').length;
  return <CardShell tesseractControls icon={<CopilotIcon name={icons[result.kind] || 'document-text'} size={18} />} title={card.props.title} headerExtra={<button className={s.recordCount} aria-label={`Open evidence: ${count} ${count === 1 ? "record" : "records"}`} onClick={() => onEvidence()}>[{count} {count === 1 ? "record" : "records"}]</button>}>
    <div className={s.cardBody}>{card.children.map(key => {
      const node = elements[key];
      if (!node) return null;
      const { type, props } = node;
      if (type === 'Narrative') return <Narrative key={key} text={props.markdown} result={result} onEvidence={onEvidence} />;
      if (type === 'Trend') return <Trend key={key} chart={props.chart} result={result} onEvidence={onEvidence} />;
      if (!['Prescriptions', 'Measurements'].includes(type)) return null;
      const rx = type === 'Prescriptions';
      return <section key={key}>
        {sectionCount > 1 && <h3 className={s.sectionTitle}><CopilotIcon name={rx ? 'capsule' : 'clipboard-activity'} size={16} />{props.title}</h3>}
        <div className={s.tableWrap} role="region" aria-label={props.title} tabIndex={0}><table>
          <thead><tr>{(rx ? ['Medication / date', 'Dose', 'Schedule', 'Timing', 'Duration', 'Source'] : ['Measurement / date', 'Recorded value', 'Reference', 'Source']).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{props.rows.map(row => <tr key={row.sourceRef}><th scope="row">{rx ? row.name : row.label}<small>{row.date}</small></th>
            <td><strong>{(rx ? row.dose : row.value) || 'Not recorded'}</strong> {row.unit}{!rx && row.flag && <span className={s.flag}>{row.flag}</span>}</td>
            {rx ? <><td className={s.schedule}>{prescriptionSchedule(row.schedule)}</td><td>{row.schedule?.find(field => field.label === 'Timing')?.value || 'Not recorded'}{row.instructions && <small>{row.instructions}</small>}</td><td>{row.duration || 'Not recorded'}</td></> : <td>{row.reference || 'Not recorded'}</td>}
            <td><Citation sourceRef={row.sourceRef} result={result} onEvidence={onEvidence} /></td>
          </tr>)}</tbody>
        </table></div>
      </section>;
    })}<p className={s.limitation}>{result.live ? "Based on indexed test-patient records. Missing information does not confirm absence." : "Fictional records for UI review. Missing information does not confirm absence."}</p></div>
    <div className={s.evidenceBox}>
      <button className={s.evidenceFooter} onClick={() => onEvidence()} aria-haspopup="dialog" aria-label="Open evidence">
        <EvidenceIcon size={18} /><strong>Evidence</strong><span className={s.recordCount}>[{count} {count === 1 ? 'record' : 'records'}]</span>
        <span className={s.disclosure}><CopilotIcon name="arrow-short-right" variant="linear" size={16} /></span>
      </button>
    </div>
  </CardShell>;
}

function Trend({ chart, result, onEvidence }) {
  const observations = chart.points.filter(p => typeof p.y === 'number' && Number.isFinite(p.y));
  if (!observations.length) return <p className={s.limitation}>No numeric observations are available for this chart.</p>;
  const min = Math.floor(Math.min(...observations.map(p => p.y)));
  const max = Math.max(min + 1, Math.ceil(Math.max(...observations.map(p => p.y))));
  const y = value => 145 - (value - min) / (max - min) * 110;
  const points = observations.map((point, i) => ({ ...point, px: 60 + i * 420 / Math.max(1, observations.length - 1), py: y(point.y) }));
  const latest = observations.at(-1);
  return <section><h3 className={s.sectionTitle}><Activity size={16} />{chart.title}</h3><div className={s.trend}>
    <div className={s.trendValue}>{latest.value}<span>{chart.unit}</span><small>Latest · {latest.date}</small></div>
    <svg viewBox="0 0 540 185" role="img" aria-label={`${chart.title}: ${chart.points.map(p => `${p.value} ${chart.unit} on ${p.date}`).join(", ")}`}>
      {[min, (min + max) / 2, max].map(value => <g key={value}><line x1="42" x2="505" y1={y(value)} y2={y(value)} stroke="var(--tp-slate-100)" /><text x="16" y={y(value) + 4} fill="var(--tp-slate-500)" fontSize="11">{value}</text></g>)}
      {chart.segments ? chart.segments.map(([from, to]) => {
        const a = points.find(p => p.source_ref === from), b = points.find(p => p.source_ref === to);
        return a && b ? <line key={`${from}-${to}`} x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke="var(--tp-violet-500)" strokeWidth="3" /> : null;
      }) : <polyline points={points.map(p => `${p.px},${p.py}`).join(' ')} fill="none" stroke="var(--tp-violet-500)" strokeWidth="3" />}
      {points.map(p => <g key={p.source_ref} role="button" tabIndex={0} aria-label={`View evidence for ${p.value} ${chart.unit} on ${p.date}`} onClick={() => onEvidence(p.source_ref)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEvidence(p.source_ref); } }}><circle cx={p.px} cy={p.py} r="14" fill="transparent" /><circle cx={p.px} cy={p.py} r="5" fill="var(--tp-violet-500)" stroke="white" strokeWidth="2" /><text x={p.px} y={p.py - 16} textAnchor="middle" fill="var(--tp-slate-700)" fontWeight="600" fontSize="12">{p.value}{chart.unit}</text><text x={p.px} y="179" textAnchor="middle" fill="var(--tp-slate-500)" fontSize="11">{p.date.slice(0, 6)}</text></g>)}
    </svg><p>{chart.change}</p><small>{chart.limitations?.join(" ")}</small></div>
    <div className={s.trendSources}>{chart.points.map(point => <span key={point.source_ref}>{point.date} <Citation sourceRef={point.source_ref} result={result} onEvidence={onEvidence} /></span>)}</div>
  </section>;
}
