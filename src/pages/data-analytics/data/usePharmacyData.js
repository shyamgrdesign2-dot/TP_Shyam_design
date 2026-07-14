import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";

// Pharmacy / Rx — #5 clinicRx({month}). Returns ready-made chart-series for
// top brands, company share and top salts; consumed verbatim by the section.
export default function usePharmacyData({ month } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    topBrands: null,
    companyShare: null,
    topSalts: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (month) params.month = month;

    const payload = await ApiReporting.clinicRx(params)
      .then((r) => r)
      .catch(() => null);
    const src = payload?.data ?? payload;

    setState({
      loading: false,
      error: null,
      topBrands: src?.topBrands || null,
      companyShare: src?.companyShare || null,
      topSalts: src?.topSalts || null,
    });
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
