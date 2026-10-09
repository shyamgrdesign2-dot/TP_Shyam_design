import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import DonutWithLegend from "../charts/DonutWithLegend";
import { BarChartZ } from "../charts/EmptyAware";
import TrendTile from "./TrendTile";
import { WEEK_LABELS } from "../charts/scaffolds";
import { isMonthScoped } from "../filters/periods";
import useGrowData from "../data/useGrowData";
import useCapabilities from "../data/useCapabilities";
import KpiRow from "./KpiRow";

// Grow has no sub-tabs (user ruling): one combined view covering follow-ups
// and ABDM/ABHA together. ABHA cards only render for ABDM-enabled accounts
// (profile `abhaEnable`, spec §1.7).
export default function GrowSection({ filters }) {
  const caps = useCapabilities();
  const { loading, kpis, followups, fuByDoctor, abhaLinkage, abhaTrend } = useGrowData({
    month: filters?.month,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <KpiRow title="Key metrics" kpis={[]} loading />
        <div className="da-chart-grid">
          <Skeleton variant="rectangular" height={320} radius={16} />
          <Skeleton variant="rectangular" height={320} radius={16} />
          <Skeleton variant="rectangular" height={320} radius={16} />
        </div>
      </div>
    );
  }

  const visibleKpis = caps.abdm ? kpis : kpis.filter((k) => !/abha/i.test(k.key));

  // Kept vs missed — derived live from the follow-up totals the KPIs use
  const advised = kpis.find((k) => k.key === "followups")?.value || 0;
  const kept = kpis.find((k) => k.key === "fuKept")?.value || 0;
  const keptMissed = [
    { label: "Kept", value: kept },
    { label: "Missed", value: Math.max(advised - kept, 0) },
  ];

  // Correlation rule: weekly trend cards hide under sub-month ranges
  const monthScoped = isMonthScoped(filters?.startDate, filters?.endDate);
  const showFuTrend = monthScoped;
  const showAbha = caps.abdm;
  const showAbhaTrend = showAbha && monthScoped && !!abhaTrend;
  const tileCount = (showFuTrend ? 1 : 0) + 2 + (showAbha ? 1 : 0) + (showAbhaTrend ? 1 : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={visibleKpis} loading={false} />

      {/* One clustered grid — no per-topic section headers */}
      <SectionBlock title="More insights" count={tileCount}>
        <ChartGrid>
          {showFuTrend && (
            <TrendTile
              title="Follow-ups over time"
              subtitle="Per week, current calendar month"
              icon="chart-3"
              titleTooltip="Follow-ups advised vs actually kept, per week of the current calendar month. This card is month-based until the backend serves range-based buckets."
              data={followups?.data}
              series={followups?.series}
              fallbackLabels={WEEK_LABELS}
              fallbackSeries={[
                { key: "advised", label: "Advised" },
                { key: "kept", label: "Kept" },
              ]}
              height={260}
            />
          )}

          {true && (
            <ChartTile title="Kept vs missed" subtitle="Advised follow-ups, selected period" icon="calendar-tick" titleTooltip="Of the follow-ups doctors advised, how many patients actually kept vs missed">
              <DonutWithLegend data={keptMissed} centerLabel="Advised" height={240} />
            </ChartTile>
          )}

          <ChartTile title="Follow-ups by doctor" subtitle="Advised vs kept, selected period" icon="profile-2user" titleTooltip="Which doctors advise the most follow-ups and how many are kept. Zero until the backend serves the per-doctor split.">
            <MaybeScroll count={fuByDoctor?.data?.length}>
              <BarChartZ
                data={fuByDoctor?.data}
                series={fuByDoctor?.series}
                fallbackLabels={["Dr A", "Dr B", "Dr C"]}
                fallbackSeries={[
                  { key: "Advised", label: "Advised" },
                  { key: "Kept", label: "Kept" },
                ]}
                height={240}
              />
            </MaybeScroll>
          </ChartTile>

          {showAbha && (
            <ChartTile title="ABHA linkage" subtitle="All registered patients, as of today" icon="cards-heart" titleTooltip="ABHA verification and linkage status of your whole patient base. This is a point-in-time snapshot, not filtered by the date range.">
              <DonutWithLegend data={abhaLinkage} centerLabel="Patients" height={240} />
            </ChartTile>
          )}

          {showAbhaTrend && (
            <TrendTile
              title="ABHA enrolments"
              subtitle="Linkage trend over time"
              icon="chart-3"
              titleTooltip="New ABHA linkages over time"
              data={abhaTrend?.data}
              series={abhaTrend?.series}
              fallbackLabels={WEEK_LABELS}
              fallbackSeries={[{ key: "Linked", label: "Linked" }]}
              height={260}
            />
          )}
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}

