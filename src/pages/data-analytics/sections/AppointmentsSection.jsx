import React from "react";
import { Skeleton } from "@dhspl-tatvacare/tesseract-ui";
import SectionBlock from "./SectionBlock";
import { ChartGrid, ChartTile, ScrollableChart } from "./ChartLayout";
import { BarChartZ } from "../charts/EmptyAware";
import DonutWithLegend from "../charts/DonutWithLegend";
import { seriesToDonut, HOUR_LABELS_12H } from "../charts/adapters";
import { rangeLengthDays } from "../filters/periods";
import useAppointmentsLive from "../data/useAppointmentsLive";
import useAppointmentsData from "../data/useAppointmentsData";
import useCapabilities from "../data/useCapabilities";
import KpiRow from "./KpiRow";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AppointmentsSection({ filters }) {
  const caps = useCapabilities();
  const { loading, kpis: rawKpis, statusDonut, visitsByHour: liveHourly, newVsReturning } = useAppointmentsLive({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const analytics = useAppointmentsData({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    days: filters?.days || 7,
    doctorId: filters?.doctor,
    clinicId: filters?.clinic,
  });

  const isLoading = loading || analytics.loading;

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <KpiRow title="Key metrics" kpis={[]} loading />
        <div className="da-chart-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={300} radius={16} />
          ))}
        </div>
      </div>
    );
  }

  // Capability gating (spec §1.7): don't show metrics for features this
  // clinic/doctor doesn't have — SnapRx digitization backlog and video
  // consultation bookings only exist where those modes are enabled.
  const kpis = rawKpis.filter((k) => {
    if (k.key === "pendingDecisions") return caps.modes.snapRx;
    if (k.key === "bookedVideo") return caps.modes.video;
    return true;
  });

  const visitTypeDonut = seriesToDonut(analytics.caseType);
  const categoryDonut = seriesToDonut(analytics.categoryMix);

  const DONUT_COLOR_MAP = {
    "Completed": "var(--tesseract-blue-400)",
    "In queue": "var(--tesseract-violet-400)",
    "Active queue": "var(--tesseract-violet-400)",
    "Inactive queue": "var(--tesseract-warning-400)",
    "Draft": "var(--tesseract-warning-400)",
    "Cancelled": "var(--tesseract-error-400)",
  };
  const donutColors = statusDonut.map((d) => DONUT_COLOR_MAP[d.label] || "var(--tesseract-slate-300)");

  // Cards adapt to the selected range (correlation rule):
  //  - single day     → "Visits by hour" of THAT day (hour buckets fit a day)
  //  - exactly a week → weekday TOTALS
  //  - longer         → weekday AVERAGES (total ÷ times that weekday occurs)
  const rangeDays = rangeLengthDays(filters?.startDate, filters?.endDate);
  const singleDay = rangeDays === 1;
  const showWeekday = rangeDays >= 7;
  const weekdayAveraged = rangeDays > 7;
  const weekday = weekdayAveraged
    ? averagePerWeekday(analytics.visitsByWeekday, filters?.startDate, filters?.endDate)
    : analytics.visitsByWeekday;
  const hasCategoryMix = categoryDonut.length > 0;
  const chartCount = 3 + (hasCategoryMix ? 1 : 0) + (showWeekday ? 1 : 0) + (singleDay ? 1 : 0);

  // Derived depth KPIs — computed live from data already on screen
  const totalKpi = kpis.find((k) => k.key === "total");
  const total = totalKpi?.value || 0;
  const visitsByHour = liveHourly || analytics.visitsByHour;
  const busiestKpi = singleDay
    ? busiestHour(visitsByHour)
    : busiestDay(analytics.visitsByWeekday);
  const enrichedKpis = [
    ...kpis,
    // Whole number — "visits in a day" is not a fraction. Same relative change
    // as footfall (identical denominator in both windows).
    { key: "avgVisitsPerDay", label: "Avg visits per day", kind: "number", value: rangeDays ? Math.round(total / rangeDays) : 0, approx: true, tooltip: "Total footfall divided by the number of days in the selected period, rounded", ...(typeof totalKpi?.delta === "number" ? { delta: totalKpi.delta } : {}) },
    ...(busiestKpi ? [{
      key: singleDay ? "busyHour" : "busyDay",
      label: singleDay ? "Busiest hour" : "Busiest day",
      kind: "text",
      value: busiestKpi,
      tooltip: singleDay
        ? "Hour slot with the most visits on the selected day"
        : "Weekday with the most visits, summed across the selected period",
    }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiRow title="Key metrics" kpis={enrichedKpis} />

      <SectionBlock title="More insights" count={chartCount}>
        <ChartGrid>
          <ChartTile title="Appointment status" subtitle="Current status, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/clipboard-activity.svg" titleTooltip="Current status of every appointment that falls in the selected period. In-queue and draft are live states, so they appear here rather than as headline metrics.">
            <DonutWithLegend data={statusDonut} centerLabel="Appointments" height={240} colors={donutColors} />
          </ChartTile>

          <ChartTile title="New vs returning" subtitle="Share of visits, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/medical/health-care.svg" titleTooltip="Split of first-time vs repeat patients among visits in the selected period">
            <DonutWithLegend data={newVsReturning} centerLabel="Patients" height={240} />
          </ChartTile>

          <ChartTile title="Visit type mix" subtitle="Total visits, selected period" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/health/health-sign.svg" titleTooltip="Count of new, follow-up, urgent and other visit types in the selected period">
            <BarChartZ
              data={visitTypeDonut.map((d) => ({ x: d.label, count: d.value }))}
              series={[{ key: "count", label: "Count" }]}
              fallbackLabels={["New", "Follow-up", "Urgent"]}
              fallbackSeries={[{ key: "count", label: "Count" }]}
              height={240}
              showAverage={false}
            />
          </ChartTile>

          {hasCategoryMix && (
            <ChartTile title="Category mix" subtitle="Visits by appointment category" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/essential/category-2.svg" titleTooltip="Distribution of appointments across booking categories in the selected period">
              <DonutWithLegend data={categoryDonut} centerLabel="Category" height={240} />
            </ChartTile>
          )}

          {showWeekday && (
            <ChartTile
              title="Visits by day of week"
              subtitle={weekdayAveraged ? "Avg per weekday, selected period" : "Total per weekday, selected period"}
              iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/time/calendar-2.svg"
              titleTooltip={
                weekdayAveraged
                  ? "Approximate average visits per weekday: each weekday's total divided by how many times that weekday occurs in the selected period"
                  : "Total visits landing on each weekday across the selected period. Use it to spot your busiest days."
              }
            >
              <BarChartZ
                data={weekday?.data}
                series={weekday?.series}
                fallbackLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                fallbackSeries={[{ key: "Visits", label: "Visits" }]}
                height={240}
                showAverage={false}
              />
            </ChartTile>
          )}

          {singleDay && (
            <ChartTile title="Visits by hour" subtitle="Selected day" iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/time/clock.svg" titleTooltip="Visits in each hour slot of the selected day, spot the peak hours">
              <ScrollableChart minWidth={800}>
                <BarChartZ
                  data={visitsByHour?.data}
                  series={visitsByHour?.series}
                  fallbackLabels={HOUR_LABELS_12H}
                  fallbackSeries={[{ key: "Visits", label: "Visits" }]}
                  height={240}
                  showAverage={false}
                />
              </ScrollableChart>
            </ChartTile>
          )}
        </ChartGrid>
      </SectionBlock>
    </div>
  );
}

function busiestDay(weekday) {
  const rows = weekday?.data;
  const key = weekday?.series?.[0]?.key;
  if (!Array.isArray(rows) || !rows.length || !key) return null;
  // >= so ties pick the later weekday (latest date on tie)
  const top = rows.reduce((a, b) => ((b[key] || 0) >= (a[key] || 0) ? b : a));
  return (top[key] || 0) > 0 ? top.x : null;
}

function busiestHour(hourly) {
  const rows = hourly?.data;
  const key = hourly?.series?.[0]?.key;
  if (!Array.isArray(rows) || !rows.length || !key) return null;
  const top = rows.reduce((a, b) => ((b[key] || 0) > (a[key] || 0) ? b : a));
  return (top[key] || 0) > 0 ? top.x : null;
}

// Weekday totals → averages: divide each weekday's total by how many times
// that weekday occurs in the selected range (1 decimal — averages are
// fractional by nature).
function averagePerWeekday(weekday, startDate, endDate) {
  if (!weekday?.data?.length || !weekday?.series?.length || !startDate || !endDate) return weekday;
  const occurrences = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const name = WEEKDAY_NAMES[d.getDay()];
    occurrences[name] = (occurrences[name] || 0) + 1;
  }
  const keys = weekday.series.map((s) => s.key);
  return {
    ...weekday,
    data: weekday.data.map((row) => {
      const n = occurrences[row.x] || 1;
      const out = { ...row };
      keys.forEach((k) => {
        out[k] = Math.round(((row[k] || 0) / n) * 10) / 10;
      });
      return out;
    }),
  };
}
