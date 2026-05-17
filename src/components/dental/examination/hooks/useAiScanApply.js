/**
 * useAiScanApply
 *
 * Listens for the DENTAL_AI_SCAN_APPLY_EVENT custom event and applies the
 * incoming AI scan payload (teeth diagnoses, findings, procedures, notes)
 * into the examination chart state.
 *
 * Separated from useDentalCanvasInteraction to keep each file under 800 lines.
 */
import { useEffect, useRef } from "react";
import { ALL_ZONES, getDefaultTreatmentSurfaces } from "../types";
import { DENTAL_AI_SCAN_APPLY_EVENT } from "../../tp-rxpad/dental-ai/dental-ai-events";
import { getTeethForPatientType } from "./useDentalCanvasInteraction";

// Module-level counter — shared with useDentalCanvasInteraction via import
// so finding IDs remain unique across both sources.
let aiScanFindingIdCounter = 0;

/**
 * Allocate a unique key for a treatment-history row inside `acc`.
 * @param {object} acc
 * @param {string} preferredName
 * @returns {string}
 */
function allocateTreatmentHistoryDetailKey(acc, preferredName) {
  const base = (preferredName && String(preferredName).trim()) || "Treatment";
  if (!acc[base]) return base;
  let i = 2;
  while (acc[`${base} (${i})`]) i += 1;
  return `${base} (${i})`;
}

/**
 * Map voice/radiology surface text to chart zone IDs.
 * @param {string} surfaceRaw
 * @param {string} treatmentName
 * @returns {string[]}
 */
function zonesFromAgentHistorySurface(surfaceRaw, treatmentName) {
  const fallback = () => {
    const d = [...getDefaultTreatmentSurfaces(treatmentName)];
    return d.length ? d : ["whole"];
  };
  const raw = (surfaceRaw || "").trim();
  if (!raw || /whole/i.test(raw)) return fallback();
  const s = raw.toLowerCase();
  const pairs = [
    ["occlusal", "occlusal"],
    ["buccal", "buccal"],
    ["labial", "buccal"],
    ["lingual", "lingual"],
    ["palatal", "lingual"],
    ["mesial", "mesial"],
    ["distal", "distal"],
    ["cervical", "cervical"],
    ["incisal", "occlusal"],
    ["root", "root"]
  ];
  for (const [needle, z] of pairs) {
    if (s.includes(needle)) {
      if (z === "whole" || ALL_ZONES.includes(z)) return [z];
      break;
    }
  }
  return fallback();
}

/**
 * @param {{
 *   patientId: string,
 *   patientType: string,
 *   validToothDiag: Set<string>,
 *   validSurfaceFinding: Set<string>,
 *   agentPulseClearTimerRef: React.MutableRefObject,
 *   setPatientType: function,
 *   setToothDiagnoses: function,
 *   setImplantTeeth: function,
 *   setFindingsByTooth: function,
 *   setTreatmentHistoryDetailsByTooth: function,
 *   setAllEntries: function,
 *   setToothNotes: function,
 *   setSelectedTooth: function,
 *   setSelectionScope: function,
 *   setSelectedZone: function,
 *   setViewMode: function,
 *   setAgentApplyPulseFdis: function,
 *   handleSelectTooth: function,
 * }} params
 */
