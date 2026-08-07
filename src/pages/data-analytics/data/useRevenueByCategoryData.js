import { useCallback, useEffect, useState } from "react";

// Reference example data for demo/client presentations.
// Replaced by live API responses when backend deploys B1 endpoint
// (see docs/BACKEND-CONTRACTS-PENDING.md §B1).
const EXAMPLE_REVENUE_BY_TYPE = [
  { x: "Consultation", revenue: 245000 },
  { x: "Procedure", revenue: 128000 },
  { x: "Pharmacy", revenue: 96000 },
  { x: "Lab / Diagnostics", revenue: 73000 },
  { x: "Other", revenue: 18000 },
];

const EXAMPLE_BY_DOCTOR = [
  { x: "Dr Sheela BR", Consultation: 85000, Procedure: 42000, Pharmacy: 12000, "Lab / Diag.": 18000 },
  { x: "Dr Ashish M", Consultation: 72000, Procedure: 35000, Pharmacy: 28000, "Lab / Diag.": 22000 },
  { x: "Dr Priya S", Consultation: 58000, Procedure: 30000, Pharmacy: 15000, "Lab / Diag.": 10000 },
  { x: "Dr Rajan K", Consultation: 30000, Procedure: 21000, Pharmacy: 41000, "Lab / Diag.": 23000 },
];

const DOCTOR_SERIES = [
  { key: "Consultation", label: "Consultation" },
  { key: "Procedure", label: "Procedure" },
  { key: "Pharmacy", label: "Pharmacy" },
  { key: "Lab / Diag.", label: "Lab / Diag." },
];

const EXAMPLE_TOP_ITEMS = {
  all: [
    { label: "Consultation Fee", value: 1240 },
    { label: "Blood Test (CBC)", value: 890 },
    { label: "X-Ray", value: 420 },
    { label: "ECG", value: 380 },
    { label: "Paracetamol 500mg", value: 350 },
  ],
  consultation: [
    { label: "Follow-up Visit", value: 580 },
    { label: "New Patient Consult", value: 340 },
    { label: "Video Consult", value: 180 },
    { label: "Second Opinion", value: 95 },
    { label: "Emergency Consult", value: 45 },
  ],
  procedure: [
    { label: "Minor Surgery", value: 120 },
    { label: "Wound Dressing", value: 95 },
    { label: "Injection (IM/IV)", value: 88 },
    { label: "Biopsy", value: 42 },
    { label: "Incision & Drainage", value: 35 },
  ],
  pharmacy: [
    { label: "Paracetamol 500mg", value: 350 },
    { label: "Amoxicillin 500mg", value: 280 },
    { label: "Omeprazole 20mg", value: 195 },
    { label: "Vitamin D3", value: 150 },
    { label: "Cetirizine 10mg", value: 120 },
  ],
  lab: [
    { label: "Blood Test (CBC)", value: 420 },
    { label: "X-Ray", value: 190 },
    { label: "ECG", value: 148 },
    { label: "Ultrasound", value: 85 },
    { label: "Urine Analysis", value: 65 },
  ],
  other: [
    { label: "Nursing Care", value: 65 },
    { label: "Dressing Material", value: 42 },
    { label: "Medical Certificate", value: 38 },
    { label: "Supplies", value: 25 },
    { label: "Misc Charges", value: 18 },
  ],
};

export default function useRevenueByCategoryData({ startDate, endDate, doctorId, clinicId, category = "all" } = {}) {
  const [state, setState] = useState({
    loading: true,
    isExample: true,
    revenueByType: null,
    usageByDoctor: null,
    topItems: [],
    topCategory: null,
    highestItem: null,
    totalRevenue: 0,
  });

  const load = useCallback(async () => {
    if (!startDate || !endDate) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    // TODO: Wire to real API when B1 endpoint ships:
    // const params = { startDate, endDate };
    // if (clinicId && clinicId !== "all") params.clinicId = clinicId;
    // if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    // if (category !== "all") params.category = category;
    // const [byType, byDoctor, topItems] = await Promise.all([
    //   ApiReporting.billingRevenueByCategory(params),
    //   ApiReporting.billingRevenueByCategoryDoctor(params),
    //   ApiReporting.billingTopItems(params),
    // ]);

    const typeData = EXAMPLE_REVENUE_BY_TYPE;
    const totalRev = typeData.reduce((s, d) => s + d.revenue, 0);
    const topCat = typeData.reduce((a, b) => (b.revenue > a.revenue ? b : a), typeData[0]);
    const items = EXAMPLE_TOP_ITEMS[category] || EXAMPLE_TOP_ITEMS.all;

    setState({
      loading: false,
      isExample: true,
      revenueByType: { data: typeData, series: [{ key: "revenue", label: "Revenue (₹)" }] },
      usageByDoctor: { data: EXAMPLE_BY_DOCTOR, series: DOCTOR_SERIES },
      topItems: items,
      topCategory: topCat?.x || null,
      highestItem: items[0]?.label || null,
      totalRevenue: totalRev,
    });
  }, [startDate, endDate, doctorId, clinicId, category]);

  useEffect(() => { load(); }, [load]);

  return state;
}
