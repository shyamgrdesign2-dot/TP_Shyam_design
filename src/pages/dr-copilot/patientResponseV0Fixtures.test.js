import { compactVisitSummary } from './compactSummaryFixtures';
import { summaryRecordSet, REVIEW_EXAMPLES, REVIEW_VISITS, REVIEW_SOURCES } from './patientResponseV0Fixtures';
const summaryIds = ['summary', 'history', 'visit-summary'];
test.each(summaryIds)('%s handles full, partial and empty source sets without leaking complete records', id => {
  const full = summaryRecordSet(id, 'full');
  expect(full.sources.length).toBeGreaterThan(0);
  const partial = summaryRecordSet(id, 'partial');
  expect(partial.sources.map(source => source.id)).toEqual(['partial-visit']);
  const items = partial.data.sections.flatMap(section => section.items);
  if (partial.data.situation) items.push(partial.data.situation);
  if (partial.data.intro) items.push(partial.data.intro);
  items.forEach(item => {
    expect(item.sources).toEqual(['partial-visit']);
    expect(item.text).not.toMatch(/7\.4|hypertension|amlodipine|136\/84/i);
  });
  expect(summaryRecordSet(id, 'none')).toEqual({ data: null, sources: [] });
});
test('catalog separates summaries, trends and record tables without obsolete cards', () => {
  const ids = category => REVIEW_EXAMPLES.filter(item=>item.category===category).map(item=>item.id).sort();
  expect(ids('Summary')).toEqual(['history','summary','visit-summary','visits']);
  expect(ids('Data analytics')).toEqual(['lab','vital']);
  expect(ids('Data tables')).toEqual(['labs','med-history','meds','vitals']);
  expect(REVIEW_EXAMPLES).toHaveLength(10);
});

test.each(summaryIds)('%s excludes recommendations and future plans from the summary body', id => {
  ['full', 'partial'].forEach(availability => {
    const text = JSON.stringify(summaryRecordSet(id, availability).data || {});
    expect(text).not.toMatch(/repeat HbA1c|recorded plan|recommendation|assessment & plan/i);
  });
});

function collectFacts(data) {
  return [data.intro, data.situation, ...(data.attention || []), ...data.sections.flatMap(section => [...section.items, ...(section.groups || []).flatMap(group => group.items)].flatMap(item => item.values || [item]))].filter(Boolean);
}
test('every compact clinical fact resolves to a source in its own scenario', () => {
  for (const id of summaryIds.filter(id => id !== 'visit-summary')) {
    for (const availability of ['full', 'partial', ...(id === 'summary' ? ['attention', 'longitudinal'] : [])]) {
      const result = summaryRecordSet(id, availability);
      const ids = result.sources.map(source => source.id);
      collectFacts(result.data).forEach(fact => {
        expect(fact.sources.length).toBeGreaterThan(0);
        fact.sources.forEach(source => expect(ids).toContain(source));
      });
    }
  }
});
test('important history case is isolated; cancer and HIV do not become emergency flags', () => {
  const { data, sources } = summaryRecordSet('summary', 'attention');
  expect(sources.map(source => source.id)).toEqual(['attention-history', 'attention-allergy']);
  expect(data.attention.filter(item => item.priority === 'important').map(item => item.id)).toEqual(['cancer', 'hiv']);
  expect(data.attention.some(item => item.id === 'reaction')).toBe(false);
  expect(data.situation.text).toContain('penicillin allergy with anaphylaxis');
  expect(JSON.stringify(summaryRecordSet('summary', 'full'))).not.toMatch(/cancer|anaphylaxis|HIV/);
  expect(JSON.stringify(data)).toContain('remission');
});

test('visit summaries retain exact source wording and omit unavailable prescription sections', () => {
  REVIEW_VISITS.forEach(visit => {
    const body = compactVisitSummary(visit);
    expect(body.sections.some(section => section.label === 'Visit context')).toBe(false);
    const source = REVIEW_SOURCES.find(source => source.id === visit.id).text;
    body.sections.flatMap(section => section.items).forEach(item => expect(source).toContain(item.text));
    expect(body.sections.flatMap(section => section.items).map(item => item.text)).toEqual(Object.values(visit.writtenSections).flat());
  });
});
test('unified overview has one assessment with plain dated observation groups', () => {
  const { data } = summaryRecordSet('summary','full');
  expect(data.situation.text).toMatch(/^45-year-old/);
  expect(data.sections.map(section => section.label)).toEqual(['Background','Assessment','Last Visit']);
  expect(data.sections[1].groups.map(group => group.label)).toEqual(['Latest vitals','Latest key labs']);
});

