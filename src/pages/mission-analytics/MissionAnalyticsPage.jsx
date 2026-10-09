import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TesseractThemeProvider,
  Drawer,
  DrawerContent,
  HeroBanner,
  Header,
  Button,
  TPLibraryIcon,
  Skeleton,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import "../data-analytics/data-analytics.css";
import "./mission-analytics.css";

import FilterBar from "../data-analytics/filters/FilterBar";
import { DEFAULT_DATE_VALUE, periodToRange, datesToRange } from "../data-analytics/filters/periods";
import KpiRow from "../data-analytics/sections/KpiRow";
import SectionBlock from "../data-analytics/sections/SectionBlock";
import { ChartGrid, ChartTile, MaybeScroll } from "../data-analytics/sections/ChartLayout";
import DonutWithLegend from "../data-analytics/charts/DonutWithLegend";
import { BarChartZ } from "../data-analytics/charts/EmptyAware";
import useFilterOptions from "../data-analytics/data/useFilterOptions";
import useCapabilities from "../data-analytics/data/useCapabilities";
import { trackAnalytics, EVENTS } from "../data-analytics/data/analyticsTracking";
import { canShowMissionAnalyticsNav } from "../data-analytics/data/analyticsAccess";
import { getDecodedToken } from "../../utils/localStorage";
import { useSelector } from "react-redux";
import useMissionData, { buildAllDoctorBars } from "./data/useMissionData";

/**
 * @param {{ embedded?: boolean }} props
 * embedded — render inside AppointmentList shell (Welcome + content), no full-page drawer.
 */
