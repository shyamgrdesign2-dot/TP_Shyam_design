import React from "react";
import {
  StatCard,
  TPLibraryIcon,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@dhspl-tatvacare/tesseract-ui";
import { formatINR, formatNum, formatPct } from "../charts/format";
import SectionBlock from "./SectionBlock";

const FORMATTERS = {
  money: formatINR,
  number: formatNum,
  percent: formatPct,
  days: (v) => `${formatNum(v)} days`,
  text: (v) => v,
  currency: formatINR,
};

// Approximate values read as whole numbers: "~1.9 drugs" is false precision —
// round first, then format ("~2"). Percent skips formatPct's fixed decimal
// so it reads "~83%", not "~83.0%".
const approxFormat = (kind) => (v) => {
  const r = Math.round(Number(v) || 0);
  if (kind === "percent") return `~${r}%`;
  return `~${(FORMATTERS[kind] || FORMATTERS.number)(r)}`;
};

const KPI_ICON = {
  consultations: "stethoscope",
  topMode: "flash",
  aiAssisted: "flash",
  mostActiveDoctor: "stethoscope",
  msgCredits: "dollar-circle",
  msgCampaigns: "send-2",
  msgReach: "profile-2user",
  msgScheduled: "timer",
  msgAvgReach: "chart-2",
  aiAdoption: "chart-2",
  returningRate: "profile-tick",
  netFlow: "activity",
  topNoteType: "document-text",
  prescriptions: "document-text",
  followups: "calendar-tick",
  fuKept: "calendar-tick",
  adherence: "chart-2",
  topDiagnosis: "health",
  topSymptoms: "clipboard-text",
  topLabTest: "flask",
  topMedication: "pill",
  followUpAdherence: "chart-2",
  abhaLinkedPercent: "shield-tick",
  collection: "dollar-circle",
  totalBilled: "wallet-3",
  totalCollected: "wallet-check",
  totalDue: "wallet-minus",
  totalRefunded: "wallet-remove",
  advReceived: "money-recive",
  advRefunded: "money-send",
  advDebited: "money-change",
  avgBill: "chart-square",
  revenue: "chart-3",
  refund: "dollar-circle",
  creditNotes: "document",
  footfall: "profile-2user",
  total: "profile-2user",
  onetime: "profile-delete",
  returning: "profile-tick",
  avgAge: "profile-circle",
  booked: "calendar-tick",
  walkins: "login",
  completed: "tick-circle",
  cancelled: "close-circle",
  inQueue: "timer",
  draft: "edit-2",
  pendingDecisions: "edit-2",
  bookedClinic: "building",
  bookedVideo: "video",
  cancellationRate: "chart-2",
  rate: "chart-2",
  inperson: "building",
  video: "video",
  walkin: "login",
  census: "bed",
  admissions: "login",
  discharges: "logout",
  alos: "timer",
  bor: "chart-2",
  adc: "chart-square",
  abha: "shield-tick",
  abhaTotal: "profile-2user",
  abhaLinked: "shield-tick",
  abhaNotLinked: "shield-cross",
  uniqueDx: "health",
  investigations: "flask",
  conditions: "archive-book",
  medications: "pill",
  uniqueSx: "clipboard-text",
  totalSxMentions: "clipboard-text",
  patientsWithSymptoms: "profile-2user",
  patientsExamined: "profile-2user",
  patientsAdvised: "profile-2user",
  uniqueRx: "pill",
  totalRx: "pill",
  uniqueLabs: "flask",
  totalLabs: "flask",
  vitalTypes: "activity",
  totalVitals: "activity",
  uniqueConditions: "archive-book",
  totalConditions: "archive-book",
  certTypes: "medal-star",
  totalCerts: "medal-star",
  uniqueExam: "activity",
  totalExam: "activity",
  uniqueAdvice: "clipboard-text",
  totalAdvice: "clipboard-text",
  vaccGiven: "shield-tick",
  vaccPending: "timer",
  vaccExpected: "calendar-tick",
  vaccTypes: "shield-tick",
  gynecPatients: "profile-2user",
  gynecConditions: "health",
  obsPatients: "profile-2user",
  obsConditions: "calendar-tick",
  uniqueAllergies: "danger",
  uniqueLifestyle: "activity",
  surgicalCount: "health",
  topCondition: "archive-book",
  advanceReceived: "money-recive",
  patientsDiagnosed: "profile-2user",
  diagnosticRecords: "document-text",
  icdCoded: "document-text",
  totalRxPrescribed: "pill",
  avgRxPerVisit: "chart-2",
  customRxRate: "chart-2",
  topInvestigation: "flask",
  consultsWithTest: "stethoscope",
  topProcedure: "health",
  procedurePerPatient: "chart-2",
  patientsWithProcedure: "profile-2user",
  patientsWithHistory: "profile-2user",
  topAllergy: "danger",
  topFamilyHistory: "archive-book",
  topLifestyleHistory: "activity",
  topSurgery: "health",
  avgGynecAge: "profile-circle",
  avgCycleInterval: "timer",
  irregularCyclePct: "chart-2",
  obsRecords: "document-text",
  deliveryEvents: "calendar-tick",
  abortEvents: "close-circle",
  totalMeasurements: "chart-square",
  childrenMeasured: "profile-2user",
  screenEntries: "document-text",
  dosesAdministered: "shield-tick",
  patientsVaccinated: "profile-2user",
  distinctVaccines: "shield-tick",
  customModulesCreated: "document-text",
  creatingDoctors: "stethoscope",
  reuseRate: "chart-2",
  certificatesIssued: "medal-star",
  topCertType: "medal-star",
  distinctCertTypes: "medal-star",
  topIssuingDoctor: "stethoscope",
  totalProcedures: "health",
  uniqueProcedures: "health",
  topTemplate: "document-text",
  totalPatientCerts: "profile-2user",
  contactable: "profile-tick",
  topBloodGroup: "health",
  topMaritalStatus: "profile-2user",
  avgConsultTime: "timer",
  busyDay: "calendar-tick",
  avgVisitsPerDay: "chart-2",
  directWalkins: "login",
  dischargeQueue: "timer",
  avgQueueTime: "timer",
  longestStay: "timer",
  bedsOccupied: "bed",
  bedsAvailable: "bed",
  bedsBlocked: "close-circle",
  occupancy: "chart-2",
  roomShifts: "login",
  readmissions: "login",
  mlcCases: "document-text",
  handovers: "profile-2user",
  clinicalNotes: "document-text",
  otProcedures: "health",
  labResults: "note-2",
  dischargeSummaries: "document-text",
  crossReferrals: "profile-2user",
  smart: "stethoscope",
  voice: "microphone-2",
  tab: "tablet",
  snap: "camera",
  keyboard: "keyboard",
  topSymptom: "clipboard-text",
  topExamination: "activity",
  topVital: "activity",
  topAdvice: "clipboard-text",
  topVaccine: "shield-tick",
  topLifestyle: "activity",
  topGynecCondition: "health",
  topObstetricEvent: "calendar-tick",
  drugsPerRx: "pill",
};

const CUSTOM_ICON_URL = {
  topMode: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-clipboard.svg",
  aiAssisted: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-clipboard.svg",
  smart: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-clipboard.svg",
  voice: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-microphone.svg",
  tab: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-cellphone.svg",
  snap: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-camera.svg",
  keyboard: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-mouse-square.svg",
  billed: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/receipt-item.svg",
  collected: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-recive.svg",
  due: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/business/activity.svg",
  outstanding: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/business/activity.svg",
  refunded: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-send.svg",
  creditNotes: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/content-edit/bill.svg",
  advance: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-recive.svg",
  advRefunded: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-send.svg",
  advDebited: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-send.svg",
  avgBill: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/content-edit/bill.svg",
  footfall: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-2user.svg",
  completed: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/arrow/clipboard-check.svg",
  inQueue: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/time/clock.svg",
  pendingDecisions: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/ai/ai-clipboard.svg",
  cancelled: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/content-edit/clipboard-close.svg",
  bookedClinic: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/hospital-building-4.svg",
  inperson: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/building/hospital.svg",
  video: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/real-state/video.svg",
  cancellationRate: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/content-edit/clipboard-close.svg",
  avgVisitsPerDay: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/chart/right-chart.svg",
  busyDay: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/time/calendar-2.svg",
};

const MED_BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/";
const CERT_BADGE_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/sports2/award-badge5.svg";
// atom has no bulk build on the CDN — linear is the only variant
const ATOM_LINEAR_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/social/atom.svg";
const MEDICAL_ICON_URL = {
  topExamination: `${MED_BASE}medical-service.svg`,
  topVital: `${MED_BASE}heart-rate.svg`,
  topAdvice: `${MED_BASE}medical-service.svg`,
  topVaccine: `${MED_BASE}injection.svg`,
  topLifestyle: `${MED_BASE}health-care.svg`,
  topFamilyHistory: `${MED_BASE}health-care.svg`,
  topSurgery: `${MED_BASE}health-care.svg`,
  topGynecCondition: `${MED_BASE}gynec.svg`,
  topObstetricEvent: `${MED_BASE}obstetric.svg`,
  drugsPerRx: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/clipboard-activity.svg",
  topDiagnosis: `${MED_BASE}diagnosis.svg`,
  topSymptom: `${MED_BASE}virus.svg`,
  topSymptoms: `${MED_BASE}virus.svg`,
  topMedication: `${MED_BASE}tablets.svg`,
  topLabTest: `${MED_BASE}lab.svg`,
  topCondition: `${MED_BASE}health-care.svg`,
  topInvestigation: `${MED_BASE}lab.svg`,
  uniqueDx: `${MED_BASE}diagnosis.svg`,
  patientsDiagnosed: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-2user.svg",
  icdCoded: `${MED_BASE}diagnosis.svg`,
  uniqueSx: `${MED_BASE}virus.svg`,
  totalSxMentions: `${MED_BASE}virus.svg`,
  totalSx: `${MED_BASE}virus.svg`,
  uniqueExam: `${MED_BASE}medical-service.svg`,
  totalExam: `${MED_BASE}medical-service.svg`,
  totalRxPrescribed: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/stationery/writing.svg",
  uniqueRx: `${MED_BASE}tablets.svg`,
  avgRxPerVisit: `${MED_BASE}tablets.svg`,
  medications: `${MED_BASE}tablets.svg`,
  totalLabs: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/test-tube-02.svg",
  uniqueLabs: `${MED_BASE}lab.svg`,
  investigations: `${MED_BASE}lab.svg`,
  vitalTypes: `${MED_BASE}heart-rate.svg`,
  totalVitals: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/clipboard-activity.svg",
  uniqueConditions: `${MED_BASE}health-care.svg`,
  conditions: `${MED_BASE}health-care.svg`,
  patientsWithHistory: `${MED_BASE}health-care.svg`,
  uniqueAllergies: `${MED_BASE}health-care.svg`,
  uniqueLifestyle: `${MED_BASE}health-care.svg`,
  surgicalCount: `${MED_BASE}health-care.svg`,
  uniqueAdvice: `${MED_BASE}medical-service.svg`,
  totalAdvice: `${MED_BASE}health-care.svg`,
  vaccGiven: `${MED_BASE}injection.svg`,
  dosesAdministered: `${MED_BASE}beat-2.svg`,
  patientsVaccinated: `${MED_BASE}injection.svg`,
  distinctVaccines: `${MED_BASE}injection.svg`,
  vaccPending: `${MED_BASE}injection.svg`,
  topProcedure: `${MED_BASE}surgical-scissors-02.svg`,
  totalProcedures: `${MED_BASE}surgical-scissors-02.svg`,
  uniqueProcedures: `${MED_BASE}surgical-scissors-02.svg`,
  certificatesIssued: CERT_BADGE_ICON,
  topCertType: CERT_BADGE_ICON,
  distinctCertTypes: CERT_BADGE_ICON,
  customModulesCreated: ATOM_LINEAR_ICON,
  reuseRate: ATOM_LINEAR_ICON,
  topTemplate: ATOM_LINEAR_ICON,
  gynecPatients: `${MED_BASE}gynec.svg`,
  gynecConditions: `${MED_BASE}gynec.svg`,
  obsPatients: `${MED_BASE}obstetric.svg`,
  obsConditions: `${MED_BASE}obstetric.svg`,
};

function DeltaFooter({ delta, invert = false, note = "vs previous period" }) {
  const up = delta >= 0;
  const good = invert ? delta <= 0 : delta >= 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          padding: "2px 8px 2px 6px",
          borderRadius: "var(--tesseract-radius-full)",
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.4,
          fontVariantNumeric: "tabular-nums",
          background: good
            ? "color-mix(in srgb, var(--tesseract-success-500) 12%, transparent)"
            : "color-mix(in srgb, var(--tesseract-error-500) 10%, transparent)",
          color: good ? "var(--tesseract-success-700)" : "var(--tesseract-error-700)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1, color: "inherit" }}>
          {up ? "↑" : "↓"}
        </span>
        {/* Beyond ±999% the exact figure is noise, not signal */}
        {Math.abs(delta) > 999 ? ">999" : Math.abs(delta)}%
      </span>
      <span style={{ fontSize: 12, color: "var(--tesseract-fg-tertiary, var(--tesseract-slate-400))" }}>
        {note}
      </span>
    </span>
  );
}

