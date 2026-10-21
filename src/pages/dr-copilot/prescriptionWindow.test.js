import { prescriptionEnd, prescriptionStatus } from './prescriptionWindow';
const course = { start: '2026-09-22', durationDays: 30 };
test('includes both prescribed boundary dates and excludes expired and future courses', () => {
  expect(prescriptionEnd(course)).toBe('2026-10-21');
  expect(prescriptionStatus(course, '2026-09-21')).toBe('future');
  expect(prescriptionStatus(course, '2026-09-22')).toBe('in-date');
  expect(prescriptionStatus(course, '2026-10-21')).toBe('in-date');
  expect(prescriptionStatus(course, '2026-10-22')).toBe('expired');
});
test('does not infer a current course from incomplete, reversed or stopped instructions', () => {
  expect(prescriptionStatus({ start: '2026-02-30', durationDays: 300 }, '2026-10-19')).toBe('unknown');
  expect(prescriptionStatus({ start: '2026-09-22' }, '2026-10-19')).toBe('unknown');
  expect(prescriptionStatus({ ...course, durationDays: 0 }, '2026-10-19')).toBe('unknown');
  expect(prescriptionStatus({ ...course, end: '2026-09-01' }, '2026-10-19')).toBe('unknown');
  expect(prescriptionStatus({ ...course, status: 'stopped' }, '2026-10-19')).toBe('stopped');
  expect(prescriptionStatus({ ...course, status: 'superseded' }, '2026-10-19')).toBe('superseded');
});
test('uses documented end dates and handles month and leap-year boundaries', () => {
  expect(prescriptionEnd({ start: '2024-02-28', durationDays: 3 })).toBe('2024-03-01');
  expect(prescriptionStatus({ ...course, end: '2026-10-01' }, '2026-10-19')).toBe('expired');
});

test('summary uses documented ongoing medication first and current prescriptions for other medicines', () => {
  const { summaryMedications } = require('./prescriptionWindow');
  const records = summaryMedications({
    asOf:'2026-10-19',
    ongoing:[{ id:'reported', medicationKey:'metformin', name:'Metformin', strength:'500 mg', status:'ongoing', recordedAt:'2026-10-18', sourceId:'history' }],
    prescriptions:[
      { ...course, id:'rx-met', medicationKey:'metformin', name:'Metformin', sourceId:'rx' },
      { ...course, id:'rx-amlo', medicationKey:'amlodipine', name:'Amlodipine', sourceId:'rx' },
      { ...course, id:'expired', medicationKey:'expired', name:'Old medicine', start:'2026-07-01', sourceId:'old' },
      { id:'unknown', medicationKey:'unknown', name:'Listed only', start:'2026-09-22', sourceId:'old' },
    ],
  });
  expect(records.map(item => [item.id,item.basis])).toEqual([['reported','documented-ongoing'],['rx-amlo','prescription-window']]);
  expect(records[1].end).toBe('2026-10-21');
});
test('summary excludes future, stopped and unsupported ongoing statements', () => {
  const { summaryMedications } = require('./prescriptionWindow');
  const statement = { id:'statement', medicationKey:'medicine', name:'Medicine', sourceId:'history', status:'ongoing', recordedAt:'2026-10-18' };
  expect(summaryMedications({ asOf:'2026-10-19', ongoing:[
    { ...statement, status:'stopped' },
    { ...statement, recordedAt:'2026-10-20' },
    { ...statement, sourceId:null },
    { ...statement, end:'2026-10-01' },
  ] })).toEqual([]);
});
