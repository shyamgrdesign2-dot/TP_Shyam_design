import { DX_MARKER } from "../../../utils/dentalApiMappers";

export const DENTAL_GROUP_BY_TYPE = "type";
export const DENTAL_GROUP_BY_TOOTH = "tooth";

export const DENTAL_EXAM_CATEGORIES = [
  { key: "past", label: "Past Procedures", field: "treatment_history" },
  { key: "findings", label: "Findings", field: "findings" },
  { key: "procedures", label: "Procedures", field: "procedures" },
  { key: "notes", label: "Notes", isNotes: true },
];

const TOOTH_NAMES = {
  1: "Central Incisor",
  2: "Lateral Incisor",
  3: "Canine",
  4: "First Premolar",
  5: "Second Premolar",
  6: "First Molar",
  7: "Second Molar",
  8: "Third Molar",
};

export function resolveDentalGroupBy(value) {
  return value === DENTAL_GROUP_BY_TOOTH ? DENTAL_GROUP_BY_TOOTH : DENTAL_GROUP_BY_TYPE;
}

/** API snake_case or in-memory camelCase treatment history rows. */
export function getTreatmentHistoryRaw(toothState) {
  if (!toothState || typeof toothState !== "object") return [];
  const raw = toothState.treatment_history ?? toothState.treatmentHistory;
  return Array.isArray(raw) ? raw : [];
}

/** Diagnosis chips serialized with DX_MARKER — not past-procedure rows. */
export function isDiagnosisHistoryMarker(item) {
  const notes = String(item?.notes ?? item?.note ?? "").trim();
  return notes === DX_MARKER;
}

/** Past procedures for print: treatment_history minus primary-diagnosis markers. */
export function getPastProcedureItems(toothState) {
  return getTreatmentHistoryRaw(toothState).filter((item) => !isDiagnosisHistoryMarker(item));
}

export function toothHasPastProcedures(toothState) {
  return getPastProcedureItems(toothState).length > 0;
}

export function toothHasDentalPrintData(toothState) {
  const hasFindings = (toothState?.findings || []).length > 0;
  const hasProcedures = (toothState?.procedures || []).length > 0;
  const hasNotes = String(toothState?.overall_notes || "").trim().length > 0;
  return toothHasPastProcedures(toothState) || hasFindings || hasProcedures || hasNotes;
}

export function getToothFullName(toothCode) {
  const codeStr = String(toothCode || "").trim();
  if (!codeStr) return "Unknown Tooth";

  const q = parseInt(codeStr[0], 10);
  const pos = parseInt(codeStr[1], 10);

  if (Number.isNaN(q) || Number.isNaN(pos) || pos < 1 || pos > 8) {
    return `Tooth ${codeStr}`;
  }

  const qMap = {
    1: "Upper Right",
    2: "Upper Left",
    3: "Lower Left",
    4: "Lower Right",
    5: "Upper Right",
    6: "Upper Left",
    7: "Lower Left",
    8: "Lower Right",
  };

  const quadrant = qMap[q];
  const toothName = TOOTH_NAMES[pos] || `Tooth ${pos}`;

  if (!quadrant) {
    return `${toothName} (T${codeStr})`;
  }

  return `${quadrant} ${toothName} (T${codeStr})`;
}

export function mapSurfaceCode(code, toothCode) {
  const codeLower = String(code || "").toLowerCase();

  let pos = 1;
  let q = 2;
  if (toothCode) {
    const codeStr = String(toothCode);
    q = parseInt(codeStr[0], 10);
    pos = parseInt(codeStr[1], 10);
  }

  const isAnterior = pos <= 3;
  const isUpper = q === 1 || q === 2 || q === 5 || q === 6;

  switch (codeLower) {
    case "occlusal":
      return isAnterior ? "Incisal" : "Occlusal";
    case "buccal":
      return isAnterior ? "Labial" : "Buccal";
    case "lingual":
      return isUpper ? "Palatal" : "Lingual";
    case "mesial":
      return "Mesial";
    case "distal":
      return "Distal";
    case "cervical":
      return "Cervical";
    case "root":
      return "Root";
    case "whole":
      return "Whole Tooth";
    default:
      return codeLower ? codeLower.charAt(0).toUpperCase() + codeLower.slice(1) : "";
  }
}

