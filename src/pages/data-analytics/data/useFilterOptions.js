import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import ApiBulkMessages from "../../../api/services/ApiBulkMessages";

// Filter dropdown data — REAL doctor and clinic lists.
//
// Doctors: Redux `bulkMessages.doctorList` is only populated when the user
// has visited the Bulk Messages page, so on a cold landing the dropdown was
// empty ("filters don't work"). Fall back to the same live endpoint that
// page uses: GET /api/v1/doctor (communication service).
//
// Clinics: the login profile's `hospital_data` lives on the DOCTORS slice
// (`state.doctors.profile`) — the same source the app header's clinic
// switcher uses (src/common/Header.js). The old `state.profile.profile`
// path never existed, which is why the clinic dropdown was empty.

export default function useFilterOptions() {
  const reduxDoctors = useSelector((s) => s.bulkMessages?.doctorList) || [];
  const hospitalData =
    useSelector((s) => s.doctors?.profile?.hospital_data || s.profile?.profile?.hospital_data) || [];
  const [fetchedDoctors, setFetchedDoctors] = useState([]);

  const needFetch = reduxDoctors.length === 0;
  useEffect(() => {
    if (!needFetch) return;
    let alive = true;
    ApiBulkMessages.listDoctor()
      .then((r) => {
        const list = Array.isArray(r) ? r : r?.data ?? [];
        if (alive && Array.isArray(list)) setFetchedDoctors(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [needFetch]);

  const doctorOptions = useMemo(() => {
    const src = reduxDoctors.length ? reduxDoctors : fetchedDoctors;
    return src
      .filter((d) => d?.um_id != null)
      .map((d) => ({ value: String(d.um_id), label: d.um_name || `Doctor ${d.um_id}` }));
  }, [reduxDoctors, fetchedDoctors]);

  const clinicOptions = useMemo(
    () =>
      hospitalData
        .filter((h) => h?.hm_id != null)
        .map((h) => ({ value: String(h.hm_id), label: h.hm_name || `Clinic ${h.hm_id}` })),
    [hospitalData]
  );

  return { doctorOptions, clinicOptions };
}
