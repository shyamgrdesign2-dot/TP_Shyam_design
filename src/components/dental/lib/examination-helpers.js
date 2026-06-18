import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { DX_MARKER } from "../../../utils/dentalApiMappers";

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
    const procedures = Array.isArray(data.procedures) ? data.procedures : [];

    // Primary diagnosis chips (Missing, Crown, RCT…) serialized as treatment_history entries
    // with DX_MARKER in notes so they can be round-tripped back to toothDiagnoses on load.
    const diagnoses = Array.isArray(data.diagnoses) ? data.diagnoses : [];
    const diagEntries = diagnoses.map((name) => ({
      name,
      surface_codes: ["whole"],
      notes: DX_MARKER,
    }));

    // treatmentHistory may be an array (legacy) or an object map { name: { surfaces, since, note } }
    const rawHistory = data.treatmentHistory;
    const historyEntries = Array.isArray(rawHistory)
      ? rawHistory
      : Object.entries(rawHistory || {}).map(([name, details]) => ({
          name,
          surface_codes: details.surfaces || ["whole"],
          since_date: sinceToDate(details.since),
          notes: details.note || "",
        }));

    // Combine canvas zone findings and EntryTab text findings, deduplicating by id
    // to prevent duplicates when the same finding is hydrated into both paths on load.
    const seenFindingIds = new Set();
    const combinedFindings = [
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
      ...entryFindings.map((f) => ({
        ...(f.id ? { id: f.id } : {}),
        name: f.name,
        surface_codes: f.surfaces?.length ? f.surfaces : ["whole"],
        notes: f.notes || "",
      })),
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
      })),
      treatment_history: [
        ...diagEntries,
        ...historyEntries.map((h) => {
          const since = sinceToDate(h.since_date || h.since || "");
          return {
            ...(h.id ? { id: h.id } : {}),
            name: h.name || h.type,
            surface_codes: h.surface_codes || ["whole"],
            ...(since ? { since_date: since } : {}),
            notes: h.notes || h.note || "",
          };
        }),
      ],
      overall_notes: data.notes || "",
    };
  });
};
