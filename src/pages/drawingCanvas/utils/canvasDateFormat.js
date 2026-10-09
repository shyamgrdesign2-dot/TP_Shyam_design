/** Short month labels shared by canvas card subtitles and default canvas filenames. */
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * ISO (or parseable) timestamp → subtitle like `19 Apr'26` (day, space, month, apostrophe, yy).
 * @param {string|number|Date|null|undefined} iso
 * @returns {string|null}
 */
export function formatCanvasCreatedSubtitle(iso) {
  if (iso == null || iso === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}'${String(d.getFullYear()).slice(-2)}`;
}

/**
 * Date token for default canvas names, e.g. `12May'26` (no space; used after underscore).
 * @param {Date} [d]
 * @returns {string} empty string if invalid
 */
export function formatCanvasDefaultNameDateSuffix(d = new Date()) {
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}${MONTHS_SHORT[d.getMonth()]}'${String(d.getFullYear()).slice(-2)}`;
}
