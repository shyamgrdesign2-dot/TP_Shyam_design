import React, { useMemo } from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ, StackedBarWithTotal } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import useCareData from "../data/useCareData";
import { pctDelta } from "../data/deltaUtils";
import KpiRow from "./KpiRow";

const CDN = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/";
const ICON_BASE = `${CDN}medical/`;
const CERT_ICON = `${CDN}sports2/award-badge5.svg`;
// atom has no bulk build on the CDN — linear is the only variant
const ATOM_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/social/atom.svg";

// The one topic donut every tab (and the Overview mix) shows.
const TOPIC_TILE = {
  diagnosis: { title: "Top diagnoses", icon: `${ICON_BASE}diagnosis.svg`, center: "Visits", data: (d) => d.diagnosis, tooltip: "Diagnoses recorded most often in the selected period, ranked by count" },
  symptoms: { title: "Top symptoms", icon: `${ICON_BASE}virus.svg`, center: "Mentions", data: (d) => d.symptoms, tooltip: "Most commonly reported patient symptoms" },
  examination: { title: "Top examination findings", icon: `${ICON_BASE}medical-service.svg`, center: "Findings", data: (d) => d.examination, tooltip: "Most frequently documented exam findings" },
  medications: { title: "Top medications", icon: `${ICON_BASE}tablets.svg`, center: "Prescribed", data: (d) => d.medications, tooltip: "Most frequently prescribed medications" },
  "lab-tests": { title: "Top investigations", icon: `${ICON_BASE}lab.svg`, center: "Suggested", data: (d) => d.investigations, tooltip: "Lab investigations suggested most often in the selected period" },
  vitals: { title: "What\u2019s getting measured", icon: `${CDN}health/checked-list.svg`, center: "Recordings", data: (d) => d.vitals || [], tooltip: "Which vital signs are captured most often in the selected period" },
  "medical-history": { title: "Top conditions", icon: `${ICON_BASE}health-care.svg`, center: "Patients", data: (d) => d.conditions, tooltip: "Most common chronic and past conditions" },
  advice: { title: "Top advice given", icon: `${ICON_BASE}health-care.svg`, center: "Given", data: (d) => d.advice, tooltip: "Most frequently given patient advice" },
  vaccines: { title: "Top vaccines given", icon: `${ICON_BASE}injection.svg`, center: "Doses", data: (d) => d.vaccines.given, tooltip: "Vaccines administered most often in the selected period" },
  certificates: { title: "Top certificates issued", icon: CERT_ICON, center: "Issued", data: (d) => d.certificates.top, tooltip: "Certificate types issued most often in the selected period" },
  "custom-modules": { title: "Models by type", icon: ATOM_ICON, center: "Models", data: (d) => d.customModels.modelsByType, tooltip: "Custom clinical models split by type — an all-time snapshot (template usage is not tracked)" },
};

export default function CareSection({ filters, subTab = "all" }) {
  const data = useCareData({
    month: filters?.month,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
    subTab,
  });

  const kpis = useMemo(() => buildKpis(subTab, data), [subTab, data]);
  const tiles = useMemo(() => buildTiles(subTab, data), [subTab, data]);

  if (data.loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <KpiRow title="Key metrics" kpis={[]} loading />
        <div className="da-chart-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={320} radius={16} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <KpiRow title="Key metrics" kpis={kpis} loading={false} />

      {/* Everything visual lives in ONE clustered grid — no per-topic
          section headers (they left each row half empty). */}
      <SectionBlock title="More insights" count={tiles.length}>
        <ChartGrid>{tiles}</ChartGrid>
      </SectionBlock>
    </div>
  );
}

const CHART_H = 240;

function donutTile(key, meta, data) {
  return (
    <ChartTile key={key} title={meta.title} subtitle="Selected period" iconUrl={meta.icon} titleTooltip={meta.tooltip}>
      <DonutWithLegend data={meta.data(data)} centerLabel={meta.center} height={CHART_H} />
    </ChartTile>
  );
}

