"use client";
// Print Dental Chart button — renders the same prescription PDF pipeline as
// Preview Rx (buildConsultationPreviewPrintPayload + renderPrintPayloadToBlob),
// scoped to dental/oral content only, then opens the system print dialog.

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { message } from "antd";
import { isMobile, isTablet } from "react-device-detect";
import { useIsDentalEnabled } from "../../../hooks/useIsDentalEnabled";
import { TPTooltip, TPMedicalIcon } from "../tp-ui";
import CashManagerContext from "../../../context/CashManagerContext";
import { selectDentalExamination } from "../../../redux/dentalExaminationSlice";
import { transformToothStateToApi } from "../lib/examination-helpers";
import { buildConsultationPreviewPrintPayload } from "../../../utils/buildConsultationPreviewPrintPayload";
import { renderPrintPayloadToBlob } from "../../../utils/printPayload";
import { resolveDentalOralForPrint } from "../../../utils/resolveDentalOralPrintData";
import { printBlobInNewTab } from "../../../pages/opdBilling/utils/helper";
import { isIPad, getClinic } from "../../../utils/utils";
import {
  DENTAL_MOENGAGE_EVENTS,
  setDentalAnalyticsContext,
  setDentalVisitFlag,
  trackDentalEvent,
} from "../../../utils/dentalMoengage";
import { DENTAL_RX_PAD_ROUTE } from "../../../utils/dentalRoutes";
import dcp from "./DentalChartPrint.module.scss";

function triggerPdfPrint(pdfBlob) {
  const isMobileDevice = isMobile || isTablet || isIPad();
  if (isMobileDevice) {
    printBlobInNewTab(pdfBlob);
    return;
  }

  const blobURL = URL.createObjectURL(pdfBlob);
  document.querySelectorAll("iframe").forEach((iframe) => {
    iframe.parentNode?.removeChild(iframe);
  });
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  iframe.style.display = "none";
  iframe.src = blobURL;
  iframe.onload = () => {
    setTimeout(() => {
      iframe.focus();
      iframe.contentWindow?.print();
      URL.revokeObjectURL(blobURL);
    }, 500);
  };
}

// Returns true if the patient has any chart data worth printing in "historical"
// mode — per-tooth diagnoses, treatment history entries, oral entries, or oral
// notes. Reads the same `dental.exam.chart.<patientId>` store the chart uses.
export function hasHistoricalData(patientId) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(`dental.exam.chart.${patientId || "apt-1"}`);
    if (!raw) return false;
    const c = JSON.parse(raw) || {};
    if (Array.isArray(c.oralEntries) && c.oralEntries.length > 0) return true;
    if (typeof c.oralNotes === "string" && c.oralNotes.trim().length > 0) return true;
    if (Array.isArray(c.entries) && c.entries.length > 0) return true;
    if (c.toothDiagnoses && typeof c.toothDiagnoses === "object") {
      for (const v of Object.values(c.toothDiagnoses)) {
        if (Array.isArray(v) && v.length > 0) return true;
        if (v && typeof v === "object" && Object.keys(v).length > 0) return true;
      }
    }
    if (c.findingsByTooth && typeof c.findingsByTooth === "object") {
      for (const v of Object.values(c.findingsByTooth)) {
        if (Array.isArray(v) && v.length > 0) return true;
      }
    }
    if (c.treatmentHistoryByTooth && typeof c.treatmentHistoryByTooth === "object") {
      for (const v of Object.values(c.treatmentHistoryByTooth)) {
        if (v && typeof v === "object" && Object.keys(v).length > 0) return true;
      }
    }
    if (c.toothNotes && typeof c.toothNotes === "object") {
      for (const v of Object.values(c.toothNotes)) {
        if (typeof v === "string" && v.trim().length > 0) return true;
      }
    }
    if (Array.isArray(c.implantTeeth) && c.implantTeeth.length > 0) return true;
    return false;
  } catch { return false; }
}

