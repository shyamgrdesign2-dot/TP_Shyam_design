import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import useClinicalActivityData from "../data/useClinicalActivityData";
import KpiRow from "./KpiRow";

export default function ClinicalActivitySection({ filters }) {
  const { loading, kpis, notesByType, otByDoctor, anaesthesiaMix } = useClinicalActivityData({
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

  // Derived: which note type dominates documentation (from the live donut)
  const topNote = (notesByType || []).reduce(
    (a, b) => ((b?.value || 0) > (a?.value || 0) ? b : a),
    null
  );
  const enrichedKpis = [
    ...kpis,
    { key: "topNoteType", label: "Top note type", kind: "text", value: topNote?.value > 0 ? topNote.label : "No data", tooltip: "The clinical note type recorded most often in the selected period" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={enrichedKpis} loading={false} />

      <SectionBlock title="More insights" count={3}>
        <ChartGrid>
          <ChartTile title="Notes by type" subtitle="Progress / Nursing / OT / Discharge" icon="cards-heart" titleTooltip="Distribution of clinical note types recorded">
            <DonutWithLegend data={notesByType} centerLabel="Notes" height={240} />
          </ChartTile>

          <ChartTile title="Anaesthesia mix" subtitle="OT procedures, selected period" icon="health" titleTooltip="OT procedures by anaesthesia type (general / spinal / local / sedation). Zero until the backend serves the split.">
            <DonutWithLegend data={anaesthesiaMix} centerLabel="Procedures" height={240} />
          </ChartTile>

          <ChartTile title="OT by doctor" subtitle="Procedures per surgeon" icon="activity" titleTooltip="OT procedures performed by each surgeon">
            <MaybeScroll count={otByDoctor?.data?.length}>
            <BarChartZ
              data={otByDoctor?.data}
              series={otByDoctor?.series}
              fallbackLabels={["Dr A", "Dr B", "Dr C"]}
              fallbackSeries={[{ key: "Procedures", label: "Procedures" }]}
              height={240}
            />
            </MaybeScroll>
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
