import React, { useMemo, useState } from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ, StackedBarWithTotal } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import { formatINR } from "../charts/format";
import useBillingLive from "../data/useBillingLive";
import useRevenueByCategoryData from "../data/useRevenueByCategoryData";
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

const REVENUE_CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "consultation", label: "Consultation" },
  { value: "procedure", label: "Procedure" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "lab", label: "Lab / Diagnostics" },
  { value: "other", label: "Other" },
];

export default function BillingSection({ filters, department = "opd" }) {
  const [revenueCategory, setRevenueCategory] = useState("all");

  const { loading, kpis, paymentModes, refundModes, advanceModes, revenueByDoctor } = useBillingLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    department,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const revCat = useRevenueByCategoryData({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
    category: revenueCategory,
  });

  const kpisWithTooltips = useMemo(
    () => kpis.map((k) => ({ ...k, tooltip: BILLING_TOOLTIPS[k.key] || k.tooltip })),
    [kpis]
  );

  const revenueDonut = useMemo(
    () => [
      { label: "Collected", value: kpis.find((k) => k.key === "collected")?.value || 0 },
      { label: "Due", value: kpis.find((k) => k.key === "due")?.value || 0 },
      { label: "Refunded", value: kpis.find((k) => k.key === "refunded")?.value || 0 },
    ],
    [kpis]
  );

  const revCatKpis = useMemo(() => {
    if (revCat.loading) return [];
    const out = [];
    if (revCat.topCategory) {
      out.push({ key: "topCategory", label: "Top revenue category", kind: "text", value: revCat.topCategory, tooltip: "Billing category generating the highest revenue in the selected period" });
    }
    if (revCat.highestItem) {
      out.push({ key: "highestItem", label: "Highest sold item", kind: "text", value: revCat.highestItem, tooltip: "Most frequently billed individual item by count" });
    }
    if (revCat.totalRevenue > 0) {
      out.push({ key: "totalCatRevenue", label: "Total category revenue", kind: "money", value: revCat.totalRevenue, tooltip: "Sum of revenue across all billing categories" });
    }
    return out;
  }, [revCat]);

  const chartCount = 6 + (revenueByDoctor ? 1 : 0) + (advanceModes.length > 0 ? 1 : 0);

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
      <KpiRow title="Key metrics" kpis={[...kpisWithTooltips, ...revCatKpis]} loading={false} />

      <SectionBlock title="More insights" count={chartCount}>
        <ChartGrid>
          <ChartTile title="Revenue breakdown" subtitle="Collected, due and refunded" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/essential/chart.svg" titleTooltip="How the total billed amount splits into collected, due, and refunded in the selected period">
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

          <ChartTile
            title="Revenue by type"
            subtitle="Top categories by revenue, selected period"
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/essential/chart.svg"
            titleTooltip="Revenue breakdown by billing item category, sorted by highest revenue"
          >
            <BarChartZ
              data={revCat.revenueByType?.data}
              series={revCat.revenueByType?.series}
              fallbackLabels={["Consultation", "Procedure", "Pharmacy", "Lab / Diagnostics", "Other"]}
              fallbackSeries={[{ key: "revenue", label: "Revenue (₹)" }]}
              height={240}
              showAverage={false}
            />
          </ChartTile>

          <ChartTile
            title="Usage by doctor"
            subtitle="Category-wise revenue per doctor"
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-2user.svg"
            titleTooltip="Each doctor's revenue split by billing category, stacked to show total contribution"
          >
            <MaybeScroll count={revCat.usageByDoctor?.data?.length || 0}>
              <BarChartZ
                data={revCat.usageByDoctor?.data}
                series={revCat.usageByDoctor?.series}
                fallbackLabels={["Doctor A", "Doctor B", "Doctor C"]}
                fallbackSeries={[{ key: "Consultation", label: "Consultation" }]}
                height={260}
                stacked
                showAverage={false}
              />
            </MaybeScroll>
          </ChartTile>

          <ChartTile
            title="Top 5 sold items"
            subtitle={revenueCategory === "all" ? "Most billed items, all categories" : `Top items in ${REVENUE_CATEGORIES.find((c) => c.value === revenueCategory)?.label || revenueCategory}`}
            iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/essential/medal-star.svg"
            titleTooltip="Top 5 most frequently billed items by count. Use the dropdown to drill into a specific category."
            headerRight={
              <select
                value={revenueCategory}
                onChange={(e) => setRevenueCategory(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--tesseract-slate-200)",
                  background: "var(--tesseract-bg-surface)",
                  color: "var(--tesseract-fg-body)",
                  cursor: "pointer",
                }}
              >
                {REVENUE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            }
          >
            <DonutWithLegend data={revCat.topItems} centerLabel="Items" height={220} />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