export default function MissionAnalyticsPage({ embedded = false } = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const profile = useSelector((s) => s.doctors?.profile) || {};
  const tokenResult = getDecodedToken()?.result;

  const caps = useCapabilities();
  const openedAtRef = useRef(Date.now());

  // Admin or special Mission users only; other Mission / non-Mission → home.
  // Gated by JWT hospital_business_id (EXTERNAL_HOSPITAL_BUSINESS_IDS), not GrowthBook.
  useEffect(() => {
    if (!canShowMissionAnalyticsNav(tokenResult, profile)) {
      navigate("/", { replace: true });
    }
  }, [tokenResult, profile, navigate]);

  useEffect(() => {
    trackAnalytics(EVENTS.OPENED, { department: "opd" });
    return () => {
      const seconds = Math.round((Date.now() - openedAtRef.current) / 1000);
      trackAnalytics(EVENTS.CLOSED, { department: "opd", section: "all", time_spent_seconds: seconds });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [dateValue, setDateValue] = useState(DEFAULT_DATE_VALUE);
  const [dateRange, setDateRange] = useState(() => periodToRange("7d"));
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);

  const doctorLocked = !caps.isAdmin && !!caps.selfId;
  useEffect(() => {
    if (doctorLocked) setDoctors([caps.selfId]);
  }, [doctorLocked, caps.selfId]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const handleRefresh = useCallback(() => {
    trackAnalytics(EVENTS.REFRESH, { department: "opd", section: "all" });
    import("../data-analytics/data/apiCache").then((m) => m.clearApiCache());
    import("../data-analytics/data/doctorList").then((m) => m.clearDoctorListCache());
    setRefreshKey((k) => k + 1);
  }, []);

  const { doctorOptions, clinicOptions } = useFilterOptions();

  const MAX_RANGE_DAYS = 31;
  const handleDateChange = (v) => {
    let start = v?.start instanceof Date ? v.start : null;
    const end = v?.end instanceof Date ? v.end : start;
    if (start && end) {
      const span = Math.round((end - start) / 86400000) + 1;
      if (span > MAX_RANGE_DAYS) {
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (MAX_RANGE_DAYS - 1));
      }
    }
    if (v?.presetId) setDateValue(v.presetId);
    else setDateValue(start ? { start, end } : DEFAULT_DATE_VALUE);
    if (start) setDateRange(datesToRange(start, end));
    trackAnalytics(EVENTS.FILTER_APPLIED, { department: "opd", section: "all", filter_type: "period", filter_value: v?.presetId || "custom_range" });
  };

  const filters = useMemo(
    () => ({
      ...dateRange,
      doctor: doctorLocked ? caps.selfId : doctors.length ? doctors.join(",") : undefined,
      clinic: clinics.length ? clinics.join(",") : undefined,
      canCompare: isComparable(dateRange),
    }),
    [dateRange, doctors, clinics, doctorLocked, caps.selfId]
  );

  const close = () => {
    setOpen(false);
    window.setTimeout(() => navigate(-1), 240);
  };

  const hasActiveFilters =
    (!doctorLocked && doctors.length > 0) ||
    (!caps.singleClinic && clinics.length > 0) ||
    dateValue !== DEFAULT_DATE_VALUE;
  const clearAllFilters = () => {
    trackAnalytics(EVENTS.FILTER_CLEARED, { department: "opd", section: "all" });
    setDoctors(doctorLocked ? [caps.selfId] : []);
    setClinics([]);
    setDateValue(DEFAULT_DATE_VALUE);
    setDateRange(periodToRange("7d"));
  };

  const [filterShadow, setFilterShadow] = useState(false);
  const scrollRef = useRef(null);
  const onContentScroll = useCallback((e) => {
    setFilterShadow(e.target.scrollTop > 2);
  }, []);

  const { loading, data } = useMissionData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    doctorId: filters.doctor,
    clinicId: filters.clinic,
    refreshKey,
  });
  const { kpis, charts } = data;

  const handleExport = useCallback(async () => {
    if (loading || exporting) return;
    setExporting(true);
    try {
      // Decouple the export from the on-screen chart: fan out over the FULL doctor roster so the
      // "Doctor Comparison" sheet lists every doctor (the chart stays capped for readability/perf).
      // Falls back to the capped chart data if the full build fails.
      const [{ exportMissionExcel }, fullByDoctor] = await Promise.all([
        import("./exportMissionExcel"),
        buildAllDoctorBars({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          doctorId: filters.doctor,
          clinicId: filters.clinic,
        }).catch(() => null),
      ]);
      await exportMissionExcel({
        kpis,
        charts: fullByDoctor?.data?.length ? { ...charts, byDoctor: fullByDoctor } : charts,
        filters,
        doctorOptions,
        clinicOptions,
      });
      trackAnalytics(EVENTS.REPORT_DOWNLOADED, {
        department: "opd",
        report_name: "mission_opd_analytics",
        filter_type: "excel_export",
      });
    } catch (err) {
      console.error("Mission analytics export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [loading, exporting, kpis, charts, filters, doctorOptions, clinicOptions, dateRange]);

  const kpiItems = useMemo(() => [
    {
      key: "footfall",
      label: "Total footfall",
      value: kpis.totalFootfall,
      kind: "number",
      tooltip: "All appointments booked in the selected period",
      ...(typeof kpis.totalFootfallDelta === "number" ? { delta: kpis.totalFootfallDelta } : {}),
    },
    {
      key: "completed",
      label: "Completed",
      value: kpis.completed,
      kind: "number",
      tooltip: "Appointments completed in the selected period",
      ...(typeof kpis.completedDelta === "number" ? { delta: kpis.completedDelta } : {}),
    },
    { key: "inQueue", label: "In queue / No-show", value: kpis.scheduled, kind: "number", tooltip: "Still waiting in queue. For past dates, these are no-shows." },
    { key: "cancelled", label: "Cancelled", value: kpis.cancelled, kind: "number", invert: true, tooltip: "Appointments cancelled in the selected period" },
    {
      key: "avgVisitsPerDay",
      label: "Avg visits / day",
      value: kpis.avgVisitsPerDay,
      kind: "number",
      approx: true,
      tooltip: "Total footfall divided by number of days",
      ...(typeof kpis.avgVisitsPerDayDelta === "number" ? { delta: kpis.avgVisitsPerDayDelta } : {}),
    },
    { key: "busyDay", label: "Busiest day", value: kpis.busiestDay || "No data", kind: "text", tooltip: "Weekday with the most visits" },
    {
      key: "rate",
      label: "Digitization %",
      value: kpis.digitalPrescriptionPercent,
      kind: "percent",
      tooltip: "Digitized prescriptions as a share of total CVT cases in the selected period",
    },
    {
      key: "prescriptions",
      label: "Total digitized",
      value: kpis.totalDigitized,
      kind: "number",
      tooltip: "Prescriptions digitized (CVT) in the selected period",
    },
    { key: "total", label: "Total patients", value: kpis.totalPatients, kind: "number", tooltip: "Unique patients seen in the selected period" },
    { key: "onetime", label: "One-time visitors", value: kpis.oneTime, kind: "number", tooltip: "Patients who visited only once" },
    { key: "returning", label: "Returning patients", value: kpis.returning, kind: "number", tooltip: "Patients with more than one visit" },
  ], [kpis]);

  if (!canShowMissionAnalyticsNav(tokenResult, profile)) {
    return null;
  }

  const heroActions = (
    <div className="ma-hero-actions">
      <Button
        variant="tonal"
        theme="neutral"
        size="sm"
        aria-label="Export Excel"
        onClick={handleExport}
        disabled={loading || exporting}
        leftIcon={<TPLibraryIcon name="document-download" size={18} variant="bulk" />}
      />
      <Button
        variant="tonal"
        theme="neutral"
        size="sm"
        aria-label="Refresh"
        onClick={handleRefresh}
        leftIcon={<TPLibraryIcon name="refresh-arrow2" size={18} variant="bulk" />}
      />
    </div>
  );

  const body = (
    <div
      className={`da-root${embedded ? " ma-embedded" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--tesseract-slate-50)",
      }}
    >
      {!embedded && (
        <Header
          back
          onBack={close}
          leading={
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--tesseract-fg-heading)", whiteSpace: "nowrap" }}>
              Data Analytics
            </span>
          }
          density="compact"
        />
      )}

      <main className={embedded ? "ma-embedded-main" : undefined} style={embedded ? undefined : {
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <HeroBanner
          size={embedded ? "md" : "lg"}
          align="top"
          tone="violet"
          title="OPD Analytics"
          subtitle="All metrics at a glance"
          bottomRadius={24}
          actions={heroActions}
        />

        <div className={embedded ? "ma-embedded-card-wrap" : undefined} style={embedded ? undefined : { padding: "0 24px 24px", flex: 1, minHeight: 0, display: "flex" }}>
          <div
            className={embedded ? "ma-embedded-card" : undefined}
            style={embedded ? undefined : {
              marginTop: -72,
              position: "relative",
              zIndex: 1,
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              background: "var(--tesseract-bg-surface, #fff)",
              border: "none",
              borderRadius: "var(--tesseract-radius-16)",
              boxShadow: "var(--tesseract-shadow-lg)",
              overflow: "hidden",
            }}
          >
            <div
              className={embedded ? "ma-embedded-filters" : undefined}
              style={{
                flexShrink: 0,
                padding: "16px 20px",
                background: "var(--tesseract-slate-0)",
                position: "relative",
                zIndex: 2,
                boxShadow: filterShadow ? "var(--tesseract-shadow-md)" : "none",
                transition: "box-shadow 0.2s ease",
              }}
            >
              <FilterBar
                dateValue={dateValue}
                onDateChange={handleDateChange}
                doctors={doctors}
                onDoctorsChange={(v) => { setDoctors(v); trackAnalytics(EVENTS.FILTER_APPLIED, { department: "opd", section: "all", filter_type: "doctor", filter_count: v.length }); }}
                clinics={clinics}
                onClinicsChange={(v) => { setClinics(v); trackAnalytics(EVENTS.FILTER_APPLIED, { department: "opd", section: "all", filter_type: "clinic", filter_count: v.length }); }}
                doctorOptions={doctorOptions}
                clinicOptions={clinicOptions}
                doctorLocked={doctorLocked}
                lockedDoctorLabel={caps.selfName}
                singleClinic={caps.singleClinic}
                hasActiveFilters={hasActiveFilters}
                onClearAll={clearAllFilters}
              />
            </div>

            <div
              key={refreshKey}
              ref={scrollRef}
              onScroll={onContentScroll}
              className={embedded ? "ma-embedded-scroll" : undefined}
              style={embedded ? undefined : {
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "4px 20px 20px",
                background: "var(--tesseract-bg-surface, #fff)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <KpiRow title="Key metrics" kpis={loading ? [] : kpiItems} loading={loading} />

                <SectionBlock title="More insights" count={8}>
                  {loading ? (
                    <div className="da-chart-grid">
                      <Skeleton variant="rectangular" height={320} radius={16} />
                      <Skeleton variant="rectangular" height={320} radius={16} />
                      <Skeleton variant="rectangular" height={320} radius={16} />
                      <Skeleton variant="rectangular" height={320} radius={16} />
                    </div>
                  ) : (
                    <ChartGrid>
                      <ChartTile
                        title="Appointment status"
                        iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/business/activity.svg"
                        titleTooltip="Breakdown of appointment outcomes"
                      >
                        <DonutWithLegend data={charts.appointmentStatus} centerLabel="Appointments" height={240} />
                      </ChartTile>

                      <ChartTile
                        title="Visit trend"
                        icon="chart-square"
                        titleTooltip="Booked vs completed vs digitized (CVT) per day"
                      >
                        <MaybeScroll count={charts.visitTrend?.data?.length || 0} fit={7} perItem={80}>
                          <BarChartZ data={charts.visitTrend?.data} series={charts.visitTrend?.series} xKey="x" height={240} showAverage={false} />
                        </MaybeScroll>
                      </ChartTile>

                      <ChartTile
                        title="Doctor-wise comparison"
                        icon="stethoscope"
                        titleTooltip="Booked vs completed vs digitized (CVT) per doctor"
                      >
                        <MaybeScroll count={charts.byDoctor?.data?.length || 0} fit={5} perItem={110}>
                          <BarChartZ data={charts.byDoctor?.data} series={charts.byDoctor?.series} xKey="x" height={240} showAverage={false} />
                        </MaybeScroll>
                      </ChartTile>

                      <ChartTile
                        title="Overall donut"
                        iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/business/activity.svg"
                        titleTooltip="Cancellations, booked, and completed overview"
                      >
                        <DonutWithLegend
                          data={[
                            { label: "Completed", value: kpis.completed },
                            { label: "In queue / No-show", value: kpis.scheduled },
                            { label: "Cancelled", value: kpis.cancelled },
                          ]}
                          centerLabel="Total"
                          height={240}
                        />
                      </ChartTile>

                      <ChartTile
                        title="Age distribution"
                        iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-circle.svg"
                        titleTooltip="Patient age group breakdown"
                      >
                        <BarChartZ data={charts.ageDistribution?.data} series={charts.ageDistribution?.series} xKey="x" height={240} showAverage={false} />
                      </ChartTile>

                      <ChartTile
                        title="Visit frequency"
                        iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/chart/right-chart.svg"
                        titleTooltip="Distribution of patients by number of visits"
                      >
                        <BarChartZ data={charts.visitFrequency?.data} series={charts.visitFrequency?.series} xKey="x" height={240} showAverage={false} />
                      </ChartTile>

                      <ChartTile
                        title="Gender distribution"
                        iconUrl="https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/users/profile-2user.svg"
                        titleTooltip="Patient gender breakdown"
                      >
                        <DonutWithLegend data={charts.genderDistribution} centerLabel="Patients" height={240} />
                      </ChartTile>

                      <ChartTile
                        title="Patient segmentation"
                        icon="profile-tick"
                        titleTooltip="New (1 visit), Occasional (2-3), Regular (4-10), Loyal (10+)"
                      >
                        <DonutWithLegend data={charts.segmentation} centerLabel="Patients" height={240} />
                      </ChartTile>
                    </ChartGrid>
                  )}
                </SectionBlock>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  if (embedded) {
    return (
      <TesseractThemeProvider
        colorScheme="light"
        className="ma-embedded-theme-fill"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {body}
      </TesseractThemeProvider>
    );
  }

  return (
    <TesseractThemeProvider colorScheme="light">
      <Drawer open={open} onOpenChange={(v) => (!v ? close() : setOpen(v))}>
        <DrawerContent side="right" width="full" showClose={false} bodyPadding={0}>
          {body}
        </DrawerContent>
      </Drawer>
    </TesseractThemeProvider>
  );
}

function isComparable(range) {
  if (!range?.startDate || !range?.endDate) return false;
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const days = Math.round((end - start) / 86400000) + 1;
  return days <= 90;
}
