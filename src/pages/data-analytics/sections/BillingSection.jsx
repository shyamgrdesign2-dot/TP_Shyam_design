import React, { useMemo } from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile } from "./ChartLayout";
import DonutWithLegend from "../charts/DonutWithLegend";
import { formatINR } from "../charts/format";
import useBillingLive from "../data/useBillingLive";
import KpiRow from "./KpiRow";

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

export default function BillingSection({ filters, department = "opd" }) {
  const { loading, kpis, paymentModes, refundModes } = useBillingLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    department,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const kpisWithTooltips = useMemo(
    () => kpis.map((k) => ({ ...k, tooltip: BILLING_TOOLTIPS[k.key] || k.tooltip })),
    [kpis]
  );

  const billedStatusDonut = useMemo(
    () => [
      { label: "Collected", value: kpis.find((k) => k.key === "collected")?.value || 0 },
      { label: "Due", value: kpis.find((k) => k.key === "due")?.value || 0 },
    ],
    [kpis]
  );

  const advanceStatusDonut = useMemo(
    () => [
      { label: "Applied to bills", value: kpis.find((k) => k.key === "advDebited")?.value || 0 },
      { label: "Refunded", value: kpis.find((k) => k.key === "advRefunded")?.value || 0 },
      { label: "Available balance", value: Math.max((kpis.find((k) => k.key === "advance")?.value || 0) - (kpis.find((k) => k.key === "advDebited")?.value || 0) - (kpis.find((k) => k.key === "advRefunded")?.value || 0), 0) },
    ],
    [kpis]
  );

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={kpisWithTooltips} loading={false} />

      <SectionBlock title="More insights" count={4}>
        <ChartGrid>
          <ChartTile title="Billed amount status" subtitle="Collected vs due, selected period" icon="wallet-3" titleTooltip="How the amount billed in the selected period splits into already-collected and still-due">
            <DonutWithLegend
              data={billedStatusDonut}
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
          <ChartTile title="Advance deposit status" subtitle="Where advance deposits went, selected period" icon="money-recive" titleTooltip="How advance deposits received in the selected period split: applied toward bills, refunded to patients, or still available as balance">
            <DonutWithLegend data={advanceStatusDonut} centerLabel="Advance" valueFormat={formatINR} height={220} />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
