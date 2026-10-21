import React from 'react';
import { Badge, SectionCard, TPMedicalIcon } from '@dhspl-tatvacare/tesseract-ui';
import { CopilotIcon } from '../../ui/CopilotIcon';
import styles from './RecordedSbarBody.module.css';

const iconNames = { HeartRate: 'Heart Rate', stethoscope: 'stethoscope', 'clipboard-activity': 'Lab' };

function EmphasizedText({ text, terms = [] }) {
  const selected = [...new Set(terms.filter(term => typeof term === 'string' && term.length))].sort((a,b) => b.length-a.length);
  if (!selected.length) return text;
  const pattern = new RegExp(`(${selected.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return text.split(pattern).map((part,index) => selected.includes(part)
    ? <strong key={index} className={styles.emphasis}>{part}</strong> : part);
}

/** Source-resolved values only. Never parse prose into diagnoses, flags or medication names. */
function InlineFieldTag({ children }) {
  return <span className={styles.inlineTag}>{children}</span>;
}

function SummaryValue({ item, renderCitation, categoryLabel = false }) {
  const flagged = ['high', 'low', 'critical'].includes(item.flag);
  return <span className={styles.valueGroup}>
    {item.label && <>{categoryLabel ? <InlineFieldTag>{item.label}:</InlineFieldTag> : <span className={styles.label}>{item.label}:</span>}{' '}</>}
    <span className={flagged ? styles.flagged : item.id === 'situation' ? styles.narrative : styles.value}>
      {flagged && <><CopilotIcon name="arrow-down2" size={20} variant="bold" style={item.flag === 'low' ? undefined : { transform: 'rotate(180deg)' }} /><span className={styles.srOnly}>{item.flag === 'critical' ? 'Source marked critical: ' : item.flag === 'low' ? 'Source marked low: ' : 'Source marked high: '}</span></>}
      <EmphasizedText text={item.text} terms={item.emphasis || (item.emphasisPrefix ? [item.emphasisPrefix] : [])} />
    </span>
    {item.detail && <span className={styles.detail}> ({item.detail})</span>}
    {item.date && <span className={styles.detail}> · {item.date}</span>}
    {(item.sources || []).map(renderCitation)}
  </span>;
}

function Section({ section, renderCitation }) {
  const endSources = section.id === 'last-visit' ? [...new Set((section.items || []).flatMap(item => (item.values || [item]).flatMap(value => value.sources || [])))] : [];
  return <SectionCard aria-label={section.label}
    title={<span className={styles.sectionTag}><TPMedicalIcon name={iconNames[section.icon] || section.icon || 'medical-record'} variant="bulk" size={15} color="var(--tp-slate-600)" />{section.label}{section.id === 'last-visit' && section.date && <span className={styles.tagDate}>· {section.date}</span>}</span>}
    headerActions={section.date && section.id !== 'last-visit' ? <span className={styles.sectionDate}>{section.date}</span> : undefined}
    headerFill="none" bordered={false} divided={false} padding={0} radius={4} className={styles.section}>
    <Rows items={section.items || []} inline={['history','background','last-visit'].includes(section.id)} renderCitation={endSources.length ? () => null : renderCitation} trailingContent={endSources.map(renderCitation)} />
    {section.attention?.length > 0 && <div className={styles.situationTags} aria-label="Highlighted patient context">
      {section.attention.map(item => <Badge key={item.id} size="sm" radius={4} variant="soft"
        color={item.priority === 'critical' ? 'error' : ['severe-reaction','conflict'].includes(item.priority) ? 'warning' : 'neutral'}
        className={styles.contextTag}>
        <SummaryValue item={item} renderCitation={renderCitation} />
      </Badge>)}
    </div>}
    {section.groups?.some(group => group.items.length > 0) && <ul className={styles.subsections}>{section.groups.filter(group => group.items.length).map(group => {
      const sharedSources = group.id === 'vitals' ? [...new Set(group.items.flatMap(item => (item.values || [item]).flatMap(value => value.sources || [])))] : [];
      return <li className={styles.subsection} key={group.id}>
        <div className={styles.subheading}><h4><InlineFieldTag>{group.label}{group.date && <span className={styles.tagDate}> ({group.date})</span>}:</InlineFieldTag>{sharedSources.map(renderCitation)}</h4></div>
        <Rows items={group.items} renderCitation={sharedSources.length ? () => null : renderCitation} />
      </li>;
    })}</ul>}
  </SectionCard>;
}

function Rows({ items, renderCitation, inline = false, trailingContent }) {
  if (!items.length) return null;
  return (<div className={`${styles.rows} ${inline ? styles.inlineRows : ''}`}>{items.map((item,index) => <div key={item.id} className={styles.row}>
      {inline && index > 0 && <span aria-hidden="true" className={styles.divider}> | </span>}
      {item.values ? <>{item.label && <>{inline ? <InlineFieldTag>{item.label}:</InlineFieldTag> : <span className={styles.label}>{item.label}:</span>}{' '}</>}{item.values.map((value, index) => <React.Fragment key={value.id || index}>
        {index > 0 && <span aria-hidden="true" className={item.separator === 'comma' ? styles.comma : styles.divider}>{item.separator === 'comma' ? ', ' : ' | '}</span>}
        <SummaryValue item={value} renderCitation={renderCitation} />
      </React.Fragment>)}</> : <SummaryValue item={item} renderCitation={renderCitation} categoryLabel={inline} />}
    </div>)}{trailingContent}</div>);
}

/** Shared compact summary body, composed with Tesseract SectionCard/Alert and icons. */
export function RecordedSbarBody({ data, renderCitation }) {
  const sections = data.situation || data.attention?.length ? [{ id: 'situation', label: 'Situation', icon: 'medical-report', items: data.situation ? [{ id: 'situation', ...data.situation }] : [], attention:data.attention }, ...data.sections] : data.sections;
  return <div className={styles.body}>
    {data.intro && <p className={styles.intro}>{data.intro.text} {(data.intro.sources || []).map(renderCitation)}</p>}
    {sections.filter(section => section.items?.length || section.attention?.length || section.groups?.some(group => group.items.length)).map(section => <Section key={section.id} section={section} renderCitation={renderCitation} />)}
  </div>;
}
