import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid } from "./ChartLayout";
import TrendTile from "./TrendTile";
import { seriesToXY } from "../charts/adapters";
import { rangeLengthDays } from "../filters/periods";
import { dayLabels } from "../charts/scaffolds";
import useInpatientData from "../data/useInpatientData";
import KpiRow from "./KpiRow";

export default function InpatientOverviewSection({ filters }) {
  const { loading, kpis: rawKpis, flow, census } = useInpatientOverview({
    days: filters?.days || 30,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    clinicId: filters?.clinic,
  });

  if (loading) {
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

  const admissionsKpi = findKpi(rawKpis, "admissions", "Total admissions", "number");
  const dischargesKpi = findKpi(rawKpis, "discharges", "Total discharges", "number");
  const overviewKpis = [
    findKpi(rawKpis, "census", "Current census", "number"),
    admissionsKpi,
    dischargesKpi,
    // Derived: positive = ward filling up, negative = emptying out
    { key: "netFlow", label: "Net patient flow", kind: "number", value: (admissionsKpi.value || 0) - (dischargesKpi.value || 0), tooltip: "Admissions minus discharges in the selected period. Positive means the ward is filling; negative means it is emptying" },
    findKpi(rawKpis, "bor", "Bed occupancy rate", "percent"),
    findKpi(rawKpis, "alos", "Avg length of stay", "days"),
    findKpi(rawKpis, "adc", "Avg daily census", "number"),
  ];

  const flowXY = flow ? seriesToXY(flow) : null;
  const censusXY = census ? seriesToXY(census) : null;

  // A per-day trend needs more than one day (a single point is not a trend)
  const multiDay = rangeLengthDays(filters?.startDate, filters?.endDate) > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={overviewKpis} loading={false} />

      {multiDay && (
      <SectionBlock title="More insights" count={2}>
        <ChartGrid>
          <TrendTile
            title="Admissions vs discharges"
            subtitle="Per day, selected period"
            icon="chart-3"
            titleTooltip="Admissions and discharges per day across the selected period"
            data={flowXY?.data}
            series={flowXY?.series}
            fallbackLabels={dayLabels(7)}
            fallbackSeries={[
              { key: "Admissions", label: "Admissions" },
              { key: "Discharges", label: "Discharges" },
            ]}
            height={260}
          />

          <TrendTile
            title="Census over time"
            subtitle="Occupied beds per day, selected period"
            icon="chart-3"
            titleTooltip="Occupied inpatient beds per day across the selected period"
            data={censusXY?.data}
            series={censusXY?.series}
            fallbackLabels={dayLabels(7)}
            fallbackSeries={[{ key: "Census", label: "Census" }]}
            height={260}
          />
        </ChartGrid>
      </SectionBlock>
      )}
    </div>
  );
}

function findKpi(kpis, key, label, kind) {
  const found = kpis.find((k) => k.key === key);
  return found || { key, label, kind, value: 0 };
}

function useInpatientOverview({ days, startDate, endDate, clinicId }) {
  const data = useInpatientData({ days, startDate, endDate, clinicId });
  const src = data._raw ?? {};
  return {
    loading: data.loading,
    kpis: data.kpis,
    flow: src.flow || null,
    census: src.census || null,
  };
}
