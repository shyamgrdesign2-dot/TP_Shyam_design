import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import useWardsData from "../data/useWardsData";
import KpiRow from "./KpiRow";

// Wards — beds + occupancy snapshot (live) and ALOS by ward.
// Removed per user ruling (2026-07-15): Room shifts KPI, Ward transfers and
// Occupancy-over-time charts, bed turnover — the endpoints return no data
// (contract doc §10 carries the bug report); they come back when data ships.
export default function WardsSection({ filters }) {
  const { loading, kpis, alosByWard } = useWardsData({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    clinicId: filters?.clinic,
  });

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <KpiRow title="Beds & occupancy" kpis={[]} loading />
        <div className="da-chart-grid">
          <Skeleton variant="rectangular" height={320} radius={16} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Beds & occupancy" kpis={kpis} loading={false} />

      <SectionBlock title="More insights" count={1}>
        <ChartGrid>
          <ChartTile title="Avg length of stay by ward" subtitle="ALOS per ward" icon="bed" titleTooltip="Average patient stay duration per ward. The endpoint currently returns an empty split on UAT — reported to backend (contract doc §10).">
            <MaybeScroll count={alosByWard?.data?.length}>
              <BarChartZ
                data={alosByWard?.data}
                series={alosByWard?.series}
                fallbackLabels={["General", "Semi-private", "Private", "ICU", "NICU"]}
                fallbackSeries={[{ key: "ALOS (days)", label: "ALOS (days)" }]}
                height={240}
              />
            </MaybeScroll>
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
