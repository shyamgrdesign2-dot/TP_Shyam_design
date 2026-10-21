import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, Bar, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataTable, SegmentedControl } from '@dhspl-tatvacare/tesseract-ui';
import { RecordedSbarBody } from '../../components/dr-copilot/cards/summary/RecordedSbarBody';
import { ChartAnswerCard, Citation } from '../../components/dr-copilot/cards/clinical/ChartAnswerCard';
import { EvidenceViewerProvider, useEvidenceViewer } from '../../components/dr-copilot/surfaces/EvidenceViewerContext';
import EvidencePanel from '../../components/dr-copilot/surfaces/EvidencePanel';
import { CopilotIcon } from '../../components/dr-copilot/ui/CopilotIcon';
import { REVIEW_EXAMPLES, REVIEW_SERIES, REVIEW_SOURCES, REVIEW_VISITS, REVIEW_MEDICATIONS, summaryRecordSet } from './patientResponseV0Fixtures';
import { compactVisitSummary } from './compactSummaryFixtures';
import '../../components/dr-copilot/ui/tokens.css';
import '../../components/dr-copilot/ui/copilot.css';
import { prescriptionEnd, prescriptionStatus, todayInIndia } from './prescriptionWindow';
import styles from './PatientResponseV0.module.css';

const displayDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const shortDate = date => {
  const parsed = new Date(`${date}T00:00:00Z`);
  return `${parsed.getUTCDate()} ${parsed.toLocaleDateString('en-GB', {month:'short',timeZone:'UTC'})} ’${String(parsed.getUTCFullYear()).slice(-2)}`;
};

function Summary({ cite, data }) {
  return <RecordedSbarBody data={data} renderCitation={cite} />;
}

function RecordTable({ label, columns, rows, showCaption = true }) {
  return <section className={styles.recordTable} aria-label={label}>
    {showCaption && <p className={styles.tableCaption}>{label}</p>}
    <DataTable columns={columns} data={rows} rowHeight="sm" zebra hoverable={false} />
  </section>;
}

function ViewControl({ value, onChange, options, label }) {
  return <SegmentedControl size="sm" theme="neutral" variant="pill" value={value}
    onValueChange={onChange} options={options} aria-label={label} />;
}

const SUMMARY_RULES = [
  { title:'Situation', trigger:'Patient overview / pre-consultation briefing', source:'Verified demographics; current encounter symptom collector first, otherwise latest visit symptoms; recorded conditions, recent diagnoses, ongoing medicine statements, eligible Rx courses and allergies.', fields:'summary_json_doctor.symptoms → name, duration, severity, notes; diagnosis → name/status; medical_history → title, note, medication', format:'A brief narrative assembled in a fixed clinical order, with no fixed line count. Bold names of conditions and medicines; regular connecting words. Allergies belong in the sentence. Reserve end-of-Situation tags for important conditions such as cancer/HIV or source-critical findings.', missing:'Omit absent facts. Keep patient-reported symptoms distinct from clinician-confirmed findings, and historical symptoms dated. No appointment-reason filler or invented current use.' },
  { title:'Background', trigger:'Patient overview; focused medical-history request', source:'Medical conditions, family history, lifestyle, surgery, additional/specialty history. Ongoing medication statements first; otherwise reconciled Rx courses covering the review date.', fields:'medical_history[] → tmmhs_id, tags[].title/since/status/relationship/date/note/medication, tmpmh_remarks', format:'Chronic: … | Family: … | Lifestyle: … | Surgical: … | Current medications: … . All rows flow inline with neutral dividers. Primary facts are darker/medium; bracketed details and labels are lighter.', missing:'Unknown history creates no row. Do not turn an old medicine mention into current use or append full prescription history.' },
  { title:'Assessment', trigger:'Patient overview with recorded observations', source:'Latest valid vitals and latest lab result per analyte. Preserve measurement event, value, units, source reference intervals and supplied flags.', fields:'vitals → recorded_at/value/unit/source_ref; lab_result → test/value/unit/reference/flag/result_time/source_ref', format:'Latest vitals (22 Sep ’26) is a bullet row with inline BP/pulse and one common source citation at the label. All inline field labels use the same subtle, lighter style; wrapped measurements remain in the same bullet. Latest key labs keeps dates in evidence. Values are medium/dark; source high/low flags use bold arrows.', missing:'Omit empty groups; do not zero-fill values, invent thresholds or generate clinical interpretation. Separate vital groups if their dates differ.' },
  { title:'Last Visit', trigger:'Fourth section of Patient overview when a completed visit exists; full Visit summary and timeline expansion are separate detailed views', source:'Latest completed selected encounter, joined by case/visit ID. Its symptoms, recorded diagnoses and prescription—not a planned follow-up.', fields:'prescriptionData → symptoms, diagnosis, medications/medicine; event_date/caseId; full view also examination, investigations, advice and notes', format:'Short recap with the date inside the Last Visit tag (22 Sep ’26), followed by SX | DX | RX only and one shared citation at the end opening the visit source. Names/values are medium and dark; duration, severity, timing and other brackets lighter. Full Visit summary preserves every source-written instruction, quantity and note in prescription order.', missing:'No completed visit means no Last Visit section. Omit absent SX/DX/RX, never copy from another visit or generate a recommendation.' },
];

