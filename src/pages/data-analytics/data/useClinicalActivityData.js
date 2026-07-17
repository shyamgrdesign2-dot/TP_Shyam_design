import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";
import { toNum, pctDelta } from "./deltaUtils";

export default function useClinicalActivityData({ startDate, endDate, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: defaultKpis(),
    notesByType: [],
    otByDoctor: null,
    anaesthesiaMix: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const payload = await ApiReporting.ipdClinical(params).catch(() => null);
    const src = payload?.data ?? payload ?? {};

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src.kpis),
      notesByType: anyToDonut(src.notesByType),
      otByDoctor: src.otByDoctor ? compactXY(seriesToXY(src.otByDoctor), compactDoctorLabel) : null,
      anaesthesiaMix: anyToDonut(src.anaesthesiaMix),
    });
  }, [startDate, endDate, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(raw) {
  if (!raw) return defaultKpis();
  const prev = raw.previous ?? raw.lastPeriod ?? {};
  const hasPrev = prev && (toNum(prev.clinicalNotes) > 0 || toNum(prev.otProcedures) > 0);
  return [
    { key: "clinicalNotes", label: "Clinical notes", kind: "number", value: toNum(raw.clinicalNotes), tooltip: "Total progress and nursing notes documented", ...(hasPrev ? { delta: pctDelta(toNum(raw.clinicalNotes), toNum(prev.clinicalNotes)) } : {}) },
    { key: "otProcedures", label: "OT procedures", kind: "number", value: toNum(raw.otProcedures), tooltip: "Surgical procedures performed in the operation theatre", ...(hasPrev ? { delta: pctDelta(toNum(raw.otProcedures), toNum(prev.otProcedures)) } : {}) },
    { key: "dischargeSummaries", label: "Discharge summaries", kind: "number", value: toNum(raw.dischargeSummaries), tooltip: "Number of discharge summary documents completed", ...(hasPrev ? { delta: pctDelta(toNum(raw.dischargeSummaries), toNum(prev.dischargeSummaries)) } : {}) },
    { key: "labResults", label: "Lab results", kind: "number", value: toNum(raw.labResults), tooltip: "Lab results recorded for admitted patients in the selected period", ...(hasPrev ? { delta: pctDelta(toNum(raw.labResults), toNum(prev.labResults)) } : {}) },
  ];
}

function defaultKpis() {
  return [
    { key: "clinicalNotes", label: "Clinical notes", kind: "number", value: 0, tooltip: "Total progress and nursing notes documented" },
    { key: "otProcedures", label: "OT procedures", kind: "number", value: 0, tooltip: "Surgical procedures performed in the operation theatre" },
    { key: "dischargeSummaries", label: "Discharge summaries", kind: "number", value: 0, tooltip: "Number of discharge summary documents completed" },
    { key: "labResults", label: "Lab results", kind: "number", value: 0, tooltip: "Lab results recorded for admitted patients in the selected period" },
  ];
}