export function useAiScanApply({
  patientId,
  patientType,
  validToothDiag,
  validSurfaceFinding,
  agentPulseClearTimerRef,
  setPatientType,
  setToothDiagnoses,
  setImplantTeeth,
  setFindingsByTooth,
  setTreatmentHistoryDetailsByTooth,
  setAllEntries,
  setToothNotes,
  setSelectedTooth,
  setSelectionScope,
  setSelectedZone,
  setViewMode,
  setAgentApplyPulseFdis,
  handleSelectTooth
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      const detail = e.detail;
      if (!detail || detail.patientId !== patientId) return;
      const {
        teeth,
        focusFdi,
        openFullDentition,
        patientTypeHint,
        highlightFdis
      } = detail;
      if (!Array.isArray(teeth) || teeth.length === 0) return;
      const effectivePatientType =
        patientTypeHint === "adult" ||
        patientTypeHint === "pediatric" ||
        patientTypeHint === "mixed"
          ? patientTypeHint
          : patientType;
      if (
        patientTypeHint === "adult" ||
        patientTypeHint === "pediatric" ||
        patientTypeHint === "mixed"
      ) {
        setPatientType(patientTypeHint);
      }
      setToothDiagnoses((prev) => {
        const next = { ...prev };
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const cur = new Set(next[fdi] || []);
          if (t.implant) cur.add("Implant");
          for (const d of t.diagnoses || []) {
            if (validToothDiag.has(d)) cur.add(d);
          }
          next[fdi] = cur;
        }
        return next;
      });
      setImplantTeeth((prev) => {
        const n = new Set(prev);
        for (const t of teeth) {
          if (t.implant) n.add(String(t.fdi));
        }
        return n;
      });
      setFindingsByTooth((prev) => {
        const next = { ...prev };
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const list = [...(next[fdi] || [])];
          for (const f of t.findings || []) {
            const z = f.zoneId;
            const zoneId =
              z === "whole" || ALL_ZONES.includes(z) ? z : "occlusal";
            const type = validSurfaceFinding.has(f.type) ? f.type : "Staining";
            const notes = (f.notes || "").trim();
            list.push({
              id: `finding-${++aiScanFindingIdCounter}`,
              zoneId,
              type,
              notes: notes || "From AI scan"
            });
          }
          next[fdi] = list;
        }
        return next;
      });
      setTreatmentHistoryDetailsByTooth((prev) => {
        let next = prev;
        let changed = false;
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const rows =
            t.treatmentHistoryRows && t.treatmentHistoryRows.length > 0
              ? t.treatmentHistoryRows
              : (t.treatmentHistory || []).map((line) => ({ name: line }));
          if (!rows.length) continue;
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          const cur = next[fdi] || {};
          const acc = { ...cur };
          for (const row of rows) {
            const baseName =
              (row.name && String(row.name).trim()) || "Treatment";
            const key = allocateTreatmentHistoryDetailKey(acc, baseName);
            const zones = zonesFromAgentHistorySurface(row.surface, baseName);
            const prevD = acc[key];
            const noteMerge = [prevD?.note, row.notes]
              .filter(Boolean)
              .join(", ")
              .trim();
            acc[key] = {
              ...prevD,
              surfaces: zones.length
                ? zones
                : [...getDefaultTreatmentSurfaces(baseName)],
              since:
                (row.since && String(row.since).trim()) || prevD?.since || "",
              note: noteMerge || prevD?.note || ""
            };
          }
          next[fdi] = acc;
        }
        return changed ? next : prev;
      });
      setAllEntries((prev) => {
        const add = [];
        for (const t of teeth) {
          const fdi = String(t.fdi);
          for (const p of t.procedures || []) {
            const name = (p.name && String(p.name).trim()) || "";
            if (!name) continue;
            const noteBits = [
              p.surface && p.surface !== "—" ? p.surface : null,
              p.date,
              p.status,
              p.notes
            ].filter(Boolean);
            add.push({
              id: `agent-proc-${fdi}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              toothFdi: fdi,
              kind: "procedure",
              name,
              surfaces: [...getDefaultTreatmentSurfaces(name)],
              notes: noteBits.length ? noteBits.join(" · ") : undefined
            });
          }
        }
        return add.length ? [...prev, ...add] : prev;
      });
      setToothNotes((prev) => {
        let next = prev;
        let changed = false;
        for (const t of teeth) {
          const note = t.scannerNotes?.trim();
          if (!note) continue;
          const fdi = String(t.fdi);
          const existing = (next[fdi] || "").trim();
          const merged = existing ? `${existing}\n${note}` : note;
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          next[fdi] = merged;
        }
        return changed ? next : prev;
      });

      const schedulePulse = (fdis) => {
        const pulseSet = new Set(fdis.map((fdi) => String(fdi)));
        setAgentApplyPulseFdis(pulseSet);
        if (agentPulseClearTimerRef.current)
          window.clearTimeout(agentPulseClearTimerRef.current);
        agentPulseClearTimerRef.current = window.setTimeout(() => {
          setAgentApplyPulseFdis(new Set());
          agentPulseClearTimerRef.current = null;
        }, 1300);
      };

      const goFullDentition = openFullDentition !== false;
      if (goFullDentition) {
        const source = getTeethForPatientType(effectivePatientType);
        const allFdis = source.map((t) => t.fdi);
        if (allFdis.length > 0) {
          const representative =
            source.find((t) => t.fdi === allFdis[0]) ?? source[0];
          setSelectedTooth(representative);
          setSelectionScope({
            type: "full-mouth",
            id: "FULL",
            label: "Full mouth",
            fdis: allFdis
          });
          setSelectedZone(null);
          setViewMode("dentition");
        }
        const pulseList =
          highlightFdis && highlightFdis.length > 0
            ? highlightFdis
            : teeth.map((t) => String(t.fdi));
        schedulePulse(pulseList);
      } else if (focusFdi) {
        const source = getTeethForPatientType(effectivePatientType);
        const tooth = source.find((x) => x.fdi === String(focusFdi));
        if (tooth) handleSelectTooth(tooth);
        const pulseList =
          highlightFdis && highlightFdis.length > 0
            ? highlightFdis
            : [String(focusFdi)];
        schedulePulse(pulseList);
      }
    };

    window.addEventListener(DENTAL_AI_SCAN_APPLY_EVENT, handler);
    return () => {
      window.removeEventListener(DENTAL_AI_SCAN_APPLY_EVENT, handler);
      if (agentPulseClearTimerRef.current)
        window.clearTimeout(agentPulseClearTimerRef.current);
    };
  }, [
    patientId,
    patientType,
    validToothDiag,
    validSurfaceFinding,
    agentPulseClearTimerRef,
    setPatientType,
    setToothDiagnoses,
    setImplantTeeth,
    setFindingsByTooth,
    setTreatmentHistoryDetailsByTooth,
    setAllEntries,
    setToothNotes,
    setSelectedTooth,
    setSelectionScope,
    setSelectedZone,
    setViewMode,
    setAgentApplyPulseFdis,
    handleSelectTooth
  ]);
}