// Proposed normalized composition contract; adapters must verify their source fields.
const SUMMARY_COMPOSITION = {
  Situation: {
    template: '{demographics} with {relevant_conditions}. {current_symptoms}. {recent_visit_change}. {medication_context}. {relevant_history_context}. {allergy_context}.',
    params: [
      ['demographics', 'Verified age + recorded gender; name optional. Omit missing parts; never infer gender from the name.'],
      ['relevant_conditions', 'Active/relevant chronic conditions with recorded status. Preserve suspected, historical or remission qualifiers.'],
      ['current_symptoms', 'Prefer current-encounter symptoms, attributed to their source. If absent, use dated prior symptoms only when relevant.'],
      ['recent_visit_change', 'An informative diagnosis/status change from the latest completed visit; include alongside current symptoms when both matter.'],
      ['medication_context', 'Explicit ongoing-use statement first, otherwise a reconciled prescription course covering the review date. Name medicines and preserve the evidence basis.'],
      ['relevant_history_context', 'Only history that changes interpretation: relevant surgery, pregnancy, lifestyle, functional needs, or documented critical findings/conflicts.'],
      ['allergy_context', 'Recorded allergen + reaction/severity. Explicit “no known allergies” may be stated; a missing allergy record adds no clause.'],
    ],
    logic: [
      'Validate patient, encounter, source, event date and record status before composing. Do not treat a future appointment or copied old symptom as current.',
      'Assemble available clauses in this order. Add recent-visit context only when informative; the existence of a visit alone does not need a sentence. Current symptoms and material recent changes can both be included.',
      'Use “reports taking” for patient-reported use, “ongoing treatment documented” for a clinician statement, and “medication record lists” for a valid prescription. A dated prescription never proves ingestion.',
      'Deduplicate repeated diagnoses/medicines. Keep safety-relevant reaction, source-critical finding or material conflict visible even when the narrative grows. Never invent severity from a disease name.',
      'Omit empty clauses, then repair grammar and punctuation. Preserve source uncertainty, negation and time context. No fixed five-line limit, CSS clamp, filler or generated recommendation.',
    ],
    example: '45-year-old man with type 2 diabetes and hypertension. At the 22 Sep visit, he reported mild fatigue for three days, without fever. He reports ongoing use of metformin. A sulfonamide allergy with rash is recorded.',
  },
  Background: {
    template: 'Chronic: {conditions_with_status} | Family: {condition + relationship} | Lifestyle: {factor + relevant_detail} | Surgical: {procedure + year} | Other history: {relevant_specialty_history} | Ongoing medications: {documented_medicines}',
    params: [
      ['history_domains', 'Enabled, non-negated condition/family/lifestyle/surgical/additional/specialty facts; retain duration, relationship, laterality and meaningful dates in brackets.'],
      ['documented_medicines', 'Use reconciled ongoing statements or eligible courses; retain source and basis internally. Label prescription-derived rows “Current medications”.'],
    ],
    logic: ['Render only populated categories with the same inline field-label component and text dividers. No empty separators.', 'Allergy context stays in Situation for the overview; a focused Medical history answer can include allergies. Do not repeat the entire prescription history.'],
    example: 'Chronic: Type 2 diabetes (7 years), hypertension (5 years) | Family: Diabetes (father) | Lifestyle: Former smoker (stopped 2020).',
  },
  Assessment: {
    template: '• Latest vitals ({short_event_date}) {shared_citations}: {name}: {value} {unit} | …\n• Latest key labs: {analyte}: {source_flag} {value} {unit} {citations} | …',
    params: [
      ['vital_groups', 'Latest valid measurement events, grouped by date/context and deduplicated source references. BP pairs must belong to the same event.'],
      ['latest_key_labs', 'Latest valid result per analyte; prioritize supplied abnormal/critical flags and relevant monitoring results. Preserve actual timestamps/ranges in evidence.'],
    ],
    logic: ['Keep values inline under each bullet; use the same subtle field labels as Background. Different measurement dates need separate accurately dated groups.', 'Do not replace a newer normal result with an older abnormal one. Do not invent thresholds or diagnoses. Source flags use bold arrows; no flag means no invented arrow.', 'Omit empty groups. This section reports observations, not a new clinician assessment. Material source-critical results also stay visible in Situation.'],
    example: 'Latest vitals (22 Sep ’26) [1]: BP: 136/84 mmHg | Pulse: 78 bpm | Weight: 75 kg. Latest key labs: HbA1c: 7.4% [2].',
  },
  'Last Visit': {
    template: 'Last Visit · {short_visit_date}\nSX: {symptoms + short_details} | DX: {recorded_diagnoses} | RX: {medicine + strength + short_instructions} {shared_visit_citation}',
    params: [['completed_visit', 'Most recent completed encounter, identified by visit/case ID and event date. All SX, DX and RX facts must belong to that encounter.']],
    logic: ['Place the short date inside the main section tag. Render only available SX/DX/RX categories; one citation at the end when they share one source.', 'Preserve separate references if the encounter uses multiple source documents. Never merge another visit’s facts to fill gaps.', 'This is a compact recap; the expanded Visit summary retains the complete original prescription, investigations, examination, notes and written instructions.'],
    example: 'Last Visit · 22 Sep ’26 — SX: Fatigue (mild; 3 days) | DX: Type 2 diabetes | RX: Metformin 500 mg (twice daily; after meals; 30 days) [1].',
  },
};