export function DentalChartPrintButton({ patientId, patientType = "adult" }) {
  const [open, setOpen] = useState(false);
  const [includePatient, setIncludePatient] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [historicalAvailable, setHistoricalAvailable] = useState(false);
  const rootRef = useRef(null);

  const {
    patient_data,
    tcmId,
    pamId,
    consultationDate,
    symptomsData,
    examinationData,
    surgeriesData,
    diagnosisData,
    adviceData,
    investigationData,
    medicationData,
    vitalsData,
    medicalHistoryData,
    followUpDate,
    additionalNote,
    customModuleContents,
  } = useContext(CashManagerContext) || {};

  const {
    profile,
    defaultPrintSettings,
    frequencyList,
    timingList,
    userId,
  } = useSelector((state) => state.doctors);
  const { customModules, hospitalSearchResults } = useSelector(
    (state) => state.customModules,
  );
  const dentalExamination = useSelector(selectDentalExamination);
  const oralExamination = useSelector((state) => state.oralExamination);
  const isDentalEnabled = useIsDentalEnabled();

  const allAvailableModules = useMemo(() => {
    const modulesWithUserId = (customModules || []).map((module) => ({
      ...module,
      userId: userId || module.userId,
    }));
    const combined = [...modulesWithUserId];
    const existingIds = new Set(modulesWithUserId.map((m) => m.module_id));
    if (hospitalSearchResults?.modules) {
      hospitalSearchResults.modules.forEach((module) => {
        if (!existingIds.has(module.module_id)) {
          combined.push(module);
        }
      });
    }
    return combined;
  }, [customModules, hospitalSearchResults, userId]);

  useEffect(() => {
    setDentalAnalyticsContext({
      profile,
      userId,
      patientData: patient_data,
      clinic: getClinic(profile?.hospital_data),
      pamId,
      tcmId,
      sourcePage: DENTAL_RX_PAD_ROUTE,
    });
  }, [profile, userId, patient_data, pamId, tcmId]);

  useEffect(() => {
    if (!open) return;
    setHistoricalAvailable(hasHistoricalData(patientId));
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, patientId]);

  const runPrint = async (mode) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setOpen(false);

    try {
      const activeDentalData =
        mode === "plain"
          ? []
          : dentalExamination?.toothState &&
              Object.keys(dentalExamination.toothState).length > 0
            ? transformToothStateToApi(dentalExamination.toothState)
            : [];

      const payload = buildConsultationPreviewPrintPayload({
        patient_data,
        profile,
        userId,
        caseManagerData: null,
        currentTcmId: tcmId,
        pamId,
        consultationDate,
        symptomsData,
        examinationData,
        surgeriesData,
        diagnosisData,
        adviceData,
        investigationData,
        medicationData,
        vitalsData,
        medicalHistoryData,
        followUpDate,
        additionalNote,
        customModuleContents,
        defaultPrintSettings,
        frequencyList,
        timingList,
        customModules: allAvailableModules,
        activeDentalData,
        oralExamination,
        isDentalEnabled,
        dentalChartPrintMode: mode,
        includePatientInfo: includePatient,
        dentitionType: dentalExamination?.dentitionType || patientType,
      });

      if (!payload) {
        throw new Error("Print settings are not loaded yet. Please try again.");
      }

      let printPayload = payload;

      if (mode === "historical") {
        const { dentalExaminationData: resolvedDental, examChart: resolvedOralChart } =
          await resolveDentalOralForPrint({
            patientId: patient_data?.patient_unique_id,
            tcmId,
            consultationDate,
            printSettings: payload.printSettings,
            inMemoryDental: {
              tooth_states: activeDentalData,
              dentition_type: dentalExamination?.dentitionType || patientType,
            },
            inMemoryOral: oralExamination,
            caseManagerData: payload.caseManagerData,
            allowFullApiFallback: false,
          });

        printPayload = {
          ...payload,
          dentalExaminationData: resolvedDental,
          examChart: resolvedOralChart,
        };
      }

      const pdfBlob = await renderPrintPayloadToBlob(printPayload, {
        selectedLang: "English",
        isGynaecHistoryAccessable: false,
        onlyShowDental: true,
      });

      if (!pdfBlob) {
        throw new Error("Failed to render dental chart PDF.");
      }

      triggerPdfPrint(pdfBlob);
      setDentalVisitFlag("print_completed_before_end", true);
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CHART_PRINT_STARTED, {
        print_type: mode,
        include_patient_information: includePatient,
        include_historic_data: mode === "historical",
        source_page: DENTAL_RX_PAD_ROUTE,
      });
    } catch (err) {
      console.error("Failed to print dental chart:", err);
      message.error(err?.message || "Failed to print dental chart.");
    } finally {
      setIsPrinting(false);
    }
  };

  const choose = (mode) => {
    if (mode === "historical" && !historicalAvailable) return;
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CHART_PRINT_TYPE_SELECTED, {
      print_type: mode,
      include_historic_data: mode === "historical",
      has_historic_data: historicalAvailable,
      source_page: DENTAL_RX_PAD_ROUTE,
    });
    runPrint(mode);
  };

  const item = (icon, label, sub, mode, opts = {}) => {
    const { disabled = false, disabledReason = "" } = opts;
    const btn = (
      <button
        type="button"
        onClick={() => choose(mode)}
        disabled={disabled || isPrinting}
        className={dcp.menuItem}
      >
        <span className={dcp.menuItemIcon}>
          <TPMedicalIcon name={icon} variant="bulk" size={18} color="var(--tp-blue-500)" />
        </span>
        <span className={dcp.menuItemText}>
          <span className={dcp.menuItemLabel}>{label}</span>
          <span className={dcp.menuItemSub}>{sub}</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={dcp.menuItemChevron}
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );

    if (disabled && disabledReason) {
      return (
        <TPTooltip title={disabledReason} arrow placement="left">
          <span className={dcp.tooltipWrap}>{btn}</span>
        </TPTooltip>
      );
    }
    return btn;
  };

  return (
    <div ref={rootRef} className={dcp.dropdownWrap}>
      {open && (
        <div className={dcp.dropdownPanel}>
          <div className={dcp.dropdownTitle}>Print</div>
          {item("tooth", `Plain ${patientType} dental chart`, "Blank odontogram template", "plain")}
          {item("clipboard-activity", `Historical ${patientType} dental chart`, "With recorded findings & history", "historical", { disabled: !historicalAvailable, disabledReason: "There is no historical data to print for this patient." })}
          <div
            role="checkbox"
            aria-checked={includePatient}
            tabIndex={0}
            className={dcp.includeLabel}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const next = !includePatient;
              setIncludePatient(next);
              trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CHART_PATIENT_INFO_TOGGLED, {
                include_patient_information: next,
                print_type: "chart",
                source_page: DENTAL_RX_PAD_ROUTE,
              });
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                setIncludePatient((prev) => !prev);
              }
            }}
          >
            <span
              aria-hidden="true"
              className={`${dcp.checkboxInput} ${includePatient ? dcp.checkboxInputChecked : ""}`}
            >
              {includePatient && (
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  className={dcp.checkboxCheckIcon}
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className={dcp.includeLabelText}>Include patient information</span>
          </div>
        </div>
      )}
      <TPTooltip title="Print dental chart" arrow placement="top">
        <button
          type="button"
          aria-label="Print dental chart"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) {
              trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CHART_PRINT_CLICKED, {
                source_page: DENTAL_RX_PAD_ROUTE,
                chart_type: patientType,
                has_historic_data: hasHistoricalData(patientId),
              });
            }
          }}
          disabled={isPrinting}
          className={dcp.printTriggerBtn}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 9V3.5C6 3.22 6.22 3 6.5 3h11c.28 0 .5.22.5.5V9M6 18H4.5C3.67 18 3 17.33 3 16.5v-5C3 10.67 3.67 10 4.5 10h15c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H18M7 15h10v5.5c0 .28-.22.5-.5.5h-9a.5.5 0 0 1-.5-.5V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </TPTooltip>
    </div>
  );
}
