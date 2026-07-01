import { StyleSheet } from "@react-pdf/renderer";

export const PX_TO_PT = 0.75;

export const pdfStyles = StyleSheet.create({
  sectionHeading: {
    fontSize: PX_TO_PT * 10,
    fontWeight: 700,
    color: "#6A6A74",
    fontFamily: "Roboto",
    letterSpacing: 0.6,
    marginBottom: PX_TO_PT * 8,
    textTransform: "uppercase",
  },
  bodyText: {
    fontSize: PX_TO_PT * 11,
    color: "#171725",
    fontFamily: "Roboto",
    fontWeight: 400,
    lineHeight: 1.45,
  },
  bodyTextBold: {
    fontSize: PX_TO_PT * 11,
    color: "#171725",
    fontFamily: "Roboto",
    fontWeight: 700,
    lineHeight: 1.45,
  },
  metaText: {
    fontSize: PX_TO_PT * 10,
    color: "#6A6A74",
    fontFamily: "Roboto",
    fontWeight: 400,
    lineHeight: 1.4,
  },
  visitCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: PX_TO_PT * 10,
    marginBottom: PX_TO_PT * 8,
  },
  table: {
    marginTop: PX_TO_PT * 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FCFCFC",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    padding: 6,
  },
  planGroupHeader: {
    backgroundColor: "#F1F1F5",
    paddingVertical: PX_TO_PT * 6,
    paddingHorizontal: PX_TO_PT * 8,
  },
  planGroupTitle: {
    fontSize: PX_TO_PT * 11,
    fontWeight: 700,
    color: "#171725",
    fontFamily: "Roboto",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: PX_TO_PT * 3,
  },
  summaryLabel: {
    fontSize: PX_TO_PT * 11,
    color: "#6A6A74",
    fontFamily: "Roboto",
    width: PX_TO_PT * 120,
    textAlign: "right",
    marginRight: PX_TO_PT * 12,
  },
  summaryValue: {
    fontSize: PX_TO_PT * 11,
    color: "#171725",
    fontFamily: "Roboto",
    width: PX_TO_PT * 72,
    textAlign: "right",
  },
  summaryValueDiscount: {
    fontSize: PX_TO_PT * 11,
    color: "#FC5A5A",
    fontFamily: "Roboto",
    width: PX_TO_PT * 72,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: PX_TO_PT * 6,
    marginTop: PX_TO_PT * 4,
    borderTopWidth: 1,
    borderTopColor: "#E4E4EB",
  },
  totalLabel: {
    fontSize: PX_TO_PT * 12,
    fontWeight: 700,
    color: "#171725",
    fontFamily: "Roboto",
    width: PX_TO_PT * 120,
    textAlign: "right",
    marginRight: PX_TO_PT * 12,
  },
  totalValue: {
    fontSize: PX_TO_PT * 12,
    fontWeight: 700,
    color: "#1D4ED8",
    fontFamily: "Roboto",
    width: PX_TO_PT * 72,
    textAlign: "right",
  },
});

/** Right-column bill info for dental plan PDFs — Created on only (no print-settings change). */
export const DENTAL_PLAN_BILL_INFO = [
  { id: 6, title: "Created on", enabled: true },
];

export function getDentalPlanPrintSettings(printSettings) {
  if (!printSettings) return FALLBACK_BILL_PRINT_SETTINGS;
  return {
    ...printSettings,
    headerFooter: {
      ...printSettings.headerFooter,
      billInfo: DENTAL_PLAN_BILL_INFO,
    },
  };
}

export const FALLBACK_BILL_PRINT_SETTINGS = {
  pageFormat: {
    pageType: "A5",
    fontSize: 12,
    fontFamily: "Roboto",
    patientInfoFontSize: 12,
  },
  headerFooter: {
    letterHeadFormat: 0,
    header: {
      clinicInfo: {
        enabled: true,
        header: "Clinic",
        subheader: "",
        position: "left",
      },
      doctorInfo: {
        enabled: false,
        header: "",
        subheader: "",
        position: "left",
      },
      logo: { enabled: false, file: null },
    },
    patientInfo: [
      { id: 1, title: "Patient Name", enabled: true },
      { id: 2, title: "Patient ID", enabled: true },
      { id: 3, title: "Age / Sex", enabled: true },
      { id: 4, title: "Mobile", enabled: true },
    ],
    billInfo: DENTAL_PLAN_BILL_INFO,
    footer: { fontSize: 10, title: "" },
    customLetterHeadMargin: { top: 3, left: 2, right: 2, bottom: 2.5 },
    uploadedLetterHeadMargin: { top: 3, left: 2, right: 2, bottom: 2.5 },
    margin: { top: 0.5, left: 0.5, right: 0.5, bottom: 0.5 },
  },
};
