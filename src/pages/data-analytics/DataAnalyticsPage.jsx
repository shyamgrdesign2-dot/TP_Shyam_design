import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TesseractThemeProvider,
  Drawer,
  DrawerContent,
  Sidebar,
  HeroBanner,
  SectionCard,
  SegmentedControl,
  Header,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias ("./styles.css" → dist css); webpack resolves it, eslint-plugin-import cannot
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import "./data-analytics.css";

import { DEPARTMENTS, NAV_BY_DEPARTMENT, heroFor } from "./shell/analyticsNav";
import FilterBar from "./filters/FilterBar";
import { DEFAULT_DATE_VALUE, periodToRange, datesToRange } from "./filters/periods";
import OverviewSection from "./sections/OverviewSection";
import BillingSection from "./sections/BillingSection";
import AppointmentsSection from "./sections/AppointmentsSection";
import InpatientOverviewSection from "./sections/InpatientOverviewSection";
import ConsultationModesSection from "./sections/ConsultationModesSection";
import PatientsSection from "./sections/PatientsSection";
import CareSection from "./sections/CareSection";
import GrowSection from "./sections/GrowSection";
import MessagesSection from "./sections/MessagesSection";
import AdmissionsDepthSection from "./sections/AdmissionsDepthSection";
import WardsSection from "./sections/WardsSection";
import ClinicalActivitySection from "./sections/ClinicalActivitySection";
import ReportsTab from "./reports/ReportsTab";
import useFilterOptions from "./data/useFilterOptions";
import useCapabilities from "./data/useCapabilities";
import { trackAnalytics, EVENTS } from "./data/analyticsTracking";
import {
  DA_ACCESS_CONSULT_MODES,
  DA_ACCESS_SSO,
  getDataAnalyticsAccessMode,
} from "./data/analyticsAccess";
import { getDecodedToken } from "../../utils/localStorage";

