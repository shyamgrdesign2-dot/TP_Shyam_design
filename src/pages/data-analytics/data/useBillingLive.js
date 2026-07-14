import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../../../api/services/axiosService";
import config from "../../../config";
import ApiReporting from "../../../api/services/ApiReporting";
import { previousWindow } from "./deltaUtils";

const ZERO_KPIS = [
  { key: "billed", label: "Total billed", kind: "money", value: 0 },
  { key: "collected", label: "Total collected", kind: "money", value: 0 },
  { key: "due", label: "Total bill due", kind: "money", invert: true, value: 0 },
  { key: "refunded", label: "Total bill refunded", kind: "money", invert: true, value: 0 },
  { key: "advance", label: "Advance received", kind: "money", value: 0 },
  { key: "advRefunded", label: "Advance refunded", kind: "money", invert: true, value: 0 },
  { key: "advDebited", label: "Advance debited", kind: "money", value: 0 },
  { key: "avgBill", label: "Avg bill value", kind: "money", value: 0, approx: true },
];

export default function useBillingLive({ startDate, endDate, department = "opd", doctorId, clinicId } = {}) {
  const doctorList = useSelector((s) => s.bulkMessages?.doctorList) || [];
  const userId = useSelector((s) => s.doctors?.userId);
  const [state, setState] = useState({ loading: true, kpis: ZERO_KPIS, paymentModes: [], refundModes: [], advanceModes: [], advanceRefundModes: [] });

  const doctorKey = doctorList.map((d) => d.um_id).join(",");

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const ids = doctorList.map((d) => d.um_id).filter(Boolean);
    // doctorId may be a CSV of ids (multi-select filter) — the dashboard API
    // natively takes repeated doctorIds params.
    const doctorIds =
      doctorId && doctorId !== "all"
        ? String(doctorId).split(",").filter(Boolean)
        : ids.length
        ? ids
        : userId
        ? [userId]
        : [];
    if (!startDate || !endDate || !doctorIds.length) {
      setState({ loading: false, kpis: ZERO_KPIS, paymentModes: [], refundModes: [], advanceModes: [], advanceRefundModes: [] });
      return;
    }
    const base = { customBaseUrl: config.lab_params_api_url };
    const qp = new URLSearchParams({
      startDate,
      endDate,
      page: "1",
      limit: "100",
      sortBy: "date",
      sortOrder: "desc",
    });
    doctorIds.forEach((id) => qp.append("doctorIds", String(id)));
    if (clinicId && clinicId !== "all") {
      String(clinicId).split(",").filter(Boolean).forEach((id) => qp.append("clinicId", id));
    }
    const billPath = department === "ipd" ? "ipd-bill" : "bill";
    const safe = (p) => p.then((r) => r).catch(() => null);
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
    const [bill, adv, prevBill, prevAdv, collSummary] = await Promise.all([
      safe(api.get(`/api/v1/billing/${billPath}/dashboard?${qp.toString()}`, base)),
      safe(api.get(`/api/v1/billing/advancedDeposit/dashboard?${qp.toString()}`, base)),
      prevWin ? safe(api.get(`/api/v1/billing/${billPath}/dashboard?${prevQp.toString()}`, base)) : Promise.resolve(null),
      prevWin ? safe(api.get(`/api/v1/billing/advancedDeposit/dashboard?${prevQp.toString()}`, base)) : Promise.resolve(null),
      safe(ApiReporting.financialCollectionSummary(collParams)),
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
        { key: "advance", label: "Advance received", kind: "money", value: advReceived, ...(hasAdvPrev ? { delta: pctDelta(advReceived, num(prevAdvS.totalAdvanceReceived)) } : {}) },
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, department, doctorKey, userId, doctorId, clinicId]);

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

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pctDelta(current, previous) {
  // No pill without a real baseline: previous 0/absent produces absurd
  // percentages (e.g. +1944836% when last week had ₹1) — "vs previous"
  // is only meaningful when the previous window actually had volume.
  if (!Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}