// Charts per tab. Overview = every topic donut in one grid; a detail tab =
// its topic donut + prototype extras + the topic trend (trend only when the
// backend serves a range-aware series).
function buildTiles(subTab, data) {
  const HIDDEN_TOPICS = new Set(["diagnosis", "symptoms", "examination", "medical-history", "custom-modules", "certificates"]);
  if (subTab === "all" || !TOPIC_TILE[subTab]) {
    return Object.entries(TOPIC_TILE)
      .filter(([key]) => !HIDDEN_TOPICS.has(key))
      .map(([key, meta]) => donutTile(key, meta, data));
  }

  const tiles = [donutTile(subTab, TOPIC_TILE[subTab], data)];

  const donut = (key, title, subtitle, iconUrl, tooltip, list, center) =>
    tiles.push(
      <ChartTile key={key} title={title} subtitle={subtitle} iconUrl={iconUrl} titleTooltip={tooltip}>
        <DonutWithLegend data={list} centerLabel={center} height={CHART_H} />
      </ChartTile>
    );
  const bar = (key, title, subtitle, iconUrl, tooltip, xy, seriesLabel, fallbackLabels) =>
    tiles.push(
      <ChartTile key={key} title={title} subtitle={subtitle} iconUrl={iconUrl} titleTooltip={tooltip}>
        <MaybeScroll count={xy?.data?.length}>
          <BarChartZ
            data={xy?.data}
            series={xy?.series}
            fallbackLabels={fallbackLabels}
            fallbackSeries={[{ key: "count", label: seriesLabel }]}
            height={CHART_H}
          />
        </MaybeScroll>
      </ChartTile>
    );

  if (subTab === "diagnosis") {
    if (data.diagByDoctor) tiles.push(
      <ChartTile key="diagByDoctor" title="Top diagnoses by doctor" subtitle="Top 5 diagnoses, selected period" iconUrl={`${CDN}health/stethoscope.svg`} titleTooltip="Top 5 most recorded diagnoses broken down by doctor">
        <MaybeScroll count={data.diagByDoctor?.data?.length}>
          <StackedBarWithTotal data={data.diagByDoctor?.data} series={data.diagByDoctor?.series} xKey="x" height={CHART_H} />
        </MaybeScroll>
      </ChartTile>
    );
  }

  if (subTab === "medications") {
    donut("salts", "Top generics", "Molecule-level, selected period", `${ICON_BASE}clipboard-activity.svg`, "Most prescribed generics (salts) across all brands in the selected period", data.salts, "Prescribed");
    donut("company", "Top manufacturers", "Brand manufacturer split, selected period", `${CDN}ecology/factory.svg`, "How prescriptions split across pharmaceutical companies in the selected period", data.companyShare, "Rx");
    if (data.medsByDoctor) tiles.push(
      <ChartTile key="medsByDoctor" title="Top medications by doctor" subtitle="Top 5 medications, selected period" iconUrl={`${CDN}health/stethoscope.svg`} titleTooltip="Top 5 most prescribed medications broken down by doctor">
        <MaybeScroll count={data.medsByDoctor?.data?.length}>
          <StackedBarWithTotal data={data.medsByDoctor?.data} series={data.medsByDoctor?.series} xKey="x" height={CHART_H} />
        </MaybeScroll>
      </ChartTile>
    );
  }

  if (subTab === "symptoms") {
    bar("sympByDoctor", "Symptoms by doctor", "Selected period", `${ICON_BASE}virus.svg`, "Which doctors record the most symptoms per patient", data.sympByDoctor, "Patients", ["Dr A", "Dr B", "Dr C"]);
  }

  if (subTab === "examination") {
    bar("examByDoctor", "Examinations by doctor", "Selected period", `${ICON_BASE}medical-service.svg`, "Which doctors document the most examination findings", data.examByDoctor, "Patients", ["Dr A", "Dr B", "Dr C"]);
  }

  if (subTab === "lab-tests") {
    if (data.labByDoctor) tiles.push(
      <ChartTile key="labByDoctor" title="Top investigations by doctor" subtitle="Top 5 investigations, selected period" iconUrl={`${CDN}health/stethoscope.svg`} titleTooltip="Top 5 most suggested investigations broken down by doctor">
        <MaybeScroll count={data.labByDoctor?.data?.length}>
          <StackedBarWithTotal data={data.labByDoctor?.data} series={data.labByDoctor?.series} xKey="x" height={CHART_H} />
        </MaybeScroll>
      </ChartTile>
    );
  }

  if (subTab === "advice") {
    if (data.adviceByDoctor) tiles.push(
      <ChartTile key="adviceByDoctor" title="Top advice by doctor" subtitle="Top 5 advice, selected period" iconUrl={`${CDN}health/stethoscope.svg`} titleTooltip="Top 5 most given advice broken down by doctor">
        <MaybeScroll count={data.adviceByDoctor?.data?.length}>
          <StackedBarWithTotal data={data.adviceByDoctor?.data} series={data.adviceByDoctor?.series} xKey="x" height={CHART_H} />
        </MaybeScroll>
      </ChartTile>
    );
  }

  if (subTab === "vitals") {
    donut("bpStages", "Blood pressure stages", "Selected period", `${ICON_BASE}health-condition.svg`, "Readings by BP stage, parsed from the recorded blood pressures", data.bpStages, "Readings");
    bar("bmiBands", "BMI distribution", "Selected period", `${CDN}health/liked-list.svg`, "Patients by BMI band, where height and weight were recorded", data.bmiBands, "Patients", ["<18.5", "18.5-25", "25-30", "30+"]);
    donut("bmiCoverage", "BMI coverage", "% of visits, selected period", `${ICON_BASE}medical-document.svg`, "Share of visits where BMI could be computed (height + weight recorded) vs not", data.bmiCoverage, "%");
    donut("repeatMonitoring", "Repeat monitoring", "Selected period", `${ICON_BASE}heart.svg`, "Patients with a single vitals entry vs repeat entries in the selected period", data.repeatMonitoring, "Patients");
  }

  if (subTab === "medical-history") {
    // Surgical history + additional-notes tiles were REMOVED: the EMR has
    // only 3 medical-history sections (lifestyle/conditions/family) and no
    // surgical or notes source (NO-SOURCE, API-CONTRACTS-CURRENT \u00a74/\u00a77).
    donut("allergies", "Top allergies", "Reported allergies", `${ICON_BASE}health-care.svg`, "Most commonly reported patient allergies", data.allergies, "Patients");
    donut("familyHistory", "Top family history", "Reported family conditions", `${ICON_BASE}health-care.svg`, "Most common conditions in patients\u2019 family history", data.familyHistory, "Patients");
    donut("lifestyle", "Top lifestyle factors", "Reported habits", `${ICON_BASE}health-care.svg`, "Most common lifestyle habits reported", data.lifestyle, "Patients");
  }

  if (subTab === "certificates") {
    bar("certByDoctor", "Certificates by doctor", "Selected period", `${ICON_BASE}medical-service.svg`, "Which doctors issue the most certificates. Zero until the backend serves the split.", data.certificates.byDoctor, "Issued", ["Dr A", "Dr B", "Dr C"]);
  }

  if (subTab === "custom-modules") {
    donut("modelsByDoctor", "Models by doctor", "All-time snapshot", `${ICON_BASE}medical-service.svg`, "Which doctors created the most custom clinical models — an all-time snapshot, not filtered by the date range", data.customModels.modelsByDoctor, "Models");
  }

  if (subTab === "vaccines") {
    donut("brands", "Top vaccine brands", "Doses, selected period", `${CDN}chart/chart-2.svg`, "Vaccine brands administered most often in the selected period", data.vaccines.brandMix, "Doses");
    donut("schedule", "IAP schedule vs others", "Doses, selected period", `${CDN}christmas/calendar3.svg`, "Doses given under the IAP immunisation schedule vs other/custom vaccines, classified on the given-vaccine names", data.vaccScheduleMix, "Doses");
  }

  return tiles;
}

