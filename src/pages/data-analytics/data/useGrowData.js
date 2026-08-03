import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";
import { toNum, pctDelta, safe, singleIdOnly } from "./deltaUtils";

export default function useGrowData({ month, startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: defaultKpis(),
    followups: null,
    fuByDoctor: null,
    abhaLinkage: [],
    abhaTrend: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    // clinic/followups rejects CSV (400); operational/abha accepts CSV
    const sd = singleIdOnly(doctorId);
    const sc = singleIdOnly(clinicId);

    const monthParams = {};
    if (month) monthParams.month = month;
    if (sd) monthParams.doctorId = sd;
    if (sc) monthParams.clinicId = sc;
    const rangeParams = {};
    if (startDate) rangeParams.startDate = startDate;
    if (endDate) rangeParams.endDate = endDate;
    if (doctorId && doctorId !== "all") rangeParams.doctorId = doctorId;
    if (clinicId && clinicId !== "all") rangeParams.clinicId = clinicId;

    const [followPayload, abhaPayload] = await Promise.all([
      safe(ApiReporting.clinicFollowups(monthParams)),
      safe(ApiReporting.operationalAbha(rangeParams)),
    ]);

    const follow = followPayload?.data ?? followPayload;
    const abha = abhaPayload?.data ?? abhaPayload;

    const datasets = follow?.datasets || [];
    const advisedSet = datasets.find((d) => /advised/i.test(d.label)) || datasets[0];
    const keptSet = datasets.find((d) => /kept/i.test(d.label)) || datasets[1];
    const totalAdvised = (advisedSet?.data || []).reduce((a, v) => a + toNum(v), 0);
    const totalKept = (keptSet?.data || []).reduce((a, v) => a + toNum(v), 0);
    const adherenceRate = totalAdvised > 0 ? (totalKept / totalAdvised) * 100 : 0;

    const linkageData = anyToDonut(abha?.linkage);
    const linkedCount = linkageData.reduce((a, d) => (isLinkedLabel(d.label) ? a + (d.value || 0) : a), 0);
    const totalPatients = linkageData.reduce((a, d) => a + (d.value || 0), 0);

    const abhaTrendData = abha?.trend ? seriesToXY(abha.trend) : null;

    const prevFollow = follow?.previous ?? follow?.lastPeriod ?? {};
    const prevAdvised = (prevFollow?.datasets || []).find((d) => /advised/i.test(d.label));
    const prevKept = (prevFollow?.datasets || []).find((d) => /kept/i.test(d.label));
    const prevTotalAdvised = (prevAdvised?.data || []).reduce((a, v) => a + toNum(v), 0);
    const prevTotalKept = (prevKept?.data || []).reduce((a, v) => a + toNum(v), 0);
    const hasFollowPrev = prevTotalAdvised > 0;

    const prevAbha = abha?.previous ?? abha?.lastPeriod ?? {};
    const prevAbhaLinkage = anyToDonut(prevAbha?.linkage);
    const prevLinkedCount = prevAbhaLinkage.reduce((a, d) => (isLinkedLabel(d.label) ? a + (d.value || 0) : a), 0);
    const prevTotalPatients = prevAbhaLinkage.reduce((a, d) => a + (d.value || 0), 0);
    const hasAbhaPrev = prevTotalPatients > 0;

    setState({
      loading: false,
      error: null,
      kpis: [
        { key: "followups", label: "Follow-ups advised", kind: "number", value: totalAdvised, tooltip: "Total follow-up appointments recommended by doctors", ...(hasFollowPrev ? { delta: pctDelta(totalAdvised, prevTotalAdvised) } : {}) },
        { key: "fuKept", label: "Follow-ups kept", kind: "number", value: totalKept, tooltip: "Follow-up appointments that patients attended", ...(hasFollowPrev ? { delta: pctDelta(totalKept, prevTotalKept) } : {}) },
        { key: "adherence", label: "Follow-up adherence", kind: "percent", value: adherenceRate, tooltip: "Percentage of advised follow-ups that were kept", ...(hasFollowPrev ? { delta: pctDelta(adherenceRate, (prevTotalKept / prevTotalAdvised) * 100) } : {}) },
        { key: "fuMissed", label: "Follow-ups missed", kind: "number", value: Math.max(totalAdvised - totalKept, 0), invert: true, tooltip: "Advised follow-ups that patients did not keep in the selected period", ...(hasFollowPrev ? { delta: pctDelta(Math.max(totalAdvised - totalKept, 0), Math.max(prevTotalAdvised - prevTotalKept, 0)) } : {}) },
        // ABHA kept simple (user ruling): linked vs not linked, nothing more.
        // (Avg follow-up interval removed: not honestly computable today.)
        { key: "abhaLinked", label: "Patients with ABHA linked", kind: "number", value: linkedCount, tooltip: "Patients with a verified ABHA health ID linked", ...(hasAbhaPrev ? { delta: pctDelta(linkedCount, prevLinkedCount) } : {}) },
        { key: "abhaNotLinked", label: "Patients without ABHA", kind: "number", value: Math.max(totalPatients - linkedCount, 0), invert: true, tooltip: "Patients who do not have an ABHA health ID linked yet", ...(hasAbhaPrev ? { delta: pctDelta(Math.max(totalPatients - linkedCount, 0), Math.max(prevTotalPatients - prevLinkedCount, 0)) } : {}) },
      ],
      followups: follow ? seriesToXY(follow) : null,
      fuByDoctor: follow?.byDoctor ? compactXY(seriesToXY(follow.byDoctor), compactDoctorLabel) : null,
      abhaLinkage: linkageData,
      abhaTrend: abhaTrendData,
    });
  }, [month, startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function defaultKpis() {
  return [
    { key: "followups", label: "Follow-ups advised", kind: "number", value: 0, tooltip: "Total follow-up appointments recommended by doctors" },
    { key: "fuKept", label: "Follow-ups kept", kind: "number", value: 0, tooltip: "Follow-up appointments that patients attended" },
    { key: "adherence", label: "Follow-up adherence", kind: "percent", value: 0, tooltip: "Percentage of advised follow-ups that were kept" },
    { key: "abhaLinked", label: "Patients with ABHA linked", kind: "number", value: 0, tooltip: "Patients with a verified ABHA health ID linked" },
    { key: "abhaNotLinked", label: "Patients without ABHA", kind: "number", value: 0, tooltip: "Patients who do not have an ABHA health ID linked yet" },
  ];
}

// "Not linked" must NOT count as linked — a bare /linked/ regex matched it,
// which inflated the linkage rate to a misleading 100%.
function isLinkedLabel(label) {
  const l = String(label || "").toLowerCase();
  return (l.includes("linked") || l.includes("verified")) && !l.includes("not");
}

