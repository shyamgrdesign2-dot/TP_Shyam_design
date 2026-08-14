import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { toNum as num, safe } from "./deltaUtils";
import { cached } from "./apiCache";
import { snapAnalyticsDays } from "../filters/periods";
import { seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";

const EMPTY = {
  loading: false,
  kpis: [],
  paymentModes: [],
  refundModes: [],
  advanceModes: [],
  advanceRefundModes: [],
  revenueByDoctor: null,
};

const ZERO_KPIS = [
  { key: "billed", label: "Total billed", kind: "money", value: 0 },
  { key: "collected", label: "Total collected", kind: "money", value: 0 },
  { key: "outstanding", label: "Outstanding", kind: "money", invert: true, value: 0 },
  { key: "refunded", label: "Total bill refunded", kind: "money", invert: true, value: 0 },
  { key: "creditNotes", label: "Credit notes", kind: "money", invert: true, value: 0 },
  { key: "advance", label: "Advance deposited", kind: "money", value: 0 },
];

// IPD Billing — legacy PHP-backed Pm-Core endpoints only.
// Do not call billing-live/* from this hook (Mongo ipdBill is not the source of truth).
export default function useIpdBilling({
  startDate,
  endDate,
  doctorId,
  clinicId,
  enabled = true,
} = {}) {
  const [state, setState] = useState({ ...EMPTY, loading: true, kpis: ZERO_KPIS });

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ ...EMPTY, kpis: ZERO_KPIS });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    if (!startDate || !endDate) {
      setState({ ...EMPTY, kpis: ZERO_KPIS });
      return;
    }

    const days = snapAnalyticsDays(startDate, endDate);
    const ipdParams = { days, counter: "all" };
    const collParams = { startDate, endDate, type: "ipd" };
    if (clinicId && clinicId !== "all" && !String(clinicId).includes(",")) {
      ipdParams.clinicId = clinicId;
      collParams.clinicId = clinicId;
    }
    if (doctorId && doctorId !== "all" && !String(doctorId).includes(",")) {
      collParams.doctorId = doctorId;
    }

    const doctorParams = { ...ipdParams, department: "ipd" };
    const [ipdBilling, collSummary, byDoctor] = await Promise.all([
      safe(cached("ipd-billing-legacy", ipdParams, () => ApiReporting.analyticsIpdBilling(ipdParams))),
      safe(cached("collSummary", collParams, () => ApiReporting.financialCollectionSummary(collParams))),
      safe(cached("ipd-billing-by-doctor", doctorParams, () => ApiReporting.analyticsBillingByDoctor(doctorParams))),
    ]);

    const src = unwrap(ipdBilling);
    const totals = totalsFromIpdBilling(src);
    const advance = sumAdvance(collSummary);
    const outstanding = Math.max(0, totals.billed - totals.collected);

    setState({
      loading: false,
      kpis: [
        { key: "billed", label: "Total billed", kind: "money", value: totals.billed },
        { key: "collected", label: "Total collected", kind: "money", value: totals.collected },
        { key: "outstanding", label: "Outstanding", kind: "money", invert: true, value: outstanding },
        { key: "refunded", label: "Total bill refunded", kind: "money", invert: true, value: totals.refunded },
        { key: "creditNotes", label: "Credit notes", kind: "money", invert: true, value: totals.creditNotes },
        { key: "advance", label: "Advance deposited", kind: "money", value: advance },
      ],
      paymentModes: reportingModeDonut(collSummary, (m) => num(m.cashMemoTotal) + num(m.receiptTotal)),
      refundModes: reportingModeDonut(collSummary, (m) => num(m.refundTotal)),
      advanceModes: reportingModeDonut(collSummary, (m) => num(m.advanceTotal)),
      advanceRefundModes: [],
      revenueByDoctor: revenueByDoctorFromLegacy(byDoctor),
    });
  }, [enabled, startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function unwrap(payload) {
  return payload?.data ?? payload ?? {};
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.points)) return value.points;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function sumField(rows, keys) {
  return asList(rows).reduce((acc, row) => {
    for (const key of keys) {
      if (row?.[key] != null) return acc + num(row[key]);
    }
    return acc;
  }, 0);
}

function sumChart(chart, labelIncludes) {
  const datasets = chart?.datasets || [];
  return datasets
    .filter((d) => !labelIncludes || String(d.label || "").toLowerCase().includes(labelIncludes))
    .reduce((acc, d) => acc + (d.data || []).reduce((s, v) => s + num(v), 0), 0);
}

function totalsFromIpdBilling(src) {
  const collection = asList(src.collection || src.collections);
  const revenue = asList(src.revenue || src.revenues);
  const billed =
    num(src.billed ?? src.totalBilled ?? src.totalRevenue) ||
    sumField(revenue, ["revenue", "billed", "amount"]) ||
    sumChart(src.revenueChart, "revenue");
  const collected =
    num(src.collected ?? src.totalCollected ?? src.totalCollection) ||
    sumField(collection, ["collection", "collected", "amount"]) ||
    sumChart(src.collectionChart, "collection") ||
    sumChart(src.collectionChart, "collected");
  const refunded =
    num(src.refunded ?? src.totalRefund ?? src.totalRefunded) ||
    sumField(collection, ["refund", "refunded"]) ||
    sumChart(src.collectionChart, "refund");
  const creditNotes =
    num(src.creditNotes ?? src.totalCreditNotes ?? src.credit_notes) ||
    sumField(revenue, ["creditNotes", "creditNote", "credit_notes"]) ||
    sumChart(src.revenueChart, "credit");
  return { billed, collected, refunded, creditNotes };
}

function reportingModeDonut(payload, valueOf) {
  const modes = unwrap(payload)?.paymentModes;
  if (!Array.isArray(modes)) return [];
  return modes
    .map((m) => ({ label: m.title || m.paymentMode || m.mode || "Other", value: valueOf(m) }))
    .filter((d) => d.value > 0);
}

function sumAdvance(payload) {
  return reportingModeDonut(payload, (m) => num(m.advanceTotal)).reduce((s, d) => s + d.value, 0);
}

function revenueByDoctorFromLegacy(payload) {
  const src = unwrap(payload);
  if (src.byDoctorChart?.labels?.length) {
    const xy = compactXY(seriesToXY(src.byDoctorChart), compactDoctorLabel);
    if (xy?.data?.length) return xy;
  }
  const doctors = asList(src.doctors);
  const rows = doctors
    .map((d) => ({
      name: d.name || d.doctorName || d.um_name || `Doctor ${d.doctorId ?? d.id ?? ""}`.trim(),
      billed: num(d.totalBilled ?? d.billed),
      collected: num(d.totalCollected ?? d.collected),
    }))
    .sort((a, b) => b.billed - a.billed);
  if (!rows.length || rows.every((r) => r.billed === 0 && r.collected === 0)) return null;
  return compactXY(
    seriesToXY({
      labels: rows.map((r) => r.name),
      datasets: [
        { label: "Billed", data: rows.map((r) => r.billed) },
        { label: "Collected", data: rows.map((r) => r.collected) },
      ],
    }),
    compactDoctorLabel
  );
}
