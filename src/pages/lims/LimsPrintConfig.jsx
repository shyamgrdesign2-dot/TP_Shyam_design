import React, { useState, useEffect, useCallback, useContext, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, Radio, Form, Button, Select } from "antd";
import { Navbar } from "react-bootstrap";

import PrintSettingsContext from "../../context/PrintSettingsContext";
import HeaderFooterLayout from "../../components/print_settings/HeaderFooterLayout";
import PageFormatLayout from "../../components/print_settings/PageFormatLayout";
import CommonModal from "../../common/CommonModal";
import {
  TAB_HEADER_FOOTER,
  TAB_PAGE_FORMAT,
} from "../../utils/constants";
import { errorMessage, updateFooterImageHeight } from "../../utils/utils";

import { fetchPatientLabResults } from "./limsApi";
import {
  filterLabResultsByDoctor,
  getAttendingDoctorUmIdFromUrl,
  getPatientLastVisitDoctorUmId,
  isLabResultsReceptionistSession,
} from "../../utils/labResultsUtils";
import {
  LIMS_SETTINGS_KEY, LAB_RESULTS_CASE_ID,
  initFileStates,
  fetchLimsPrintSettings, saveLimsPrintSettingsToApi, resetLimsPrintSettingsToApiDefaults,
  resolveLimsQrCodeDataUrl,
} from "./limsPrintUtils";
import { ASSETS } from "../../assets";
import { useSelector } from "react-redux";
import LimsReportPdfPreview from "./LimsReportPdfPreview";

import "cropperjs/dist/cropper.css";
import styles from "./LimsPrintConfig.module.css";
import LimsAccessBoundary from "./LimsAccessBoundary";

const TAB_LAB_RESULTS = "lab_results";
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const { alerticon: alertIcon } = ASSETS.images;

/* ── LimsHeaderBar ───────────────────────────────────────────────── */

