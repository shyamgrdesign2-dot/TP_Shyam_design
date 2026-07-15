import React, { useState, useEffect, useCallback, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Col, Tabs, Row, Radio, Form, Button } from "antd";
import { Navbar } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";

import PrintSettingsContext from "../../context/PrintSettingsContext";
import HeaderFooterLayout from "../../components/print_settings/HeaderFooterLayout";
import PageFormatLayout from "../../components/print_settings/PageFormatLayout";
import CommonModal from "../../common/CommonModal";
import {
  getDefaultPrintsettings,
} from "../../redux/doctorsSlice";
import {
  TAB_HEADER_FOOTER,
  TAB_PAGE_FORMAT,
} from "../../utils/constants";
import { errorMessage, updateFooterImageHeight } from "../../utils/utils";

import { fetchPatientLabResults } from "./limsApi";
import { specimenForReport, formatDateLabel } from "./limsHelpers";
import {
  LIMS_SETTINGS_KEY, LAB_RESULTS_CASE_ID,
  fileToBase64, serializeFileState, saveLimsSettings, loadLimsSettings,
  ensureLabOption, initFileStates, groupByReport, rangeText, arrowSymbol,
} from "./limsPrintUtils";
import { ASSETS } from "../../assets";

import "cropperjs/dist/cropper.css";
import styles from "./LimsPrintConfig.module.css";
import LimsAccessBoundary from "./LimsAccessBoundary";

const TAB_LAB_RESULTS = "lab_results";

const { alerticon: alertIcon } = ASSETS.images;

/* ── LimsHeaderBar ───────────────────────────────────────────────── */