function CompositionDefinition({ title }) {
  const definition = SUMMARY_COMPOSITION[title];
  return <div className={styles.compositionDefinition}>
    <h4>Parameter-based composition</h4>
    <pre className={styles.sentenceTemplate}>{definition.template}</pre>
    <dl className={styles.parameterList}>{definition.params.map(([name, meaning]) => <div key={name}><dt><code>{name}</code></dt><dd>{meaning}</dd></div>)}</dl>
    <h4>Selection & sentence logic</h4>
    <ol>{definition.logic.map(step => <li key={step}>{step}</li>)}</ol>
    <p className={styles.compositionExample}><strong>Illustrative output · only when supported by the input</strong>{definition.example}</p>
  </div>;
}

const TREND_VARIANTS = {
  vital:[{ value:'all', label:'All vitals', title:'Vital trends', question:'Show me this patient’s vital trends.' },
    { value:'bp', label:'BP', title:'Blood pressure trend', question:'Show the blood pressure trend.' },
    { value:'systolic', label:'Systolic BP', title:'Systolic BP trend', question:'Show the systolic BP trend.' },
    { value:'diastolic', label:'Diastolic BP', title:'Diastolic BP trend', question:'Show the diastolic BP trend.' },
    { value:'weight', label:'Weight', title:'Weight trend', question:'Show the weight trend.' }],
  lab:[{ value:'all', label:'All labs', title:'Lab trends', question:'Show me this patient’s lab trends.' },
    { value:'hba1c', label:'HbA1c', title:'HbA1c trend', question:'How has this patient’s HbA1c changed?' },
    { value:'creatinine', label:'Creatinine', title:'Creatinine trend', question:'Show the creatinine trend.' }],
};
function Trend({ kind, cite, scope = 'all' }) {
  const raw = REVIEW_SERIES[kind];
  const bp = kind === 'vital' ? { id:'bp', name:'Blood pressure', unit:'mmHg', points:raw[0].points.flatMap(point=>{ const paired=raw[1].points.find(item=>item.date===point.date && item.sourceId===point.sourceId); return paired ? [{...point, systolic:point.value, diastolic:paired.value}] : []; }) } : null;
  const options = bp ? [bp,...raw.filter(item => !['systolic','diastolic'].includes(item.id))] : raw;
  const series = scope === 'all' ? options : [...options,...raw].filter((item,index,items)=>item.id===scope && items.findIndex(other=>other.id===item.id)===index);
  return <div className={styles.trendStack}>{series.map(current => <TrendMetric key={current.id} current={current} cite={cite} />)}</div>;
}

