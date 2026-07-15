import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select, message } from "antd";
import { PrinterOutlined, SettingOutlined, DownloadOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { browserName } from "react-device-detect";

import PrintSettingsContext from "../../context/PrintSettingsContext";
import { getDefaultPrintsettings } from "../../redux/doctorsSlice";
import { updateFooterImageHeight, sendMessageToParent } from "../../utils/utils";
import { EVENTS } from "../../utils/events";
import { uploadDocsToAzure } from "../medicalRecords/service";
import { printBlobInNewTab } from "../opdBilling/utils/helper";
import { fetchLimsPatients, fetchPatientLabResults } from "./limsApi";
import { loadLimsSettings, ensureLabOption, initFileStates } from "./limsPrintUtils";
import { LabResultsPreview } from "./LimsPrintConfig";
import styles from "./LimsPrintPage.module.css";
import LimsAccessBoundary from "./LimsAccessBoundary";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOWNLOAD_MESSAGE_KEY = "lims-download-report";
const PRINT_MESSAGE_KEY = "lims-print-report";
/** Ignore tiny leftover height so html2canvas/jsPDF rounding does not create a blank last page. */
const PDF_PAGE_OVERFLOW_TOLERANCE_MM = 2;

function LimsPrintPageMain() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const printRef = useRef(null);

  const [patient, setPatient] = useState(location.state?.patient || null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { defaultPrintSettings } = useSelector((s) => s.doctors);
  const [printSettings, setPrintSettings] = useState(null);
  const [fileHeader, setFileHeader] = useState(null);
  const [fileFooter, setFileFooter] = useState(null);
  const [fileLogo, setFileLogo] = useState(null);
  const [fileWatermark, setFileWatermark] = useState(null);
  const [fileSignature, setFileSignature] = useState(null);

  useEffect(() => {
    dispatch(getDefaultPrintsettings());
  }, [dispatch]);

  useEffect(() => {
    if (!defaultPrintSettings || printSettings) return;
    const saved = loadLimsSettings();
    if (saved?.printSettings) {
      setPrintSettings(saved.printSettings);
      if (saved.files?.logo) setFileLogo(saved.files.logo);
      if (saved.files?.watermark) setFileWatermark(saved.files.watermark);
      if (saved.files?.signature) setFileSignature(saved.files.signature);
      if (saved.files?.header) setFileHeader(saved.files.header);
      if (saved.files?.footer) updateFooterImageHeight(saved.files.footer, setFileFooter, true);
    } else {
      const ps = ensureLabOption(JSON.parse(JSON.stringify(defaultPrintSettings)));
      setPrintSettings(ps);
      initFileStates(ps, { setFileLogo, setFileWatermark, setFileSignature, setFileHeader, setFileFooter });
    }
  }, [defaultPrintSettings, printSettings]);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);

    const labPromise = fetchPatientLabResults(patientId);

    if (patient) {
      labPromise.then((labRes) => {
        setResults(labRes || []);
        setLoading(false);
      });
    } else {
      Promise.all([
        fetchLimsPatients({ search: "", page: 1, limit: 1000 }),
        labPromise,
      ]).then(([pRes, labRes]) => {
        const all = pRes?.patients || [];
        const found = all.find(
          (p) => String(p.patient_unique_id) === String(patientId)
        );
        setPatient(found || null);
        setResults(labRes || []);
        setLoading(false);
      });
    }
  }, [patientId, patient]);

  const patientInfo = useMemo(() => {
    if (!patient) return {};
    const age = patient.ageYears
      ? `${patient.ageYears}y`
      : patient.ageMonths
        ? `${patient.ageMonths}m`
        : patient.pm_age
          ? `${patient.pm_age}y`
          : "";
    return {
      name: patient.pm_fullname || "Unknown",
      age,
      gender: patient.pm_gender || "",
      pid: patient.tpml_refrence_id || patient.pm_pid || "",
      contact: patient.pm_contact_no || "",
    };
  }, [patient]);

  const reportFileName = useMemo(() => {
    const safeName = String(patientInfo.name || "lab-results")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "lab-results";
    const datePart = selectedDate || new Date().toISOString().slice(0, 10);
    return `${safeName}-lab-results-${datePart}.pdf`;
  }, [patientInfo.name, selectedDate]);

  /**
   * Capture only the report card as PDF (not the web page).
   * Strips A4 min-height during capture so a nearly-empty second page is not created.
   */
  const buildReportPdfBlob = useCallback(async () => {
    const element = printRef.current;
    if (!element) {
      throw new Error("Print preview is not ready.");
    }

    const prevStyles = {
      minHeight: element.style.minHeight,
      height: element.style.height,
      overflow: element.style.overflow,
      boxShadow: element.style.boxShadow,
      borderRadius: element.style.borderRadius,
    };
    element.style.minHeight = "0";
    element.style.height = "auto";
    element.style.overflow = "visible";
    element.style.boxShadow = "none";
    element.style.borderRadius = "0";

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const usablePageHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = imgHeight;
      let offsetY = margin;

      pdf.addImage(imgData, "JPEG", margin, offsetY, contentWidth, imgHeight);
      heightLeft -= usablePageHeight;

      while (heightLeft > PDF_PAGE_OVERFLOW_TOLERANCE_MM) {
        offsetY = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, offsetY, contentWidth, imgHeight);
        heightLeft -= usablePageHeight;
      }

      return pdf.output("blob");
    } finally {
      element.style.minHeight = prevStyles.minHeight;
      element.style.height = prevStyles.height;
      element.style.overflow = prevStyles.overflow;
      element.style.boxShadow = prevStyles.boxShadow;
      element.style.borderRadius = prevStyles.borderRadius;
    }
  }, []);

  const handlePrint = useCallback(async () => {
    if (!printRef.current) {
      message.error("Print preview is not ready.");
      return;
    }
    message.open({
      key: PRINT_MESSAGE_KEY,
      type: "loading",
      content: "Preparing print...",
      duration: 0,
    });
    try {
      // Always print a generated PDF so browser does not inject the page URL footer.
      const pdfBlob = await buildReportPdfBlob();
      if (browserName === "Chrome WebView" || browserName === "WebKit") {
        const file = new File([pdfBlob], reportFileName, { type: "application/pdf" });
        const formData = new FormData();
        formData.append(file.name, file);
        const res = await uploadDocsToAzure(formData);
        const printUrl = res?.[0]?.url;
        message.destroy(PRINT_MESSAGE_KEY);
        if (printUrl) {
          sendMessageToParent(EVENTS.PRINT, { url: printUrl });
        } else {
          message.error("Failed to prepare print.");
        }
        return;
      }
      message.destroy(PRINT_MESSAGE_KEY);
      await printBlobInNewTab(pdfBlob);
    } catch (error) {
      message.destroy(PRINT_MESSAGE_KEY);
      console.error("LIMS print failed:", error);
      message.error("Failed to prepare print.");
    }
  }, [buildReportPdfBlob, reportFileName]);

  const handleDownload = useCallback(async () => {
    if (!printRef.current || isDownloading) {
      if (!printRef.current) message.error("Report preview is not ready.");
      return;
    }
    setIsDownloading(true);
    message.open({
      key: DOWNLOAD_MESSAGE_KEY,
      type: "loading",
      content: "Preparing download...",
      duration: 0,
    });
    try {
      const pdfBlob = await buildReportPdfBlob();
      if (browserName === "Chrome WebView" || browserName === "WebKit") {
        const file = new File([pdfBlob], reportFileName, { type: "application/pdf" });
        const formData = new FormData();
        formData.append(file.name, file);
        const res = await uploadDocsToAzure(formData);
        const downloadUrl = res?.[0]?.url;
        if (downloadUrl) {
          sendMessageToParent(EVENTS.DOWNLOAD, { url: downloadUrl });
        } else {
          throw new Error("Upload failed");
        }
      } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = reportFileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }
      message.open({
        key: DOWNLOAD_MESSAGE_KEY,
        type: "success",
        content: "Download started.",
        duration: 2,
      });
    } catch (error) {
      console.error("LIMS download failed:", error);
      message.open({
        key: DOWNLOAD_MESSAGE_KEY,
        type: "error",
        content: "Failed to download report.",
        duration: 2,
      });
    } finally {
      setIsDownloading(false);
    }
  }, [buildReportPdfBlob, isDownloading, reportFileName]);

  const availableDates = useMemo(() => {
    const dateSet = new Set();
    (results || []).forEach((entry) => {
      if (entry.date) dateSet.add(entry.date.slice(0, 10));
    });
    const sorted = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
    return sorted.map((iso) => {
      const d = new Date(iso + "T00:00:00");
      const dd = String(d.getDate()).padStart(2, "0");
      const mmm = MONTH_ABBR[d.getMonth()];
      const yyyy = d.getFullYear();
      return { value: iso, label: `${dd} ${mmm} ${yyyy}` };
    });
  }, [results]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].value);
    }
  }, [availableDates, selectedDate]);

  const filteredResults = useMemo(() => {
    if (!selectedDate) return results;
    return results.filter((entry) => entry.date && entry.date.startsWith(selectedDate));
  }, [results, selectedDate]);

  const contextApi = {
    printSettings,
    setPrintSettings,
    fileHeader,
    setFileHeader,
    fileFooter,
    setFileFooter,
    fileLogo,
    setFileLogo,
    fileWatermark,
    setFileWatermark,
    fileSignature,
    setFileSignature,
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading lab results...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backBtn} onClick={() => navigate("/lims")}>
            <i className="icon-right" />
          </button>
          <div className={styles.headerDivider} />
          <div>
            <div className={styles.title}>{patientInfo.name}</div>
            <div className={styles.meta}>{[patientInfo.gender, patientInfo.age].filter(Boolean).join(", ")}</div>
          </div>
        </div>
        <Button
          icon={<SettingOutlined />}
          onClick={() =>
            navigate("/lims/print-settings", {
              state: {
                from: `/lims/print/${patientId}`,
                patient,
                patientId,
              },
            })
          }
        >
          Print Settings
        </Button>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.dateSection}>
            <div className={styles.dateLabel}>Print results for</div>
            <Select
              options={availableDates}
              value={selectedDate || undefined}
              onChange={(val) => setSelectedDate(val)}
              placeholder={availableDates.length === 0 ? "No results available" : "Select date"}
              disabled={availableDates.length === 0}
              className={styles.dateSelect}
            />
          </div>
          <div className={styles.sidebarDivider} />
          <div className={styles.sidebarBtnWrap}>
            <Button icon={<PrinterOutlined />} onClick={handlePrint} block>
              Print Lab Results
            </Button>
          </div>
          <div className={styles.sidebarBtnWrap}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={isDownloading}
              block
            >
              Download Report
            </Button>
          </div>
        </aside>

        <main className={styles.preview}>
          <div className={styles.printCard} id="lims-print-area" ref={printRef}>
            {printSettings ? (
              <PrintSettingsContext.Provider value={contextApi}>
                <LabResultsPreview
                  results={filteredResults}
                  patient={patient}
                  emptyText="No lab results for the selected date."
                />
              </PrintSettingsContext.Provider>
            ) : (
              <div className={styles.noResults}>Loading print settings...</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LimsPrintPage() {
  return (
    <LimsAccessBoundary>
      <LimsPrintPageMain />
    </LimsAccessBoundary>
  );
}
