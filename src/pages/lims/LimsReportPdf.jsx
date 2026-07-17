import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { TP_ASSETS_BASE } from "../../utils/constants";
import {
  LAB_RESULTS_CASE_ID,
  arrowSymbol,
  groupByReport,
  rangeText,
} from "./limsPrintUtils";
import { formatDateLabel } from "./limsHelpers";

// Same font set as the bill PDF (ViewBillPdf) so print settings font_family works.
Font.register({
  family: "Roboto",
  fonts: [
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Regular.ttf`, fontWeight: 400 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Medium.ttf`, fontWeight: 500 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Bold.ttf`, fontWeight: 700 },
  ],
});
Font.register({
  family: "Arial",
  fonts: [
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Regular.ttf`, fontWeight: 400 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Medium.ttf`, fontWeight: 500 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Arimo-Bold.ttf`, fontWeight: 700 },
  ],
});
Font.register({
  family: "Times-Roman",
  fonts: [
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Regular.ttf`, fontWeight: 400 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Medium.ttf`, fontWeight: 500 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/EBGaramond-Bold.ttf`, fontWeight: 700 },
  ],
});
Font.register({
  family: "Verdana",
  fonts: [
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Regular.ttf`, fontWeight: 400 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Medium.ttf`, fontWeight: 500 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/Jost-Bold.ttf`, fontWeight: 700 },
  ],
});
Font.register({
  family: "Calibri",
  fonts: [
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Regular.ttf`, fontWeight: 400 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Medium.ttf`, fontWeight: 500 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Bold.ttf`, fontWeight: 700 },
  ],
});

const REGISTERED_FONTS = ["Roboto", "Arial", "Times-Roman", "Verdana", "Calibri"];

// The on-screen preview card is 794px wide = A4 at 96dpi, so px * 0.75 = pt.
const PX = 0.75;
const px = (n) => n * PX;

// Styles mirror LimsPrintConfig.module.css (the preview the old html2canvas flow captured).
const styles = StyleSheet.create({
  page: {
    paddingVertical: px(24),
    paddingHorizontal: px(28),
    color: "#171725",
    backgroundColor: "#ffffff",
  },
  watermark: {
    position: "absolute",
    left: "22%",
    top: "32%",
    width: "56%",
    opacity: 0.08,
    objectFit: "contain",
  },
  uploadedHeaderImg: { width: "100%", objectFit: "contain", marginBottom: px(12) },
  uploadedFooterImg: { width: "100%", objectFit: "contain", marginTop: px(24) },
  /* Custom header (letterhead 0); divider below it already adds spacing */
  headerBlock: { marginBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  headerLeft: { flex: 1 },
  headerRight: { flexShrink: 0, alignItems: "flex-end", textAlign: "right", marginLeft: px(12) },
  logo: {
    width: px(48),
    height: px(48),
    objectFit: "contain",
    borderRadius: px(4),
    marginBottom: px(4),
  },
  doctorName: { fontSize: px(13), fontWeight: 700, color: "#4f4dc8" },
  clinicName: { fontSize: px(11), fontWeight: 600, color: "#171725" },
  subheader: { fontSize: px(9), color: "#44444f", marginTop: px(1), lineHeight: 1.45 },
  divider: { height: px(1), backgroundColor: "#e2e2ea", marginVertical: px(10) },
  /* Patient info */
  patientBlock: { paddingVertical: px(2) },
  patientRow: { flexDirection: "row", flexWrap: "wrap", color: "#44444f" },
  patientField: { flexDirection: "row", marginRight: px(12), marginBottom: px(2) },
  bold: { fontWeight: 700 },
  semibold: { fontWeight: 600 },
  empty: {
    textAlign: "center",
    paddingVertical: px(32),
    color: "#92929d",
    fontSize: px(11),
  },
  /* Report blocks */
  reportBlock: { marginBottom: px(14) },
  dateHeading: {
    fontWeight: 600,
    fontSize: px(10),
    color: "#171725",
    marginBottom: px(4),
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f1f1f5",
    paddingVertical: px(3),
    paddingHorizontal: px(8),
    borderRadius: px(2),
  },
  reportName: { fontWeight: 700, fontSize: px(10), color: "#171725" },
  reportMeta: { fontSize: px(9), color: "#696974" },
  /* Table format */
  table: { borderWidth: px(1), borderColor: "#d5d5dc" },
  tableHeadRow: { flexDirection: "row", backgroundColor: "#f1f1f5" },
  tableHeadCell: {
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    fontSize: px(8),
    color: "#696974",
    paddingVertical: px(3),
    paddingHorizontal: px(6),
    borderRightWidth: px(1),
    borderRightColor: "#d5d5dc",
    borderBottomWidth: px(1),
    borderBottomColor: "#d5d5dc",
  },
  tableSubHeadRow: { flexDirection: "row", backgroundColor: "#f1f1f5" },
  tableSubHeadCell: {
    fontWeight: 700,
    fontSize: px(9),
    color: "#171725",
    paddingVertical: px(3),
    paddingHorizontal: px(6),
    borderBottomWidth: px(1),
    borderBottomColor: "#d5d5dc",
  },
  tableRow: { flexDirection: "row" },
  tableCell: {
    fontSize: px(9),
    color: "#171725",
    paddingVertical: px(2),
    paddingHorizontal: px(6),
    borderRightWidth: px(1),
    borderRightColor: "#e2e2ea",
    borderBottomWidth: px(1),
    borderBottomColor: "#e2e2ea",
  },
  lastCell: { borderRightWidth: 0 },
  colTest: { width: "45%" },
  colResult: { width: "28%" },
  colRange: { width: "27%" },
  abnormal: { color: "#c5292a" },
  arrow: { fontSize: px(7) },
  /* List view format */
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingVertical: px(3),
    paddingHorizontal: px(6),
    borderBottomWidth: px(1),
    borderBottomColor: "#f1f1f5",
  },
  listName: { fontWeight: 600, fontSize: px(9), color: "#171725" },
  listRange: { fontSize: px(8), color: "#92929d" },
  listResult: { fontSize: px(9), color: "#171725", textAlign: "right" },
  /* Inline format */
  inline: {
    paddingVertical: px(4),
    paddingHorizontal: px(6),
    lineHeight: 1.6,
    fontSize: px(9),
    color: "#171725",
  },
  /* Signature */
  signatureBlock: { marginTop: px(32), paddingTop: px(8) },
  signatureRight: { alignItems: "flex-end", textAlign: "right" },
  signatureImg: { maxWidth: px(160), maxHeight: px(60), objectFit: "contain" },
  signatureName: {
    fontWeight: 600,
    fontSize: px(10),
    color: "#171725",
    marginTop: px(2),
  },
  signatureQual: { fontSize: px(9), color: "#44444f" },
  /* Footer */
  footerDivider: { height: px(1), backgroundColor: "#e2e2ea", marginTop: px(24) },
  footerText: {
    fontSize: px(8),
    color: "#92929d",
    textAlign: "center",
    paddingVertical: px(4),
  },
});

const cleanSubheader = (text) =>
  text ? text.replace(/^null\s*/i, "").trim() || "" : "";

/**
 * The preview <img> stores a no-CORS response (without the
 * Access-Control-Allow-Origin header) in the browser cache, and the image
 * server sends no `Vary: Origin`. react-pdf fetches images with CORS, so it
 * would be served that cached header-less response and fail. A unique query
 * string bypasses the cache so the CORS request reaches the server, which
 * does return the CORS headers (this is why the bill PDF, which has no <img>
 * preview, always worked).
 */
const imageUrl = (state, cacheBust) => {
  const url = state?.showFile || null;
  if (typeof url !== "string" || !/^https?:/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pdfcb=${cacheBust}`;
};

const resultText = (test) =>
  [String(test.value), test.units || ""].filter(Boolean).join(" ");

const withArrow = (test) => {
  const arrow = arrowSymbol(test.arrowDirection);
  return `${resultText(test)}${arrow ? ` ${arrow}` : ""}`;
};

const isAbnormal = (test) =>
  test.arrowDirection === "UP" || test.arrowDirection === "DOWN";

function PatientFields({ patient, fields, fontSize }) {
  const age = patient.ageYears
    ? `${patient.ageYears}y`
    : patient.ageMonths
      ? `${patient.ageMonths}m`
      : patient.pm_age
        ? `${patient.pm_age}y`
        : "";
  const values = {
    1: ["Name", patient.pm_fullname || "Patient Name"],
    2: ["ID", patient.pm_pid || patient.tpml_refrence_id || ""],
    3: ["Date", new Date().toLocaleDateString("en-IN")],
    4: ["Age", age],
    5: ["Gender", patient.pm_gender || ""],
    9: ["Mobile", patient.pm_contact_no || ""],
  };
  const enabled = (fields || []).filter((field) => field.enable === "Y");
  const selected = enabled.length
    ? enabled.map((field) => values[field.id]).filter((item) => item?.[1])
    : [values[1], values[2], values[5], values[4], values[9]].filter(
        (item) => item?.[1],
      );

  return (
    <View style={styles.patientBlock}>
      <View style={[styles.patientRow, { fontSize }]}>
        {selected.map(([label, value]) => (
          <View key={label} style={styles.patientField}>
            <Text style={styles.bold}>{label}: </Text>
            <Text>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TableResults({ results }) {
  const dateGroups = new Map();
  results.forEach((entry) => {
    const key = entry.date || "unknown";
    if (!dateGroups.has(key)) dateGroups.set(key, []);
    dateGroups.get(key).push(entry);
  });

  return Array.from(dateGroups.entries()).map(([dateKey, entries]) => {
    const clusters = [];
    entries.forEach((entry) => {
      groupByReport(entry.inputs).forEach((tests, reportName) => {
        const filled = tests.filter(
          (test) => test.value != null && String(test.value).trim() !== "",
        );
        if (filled.length) clusters.push({ reportName, tests: filled });
      });
    });
    if (!clusters.length) return null;

    return (
      <View key={dateKey} style={styles.reportBlock}>
        <Text style={styles.dateHeading}>
          Test Results: {formatDateLabel(dateKey) || dateKey}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.tableHeadCell, styles.colTest]}>Test</Text>
            <Text style={[styles.tableHeadCell, styles.colResult]}>Result</Text>
            <Text style={[styles.tableHeadCell, styles.colRange, styles.lastCell]}>
              Ref. Range
            </Text>
          </View>
          {clusters.map(({ reportName, tests }) => (
            <React.Fragment key={reportName}>
              <View style={styles.tableSubHeadRow}>
                <Text style={[styles.tableSubHeadCell, { width: "100%" }]}>
                  {reportName}
                </Text>
              </View>
              {tests.map((test, index) => (
                <View
                  key={`${reportName}-${test.testName}-${index}`}
                  style={styles.tableRow}
                  wrap={false}
                >
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colTest,
                      isAbnormal(test) && styles.abnormal,
                    ]}
                  >
                    {test.testName || ""}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colResult,
                      styles.semibold,
                      isAbnormal(test) && styles.abnormal,
                    ]}
                  >
                    {withArrow(test)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colRange,
                      styles.lastCell,
                      isAbnormal(test) && styles.abnormal,
                    ]}
                  >
                    {rangeText(test)}
                  </Text>
                </View>
              ))}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  });
}

function NonTableResults({ results, format }) {
  return results.flatMap((entry, entryIndex) =>
    Array.from(groupByReport(entry.inputs).entries()).map(
      ([reportName, tests]) => {
        const filled = tests.filter(
          (test) => test.value != null && String(test.value).trim() !== "",
        );
        if (!filled.length) return null;
        return (
          <View key={`${entryIndex}-${reportName}`} style={styles.reportBlock}>
            <View style={styles.reportHeader} wrap={false}>
              <Text style={styles.reportName}>{reportName}</Text>
              <Text style={styles.reportMeta}>
                {formatDateLabel(entry.date) || entry.date || ""}
              </Text>
            </View>
            {format === "listview" ? (
              filled.map((test, index) => (
                <View
                  key={`${test.testName}-${index}`}
                  style={styles.listItem}
                  wrap={false}
                >
                  <Text style={isAbnormal(test) ? styles.abnormal : undefined}>
                    <Text style={styles.listName}>{test.testName || ""}</Text>
                    {rangeText(test) ? (
                      <Text style={styles.listRange}> (Ref: {rangeText(test)})</Text>
                    ) : null}
                  </Text>
                  <Text
                    style={[
                      styles.listResult,
                      styles.semibold,
                      isAbnormal(test) && styles.abnormal,
                    ]}
                  >
                    {withArrow(test)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.inline}>
                {filled.map((test, index) => (
                  <Text
                    key={`${test.testName}-${index}`}
                    style={isAbnormal(test) ? styles.abnormal : undefined}
                  >
                    {test.testName || ""}
                    {resultText(test) ? `: ${withArrow(test)}` : ""}
                    {index < filled.length - 1 ? "; " : ""}
                  </Text>
                ))}
              </Text>
            )}
          </View>
        );
      },
    ),
  );
}

export default function LimsReportPdf({
  results = [],
  patient = {},
  printSettings,
  fileHeader,
  fileFooter,
  fileLogo,
  fileWatermark,
  fileSignature,
}) {
  const hf = printSettings?.header_footer || {};
  const pf = printSettings?.page_format || {};
  const letterhead = printSettings?.letterhead_format;
  const doctorInfo = hf.header?.doctor_info;
  const clinicInfo = hf.header?.clinic_info;
  const otherSettings = hf.other_settings;
  const footerCfg = hf.footer;

  const fontFamily = REGISTERED_FONTS.includes(pf.font_family)
    ? pf.font_family
    : "Roboto";
  const baseFontSize = px(pf.font_size || 10);
  const patientFontSize = px(pf.patient_info_font_size || pf.font_size || 10);

  // Own letterhead (2): honor the custom top/bottom margins (cm -> px like preview).
  const ownMargin =
    letterhead === 2 ? hf.custom_letterhead_margin || hf.margin || {} : {};
  const pagePadding =
    letterhead === 2
      ? {
          paddingTop: px((parseFloat(ownMargin.top) || 2) * 28),
          paddingBottom: px((parseFloat(ownMargin.bottom) || 2) * 28),
        }
      : {};

  const labOption = printSettings?.prescription?.case_option?.find(
    (option) => option.id === LAB_RESULTS_CASE_ID,
  );
  const format = labOption?.format || "table";
  const cacheBust = Date.now();
  const logoSrc = imageUrl(fileLogo, cacheBust);
  const watermarkSrc = imageUrl(fileWatermark, cacheBust);
  const signatureSrc = imageUrl(fileSignature, cacheBust);
  const headerSrc = imageUrl(fileHeader, cacheBust);
  const footerSrc = imageUrl(fileFooter, cacheBust);
  const showLogo = printSettings?.logo_enable === "Y" && logoSrc;
  const showWatermark =
    printSettings?.water_mark_enable === "Y" && watermarkSrc;
  const showSignature =
    printSettings?.signature_enable === "Y" && signatureSrc;
  const hasResults = results.some((entry) =>
    (entry.inputs || []).some(
      (input) =>
        input?.testName &&
        input.testName !== "Remarks" &&
        input.value != null &&
        String(input.value).trim() !== "",
    ),
  );

  const doctorOnRight = doctorInfo?.place === "R";

  const renderDoctorBlock = (align) =>
    doctorInfo?.enable === "Y" && (
      <View>
        <Text style={[styles.doctorName, { textAlign: align }]}>
          {doctorInfo.header || "Dr. Name"}
        </Text>
        {!!cleanSubheader(doctorInfo.subheader) && (
          <Text style={[styles.subheader, { textAlign: align }]}>
            {cleanSubheader(doctorInfo.subheader)}
          </Text>
        )}
      </View>
    );

  const renderClinicBlock = (align) =>
    clinicInfo?.enable === "Y" && (
      <View>
        <Text style={[styles.clinicName, { textAlign: align }]}>
          {clinicInfo.header || ""}
        </Text>
        {!!clinicInfo.subheader && (
          <Text style={[styles.subheader, { textAlign: align }]}>
            {clinicInfo.subheader}
          </Text>
        )}
      </View>
    );

  return (
    <Document>
      <Page
        size="A4"
        style={[styles.page, { fontFamily, fontSize: baseFontSize }, pagePadding]}
        wrap
      >
        {showWatermark && (
          <Image src={watermarkSrc} style={styles.watermark} fixed />
        )}

        {/* Letterhead: Upload (1) */}
        {letterhead === 1 && headerSrc && (
          <Image src={headerSrc} style={styles.uploadedHeaderImg} />
        )}

        {/* Letterhead: Custom (0) — logo stacks above the info block, like preview */}
        {letterhead === 0 && (
          <View style={styles.headerBlock}>
            <View style={styles.headerRow} wrap={false}>
              <View style={styles.headerLeft}>
                {showLogo && !doctorOnRight && (
                  <Image src={logoSrc} style={styles.logo} />
                )}
                {!doctorOnRight && renderDoctorBlock("left")}
                {clinicInfo?.place !== "R" && renderClinicBlock("left")}
              </View>
              <View style={styles.headerRight}>
                {showLogo && doctorOnRight && (
                  <Image src={logoSrc} style={styles.logo} />
                )}
                {doctorOnRight && renderDoctorBlock("right")}
                {clinicInfo?.place === "R" && renderClinicBlock("right")}
              </View>
            </View>
            <View style={styles.divider} />
          </View>
        )}

        <PatientFields
          patient={patient}
          fields={hf.patient_info}
          fontSize={patientFontSize}
        />
        <View style={styles.divider} />

        {labOption?.enable === "N" || !hasResults ? (
          <Text style={styles.empty}>No lab results for the selected date.</Text>
        ) : format === "table" ? (
          <TableResults results={results} />
        ) : (
          <NonTableResults results={results} format={format} />
        )}

        {showSignature && (
          <View
            style={[
              styles.signatureBlock,
              otherSettings?.signature_place === "R" && styles.signatureRight,
            ]}
            wrap={false}
          >
            <Image src={signatureSrc} style={styles.signatureImg} />
            {otherSettings?.name_of_doctor_enable === "Y" && doctorInfo?.header && (
              <Text style={styles.signatureName}>{doctorInfo.header}</Text>
            )}
            {otherSettings?.qualification_enable === "Y" &&
              otherSettings?.qualification && (
                <Text style={styles.signatureQual}>
                  {otherSettings.qualification}
                </Text>
              )}
          </View>
        )}

        {/* Footer: uploaded image (letterhead 1) */}
        {letterhead === 1 && footerSrc && (
          <Image src={footerSrc} style={styles.uploadedFooterImg} />
        )}

        {/* Footer: text */}
        {footerCfg?.enable === "Y" && footerCfg?.text && (
          <>
            <View style={styles.footerDivider} />
            <Text
              style={[
                styles.footerText,
                { fontSize: px(footerCfg.font_size || 10) },
              ]}
            >
              {footerCfg.text}
            </Text>
          </>
        )}
      </Page>
    </Document>
  );
}