function describeChange(change, unit) {
  if (change === 0) return 'unchanged';
  const displayUnit = unit === '%' ? (Math.abs(change) === 1 ? 'percentage point' : 'percentage points') : unit;
  return `${Math.abs(change)} ${displayUnit} ${change < 0 ? 'lower' : 'higher'}`;
}

function TrendMetric({ current, cite }) {
  const [view, setView] = useState('graph');
  const [chartType, setChartType] = useState('line');
  const points = current.points.filter(point => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.date)));
  const combinedBP = current.id === 'bp';
  const first = points[0];
  const last = points[points.length - 1];
  const change = first && last ? Number((last.value - first.value).toFixed(2)) : 0;
  return <section className={styles.trendSection} aria-label={`${current.name} trend`}>
    <h3 className={styles.trendHeading}>{current.name}</h3>
    {!points.length ? <p className={styles.empty}>No {current.name} readings are available in this example. A trend cannot be shown.</p> : <>
      {points.length > 1 && <p className={styles.metricSentence}>{combinedBP
        ? <>Systolic is <strong>{describeChange(Number((last.systolic-first.systolic).toFixed(2)), current.unit)}</strong>; diastolic is <strong>{describeChange(Number((last.diastolic-first.diastolic).toFixed(2)), current.unit)}</strong></>
        : <>{current.name} is <strong>{describeChange(change, current.unit)}</strong></>} from the first to the last reading. {[...new Set([first.sourceId,last.sourceId])].map(cite)}
      </p>}
      {points.length < 2 ? <p className={styles.note}>Only one dated reading is available. At least two comparable readings are needed to show a trend.</p> : <>
        <div className={styles.chartControls}>
          <ViewControl value={view} onChange={setView} label={`${current.name} display`} options={[{ value: 'graph', label: 'Graph' }, { value: 'table', label: 'Data table' }]} />
          {view === 'graph' && <ViewControl value={chartType} onChange={setChartType} label={`${current.name} chart type`} options={[{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }]} />}
        </div>
        {view === 'graph' ? <div className={styles.chartFrame}><div className={styles.chartLegend}><span className={styles.chartUnit}>{current.unit}</span>{combinedBP && <><span><i className={styles.systolicKey} />Systolic</span><span><i className={styles.diastolicKey} style={{borderTopStyle:chartType === 'line' ? 'dashed' : 'solid'}} />Diastolic</span></>}</div><div className={styles.chart} role="img" aria-label={`${current.name} ${chartType} chart. ${points.length} observations. Use Data table for every value and source.`}>
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={points.map((point) => ({ ...point, timestamp: Date.parse(point.date) }))} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--tp-slate-200)" strokeDasharray="2 5" vertical={false} strokeOpacity={0.7} />
            <XAxis type="number" dataKey="timestamp" domain={['dataMin', 'dataMax']} padding={{ left: 12, right: 12 }} ticks={points.map((point) => Date.parse(point.date))} tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} tick={{ fontSize: 12, fill: 'var(--tp-slate-500)' }} tickLine={false} axisLine={{ stroke: 'var(--tp-slate-200)' }} />
            <YAxis tickCount={combinedBP ? 5 : 4} padding={{top:12,bottom:8}} domain={chartType === 'bar' ? [0, 'auto'] : ['auto', 'auto']} tick={{ fontSize: 12, fill: 'var(--tp-slate-500)' }} tickLine={false} axisLine={false} width={42} />
            <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' })} formatter={(value, name) => [`${value} ${current.unit}`, name]} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--tp-slate-200)', color: 'var(--tp-slate-700)' }} />
            {(combinedBP ? ['systolic','diastolic'] : ['value']).map((key,index) => chartType === 'line'
              ? <Line key={key} name={combinedBP ? `${key === 'systolic' ? 'Systolic' : 'Diastolic'} BP` : current.name} type="linear" dataKey={key} stroke={index ? 'var(--tp-violet-500)' : 'var(--tp-blue-500)'} strokeDasharray={index ? '5 3' : undefined} strokeWidth={2.5} activeDot={{ r:5, strokeWidth:2 }} dot={{ r:3.5, fill:'var(--tp-slate-0)', strokeWidth:1.5 }} isAnimationActive={false} connectNulls={false} />
              : <Bar key={key} name={combinedBP ? `${key === 'systolic' ? 'Systolic' : 'Diastolic'} BP` : current.name} dataKey={key} fill={index ? 'var(--tp-violet-500)' : 'var(--tp-blue-500)'} radius={[3,3,0,0]} maxBarSize={24} isAnimationActive={false} />)}
          </ComposedChart></ResponsiveContainer>
        </div></div> : <RecordTable label={`${current.name}: every recorded observation`} columns={[
          { id: 'date', header: 'Date', cell: (row) => displayDate(row.date) },
          ...(combinedBP ? [{ id:'systolic', header:'Systolic (mmHg)', align:'right' }, { id:'diastolic', header:'Diastolic (mmHg)', align:'right' }] : [{ id:'value', header:`${current.name} (${current.unit})`, align:'right' }]),
          { id: 'source', header: 'Source', cell: (row) => cite(row.sourceId), width: 80 },
        ]} rows={points.map((point) => ({ ...point, id: point.date }))} />}
      </>}
    </>}
  </section>;
}

