import React, { useMemo } from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile } from "./ChartLayout";
import useOverviewData from "../data/useOverviewData";
import useBillingLive from "../data/useBillingLive";
import useAppointmentsLive from "../data/useAppointmentsLive";
import DonutWithLegend from "../charts/DonutWithLegend";
import KpiRow from "./KpiRow";

// Money KPIs come from the SAME live billing source Billing uses, so Overview
// never disagrees with the deep-dive sections. Insertion order below is the
// display order of the money row.
const OVERVIEW_MONEY_KEYS = {
  collected: { label: "Total collected", tooltip: "Payments received in the selected period (same source as Billing)" },
  due: { label: "Total due", tooltip: "Amount still outstanding on bills raised in the selected period" },
  refunded: { label: "Total refunded", tooltip: "Bill amounts refunded to patients in the selected period" },
  advance: { label: "Advance deposited", tooltip: "Advance deposits collected in the selected period" },
};
const MONEY_ORDER = Object.keys(OVERVIEW_MONEY_KEYS);

export default function OverviewSection({ filters }) {
  const { loading, kpis, modeMix, topMedications, genderDistribution } = useOverviewData({
    month: filters?.month,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const billing = useBillingLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    department: "opd",
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
    // Overview only renders money KPIs — do not fan out ≤20 doctor bill calls
    // or fetch collection-summary (Billing chart tiles only).
    includeRevenueByDoctor: false,
    includeCollectionSummary: false,
  });

  const appointments = useAppointmentsLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const moneyKpis = useMemo(
    () =>
      (billing.kpis || [])
        .filter((k) => OVERVIEW_MONEY_KEYS[k.key])
        .map((k) => ({ ...k, ...OVERVIEW_MONEY_KEYS[k.key] }))
        .sort((a, b) => MONEY_ORDER.indexOf(a.key) - MONEY_ORDER.indexOf(b.key)),
    [billing.kpis]
  );

  const merged = useMemo(
    () => [
      ...kpis.filter((k) => k.key === "consultations"),
      ...moneyKpis,
      ...kpis.filter((k) => k.key !== "consultations"),
    ].map(({ delta, invert, ...rest }) => rest),
    [kpis, moneyKpis]
  );

  if (loading || billing.loading || appointments.loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <KpiRow title="Key metrics" kpis={[]} loading />
        <div className="da-chart-grid">
          <Skeleton variant="rectangular" height={320} radius={16} />
          <Skeleton variant="rectangular" height={320} radius={16} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={merged} />

      <SectionBlock title="More insights" count={4}>
        <ChartGrid>
          <ChartTile
            title="Appointment status"
            subtitle="Current status, selected period"
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/business/activity.svg"
            titleTooltip="Current status of every appointment in the selected period (same source as Appointments)"
          >
            <DonutWithLegend data={appointments.statusDonut} centerLabel="Appointments" height={240} colors={["var(--tesseract-blue-400)", "var(--tesseract-violet-400)", "var(--tesseract-warning-400)", "var(--tesseract-error-400)"]} />
          </ChartTile>

          <ChartTile
            title="Consultation mode mix"
            subtitle="Share of consultations, selected period"
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/clipboard-activity.svg"
            titleTooltip="How consultations split across Rx modes (same source as Consult Modes)"
          >
            <DonutWithLegend data={modeMix} centerLabel="Consultations" height={240} />
          </ChartTile>

          <ChartTile
            title="Top medications"
            subtitle="Most prescribed, selected period"
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/tablets.svg"
            titleTooltip="Top 5 most prescribed medications in the selected period (same source as Care)"
          >
            <DonutWithLegend data={topMedications} centerLabel="Medications" height={240} />
          </ChartTile>

          <ChartTile
            title="Gender distribution"
            subtitle="Patients seen, selected period"
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-2user.svg"
            titleTooltip="Gender split of patients seen in the selected period (same source as Patients)"
          >
            <DonutWithLegend data={genderDistribution} centerLabel="Patients" height={240} />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
