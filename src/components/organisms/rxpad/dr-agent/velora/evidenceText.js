// Offsets in the evidence API are Unicode code points, not UTF-16 units.
export function evidenceTextParts(text = '', highlights = []) {
  const chars = Array.from(text);
  const ranges = highlights.filter(range => Array.isArray(range) && range.length >= 2 && Number.isInteger(range[0]) && Number.isInteger(range[1]) && range[0] >= 0 && range[1] > range[0] && range[1] <= chars.length).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  const parts = []; let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: chars.slice(cursor, start).join(''), highlighted: false });
    parts.push({ text: chars.slice(start, end).join(''), highlighted: true });
    cursor = end;
  }
  if (cursor < chars.length) parts.push({ text: chars.slice(cursor).join(''), highlighted: false });
  return parts;
}
