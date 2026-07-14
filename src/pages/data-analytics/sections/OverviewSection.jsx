import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile } from "./ChartLayout";
import TrendTile from "./TrendTile";
import useOverviewData from "../data/useOverviewData";
import useBillingLive from "../data/useBillingLive";
import useAppointmentsLive from "../data/useAppointmentsLive";
import useBillingData from "../data/useBillingData";
import { seriesToXY } from "../charts/adapters";
import DonutWithLegend from "../charts/DonutWithLegend";
import { WEEK_LABELS, dayLabels } from "../charts/scaffolds";
import { isMonthScoped, rangeLengthDays } from "../filters/periods";
import { formatINR } from "../charts/format";
import KpiRow from "./KpiRow";

const CONSULT_SERIES = [
  { key: "last", label: "Last Month" },
  { key: "current", label: "Current Month" },
];

// Money KPIs come from the SAME live billing source Billing uses, so Overview
// never disagrees with the deep-dive sections. Insertion order below is the
// display order of the money row.
const OVERVIEW_MONEY_KEYS = {
  collected: { label: "Total collected", tooltip: "Payments received in the selected period (same source as Billing)" },
  due: { label: "Total due", tooltip: "Amount still outstanding on bills raised in the selected period" },
  refunded: { label: "Total refunded", tooltip: "Bill amounts refunded to patients in the selected period" },
  advance: { label: "Advance received", tooltip: "Advance deposits collected in the selected period" },
  advRefunded: { label: "Advance refunded", tooltip: "Advance deposits returned to patients in the selected period" },
  advDebited: { label: "Advance debited", tooltip: "Advance amounts applied toward bills in the selected period" },
};
const MONEY_ORDER = Object.keys(OVERVIEW_MONEY_KEYS);

export default function OverviewSection({ filters }) {
  const { loading, kpis, weekly, modeMix } = useOverviewData({
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
  });

  const appointments = useAppointmentsLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const billingTrend = useBillingData({ days: filters?.days || 7, department: "opd", doctorId: filters?.doctor, clinicId: filters?.clinic });

  const weeklyXY = seriesToXY(weekly);
  const collectionXY = billingTrend.collectionChart ? seriesToXY(billingTrend.collectionChart) : null;

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

  const moneyKpis = (billing.kpis || [])
    .filter((k) => OVERVIEW_MONEY_KEYS[k.key])
    .map((k) => ({ ...k, ...OVERVIEW_MONEY_KEYS[k.key] }))
    .sort((a, b) => MONEY_ORDER.indexOf(a.key) - MONEY_ORDER.indexOf(b.key));
  // Order: volume → money → mode → clinical highlights (top diagnosis /
  // symptom / medication / medical condition — headline row, detail in Care)
  const merged = [
    ...kpis.filter((k) => k.key === "consultations"),
    ...moneyKpis,
    ...kpis.filter((k) => k.key !== "consultations"),
  ];

  // Correlation rule: week/month-bucketed cards are HIDDEN when the selected
  // range is shorter than a month — a "Past 7 days" filter must never show
  // weekly buckets.
  const monthScoped = isMonthScoped(filters?.startDate, filters?.endDate);
  // A per-day trend needs more than one day (a single point is not a trend)
  const multiDay = rangeLengthDays(filters?.startDate, filters?.endDate) > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={merged} />

      <SectionBlock title="More insights" count={(monthScoped ? 1 : 0) + 2 + (multiDay ? 1 : 0)}>
        <ChartGrid>
          {monthScoped && (
            <TrendTile
              title="Consultations by week"
              subtitle="This calendar month vs last"
              icon="activity"
              titleTooltip="Weekly consultation volume for the current calendar month compared with the previous month"
              data={weeklyXY.data}
              series={weeklyXY.series}
              fallbackLabels={WEEK_LABELS}
              fallbackSeries={CONSULT_SERIES}
              height={260}
            />
          )}

          <ChartTile
            title="Appointment status"
            subtitle="Current status, selected period"
            icon="calendar"
            titleTooltip="Current status of every appointment in the selected period (same source as Appointments)"
          >
            <DonutWithLegend data={appointments.statusDonut} centerLabel="Appointments" height={240} />
          </ChartTile>

          <ChartTile
            title="Consultation mode mix"
            subtitle="Share of consultations, selected period"
            icon="flash"
            titleTooltip="How consultations split across Rx modes (same source as Consult Modes)"
          >
            <DonutWithLegend data={modeMix} centerLabel="Consultations" height={240} />
          </ChartTile>

          {multiDay && (
          <TrendTile
            title="Collection vs refund"
            subtitle="Per day, selected period"
            icon="dollar-circle"
            titleTooltip="Amount collected and amount refunded per day across the selected period (same source as Billing)"
            data={collectionXY?.data}
            series={collectionXY?.series}
            fallbackLabels={dayLabels(7)}
            fallbackSeries={[
              { key: "Collection", label: "Collected" },
              { key: "Refund", label: "Refunded" },
            ]}
            height={260}
            yFormat={formatINR}
          />
          )}
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
