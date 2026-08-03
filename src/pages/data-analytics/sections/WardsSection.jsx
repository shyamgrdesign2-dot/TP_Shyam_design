import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import useWardsData from "../data/useWardsData";
import KpiRow from "./KpiRow";

export default function WardsSection({ filters }) {
  const { loading, kpis, alosByWard, bedsByWard, occupancyByWard, bedDistribution } =
    useWardsData({
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
          <Skeleton variant="rectangular" height={320} radius={16} />
          <Skeleton variant="rectangular" height={320} radius={16} />
          <Skeleton variant="rectangular" height={320} radius={16} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Beds & occupancy" kpis={kpis} loading={false} />

      <SectionBlock title="More insights" count={4}>
        <ChartGrid>
          <ChartTile title="Beds per ward" subtitle="Occupied vs total capacity" icon="bed" titleTooltip="How beds are distributed and utilized across each ward. Shows occupied beds against total capacity per ward.">
            <MaybeScroll count={bedsByWard?.data?.length}>
              <BarChartZ
                data={bedsByWard?.data}
                series={bedsByWard?.series}
                fallbackLabels={["General", "Semi-private", "Private", "ICU", "NICU"]}
                fallbackSeries={[
                  { key: "Occupied", label: "Occupied" },
                  { key: "Beds", label: "Total beds" },
                ]}
                height={240}
              />
            </MaybeScroll>
          </ChartTile>

          <ChartTile title="Occupancy rate by ward" subtitle="Current occupancy %" icon="chart-square" titleTooltip="Bed occupancy percentage for each ward. Wards above 85% may need capacity planning. ICU/NICU typically run higher occupancy than general wards.">
            <MaybeScroll count={occupancyByWard?.data?.length}>
              <BarChartZ
                data={occupancyByWard?.data}
                series={occupancyByWard?.series}
                fallbackLabels={["General", "Semi-private", "Private", "ICU", "NICU"]}
                fallbackSeries={[{ key: "Occupancy %", label: "Occupancy %" }]}
                height={240}
              />
            </MaybeScroll>
          </ChartTile>

          <ChartTile title="Bed distribution" subtitle="Allocation across wards" icon="diagram" titleTooltip="How the facility's total bed capacity is allocated across wards. Helps identify if bed distribution matches patient demand patterns.">
            <DonutWithLegend data={bedDistribution} centerLabel="Total beds" height={240} max={7} />
          </ChartTile>

          <ChartTile title="Avg length of stay by ward" subtitle="ALOS per ward" icon="timer" titleTooltip="Average patient stay duration per ward. Higher ALOS in ICU/NICU is expected. General ward ALOS above 5 days may indicate delayed discharges.">
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
