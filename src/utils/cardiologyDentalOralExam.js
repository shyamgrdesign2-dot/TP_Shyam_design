import moment from "moment";
import { getDentalApiPayload } from "./dentalApiMappers";
import {
  toothHasDentalPrintData,
} from "../components/print_settings/dental/dentalPrintHelpers";
import { hasOralExamChartData } from "./examChartStorage";
import {
  ORAL_POSITION_LABEL,
  normalizeOralSurfaceIds,
} from "../components/dental/examination/types";

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

function mapSurfaceCode(code, toothCode) {
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

export function formatDentalExamItem(item, toothCode) {
  const name = item?.name || item?.type || "";
  let surfacesStr = "";
  if (Array.isArray(item?.surface_codes) && item.surface_codes.length > 0) {
    const cleanSurfaces = item.surface_codes
      .filter((s) => s && String(s).toLowerCase() !== "whole")
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
  };
}

export function hasDentalExamPayload(data) {
  if (!Array.isArray(data?.tooth_states)) return false;
  return data.tooth_states.some((toothState) => toothHasDentalPrintData(toothState));
}

function normalizeOralSurfacesForFingerprint(surfaces) {
  return normalizeOralSurfaceIds(surfaces)
    .map((surface) => String(surface).trim().toLowerCase())
    .sort()
    .join(",");
}

/** Stable key for deduping oral rows across API / Redux / case-manager sources. */
export function oralEntryFingerprint(entry) {
  return [
    String(entry?.kind || "").trim().toLowerCase(),
    String(entry?.name || "").trim().toLowerCase(),
    normalizeOralSurfacesForFingerprint(entry?.surfaces),
    String(entry?.since || "").trim().toLowerCase(),
    String(entry?.note || "").trim().toLowerCase(),
  ].join("|");
}

export function dedupeOralExamChart(chart) {
  if (!chart || typeof chart !== "object") return null;
  const entries = Array.isArray(chart.oralEntries) ? chart.oralEntries : [];
  const seen = new Set();
  const dedupedEntries = [];

  entries.forEach((entry) => {
    if (!entry) return;
    const fingerprint = oralEntryFingerprint(entry);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    dedupedEntries.push(entry);
  });

  const result = {
    oralEntries: dedupedEntries,
    oralNotes: String(chart.oralNotes || "").trim(),
  };

  const hasEntries = dedupedEntries.length > 0;
  const hasNotes = result.oralNotes.length > 0;
  return hasEntries || hasNotes ? result : null;
}

export function mapOralApiToChart(api = {}) {
  const entries = [];
  const pushRows = (rows, kind) => {
    (rows || []).forEach((row) => {
      const name = row?.name || row?.type || "";
      if (!String(name).trim()) return;
      entries.push({
        kind,
        name,
        surfaces: normalizeOralSurfaceIds(row?.area || row?.surfaces || []),
        since: row?.since_date || row?.since || "",
        note: row?.notes || row?.note || "",
      });
    });
  };
  pushRows(api.findings, "finding");
  pushRows(api.procedures, "procedure");
  pushRows(api.treatment_history, "past");
  return (
    dedupeOralExamChart({
      oralEntries: entries,
      oralNotes: api.overall_notes || api.overallNotes || "",
    }) || {
      oralEntries: [],
      oralNotes: "",
    }
  );
}

export function normalizeOralHistoryList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.history)) return payload.history;
  if (Array.isArray(payload.visits)) return payload.visits;
  if (Array.isArray(payload.records)) return payload.records;
  if (hasOralApiRows(payload)) return [payload];
  return [];
}

function hasOralApiRows(api) {
  return (
    (Array.isArray(api.findings) && api.findings.length > 0) ||
    (Array.isArray(api.procedures) && api.procedures.length > 0) ||
    (Array.isArray(api.treatment_history) && api.treatment_history.length > 0) ||
    String(api.overall_notes || api.overallNotes || "").trim().length > 0
  );
}

function resolveVisitTcmId(item) {
  return String(
    item?.tcm_id ??
      item?.tcmId ??
      item?.rx_id ??
      item?.rxId ??
      item?.prescription_id ??
      item?.prescriptionId ??
      ""
  );
}

function resolveVisitDate(item) {
  const raw =
    item?.consultation_date ||
    item?.consultationDate ||
    item?.patient_consultaion_date ||
    item?.date ||
    item?.created_at ||
    item?.updated_at;
  return raw ? moment(raw).format("YYYY-MM-DD") : "";
}

export function pickOralExamForVisit(historyPayload, tcmId, consultationDate) {
  const list = normalizeOralHistoryList(historyPayload);
  const idStr = String(tcmId ?? "");

  if (idStr) {
    const byTcm = list.find((item) => resolveVisitTcmId(item) === idStr);
    if (byTcm) {
      const mapped = mapOralApiToChart(byTcm);
      if (hasOralExamChartData(mapped)) return mapped;
    }
  }

  if (consultationDate) {
    const target = moment(consultationDate).format("YYYY-MM-DD");
    const byDate = list.find((item) => resolveVisitDate(item) === target);
    if (byDate) {
      const mapped = mapOralApiToChart(byDate);
      if (hasOralExamChartData(mapped)) return mapped;
    }
  }

  if (list.length === 1) {
    const mapped = mapOralApiToChart(list[0]);
    if (hasOralExamChartData(mapped)) return mapped;
  }

  return null;
}

export function formatOralEntryMeta(entry) {
  const since = String(entry?.since || "").trim();
  const note = String(entry?.note || "").trim();
  const region = (entry?.surfaces || [])
    .map((s) => ORAL_POSITION_LABEL[s] || s)
    .join(", ");
  const bits = [];
  if (region) bits.push(region);
  if (since) bits.push(`since ${since}`);
  if (note) bits.push(note);
  return bits.length ? ` (${bits.join(", ")})` : "";
}

export function extractDentalApiPayload(response) {
  return getDentalApiPayload(response);
}
