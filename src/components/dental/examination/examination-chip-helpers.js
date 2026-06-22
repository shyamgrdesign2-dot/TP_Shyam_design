/**
 * examination-chip-helpers — pure label helpers for dentition summary chips.
 * No React, no side effects. Extracted from ExaminationTab.
 */

const CHIP_SEGMENT_MAX = 22;
const CHIP_JOIN_MAX = 96;

/** Trim a single chip segment to `max` chars, appending an ellipsis when cut. */
export function truncateChipSegment(s, max = CHIP_SEGMENT_MAX) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/** Join + dedupe chip labels, trimming each segment and the joined total length. */
export function joinChipLabels(parts, maxTotal = CHIP_JOIN_MAX) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const seg = truncateChipSegment(p);
    if (!seg || seen.has(seg.toLowerCase())) continue;
    seen.add(seg.toLowerCase());
    out.push(seg);
  }
  let s = out.join(", ");
  if (s.length > maxTotal) s = `${s.slice(0, maxTotal - 1)}…`;
  return s;
}

/** Dedupe + trim part labels for dentition summary pills (full strings; truncation is CSS per segment). */
export function uniquePartList(raw) {
  const seen = new Set();
  const out = [];
  for (const x of raw) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