function LimsHeaderBar() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const previousPage = state?.from;
  const { defaultPrintSettings } = useSelector((s) => s.doctors);

  const {
    printSettings, setPrintSettings,
    fileHeader, fileFooter, fileLogo, fileWatermark, fileSignature,
    setFileHeader, setFileFooter, setFileLogo, setFileWatermark, setFileSignature,
  } = useContext(PrintSettingsContext);

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFlag, setModalFlag] = useState(0);

  const goBack = useCallback(() => {
    if (previousPage) {
      navigate(previousPage, { replace: true, state });
    } else {
      navigate("/lims", { replace: true });
    }
  }, [navigate, previousPage, state]);

  const handleBack = () => {
    const saved = loadLimsSettings();
    const hasExisting = !!saved?.printSettings;
    if (hasExisting && JSON.stringify(saved.printSettings) !== JSON.stringify(printSettings)) {
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
    const files = {
      logo: await serializeFileState(fileLogo),
      header: await serializeFileState(fileHeader),
      footer: await serializeFileState(fileFooter),
      watermark: await serializeFileState(fileWatermark),
      signature: await serializeFileState(fileSignature),
    };
    saveLimsSettings(printSettings, files);
    setSaving(false);
    goBack();
  };

  const handleResetDefaults = () => {
    setModalFlag(2);
    setModalOpen(true);
  };

  const onModalConfirm = () => {
    if (modalFlag === 1) {
      goBack();
    } else if (modalFlag === 2 && defaultPrintSettings) {
      const ps = ensureLabOption(JSON.parse(JSON.stringify(defaultPrintSettings)));
      setPrintSettings(ps);
      setFileLogo(null);
      setFileHeader(null);
      setFileFooter(null);
      setFileWatermark(null);
      setFileSignature(null);
      initFileStates(ps, { setFileLogo, setFileWatermark, setFileSignature, setFileHeader, setFileFooter });
      localStorage.removeItem(LIMS_SETTINGS_KEY);
      setModalOpen(false);
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

/* ── LabResultsPreview ───────────────────────────────────────────── */

export function LabResultsPreview({ results, patient, emptyText }) {
  const {
    printSettings, fileLogo, fileHeader, fileFooter, fileWatermark, fileSignature,
  } = useContext(PrintSettingsContext);

  const patientInfo = patient || {};
  const age = patientInfo.ageYears
    ? `${patientInfo.ageYears}y`
    : patientInfo.ageMonths
      ? `${patientInfo.ageMonths}m`
      : patientInfo.pm_age
        ? `${patientInfo.pm_age}y`
        : "";
  const name = patientInfo.pm_fullname || "Patient Name";
  const gender = patientInfo.pm_gender || "";
  const pid = patientInfo.tpml_refrence_id || patientInfo.pm_pid || "";
  const contact = patientInfo.pm_contact_no || "";

  const hf = printSettings?.header_footer;
  const pf = printSettings?.page_format;
  const letterhead = printSettings?.letterhead_format;
  const fontFamily = pf?.font_family || "Inter";
  const fontSize = pf?.font_size || 10;
  const patientFontSize = pf?.patient_info_font_size || fontSize;

  const doctorInfo = hf?.header?.doctor_info;
  const clinicInfo = hf?.header?.clinic_info;
  const cleanSubheader = (text) =>
    text ? text.replace(/^null\s*/i, "").trim() || "" : "";
  const footerCfg = hf?.footer;
  const otherSettings = hf?.other_settings;
  const patientInfoFields = hf?.patient_info || [];

  const showLogo = printSettings?.logo_enable === "Y" && fileLogo?.showFile;
  const showWatermark = printSettings?.water_mark_enable === "Y" && fileWatermark?.showFile;
  const showSignature = printSettings?.signature_enable === "Y" && fileSignature?.showFile;

  const labOption = printSettings?.prescription?.case_option?.find(
    (o) => o.id === LAB_RESULTS_CASE_ID,
  );
  const labFormat = labOption?.format || "table";
  const labEnabled = labOption?.enable !== "N";

  const hasResults =
    results.length > 0 &&
    results.some((e) =>
      (e.inputs || []).some(
        (inp) =>
          inp?.testName &&
          inp.testName !== "Remarks" &&
          inp.value != null &&
          String(inp.value).trim() !== "",
      ),
    );

  const enabledFields = patientInfoFields.filter((f) => f.enable === "Y");
  const fieldMap = {
    1: { label: "Name", value: name },
    2: { label: "ID", value: pid },
    3: { label: "Date", value: new Date().toLocaleDateString("en-IN") },
    4: { label: "Age", value: age },
    5: { label: "Gender", value: gender },
    6: { label: "Weight", value: "" },
    7: { label: "Height", value: "" },
    8: { label: "Address", value: "" },
    9: { label: "Mobile", value: contact },
    10: { label: "Blood Group", value: "" },
  };

  const ownMargin = letterhead === 2
    ? hf?.custom_letterhead_margin || hf?.margin || {}
    : {};

  const renderTableClusterRows = (reportName, filledTests) => (
    <React.Fragment key={reportName}>
      <tr className={styles.reportSubHeader}>
        <td colSpan={3}>{reportName}</td>
      </tr>
      {filledTests.map((t, ti) => {
        const isAbnormal = t.arrowDirection === "UP" || t.arrowDirection === "DOWN";
        const resultText = [
          String(t.value),
          t.units || "",
        ].filter(Boolean).join(" ");
        return (
          <tr key={ti} className={isAbnormal ? styles.abnormalRow : undefined}>
            <td>{t.testName || ""}</td>
            <td style={{ fontWeight: 600 }}>
              {resultText}
              {arrowSymbol(t.arrowDirection) && (
                <span style={{ fontSize: "10px", marginLeft: "2px" }}>
                  {arrowSymbol(t.arrowDirection)}
                </span>
              )}
            </td>
            <td>{rangeText(t)}</td>
          </tr>
        );
      })}
    </React.Fragment>
  );

  const renderListFormat = (filledTests) => (
    <div className={styles.listViewWrap}>
      {filledTests.map((t, ti) => {
        const isAbnormal = t.arrowDirection === "UP" || t.arrowDirection === "DOWN";
        const resultText = [
          String(t.value),
          t.units || "",
        ].filter(Boolean).join(" ");
        return (
          <div key={ti} className={`${styles.listViewItem} ${isAbnormal ? styles.abnormalText : ""}`}>
            <div className={styles.listViewLeft}>
              <span className={styles.listViewName}>{t.testName || ""}</span>
              {rangeText(t) && <span className={styles.listViewRange}> (Ref: {rangeText(t)})</span>}
            </div>
            <div className={styles.listViewResult}>
              <span style={{ fontWeight: 600 }}>
                {resultText}
                {arrowSymbol(t.arrowDirection) && (
                  <span style={{ fontSize: "8px", marginLeft: "2px" }}>
                    {arrowSymbol(t.arrowDirection)}
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderInlineFormat = (filledTests) => (
    <div className={styles.inlineWrap}>
      {filledTests.map((t, ti) => {
        const isAbnormal = t.arrowDirection === "UP" || t.arrowDirection === "DOWN";
        const valueWithUnit = [
          t.value != null ? String(t.value) : "",
          t.units || "",
        ]
          .filter(Boolean)
          .join(" ");
        const arrow = arrowSymbol(t.arrowDirection);
        return (
          <span key={ti} className={isAbnormal ? styles.abnormalText : undefined}>
            {t.testName || ""}
            {valueWithUnit ? `: ${valueWithUnit}` : ""}
            {arrow ? ` ${arrow}` : ""}
            {ti < filledTests.length - 1 ? "; " : ""}
          </span>
        );
      })}
    </div>
  );

  const renderNonTableResults = (tests, format) => {
    if (format === "listview") return renderListFormat(tests);
    return renderInlineFormat(tests);
  };

  return (
    <div
      className={styles.previewCard}
      style={{
        fontFamily,
        paddingTop: letterhead === 2 ? `${(ownMargin.top || 2) * 28}px` : undefined,
        paddingBottom: letterhead === 2 ? `${(ownMargin.bottom || 2) * 28}px` : undefined,
        position: "relative",
      }}
    >
      {/* Watermark */}
      {showWatermark && (
        <div className={styles.watermarkOverlay}>
          <img src={fileWatermark.showFile} alt="" className={styles.watermarkImg} />
        </div>
      )}

      {/* Letterhead: Upload (1) */}
      {letterhead === 1 && fileHeader?.showFile && (
        <img src={fileHeader.showFile} alt="" className={styles.uploadedHeaderImg} />
      )}

      {/* Letterhead: Custom (0) */}
      {letterhead === 0 && (
        <div className={styles.previewHeaderBlock}>
          <div className={styles.previewHeaderRow}>
            {/* Left side */}
            <div className={styles.previewHeaderInfo}>
              {showLogo && doctorInfo?.place !== "R" && (
                <img src={fileLogo.showFile} alt="" className={styles.previewLogo} />
              )}
              {doctorInfo?.enable === "Y" && doctorInfo?.place !== "R" && (
                <>
                  <div className={styles.previewDoctorName}>
                    {doctorInfo.header || "Dr. Name"}
                  </div>
                  {cleanSubheader(doctorInfo.subheader) && (
                    <div className={styles.previewSubheader}>{cleanSubheader(doctorInfo.subheader)}</div>
                  )}
                </>
              )}
              {clinicInfo?.enable === "Y" && clinicInfo?.place !== "R" && (
                <>
                  <div className={styles.previewClinicName}>
                    {clinicInfo.header || ""}
                  </div>
                  {clinicInfo.subheader && (
                    <div className={styles.previewSubheader}>{clinicInfo.subheader}</div>
                  )}
                </>
              )}
            </div>
            {/* Right side */}
            <div className={styles.previewClinicInfo}>
              {showLogo && doctorInfo?.place === "R" && (
                <img src={fileLogo.showFile} alt="" className={styles.previewLogo} />
              )}
              {doctorInfo?.enable === "Y" && doctorInfo?.place === "R" && (
                <>
                  <div className={styles.previewDoctorName}>
                    {doctorInfo.header || "Dr. Name"}
                  </div>
                  {cleanSubheader(doctorInfo.subheader) && (
                    <div className={styles.previewSubheader}>{cleanSubheader(doctorInfo.subheader)}</div>
                  )}
                </>
              )}
              {clinicInfo?.enable === "Y" && clinicInfo?.place === "R" && (
                <>
                  <div className={styles.previewClinicName}>
                    {clinicInfo.header || ""}
                  </div>
                  {clinicInfo.subheader && (
                    <div className={styles.previewSubheader}>{clinicInfo.subheader}</div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={styles.previewDivider} />
        </div>
      )}

      {/* Patient info */}
      <div className={styles.previewPatientBlock}>
        <div className={styles.previewPatientRow}>
          {enabledFields.length > 0
            ? enabledFields.map((f) => {
                const mapped = fieldMap[f.id];
                if (!mapped || !mapped.value) return null;
                return (
                  <span key={f.id}>
                    <strong>{mapped.label}:</strong> {mapped.value}
                  </span>
                );
              })
            : (
              <>
                <span><strong>Patient:</strong> {name}</span>
                {pid && <span><strong>ID:</strong> {pid}</span>}
                {gender && <span><strong>Gender:</strong> {gender}</span>}
                {age && <span><strong>Age:</strong> {age}</span>}
                {contact && <span><strong>Mobile:</strong> {contact}</span>}
              </>
            )}
        </div>
      </div>

      <div className={styles.previewDivider} />

      {/* Lab results */}
      {labEnabled && (
        <>
          {!hasResults ? (
            <div className={styles.previewEmpty}>
              {emptyText || "Lab results will appear here as a preview."}
            </div>
          ) : labFormat === "table" ? (
            /* Table format: one table per date, all clusters inside */
            (() => {
              const dateGroups = new Map();
              results.forEach((entry) => {
                const dateKey = entry.date || "unknown";
                if (!dateGroups.has(dateKey)) dateGroups.set(dateKey, []);
                dateGroups.get(dateKey).push(entry);
              });
              return Array.from(dateGroups.entries()).map(([dateKey, entries]) => {
                const dateLabel = formatDateLabel(dateKey) || dateKey;
                const allClusters = [];
                entries.forEach((entry) => {
                  const grouped = groupByReport(entry.inputs);
                  Array.from(grouped.entries()).forEach(([reportName, tests]) => {
                    const filledTests = tests.filter(
                      (t) => t.value != null && String(t.value).trim() !== "",
                    );
                    if (filledTests.length > 0) {
                      allClusters.push({ reportName, filledTests });
                    }
                  });
                });
                if (allClusters.length === 0) return null;
                return (
                  <div key={dateKey} className={styles.previewReportBlock}>
                    <div className={styles.previewDateHeading}>
                      Test Results: {dateLabel}
                    </div>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Result</th>
                          <th>Ref. Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allClusters.map(({ reportName, filledTests }) =>
                          renderTableClusterRows(reportName, filledTests)
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })()
          ) : (
            /* Non-table formats: list/inline - per-report blocks */
            results.map((entry, ei) => {
              const grouped = groupByReport(entry.inputs);
              const dateLabel = formatDateLabel(entry.date) || entry.date || "";
              return Array.from(grouped.entries()).map(([reportName, tests]) => {
                const filledTests = tests.filter(
                  (t) => t.value != null && String(t.value).trim() !== "",
                );
                if (filledTests.length === 0) return null;
                return (
                  <div key={`${ei}-${reportName}`} className={styles.previewReportBlock}>
                    <div className={styles.previewReportHeader}>
                      <span className={styles.previewReportName}>
                        {reportName}
                      </span>
                      <span className={styles.previewReportMeta}>
                        {[
                          dateLabel,
                          // entry.doctorId != null && entry.doctorId !== ""
                          //   ? `Dr ID ${entry.doctorId}`
                          //   : null,
                          // entry.receptionistId != null && entry.receptionistId !== ""
                          //   ? `Entered by ${entry.receptionistId}`
                          //   : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    {renderNonTableResults(filledTests, labFormat)}
                  </div>
                );
              });
            })
          )}
        </>
      )}

      {/* Signature */}
      {showSignature && (
        <div
          className={styles.signatureBlock}
          style={{ textAlign: otherSettings?.signature_place === "R" ? "right" : "left" }}
        >
          <img src={fileSignature.showFile} alt="" className={styles.signatureImg} />
          {otherSettings?.name_of_doctor_enable === "Y" && doctorInfo?.header && (
            <div className={styles.signatureName}>{doctorInfo.header}</div>
          )}
          {otherSettings?.qualification_enable === "Y" && otherSettings?.qualification && (
            <div className={styles.signatureQual}>{otherSettings.qualification}</div>
          )}
        </div>
      )}

      {/* Footer: uploaded image (letterhead 1) */}
      {letterhead === 1 && fileFooter?.showFile && (
        <img src={fileFooter.showFile} alt="" className={styles.uploadedFooterImg} />
      )}

      {/* Footer: text */}
      {footerCfg?.enable === "Y" && footerCfg?.text && (
        <>
          <div className={styles.previewDivider} style={{ marginTop: 24 }} />
          <div
            className={styles.previewFooterText}
            style={{ fontSize: footerCfg.font_size || 10 }}
          >
            {footerCfg.text}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

function LimsPrintConfigMain() {
  const dispatch = useDispatch();
  const { state } = useLocation();
  const patient = state?.patient || null;
  const patientId = state?.patientId || patient?.patient_unique_id;

  const { defaultPrintSettings } = useSelector((s) => s.doctors);

  const [selectedTab, setSelectedTab] = useState(TAB_LAB_RESULTS);
  const [printSettings, setPrintSettings] = useState(null);
  const [fileHeader, setFileHeader] = useState(null);
  const [fileFooter, setFileFooter] = useState(null);
  const [fileLogo, setFileLogo] = useState(null);
  const [fileWatermark, setFileWatermark] = useState(null);
  const [fileSignature, setFileSignature] = useState(null);
  const [results, setResults] = useState([]);

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
      if (saved.files?.footer) {
        updateFooterImageHeight(saved.files.footer, setFileFooter, true);
      }
    } else {
      const ps = ensureLabOption(JSON.parse(JSON.stringify(defaultPrintSettings)));
      setPrintSettings(ps);
      initFileStates(ps, { setFileLogo, setFileWatermark, setFileSignature, setFileHeader, setFileFooter });
    }
  }, [defaultPrintSettings, printSettings]);

  useEffect(() => {
    if (!fileFooter?.showFile) return;
    updateFooterImageHeight(fileFooter, setFileFooter);
  }, [fileFooter?.showFile]);

  useEffect(() => {
    if (patientId) {
      fetchPatientLabResults(patientId).then((r) => setResults(r || []));
    }
  }, [patientId]);

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

  if (!printSettings) return null;

  return (
    <PrintSettingsContext.Provider value={contextApi}>
      <>
        <LimsHeaderBar />
        <div className="w-100 bg-body wrapper2">
          <Row justify="space-between">
            <Col xl={8} sm={10} className="pe-3">
              <div
                className="bg-white overflow-y-auto"
                style={{ height: "calc(100vh - 60px)" }}
              >
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
                  selectedTab === TAB_PAGE_FORMAT && <PageFormatLayout />
                )}
              </div>
            </Col>
            <Col xl={16} sm={14}>
              <div className="mx-auto overflow-y-auto" style={{ width: 900 }}>
                <div className="titleprint mt-20">Preview</div>
                <div className="rounded-20px bg-white mt-20 overflow-hidden">
                  <div className="position-relative printheight">
                    <LabResultsPreview results={results} patient={patient} />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </>
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
