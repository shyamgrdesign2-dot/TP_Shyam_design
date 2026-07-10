import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select } from "antd";
import { PrinterOutlined, SettingOutlined, DownloadOutlined } from "@ant-design/icons";

import PrintSettingsContext from "../../context/PrintSettingsContext";
import { getDefaultPrintsettings } from "../../redux/doctorsSlice";
import { updateFooterImageHeight } from "../../utils/utils";
import { fetchLimsPatients, fetchPatientLabResults } from "./limsApi";
import { loadLimsSettings, ensureLabOption, initFileStates } from "./limsPrintUtils";
import { LabResultsPreview } from "./LimsPrintConfig";
import styles from "./LimsPrintPage.module.css";
import LimsAccessBoundary from "./LimsAccessBoundary";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function LimsPrintPageMain() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [patient, setPatient] = useState(location.state?.patient || null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

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

  const handlePrint = useCallback(() => window.print(), []);

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
            <Button icon={<DownloadOutlined />} onClick={handlePrint} block>
              Download Report
            </Button>
          </div>
        </aside>

        <main className={styles.preview}>
          <div className={styles.printCard} id="lims-print-area">
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