function LimsHeaderBar() {
  const navigate = useNavigate();
  const { state, search } = useLocation();
  const previousPage = state?.from;
  const limsListPath = `/lims${search || ""}`;

  const {
    printSettings, setPrintSettings,
    fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature,
    setFileHeader, setFileFooter, setFileLogo, setFileWatermark, setFileSignature,
  } = useContext(PrintSettingsContext);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFlag, setModalFlag] = useState(0);
  const [initialSettingsSnapshot, setInitialSettingsSnapshot] = useState(null);

  const goBack = useCallback(() => {
    if (previousPage) {
      navigate(previousPage, { replace: true, state });
    } else {
      navigate(limsListPath, { replace: true });
    }
  }, [navigate, previousPage, state, limsListPath]);

  useEffect(() => {
    if (printSettings && initialSettingsSnapshot == null) {
      setInitialSettingsSnapshot(JSON.stringify(printSettings));
    }
  }, [printSettings, initialSettingsSnapshot]);

  const handleBack = () => {
    const hasChanges =
      initialSettingsSnapshot != null &&
      JSON.stringify(printSettings) !== initialSettingsSnapshot;
    if (hasChanges) {
      setModalFlag(1);
      setModalOpen(true);
    } else {
      goBack();
    }
  };

  const handleSave = async () => {
    if (
      printSettings?.letterhead_format == 0 &&
      printSettings?.header_footer?.header?.doctor_info?.enable === "N" &&
      printSettings?.header_footer?.header?.clinic_info?.enable === "N" &&
      printSettings?.logo_enable === "N"
    ) {
      errorMessage("Enable at least one option (Doctor's information, Clinic's information, Logo on Header)");
      return;
    }
    if (printSettings?.letterhead_format == 1 && !fileHeader) {
      errorMessage("Upload header");
      return;
    }

    setSaving(true);
    try {
      await saveLimsPrintSettingsToApi(printSettings, {
        fileLogo,
        fileHeader,
        fileFooter,
        fileWatermark,
        fileSignature,
      });
      localStorage.removeItem(LIMS_SETTINGS_KEY);
      setInitialSettingsSnapshot(JSON.stringify(printSettings));
      goBack();
    } catch (e) {
      errorMessage(e?.message || e || "Failed to save LIMS print settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setModalFlag(2);
    setModalOpen(true);
  };

  const onModalConfirm = async () => {
    if (modalFlag === 1) {
      goBack();
      return;
    }
    if (modalFlag !== 2) return;

    setResetting(true);
    try {
      const ps = await resetLimsPrintSettingsToApiDefaults();
      setPrintSettings(ps);
      setFileLogo(null);
      setFileHeader(null);
      setFileFooter(null);
      setFileWatermark(null);
      setFileSignature(null);
      initFileStates(ps, { setFileLogo, setFileWatermark, setFileSignature, setFileHeader, setFileFooter });
      localStorage.removeItem(LIMS_SETTINGS_KEY);
      setInitialSettingsSnapshot(JSON.stringify(ps));
      setModalOpen(false);
    } catch (e) {
      errorMessage(e?.message || e || "Failed to reset LIMS print settings");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Navbar className="justify-content-between headerprescription p-0">
      <div className="align-items-center d-flex w-100 h-100 justify-content-between">
        <div className="align-items-center d-flex h-100 w-100">
          <div className="border-end h-100 text-center me-2">
            <div onClick={handleBack} className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer">
              <i className="icon-right" />
            </div>
          </div>
          <div className="title-common">Configure Print Setting</div>
        </div>
        <div className="d-flex align-items-center justify-content-end w-100">
          <button className="btn btn-text me-14" onClick={handleResetDefaults}>
            <span>Default Settings</span>
          </button>
          <Button
            type="button"
            className="btn-41 btn px-4 btn-primary3 me-4"
            onClick={handleSave}
            loading={saving}
          >
            Save
          </Button>
        </div>
      </div>
      <CommonModal
        isModalOpen={modalOpen}
        onCancel={() => setModalOpen(false)}
        modalWidth={500}
        title={modalFlag === 1 ? "You may lose your data" : "Reset to Default Settings"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="" />
                <span>
                  {modalFlag === 1
                    ? "Are you sure you want to leave? You will lose unsaved changes."
                    : "This will reset all LIMS print settings to your default configuration. Custom changes will be lost."}
                </span>
              </div>
            </div>
            <div className="mt-4 d-flex align-items-center justify-content-end">
              <div
                onClick={() => setModalOpen(false)}
                className="me-4 text-decoration-underline btn p-0 text-main"
              >
                {modalFlag === 1 ? "No, Stay" : "Cancel"}
              </div>
              <Button
                onClick={onModalConfirm}
                className="lh-lg btn btn-primary3 btn-41 px-4"
                loading={resetting}
              >
                {modalFlag === 1 ? "Yes, Leave" : "Yes, Reset"}
              </Button>
            </div>
          </>
        }
      />
    </Navbar>
  );
}

/* ── LabResultsFormatLayout ──────────────────────────────────────── */

function LabResultsFormatLayout() {
  const { printSettings, setPrintSettings } = useContext(PrintSettingsContext);
  const labOption = printSettings?.prescription?.case_option?.find(
    (o) => o.id === LAB_RESULTS_CASE_ID,
  );

  const onFormatChange = (e) => {
    setPrintSettings((prev) => ({
      ...prev,
      prescription: {
        ...prev.prescription,
        case_option: prev.prescription.case_option.map((o) =>
          o.id === LAB_RESULTS_CASE_ID ? { ...o, format: e.target.value } : o,
        ),
      },
    }));
  };

  const onToggle = () => {
    setPrintSettings((prev) => ({
      ...prev,
      prescription: {
        ...prev.prescription,
        case_option: prev.prescription.case_option.map((o) =>
          o.id === LAB_RESULTS_CASE_ID
            ? { ...o, enable: o.enable === "Y" ? "N" : "Y" }
            : o,
        ),
      },
    }));
  };

  if (!labOption) return null;

  return (
    <div className="px-3">
      <div className="titleprint mb-3">Format Style</div>
      <div className={`customize-table customize-table-format table-display-patient radio-width-static-web`}>
        <div className="p-3">
          <div className="d-flex align-items-center justify-content-between text-start">
            <div
              className="d-flex align-items-center cursor-pointer Preview-color-icon"
              onClick={onToggle}
            >
              <i
                className={`icon-Preview ${labOption.enable === "N" ? "disable-preview" : ""} me-3`}
              />
              <span>Lab Results</span>
            </div>
            <div>
              <Form.Item className="mb-0 form_addnewpatient">
                <Radio.Group
                  className="d-flex gender-radio all-change-radio"
                  onChange={onFormatChange}
                  value={labOption.format || "inline"}
                >
                  <Radio.Button className="w-100 text-center" value="inline">
                    Inline
                  </Radio.Button>
                  <Radio.Button className="w-100 text-center" value="listview">
                    List View
                  </Radio.Button>
                  <Radio.Button className="w-100 text-center" value="table">
                    Table
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Main ─────────────────────────────────────────────────────────── */

function LimsPrintConfigMain() {
  const { state } = useLocation();
  const patient = state?.patient || null;
  const patientId = state?.patientId || patient?.patient_unique_id;
  const { profile } = useSelector((state) => state.doctors);

  const [selectedTab, setSelectedTab] = useState(TAB_LAB_RESULTS);
  const [printSettings, setPrintSettings] = useState(null);
  const [fileHeader, setFileHeader] = useState(null);
  const [fileFooter, setFileFooter] = useState(null);
  const [fileLogo, setFileLogo] = useState(null);
  const [fileWatermark, setFileWatermark] = useState(null);
  const [fileSignature, setFileSignature] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const settingsHydratedRef = useRef(false);

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

  useEffect(() => {
    if (settingsHydratedRef.current) return;
    let cancelled = false;

    const loadSettings = async () => {
      setSettingsLoading(true);
      const limsSettings = await fetchLimsPrintSettings();
      if (cancelled) return;

      if (limsSettings) {
        settingsHydratedRef.current = true;
        setPrintSettings(limsSettings);
        initFileStates(limsSettings, {
          setFileLogo,
          setFileWatermark,
          setFileSignature,
          setFileHeader,
          setFileFooter,
        });
      }
      setSettingsLoading(false);
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (patientId) {
      fetchPatientLabResults(patientId).then((r) => {
        if (isLabResultsReceptionistSession()) {
          setResults(filterLabResultsByDoctor(r || [], getPatientLastVisitDoctorUmId(patient)));
        } else {
          setResults(r || []);
        }
      });
    }
  }, [patientId, patient]);

  const onTabChange = useCallback((key) => {
    setSelectedTab(key === TAB_LAB_RESULTS ? TAB_LAB_RESULTS : Number(key));
    updateFooterImageHeight();
  }, []);

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
    caseManagerData: undefined,
    certificateData: undefined,
  };

  const tabs = [
    { key: TAB_LAB_RESULTS, label: "Lab Results" },
    { key: TAB_HEADER_FOOTER, label: "Header & Footer" },
    { key: TAB_PAGE_FORMAT, label: "Page Format" },
  ];

  if (settingsLoading || !printSettings) return null;

  return (
    <PrintSettingsContext.Provider value={contextApi}>
      <div className={styles.configPage}>
        <LimsHeaderBar />
        <div className={styles.configBody}>
          <aside className={styles.configSidebar}>
            <div className={styles.configSidebarPanel}>
              <Tabs
                defaultActiveKey={TAB_LAB_RESULTS}
                items={tabs}
                onChange={onTabChange}
                className="print-tabs"
              />
              {selectedTab === TAB_LAB_RESULTS ? (
                <LabResultsFormatLayout />
              ) : selectedTab === TAB_HEADER_FOOTER ? (
                <HeaderFooterLayout />
              ) : (
                selectedTab === TAB_PAGE_FORMAT && <PageFormatLayout hideDefaultLanguage />
              )}
            </div>
          </aside>

          <main className={styles.configPreview}>
            <div className={styles.configPreviewInner}>
              <div className={styles.configPreviewHeader}>
                <div className="titleprint mb-0">Preview</div>
                {availableDates.length > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: 13 }}>Print results for</span>
                    <Select
                      options={availableDates}
                      value={selectedDate || undefined}
                      onChange={(val) => setSelectedDate(val)}
                      placeholder="Select date"
                      style={{ width: 160 }}
                      size="small"
                    />
                  </div>
                )}
              </div>
              <div className={styles.configPreviewCard}>
                <LimsReportPdfPreview
                  results={filteredResults}
                  patient={patient}
                  printSettings={printSettings}
                  fileHeader={fileHeader}
                  fileFooter={fileFooter}
                  fileLogo={fileLogo}
                  fileWatermark={fileWatermark}
                  fileSignature={fileSignature}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </PrintSettingsContext.Provider>
  );
}

export default function LimsPrintConfig() {
  return (
    <LimsAccessBoundary>
      <LimsPrintConfigMain />
    </LimsAccessBoundary>
  );
}