test('overview prefers ongoing history and adds eligible prescription context without claiming use', () => {
  const during = summaryRecordSet('summary','full','2026-10-19').data;
  expect(during.situation.text).toContain('He reports taking Metformin 500 mg.');
  expect(during.situation.text).toContain('His medication record lists Amlodipine 5 mg.');
  const ongoing = during.sections[0].items.find(item => item.label === 'Ongoing medications');
  const current = during.sections[0].items.find(item => item.label === 'Current medications');
  expect(ongoing.values[0].sources).toEqual(['medical-history']);
  expect(current.values.map(item => item.text)).toEqual(['Amlodipine 5 mg']);
  expect(current.values[0].sources).toEqual(['visit-sep']);
  const expired = summaryRecordSet('summary','full','2026-10-22').data;
  expect(expired.situation.text).not.toContain('Amlodipine');
  expect(expired.situation.text).toContain('He reports taking Metformin');
  expect(expired.sections[0].items.some(item => item.label === 'Current medications')).toBe(false);
  expect(JSON.stringify(summaryRecordSet('history','full','2026-10-19').data)).not.toContain('Amlodipine');
});
test('comprehensive case covers stored history domains and every doctor-written prescription section', () => {
  const result = summaryRecordSet('summary','full','2026-10-19');
  expect(result.data.sections[0].items.map(item=>item.label)).toEqual(['Chronic','Family','Lifestyle','Surgical','Additional','Ongoing medications','Current medications']);
  expect(result.data.sections[1].groups[0].items[0].values).toHaveLength(6);
  expect(compactVisitSummary(REVIEW_VISITS[0]).sections.map(item=>item.label)).toEqual(['Symptoms','Diagnosis','Medication','Vitals','Examination','Lab investigations','Additional notes']);
  expect(result.sources.map(item=>item.id).sort()).toEqual(['lab-sep','medical-history','patient-profile','visit-sep']);
});

test('current symptom collector takes precedence over dated visit symptoms without changing visit history', () => {
  const current = summaryRecordSet('summary','collector','2026-10-19');
  expect(current.data.situation.text).toContain('At intake');
  expect(current.data.situation.text).toContain('intermittent dizziness');
  expect(current.data.situation.text).not.toContain('mild fatigue');
  expect(current.data.situation.sources).toContain('symptom-collector');
  expect(current.data.sections.find(section=>section.id==='last-visit').items[0].values[0].text).toContain('Fatigue');
  const otherDate = summaryRecordSet('summary','collector','2026-10-20');
  expect(otherDate.data.situation.text).not.toContain('At intake');
  expect(otherDate.sources.map(source=>source.id)).not.toContain('symptom-collector');
});
test('allergy context stays in prose and the short last visit contains only SX DX RX', () => {
  const {data} = summaryRecordSet('summary','full','2026-10-19');
  expect(data.situation.text).toContain('sulfonamide allergy (rash)');
  expect(data.attention || []).toEqual([]);
  expect(data.sections.find(section=>section.id==='last-visit').items.map(item=>item.label)).toEqual(['SX','DX','RX']);
});

test('fuller patient overview has three isolated consultation records and a consistent latest visit', () => {
  const { data, sources } = summaryRecordSet('summary', 'longitudinal');
  const visits = sources.filter(source => !source.resourceKind);
  expect(visits.map(source => source.date)).toEqual(['2026-05-12', '2026-07-14', '2026-10-09']);
  expect(data.situation.text).toContain('Arun Mehta');
  expect(sources.every(source => source.text.includes('Arun Mehta'))).toBe(true);
  expect(data.sections.find(section => section.id === 'last-visit').items.every(item => item.sources[0] === visits[2].id)).toBe(true);
  expect(JSON.stringify(summaryRecordSet('summary', 'full'))).not.toContain('Arun Mehta');
});


test('fuller catalog introduction excludes lab comparisons and gives the dated visit complaint', () => {
  const { data } = summaryRecordSet('summary', 'longitudinal');
  expect(data.situation.text).toMatch(/^Arun Mehta, a 58-year-old man, has type 2 diabetes/);
  expect(data.situation.text).toContain('last visit on 9 Oct 2026');
  expect(data.situation.text).toContain('mild fatigue for one week');
  expect(data.situation.text).not.toMatch(/HbA1c|7.8%|rotating shifts|meal timings/);
  expect(JSON.stringify(data.sections.find(section => section.id === 'assessment'))).toContain('7.8%');
});