function Labs() {
  const rows = [
    { id:'hba1c', name:'HbA1c', value:'7.4%', range:'4.0–5.6%', flagged:true },
    { id:'creatinine', name:'Creatinine', value:'1.0 mg/dL', range:'0.7–1.3 mg/dL' },
    { id:'haemoglobin', name:'Haemoglobin', value:'14.0 g/dL', range:'13.0–17.0 g/dL' },
  ];
  return <><RecordTable showCaption={false} label="Lab records" rows={rows} columns={[
    { id:'name', header:'Parameter' },
    { id:'value', header:'Result', cell:row=><span className={styles.value}>{row.value}</span> },
  ]} /></>;
}

function VitalRecords() {
  return <RecordTable showCaption={false} label="Vital records" rows={REVIEW_VISITS} columns={[
    { id:'date', header:'Recorded date', cell:row=>displayDate(row.date) },
    { id:'bp', header:'Blood pressure' },
    { id:'weight', header:'Weight' },
  ]} />;
}

function Prescriptions({ history = false, setVisibleSources }) {
  const asOf = todayInIndia();
  const rows = REVIEW_MEDICATIONS.filter(record => history || prescriptionStatus(record, asOf) === 'in-date').slice().reverse();
  const sourceKey = [...new Set(rows.map(row => row.sourceId))].join(',');
  useEffect(() => { setVisibleSources(sourceKey ? sourceKey.split(',') : []); }, [sourceKey, setVisibleSources]);
  return <>
    {rows.length ? <RecordTable showCaption={false} label={history ? 'Medication history' : 'Current medications'} rows={rows} columns={[
      { id: 'name', header: 'Medication', cell: row => <div className={styles.medicationCell}><span className={styles.medicationName}>{row.name}</span>{' '}<span className={styles.medicationDetails}>({[row.dosage, row.frequency, row.timing, row.durationDays ? `${row.durationDays} ${row.durationDays === 1 ? 'day' : 'days'}` : null].filter(Boolean).join(' · ')})</span></div> },
      { id: 'period', header: 'Prescribed period', width:190, cell: row => <span className={styles.medicationDetails}>{shortDate(row.start)} – {shortDate(prescriptionEnd(row))}</span> },
    ]} /> : <p>No prescriptions with documented dates cover today. Review medication history to reconcile current use.</p>}
  </>;
}

