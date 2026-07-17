import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import usePatientsData from "../data/usePatientsData";
import KpiRow from "./KpiRow";

export default function PatientsSection({ filters }) {
  const { loading, kpis, gender, maritalStatus, bloodGroups, age, visitFrequency, topCities, rfm } = usePatientsData({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

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
      <KpiRow title="Key metrics" kpis={kpis} loading={false} columns={3} />

      <SectionBlock title="More insights" count={7}>
        <ChartGrid>
          <ChartTile title="Gender distribution" subtitle="Patients seen in selected period" icon="cards-heart" titleTooltip="Gender split of patients who visited in the selected period">
            <DonutWithLegend data={gender} centerLabel="Patients" height={240} />
          </ChartTile>

          <ChartTile title="Marital status" subtitle="Patients seen in selected period" icon="cards-heart" titleTooltip="Marital status split of patients who visited in the selected period. Zero until the backend serves this field.">
            <DonutWithLegend data={maritalStatus} centerLabel="Patients" height={240} />
          </ChartTile>

          <ChartTile title="Blood group distribution" subtitle="Patients seen in selected period" icon="cards-heart" titleTooltip="Blood group split of patients who visited in the selected period. Zero until the backend serves this field.">
            <DonutWithLegend data={bloodGroups} centerLabel="Patients" height={240} />
          </ChartTile>

          <ChartTile title="Age distribution" subtitle="Patients seen in selected period" icon="chart-2" titleTooltip="Count of patients who visited in the selected period, grouped by age band">
            <BarChartZ
              data={age?.data}
              series={age?.series}
              fallbackLabels={["<18", "18-30", "30-45", "45-60", ">60"]}
              fallbackSeries={[{ key: "Patients", label: "Patients" }]}
              height={240}
            />
          </ChartTile>

          <ChartTile title="Visit frequency" subtitle="Visits per patient, selected period" icon="activity" titleTooltip="How many patients visited once, twice, three times and so on within the selected period">
            <BarChartZ
              data={visitFrequency?.data}
              series={visitFrequency?.series}
              fallbackLabels={["1", "2", "3", "4-5", "6-10", "10+"]}
              fallbackSeries={[{ key: "Patients", label: "Patients" }]}
              height={240}
            />
          </ChartTile>

          <ChartTile title="Top cities" subtitle="Patients seen in selected period" icon="building" titleTooltip="Where the patients seen in the selected period come from, top cities by patient count">
            <DonutWithLegend data={topCities} centerLabel="Patients" height={240} />
          </ChartTile>

          <ChartTile title="Patient segments" subtitle="Recency-frequency mix, selected period" icon="profile-2user" titleTooltip="RFM segmentation: how patients split into champions, loyal, at-risk and other segments based on how recently and how often they visit">
            <DonutWithLegend data={rfm} centerLabel="Patients" height={240} />
          </ChartTile>
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}
