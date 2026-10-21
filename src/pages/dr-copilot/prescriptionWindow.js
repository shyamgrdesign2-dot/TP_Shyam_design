// Calendar-day prescription eligibility, not evidence of adherence.
const DAY = 86400000;
const day = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
};
export function prescriptionEnd(record) {
  if (record.end) return Number.isFinite(day(record.end)) ? record.end : null;
  if (!Number.isFinite(day(record.start)) || !Number.isInteger(record.durationDays) || record.durationDays < 1) return null;
  return new Date(day(record.start) + (record.durationDays - 1) * DAY).toISOString().slice(0, 10);
}
export function prescriptionStatus(record, asOf) {
  if (record.status === 'stopped' || record.status === 'superseded') return record.status;
  const start = day(record.start), end = day(prescriptionEnd(record)), today = day(asOf);
  if (![start, end, today].every(Number.isFinite) || end < start) return 'unknown';
  if (today < start) return 'future';
  return today > end ? 'expired' : 'in-date';
}
export function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** Inputs must already be patient-scoped and reconciled for stops, replacements and conflicts.
 * medicationKey is a source-normalized identity, not a fuzzy brand/name match.
 * An explicit ongoing statement takes precedence for that medicine, not the entire list.
 */
export function summaryMedications({ ongoing = [], prescriptions = [], asOf }) {
  const selected = new Map();
  if (!Number.isFinite(day(asOf))) return [];
  ongoing.filter(record => record.medicationKey && record.name && record.sourceId
    && record.status === 'ongoing' && Number.isFinite(day(record.recordedAt))
    && day(record.recordedAt) <= day(asOf)
    && (!record.end || (Number.isFinite(day(record.end)) && day(record.end) >= day(asOf))))
    .sort((a, b) => day(b.recordedAt) - day(a.recordedAt))
    .forEach(record => {
      if (!selected.has(record.medicationKey)) selected.set(record.medicationKey, { ...record, basis:'documented-ongoing' });
    });
  prescriptions.filter(record => record.medicationKey && record.name && record.sourceId
    && prescriptionStatus(record, asOf) === 'in-date')
    .sort((a, b) => day(b.start) - day(a.start))
    .forEach(record => {
      if (!selected.has(record.medicationKey)) selected.set(record.medicationKey, { ...record, basis:'prescription-window', end:prescriptionEnd(record) });
    });
  return [...selected.values()];
}
