import React, { useMemo } from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { StackedBarWithTotal } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import { formatINR } from "../charts/format";
import useBillingLive from "../data/useBillingLive";
import useIpdBilling from "../data/useIpdBilling";
import KpiRow from "./KpiRow";

const BILLING_TOOLTIPS = {
  billed: "Sum of all bills raised in the selected period",
  collected: "Payments received from patients in the selected period",
  due: "Amount still outstanding on bills raised in the selected period",
  outstanding: "Billed minus collected for the selected period. Legacy IPD has no separate due figure.",
  refunded: "Bill amounts refunded to patients in the selected period",
  creditNotes: "Credit notes issued in the selected period",
  advance: "Advance deposits collected in the selected period",
  advRefunded: "Advance deposits returned to patients in the selected period",
  advDebited: "Advance amounts applied toward bills in the selected period",
  avgBill: "Total billed divided by number of bills in the selected period",
};

export default function BillingSection({ filters, department = "opd" }) {
  const isIpd = department === "ipd";
  const live = useBillingLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    department,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
    enabled: !isIpd,
  });
  const ipd = useIpdBilling({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
    enabled: isIpd,
  });
  const { loading, kpis, paymentModes, refundModes, advanceModes, revenueByDoctor } = isIpd ? ipd : live;

  const kpisWithTooltips = useMemo(
    () => kpis.map((k) => ({ ...k, tooltip: BILLING_TOOLTIPS[k.key] || k.tooltip })),
    [kpis]
  );

  const revenueDonut = useMemo(() => {
    const mid = isIpd
      ? { label: "Outstanding", value: kpis.find((k) => k.key === "outstanding")?.value || 0 }
      : { label: "Due", value: kpis.find((k) => k.key === "due")?.value || 0 };
    return [
      { label: "Collected", value: kpis.find((k) => k.key === "collected")?.value || 0 },
      mid,
      { label: "Refunded", value: kpis.find((k) => k.key === "refunded")?.value || 0 },
    ];
  }, [kpis, isIpd]);

  const chartCount = 3 + (revenueByDoctor ? 1 : 0) + (advanceModes.length > 0 ? 1 : 0);

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

      <SectionBlock title="More insights" count={chartCount}>
        <ChartGrid>
          <ChartTile
            title="Revenue breakdown"
            subtitle={isIpd ? "Collected, outstanding and refunded" : "Collected, due and refunded"}
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/essential/chart.svg"
            titleTooltip={
              isIpd
                ? "How billed amount splits into collected, outstanding, and refunded in the selected period"
                : "How the total billed amount splits into collected, due, and refunded in the selected period"
            }
          >
            <DonutWithLegend data={revenueDonut} centerLabel="Billed" valueFormat={formatINR} height={220} />
          </ChartTile>

          <ChartTile title="Collection by mode" subtitle="Total collected, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-recive.svg" titleTooltip="How money collected in the selected period splits across payment modes">
            <DonutWithLegend data={paymentModes} centerLabel="Collected" valueFormat={formatINR} height={220} />
          </ChartTile>

          {revenueByDoctor && (
            <ChartTile title="Revenue by doctor" subtitle="Billed and collected per doctor" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-2user.svg" titleTooltip="Each doctor's billed and collected amounts in the selected period, sorted by highest billed">
              <MaybeScroll count={revenueByDoctor?.data?.length}>
                <StackedBarWithTotal data={revenueByDoctor?.data} series={revenueByDoctor?.series} xKey="x" height={260} />
              </MaybeScroll>
            </ChartTile>
          )}

          <ChartTile title="Refund by mode" subtitle="Bill refunds, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-send.svg" titleTooltip="How bill refunds paid in the selected period split across payment modes">
            <DonutWithLegend data={refundModes} centerLabel="Refunded" valueFormat={formatINR} height={220} />
          </ChartTile>

          {advanceModes.length > 0 && (
            <ChartTile title="Advance by mode" subtitle="How advances were paid, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/money/money-recive.svg" titleTooltip="How advance deposits received in the selected period split across payment modes">
              <DonutWithLegend data={advanceModes} centerLabel="Advance" valueFormat={formatINR} height={220} />
            </ChartTile>
          )}
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
