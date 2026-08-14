import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const sinceToDate = (since) => {
  if (!since) return null;
  // Already ISO → pass through
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) return since;
  // Calendar-picked date in "D MMM YYYY" → convert to ISO
  const parsed = dayjs(since, "D MMM YYYY", true);
  if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  // Relative labels ("1 month", "3 weeks", …) → pass through as-is
  return since;
};

/**
 * Transforms internal toothState map to API's tooth_states array.
 */
export const transformToothStateToApi = (toothState) => {
  const getQuadrantCode = (fdi) => {
    const q = fdi.toString()[0];
    if (q === "1" || q === "5") return "UR";
    if (q === "2" || q === "6") return "UL";
    if (q === "3" || q === "7") return "LL";
    if (q === "4" || q === "8") return "LR";
    return "UR";
  };

  return Object.entries(toothState).map(([fdi, data]) => {
    const findings = Array.isArray(data.findings) ? data.findings : [];
    // entryFindings: clinical findings added via SingleToothPanel EntryTab (kind="finding" in allEntries)
    const entryFindings = Array.isArray(data.entryFindings) ? data.entryFindings : [];
    const allProcedures = Array.isArray(data.procedures) ? data.procedures : [];
    // kind="procedure" entries are past procedures (treatment history) added via template apply.
    // They must go to treatment_history, not procedures — the API requires status on procedures
    // and past procedure entries don't have (and shouldn't have) a procedure status.
    const procedures = allProcedures.filter((p) => p.kind !== "procedure");
    const pastProcedureEntries = allProcedures.filter((p) => p.kind === "procedure");

    // treatmentHistory may be an array (legacy) or an object map { name: { surfaces, since, note } }
    const rawHistory = data.treatmentHistory;
    const historyEntries = Array.isArray(rawHistory)
      ? rawHistory
      : Object.entries(rawHistory || {}).map(([name, details]) => ({
          name,
          surface_codes: details.surfaces || ["whole"],
          since_date: sinceToDate(details.since),
          notes: details.note || "",
          ...(details.visitProcedure ? { visitProcedure: details.visitProcedure } : {}),
        }));

    // Combine canvas zone findings and EntryTab text findings, deduplicating by id
    // to prevent duplicates when the same finding is hydrated into both paths on load.
    const seenFindingIds = new Set();
    const combinedFindings = [
      // Entry-tab findings first: most authoritative source (latest notes, full surface list, since).
      ...entryFindings.map((f) => {
        const since = sinceToDate(f.since || "");
        return {
          ...(f.id ? { id: f.id } : {}),
          name: f.name,
          surface_codes: f.surfaces?.length ? f.surfaces : ["whole"],
          notes: f.notes || "",
          ...(since ? { since_date: since } : {}),
        };
      }),
      // Canvas zone findings second: fallback for findings added directly on the canvas
      // that have no entry-tab counterpart.
      ...findings.map((f) => {
        const since = sinceToDate(f.since_date || "");
        return {
          ...(f.id ? { id: f.id } : {}),
          name: f.type || f.name || "",
          surface_codes: [f.zoneId],
          notes: f.notes || "",
          ...(since ? { since_date: since } : {}),
        };
      }),
    ].filter((f) => {
      if (f.id && seenFindingIds.has(f.id)) return false;
      if (f.id) seenFindingIds.add(f.id);
      return true;
    });

    return {
      tooth_code: fdi,
      quadrant: getQuadrantCode(fdi),
      findings: combinedFindings,
      procedures: procedures.map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        name: p.name || p.type || "",
        surface_codes: p.surfaces?.length ? p.surfaces : ["whole"],
        status: (p.status || "PLANNED").toUpperCase(),
        notes: p.notes || "",
        ...(p.visitProcedure ? { visitProcedure: p.visitProcedure } : {}),
      })),
      treatment_history: [
        ...historyEntries.map((h) => {
          const since = sinceToDate(h.since_date || h.since || "");
          return {
            ...(h.id ? { id: h.id } : {}),
            name: h.name || h.type,
            surface_codes: h.surface_codes || ["whole"],
            ...(since ? { since_date: since } : {}),
            notes: h.notes || h.note || "",
            ...(h.visitProcedure ? { visitProcedure: h.visitProcedure } : {}),
          };
        }),
        ...pastProcedureEntries.map((p) => {
          const since = sinceToDate(p.since || "");
          return {
            name: p.name,
            surface_codes: p.surfaces?.length ? p.surfaces : ["whole"],
            ...(since ? { since_date: since } : {}),
            notes: p.notes || "",
            ...(p.visitProcedure ? { visitProcedure: p.visitProcedure } : {}),
          };
        }),
      ],
      overall_notes: data.notes || "",
    };
  });
};
