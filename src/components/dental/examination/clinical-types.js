// ══════════════════════════════════════════════════════════════
// Entity-centric tooth entries (findings + planned procedures)
// One entry covers N surfaces — no repetition per surface.
// ══════════════════════════════════════════════════════════════

export const PROCEDURE_CATALOG = [
  "RCT",
  "Restoration",
  "Extraction",
  "Scaling",
  "Polishing",
  "Crown Prep",
  "Bridge Prep",
  "Implant Placement",
  "Pulp Cap",
  "Root Planing",
  "Veneer",
  "Composite Filling",
];

export function getProcedureLabel(item) {
  if (typeof item === "string") return String(item).replace(/\r/g, "").trim();
  const raw = item?.label || item?.code || item?.name || "";
  return String(raw).replace(/\r/g, "").trim();
}

export function resolveVisitProcedure(item) {
  if (!item || typeof item !== "object") return undefined;

  const nested = item.visitProcedure || item.visit_procedure;
  if (nested && typeof nested === "object") {
    const procedureName = nested.procedureName ?? nested.procedure_name;
    return {
      procedureId: nested.procedureId ?? nested.procedure_id,
      procedureName:
        procedureName != null
          ? String(procedureName).replace(/\r/g, "").trim()
          : undefined,
      procedureCode: nested.procedureCode ?? nested.procedure_code,
      price: nested.price,
      discount: nested.discount ?? null,
      discountType: nested.discountType ?? nested.discount_type,
      gst: nested.gst,
      totalAmount: nested.totalAmount ?? nested.total_amount,
    };
  }

  const procedureId = item.procedureId ?? item.procedure_id;
  if (procedureId == null) return undefined;

  return {
    procedureId,
    procedureName: item.procedureName ?? item.procedure_name ?? getProcedureLabel(item),
    procedureCode: item.procedureCode ?? item.procedure_code ?? item.code,
    price: item.price,
    discount: item.discount ?? null,
    discountType: item.discountType ?? item.discount_type,
    gst: item.gst,
    totalAmount: item.totalAmount ?? item.total_amount,
  };
}

export function normalizeProcedureCatalogItems(apiArr, fallbackArr = PROCEDURE_CATALOG) {
  if (!apiArr?.length) {
    return fallbackArr.map((label) => ({ code: label, label: getProcedureLabel(label) }));
  }
  return apiArr.map((item) => {
    if (typeof item !== "object" || item == null) {
      const label = getProcedureLabel(item);
      return { code: label, label };
    }
    const visitProcedure = resolveVisitProcedure(item);
    const label = getProcedureLabel(item);
    return {
      code: String(item.code || item.name || item.id || label).replace(/\r/g, "").trim(),
      label,
      ...(visitProcedure ? { visitProcedure } : {}),
    };
  }).filter((item) => item.label);
}

export function findProcedureCatalogItem(items, label) {
  const q = String(label || "").trim().toLowerCase();
  if (!q) return null;
  return (items || []).find((item) => {
    const vp = resolveVisitProcedure(item);
    return (
      getProcedureLabel(item).toLowerCase() === q ||
      item.code?.toLowerCase() === q ||
      item.name?.toLowerCase() === q ||
      vp?.procedureName?.toLowerCase() === q ||
      vp?.procedureCode?.toLowerCase() === q
    );
  });
}

export const TREATMENT_SURFACE_RULES = {
  Implant: "whole-tooth",
  Missing: "whole-tooth",
  RCT: "whole-tooth",
  "Root Canal Treatment": "whole-tooth",
  Crown: "whole-tooth",
  "Crown Prep": "whole-tooth",
  Bridge: "whole-tooth",
  "Bridge Prep": "whole-tooth",
  Extraction: "whole-tooth",
  Veneer: "whole-tooth",
  "Pulp Cap": "whole-tooth",
  "Implant Placement": "whole-tooth",
  Denture: "whole-tooth",
  Scaling: "ask",
  Polishing: "ask",
  "Composite Filling": "ask",
  Restoration: "ask",
  "Root Planing": "ask",
  "Fluoride Treatment": "ask",
};

export function getDefaultTreatmentSurfaces(name) {
  const rule = TREATMENT_SURFACE_RULES[name] ?? "ask";
  if (rule === "whole-tooth") return ["whole"];
  if (rule === "root") return ["root"];
  return ["whole"];
}

// all CSV FDIs resolve to the same 5 zones; extend here if per-FDI surfaces diverge
export function getSurfacesForFdi(_fdi) {
  return ["mesial", "distal", "buccal", "lingual", "occlusal", "cervical", "palatal", "labial", "root"];
}

export const DIAGNOSES = [
  "Cavity/Caries",
  "Crack",
  "Fracture",
  "Erosion",
  "Abrasion",
  "Attrition",
  "Staining",
  "Plaque",
  "Calculus",
  "Restoration Defect",
  "NCCL",
  "Sensitivity",
  "Resorption",
  "Recession",
  "Normal",
];

// Tooth-level diagnoses (not tied to a specific zone/surface)
export const TOOTH_DIAGNOSES = [
  "Implant",
  "Missing",
  "RCT",
  "Crown",
  "Bridge",
  "Denture",
  "Extraction",
  "Composite Filling",
  "Scaling",
  "Polishing",
  "Veneer",
  "Pulp Cap",
  "Root Planing",
  "Fluoride Treatment",
];

// ══════════════════════════════════════════════════════════════
// DIAGNOSIS COLORS — for full dentition view tinting
// ══════════════════════════════════════════════════════════════

export const DIAGNOSIS_COLORS = {
  Crown: "#6B7280", // neutral gray
  Missing: "#EF4444", // red (the only alert/red tag)
  RCT: "#6B7280", // neutral gray
  Bridge: "#6B7280", // neutral gray
  Implant: "#6B7280", // neutral gray
  Denture: "#6B7280", // neutral gray
};