function VisitSummary({ visit, cite }) {
  const data = compactVisitSummary({ ...visit, displayDate: displayDate(visit.date) });
  return <RecordedSbarBody data={data} renderCitation={cite} />;
}

function Visits({ cite }) {
  const [selected, setSelected] = useState('visit-sep');
  return <div className={styles.visitHistory}>
    <p className={styles.note}>Four recorded consultations · January–September 2026. Open a visit to review its documented details.</p>
    <ol className={styles.visitList}>{REVIEW_VISITS.map((visit, index) => {
      const open = selected === visit.id;
      const date = new Date(`${visit.date}T00:00:00Z`);
      return <li key={visit.id} className={styles.visitItem} data-selected={open || undefined}>
        <button type="button" className={styles.visitTrigger} aria-expanded={open} aria-controls={`visit-detail-${visit.id}`} onClick={() => setSelected(open ? null : visit.id)}>
          <span className={styles.visitDate}><strong>{date.getUTCDate()}</strong><span>{date.toLocaleDateString('en-GB', { month:'short', year:'numeric', timeZone:'UTC' })}</span></span>
          <span className={styles.visitDescription}><strong>{visit.title}</strong><span>{index === 0 ? 'Latest recorded visit · ' : ''}BP {visit.bp}</span></span>
          <CopilotIcon name={open ? 'chevron-up' : 'chevron-down'} variant="linear" size={14} />
        </button>
        {open && <div id={`visit-detail-${visit.id}`} className={styles.visitDetails}><VisitSummary visit={visit} cite={cite} /></div>}
      </li>;
    })}</ol>
  </div>;
}

const SUMMARY_IDS = ['summary', 'history', 'visit-summary'];

function NoSummary({ example }) {
  const subjects = { summary: 'patient summary', history: 'medical history summary', 'visit-summary': 'visit summary' };
  return <div className={styles.emptyState} role="status">
    <CopilotIcon name="document-text" size={24} />
    <h3>No records available</h3>
    <p>There are no available records to prepare this {subjects[example.id]}. No conclusions can be drawn about conditions, medicines or prior care.</p>
    <p className={styles.note}>A summary can be prepared when relevant records become available.</p>
  </div>;
}