const MED_ICON_BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded";
// `icon` is a folder-qualified path ("medical/diagnosis"). Tesseract's
// TabsTrigger clones this with variant="bulk" when active / "linear" when
// inactive; `fixedVariant` pins icons that only exist in one variant on the
// CDN (e.g. social/atom has no bulk build).
function MedicalTabIcon({ icon, variant = "linear", fixedVariant, size = 18 }) {
  const url = `${MED_ICON_BASE}/${fixedVariant || variant}/${icon}.svg`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: "currentcolor",
        WebkitMaskImage: `url(${url})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: `url(${url})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

const CARE_SUB_TABS = [
  { id: "all", label: "Overview", icon: "medical/health-care" },
  { id: "diagnosis", label: "Diagnoses", icon: "medical/diagnosis" },
  // symptoms hidden: backend data-quality issues (severity text as names, slash artifacts).
  // Restore when Pm-Core fixes jsonEntryNames / splitFreeText (see SYMPTOMS-EXAM-HISTORY-DATA-QUALITY.md).
  // { id: "symptoms", label: "Symptoms", icon: "medical/virus" },
  // { id: "examination", label: "Examination", icon: "medical/medical-service" },
  { id: "medications", label: "Medications", icon: "medical/tablets" },
  { id: "lab-tests", label: "Investigations", icon: "medical/lab" },
  { id: "vitals", label: "Vitals", icon: "medical/heart-rate" },
  // medical-history hidden: backend returns empty arrays (JSON shape mismatch in parseMhSection).
  // { id: "medical-history", label: "History", icon: "medical/health-care" },
  { id: "advice", label: "Advice", icon: "medical/medical-service" },
  { id: "vaccines", label: "Vaccines", icon: "medical/injection" },
  // certificates hidden: backend returns certificate counts but no type names (all show "Unknown").
  // { id: "certificates", label: "Certificates", icon: "sports2/award-badge5" },
  // custom-modules hidden: backend returns all zeros (2-hop doctor-to-business scope bug).
  // Restore when Pm-Core fixes the custom-models endpoint (BUG-6 / item #6).
  // { id: "custom-modules", label: "Custom Modules", icon: "social/atom", fixedVariant: "linear" },
];

const REPORTS_SUB_TABS = [
  { id: "opd", label: "OPD", icon: "medical/clipboard-activity" },
  { id: "ipd", label: "IPD", icon: "medical/hospital-bed" },
];

// The new Data Analytics — a standalone page that OPENS like a full-page,
// right-anchored drawer, built entirely on Tesseract. Kept separate from the
// legacy opd-analytics / ipd-analytics modules.
export default function DataAnalyticsPage() {
  const navigate = useNavigate();
  const accessMode = useMemo(
    () => getDataAnalyticsAccessMode(getDecodedToken()?.result),
    []
  );
  const isConsultModesOnly = accessMode === DA_ACCESS_CONSULT_MODES;

  const [open, setOpen] = useState(true);
  const [department, setDepartment] = useState("opd");
  const [section, setSection] = useState(
    isConsultModesOnly ? "consultation-modes" : "overview"
  );
  const [subTab, setSubTab] = useState("all");

  // What this account is configured for (role, clinics, modules, modes) —
  // features a clinic/doctor doesn't have are never rendered (spec §1.7).
  const caps = useCapabilities();
  const openedAtRef = useRef(Date.now());

  // Direct URL access: SSO-only accounts should not land on the native page.
  useEffect(() => {
    if (accessMode === DA_ACCESS_SSO) {
      navigate("/", { replace: true });
    }
  }, [accessMode, navigate]);

  useEffect(() => {
    if (accessMode === DA_ACCESS_SSO) return undefined;
    trackAnalytics(EVENTS.OPENED, { department });
    return () => {
      const seconds = Math.round((Date.now() - openedAtRef.current) / 1000);
      trackAnalytics(EVENTS.CLOSED, { department, section, time_spent_seconds: seconds });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Only Care has sub-tabs; Grow is a single combined view (user ruling).
  // Procedures / Gynec / Obstetric tabs were REMOVED (API-CONTRACTS-CURRENT
  // §7 WONT-BUILD: procedures have no data source; gynec/obstetric live in
  // MongoDB outside the reporting pipeline).
  const subTabsConfig = section === "care" ? CARE_SUB_TABS : section === "reports" ? REPORTS_SUB_TABS : null;

  // Shared filter state — every section reads the same values. The date filter
  // defaults to the "Past 7 days" preset; `dateValue` is what the picker shows
  // (preset id string → preset label; {start,end} → date range), `dateRange`
  // is the resolved { startDate, endDate, days, month } the hooks query with.
  const [dateValue, setDateValue] = useState(DEFAULT_DATE_VALUE);
  const [dateRange, setDateRange] = useState(() => periodToRange("7d"));
  // Multi-select filters — arrays of ids; empty array = "all".
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Clinic-wide doctor filter if the user is admin/owner OR has the Data
  // Analytics module on their profile. Everyone else stays locked to self.
  const hospitalScope = caps.isAdmin || caps.hasAnalyticsModule;
  const doctorLocked = !hospitalScope && !!caps.selfId;
  useEffect(() => {
    if (doctorLocked) setDoctors([caps.selfId]);
  }, [doctorLocked, caps.selfId]);

  // Clinic is always locked to the logged-in clinic from the auth token.
  useEffect(() => {
    if (caps.selfClinicId) setClinics([caps.selfClinicId]);
  }, [caps.selfClinicId]);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => {
    trackAnalytics(EVENTS.REFRESH, { department, section });
    import("./data/apiCache").then((m) => m.clearApiCache());
    import("./data/doctorList").then((m) => m.clearDoctorListCache());
    setRefreshKey((k) => k + 1);
  }, [department, section]);

  const navItems = useMemo(() => {
    let raw = NAV_BY_DEPARTMENT[department] || [];
    if (isConsultModesOnly) {
      raw = raw.filter((item) => item.id === "consultation-modes");
    }
    return raw.map((item) => {
      if (!item.iconBulkUrl) return item;
      const url = item.id === section ? item.iconBulkUrl : item.iconLinearUrl;
      return {
        ...item,
        icon: React.createElement("span", {
          "aria-hidden": true,
          "data-tp-icon": "custom",
          style: {
            display: "inline-block",
            width: 20,
            height: 20,
            flexShrink: 0,
            backgroundColor: "currentcolor",
            WebkitMaskImage: `url(${url})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: `url(${url})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          },
        }),
      };
    });
  }, [department, section, isConsultModesOnly]);

  const handleDoctorsChange = useCallback(
    (v) => {
      const value = Array.isArray(v) ? v : [];
      setDoctors(value);
      trackAnalytics(EVENTS.FILTER_APPLIED, {
        department,
        section,
        filter_type: "doctor",
        filter_count: value.length,
      });
    },
    [department, section]
  );

  const handleClinicsChange = useCallback(
    (v) => {
      const value = Array.isArray(v) ? v : [];
      setClinics(value);
      trackAnalytics(EVENTS.FILTER_APPLIED, {
        department,
        section,
        filter_type: "clinic",
        filter_count: value.length,
      });
    },
    [department, section]
  );

  const hero = heroFor(department, section);
  const deptLabel = department === "ipd" ? "IPD" : "OPD";

  // Real doctor + clinic lists (live API fallback when Redux is cold), so the
  // filter dropdowns always have options. Clearing a field means "all".
  // Skip for SSO-blocked renders; Consultation Modes still needs filter options.
  const { doctorOptions, clinicOptions } = useFilterOptions({
    enabled: accessMode !== DA_ACCESS_SSO,
  });

  // The DateRangePicker emits { presetId, start, end, ... }. Keep the preset id
  // as the display value when a preset is picked (so the trigger reads its
  // label); otherwise show the raw {start,end} range.
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
    trackAnalytics(EVENTS.FILTER_APPLIED, { department, section, filter_type: "period", filter_value: v?.presetId || "custom_range" });
  };

  // Hooks consume `doctor`/`clinic` as a CSV id string (empty = all).
  // clinic/* hooks may still narrow via singleIdOnly(); analytics/* accept CSV.
  // Clinic is always the auth-token clinic (even before the default effect runs).
  const filters = useMemo(
    () => ({
      ...dateRange,
      // A locked sub-doctor is always scoped to themselves, even on the very
      // first render before the default-selection effect has run.
      doctor: doctorLocked ? caps.selfId : doctors.length ? doctors.join(",") : undefined,
      clinic: caps.selfClinicId || (clinics.length ? clinics.join(",") : undefined),
      canCompare: isComparable(dateRange),
    }),
    [dateRange, doctors, clinics, doctorLocked, caps.selfId, caps.selfClinicId]
  );

  const close = () => {
    setOpen(false);
    window.setTimeout(() => navigate(-1), 240);
  };

  const onDepartmentChange = (value) => {
    if (isConsultModesOnly && value !== "opd") return;
    trackAnalytics(EVENTS.DEPT_SWITCH, { from_department: department, to_department: value });
    setDepartment(value);
    setSection(isConsultModesOnly ? "consultation-modes" : "overview");
    setSubTab("all");
  };

  const onSectionChange = (value) => {
    if (isConsultModesOnly && value !== "consultation-modes") return;
    trackAnalytics(EVENTS.SECTION_VIEW, { department, section: value });
    setSection(value);
    setSubTab(value === "reports" ? "opd" : "all");
  };

  // Clear-all resets doctor + date to defaults. Clinic stays on the auth-token
  // clinic (read-only) and never counts as an "active" filter.
  const hasActiveFilters =
    (!doctorLocked && doctors.length > 0) ||
    dateValue !== DEFAULT_DATE_VALUE;
  const clearAllFilters = () => {
    trackAnalytics(EVENTS.FILTER_CLEARED, { department, section });
    setDoctors(doctorLocked ? [caps.selfId] : []);
    if (caps.selfClinicId) setClinics([caps.selfClinicId]);
    setDateValue(DEFAULT_DATE_VALUE);
    setDateRange(periodToRange("7d"));
  };

  // The IPD department only exists for accounts with the IPD module enabled.
  // Mission Hospital restricted access: OPD Analytics only (no IPD toggle).
  const deptOptions = useMemo(
    () =>
      DEPARTMENTS.filter((d) => {
        if (isConsultModesOnly) return d.value === "opd";
        return d.value !== "ipd" || caps.ipd;
      }).map((d) => ({
        value: d.value,
        label: d.label,
      })),
    [caps.ipd, isConsultModesOnly]
  );

  const [filterShadow, setFilterShadow] = useState(false);
  const scrollRef = useRef(null);
  const onContentScroll = useCallback((e) => {
    setFilterShadow(e.target.scrollTop > 2);
  }, []);

  if (accessMode === DA_ACCESS_SSO) {
    return null;
  }

  return (
    <TesseractThemeProvider colorScheme="light">
      <Drawer open={open} onOpenChange={(v) => (!v ? close() : setOpen(v))}>
        <DrawerContent side="right" width="full" showClose={false} bodyPadding={0}>
          <div
            className="da-root"
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              background: "var(--tesseract-slate-50)",
            }}
          >
            <Header
              back
              onBack={close}
              leading={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--tesseract-fg-heading)", whiteSpace: "nowrap" }}>
                    Data Analytics
                  </span>
                  {deptOptions.length > 1 && (
                    <SegmentedControl
                      size="sm"
                      theme="primary"
                      options={deptOptions}
                      value={department}
                      onValueChange={onDepartmentChange}
                    />
                  )}
                </div>
              }
              actions={[
                { type: "cta", icon: "refresh-arrow2", variant: "tonal", theme: "neutral", onClick: handleRefresh, ariaLabel: "Refresh" },
              ]}
              density="compact"
            />

            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <Sidebar
                items={navItems}
                activeId={section}
                onSelect={onSectionChange}
                showCollapseToggle={false}
                defaultCollapsed
              />

              <main
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Hero banner — fixed */}
                <HeroBanner
                  size="lg"
                  align="top"
                  tone="violet"
                  title={section === "reports" ? hero.title : `${deptLabel} ${hero.title}`}
                  subtitle={hero.subtitle}
                  bottomRadius={24}
                />

                {/* Floating card fills the rest; only its body scrolls */}
                <div style={{ padding: "0 24px 24px", flex: 1, minHeight: 0, display: "flex" }}>
                  <div
                    style={{
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
                    {/* Sub-tabs for care/grow — full width, sticky, above filters */}
                    {subTabsConfig && (
                      <div
                        className="da-subtabs"
                        style={{
                          flexShrink: 0,
                          position: "sticky",
                          top: 0,
                          zIndex: 3,
                          background: "var(--tesseract-bg-surface, #fff)",
                          paddingTop: 10,
                          overflowX: "auto",
                          borderBottom: "0.5px solid var(--tesseract-slate-100, #e2e8f0)",
                        }}
                      >
                        <Tabs value={subTab} onValueChange={(v) => { trackAnalytics(EVENTS.SUBTAB_VIEW, { department, section, subtab: v }); setSubTab(v); }} size="md" variant="line">
                          <TabsList>
                            {subTabsConfig.map((tab) => (
                              <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                leftIcon={<MedicalTabIcon icon={tab.icon} fixedVariant={tab.fixedVariant} />}
                              >
                                {tab.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>
                    )}

                    {/* Filter header — fixed, shadow appears on scroll (hidden on Reports) */}
                    {section !== "reports" && (
                      <div
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
                          onDoctorsChange={handleDoctorsChange}
                          clinics={clinics}
                          onClinicsChange={handleClinicsChange}
                          doctorOptions={doctorOptions}
                          clinicOptions={clinicOptions}
                          doctorLocked={doctorLocked}
                          lockedDoctorLabel={caps.selfName}
                          singleClinic
                          lockedClinicLabel={
                            caps.selfClinicName ||
                            clinicOptions.find((c) => c.value === caps.selfClinicId)?.label
                          }
                          hasActiveFilters={hasActiveFilters}
                          onClearAll={clearAllFilters}
                        />
                      </div>
                    )}

                    {/* Section body — scrolls */}
                    <div
                      ref={scrollRef}
                      onScroll={onContentScroll}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        padding: section === "reports" ? "18px 20px 20px" : "4px 20px 20px",
                        background: "var(--tesseract-bg-surface, #fff)",
                      }}
                    >
                      <SectionContent
                        key={`${department}-${section}-${refreshKey}`}
                        department={department}
                        section={section}
                        filters={filters}
                        hero={hero}
                        subTab={subTab}
                        isConsultModesOnly={isConsultModesOnly}
                      />
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
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

function SectionContent({ department, section, filters, hero, subTab, isConsultModesOnly }) {
  // Mission Hospital: mount only Consultation Modes so other section hooks never fire.
  if (isConsultModesOnly) {
    return <ConsultationModesSection filters={filters} />;
  }

  if (department === "opd") {
    switch (section) {
      case "overview":
        return <OverviewSection filters={filters} />;
      case "appointments":
        return <AppointmentsSection filters={filters} />;
      case "consultation-modes":
        return <ConsultationModesSection filters={filters} />;
      case "billing":
        return <BillingSection filters={filters} department="opd" />;
      case "patients":
        return <PatientsSection filters={filters} />;
      case "care":
        return <CareSection filters={filters} subTab={subTab} />;
      case "grow":
        return <GrowSection filters={filters} />;
      case "messages":
        return <MessagesSection filters={filters} />;
      case "reports":
        return <ReportsTab filters={filters} department={subTab === "ipd" ? "ipd" : "opd"} />;
      default:
        break;
    }
  }
  if (department === "ipd") {
    switch (section) {
      case "overview":
        return <InpatientOverviewSection filters={filters} />;
      case "admissions":
        return <AdmissionsDepthSection filters={filters} />;
      case "wards":
        return <WardsSection filters={filters} />;
      case "clinical":
        return <ClinicalActivitySection filters={filters} />;
      case "billing":
        return <BillingSection filters={filters} department="ipd" />;
      case "reports":
        return <ReportsTab filters={filters} department={subTab === "ipd" ? "ipd" : "opd"} />;
      default:
        break;
    }
  }
  return (
    <SectionCard title={hero.title} subtitle={hero.subtitle} icon="chart-square" tone="neutral">
      <div style={{ padding: "24px 4px", color: "var(--tesseract-slate-500)", fontSize: 14 }}>
        {`${department.toUpperCase()} · ${hero.title}: coming soon.`}
      </div>
    </SectionCard>
  );
}
