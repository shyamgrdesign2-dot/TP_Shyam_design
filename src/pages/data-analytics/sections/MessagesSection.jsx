import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile } from "./ChartLayout";
import DonutWithLegend from "../charts/DonutWithLegend";
import useMessagesData from "../data/useMessagesData";
import KpiRow from "./KpiRow";

// Messages — bulk SMS / WhatsApp campaign analytics, LIVE from the same APIs
// the Messages page uses. Campaigns are business-level: the doctor and clinic
// filters do not apply here (each card's tooltip says so where relevant).
export default function MessagesSection({ filters }) {
  const { loading, kpis, channelMix, sentVsScheduled } = useMessagesData({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={kpis} loading={false} />

      <SectionBlock title="More insights" count={2}>
        <ChartGrid>
          <ChartTile title="Delivered vs scheduled" subtitle="Campaigns, selected period" icon="send-2" titleTooltip="Campaigns already delivered vs still scheduled in the selected period">
            <DonutWithLegend data={sentVsScheduled} centerLabel="Campaigns" height={240} />
          </ChartTile>

          <ChartTile title="Channel mix" subtitle="Campaigns, selected period" icon="message" titleTooltip="How campaigns split across SMS and WhatsApp in the selected period">
            <DonutWithLegend data={channelMix} centerLabel="Campaigns" height={240} />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
