import React, { useState } from "react";
import { SegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import ApiReporting from "../../../api/services/ApiReporting";
import ReportTable from "../reports/ReportTable";
import SectionBlock from "./SectionBlock";
import KpiRow from "./KpiRow";

// IPD Admissions & Discharges — #22 financial/ipd-reports (admitting/discharged).
// KPIs render zero-state chrome until analytics binds; the report table is live.
const KPIS = [
  { key: "admissions", label: "Total admissions", kind: "number", value: 0 },
  { key: "discharges", label: "Total discharges", kind: "number", value: 0 },
  { key: "alos", label: "~Avg LOS", kind: "days", value: 0 },
  { key: "readmissions", label: "Readmissions", kind: "number", value: 0 },
];

export default function AdmissionsSection({ filters }) {
  const [reportType, setReportType] = useState("admitting");
  const params = {
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    reportType,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={KPIS} />

      <SectionBlock title="Admissions & Discharges" subtitle="Per-admission money and length of stay">
        <div style={{ display: "flex", marginBottom: 4 }}>
          <SegmentedControl
            size="sm"
            theme="primary"
            options={[
              { value: "admitting", label: "Admitting" },
              { value: "discharged", label: "Discharged" },
            ]}
            value={reportType}
            onValueChange={setReportType}
          />
        </div>
        <ReportTable
          fetcher={ApiReporting.financialIpdReports}
          exportFetcher={ApiReporting.exportFinancialIpdReports}
          params={params}
          filename="ipd-reports.csv"
        />
      </SectionBlock>
    </div>
  );
}