export function formatDentalItemData(item, toothCode) {
  const name = item?.name || item?.type || "";

  let surfacesStr = "";
  if (Array.isArray(item?.surface_codes) && item.surface_codes.length > 0) {
    const cleanSurfaces = item.surface_codes
      .filter((s) => s && String(s).toLowerCase() !== "whole" && String(s).toLowerCase() !== "whole tooth")
      .map((s) => mapSurfaceCode(s, toothCode));
    if (cleanSurfaces.length > 0) {
      surfacesStr = cleanSurfaces.join(", ");
    }
  }

  const dateStr = item?.since_date || item?.since || item?.procedure_date || item?.plannedDate || "";
  const notesStr = String(item?.notes || item?.note || "").trim();
  const statusStr = String(item?.status || "").trim();

  const parts = [surfacesStr, dateStr, statusStr, notesStr].filter(Boolean);

  return {
    name,
    details: parts.length > 0 ? `(${parts.join(" | ")})` : "",
    surfaces: surfacesStr || "—",
    since: dateStr ? String(dateStr).trim() : "—",
    notes: notesStr || "—",
    rawItem: item,
  };
}

export function getTeethWithDentalData(toothStates) {
  const states = Array.isArray(toothStates) ? toothStates : [];
  return states.filter((toothState) => toothHasDentalPrintData(toothState));
}

export function buildToothCategories(toothState) {
  const toothCode = toothState.tooth_code;
  const categories = [];

  const pastItems = getPastProcedureItems(toothState);
  if (pastItems.length > 0) {
    categories.push({
      label: "Past Procedures",
      items: pastItems.map((item) => formatDentalItemData(item, toothCode)),
    });
  }
  if ((toothState.findings || []).length > 0) {
    categories.push({
      label: "Findings",
      items: (toothState.findings || []).map((item) => formatDentalItemData(item, toothCode)),
    });
  }
  if ((toothState.procedures || []).length > 0) {
    categories.push({
      label: "Procedures",
      items: (toothState.procedures || []).map((item) => formatDentalItemData(item, toothCode)),
    });
  }
  const notes = String(toothState.overall_notes || "").trim();
  if (notes) {
    categories.push({
      label: "Notes",
      items: [{ name: notes, details: "", surfaces: "—", since: "—", notes }],
    });
  }

  return {
    toothCode,
    fullName: getToothFullName(toothCode),
    categories,
  };
}

export function buildDentalGroupsByType(toothStates) {
  const teethWithData = getTeethWithDentalData(toothStates);

  return DENTAL_EXAM_CATEGORIES.map((category) => {
    const entries = [];

    teethWithData.forEach((toothState) => {
      const toothCode = toothState.tooth_code;
      const fullName = getToothFullName(toothCode);

      if (category.isNotes) {
        const notes = String(toothState.overall_notes || "").trim();
        if (notes) {
          entries.push({
            toothCode,
            fullName,
            items: [{ name: notes, details: "", surfaces: "—", since: "—", notes }],
          });
        }
        return;
      }

      const rawItems =
        category.key === "past"
          ? getPastProcedureItems(toothState)
          : toothState[category.field] || [];
      if (!rawItems.length) return;

      entries.push({
        toothCode,
        fullName,
        items: rawItems.map((item) => formatDentalItemData(item, toothCode)),
      });
    });

    return {
      label: category.label,
      entries,
    };
  }).filter((group) => group.entries.length > 0);
}

export function buildDentalGroupsByTooth(toothStates) {
  return getTeethWithDentalData(toothStates)
    .map((toothState) => buildToothCategories(toothState))
    .filter((tooth) => tooth.categories.length > 0);
}
