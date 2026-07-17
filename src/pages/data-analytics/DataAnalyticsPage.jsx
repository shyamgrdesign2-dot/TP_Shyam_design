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
  { id: "symptoms", label: "Symptoms", icon: "medical/virus" },
  { id: "examination", label: "Examination", icon: "medical/medical-service" },
  { id: "medications", label: "Medications", icon: "medical/tablets" },
  { id: "lab-tests", label: "Investigations", icon: "medical/lab" },
  { id: "vitals", label: "Vitals", icon: "medical/heart-rate" },
  { id: "medical-history", label: "History", icon: "medical/health-care" },
  { id: "advice", label: "Advice", icon: "medical/medical-service" },
  { id: "vaccines", label: "Vaccines", icon: "medical/injection" },
  { id: "certificates", label: "Certificates", icon: "sports2/award-badge5" },
  // atom exists only as linear on the CDN — pin it so the active state doesn't 404
  { id: "custom-modules", label: "Custom Modules", icon: "social/atom", fixedVariant: "linear" },
];


// The new Data Analytics — a standalone page that OPENS like a full-page,
// right-anchored drawer, built entirely on Tesseract. Kept separate from the
// legacy opd-analytics / ipd-analytics modules.
export default function DataAnalyticsPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [department, setDepartment] = useState("opd");
  const [section, setSection] = useState("overview");
  const [subTab, setSubTab] = useState("all");

  // What this account is configured for (role, clinics, modules, modes) —
  // features a clinic/doctor doesn't have are never rendered (spec §1.7).
  const caps = useCapabilities();

  // Only Care has sub-tabs; Grow is a single combined view (user ruling).
  // Procedures / Gynec / Obstetric tabs were REMOVED (API-CONTRACTS-CURRENT
  // §7 WONT-BUILD: procedures have no data source; gynec/obstetric live in
  // MongoDB outside the reporting pipeline).
  const subTabsConfig = section === "care" ? CARE_SUB_TABS : null;

  // Shared filter state — every section reads the same values. The date filter
  // defaults to the "Past 7 days" preset; `dateValue` is what the picker shows
  // (preset id string → preset label; {start,end} → date range), `dateRange`
  // is the resolved { startDate, endDate, days, month } the hooks query with.
  const [dateValue, setDateValue] = useState(DEFAULT_DATE_VALUE);
  const [dateRange, setDateRange] = useState(() => periodToRange("7d"));
  // Multi-select filters — arrays of ids; empty array = "all".
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Role scoping: a sub-doctor only ever sees their own metrics — their name
  // stays selected and the doctor filter is locked. Admin keeps the full
  // multi-select (empty = all doctors).
  const doctorLocked = !caps.isAdmin && !!caps.selfId;
  useEffect(() => {
    if (doctorLocked) setDoctors([caps.selfId]);
  }, [doctorLocked, caps.selfId]);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => {
    // Bust the request cache so every endpoint re-fetches
    import("./data/apiCache").then((m) => m.clearApiCache());
    setRefreshKey((k) => k + 1);
  }, []);

  const navItems = NAV_BY_DEPARTMENT[department];
  const hero = heroFor(department, section);
  const deptLabel = department === "ipd" ? "IPD" : "OPD";

  // Real doctor + clinic lists (live API fallback when Redux is cold), so the
  // filter dropdowns always have options. Clearing a field means "all".
  const { doctorOptions, clinicOptions } = useFilterOptions();

  // The DateRangePicker emits { presetId, start, end, ... }. Keep the preset id
  // as the display value when a preset is picked (so the trigger reads its
  // label); otherwise show the raw {start,end} range.
  const handleDateChange = (v) => {
    const start = v?.start instanceof Date ? v.start : null;
    const end = v?.end instanceof Date ? v.end : start;
    if (v?.presetId) setDateValue(v.presetId);
    else setDateValue(start ? { start, end } : DEFAULT_DATE_VALUE);
    if (start) setDateRange(datesToRange(start, end));
  };

  // Hooks consume `doctor`/`clinic` as a CSV id string (spec §1.2 accepts a
  // comma-separated list); empty selection = undefined = all.
  const filters = useMemo(
    () => ({
      ...dateRange,
      // A locked sub-doctor is always scoped to themselves, even on the very
      // first render before the default-selection effect has run.
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

  const onDepartmentChange = (value) => {
    setDepartment(value);
    setSection("overview");
    setSubTab("all");
  };

  const onSectionChange = (value) => {
    setSection(value);
    setSubTab("all");
  };

  // Clear-all resets every filter to its default state (all doctors, all
  // clinics, Past 7 days). The CTA only shows while something is active.
  // A locked doctor (sub-doctor) and a single clinic never count as "active"
  // and never reset away from themselves.
  const hasActiveFilters =
    (!doctorLocked && doctors.length > 0) ||
    (!caps.singleClinic && clinics.length > 0) ||
    dateValue !== DEFAULT_DATE_VALUE;
  const clearAllFilters = () => {
    setDoctors(doctorLocked ? [caps.selfId] : []);
    setClinics([]);
    setDateValue(DEFAULT_DATE_VALUE);
    setDateRange(periodToRange("7d"));
  };

  // The IPD department only exists for accounts with the IPD module enabled.
  const deptOptions = useMemo(
    () =>
      DEPARTMENTS.filter((d) => d.value !== "ipd" || caps.ipd).map((d) => ({
        value: d.value,
        label: d.label,
      })),
    [caps.ipd]
  );

  const [filterShadow, setFilterShadow] = useState(false);
  const scrollRef = useRef(null);
  const onContentScroll = useCallback((e) => {
    setFilterShadow(e.target.scrollTop > 2);
  }, []);

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
                  title={`${deptLabel} ${hero.title}`}
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
                        <Tabs value={subTab} onValueChange={setSubTab} size="md" variant="line">
                          {/* Care's 15 tabs fill the row; Grow's 3 hug their text, left-aligned */}
                          <TabsList fullWidth={section === "care"}>
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

                    {/* Filter header — fixed, shadow appears on scroll */}
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
                        onDoctorsChange={setDoctors}
                        clinics={clinics}
                        onClinicsChange={setClinics}
                        doctorOptions={doctorOptions}
                        clinicOptions={clinicOptions}
                        doctorLocked={doctorLocked}
                        lockedDoctorLabel={caps.selfName}
                        singleClinic={caps.singleClinic}
                        hasActiveFilters={hasActiveFilters}
                        onClearAll={clearAllFilters}
                      />
                    </div>

                    {/* Section body — scrolls */}
                    <div
                      ref={scrollRef}
                      onScroll={onContentScroll}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        padding: "4px 20px 20px",
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

function SectionContent({ department, section, filters, hero, subTab }) {
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
        return <ReportsTab filters={filters} department="opd" />;
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
        return <ReportsTab filters={filters} department="ipd" />;
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
