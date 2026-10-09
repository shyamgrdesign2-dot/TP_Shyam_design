// Date-filter helpers for the analytics range picker.
//
// The filter is a Tesseract DateRangePicker (mode="range") with its built-in
// quick-select presets (Today, Yesterday, Past 7 days, Past 30 days, This
// month, ...). When a preset is chosen the trigger shows the preset LABEL
// (e.g. "Past 7 days"); a manual range shows the dates. We keep the picker's
// `value` as the preset id string by default so it reads "Past 7 days".

// Default selection: the "Past 7 days" preset (matches the picker's built-in id).
export const DEFAULT_DATE_VALUE = "last-7";

// Timezone-safe local YYYY-MM-DD (avoids the UTC day-shift toISOString causes
// on local-midnight dates in +ve offsets like IST).
export const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const monthOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Two Date objects → { startDate, endDate, days, month } for the data hooks.
// `days` is snapped to the buckets the Tab-2 endpoints accept.
export function datesToRange(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return periodToRange("7d");
  const diff = Math.round(Math.abs(end - start) / 86400000) + 1;
  const days = [7, 15, 30].reduce(
    (best, d) => (Math.abs(d - diff) < Math.abs(best - diff) ? d : best),
    7
  );
  return { startDate: isoLocal(start), endDate: isoLocal(end), days, month: monthOf(end) };
}

// A preset key → { startDate, endDate, days, month }. Used for the initial
// default range before the picker fires its first onChange.
export function periodToRange(period) {
  const start = new Date();
  const end = new Date();
  let days = 7;

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      days = 7;
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      days = 7;
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      days = 30;
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      days = 90;
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      days = 90;
      break;
    case "7d":
    default:
      start.setDate(start.getDate() - 6);
      days = 7;
      break;
  }

  return { startDate: isoLocal(start), endDate: isoLocal(end), days, month: monthOf(end) };
}

// Length of the selected range in days — sections use this to HIDE any card
// whose buckets cannot match the filter (e.g. month-based weekly charts under
// a "Past 7 days" selection). Correlation rule: never show week/month insights
// for a sub-month range.
export function rangeLengthDays(startDate, endDate) {
  if (!startDate || !endDate) return 7;
  const diff = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 7;
}

// Tab-2 analytics family (`/analytics/ipd-billing`, billing-by-doctor) accepts
// only these day windows — not an arbitrary startDate/endDate. Snap the
// picker's range length to the nearest allowed bucket.
export const ANALYTICS_DAY_WINDOWS = [7, 15, 30, 90, 365];

export function snapAnalyticsDays(startDate, endDate, fallback = 7) {
  const raw = rangeLengthDays(startDate, endDate);
  return ANALYTICS_DAY_WINDOWS.reduce(
    (best, d) => (Math.abs(d - raw) < Math.abs(best - raw) ? d : best),
    fallback
  );
}

// A range is "month-scoped" (weekly/month-bucketed cards may show) when it
// either spans at least ~a month OR is a calendar month-to-date selection
// (starts on the 1st and stays inside one month — the "This month" preset).
export function isMonthScoped(startDate, endDate) {
  if (!startDate || !endDate) return false;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  if (rangeLengthDays(startDate, endDate) >= 28) return true;
  return s.getDate() === 1 && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
}
