import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button, Select, message } from "antd";
import { PrinterOutlined, SettingOutlined, DownloadOutlined } from "@ant-design/icons";
import { pdf } from "@react-pdf/renderer";
import { browserName } from "react-device-detect";

import { sendMessageToParent, updateFooterImageHeight } from "../../utils/utils";
import { EVENTS } from "../../utils/events";
import { uploadDocsToAzure } from "../medicalRecords/service";
import { printBlobInNewTab } from "../opdBilling/utils/helper";
import { fetchLimsPatients, fetchPatientLabResults } from "./limsApi";
import { fetchLimsPrintSettings, initFileStates, resolveLimsQrCodeDataUrl } from "./limsPrintUtils";
import LimsReportPdf from "./LimsReportPdf";
import LimsReportPdfPreview from "./LimsReportPdfPreview";
import styles from "./LimsPrintPage.module.css";
import LimsAccessBoundary from "./LimsAccessBoundary";
import {
  filterLabResultsByDoctor,
  getAttendingDoctorUmIdFromUrl,
  getPatientLastVisitDoctorUmId,
  isLabResultsReceptionistSession,
} from "../../utils/labResultsUtils";
import { useSelector } from "react-redux";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOWNLOAD_MESSAGE_KEY = "lims-download-report";
const PRINT_MESSAGE_KEY = "lims-print-report";

function LimsPrintPageMain() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const printRef = useRef(null);
  const { profile } = useSelector((state) => state.doctors);
  const limsListPath = `/lims${location.search || ""}`;

  const [patient, setPatient] = useState(location.state?.patient || null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  const [printSettings, setPrintSettings] = useState(null);
  const [fileHeader, setFileHeader] = useState(null);
  const [fileFooter, setFileFooter] = useState(null);
  const [fileLogo, setFileLogo] = useState(null);
  const [fileWatermark, setFileWatermark] = useState(null);
  const [fileSignature, setFileSignature] = useState(null);

  useEffect(() => {
    if (printSettings) return;
    let cancelled = false;

    const loadSettings = async () => {
      const limsSettings = await fetchLimsPrintSettings();
      if (cancelled || !limsSettings) return;

      setPrintSettings(limsSettings);
      initFileStates(limsSettings, {
        setFileLogo,
        setFileWatermark,
        setFileSignature,
        setFileHeader,
        setFileFooter,
      });
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [printSettings]);

  useEffect(() => {
    if (!fileFooter?.showFile) return;
    updateFooterImageHeight(fileFooter, setFileFooter);
  }, [fileFooter?.showFile]);

  useEffect(() => {
    let cancelled = false;
    const attachQr = async () => {
      if (!printSettings) return;
      if (printSettings.qrcode_enable !== "Y") {
        if (printSettings.qrcode) {
          setPrintSettings((prev) => (prev ? { ...prev, qrcode: null } : prev));
        }
        return;
      }
      if (printSettings.qrcode) return;
      const doctorUmId =
        getPatientLastVisitDoctorUmId(patient) ?? getAttendingDoctorUmIdFromUrl();
      const qrcode = await resolveLimsQrCodeDataUrl({
        printSettings,
        profile,
        doctorUmId,
      });
      if (cancelled || !qrcode) return;
      setPrintSettings((prev) => (prev ? { ...prev, qrcode } : prev));
    };
    attachQr();
    return () => {
      cancelled = true;
    };
  }, [printSettings?.qrcode_enable, printSettings?.qrcode, profile, patient]);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);

    const filterOwned = (labRes, p) => {
      if (!isLabResultsReceptionistSession()) return labRes || [];
      return filterLabResultsByDoctor(labRes || [], getPatientLastVisitDoctorUmId(p));
    };

    const labPromise = fetchPatientLabResults(patientId);

    if (patient) {
      labPromise.then((labRes) => {
        setResults(filterOwned(labRes, patient));
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
        setResults(filterOwned(labRes, found));
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
      pid: patient.pm_pid || patient.tpml_refrence_id || "",
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

  const buildReportPdfBlob = useCallback(async () => {
    if (!printSettings) {
      throw new Error("Print preview is not ready.");
    }
    return pdf(
      <LimsReportPdf
        results={filteredResults}
        patient={patient}
        printSettings={printSettings}
        fileHeader={fileHeader}
        fileFooter={fileFooter}
        fileLogo={fileLogo}
        fileWatermark={fileWatermark}
        fileSignature={fileSignature}
      />,
    ).toBlob();
  }, [
    fileFooter,
    fileHeader,
    fileLogo,
    fileSignature,
    fileWatermark,
    filteredResults,
    patient,
    printSettings,
  ]);

  const handlePreviewReadyChange = useCallback((ready) => {
    setIsPreviewReady(ready);
  }, []);

  const handlePrint = useCallback(async () => {
    if (!isPreviewReady) {
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
  }, [buildReportPdfBlob, isPreviewReady, reportFileName]);

  const handleDownload = useCallback(async () => {
    if (!isPreviewReady || isDownloading) {
      if (!isPreviewReady) message.error("Report preview is not ready.");
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
  }, [buildReportPdfBlob, isDownloading, isPreviewReady, reportFileName]);

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
          <button type="button" className={styles.backBtn} onClick={() => navigate(limsListPath)}>
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
            navigate(`/lims/print-settings${location.search || ""}`, {
              state: {
                from: `/lims/print/${patientId}${location.search || ""}`,
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
            <LimsReportPdfPreview
              results={filteredResults}
              patient={patient}
              printSettings={printSettings}
              fileHeader={fileHeader}
              fileFooter={fileFooter}
              fileLogo={fileLogo}
              fileWatermark={fileWatermark}
              fileSignature={fileSignature}
              onReadyChange={handlePreviewReadyChange}
            />
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
