import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile } from "./ChartLayout";
import DonutWithLegend from "../charts/DonutWithLegend";
import TrendTile from "./TrendTile";
import { seriesToXY } from "../charts/adapters";
import { dayLabels } from "../charts/scaffolds";
import { formatINR } from "../charts/format";
import { rangeLengthDays } from "../filters/periods";
import useBillingLive from "../data/useBillingLive";
import useBillingData from "../data/useBillingData";
import KpiRow from "./KpiRow";

export default function BillingSection({ filters, department = "opd" }) {
  const { loading, kpis, paymentModes, refundModes, advanceModes, advanceRefundModes } = useBillingLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    department,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const analytics = useBillingData({ days: filters?.days || 7, department, doctorId: filters?.doctor, clinicId: filters?.clinic });
  const isLoading = loading || analytics.loading;

  if (isLoading) {
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

  const collectionXY = analytics.collectionChart ? seriesToXY(analytics.collectionChart) : null;

  const BILLING_TOOLTIPS = {
    billed: "Sum of all bills raised in the selected period",
    collected: "Payments received from patients in the selected period",
    due: "Amount still outstanding on bills raised in the selected period",
    refunded: "Bill amounts refunded to patients in the selected period",
    advance: "Advance deposits collected in the selected period",
    advRefunded: "Advance deposits returned to patients in the selected period",
    advDebited: "Advance amounts applied toward bills in the selected period",
    avgBill: "Total billed divided by number of bills in the selected period",
  };
  const kpisWithTooltips = kpis.map((k) => ({
    ...k,
    tooltip: BILLING_TOOLTIPS[k.key] || k.tooltip,
  }));

  // A per-day trend needs more than one day (a single point is not a trend)
  const multiDay = rangeLengthDays(filters?.startDate, filters?.endDate) > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={kpisWithTooltips} loading={false} />

      <SectionBlock title="More insights" count={multiDay ? 6 : 5}>
        <ChartGrid>
          {multiDay && (
          <TrendTile
            title="Collection vs refund"
            subtitle="Per day, selected period"
            icon="dollar-circle"
            titleTooltip="Amount collected and amount refunded per day across the selected period"
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

          <ChartTile title="Billed amount status" subtitle="Collected vs due, selected period" icon="wallet-3" titleTooltip="How the amount billed in the selected period splits into already-collected and still-due">
            <DonutWithLegend
              data={[
                { label: "Collected", value: kpis.find((k) => k.key === "collected")?.value || 0 },
                { label: "Due", value: kpis.find((k) => k.key === "due")?.value || 0 },
              ]}
              centerLabel="Billed"
              valueFormat={formatINR}
              height={220}
            />
          </ChartTile>

          <ChartTile title="Collection by mode" subtitle="Total collected, selected period" icon="wallet-check" titleTooltip="How money collected in the selected period splits across payment modes">
            <DonutWithLegend data={paymentModes} centerLabel="Collected" valueFormat={formatINR} height={220} />
          </ChartTile>
          <ChartTile title="Refund by mode" subtitle="Bill refunds, selected period" icon="wallet-remove" titleTooltip="How bill refunds paid in the selected period split across payment modes">
            <DonutWithLegend data={refundModes} centerLabel="Refunded" valueFormat={formatINR} height={220} />
          </ChartTile>
          <ChartTile title="Advance collected by mode" subtitle="Advance received, selected period" icon="money-recive" titleTooltip="How advance deposits received in the selected period split across payment modes">
            <DonutWithLegend data={advanceModes} centerLabel="Advance" valueFormat={formatINR} height={220} />
          </ChartTile>
          <ChartTile title="Advance refunded by mode" subtitle="Advance returned, selected period" icon="money-send" titleTooltip="How advance deposits returned to patients in the selected period split across payment modes">
            <DonutWithLegend data={advanceRefundModes} centerLabel="Adv refunded" valueFormat={formatINR} height={220} />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
