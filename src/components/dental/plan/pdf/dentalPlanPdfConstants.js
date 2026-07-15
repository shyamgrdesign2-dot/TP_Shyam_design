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

const parseMarginValue = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Maps prescription print settings into the bill PDF header/footer shape. */
export function mapPrescriptionPrintSettingsToBillFormat(defaultPrintSettings) {
  if (!defaultPrintSettings) return null;

  const {
    page_format,
    header_footer,
    letterhead_format,
    qrcode_enable,
    signature_enable,
    signature_image,
    water_mark_enable,
    water_mark_image,
    logo_enable,
    logo_image,
    header_image,
    footer_image,
  } = defaultPrintSettings;

  const {
    custom_margin = {},
    header,
    footer,
    margin = {},
    letterhead_margin = {},
    other_settings,
    patient_info,
  } = header_footer || {};

  const { clinic_info, doctor_info } = header || {};

  return {
    pageFormat: {
      fontFamily: page_format?.font_family || "Roboto",
      fontSize: page_format?.font_size || 12,
      pageType: page_format?.page_size || "A5",
      patientInfoFontSize: page_format?.font_size || 12,
    },
    headerFooter: {
      customLetterHeadMargin: {
        top: parseMarginValue(custom_margin?.top, 3),
        left: parseMarginValue(custom_margin?.left, 2),
        right: parseMarginValue(custom_margin?.right, 2),
        bottom: parseMarginValue(custom_margin?.bottom, 2.5),
      },
      uploadedLetterHeadMargin: {
        top: parseMarginValue(letterhead_margin?.top, 3),
        left: parseMarginValue(letterhead_margin?.left, 2),
        right: parseMarginValue(letterhead_margin?.right, 2),
        bottom: parseMarginValue(letterhead_margin?.bottom, 2.5),
      },
      margin: {
        top: parseMarginValue(margin?.top, 0.5),
        left: parseMarginValue(margin?.left, 0.5),
        right: parseMarginValue(margin?.right, 0.5),
        bottom: parseMarginValue(margin?.bottom, 0.5),
      },
      letterHeadFormat: letterhead_format ?? 0,
      footer: {
        fontSize: footer?.font_size || 10,
        title: footer?.title || "",
        file: footer_image || null,
      },
      header: {
        clinicInfo: {
          enabled: clinic_info?.enable === "Y",
          header: clinic_info?.header || "",
          position: clinic_info?.place === "R" ? "right" : "left",
          subheader: clinic_info?.subheader || "",
        },
        doctorInfo: {
          enabled: doctor_info?.enable === "Y",
          header: doctor_info?.header || "",
          position: doctor_info?.place === "R" ? "right" : "left",
          subheader: doctor_info?.subheader || "",
        },
        file: header_image || null,
        logo: {
          enabled: logo_enable === "Y",
          file: logo_image || null,
        },
      },
      patientInfo: Array.isArray(patient_info)
        ? patient_info.map((item) => ({
            id: item.id,
            title: item.title,
            enabled: item.enable === "Y",
          }))
        : undefined,
      otherSettings: {
        qrCode: { enabled: qrcode_enable === "Y" },
        signature: {
          enabled: signature_enable === "Y",
          doctorNameEnabled: other_settings?.name_of_doctor_enable === "Y",
          file: signature_image,
          position:
            other_settings?.signature_place === "R" ? "right" : "left",
          qualification: other_settings?.qualification,
          qualificationEnabled: other_settings?.qualification_enable === "Y",
          registrationEnabled: other_settings?.registration_no_enable === "Y",
        },
        waterMark: {
          enabled: water_mark_enable === "Y",
          file: water_mark_image,
        },
      },
    },
  };
}

export function getDentalPlanPrintSettings(
  billPrintSettings,
  defaultPrintSettings
) {
  const fromPrescription =
    mapPrescriptionPrintSettingsToBillFormat(defaultPrintSettings);
  const hasBillSettings =
    billPrintSettings && Object.keys(billPrintSettings).length > 0;
  const base = hasBillSettings
    ? billPrintSettings
    : fromPrescription || FALLBACK_BILL_PRINT_SETTINGS;

  const baseHeaderFooter =
    base.headerFooter || FALLBACK_BILL_PRINT_SETTINGS.headerFooter;
  const rxHeaderFooter = fromPrescription?.headerFooter;

  const mergedHeaderFooter = rxHeaderFooter
    ? {
        ...baseHeaderFooter,
        letterHeadFormat: rxHeaderFooter.letterHeadFormat,
        customLetterHeadMargin: rxHeaderFooter.customLetterHeadMargin,
        uploadedLetterHeadMargin: rxHeaderFooter.uploadedLetterHeadMargin,
        margin: rxHeaderFooter.margin,
        header: {
          ...baseHeaderFooter.header,
          ...rxHeaderFooter.header,
          clinicInfo: rxHeaderFooter.header?.clinicInfo,
          doctorInfo: rxHeaderFooter.header?.doctorInfo,
          file: rxHeaderFooter.header?.file ?? baseHeaderFooter.header?.file,
          logo: rxHeaderFooter.header?.logo || baseHeaderFooter.header?.logo,
        },
        footer: {
          ...baseHeaderFooter.footer,
          ...rxHeaderFooter.footer,
          file: rxHeaderFooter.footer?.file ?? baseHeaderFooter.footer?.file,
        },
        otherSettings: {
          ...baseHeaderFooter.otherSettings,
          ...rxHeaderFooter.otherSettings,
        },
        patientInfo: baseHeaderFooter.patientInfo ?? rxHeaderFooter.patientInfo,
        billInfo: DENTAL_PLAN_BILL_INFO,
      }
    : {
        ...baseHeaderFooter,
        billInfo: DENTAL_PLAN_BILL_INFO,
      };

  return {
    ...base,
    pageFormat: {
      ...(fromPrescription?.pageFormat ||
        FALLBACK_BILL_PRINT_SETTINGS.pageFormat),
      ...(base.pageFormat || {}),
    },
    headerFooter: mergedHeaderFooter,
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
