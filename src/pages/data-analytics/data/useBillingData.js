import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { sumField } from "../charts/adapters";

// OPD Billing — Tab-2 #8 /analytics/opd-billing (v2). Returns detailed points
// AND ready-made collectionChart/revenueChart; we prefer the ready-made charts
// and derive KPI totals from the detail arrays. Query uses `days`.
export default function useBillingData({ days, department = "opd", doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(null),
    collectionChart: null,
    revenueChart: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (days) params.days = days;
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const fetcher =
      department === "ipd"
        ? ApiReporting.analyticsIpdBilling
        : ApiReporting.analyticsOpdBilling;

    const payload = await fetcher(params)
      .then((r) => r)
      .catch(() => null);
    const src = payload?.data ?? payload;

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src),
      collectionChart: src?.collectionChart || null,
      revenueChart: src?.revenueChart || null,
    });
  }, [days, department, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(src) {
  const collection = src?.collection || [];
  const revenue = src?.revenue || [];
  return [
    { key: "collection", label: "Total collected", kind: "money", value: sumField(collection, "collection") },
    { key: "revenue", label: "Total revenue", kind: "money", value: sumField(revenue, "revenue") },
    { key: "refund", label: "Total refund", kind: "money", value: sumField(collection, "refund") },
    { key: "creditNotes", label: "Credit notes", kind: "money", value: sumField(revenue, "creditNotes") },
  ];
}
