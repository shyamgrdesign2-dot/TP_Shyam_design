// Pure helpers for the LIMS module — no React, no network.
import { DEFAULT_TESTS_DATA } from "../../utils/labParamsConstants";

// Specimen is not modelled in the lab catalog yet, so we derive a sensible
// default per report category. (Refine once the backend exposes specimen.)
const SPECIMEN_BY_REPORT = {
  "Complete Blood Count - CBC": "Whole blood (EDTA)",
  "Complete Blood Picture - CBP": "Whole blood (EDTA)",
  "Diabetes Profile": "Serum / Fluoride plasma",
  "Fasting Lipid Profile  FLP": "Serum",
  "Non Fasting Lipid Profile": "Serum",
  "Lipid Profile": "Serum",
  "Thyroid Profile": "Serum",
  "Free Thyroid Profile": "Serum",
  "Kidney Function Test - KFT": "Serum",
  "Liver Function Tests - LFT": "Serum",
  "Iron Profile": "Serum",
  "Fertility/PCOS Profile": "Serum",
  "Fever Profile": "Serum / Whole blood",
  "Pulmonary Function Test": "Not applicable",
  "Routine Imaging & Histo": "Tissue / Imaging",
};

export function specimenForReport(reportName) {
  if (!reportName) return "Serum";
  return SPECIMEN_BY_REPORT[reportName.trim()] || SPECIMEN_BY_REPORT[reportName] || "Serum";
}

// Build the catalog grouped by report category from the bundled defaults.
export function buildCatalog() {
  const byReport = new Map();
  DEFAULT_TESTS_DATA.forEach((t) => {
    const key = (t.reportName || "").trim();
    if (!byReport.has(key)) {
      byReport.set(key, { reportName: key, specimen: specimenForReport(key), tests: [] });
    }
    byReport.get(key).tests.push({
      testName: t.testName,
      units: t.units || "",
      refRange: t.refRange || null,
    });
  });
  return Array.from(byReport.values());
}

// Resolve the applicable reference range for a patient's gender.
export function resolveRange(refRange, gender) {
  if (!refRange || !Array.isArray(refRange.ranges) || refRange.ranges.length === 0) return null;
  const g = String(gender || "").toUpperCase();
  if (refRange.isConditional) {
    const match = refRange.ranges.find((r) => String(r.gender).toUpperCase() === g);
    return match || refRange.ranges[0];
  }
  return refRange.ranges[0];
}

// "UP" / "DOWN" / "" relative to the resolved range.
export function computeArrow(value, refRange, gender) {
  const range = resolveRange(refRange, gender);
  if (!range) return "";
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(num)) return "";
  const min = parseFloat(range.min);
  const max = parseFloat(range.max);
  if (!Number.isNaN(min) && num < min) return "DOWN";
  if (!Number.isNaN(max) && num > max) return "UP";
  return "";
}

export function formatRange(refRange, gender) {
  const range = resolveRange(refRange, gender);
  if (!range) return "";
  const { min, max, unit } = range;
  if (min != null && max != null && min !== "" && max !== "") {
    return `${min} – ${max}${unit ? ` ${unit}` : ""}`;
  }
  return "";
}

// Filter results to only the most recent date entry.
export function latestDateResults(results) {
  if (!results || results.length === 0) return [];
  const sorted = [...results].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latest = sorted[0]?.date?.slice(0, 10);
  if (!latest) return results;
  return sorted.filter((e) => e.date && e.date.startsWith(latest));
}

// Summarise a patient's saved results for the listing row:
// distinct test names with a value, the categories/specimens touched, fill status.
export function summariseResults(results) {
  const tests = new Set();
  const specimens = new Set();
  const reports = new Set();
  (results || []).forEach((entry) => {
    (entry.inputs || []).forEach((input) => {
      if (!input?.testName || input.testName === "Remarks") return;
      const hasValue = input.value != null && String(input.value).trim() !== "";
      if (!hasValue) return;
      tests.add(input.testName.trim());
      if (input.reportName) {
        reports.add(input.reportName.trim());
        specimens.add(specimenForReport(input.reportName));
      }
    });
  });
  const testNames = Array.from(tests);
  return {
    count: testNames.length,
    testNames,
    specimens: Array.from(specimens),
    reports: Array.from(reports),
    status: testNames.length > 0 ? "filled" : "empty",
  };
}

export const todayISO = () => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const testKey = (reportName, testName) => `${reportName}|||${testName}`;
