export const DRAWING_CANVAS_CASE_OPTION = {
  id: 25,
  title: "Canvas",
  format: "inline",
  enable: "Y",
  custom_status: "Y",
};

export const normalizeCanvasIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((id) => String(id).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
};

export const getCanvasMappingId = (record) => {
  if (!record || typeof record !== "object") return null;
  return (
    record.mapping_id ??
    record.canvas_id ??
    record.canvasId ??
    record.id ??
    null
  );
};

export const filterCanvasRecordsByFilename = (records, canvasFilename) => {
  if (!Array.isArray(records)) return [];

  const hasCanvasFilenameField =
    Array.isArray(canvasFilename) || typeof canvasFilename === "string";
  const selectedCanvasIds = normalizeCanvasIds(canvasFilename);

  if (hasCanvasFilenameField && selectedCanvasIds.length === 0) {
    return [];
  }
  if (selectedCanvasIds.length > 0) {
    const selectedSet = new Set(selectedCanvasIds.map(String));
    return records.filter((record) => {
      const recordId = getCanvasMappingId(record);
      if (recordId == null) return false;
      return selectedSet.has(String(recordId));
    });
  }
  return records;
};

export const ensureDrawingCanvasCaseOption = (printSettings) => {
  if (!printSettings || typeof printSettings !== "object") {
    return {
      prescription: {
        case_option: [{ ...DRAWING_CANVAS_CASE_OPTION }],
      },
    };
  }

  const updated = { ...printSettings };
  const prescription = { ...(updated.prescription || {}) };
  const caseOption = Array.isArray(prescription.case_option)
    ? [...prescription.case_option]
    : [];

  const existingIndex = caseOption.findIndex((option) => option?.id === 25);
  if (existingIndex === -1) {
    caseOption.push({ ...DRAWING_CANVAS_CASE_OPTION });
  } else {
    const existing = caseOption[existingIndex];
    caseOption[existingIndex] = {
      ...existing,
      enable: existing.enable || "Y",
      custom_status: existing.custom_status || "Y",
      format: existing.format || "inline",
      title: existing.title || DRAWING_CANVAS_CASE_OPTION.title,
    };
  }

  prescription.case_option = caseOption;
  updated.prescription = prescription;
  return updated;
};
