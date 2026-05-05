/** Section header for last-visit blocks — date belongs in the title, not in the body row. */
export function formatLastVisitSectionLabel(visitDate) {
  const d = visitDate?.trim();
  if (!d) return "Last Visit";
  return `Last Visit (${d})`;
}