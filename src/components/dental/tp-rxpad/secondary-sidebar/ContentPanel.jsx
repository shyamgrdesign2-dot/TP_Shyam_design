/**
 * Right content panel — gradient header + scrollable section content.
 */
import React from "react";
import svgPaths from "./imports/svg-g7iuydxwol";
import { PastVisitsContent } from "./content/PastVisitsContent";
import { VitalsContent } from "./content/VitalsContent";
import { HistoryContent } from "./content/HistoryContent";
import { GynecHistoryContent } from "./content/GynecHistoryContent";
import { ObstetricHistoryContent } from "./content/ObstetricHistoryContent";
import { VaccineContent } from "./content/VaccineContent";
import { GrowthContent } from "./content/GrowthContent";
import { MedicalRecordsContent } from "./content/MedicalRecordsContent";
import { LabResultsContent } from "./content/LabResultsContent";
import { PersonalNotesContent } from "./content/PersonalNotesContent";
import { EmptyStateContent } from "./content/EmptyStateContent";
import { DentalContent } from "./content/DentalContent";
import p from "./rxSidebarPrimitives.module.scss";
import styles from "./ContentPanel.module.scss";

const SECTION_TITLES = {
  pastVisits: "Past Visit",
  vitals: "Vitals",
  history: "Medical History",
  ophthal: "Ophthal",
  gynec: "Gynec History",
  obstetric: "Obstetric History",
  vaccine: "Vaccination",
  growth: "Growth",
  medicalRecords: "Medical Records",
  labResults: "Lab Results",
  personalNotes: "Personal Notes",
  dental: "Dental History",
  dentalPlan: "Dental Treatment Plan",
};

function SectionHeader({ title, onClose }) {
  return (
    <div className={styles.sectionHeaderRoot}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionTitleWrap}>
          <p className={`${p.sectionHeaderTitle} ${styles.sectionTitle}`}>
            {title}
          </p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Collapse section panel"
        >
          <div className={styles.closeInner}>
            <div className={styles.closeIconBox}>
              <div className={styles.closeSvgAbs}>
                <div style={{ position: "absolute", inset: "-5.56%" }}>
                  <svg
                    className={styles.closeSvgFull}
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 14.4 14.4"
                  >
                    <path
                      d={svgPaths.p3558c040}
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.8"
                      strokeWidth="1.44"
                    />
                  </svg>
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: "12.5% 62.5% 12.5% 37.5%",
                }}
              >
                <div style={{ position: "absolute", inset: "-5.56% -0.72px" }}>
                  <svg
                    className={styles.closeSvgFull}
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 1.44 14.4"
                  >
                    <path
                      d="M0.72 0.72V13.68"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.8"
                      strokeWidth="1.44"
                    />
                  </svg>
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: "37.5% 33.33% 37.5% 54.17%",
                }}
              >
                <div style={{ position: "absolute", inset: "-16.67% -33.33%" }}>
                  <svg
                    className={styles.closeSvgFull}
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 3.6 5.76"
                  >
                    <path
                      d={svgPaths.pcf85200}
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.8"
                      strokeWidth="1.44"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function SectionContent({ activeId }) {
  switch (activeId) {
    case "pastVisits":
      return <PastVisitsContent />;
    case "vitals":
      return <VitalsContent />;
    case "history":
      return <HistoryContent />;
    case "gynec":
      return <GynecHistoryContent />;
    case "obstetric":
      return <ObstetricHistoryContent />;
    case "vaccine":
      return <VaccineContent />;
    case "growth":
      return <GrowthContent />;
    case "medicalRecords":
      return <MedicalRecordsContent />;
    case "labResults":
      return <LabResultsContent />;
    case "personalNotes":
      return <PersonalNotesContent />;
    case "dental":
      return <DentalContent />;
    case "ophthal":
    default:
      return <EmptyStateContent sectionLabel={SECTION_TITLES[activeId]} />;
  }
}

export function ContentPanel({ activeId, onClose }) {
  return (
    <div className={styles.panelRoot}>
      <div className={styles.panelBorder} aria-hidden />
      <SectionHeader title={SECTION_TITLES[activeId]} onClose={onClose} />
      <div className={styles.bodyFlex}>
        <div className={styles.bodyAbs}>
          <SectionContent activeId={activeId} />
        </div>
      </div>
    </div>
  );
}
