import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../../../api/services/axiosService";
import config from "../../../config";
import ApiReporting from "../../../api/services/ApiReporting";
import { getDecodedToken } from "../../../utils/localStorage";
import { toNum as num, pctDelta, safe, previousWindow } from "./deltaUtils";
import { cached } from "./apiCache";
import { getDoctorList } from "./doctorList";
import { seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";

const ZERO_KPIS = [
  { key: "billed", label: "Total billed", kind: "money", value: 0 },
  { key: "collected", label: "Total collected", kind: "money", value: 0 },
  { key: "due", label: "Total bill due", kind: "money", invert: true, value: 0 },
  { key: "refunded", label: "Total bill refunded", kind: "money", invert: true, value: 0 },
  { key: "advance", label: "Advance deposited", kind: "money", value: 0 },
  { key: "advRefunded", label: "Advance refunded", kind: "money", invert: true, value: 0 },
  { key: "advDebited", label: "Advance debited", kind: "money", value: 0 },
  { key: "avgBill", label: "Avg bill value", kind: "money", value: 0, approx: true },
];

export default function useBillingLive({
  startDate,
  endDate,
  department = "opd",
  doctorId,
  clinicId,
  // Overview only needs money KPIs — skip the ≤20 per-doctor fan-out and
  // collection-summary call used solely for Billing chart tiles.
  includeRevenueByDoctor = true,
  includeCollectionSummary = true,
  // IPD Billing uses the legacy-PHP hook instead. Keep this false there so
  // billing-live Mongo is never called while IPD is selected. OPD callers
  // leave this unset (true) — network calls stay identical.
  enabled = true,
} = {}) {
  const doctorList = useSelector((s) => s.bulkMessages?.doctorList) || [];
  const userId = useSelector((s) => s.doctors?.userId);
  const [state, setState] = useState({ loading: true, kpis: ZERO_KPIS, paymentModes: [], refundModes: [], advanceModes: [], advanceRefundModes: [], revenueByDoctor: null });

  const doctorKey = doctorList.map((d) => d.um_id).join(",");

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ loading: false, kpis: ZERO_KPIS, paymentModes: [], refundModes: [], advanceModes: [], advanceRefundModes: [], revenueByDoctor: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    let ids = doctorList.map((d) => d.um_id).filter(Boolean);
    // Cold open: Redux bulkMessages.doctorList is empty unless the user has
    // already visited Bulk Messages / Billing. FilterOptions already fetches
    // the same list for the dropdown — reuse getDoctorList() so KPI queries
    // don't early-return ₹0 before the roster is ready.
    const needsAllDoctors = !doctorId || doctorId === "all";
    if (needsAllDoctors && !ids.length) {
      const fetched = await getDoctorList();
      ids = (Array.isArray(fetched) ? fetched : [])
        .map((d) => d?.um_id)
        .filter(Boolean);
    }
    // JWT self id is always available after login; Redux doctors.userId is
    // only set on some pages (AppointmentList / BillingDashboard).
    const selfId = userId || getDecodedToken()?.result?.user_id;
    // doctorId may be a CSV of ids (multi-select filter) — the dashboard API
    // natively takes repeated doctorIds params.
    const doctorIds =
      doctorId && doctorId !== "all"
        ? String(doctorId).split(",").filter(Boolean)
        : ids.length
        ? ids
        : selfId
        ? [selfId]
        : [];
    if (!startDate || !endDate || !doctorIds.length) {
      setState({ loading: false, kpis: ZERO_KPIS, paymentModes: [], refundModes: [], advanceModes: [], advanceRefundModes: [], revenueByDoctor: null });
      return;
    }
    // Billing KPIs now come from the reporting service (Pm-Core), which reads the same v2
    // billing Mongo the old Pm-Patient-Docs dashboard APIs read — same contract, same numbers,
    // but no coupling to the billing service's API surface. clinicId params are accepted and
    // ignored on both the old and new APIs (scope always comes from the JWT).
    const base = { customBaseUrl: config.reporting_api_url };
    const qp = new URLSearchParams({
      startDate,
      endDate,
      department,
      page: "1",
      limit: "100",
      sortBy: "date",
      sortOrder: "desc",
    });
    doctorIds.forEach((id) => qp.append("doctorIds", String(id)));
    // True previous-period numbers: same query over the equal-length window
    // immediately before the selected range → real "vs previous period" pills.
    const prevWin = previousWindow(startDate, endDate);
    const prevQp = new URLSearchParams(qp);
    if (prevWin) {
      prevQp.set("startDate", prevWin.startDate);
      prevQp.set("endDate", prevWin.endDate);
    }
    // Per-mode collection/advance/refund splits — the reporting service's
    // collection summary returns paymentModes[{title, cashMemoTotal,
    // receiptTotal, advanceTotal, refundTotal}] (API-CONTRACTS-CURRENT §3A),
    // which backfills the mode donuts the dashboards don't split.
    const collParams = { startDate, endDate, type: department };
    if (clinicId && clinicId !== "all" && !String(clinicId).includes(",")) collParams.clinicId = clinicId;
    if (doctorId && doctorId !== "all" && !String(doctorId).includes(",")) collParams.doctorId = doctorId;
    const billUrl = `/api/v1/reports/financial/billing-live/bill-dashboard?${qp.toString()}`;
    const advUrl = `/api/v1/reports/financial/billing-live/advance-deposit-dashboard?${qp.toString()}`;
    const [bill, adv, prevBill, prevAdv, collSummary] = await Promise.all([
      safe(cached(`billing-live-${department}`, { q: qp.toString() }, () => api.get(billUrl, base))),
      safe(cached("billing-live-advDeposit", { q: qp.toString() }, () => api.get(advUrl, base))),
      prevWin ? safe(cached(`billing-live-${department}-prev`, { q: prevQp.toString() }, () => api.get(`/api/v1/reports/financial/billing-live/bill-dashboard?${prevQp.toString()}`, base))) : Promise.resolve(null),
      prevWin ? safe(cached("billing-live-advDeposit-prev", { q: prevQp.toString() }, () => api.get(`/api/v1/reports/financial/billing-live/advance-deposit-dashboard?${prevQp.toString()}`, base))) : Promise.resolve(null),
      includeCollectionSummary
        ? safe(cached("collSummary", collParams, () => ApiReporting.financialCollectionSummary(collParams)))
        : Promise.resolve(null),
    ]);

    const s = bill?.summary ?? bill?.data?.summary ?? bill ?? {};
    const advS = adv?.summary ?? adv?.data?.summary ?? adv ?? {};
    const prevFetched = prevBill?.summary ?? prevBill?.data?.summary ?? null;
    const prevAdvFetched = prevAdv?.summary ?? prevAdv?.data?.summary ?? null;
    const billed = num(s.totalBillAmount);
    const count = num(s.count) || num(s.billCount);

    // Previous-period data — fetched from the real previous window
    const prev = prevFetched ?? s.previous ?? s.lastPeriod ?? {};
    const prevAdvS = prevAdvFetched ?? advS.previous ?? advS.lastPeriod ?? {};
    const hasPrev = prev && num(prev.totalBillAmount) > 0;
    const hasAdvPrev = prevAdvS && num(prevAdvS.totalAdvanceReceived) > 0;
    const collected = num(s.totalPaidAmount);
    const due = num(s.dueAmount);
    const refunded = num(s.refundedAmount);
    const advReceived = num(advS.totalAdvanceReceived);
    const advRefundedVal = num(advS.totalAdvanceRefunded);
    const advDebited = num(advS.totalAdvanceDebited);

    setState({
      loading: false,
      kpis: [
        { key: "billed", label: "Total billed", kind: "money", value: billed, ...(hasPrev ? { delta: pctDelta(billed, num(prev.totalBillAmount)) } : {}) },
        { key: "collected", label: "Total collected", kind: "money", value: collected, ...(hasPrev ? { delta: pctDelta(collected, num(prev.totalPaidAmount)) } : {}) },
        { key: "due", label: "Total bill due", kind: "money", invert: true, value: due, ...(hasPrev ? { delta: pctDelta(due, num(prev.dueAmount)) } : {}) },
        { key: "refunded", label: "Total bill refunded", kind: "money", invert: true, value: refunded, ...(hasPrev ? { delta: pctDelta(refunded, num(prev.refundedAmount)) } : {}) },
        { key: "advance", label: "Advance deposited", kind: "money", value: advReceived, ...(hasAdvPrev ? { delta: pctDelta(advReceived, num(prevAdvS.totalAdvanceReceived)) } : {}) },
        { key: "advRefunded", label: "Advance refunded", kind: "money", invert: true, value: advRefundedVal, ...(hasAdvPrev ? { delta: pctDelta(advRefundedVal, num(prevAdvS.totalAdvanceRefunded)) } : {}) },
        { key: "advDebited", label: "Advance debited", kind: "money", value: advDebited, ...(hasAdvPrev ? { delta: pctDelta(advDebited, num(prevAdvS.totalAdvanceDebited)) } : {}) },
        { key: "avgBill", label: "Avg bill value", kind: "money", value: count ? Math.round(billed / count) : 0, approx: true, ...(hasPrev ? { delta: pctDelta(count ? billed / count : 0, num(prev.count) || num(prev.billCount) ? num(prev.totalBillAmount) / (num(prev.count) || num(prev.billCount)) : 0) } : {}) },
      ],
      paymentModes: firstNonEmpty(
        paymentModeDonut(s.paymentModeSummary || s.paymentModes, "receivedAmount"),
        reportingModeDonut(collSummary, (m) => num(m.cashMemoTotal) + num(m.receiptTotal))
      ),
      refundModes: firstNonEmpty(
        paymentModeDonut(s.refundPaymentModeSummary || s.refundPaymentModes, "refundedAmount"),
        // The bill dashboard's paymentModeSummary carries refundedAmount per
        // mode — the dedicated refund summary field never ships, so this is
        // the real source (works for any window).
        paymentModeDonut(s.paymentModeSummary || s.paymentModes, "refundedAmount"),
        reportingModeDonut(collSummary, (m) => num(m.refundTotal))
      ),
      advanceModes: firstNonEmpty(
        paymentModeDonut(advS.paymentModeSummary || advS.paymentModes, "receivedAmount"),
        reportingModeDonut(collSummary, (m) => num(m.advanceTotal))
      ),
      advanceRefundModes: paymentModeDonut(
        advS.refundPaymentModeSummary || advS.refundPaymentModes,
        "refundedAmount"
      ),
      revenueByDoctor: null,
    });

    if (includeRevenueByDoctor && (!doctorId || doctorId === "all")) {
      const revByDoc = await buildRevenueByDoctor(startDate, endDate, department);
      if (revByDoc) setState((prev) => ({ ...prev, revenueByDoctor: revByDoc }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, startDate, endDate, department, doctorKey, userId, doctorId, clinicId, includeRevenueByDoctor, includeCollectionSummary]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function firstNonEmpty(...lists) {
  return lists.find((l) => Array.isArray(l) && l.length) || [];
}

// financial/collection/summary → paymentModes[{title, ...totals}] donut
function reportingModeDonut(payload, valueOf) {
  const modes = (payload?.data ?? payload)?.paymentModes;
  if (!Array.isArray(modes)) return [];
  return modes
    .map((m) => ({ label: m.title || "Other", value: valueOf(m) }))
    .filter((d) => d.value > 0);
}

function paymentModeDonut(modes, preferKey) {
  if (!Array.isArray(modes)) return [];
  return modes
    .map((m) => ({
      label: m.paymentMode || m.mode || m.title || "Other",
      value: num(preferKey && m[preferKey] != null ? m[preferKey] : (m.receivedAmount ?? m.amount ?? m.total ?? m.paidAmount)),
    }))
    .filter((d) => d.value > 0);
}

const FANOUT_CAP = 20;

// One grouped reporting-service call replaces the old ≤20-per-doctor dashboard fan-out. The
// endpoint applies the exact per-doctor dashboard semantics server-side, so each row carries the
// same billed/collected the individual calls returned (clinicId was ignored by those calls too —
// scope is token-driven).
async function buildRevenueByDoctor(startDate, endDate, department) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  const base = { customBaseUrl: config.reporting_api_url };
  const qp = new URLSearchParams({ startDate, endDate, department });
  doctors.forEach((d) => qp.append("doctorIds", String(d.um_id)));
  const res = await cached(
    "billing-live-rev-by-doctor",
    { startDate, endDate, department, ids: doctors.map((d) => d.um_id).join(",") },
    () => api.get(`/api/v1/reports/financial/billing-live/revenue-by-doctor?${qp.toString()}`, base)
  ).catch(() => null);
  if (!res) return null;
  const byId = new Map((res.doctors || res.data?.doctors || []).map((r) => [String(r.doctorId), r]));

  const rows = doctors
    .map((d) => {
      const r = byId.get(String(d.um_id));
      return { name: d.um_name || `Doctor ${d.um_id}`, billed: num(r?.billed), collected: num(r?.collected) };
    })
    .sort((a, b) => b.billed - a.billed);

  if (rows.every((r) => r.billed === 0 && r.collected === 0)) return null;

  const stacked = {
    labels: rows.map((r) => r.name),
    datasets: [
      { label: "Billed", data: rows.map((r) => r.billed) },
      { label: "Collected", data: rows.map((r) => r.collected) },
    ],
  };
  return compactXY(seriesToXY(stacked), compactDoctorLabel);
}

