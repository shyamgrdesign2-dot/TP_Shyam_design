import moment from "moment";
import { resolvePatientEddDisplay } from "./patientEddDisplay";

const CM_FALLBACK = {
  top: 1.2,
  right: 1.2,
  bottom: 1.2,
  left: 1.2,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeImageUrl(value) {
  return String(value || "").trim();
}

function cssFontFamily(value) {
  const family = String(value || "").trim();
  if (!family) return "Arial, sans-serif";
  if (family.includes(",")) return family;
  return `"${family.replace(/"/g, '\\"')}", Arial, sans-serif`;
}

function sanitizeRichHtml(html) {
  if (!html || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes || []).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "");
      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
      }
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.firstElementChild?.innerHTML || "";
}

function getMargin(printSettings, position) {
  const format = printSettings?.letterhead_format;
  const marginKey =
    format === 0
      ? "custom_letterhead_margin"
      : format === 1
        ? "uploaded_letterhead_margin"
        : format === 2
          ? "margin"
          : null;
  const raw = marginKey ? printSettings?.header_footer?.[marginKey]?.[position] : null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : CM_FALLBACK[position];
}

function getAgeText(patient, profile) {
  const years = Number(patient?.ageYears ?? patient?.patient_age_years ?? 0);
  const months = Number(patient?.ageMonths ?? patient?.patient_age_months ?? 0);
  const days = Number(patient?.ageDays ?? patient?.patient_age_days ?? 0);
  const parts = [];
  if (profile?.dp_id === 9) {
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}m`);
    if (days) parts.push(`${days}d`);
  } else if (years) {
    parts.push(`${years}y`);
  } else if (months) {
    parts.push(`${months}m`);
  } else if (days) {
    parts.push(`${days}d`);
  }
  return parts.join(" ");
}

function getPatientName(patient) {
  const fullName =
    patient?.patient_name ||
    patient?.pm_fullname ||
    [patient?.pm_first_name, patient?.pm_last_name].filter(Boolean).join(" ");
  return [patient?.patient_salutation, fullName].filter(Boolean).join(" ").trim() || "-";
}

function getPatientId(patient) {
  return patient?.patient_id || patient?.patient_unique_id || patient?.pm_pid || "-";
}

function getConsultationDate(patient, consultationDate) {
  const raw =
    patient?.patient_consultaion_date ||
    patient?.patient_consultation_date ||
    consultationDate ||
    new Date();
  return moment(raw).isValid() ? moment(raw).format("DD/MM/YYYY HH:mm") : "-";
}

function getPatientValue(id, { patient, profile, consultationDate, obsHistoryData }) {
  switch (Number(id)) {
    case 1:
      return `${getPatientName(patient)}, ${getPatientId(patient)}`;
    case 2:
      return getConsultationDate(patient, consultationDate);
    case 3: {
      const age = getAgeText(patient, profile);
      const gender = patient?.patient_gender || patient?.pm_gender || "-";
      return [age, gender].filter(Boolean).join(", ");
    }
    case 4:
      return patient?.patient_contact_no || patient?.pm_contact_no || "-";
    case 5:
      return patient?.patient_ht_wt || patient?.heightWeight || patient?.height_weight || "-";
    case 6:
      return patient?.patient_blood_group || patient?.blood_group || "-";
    case 7:
      return patient?.patient_address || patient?.pm_address || "-";
    case 8:
      return patient?.patient_consultation_type || "-";
    case 9:
      return resolvePatientEddDisplay(patient, obsHistoryData);
    case 10:
      return patient?.patient_email || patient?.pm_email || "-";
    case 11:
      return patient?.patient_reference_id || patient?.mrno || "-";
    case 12:
      return getPatientName(patient);
    case 13:
      return getPatientId(patient);
    case 14:
      return patient?.patient_dob || patient?.pm_dob || "-";
    default:
      return "-";
  }
}

function renderHeader(printSettings) {
  const header = printSettings?.header_footer?.header || {};
  const doctor = header?.doctor_info || {};
  const clinic = header?.clinic_info || {};
  const logoUrl = normalizeImageUrl(printSettings?.logo_image);
  const headerImage = normalizeImageUrl(printSettings?.header_image);

  if (printSettings?.letterhead_format === 1 && headerImage) {
    return `<header class="soap-print-header image-header"><img src="${escapeHtml(headerImage)}" alt="" /></header>`;
  }

  if (printSettings?.letterhead_format !== 0) return "";

  const leftInfo = doctor?.place === "L" ? doctor : clinic;
  const rightInfo = doctor?.place === "R" ? doctor : clinic;
  const singleInfo = doctor?.enable === "Y" ? doctor : clinic?.enable === "Y" ? clinic : null;

  const renderInfo = (info, align = "left") => {
    if (!info || info?.enable !== "Y") return "";
    return `
      <div class="header-info ${align}">
        <div class="header-title">${escapeHtml(info.header || "")}</div>
        <div class="header-subtitle">${escapeHtml(info.subheader || "").replace(/\n/g, "<br/>")}</div>
      </div>
    `;
  };

  if (doctor?.enable === "Y" && clinic?.enable === "Y") {
    return `
      <header class="soap-print-header text-header">
        ${renderInfo(leftInfo, "left")}
        ${printSettings?.logo_enable === "Y" && logoUrl ? `<img class="header-logo" src="${escapeHtml(logoUrl)}" alt="" />` : ""}
        ${renderInfo(rightInfo, "right")}
      </header>
      <div class="header-rule"></div>
    `;
  }

  return `
    <header class="soap-print-header text-header single">
      ${printSettings?.logo_enable === "Y" && logoUrl ? `<img class="header-logo" src="${escapeHtml(logoUrl)}" alt="" />` : ""}
      ${renderInfo(singleInfo, singleInfo?.place === "R" ? "right" : "left")}
    </header>
    <div class="header-rule"></div>
  `;
}

function renderPatientInfo({ printSettings, patient, profile, consultationDate, obsHistoryData }) {
  const show = printSettings?.header_footer?.show_patient_info;
  if (show === "none") return "";
  const enabled = (printSettings?.header_footer?.patient_info || []).filter(
    (item) => item?.enable === "Y",
  );
  if (!enabled.length) return "";
  const rows = enabled
    .map((item) => ({
      title: item?.title || "",
      value: getPatientValue(item?.id, {
        patient,
        profile,
        consultationDate,
        obsHistoryData,
      }),
    }))
    .map(
      (item) => `
        <div class="patient-info-item">
          <span class="patient-info-label">${escapeHtml(item.title)}: </span>
          <span class="patient-info-value">${escapeHtml(item.value)}</span>
        </div>
      `,
    )
    .join("");
  return `
    <section class="patient-info">
      ${rows}
    </section>
    <div class="patient-rule"></div>
  `;
}

function renderFooter(printSettings) {
  const footerImage = normalizeImageUrl(printSettings?.footer_image);
  const footerTitle = printSettings?.header_footer?.footer?.title || "";
  if (printSettings?.letterhead_format === 1 && footerImage) {
    return `<footer class="soap-print-footer image-footer"><img src="${escapeHtml(footerImage)}" alt="" /></footer>`;
  }
  if (printSettings?.letterhead_format === 0 && footerTitle) {
    return `<footer class="soap-print-footer text-footer"><div class="footer-rule"></div>${escapeHtml(footerTitle)}</footer>`;
  }
  return "";
}

function renderWatermark(printSettings) {
  const watermark = normalizeImageUrl(printSettings?.water_mark_image);
  if (printSettings?.water_mark_enable !== "Y" || !watermark) return "";
  return `<img class="soap-print-watermark" src="${escapeHtml(watermark)}" alt="" />`;
}

function renderSignature(printSettings) {
  const signature = normalizeImageUrl(printSettings?.signature_image);
  if (printSettings?.signature_enable !== "Y" || !signature) return "";
  return `<div class="soap-print-signature"><img src="${escapeHtml(signature)}" alt="" /></div>`;
}

function buildSoapPrintHtml({
  soapHtml,
  printSettings,
  patient,
  profile,
  consultationDate,
  obsHistoryData,
}) {
  const safeSoapHtml = sanitizeRichHtml(soapHtml);
  const pageFont = cssFontFamily(printSettings?.page_format?.font_family);
  const fontSize = Number(printSettings?.page_format?.font_size) || 12;
  const patientFontSize =
    Number(printSettings?.page_format?.patient_info_font_size) || fontSize;
  const margins = {
    top: getMargin(printSettings, "top"),
    right: getMargin(printSettings, "right"),
    bottom: getMargin(printSettings, "bottom"),
    left: getMargin(printSettings, "left"),
  };

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SOAP Print</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #171725;
      font-family: ${pageFont};
      font-size: ${fontSize}px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .soap-print-page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      padding: ${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm;
      margin: 0 auto;
      background: #fff;
    }
    .soap-print-watermark {
      position: fixed;
      top: 42%;
      left: 50%;
      width: 45%;
      max-height: 45%;
      transform: translate(-50%, -50%);
      opacity: 0.12;
      object-fit: contain;
      z-index: 0;
      pointer-events: none;
    }
    .soap-print-header,
    .patient-info,
    .soap-content,
    .soap-print-signature,
    .soap-print-footer {
      position: relative;
      z-index: 1;
    }
    .soap-print-header.text-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    .soap-print-header.text-header.single {
      justify-content: flex-start;
    }
    .header-info {
      flex: 1;
      white-space: pre-line;
    }
    .header-info.right { text-align: right; }
    .header-title {
      font-weight: 800;
      font-size: 18px;
      line-height: 1.25;
      color: #171725;
    }
    .header-subtitle {
      margin-top: 4px;
      font-weight: 700;
      font-size: 13px;
      line-height: 1.25;
      color: #454551;
      white-space: pre-line;
    }
    .header-logo {
      width: 82px;
      height: 82px;
      object-fit: contain;
      flex: 0 0 auto;
    }
    .image-header img {
      width: 100%;
      max-height: 130px;
      object-fit: contain;
      display: block;
      margin-bottom: 16px;
    }
    .header-rule,
    .patient-rule,
    .footer-rule {
      width: 100%;
      height: 1.5px;
      background: #171725;
    }
    .patient-info {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      column-gap: 28px;
      row-gap: 6px;
      margin: 14px 0;
      font-size: ${patientFontSize}px;
      line-height: 1.35;
    }
    .patient-info-item:nth-child(odd) { grid-column: 1; }
    .patient-info-item:nth-child(even) { grid-column: 2; }
    .patient-info-label { font-weight: 700; }
    .patient-info-value { font-weight: 400; }
    .soap-content {
      margin-top: 28px;
      color: #000;
      font-family: ${pageFont};
      font-size: 16px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .soap-content h1 {
      font-size: 32px;
      line-height: 1.15;
      font-weight: 800;
      margin: 28px 0 16px;
      color: #000;
    }
    .soap-content h2 {
      font-size: 28px;
      line-height: 1.18;
      font-weight: 800;
      margin: 26px 0 14px;
      color: #000;
    }
    .soap-content p {
      margin: 10px 0 16px;
      font-size: 16px;
      line-height: 1.45;
      color: #000;
    }
    .soap-content ul,
    .soap-content ol {
      margin: 10px 0 20px;
      padding-left: 34px;
    }
    .soap-content li {
      margin: 8px 0;
      padding-left: 6px;
      font-size: 16px;
      line-height: 1.45;
    }
    .soap-content b,
    .soap-content strong { font-weight: 800; }
    .soap-content i,
    .soap-content em {
      font-style: italic;
      color: inherit;
    }
    .soap-content [style] {
      max-width: 100%;
    }
    .soap-print-signature {
      margin-top: 36px;
      text-align: right;
    }
    .soap-print-signature img {
      max-width: 150px;
      max-height: 90px;
      object-fit: contain;
    }
    .soap-print-footer {
      margin-top: 32px;
      font-size: 12px;
      line-height: 1.4;
      color: #171725;
    }
    .image-footer img {
      width: 100%;
      max-height: 90px;
      object-fit: contain;
      display: block;
    }
    .text-footer .footer-rule {
      margin-bottom: 8px;
    }
    @media screen {
      body { background: #f3f4f6; }
      .soap-print-page { box-shadow: 0 0 0 1px #ddd; }
    }
    @media print {
      body { background: #fff; }
      .soap-print-page {
        width: auto;
        min-height: auto;
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main class="soap-print-page">
    ${renderWatermark(printSettings)}
    ${renderHeader(printSettings)}
    ${renderPatientInfo({ printSettings, patient, profile, consultationDate, obsHistoryData })}
    <section class="soap-content">${safeSoapHtml}</section>
    ${renderSignature(printSettings)}
    ${renderFooter(printSettings)}
  </main>
</body>
</html>`;
}

function waitForImages(doc) {
  const images = Array.from(doc.images || []);
  if (!images.length) return Promise.resolve();
  return Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    }),
  );
}

export function printSoapHtmlDocument({
  soapHtml,
  printSettings,
  patient_data,
  profile,
  caseManagerData,
  consultationDate,
  obsHistoryData,
}) {
  if (!soapHtml || !printSettings) {
    throw new Error("SOAP print data is missing.");
  }

  const patient = {
    ...(caseManagerData?.patient_data || {}),
    ...(patient_data || {}),
  };
  const doctorProfile = caseManagerData?.doctor_data || profile || {};
  const html = buildSoapPrintHtml({
    soapHtml,
    printSettings,
    patient,
    profile: doctorProfile,
    consultationDate,
    obsHistoryData: obsHistoryData ?? caseManagerData?.obsHistoryData,
  });

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";

    const cleanup = () => {
      iframe.remove();
    };

    iframe.onload = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) throw new Error("SOAP print frame is unavailable.");
        await waitForImages(doc);
        if (doc.fonts?.ready) {
          await doc.fonts.ready.catch(() => {});
        }
        win.focus();
        win.print();
        setTimeout(() => {
          cleanup();
          resolve();
        }, 1500);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
}