function KpiGlyph({ name, kpiKey }) {
  const customUrl = CUSTOM_ICON_URL[kpiKey] || MEDICAL_ICON_URL[kpiKey];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: "var(--tesseract-radius-10)",
        background: "var(--tesseract-violet-100)",
        color: "var(--tesseract-violet-600)",
      }}
    >
      {customUrl ? (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 20,
            height: 20,
            flexShrink: 0,
            backgroundColor: "var(--tesseract-violet-600)",
            WebkitMaskImage: `url(${customUrl})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: `url(${customUrl})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        />
      ) : (
        <TPLibraryIcon name={name} size={20} variant="bulk" color="var(--tesseract-violet-600)" />
      )}
    </span>
  );
}

function InfoTooltip({ text }) {
  if (!text) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 16,
              height: 16,
              cursor: "help",
              opacity: 0.5,
              flexShrink: 0,
            }}
          >
            <TPLibraryIcon name="info-circle" size={14} variant="linear" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" style={{ maxWidth: 240, fontSize: 12, lineHeight: 1.4, color: "var(--tesseract-fg-inverse, #fff)" }}>
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { InfoTooltip };

function KpiRow({ title = "Key metrics", kpis = [], loading = false, columns }) {
  const count = kpis.length || 4;
  return (
    <SectionBlock title={title} count={kpis.length}>
      <div
        style={{
          display: "grid",
          // auto-fit: when there are few cards they stretch to fill the row.
          // `columns` caps how many fit per row (e.g. Patients uses 3).
          gridTemplateColumns: columns
            ? `repeat(auto-fit, minmax(max(200px, calc(${Math.floor(100 / columns)}% - 12px)), 1fr))`
            : "repeat(auto-fit, minmax(max(200px, calc(25% - 9px)), 1fr))",
          gap: 12,
        }}
      >
        {loading
          ? Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={96} radius={16} />
            ))
          : kpis.map((k) => {
          const isDisabled = !!k.disabled;
          const hasDelta = !isDisabled && typeof k.delta === "number" && Number.isFinite(k.delta);
          const isNoData = !isDisabled && k.kind === "text" && (!k.value || k.value === "No data");
          return (
            <StatCard
              key={k.key}
              label={
                k.tooltip ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {k.label}
                    {!isDisabled && <InfoTooltip text={k.tooltip} />}
                  </span>
                ) : k.label
              }
              value={isDisabled ? "—" : k.value}
              format={
                isDisabled
                  ? (v) => v
                  : k.approx
                    ? approxFormat(k.kind)
                    : FORMATTERS[k.kind] || FORMATTERS.number
              }
              showSparkline={false}
              icon={<KpiGlyph name={KPI_ICON[k.key] || "chart-square"} kpiKey={k.key} />}
              iconPosition="right"
              className={`da-kpi-card${isNoData ? " da-kpi-nodata" : ""}${isDisabled ? " da-kpi-disabled" : ""}`}
              {...(hasDelta ? { footer: <DeltaFooter delta={k.delta} invert={!!k.invert} /> } : {})}
              {...(isDisabled ? { footer: <span style={{ fontSize: 12, color: "var(--tesseract-fg-tertiary, var(--tesseract-slate-400))" }}>Coming soon</span> } : {})}
            />
          );
        })}
      </div>
    </SectionBlock>
  );
}

export default React.memo(KpiRow);
