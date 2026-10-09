import { useCallback, useEffect, useRef, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { listToDonut, anyToDonut, donutToXY, seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";
import { isMonthScoped } from "../filters/periods";
import { toNum as num, safe, withCategories, singleIdOnly } from "./deltaUtils";
import { cached } from "./apiCache";
import { getDoctorList } from "./doctorList";

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

const FANOUT_CAP = 20;
const BATCH = 4;

async function buildMedsByDoctor(baseParams, doctorFilterCsv) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (doctorFilterCsv) {
    const wanted = new Set(String(doctorFilterCsv).split(","));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  const results = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH) {
    const batch = doctors.slice(i, i + BATCH);
    const br = await Promise.all(
      batch.map((d) =>
        cached(`rx-dr-${d.um_id}`, baseParams, () =>
          ApiReporting.clinicRx({ ...baseParams, doctorId: d.um_id })
        )
          .then((r) => anyToDonut((r?.data ?? r)?.topBrands))
          .catch(() => [])
      )
    );
    br.forEach((r, j) => { results[i + j] = r; });
  }

  const globalTop = topNLabels(results, 5);
  if (!globalTop.length) return null;

  const order = sortedIndices(doctors, results);
  return {
    labels: order.map((i) => doctors[i].um_name || `Doctor ${doctors[i].um_id}`),
    datasets: globalTop.map((med) => ({
      label: med,
      data: order.map((i) => {
        const hit = (results[i] || []).find((d) => d.label === med);
        return hit?.value || 0;
      }),
    })),
  };
}

async function buildDiagByDoctor(baseParams, doctorFilterCsv) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (doctorFilterCsv) {
    const wanted = new Set(String(doctorFilterCsv).split(","));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  const results = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH) {
    const batch = doctors.slice(i, i + BATCH);
    const br = await Promise.all(
      batch.map((d) =>
        cached(`diag-dr-${d.um_id}`, baseParams, () =>
          ApiReporting.clinicDiagnosis({ ...baseParams, doctorId: d.um_id })
        )
          .then((r) => listToDonut((r?.data ?? r)?.topDiagnosis, { labelKey: "name", valueKey: "count" }))
          .catch(() => [])
      )
    );
    br.forEach((r, j) => { results[i + j] = r; });
  }

  const globalTop = topNLabels(results, 5);
  if (!globalTop.length) return null;

  const order = sortedIndices(doctors, results);
  return {
    labels: order.map((i) => doctors[i].um_name || `Doctor ${doctors[i].um_id}`),
    datasets: globalTop.map((diag) => ({
      label: diag,
      data: order.map((i) => {
        const hit = (results[i] || []).find((d) => d.label === diag);
        return hit?.value || 0;
      }),
    })),
  };
}

async function buildLabByDoctor(baseParams, doctorFilterCsv) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (doctorFilterCsv) {
    const wanted = new Set(String(doctorFilterCsv).split(","));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  const results = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH) {
    const batch = doctors.slice(i, i + BATCH);
    const br = await Promise.all(
      batch.map((d) =>
        cached(`lab-dr-${d.um_id}`, baseParams, () =>
          ApiReporting.clinicalLabTest({ ...baseParams, doctorId: d.um_id })
        )
          .then((r) => dropJunk(anyToDonut((r?.data ?? r)?.topInvestigations).map(cleanInvestigation)))
          .catch(() => [])
      )
    );
    br.forEach((r, j) => { results[i + j] = r; });
  }

  const globalTop = topNLabels(results, 5);
  if (!globalTop.length) return null;

  const order = sortedIndices(doctors, results);
  return {
    labels: order.map((i) => doctors[i].um_name || `Doctor ${doctors[i].um_id}`),
    datasets: globalTop.map((inv) => ({
      label: inv,
      data: order.map((i) => {
        const hit = (results[i] || []).find((d) => d.label === inv);
        return hit?.value || 0;
      }),
    })),
  };
}

async function buildAdviceByDoctor(baseParams, doctorFilterCsv) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (doctorFilterCsv) {
    const wanted = new Set(String(doctorFilterCsv).split(","));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  const results = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH) {
    const batch = doctors.slice(i, i + BATCH);
    const br = await Promise.all(
      batch.map((d) =>
        cached(`advice-dr-${d.um_id}`, baseParams, () =>
          ApiReporting.clinicalAdvice({ ...baseParams, doctorId: d.um_id })
        )
          .then((r) =>
            dropJunk(
              (anyToDonut((r?.data ?? r)?.topAdvice) || []).map((x) => ({
                ...x,
                label: cleanAdviceLabel(x.label),
              }))
            )
          )
          .catch(() => [])
      )
    );
    br.forEach((r, j) => { results[i + j] = r; });
  }

  const globalTop = topNLabels(results, 5);
  if (!globalTop.length) return null;

  const order = sortedIndices(doctors, results);
  return {
    labels: order.map((i) => doctors[i].um_name || `Doctor ${doctors[i].um_id}`),
    datasets: globalTop.map((adv) => ({
      label: adv,
      data: order.map((i) => {
        const hit = (results[i] || []).find((d) => d.label === adv);
        return hit?.value || 0;
      }),
    })),
  };
}

function sortedIndices(doctors, perDoctorDonuts) {
  const indices = doctors.map((_, i) => i);
  const totals = indices.map((i) =>
    (perDoctorDonuts[i] || []).reduce((s, d) => s + (d.value || 0), 0)
  );
  indices.sort((a, b) => totals[b] - totals[a]);
  return indices;
}

