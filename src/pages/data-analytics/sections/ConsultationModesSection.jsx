import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ, StackedBarWithTotal } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import useConsultationModesData from "../data/useConsultationModesData";
import useCapabilities from "../data/useCapabilities";
import KpiRow from "./KpiRow";

export default function ConsultationModesSection({ filters }) {
  const caps = useCapabilities();
  const { loading, kpis, modeMix, modeTrend, byDoctor, visitTrend, doctorComparison } = useConsultationModesData({
    month: filters?.month,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
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
    { key: "Type Rx", label: "Type Rx", on: caps.modes.typeRx },
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={kpis} loading={false} />

      <SectionBlock title="Digitization trends" count={2}>
        <ChartGrid>
          <ChartTile title="Visit trend" subtitle="Booked vs Completed vs Digitized, per day" icon="chart-square" titleTooltip="Booked vs completed vs digitized (CVT) per day">
            <MaybeScroll count={visitTrend?.data?.length || 0} fit={7} perItem={80}>
              <BarChartZ data={visitTrend?.data} series={visitTrend?.series} xKey="x" height={240} showAverage={false} />
            </MaybeScroll>
          </ChartTile>

          <ChartTile title="Doctor-wise comparison" subtitle="Booked vs Completed vs Digitized, per doctor" icon="stethoscope" titleTooltip="Booked vs completed vs digitized (CVT) per doctor">
            <MaybeScroll count={doctorComparison?.data?.length || 0} fit={5} perItem={110}>
              <BarChartZ data={doctorComparison?.data} series={doctorComparison?.series} xKey="x" height={240} showAverage={false} />
            </MaybeScroll>
          </ChartTile>
        </ChartGrid>
      </SectionBlock>

      <SectionBlock title="More insights" count={2}>
        <ChartGrid>
          <ChartTile title="Consultation mode mix" subtitle="Share of consultations, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/clipboard-activity.svg" titleTooltip="How consultations in the selected period split across Rx modes">
            <DonutWithLegend data={modeMix} centerLabel="Consultations" height={240} />
          </ChartTile>

          <ChartTile title="Usage by doctor" subtitle="Mode split per doctor, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/content-edit/document-favorite.svg" titleTooltip="Each doctor's consultations in the selected period, stacked by the Rx mode used">
            <MaybeScroll count={byDoctor?.data?.length}>
            <StackedBarWithTotal
              data={byDoctor?.data}
              series={byDoctor?.series}
              fallbackLabels={["Dr A", "Dr B", "Dr C"]}
              fallbackSeries={stackFallback}
              height={280}
            />
            </MaybeScroll>
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
