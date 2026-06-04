/**
 * useDentalScore — pure scoring logic for the dental examination module.
 * No React, no axios. Imported by ExaminationTab.
 */
import { ZONE_INFO, TEETH, QUADRANT_LABELS } from "../examination/types";

// Score weights per diagnosis/finding severity (out of 100).
export const DIAG_WEIGHT = {
  Missing: 8,
  Implant: 2,
  RCT: 4,
  Crown: 2,
  Bridge: 3,
  Denture: 3
};

export const FINDING_WEIGHT = {
  "Cavity/Caries": 3,
  Crack: 2,
  Fracture: 4,
  Erosion: 2,
  Abrasion: 1,
  Attrition: 1,
  Staining: 0.5,
  Plaque: 0.5,
  Calculus: 1,
  "Restoration Defect": 2,
  NCCL: 1,
  Sensitivity: 1,
  Resorption: 3,
  Recession: 2,
  Normal: 0
};

/**
 * Compute a dental health score (0–100) from the canvas state.
 *
 * @param {object|null} state - Canvas state from DentalCanvas.
 * @returns {{ score: number, rating: string, totalDeduction: number, affectedTeeth: number, breakdown: { diag: number, findings: number } }}
 */
export function computeDentalScore(state) {
  if (!state)
    return {
      score: 100,
      rating: "Excellent",
      totalDeduction: 0,
      affectedTeeth: 0,
      breakdown: { diag: 0, findings: 0 }
    };

  let diag = 0;
  let findings = 0;
  const affected = new Set();

  for (const [fdi, diagSet] of Object.entries(state.toothDiagnoses)) {
    diagSet.forEach((d) => {
      diag += DIAG_WEIGHT[d] ?? 0;
      affected.add(fdi);
    });
  }

  state.implantTeeth.forEach((fdi) => {
    diag += DIAG_WEIGHT.Implant;
    affected.add(fdi);
  });

  for (const [fdi, findingsList] of Object.entries(state.findingsByTooth)) {
    findingsList.forEach((f) => {
      findings += FINDING_WEIGHT[f.type] ?? 0;
      affected.add(fdi);
    });
  }

  const totalDeduction = Math.min(100, Math.round(diag + findings));
  const score = Math.max(0, 100 - totalDeduction);
  const rating =
    score >= 90
      ? "Excellent"
      : score >= 75
      ? "Good"
      : score >= 60
      ? "Fair"
      : score >= 40
      ? "Needs attention"
      : "Poor";

  return {
    score,
    rating,
    totalDeduction,
    affectedTeeth: affected.size,
    breakdown: {
      diag: Math.round(diag),
      findings: Math.round(findings)
    }
  };
}

// ─── Preview snapshot helpers ──────────────────────────────────────────────

function toPreviewLine(title, metaParts) {
  return {
    title: title.trim(),
    metaParts: metaParts.map((part) => (part ?? "").trim()).filter(Boolean)
  };
}

function surfaceList(surfaces) {
  if (!surfaces.length) return "";
  return surfaces
    .map((surface) => ZONE_INFO[surface]?.label ?? surface)
    .join(", ");
}

/**
 * Convert canvas state into structured sections suitable for the preview snapshot.
 *
 * @param {object} state - Canvas state from DentalCanvas.
 * @returns {Array<{ toothLabel: string, treatmentHistory: Array, findings: Array, procedures: Array }>}
 */
export function toDentalPreviewSections(state) {
  const byTooth = new Map();

  const ensureTooth = (fdi) => {
    const existing = byTooth.get(fdi);
    if (existing) return existing;
    const tooth = TEETH.find((item) => item.fdi === fdi);
    const toothLabel = tooth
      ? `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name} (T${fdi})`
      : `Tooth (T${fdi})`;
    const next = {
      toothLabel,
      treatmentHistory: [],
      findings: [],
      procedures: []
    };
    byTooth.set(fdi, next);
    return next;
  };

  Object.entries(state.toothDiagnoses).forEach(([fdi, diagnoses]) => {
    if (!diagnoses.size) return;
    const block = ensureTooth(fdi);
    diagnoses.forEach((diagnosis) => {
      block.treatmentHistory.push(toPreviewLine(diagnosis, []));
    });
  });

  state.implantTeeth.forEach((fdi) => {
    const block = ensureTooth(fdi);
    const exists = block.treatmentHistory.some(
      (row) => row.title.toLowerCase() === "implant"
    );
    if (!exists) {
      block.treatmentHistory.push(toPreviewLine("Implant", []));
    }
  });

  Object.entries(state.findingsByTooth).forEach(([fdi, findings]) => {
    if (!findings.length) return;
    const block = ensureTooth(fdi);
    findings.forEach((finding) => {
      block.findings.push(
        toPreviewLine(finding.type, [
          ZONE_INFO[finding.zoneId]?.label,
          finding.notes
        ])
      );
    });
  });

  state.allEntries.forEach((entry) => {
    const block = ensureTooth(entry.toothFdi);
    const meta = [
      surfaceList(entry.surfaces),
      entry.since,
      entry.plannedDate,
      entry.status,
      entry.notes
    ];

    if (entry.kind === "finding") {
      block.findings.push(toPreviewLine(entry.name, meta));
      return;
    }
    if (entry.kind === "procedure" || entry.kind === "planned") {
      block.procedures.push(toPreviewLine(entry.name, meta));
      return;
    }
    block.treatmentHistory.push(toPreviewLine(entry.name, meta));
  });

  return Array.from(byTooth.values()).filter(
    (section) =>
      section.treatmentHistory.length > 0 ||
      section.findings.length > 0 ||
      section.procedures.length > 0 ||
      Boolean(section.overallToothNote?.trim())
  );
}
