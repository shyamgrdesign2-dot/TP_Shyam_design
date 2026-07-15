// Delta / comparison utilities for KPI cards.
//
// Two delta sources exist:
// 1. Backend-provided: API returns { count, pctChange, isDown } — use extractDelta()
// 2. Client-computed: API returns current + previous period data — use pctDelta()
//
// Polarity: some metrics are "lower is better" (cancellation rate, due amount).
// Pass invertPolarity=true so the pill color flips (green for decrease).

export function pctDelta(current, previous) {
  const c = toNum(current);
  const p = toNum(previous);
  // No pill without a real baseline: previous 0/absent produces absurd
  // percentages — "vs previous" is only meaningful when the previous
  // window actually had volume.
  if (p <= 0) return null;
  return Math.round(((c - p) / p) * 100);
}

export function extractDelta(node) {
  if (node && typeof node === "object" && node.pctChange != null) {
    const n = Number(node.pctChange);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function buildDeltaProps(current, previous, { invertPolarity = false } = {}) {
  const delta = pctDelta(current, previous);
  if (delta == null) return {};
  return { delta: invertPolarity ? -delta : delta };
}

export function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// LOWER_IS_BETTER keys: delta pill should be green when value decreases.
export const INVERTED_POLARITY_KEYS = new Set([
  "cancelled",
  "rate",
  "cancellationRate",
  "totalDue",
  "refund",
  "totalRefunded",
  "advRefunded",
  "dischargeQueue",
  "avgQueueTime",
  "bedsBlocked",
]);

// The equal-length window immediately before [startDate, endDate] — used to
// fetch true previous-period numbers from endpoints that accept any range.
export function previousWindow(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const days = Math.round((e - s) / 86400000) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: iso(prevStart), endDate: iso(prevEnd) };
}
