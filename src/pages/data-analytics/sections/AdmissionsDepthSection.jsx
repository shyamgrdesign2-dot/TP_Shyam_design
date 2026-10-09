import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import useAdmissionsData from "../data/useAdmissionsData";
import KpiRow from "./KpiRow";

// IPD Admissions & Discharges — patient flow depth (clinic-level; the doctor
// filter does not apply). Prototype parity; per-metric buildability verdicts
// live in spec §4.1b.
export default function AdmissionsDepthSection({ filters }) {
  const { loading, kpis, dischargeTypes, admissionsByDept, admissionsByWard, losDistribution } =
    useAdmissionsData({
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      days: filters?.days,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={kpis} loading={false} />

      <SectionBlock title="More insights" count={3}>
        <ChartGrid>
          {/* Discharge types hidden: backend returns empty array despite having discharge counts.
              Restore when Pm-Core fixes the dischargeTypes join (item #9). */}

          <ChartTile title="Admissions by department" subtitle="Departments with no admissions in the period are not shown" icon="building" titleTooltip="Which departments admit the most patients in the selected period. Departments without any admissions in the window are omitted from the chart.">
            <MaybeScroll count={admissionsByDept?.data?.length}>
              <BarChartZ
                data={admissionsByDept?.data}
                series={admissionsByDept?.series}
                fallbackLabels={["Gen Med", "Ortho", "Gynec", "Surgery", "Pedia"]}
                fallbackSeries={[{ key: "Admissions", label: "Admissions" }]}
                height={240}
              />
            </MaybeScroll>
          </ChartTile>

          <ChartTile title="Admissions by ward" subtitle="Wards with no admissions in the period are not shown" icon="bed" titleTooltip="Which wards receive the most admissions in the selected period. Wards without any admissions in the window (e.g. an idle ICU) are omitted from the chart, not zero.">
            <MaybeScroll count={admissionsByWard?.data?.length}>
              <BarChartZ
                data={admissionsByWard?.data}
                series={admissionsByWard?.series}
                fallbackLabels={["General", "Semi-private", "Private", "ICU", "NICU"]}
                fallbackSeries={[{ key: "Admissions", label: "Admissions" }]}
                height={240}
              />
            </MaybeScroll>
          </ChartTile>

          {/* "Admission categories" (payor mix) removed — WONT-BUILD:
              no payor column exists (API-CONTRACTS-CURRENT §7). */}
          <ChartTile title="Length of stay distribution" subtitle="Discharged stays, selected period" icon="timer" titleTooltip="Completed stays by duration band in the selected period">
            <BarChartZ
              data={losDistribution?.data}
              series={losDistribution?.series}
              fallbackLabels={["0-1d", "2-3d", "4-7d", "8-14d", "15d+"]}
              fallbackSeries={[{ key: "Stays", label: "Stays" }]}
              height={240}
            />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
