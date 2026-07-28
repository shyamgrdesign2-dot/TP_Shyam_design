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
  getLimsMarginByFormat,
  formatLabResultValue,
  groupByReportForPrint,
  isRemarksTest,
  rangeText,
} from "./limsPrintUtils";
import { formatDateLabel } from "./limsHelpers";

const PX_TO_PT = 0.75;
const px = (n) => n * PX_TO_PT;

// Same font set as bill PDF so page_format.font_family applies.
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
Font.register({
  family: "Tahoma",
  fonts: [
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Regular.ttf`, fontWeight: 400 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Medium.ttf`, fontWeight: 500 },
    { src: `${TP_ASSETS_BASE}/fonts/print-fonts/OpenSans-Bold.ttf`, fontWeight: 700 },
  ],
});

const REGISTERED_FONTS = ["Roboto", "Arial", "Times-Roman", "Verdana", "Calibri", "Tahoma"];

const styles = StyleSheet.create({
  page: {
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
  uploadedHeaderImg: { width: "100%", objectFit: "contain" },
  uploadedFooterImg: { width: "100%", objectFit: "contain" },
  headerBlock: { marginBottom: px(8) },
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
  divider: { height: px(1), backgroundColor: "#e2e2ea", marginVertical: px(8) },
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
  reportBlock: { marginBottom: px(14) },
  dateHeading: {
    fontWeight: 600,
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
  reportName: { fontWeight: 700, color: "#171725" },
  reportMeta: { color: "#696974" },
  table: { borderWidth: px(1), borderColor: "#d5d5dc" },
  tableHeadRow: { flexDirection: "row", backgroundColor: "#f1f1f5" },
  tableHeadCell: {
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.3,
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
    color: "#171725",
    paddingVertical: px(3),
    paddingHorizontal: px(6),
    borderBottomWidth: px(1),
    borderBottomColor: "#d5d5dc",
  },
  tableRow: { flexDirection: "row" },
  tableCell: {
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
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingVertical: px(3),
    paddingHorizontal: px(6),
    borderBottomWidth: px(1),
    borderBottomColor: "#f1f1f5",
  },
  listName: { fontWeight: 600, color: "#171725" },
  listRange: { color: "#92929d" },
  listResult: { color: "#171725", textAlign: "right" },
  inline: {
    paddingVertical: px(4),
    paddingHorizontal: px(6),
    lineHeight: 1.6,
    color: "#171725",
  },
  signatureBlock: { marginTop: px(24), paddingTop: px(8) },
  signatureRight: { alignItems: "flex-end", textAlign: "right" },
  signatureImg: { maxWidth: px(160), maxHeight: px(60), objectFit: "contain" },
  signatureName: {
    fontWeight: 600,
    color: "#171725",
    marginTop: px(2),
  },
  signatureQual: { color: "#44444f" },
  footerBar: { backgroundColor: "#171725", height: px(2), width: "100%" },
  footerText: {
    marginTop: px(6),
    color: "#171725",
    fontWeight: 400,
    textAlign: "left",
  },
  qrBlock: { marginTop: px(16), maxWidth: px(220) },
  qrImg: { width: 61, height: 61, objectFit: "contain" },
  qrCaption: { marginTop: px(4), color: "#171725", lineHeight: 1.35 },
  pageNumber: {
    position: "absolute",
    bottom: px(8),
    right: px(12),
    fontSize: px(8),
    color: "#696974",
  },
});

const cleanSubheader = (text) =>
  text ? text.replace(/^null\s*/i, "").trim() || "" : "";

const imageUrl = (state, cacheBust) => {
  const url = state?.showFile || null;
  if (typeof url !== "string" || !/^https?:/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pdfcb=${cacheBust}`;
};

const resultText = (test) => formatLabResultValue(test);

const withArrow = (test) => {
  if (isRemarksTest(test)) return resultText(test);
  const arrow = arrowSymbol(test.arrowDirection);
  return `${resultText(test)}${arrow ? ` ${arrow}` : ""}`;
};

const isAbnormal = (test) =>
  !isRemarksTest(test) &&
  (test.arrowDirection === "UP" || test.arrowDirection === "DOWN");

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
      groupByReportForPrint(entry.inputs).forEach((tests, reportName) => {
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
    Array.from(groupByReportForPrint(entry.inputs).entries()).map(
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
                    {!isRemarksTest(test) && rangeText(test) ? (
                      <Text style={styles.listRange}> (Ref: {rangeText(test)})</Text>
                    ) : null}
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
  const letterhead = Number(printSettings?.letterhead_format);
  const doctorInfo = hf.header?.doctor_info;
  const clinicInfo = hf.header?.clinic_info;
  const otherSettings = hf.other_settings;
  const footerCfg = hf.footer || {};
  const footerTitle = footerCfg.title || footerCfg.text || "";

  const fontFamily = REGISTERED_FONTS.includes(pf.font_family)
    ? pf.font_family
    : "Roboto";
  const baseFontSize = px(Number(pf.font_size) || 10);
  const patientFontSize = px(
    Number(pf.patient_info_font_size) || Number(pf.font_size) || 10,
  );
  const showPagination = !!pf.pagination;

  const paddingTop = getLimsMarginByFormat(letterhead, hf, "top", 0.5);
  const paddingLeft = getLimsMarginByFormat(letterhead, hf, "left", 0.5);
  const paddingRight = getLimsMarginByFormat(letterhead, hf, "right", 0.5);
  const paddingBottomMargin = getLimsMarginByFormat(letterhead, hf, "bottom", 0.5);

  const getFooterImageRenderHeight = () => {
    const footerWidth = Number(fileFooter?.footerWidth);
    const footerHeight = Number(fileFooter?.footerHeight);
    const availableWidth = Math.max(0, 595 - (paddingLeft + paddingRight));
    if (footerWidth > 0 && footerHeight > 0 && availableWidth > 0) {
      return (footerHeight / footerWidth) * availableWidth;
    }
    const rendered = Number(fileFooter?.renderedFooterImageHeight);
    return Number.isFinite(rendered) && rendered > 0 ? rendered : px(56);
  };

  const getFooterTextRenderHeight = () => {
    if (!footerTitle) return 0;
    const footerFontSize = px(footerCfg.font_size || 10);
    return px(2) + px(6) + footerFontSize * 1.2;
  };

  // Reserve space so fixed footer/pagination don't overlap content (same approach as ViewPDF).
  const footerReserve =
    letterhead === 1 && fileFooter?.showFile
      ? getFooterImageRenderHeight()
      : letterhead === 0
        ? getFooterTextRenderHeight()
        : 0;
  const paginationReserve = showPagination ? px(16) : 0;
  const footerContentGap = px(5);
  const paddingBottom = paddingBottomMargin + footerReserve + footerContentGap + paginationReserve;

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
  const qrSrc =
    typeof printSettings?.qrcode === "string" && printSettings.qrcode
      ? printSettings.qrcode
      : null;
  const showQr = printSettings?.qrcode_enable === "Y" && !!qrSrc;
  const hasResults = results.some((entry) =>
    (entry.inputs || []).some(
      (input) =>
        input?.testName &&
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

  const renderFixedHeader = () => {
    if (letterhead === 1 && headerSrc) {
      return (
        <View fixed>
          <Image src={headerSrc} style={styles.uploadedHeaderImg} />
        </View>
      );
    }
    if (letterhead === 0) {
      return (
        <View style={styles.headerBlock} fixed>
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
      );
    }
    return null;
  };

  const renderFixedFooter = () => {
    if (letterhead === 1 && footerSrc) {
      return (
        <View
          style={{
            position: "absolute",
            left: paddingLeft,
            right: paddingRight,
            bottom: paddingBottomMargin,
          }}
          fixed
        >
          <Image src={footerSrc} style={styles.uploadedFooterImg} />
        </View>
      );
    }
    if (letterhead === 0 && footerTitle) {
      return (
        <View
          style={{
            position: "absolute",
            left: paddingLeft,
            right: paddingRight,
            bottom: paddingBottomMargin,
          }}
          fixed
        >
          <View style={styles.footerBar} />
          <Text
            style={[
              styles.footerText,
              { fontSize: px(footerCfg.font_size || 10) },
            ]}
          >
            {footerTitle}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <Document>
      <Page
        size="A4"
        style={[
          styles.page,
          {
            fontFamily,
            fontSize: baseFontSize,
            paddingTop,
            paddingLeft,
            paddingRight,
            paddingBottom,
          },
        ]}
        wrap
      >
        {showWatermark && (
          <Image src={watermarkSrc} style={styles.watermark} fixed />
        )}

        {renderFixedHeader()}

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

        {showQr && (
          <View style={styles.qrBlock} wrap={false}>
            <Image src={qrSrc} style={styles.qrImg} />
            <Text style={styles.qrCaption}>
              {`Scan QR code to book an appointment\nwith your doctor`}
            </Text>
          </View>
        )}

        {renderFixedFooter()}

        {showPagination && (
          <Text
            style={styles.pageNumber}
            fixed
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber}/${totalPages}`
            }
          />
        )}
      </Page>
    </Document>
  );
}