function topNLabels(perDoctorDonuts, n) {
  const totals = {};
  for (const donut of perDoctorDonuts) {
    for (const d of donut || []) {
      if (d.label) totals[d.label] = (totals[d.label] || 0) + (d.value || 0);
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label]) => label);
}

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

    // Most clinic/* and clinical/* endpoints reject CSV doctorId/clinicId (400).
    // Use singleIdOnly to pass only single values.
    const sd = singleIdOnly(doctorId);
    const sc = singleIdOnly(clinicId);
    const singleClinic = sc;

    const params = {};
    if (month) params.month = month;
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    if (sd) params.doctorId = sd;
    if (sc) params.clinicId = sc;

    const { clinicId: _c, ...noClinic } = params;
    const { doctorId: _d, ...noDoctor } = params;

    const monthScoped = isMonthScoped(startDate, endDate);
    const trendParams = { months: 3, top: 5 };
    if (sd) trendParams.doctorId = sd;
    if (sc) trendParams.clinicId = sc;

    const all = subTab === "all";
    // Care Overview only renders medications / lab / vitals / advice / vaccines
    // donuts (+ matching KPIs). Detail tabs own the rest — and the ≤20-doctor
    // stacked charts — so "all" must not fan out or prefetch hidden topics.
    const OVERVIEW_TOPICS = new Set(["medications", "lab-tests", "vitals", "advice", "vaccines"]);
    const on = (tab) => (all ? OVERVIEW_TOPICS.has(tab) : subTab === tab);
    const wantByDoctor = !all;

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
      on("symptoms") && !all && monthScoped ? safe(cached("trSymp", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "symptoms" }))) : null,
      on("lab-tests") && !all && monthScoped ? safe(cached("trInv", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "investigations" }))) : null,
      on("medical-history") && !all && monthScoped ? safe(cached("trCond", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "conditions" }))) : null,
      on("medications") && !all && monthScoped ? safe(cached("trMed", trendParams, () => ApiReporting.clinicalTrends({ ...trendParams, topic: "medications" }))) : null,
      on("diagnosis") && !all && monthScoped ? safe(cached("trDiag", trendParams, () => ApiReporting.clinicalDiagnosisTrends(trendParams))) : null,
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
      if (wantByDoctor) {
        const diagBase = { ...(month ? { month } : {}), ...(startDate && endDate ? { startDate, endDate } : {}), ...(singleClinic ? { clinicId: singleClinic } : {}) };
        const diagStacked = await buildDiagByDoctor(diagBase, doctorId && doctorId !== "all" ? doctorId : null);
        patch.diagByDoctor = diagStacked ? compactXY(seriesToXY(diagStacked), compactDoctorLabel) : null;
      }
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
      if (wantByDoctor) {
        const labBase = { ...(month ? { month } : {}), ...(startDate && endDate ? { startDate, endDate } : {}), ...(singleClinic ? { clinicId: singleClinic } : {}) };
        const labStacked = await buildLabByDoctor(labBase, doctorId && doctorId !== "all" ? doctorId : null);
        patch.labByDoctor = labStacked ? compactXY(seriesToXY(labStacked), compactDoctorLabel) : null;
      }
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
      if (wantByDoctor) {
        const medsBase = { ...(month ? { month } : {}), ...(startDate && endDate ? { startDate, endDate } : {}), ...(singleClinic ? { clinicId: singleClinic } : {}) };
        const medsStacked = await buildMedsByDoctor(medsBase, doctorId && doctorId !== "all" ? doctorId : null);
        patch.medsByDoctor = medsStacked ? compactXY(seriesToXY(medsStacked), compactDoctorLabel) : null;
      }
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
      patch.advice = dropJunk(
        (anyToDonut(adv?.topAdvice) || []).map((x) => ({
          ...x,
          label: cleanAdviceLabel(x.label),
        }))
      );
      patch.advicePatients = num(adv?.patientsAdvised);
      patch.adviceEntries = num(adv?.entries);
      patch.advicePrev = adv?.previous ?? null;
      if (wantByDoctor) {
        const advBase = { ...(month ? { month } : {}), ...(startDate && endDate ? { startDate, endDate } : {}), ...(singleClinic ? { clinicId: singleClinic } : {}) };
        const advStacked = await buildAdviceByDoctor(advBase, doctorId && doctorId !== "all" ? doctorId : null);
        patch.adviceByDoctor = advStacked ? compactXY(seriesToXY(advStacked), compactDoctorLabel) : null;
      }
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
    diagByDoctor: null,
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
    medsByDoctor: null,
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
    .replace(/^\/\/\s*/g, "")
    .replace(/\s*\/\/\s*$/g, "")
    .replace(/\s*remark\s*:.*$/i, "")
    .replace(/[\s\-–—:;,/]+$/g, "")
    .trim();
  return { ...item, label: label || item.label };
}

function cleanAdviceLabel(label) {
  // Backend free-text can contain trailing slashes (e.g. "day//"),
  // which makes the UI look like there is an extra separator.
  const s = String(label ?? "");
  const cleaned = s
    // remove leading/trailing whitespace + slash artifacts only at the ends
    .replace(/^\s*\/+\s*/g, "")
    .replace(/\s*\/+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || label;
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

