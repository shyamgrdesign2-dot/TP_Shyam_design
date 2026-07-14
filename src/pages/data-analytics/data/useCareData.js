import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { listToDonut, anyToDonut, donutToXY, seriesToXY } from "../charts/adapters";
import { isMonthScoped } from "../filters/periods";

// Care data — reconciled to API-CONTRACTS-CURRENT.md (v2.0, deployed on UAT).
//
// What changed vs the specced integration:
//  - startDate/endDate now work on all clinical/* and clinic/{rx,diagnosis}
//    endpoints (range OVERRIDES month; month kept as fallback).
//  - Donuts arrive as ready [{label,value}] arrays on the newer endpoints and
//    as {labels,datasets} series on the older ones → anyToDonut handles both.
//  - clinical/symptoms is FIXED (topSymptoms + patientsWithSymptoms +
//    previous). Symptom severity is WONT-BUILD (no source) — removed.
//  - clinical/vitals reworked: whatMeasured/bpStages/repeatMonitoring/
//    bmiBands donuts + bmiCoverage NUMBER (a %). No clinicId param. No
//    rbsBands (WONT-BUILD).
//  - clinical/vaccines live: kpis{doses,patients,previous} + vaccineMix +
//    brandMix + weekly trend. No doctorId param. scheduleMix stays
//    CLIENT-SIDE (IAP constant over vaccineMix, per contract §7).
//  - clinical/custom-models live: all-time SNAPSHOT {createdModels,
//    creatingDoctors, modelsByType, modelsByDoctor}. No usage/reuse data.
//  - clinical/trends?topic= powers the per-topic trend tiles (monthly, so
//    only fetched when the selected range is month-scoped).
//  - Procedures + gynec/obstetric are WONT-BUILD (procedures: no source;
//    gynec/obstetric live in MongoDB outside this pipeline) — tabs removed.
//  - Diagnosis status enum is Primary/Secondary/Provisional (not
//    Suspected/Confirmed/Ruled out).

// IAP (Indian Academy of Pediatrics) schedule vaccines — used to classify
// vaccineMix into "IAP schedule" vs "Others" client-side.
const IAP_VACCINES = [
  "bcg", "opv", "hep", "hepatitis", "dtwp", "dtap", "dtp", "hib", "ipv",
  "pcv", "rota", "mmr", "measles", "typhoid", "tcv", "varicella", "hpv",
  "td", "tdap", "influenza", "je", "japanese", "mcv", "meningo",
  "pentavalent", "hexavalent", "cholera",
];

