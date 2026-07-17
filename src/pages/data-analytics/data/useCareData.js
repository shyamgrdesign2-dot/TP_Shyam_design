import { useCallback, useEffect, useRef, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { listToDonut, anyToDonut, donutToXY, seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";
import { isMonthScoped } from "../filters/periods";
import { toNum as num, safe, withCategories, singleIdOnly } from "./deltaUtils";
import { cached } from "./apiCache";

// Care data — optimized with request caching and state merging.
// Sub-tab switches within the cache TTL return instantly from cache.
// State is MERGED (not replaced) on sub-tab changes so previously
// loaded tabs keep their data instead of flashing empty.

const IAP_VACCINES = [
  "bcg", "opv", "hep", "hepatitis", "dtwp", "dtap", "dtp", "hib", "ipv",
  "pcv", "rota", "mmr", "measles", "typhoid", "tcv", "varicella", "hpv",
  "td", "tdap", "influenza", "je", "japanese", "mcv", "meningo",
  "pentavalent", "hexavalent", "cholera",
];

export default function useCareData({ month, startDate, endDate, doctorId, clinicId, subTab = "all" } = {}) {
  const [state, setState] = useState(initialState());
  const filterKey = `${month}|${startDate}|${endDate}|${doctorId}|${clinicId}`;
  const prevFilterKey = useRef(filterKey);

  const load = useCallback(async () => {
    // Full filter change → reset everything; sub-tab change → keep existing data
    const filtersChanged = prevFilterKey.current !== filterKey;
    prevFilterKey.current = filterKey;

    setState((s) => ({
      ...(filtersChanged ? initialState() : s),
      loading: true,
      error: null,
    }));

    const params = {};
    if (month) params.month = month;
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    const singleDoctor = singleIdOnly(doctorId);
    const singleClinic = singleIdOnly(clinicId);
    if (singleDoctor) params.doctorId = singleDoctor;
    if (singleClinic) params.clinicId = singleClinic;

    const { clinicId: _c, ...noClinic } = params;
    const { doctorId: _d, ...noDoctor } = params;

    const monthScoped = isMonthScoped(startDate, endDate);
    const trendParams = { months: 3, top: 5 };
    if (singleDoctor) trendParams.doctorId = singleDoctor;
    if (singleClinic) trendParams.clinicId = singleClinic;

    const all = subTab === "all";
    const on = (tab) => all || subTab === tab;

    const [
      diagPayload, sympPayload, labPayload, condPayload, rxPayload,
      vitalsPayload, examPayload, advicePayload, vaccPayload,
      customPayload, certPayload,
      trSymp, trInv, trCond, trMed, trDiag,
    ] = await Promise.all([
      on("diagnosis") ? safe(cached("diag", params, () => ApiReporting.clinicDiagnosis(params))) : null,
      on("symptoms") ? safe(cached("symp", params, () => ApiReporting.clinicalSymptoms(params))) : null,
      on("lab-tests") ? safe(cached("lab", params, () => ApiReporting.clinicalLabTest(params))) : null,
      on("medical-history") ? safe(cached("medHist", params, () => ApiReporting.clinicalMedicalHistory(params))) : null,
      on("medications") ? safe(cached("clinicRx", params, () => ApiReporting.clinicRx(params))) : null,
      on("vitals") ? safe(cached("vitals", noClinic, () => ApiReporting.clinicalVitals(noClinic))) : null,
      on("examination") ? safe(cached("exam", params, () => ApiReporting.clinicalExamination(params))) : null,
      on("advice") ? safe(cached("advice", params, () => ApiReporting.clinicalAdvice(params))) : null,
      on("vaccines") ? safe(cached("vacc", noDoctor, () => ApiReporting.clinicalVaccines(noDoctor))) : null,
      on("custom-modules") ? safe(cached("custom", params, () => ApiReporting.clinicalCustomModels(params))) : null,
      on("certificates") ? safe(cached("cert", params, () => ApiReporting.clinicalCertificates(params))) : null,
      on("symptoms") && monthScoped ? safe(cached("trSymp", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "symptoms" }))) : null,
      on("lab-tests") && monthScoped ? safe(cached("trInv", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "investigations" }))) : null,
      on("medical-history") && monthScoped ? safe(cached("trCond", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "conditions" }))) : null,
      on("medications") && monthScoped ? safe(cached("trMed", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "medications" }))) : null,
      on("diagnosis") && monthScoped ? safe(cached("trDiag", trendParams, () => ApiReporting.clinicalDiagnosisTrends(trendParams))) : null,
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

    // Build a partial state from the endpoints that actually fired
    const patch = { loading: false, error: null };

    if (on("diagnosis")) {
      patch.diagnosis = listToDonut(diag?.topDiagnosis, { labelKey: "name", valueKey: "count" });
      patch.diagPrev = diag?.previous ?? null;
    }
    if (on("symptoms")) {
      patch.symptoms = anyToDonut(symp?.topSymptoms);
      patch.symptomPatients = num(symp?.patientsWithSymptoms ?? symp?.patientsWith);
      patch.symptomPrev = symp?.previous ?? null;
      patch.sympByDoctor = symp?.byDoctor ? compactXY(seriesToXY(symp.byDoctor), compactDoctorLabel) : null;
    }
    if (on("lab-tests")) {
      patch.investigations = dropJunk(anyToDonut(lab?.topInvestigations).map(cleanInvestigation));
      patch.labPrev = lab?.previous ?? null;
      patch.labCoveragePct = num(lab?.coveragePct);
      patch.labByDoctor = lab?.byDoctor ? compactXY(seriesToXY(lab.byDoctor), compactDoctorLabel) : null;
    }
    if (on("medical-history")) {
      patch.conditions = anyToDonut(cond?.topConditions);
      patch.familyHistory = anyToDonut(cond?.topFamilyHistory);
      patch.allergies = anyToDonut(cond?.topAllergies);
      patch.lifestyle = anyToDonut(cond?.topLifestyle);
    }
    if (on("medications")) {
      patch.medications = anyToDonut(rx?.topBrands);
      patch.rxPrev = rx?.previous ?? null;
      patch.salts = anyToDonut(rx?.topSalts);
      patch.companyShare = anyToDonut(rx?.companyShare).map((d) =>
        String(d.label || "").trim() ? d : { ...d, label: "No manufacturer name" }
      );
      patch.catalogVsCustom = withCategories(anyToDonut(rx?.catalogVsCustom), ["Catalog", "Custom"]);
      patch.customByDoctor = rx?.customByDoctor ? compactXY(seriesToXY(rx.customByDoctor), compactDoctorLabel) : null;
      patch.drugsPerRx = num(rx?.drugsPerRx);
    }
    if (on("vitals")) {
      patch.bpStages = anyToDonut(vit?.bpStages);
      patch.bmiBands = donutToXY(vit?.bmiBands, "Patients");
      patch.bmiCoverage = bmiCoveragePct > 0
        ? [{ label: "With BMI", value: bmiCoveragePct }, { label: "Without BMI", value: Math.max(100 - bmiCoveragePct, 0) }]
        : withCategories([], ["With BMI", "Without BMI"]);
      patch.repeatMonitoring = withCategories(anyToDonut(vit?.repeatMonitoring), ["Single", "Repeat"]);
      patch.vitals = anyToDonut(vit?.whatMeasured);
    }
    if (on("examination")) {
      patch.examination = anyToDonut(exam?.topFindings);
      patch.examPatients = num(exam?.patientsExamined);
      patch.examEntries = num(exam?.entries);
      patch.examPrev = exam?.previous ?? null;
      patch.examByDoctor = exam?.byDoctor ? compactXY(seriesToXY(exam.byDoctor), compactDoctorLabel) : null;
    }
    if (on("advice")) {
      patch.advice = dropJunk(anyToDonut(adv?.topAdvice));
      patch.advicePatients = num(adv?.patientsAdvised);
      patch.adviceEntries = num(adv?.entries);
      patch.advicePrev = adv?.previous ?? null;
      patch.adviceByDoctor = adv?.byDoctor ? compactXY(seriesToXY(adv.byDoctor), compactDoctorLabel) : null;
    }
    if (on("vaccines")) {
      patch.vaccines = {
        given: vaccineMix,
        brandMix: anyToDonut(vacc?.brandMix),
        doses: num(vacc?.kpis?.doses),
        patients: num(vacc?.kpis?.patients),
        prev: vacc?.kpis?.previous ?? null,
      };
      patch.vaccScheduleMix = iapScheduleMix(vaccineMix);
    }
    if (on("custom-modules")) {
      patch.customModels = {
        created: num(cust?.createdModels ?? cust?.created),
        creatingDoctors: num(cust?.creatingDoctors),
        modelsByType: anyToDonut(cust?.modelsByType),
        modelsByDoctor: anyToDonut(cust?.modelsByDoctor),
      };
    }
    if (on("certificates")) {
      patch.certificates = {
        issued: num(cert?.totalIssued ?? cert?.issued),
        top: anyToDonut(cert?.topCertificates ?? cert?.topTypes ?? cert?.types),
        topDoctor: cert?.topDoctor || null,
        patientsCertified: num(cert?.patientsCertified),
        byDoctor: cert?.byDoctor ? compactXY(seriesToXY(cert.byDoctor), compactDoctorLabel) : null,
        prev: cert?.previous ?? null,
      };
    }

    // Trends: merge into the existing trends object
    const trendPatch = {};
    if (on("diagnosis")) trendPatch.diagnosis = toTrend((trDiag?.data ?? trDiag)?.trends);
    if (on("symptoms")) trendPatch.symptoms = toTrend((trSymp?.data ?? trSymp)?.trends);
    if (on("lab-tests")) trendPatch["lab-tests"] = toTrend((trInv?.data ?? trInv)?.trends);
    if (on("medical-history")) trendPatch["medical-history"] = toTrend((trCond?.data ?? trCond)?.trends);
    if (on("medications")) trendPatch.medications = toTrend((trMed?.data ?? trMed)?.trends);
    if (on("vaccines")) trendPatch.vaccines = toTrend(vacc?.trend);

    // MERGE with previous state so sub-tab-switch doesn't discard other tabs' data
    setState((prev) => ({
      ...prev,
      ...patch,
      trends: { ...prev.trends, ...trendPatch },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, subTab]);

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
    diagPrev: null,
    symptoms: [],
    symptomPatients: 0,
    symptomPrev: null,
    sympByDoctor: null,
    investigations: [],
    labPrev: null,
    labCoveragePct: 0,
    conditions: [],
    medications: [],
    rxPrev: null,
    vitals: [],
    examination: [],
    examPatients: 0,
    examEntries: 0,
    examPrev: null,
    examByDoctor: null,
    advice: [],
    advicePatients: 0,
    adviceEntries: 0,
    advicePrev: null,
    adviceByDoctor: null,
    vaccines: { given: [], brandMix: [], doses: 0, patients: 0, prev: null },
    customModels: { created: 0, creatingDoctors: 0, modelsByType: [], modelsByDoctor: [] },
    certificates: { issued: 0, top: [], topDoctor: null, patientsCertified: 0, byDoctor: null, prev: null },
    allergies: [],
    lifestyle: [],
    salts: [],
    companyShare: [],
    familyHistory: [],
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

function cleanInvestigation(item) {
  const label = String(item.label || "")
    .replace(/\s*remark\s*:.*$/i, "")
    .replace(/[\s\-–—:;,/]+$/g, "")
    .trim();
  return { ...item, label: label || item.label };
}

function dropJunk(list) {
  return (list || []).filter((d) => /[\p{L}\p{N}]/u.test(String(d.label || "")));
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

