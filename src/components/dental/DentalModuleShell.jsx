/**
 * DentalModuleShell — full-screen dental module with top nav + 2-tab secondary sidebar.
 * Tabs:
 *   1. Examination / Findings → 3D dental canvas (ported from 3D_Dental_R3F)
 *   2. Treatment Plan → PRD-spec table with auto-calculation
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Health, ClipboardText } from "iconsax-reactjs";
import { ExaminationTab } from "./examination/ExaminationTab";
import { TreatmentPlanTab } from "./plan/TreatmentPlanTab";
import dui from "./dental-ui.module.scss";
import { APPOINTMENT_PATIENTS } from "./lib/appointment-patients";
import { RxPadChromeProvider } from "./tp-rxpad/rxpad-chrome-context";
import { RxPadSyncProvider } from "./tp-rxpad/rxpad-sync-context";
import { BillingCatalogProvider } from "./lib/billing-catalog-context";
const PATIENT_NAMES = {
  ...Object.fromEntries(
    Object.entries(APPOINTMENT_PATIENTS).map(([id, p]) => [
    id,
    `${p.name}, ${p.age}${p.genderShort}`]
    )
  ),
  // Legacy PAT-* IDs retained for direct testing
  "PAT-001": "Aarav Mehta, 34M",
  "PAT-002": "Priya Sharma, 28F",
  "PAT-003": "Rahul Verma, 9M",
  "PAT-004": "Sneha Reddy, 42F"
};
export function DentalModuleShell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams?.get("patientId") ?? "PAT-001";
  const rawName = PATIENT_NAMES[patientId] || "Unknown, 30M";
  const ageMatch = rawName.match(/(\d+)[MF]/);
  const patientAge = ageMatch ? parseInt(ageMatch[1], 10) : 30;
  const [activeTab, setActiveTab] = useState("examination");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(
      `dental.module.active-tab.${patientId}`
    );
    if (saved === "examination" || saved === "plan") {
      setActiveTab(saved);
    }
  }, [patientId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `dental.module.active-tab.${patientId}`,
      activeTab
    );
  }, [activeTab, patientId]);
  const handleBack = () => {
    navigate(`/rxpad?patientId=${patientId}`);
  };
  return (
    <RxPadChromeProvider>
      <RxPadSyncProvider>
        <BillingCatalogProvider>
          <div className={dui.shellRoot}>
            {/* ... */}
            <header className={dui.shellHeader}>
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go back"
                className={dui.shellBackBtn}>
                <div aria-hidden="true" className={dui.shellBackRule} />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#454551"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{
                    opacity: 0.7
                  }}>
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <div className={dui.shellTitleCol}>
                <h1 className={dui.shellTitle}>Dental Module</h1>
                <p className={dui.shellSubtitle}>
                  Tooth-wise examination & treatment planning - {rawName}
                </p>
              </div>
            </header>
            <div className={dui.shellBody}>
              <nav
                aria-label="Dental module tabs"
                className={dui.shellNav}
                style={{
                  backgroundImage:
                  "radial-gradient(120% 120% at 20% 0%, rgb(75,74,213) 0%, rgb(49,48,151) 50%, rgb(22,21,88) 100%)"
                }}>
                <TabButton
                  icon={
                  <Health
                    size={20}
                    variant={activeTab === "examination" ? "Bulk" : "Linear"}
                    color={
                    activeTab === "examination" ? "var(--tp-blue-500)" : "#FFFFFF"}
                    strokeWidth={1.5} />}
                  label="Exam"
                  active={activeTab === "examination"}
                  onClick={() => setActiveTab("examination")} />
                <TabButton
                  icon={
                  <ClipboardText
                    size={20}
                    variant={activeTab === "plan" ? "Bulk" : "Linear"}
                    color={activeTab === "plan" ? "var(--tp-blue-500)" : "#FFFFFF"}
                    strokeWidth={1.5} />}
                  label="Plan"
                  active={activeTab === "plan"}
                  onClick={() => setActiveTab("plan")} />
              </nav>
              <main className={dui.shellMain}>
                {activeTab === "examination" ?
                <ExaminationTab patientId={patientId} patientAge={patientAge} /> :
                <TreatmentPlanTab patientId={patientId} patientAge={patientAge} />}
              </main>
            </div>
          </div>
        </BillingCatalogProvider>
      </RxPadSyncProvider>
    </RxPadChromeProvider>
  );

}
function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={dui.tabNavBtn}>

      <div
        className={`${dui.tabNavIconWrap} ${
          active ? dui.tabNavIconOn : dui.tabNavIconOff
        }`}>

        {icon}
      </div>
      <span
        className={`${dui.tabNavLabel} ${
          active ? dui.tabNavLabelOn : dui.tabNavLabelOff
        }`}>

        {label}
      </span>
      {active && <span className={dui.tabNavCaret} />}
    </button>);

}