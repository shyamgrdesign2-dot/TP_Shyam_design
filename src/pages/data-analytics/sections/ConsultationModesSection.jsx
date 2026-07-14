import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import TrendTile from "./TrendTile";
import DonutWithLegend from "../charts/DonutWithLegend";
import { WEEK_LABELS } from "../charts/scaffolds";
import { isMonthScoped } from "../filters/periods";
import useConsultationModesData from "../data/useConsultationModesData";
import useCapabilities from "../data/useCapabilities";
import KpiRow from "./KpiRow";

export default function ConsultationModesSection({ filters }) {
  const caps = useCapabilities();
  const { loading, kpis, modeMix, modeTrend, byDoctor } = useConsultationModesData({
    month: filters?.month,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
    enabledModes: caps.modes,
  });

  // Empty-state scaffolds also respect what's configured for this account
  const stackFallback = [
    { key: "Smart Sync", label: "Smart Sync", on: caps.modes.smartSync },
    { key: "Voice RX", label: "Voice RX", on: caps.modes.voiceRx },
    { key: "Tab RX", label: "Tab RX", on: caps.modes.tabRx },
    { key: "Snap RX", label: "Snap RX", on: caps.modes.snapRx },
    { key: "Point and Click", label: "Point and Click", on: caps.modes.typeRx },
  ].filter((s) => s.on).map(({ key, label }) => ({ key, label }));

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

  // Correlation rule: the weekly adoption trend hides under sub-month ranges
  const monthScoped = isMonthScoped(filters?.startDate, filters?.endDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={kpis} loading={false} />

      <SectionBlock title="More insights" count={monthScoped ? 3 : 2}>
        <ChartGrid>
          <ChartTile title="Consultation mode mix" subtitle="Share of consultations, selected period" icon="activity" titleTooltip="How consultations in the selected period split across Rx modes">
            <DonutWithLegend data={modeMix} centerLabel="Consultations" height={240} />
          </ChartTile>

          {monthScoped && (
          <TrendTile
            title="Mode adoption over time"
            subtitle="Per week, current calendar month"
            icon="chart-3"
            titleTooltip="Weekly consultation count per Rx mode for the current calendar month. This card is month-based until the backend serves range-based buckets."
            data={modeTrend?.data}
            series={modeTrend?.series}
            fallbackLabels={WEEK_LABELS}
            fallbackSeries={stackFallback.slice(0, 3)}
            height={260}
          />
          )}

          <ChartTile title="Usage by doctor" subtitle="Mode split per doctor, selected period" icon="profile-2user" titleTooltip="Each doctor's consultations in the selected period, stacked by the Rx mode used">
            <MaybeScroll count={byDoctor?.data?.length}>
            <BarChartZ
              data={byDoctor?.data}
              series={byDoctor?.series}
              fallbackLabels={["Dr A", "Dr B", "Dr C"]}
              fallbackSeries={stackFallback}
              stacked
              height={280}
            />
            </MaybeScroll>
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
