import { getPlanSurfaceLabel } from "../plan-types";

export function formatPdfINR(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function mapAppointmentPatientToBillPatient(patient) {
  if (!patient) return {};
  return {
    pm_fullname: patient.name,
    pm_pid: patient.patientCode,
    pm_gender: patient.genderLabel,
    pm_contact_no: String(patient.mobile || "").replace(/^\+91-?/, ""),
    ageYears: patient.age,
    pm_salutation: "",
    bloodGroup: patient.bloodGroup,
  };
}

function normalizeDiscountType(service = {}) {
  const raw = service.discountType || service.discount_type || "flat";
  return raw === "percentage" || raw === "percent" ? "percentage" : "flat";
}

export function computeServiceDiscountAmount(service = {}) {
  const rate = Number(service.rate) || 0;
  const discount = Number(service.discount) || 0;
  const discountType = normalizeDiscountType(service);
  if (!discount) return 0;
  if (discountType === "percentage") {
    return Math.min(rate, (rate * discount) / 100);
  }
  return Math.min(rate, discount);
}

export function computeServiceAmount(service = {}) {
  if (Number.isFinite(Number(service.amount))) {
    return Number(service.amount);
  }
  const rate = Number(service.rate) || 0;
  return Math.max(0, rate - computeServiceDiscountAmount(service));
}

export function formatDiscountDisplay(service = {}) {
  const discount = Number(service.discount) || 0;
  if (!discount) return "—";
  const discountType = normalizeDiscountType(service);
  if (discountType === "percentage") {
    return `${discount}%`;
  }
  return formatPdfINR(discount);
}

export function formatTeethLine(teeth = []) {
  if (!teeth?.length || teeth.includes("full-mouth")) return "Full mouth";
  if (teeth.includes("maxillary")) return "Maxillary";
  if (teeth.includes("mandibular")) return "Mandibular";
  return teeth.map((t) => `T${t}`).join(", ");
}

export function formatSurfacesLine(surfaces = []) {
  if (!surfaces?.length) return "";
  return surfaces.map((s) => getPlanSurfaceLabel(s)).join(", ");
}

export function serviceToBillRow(service, index) {
  return {
    index: index + 1,
    description: service.treatment || "",
    toothLine: formatTeethLine(service.teeth),
    surfaceLine: formatSurfacesLine(service.surfaces),
    rate: Number(service.rate) || 0,
    discountDisplay: formatDiscountDisplay(service),
    amount: computeServiceAmount(service),
    hasDiscount: Boolean(Number(service.discount)),
  };
}

export function buildPlanEstimateSection(plan, services) {
  const rows = services.map((svc, i) => serviceToBillRow(svc, i));
  const subtotal = rows.reduce((sum, r) => sum + r.rate, 0);
  const serviceDiscountTotal = services.reduce(
    (sum, svc) => sum + computeServiceDiscountAmount(svc),
    0
  );
  const afterServiceDiscount = rows.reduce((sum, r) => sum + r.amount, 0);
  const additionalDiscount = Number(plan?.additionalDiscount) || 0;
  const total = Math.max(0, afterServiceDiscount - additionalDiscount);

  return {
    planId: plan?.id,
    planName: plan?.name || "",
    rows,
    subtotal,
    serviceDiscountTotal,
    additionalDiscount,
    total,
  };
}

export function buildSingleEstimatePayload({ plan, services, includePlanDiscount = true }) {
  const section = buildPlanEstimateSection(plan, services);
  return {
    sections: [section],
    grandTotal: includePlanDiscount
      ? section.total
      : section.rows.reduce((sum, r) => sum + r.amount, 0),
    showGrandTotalLabel: false,
  };
}

export function buildCombinedEstimatePayload(plans = []) {
  const sections = plans.map((plan) =>
    buildPlanEstimateSection(plan, plan.services || [])
  );
  const grandTotal = sections.reduce((sum, s) => sum + s.total, 0);
  return {
    sections,
    grandTotal,
    showGrandTotalLabel: true,
  };
}

function parseSittingSortKey(sitting = {}) {
  const date = sitting.visitDate || sitting.date || "";
  const time = sitting.visitTime || sitting.time || "00:00:00";
  const raw = `${date}T${time}`;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
}

export function sortSittingsChronologically(sittings = []) {
  return [...sittings].sort(
    (a, b) => parseSittingSortKey(a) - parseSittingSortKey(b)
  );
}

export function buildTreatmentDetailsLine(service = {}) {
  const parts = [service.treatment || ""];
  const teeth = formatTeethLine(service.teeth);
  const surfaces = formatSurfacesLine(service.surfaces);
  if (teeth) parts.push(teeth);
  if (surfaces) parts.push(surfaces);
  return parts.filter(Boolean).join(" | ");
}

export function formatSittingDateTime(sitting = {}) {
  if (sitting.date) return sitting.date;
  const visitDate = sitting.visitDate;
  const visitTime = sitting.visitTime;
  if (!visitDate) return "—";
  if (!visitTime) return String(visitDate);
  const [y, m, d] = String(visitDate).split("-").map((n) => Number(n));
  const timeParts = String(visitTime).split(":");
  const hh = Number(timeParts[0]);
  const mm = Number(timeParts[1]);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  if (!Number.isFinite(dt.getTime())) return String(visitDate);
  const datePart = dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = dt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

export function buildConsolidatedRxPayload(service = {}) {
  const sittings = sortSittingsChronologically(service.sittings || []);
  return {
    treatmentLine: buildTreatmentDetailsLine(service),
    visits: sittings.map((sit, i) => ({
      label: `Visit ${i + 1}`,
      doctor: sit.doctor || sit.doctorName || "—",
      dateTime: formatSittingDateTime(sit),
      notes: String(sit.notes || "").trim() || "—",
    })),
  };
}

export function buildSingleVisitRxPayload(service = {}, sitting = {}) {
  return {
    treatmentLine: buildTreatmentDetailsLine(service),
    visit: {
      doctor: sitting.doctor || sitting.doctorName || "—",
      dateTime: formatSittingDateTime(sitting),
      notes: String(sitting.notes || "").trim() || "—",
    },
  };
}

export function resolveDentalPlanPdfVariant(drawer = {}) {
  if (drawer.type === "rx-preview") {
    return drawer.sittingId ? "rx-visit" : "rx-consolidated";
  }
  if (drawer.type === "bill-preview") {
    if (drawer.mode === "combined") return "estimate-combined";
    if (drawer.serviceId) return "estimate-service";
    return "estimate-plan";
  }
  return null;
}

export function getPdfDrawerTitle(variant) {
  switch (variant) {
    case "estimate-combined":
      return "Combined Estimates";
    case "estimate-plan":
      return "Estimate Preview";
    case "estimate-service":
      return "Estimate Preview";
    case "rx-consolidated":
      return "Consolidated Rx";
    case "rx-visit":
      return "Visit Rx";
    default:
      return "Preview";
  }
}

export function getPdfDownloadFilename(variant, plan, service) {
  const slug = (s) =>
    String(s || "document")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  switch (variant) {
    case "estimate-combined":
      return "combined-estimates.pdf";
    case "estimate-plan":
      return `estimate-${slug(plan?.name)}.pdf`;
    case "estimate-service":
      return `estimate-${slug(service?.treatment)}.pdf`;
    case "rx-consolidated":
      return `consolidated-rx-${slug(service?.treatment)}.pdf`;
    case "rx-visit":
      return `visit-rx-${slug(service?.treatment)}.pdf`;
    default:
      return "dental-plan.pdf";
  }
}
