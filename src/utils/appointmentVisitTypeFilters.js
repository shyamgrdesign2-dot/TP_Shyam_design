const normalizeVisitTypeFilterValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const matchesVisitTypeFilter = (visitType, filterVisitType) => {
  const normalizedFilters = String(filterVisitType ?? "")
    .split(",")
    .map(normalizeVisitTypeFilterValue)
    .filter(Boolean);

  if (!normalizedFilters.length) return true;

  return normalizedFilters.includes(normalizeVisitTypeFilterValue(visitType));
};