const top = (list) => list?.[0]?.label || "No data";

// Previous-period blocks arrive with endpoint-specific field names — read the
// first one that carries a real number, then emit { delta } only when the
// previous window had volume (pctDelta guards the zero baseline).
function deltaVs(current, prev, keys) {
  if (!prev || typeof prev !== "object") return {};
  for (const k of keys) {
    const n = Number(prev[k]);
    if (Number.isFinite(n) && prev[k] != null) {
      const d = pctDelta(current, n);
      return d == null ? {} : { delta: d };
    }
  }
  return {};
}

// KPI doctrine (user ruling): NO "unique/distinct" counters anywhere — the
// headline is always the TOP name, plus patient/entry counts where they exist.
function buildKpis(subTab, data) {
  switch (subTab) {
    case "diagnosis":
      return [
        { key: "topDiagnosis", label: "Top diagnosis", kind: "text", value: top(data.diagnosis), tooltip: "Most recorded diagnosis in the selected period" },
        { key: "patientsDiagnosed", label: "Patients with diagnosis", kind: "number", value: sumDonut(data.diagnosis), tooltip: "Patients who received a diagnosis in the selected period", ...deltaVs(sumDonut(data.diagnosis), data.diagPrev, ["patientsDiagnosed", "patientsWith", "patients", "count", "total"]) },
      ];
    case "symptoms":
      return [
        { key: "topSymptom", label: "Top symptom", kind: "text", value: top(data.symptoms), tooltip: "Symptom reported most often in the selected period" },
        { key: "totalSxMentions", label: "Symptom entries", kind: "number", value: sumDonut(data.symptoms), tooltip: "Symptom entries recorded across visits in the selected period", ...deltaVs(sumDonut(data.symptoms), data.symptomPrev, ["entries", "mentions", "total", "count"]) },
        { key: "patientsWithSymptoms", label: "Patients with symptoms", kind: "number", value: data.symptomPatients, tooltip: "Patients with at least one recorded symptom in the selected period", ...deltaVs(data.symptomPatients, data.symptomPrev, ["patientsWithSymptoms", "patientsWith", "patients"]) },
      ];
    case "examination": {
      // `entries` is the endpoint's exact count — sumDonut(top-10) undercounts.
      const examCount = data.examEntries || sumDonut(data.examination);
      return [
        { key: "topExamination", label: "Top examination", kind: "text", value: top(data.examination), tooltip: "Most documented examination finding in the selected period" },
        { key: "totalExam", label: "Total examinations", kind: "number", value: examCount, tooltip: "Examination entries documented in the selected period", ...deltaVs(examCount, data.examPrev, ["entries", "total", "count"]) },
        { key: "patientsExamined", label: "Patients examined", kind: "number", value: data.examPatients, tooltip: "Patients with at least one examination entry in the selected period", ...deltaVs(data.examPatients, data.examPrev, ["patientsExamined", "patients"]) },
      ];
    }
    case "medications":
      return [
        { key: "topMedication", label: "Top medication", kind: "text", value: top(data.medications), tooltip: "Most prescribed medicine in the selected period" },
        { key: "totalRxPrescribed", label: "Total prescribed", kind: "number", value: sumDonut(data.medications), tooltip: "Medication line items prescribed in the selected period", ...deltaVs(sumDonut(data.medications), data.rxPrev, ["entries", "prescribed", "total", "count"]) },
        { key: "drugsPerRx", label: "Drugs per prescription", kind: "number", value: data.drugsPerRx, approx: true, tooltip: "Average medicine count per prescription in the selected period" },
      ];
    case "lab-tests":
      return [
        { key: "topInvestigation", label: "Top investigation", kind: "text", value: top(data.investigations), tooltip: "Most suggested lab investigation in the selected period" },
        { key: "totalLabs", label: "Suggested investigations", kind: "number", value: sumDonut(data.investigations), tooltip: "Lab investigations suggested in the selected period", ...deltaVs(sumDonut(data.investigations), data.labPrev, ["entries", "suggested", "total", "count"]) },
        { key: "consultsWithTest", label: "Consults with investigation", kind: "percent", value: data.labCoveragePct, tooltip: "Share of consultations where at least one investigation was suggested" },
      ];
    case "vitals":
      return [
        { key: "topVital", label: "Top vital", kind: "text", value: top(data.vitals || []), tooltip: "Vital sign captured most often in the selected period" },
        { key: "totalVitals", label: "Total recordings", kind: "number", value: sumDonut(data.vitals || []), tooltip: "Vital sign measurements captured in the selected period" },
      ];
    case "medical-history":
      return [
        { key: "topCondition", label: "Top medical condition", kind: "text", value: top(data.conditions), tooltip: "Most common medical condition in the selected period" },
        { key: "topAllergy", label: "Top allergy", kind: "text", value: top(data.allergies), tooltip: "Most commonly reported allergy" },
        { key: "topFamilyHistory", label: "Top family history", kind: "text", value: top(data.familyHistory), tooltip: "Most common family-history condition" },
        { key: "topLifestyle", label: "Top lifestyle factor", kind: "text", value: top(data.lifestyle), tooltip: "Most common lifestyle factor reported" },
        { key: "patientsWithHistory", label: "Patients with history", kind: "number", value: sumDonut(data.conditions), tooltip: "Patients with at least one medical history entry" },
      ];
    case "advice": {
      const adviceCount = data.adviceEntries || sumDonut(data.advice);
      return [
        { key: "topAdvice", label: "Top advice", kind: "text", value: top(data.advice), tooltip: "Advice given most often in the selected period" },
        { key: "totalAdvice", label: "Total advice given", kind: "number", value: adviceCount, tooltip: "Advice entries documented across visits", ...deltaVs(adviceCount, data.advicePrev, ["entries", "total", "count"]) },
        { key: "patientsAdvised", label: "Patients advised", kind: "number", value: data.advicePatients, tooltip: "Patients who received at least one advice entry in the selected period", ...deltaVs(data.advicePatients, data.advicePrev, ["patientsAdvised", "patients"]) },
      ];
    }
    case "vaccines": {
      const vp = data.vaccines.prev;
      return [
        { key: "topVaccine", label: "Top vaccine", kind: "text", value: top(data.vaccines.given), tooltip: "Vaccine administered most often in the selected period" },
        { key: "dosesAdministered", label: "Doses administered", kind: "number", value: data.vaccines.doses, tooltip: "Vaccine doses given in the selected period", ...(vp ? { delta: pctDelta(data.vaccines.doses, vp.doses) } : {}) },
        { key: "vaccPatients", label: "Patients vaccinated", kind: "number", value: data.vaccines.patients, tooltip: "Patients who received at least one dose in the selected period", ...(vp ? { delta: pctDelta(data.vaccines.patients, vp.patients) } : {}) },
      ];
    }
    case "certificates":
      return [
        { key: "topCertType", label: "Top certificate", kind: "text", value: top(data.certificates.top), tooltip: "Certificate type issued most often in the selected period" },
        { key: "certificatesIssued", label: "Certificates issued", kind: "number", value: data.certificates.issued, tooltip: "Certificates issued in the selected period", ...deltaVs(data.certificates.issued, data.certificates.prev, ["totalIssued", "issued", "total", "count"]) },
        { key: "topIssuingDoctor", label: "Top issuing doctor", kind: "text", value: data.certificates.topDoctor || "No data", tooltip: "Doctor who issued the most certificates in the selected period" },
        { key: "totalPatientCerts", label: "Patients certified", kind: "number", value: data.certificates.patientsCertified, tooltip: "Distinct patients who received a certificate. Zero until the backend serves it." },
      ];
    case "custom-modules":
      // All-time snapshot (the backend has no usage/reuse tracking)
      return [
        { key: "topModelType", label: "Top model type", kind: "text", value: top(data.customModels.modelsByType), tooltip: "Most common custom model type — an all-time snapshot" },
        { key: "customModulesCreated", label: "Models created", kind: "number", value: data.customModels.created, tooltip: "Custom clinical models created — an all-time snapshot, not filtered by the date range" },
        { key: "creatingDoctors", label: "Creating doctors", kind: "number", value: Number(data.customModels.creatingDoctors) || 0, tooltip: "Doctors who created at least one custom model — an all-time snapshot" },
      ];
    default:
      // Care Overview — the top-name headline row only (user ruling).
      // Symptoms, Examination, and Medical History hidden: backend data-quality
      // issues (see SYMPTOMS-EXAM-HISTORY-DATA-QUALITY.md). Restore when fixed.
      return [
        { key: "topMedication", label: "Top medication", kind: "text", value: top(data.medications), tooltip: "Most prescribed medicine" },
        { key: "topLabTest", label: "Top investigation", kind: "text", value: top(data.investigations), tooltip: "Most suggested lab investigation" },
        { key: "topVital", label: "Top vital", kind: "text", value: top(data.vitals || []), tooltip: "Vital sign captured most often" },
        { key: "topAdvice", label: "Top advice", kind: "text", value: top(data.advice), tooltip: "Advice given most often" },
      ];
  }
}

function sumDonut(data) {
  return (data || []).reduce((a, d) => a + (d.value || 0), 0);
}