function ReviewCard({ example, availability, trendScope }) {
  const isSummary = SUMMARY_IDS.includes(example.id);
  const recordSet = isSummary ? summaryRecordSet(example.id, availability) : null;
  const availableSources = recordSet ? recordSet.sources : example.sources.map(id => REVIEW_SOURCES.find(source => source.id === id)).filter(Boolean);
  const [visibleSources, setVisibleSources] = useState(example.id === 'labs' ? ['lab-sep'] : availableSources.map(source => source.id));
  const sourceKey = visibleSources.join(',');
  const data = useMemo(() => {
    const sources = isSummary ? summaryRecordSet(example.id, availability).sources : example.sources.map(id => REVIEW_SOURCES.find(source => source.id === id)).filter(Boolean);
    const selectedIds = sourceKey.split(',');
    return {
      markdown: `# ${example.id === 'labs' ? `Latest lab records · ${shortDate(REVIEW_SOURCES.find(source=>source.id==='lab-sep').date)}` : example.id === 'meds' ? `Current medications · ${shortDate(todayInIndia())}` : example.title}`,
      intent: example.id === 'meds' || example.id === 'med-history' ? 'medications' : example.id === 'lab' || example.id === 'labs' ? 'labs' : 'summary',
      cited: sources.filter(source => isSummary || selectedIds.includes(source.id)).map(source => ({
        number: sources.indexOf(source) + 1,
        citation: { event_date: source.date, visit_id: source.resourceKind ? undefined : source.id === 'lab-sep' ? 'visit-sep' : source.id, resource_kind: source.resourceKind || (source.id === 'lab-sep' ? 'Lab record' : 'Consultation'), source_path: source.id },
        evidence: { code: source.title, value_text: source.text, source_key: source.id, source_system: 'Design review fixtures' },
      })),
    };
  }, [example, availability, isSummary, sourceKey]);
  return <ChartAnswerCard data={data} renderBody={({ onCite, activeNumber }) => {
    const cite = sourceId => {
      const number = availableSources.findIndex(source => source.id === sourceId) + 1;
      return number ? <Citation key={sourceId} number={number} onOpen={onCite} active={activeNumber === number} /> : null;
    };
    if (isSummary && availability === 'none') return <NoSummary example={example} />;
    return <>
      {isSummary && availability === 'partial' && <p className={styles.availabilityNote}>Only a limited consultation extract is available. Only documented information is summarized.</p>}
      {isSummary && recordSet.data && <Summary data={recordSet.data} cite={cite} />}
      {example.id === 'visit-summary' && availability === 'full' && <VisitSummary visit={REVIEW_VISITS[0]} cite={cite} />}
      {(example.id === 'vital' || example.id === 'lab') && <Trend key={`${example.id}-${trendScope}`} kind={example.id} cite={cite} scope={trendScope} />}
      {example.id === 'labs' && <Labs />}
      {(example.id === 'meds' || example.id === 'med-history') && <Prescriptions history={example.id === 'med-history'} setVisibleSources={setVisibleSources} />}
      {example.id === 'visits' && <Visits cite={cite} />}
      {example.id === 'vitals' && <VitalRecords />}
    </>;
  }} />;
}

function EvidenceOutlet() {
  const viewer = useEvidenceViewer();
  return viewer.state ? <EvidencePanel {...viewer.state} onSelect={viewer.select} onClose={viewer.close} /> : null;
}

