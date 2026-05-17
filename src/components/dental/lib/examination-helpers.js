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
        // Ensure we are working with arrays to prevent .map is not a function errors
    const findings = Array.isArray(data.findings) ? data.findings : [];
    const history = Array.isArray(data.treatmentHistory) ? data.treatmentHistory : [];
    return {
      tooth_code: fdi,
      quadrant: getQuadrantCode(fdi),
      findings: findings.map((f) => ({
        id: f.id,
        name: f.type,
        surface_codes: [f.zoneId],
        notes: f.notes || "",
        since_date: f.since_date || new Date().toISOString().split("T")[0],
      })),
      procedures: [], // Current UI doesn't track live procedures in exam tab
      treatment_history: history.map((h) => ({
        id: h.id,
        name: h.name || h.type,
        surface_codes: h.surface_codes || ["whole"],
        since_date: h.since_date || "",
        notes: h.notes || "",
      })),
      overall_notes: data.notes || "",
    };
  });
};