export default function useCareData({ month, startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState(initialState());

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (month) params.month = month;
    // Range overrides month server-side (both-or-neither, ≤366d)
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    // Endpoint-specific scoping (contract §3): vitals takes NO clinicId,
    // vaccines takes NO doctorId.
    const { clinicId: _c, ...noClinic } = params;
    const { doctorId: _d, ...noDoctor } = params;

    // Monthly per-topic trends are only honest for month-scoped ranges.
    const monthScoped = isMonthScoped(startDate, endDate);
    const trendParams = { months: 3, top: 5 };
    if (doctorId && doctorId !== "all") trendParams.doctorId = doctorId;
    if (clinicId && clinicId !== "all") trendParams.clinicId = clinicId;

    const safe = (p) => p.then((r) => r).catch(() => null);
    const [
      diagPayload, sympPayload, labPayload, condPayload, rxPayload,
      vitalsPayload, examPayload, advicePayload, vaccPayload,
      customPayload, certPayload,
      trSymp, trInv, trCond, trMed, trDiag,
    ] = await Promise.all([
      safe(ApiReporting.clinicDiagnosis(params)),
      safe(ApiReporting.clinicalSymptoms(params)),
      safe(ApiReporting.clinicalLabTest(params)),
      safe(ApiReporting.clinicalMedicalHistory(params)),
      safe(ApiReporting.clinicRx(params)),
      safe(ApiReporting.clinicalVitals(noClinic)),
      safe(ApiReporting.clinicalExamination(params)),
      safe(ApiReporting.clinicalAdvice(params)),
      safe(ApiReporting.clinicalVaccines(noDoctor)),
      safe(ApiReporting.clinicalCustomModels(params)),
      safe(ApiReporting.clinicalCertificates(params)),
      monthScoped ? safe(ApiReporting.clinicalTrends({ ...trendParams, topic: "symptoms" })) : Promise.resolve(null),
      monthScoped ? safe(ApiReporting.clinicalTrends({ ...trendParams, topic: "investigations" })) : Promise.resolve(null),
      monthScoped ? safe(ApiReporting.clinicalTrends({ ...trendParams, topic: "conditions" })) : Promise.resolve(null),
      monthScoped ? safe(ApiReporting.clinicalTrends({ ...trendParams, topic: "medications" })) : Promise.resolve(null),
      monthScoped ? safe(ApiReporting.clinicalDiagnosisTrends(trendParams)) : Promise.resolve(null),
    ]);

    const diag = diagPayload?.data ?? diagPayload;
    const symp = sympPayload?.data ?? sympPayload;
    const lab = labPayload?.data ?? labPayload;
    const cond = condPayload?.data ?? condPayload;
    const rx = rxPayload?.data ?? rxPayload;
    const vit = vitalsPayload?.data ?? vitalsPayload;
    const exam = examPayload?.data ?? examPayload;
    const adv = advicePayload?.data ?? advicePayload;
    const vacc = vaccPayload?.data ?? vaccPayload;
    const cust = customPayload?.data ?? customPayload;
    const cert = certPayload?.data ?? certPayload;

    const vaccineMix = anyToDonut(vacc?.vaccineMix ?? vacc?.topVaccines);
    const bmiCoveragePct = num(vit?.bmiCoverage);

    setState({
      loading: false,
      error: null,
      diagnosis: listToDonut(diag?.topDiagnosis, { labelKey: "name", valueKey: "count" }),
      symptoms: anyToDonut(symp?.topSymptoms),
      // Severity IS captured at symptom entry (Mild/Moderate/Severe) — the
      // matrix renders zero-filled until the backend ships severityMix (§10).
      symptomSeverity: withCategories(anyToDonut(symp?.severityMix ?? symp?.severity), ["Mild", "Moderate", "Severe"]),
      symptomPatients: num(symp?.patientsWithSymptoms ?? symp?.patientsWith),
      symptomPrev: symp?.previous ?? null,
      investigations: dropJunk(anyToDonut(lab?.topInvestigations).map(cleanInvestigation)),
      conditions: anyToDonut(cond?.topConditions),
      medications: anyToDonut(rx?.topBrands),
      salts: anyToDonut(rx?.topSalts),
      // Medicines with an empty manufacturer field are a real bucket (custom
      // entries mostly) — name it honestly instead of a blank slice.
      companyShare: anyToDonut(rx?.companyShare).map((d) =>
        String(d.label || "").trim() ? d : { ...d, label: "No manufacturer name" }
      ),
      // The Rx pad captures diagnosis status as Suspected/Confirmed/Ruled out
      // (the product's real enum — the backend's "Primary/Secondary/Provisional"
      // is a different column; contested in the contract doc §10).
      diagStatus: withCategories(anyToDonut(diag?.statusMix), ["Suspected", "Confirmed", "Ruled out"]),
      familyHistory: normalizeList(cond?.topFamilyHistory),
      additionalHistory: withCategories(anyToDonut(cond?.additionalHistory), ["With notes", "Without notes"]),
      catalogVsCustom: withCategories(anyToDonut(rx?.catalogVsCustom), ["Catalog", "Custom"]),
      customByDoctor: rx?.customByDoctor ? seriesToXY(rx.customByDoctor) : null,
      drugsPerRx: num(rx?.drugsPerRx),
      labByDoctor: lab?.byDoctor ? seriesToXY(lab.byDoctor) : null,
      bpStages: anyToDonut(vit?.bpStages),
      // bmiBands arrives as a donut list; the chart doctrine renders
      // distributions as vertical bars.
      bmiBands: donutToXY(vit?.bmiBands, "Patients"),
      // bmiCoverage is a NUMBER (percent of visits where BMI was computable)
      bmiCoverage: bmiCoveragePct > 0
        ? [
            { label: "With BMI", value: bmiCoveragePct },
            { label: "Without BMI", value: Math.max(100 - bmiCoveragePct, 0) },
          ]
        : withCategories([], ["With BMI", "Without BMI"]),
      repeatMonitoring: withCategories(anyToDonut(vit?.repeatMonitoring), ["Single", "Repeat"]),
      vitals: anyToDonut(vit?.whatMeasured),
      examination: anyToDonut(exam?.topFindings),
      examPatients: num(exam?.patientsExamined),
      examEntries: num(exam?.entries),
      examPrev: exam?.previous ?? null,
      advice: dropJunk(anyToDonut(adv?.topAdvice)),
      advicePatients: num(adv?.patientsAdvised),
      adviceEntries: num(adv?.entries),
      advicePrev: adv?.previous ?? null,
      vaccines: {
        given: vaccineMix,
        brandMix: anyToDonut(vacc?.brandMix),
        doses: num(vacc?.kpis?.doses),
        patients: num(vacc?.kpis?.patients),
        prev: vacc?.kpis?.previous ?? null,
      },
      // scheduleMix is derived client-side (contract §7): classify each given
      // vaccine against the IAP schedule list.
      vaccScheduleMix: iapScheduleMix(vaccineMix),
      customModels: {
        created: num(cust?.createdModels ?? cust?.created),
        creatingDoctors: num(cust?.creatingDoctors),
        modelsByType: anyToDonut(cust?.modelsByType),
        modelsByDoctor: anyToDonut(cust?.modelsByDoctor),
      },
      certificates: {
        issued: num(cert?.totalIssued ?? cert?.issued),
        top: anyToDonut(cert?.topCertificates ?? cert?.topTypes ?? cert?.types),
        topDoctor: cert?.topDoctor || null,
        patientsCertified: num(cert?.patientsCertified),
        byDoctor: cert?.byDoctor ? seriesToXY(cert.byDoctor) : null,
      },
      allergies: normalizeList(cond?.topAllergies),
      lifestyle: normalizeList(cond?.topLifestyle),
      surgicalHistory: normalizeList(cond?.topSurgicalHistory),
      // Per-topic monthly trends (clinical/trends + diagnosis-trends), only
      // for month-scoped ranges — keyed by Care sub-tab id.
      trends: {
        diagnosis: toTrend((trDiag?.data ?? trDiag)?.trends),
        symptoms: toTrend((trSymp?.data ?? trSymp)?.trends),
        "lab-tests": toTrend((trInv?.data ?? trInv)?.trends),
        "medical-history": toTrend((trCond?.data ?? trCond)?.trends),
        medications: toTrend((trMed?.data ?? trMed)?.trends),
        vaccines: toTrend(vacc?.trend),
      },
    });
  }, [month, startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function initialState() {
  return {
    loading: true,
    error: null,
    diagnosis: [],
    symptoms: [],
    symptomSeverity: [],
    symptomPatients: 0,
    symptomPrev: null,
    investigations: [],
    conditions: [],
    medications: [],
    vitals: [],
    examination: [],
    examPatients: 0,
    examEntries: 0,
    examPrev: null,
    advice: [],
    advicePatients: 0,
    adviceEntries: 0,
    advicePrev: null,
    vaccines: { given: [], brandMix: [], doses: 0, patients: 0, prev: null },
    customModels: { created: 0, creatingDoctors: 0, modelsByType: [], modelsByDoctor: [] },
    certificates: { issued: 0, top: [], topDoctor: null, patientsCertified: 0, byDoctor: null },
    allergies: [],
    lifestyle: [],
    surgicalHistory: [],
    salts: [],
    companyShare: [],
    diagStatus: [],
    familyHistory: [],
    additionalHistory: [],
    catalogVsCustom: [],
    customByDoctor: null,
    drugsPerRx: 0,
    labByDoctor: null,
    bpStages: [],
    bmiBands: null,
    bmiCoverage: [],
    repeatMonitoring: [],
    vaccScheduleMix: [],
    trends: {},
  };
}

// Lab test names arrive with entry remarks appended ("... Remark: //~//").
// Only the investigation name is meaningful — strip everything from "Remark"
// on, plus trailing separators. Backend should return clean names (specced);
// this is defensive.
function cleanInvestigation(item) {
  const label = String(item.label || "")
    .replace(/\s*remark\s*:.*$/i, "")
    .replace(/[\s\-–—:;,/]+$/g, "")
    .trim();
  return { ...item, label: label || item.label };
}

// Free-text sources ship separator-only garbage rows ("//", "-", "~") —
// drop any entry whose label carries no letter or digit.
function dropJunk(list) {
  return (list || []).filter((d) => /[\p{L}\p{N}]/u.test(String(d.label || "")));
}

// Fixed-category donuts always show every category, even at zero.
function withCategories(list, categories) {
  const have = new Map((list || []).map((d) => [String(d.label).toLowerCase(), d]));
  return categories.map((c) => have.get(c.toLowerCase()) || { label: c, value: 0 });
}

function iapScheduleMix(vaccineMix) {
  let iap = 0;
  let others = 0;
  for (const v of vaccineMix || []) {
    const l = String(v.label || "").toLowerCase();
    if (IAP_VACCINES.some((k) => l.includes(k))) iap += v.value || 0;
    else others += v.value || 0;
  }
  return [
    { label: "IAP schedule", value: iap },
    { label: "Others", value: others },
  ];
}

function toTrend(t) {
  return t ? seriesToXY(t) : null;
}

function normalizeList(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.map((v) => ({
    label: v.name || v.label || v.key || v.type || "Unknown",
    value: Number(v.count || v.value || 0),
  }));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