/** Synthetic gallery: the real Velora answer shell and evidence components. */
export default function PatientResponseV0() {
  const [selected, setSelected] = useState('summary');
  const [category, setCategory] = useState('Summary');
  const [availability, setAvailability] = useState('longitudinal');
  const [trendScope,setTrendScope] = useState('all');
  const baseExample = REVIEW_EXAMPLES.find(item => item.id === selected) || REVIEW_EXAMPLES[0];
  const variant = TREND_VARIANTS[selected]?.find(item=>item.value===trendScope);
  const example = variant ? {...baseExample,title:variant.title,question:variant.question} : selected === 'summary' && availability === 'longitudinal' ? {...baseExample, question:'Summarize Arun Mehta before the consultation.'} : baseExample;
  const categories = [{value:'Summary',label:'Summaries and Histories'}, {value:'Data analytics',label:'Trends'}, {value:'Data tables',label:'Data Table'}];
  const sidebarGroups = [{label:null,items:REVIEW_EXAMPLES.filter(item=>item.category===category)}];
  const chooseCategory = value => {
    setCategory(value);
    setTrendScope('all');
    setSelected(REVIEW_EXAMPLES.find(item => item.category === value).id);
    setAvailability(value === 'Summary' ? 'longitudinal' : 'full');
  };
  return <main id="dr-copilot-root" className={`dr-copilot-scope ${styles.page}`}><div className={styles.container}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Velora / patient answers</p><h1>Patient response catalog</h1><p>The same Velora cards and evidence, with focused layouts for each question.</p></div></header>
    <nav className={styles.categoryTabs} aria-label="Response categories">{categories.map(item => <button type="button" key={item.value} aria-current={category === item.value ? 'page' : undefined} onClick={() => chooseCategory(item.value)}>{item.label}</button>)}</nav>
    <div className={styles.layout}>
      <nav className={styles.scenarios} aria-label={`${categories.find(item=>item.value===category)?.label} questions`}>{sidebarGroups.map((group,index)=><div className={styles.scenarioGroup} key={group.label || index}>{group.label && <h2>{group.label}</h2>}{group.items.map(item => <button type="button" key={item.id} aria-current={selected === item.id ? 'true' : undefined} onClick={() => { setSelected(item.id); setAvailability(item.id === 'summary' ? 'longitudinal' : 'full'); setTrendScope(item.id === 'lab' ? 'hba1c' : 'all'); }}>{item.label}</button>)}</div>)}</nav>
      <section className={styles.answer} aria-label="Example conversation">
        {category === 'Summary' && <details className={styles.sourceScenarios}><summary>Intent, data sources & formatting</summary><div className={styles.sectionRules}>
          {SUMMARY_RULES.map((rule,index)=><section key={rule.title}><header><span>{String(index+1).padStart(2,'0')}</span><h3>{rule.title}</h3></header><div className={styles.ruleContent}><p><strong>Intent & trigger</strong>{rule.trigger}</p><p><strong>Data sources</strong>{rule.source}</p><p className={styles.ruleFields}><strong>Field mapping</strong><code>{rule.fields}</code></p><p><strong>Formatting & display</strong>{rule.format}</p><p><strong>When data is missing</strong>{rule.missing}</p><CompositionDefinition title={rule.title} /></div></section>)}
          <p>Clinical basis: <a href="https://hl7.org/fhir/uv/ips/2.0.1/en/Structure-of-the-International-Patient-Summary.html" target="_blank" rel="noreferrer">HL7 International Patient Summary</a> and <a href="https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html" target="_blank" rel="noreferrer">AHRQ SBAR</a>. This is a patient-overview adaptation; the sentence order is a product design choice for clinical review.</p><p>Full developer specification: docs/dr-copilot/SUMMARY-SECTION-CATALOG.md. Synthetic stored-field example: completeConsultationFixture.json.</p>
        </div></details>}
        {SUMMARY_IDS.includes(selected) && <details className={styles.sourceScenarios}><summary>Review source scenarios</summary><div className={styles.previewControls}><ViewControl label="Preview record availability" value={availability} onChange={setAvailability} options={[...(selected === 'summary' ? [{ value:'longitudinal', label:'Arun Mehta · 3 consultations' }] : []),{ value:'full', label:'Consultation with complete results' },{ value:'partial', label:'Limited consultation extract' },{ value:'none', label:'No clinical records' }, ...(selected === 'summary' ? [{ value:'collector', label:'Current symptom collector' },{ value:'attention', label:'Important history & allergy' }] : [])]} /></div></details>}
        {TREND_VARIANTS[selected] && <details className={styles.sourceScenarios}><summary>Review question variants</summary><div className={styles.previewControls}><ViewControl label="Question scope" value={trendScope} onChange={setTrendScope} options={TREND_VARIANTS[selected]} /></div></details>}
        <div className={styles.questionBubble}>{example.question}</div>
        <EvidenceViewerProvider key={`${example.id}-${availability}`}><ReviewCard example={example} availability={availability} trendScope={trendScope} /><EvidenceOutlet /></EvidenceViewerProvider>
      </section>
    </div>
  </div></main>;
}
