import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import ApiBulkMessages from "../../../api/services/ApiBulkMessages";
import { setReceptionistAttendingDoctor } from "../../../utils/receptionistRequestExtras";

const SelectedDoctorContext = createContext(null);

const SESSION_KEY = "tp.receptionist.selectedDoctorId";

function doctorsFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const umIds = params.get("um_id")?.split(",") || [];
    const umNames = params.get("um_name")?.split(",") || [];
    if (!umIds.length) return [];
    return umIds.map((id, index) => ({
      um_id: Number(id) || id,
      um_name: umNames[index] || `Doctor ${id}`,
    }));
  } catch {
    return [];
  }
}

export function SelectedDoctorProvider({ children }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorIdState] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let alive = true;
    const urlDoctors = doctorsFromUrl();
    if (urlDoctors.length) {
      if (alive) {
        setDoctors(urlDoctors);
        setLoading(false);
      }
      return () => {
        alive = false;
      };
    }
    ApiBulkMessages.listDoctor()
      .then((r) => {
        const list = Array.isArray(r) ? r : r?.data ?? [];
        if (alive && Array.isArray(list)) setDoctors(list.filter((d) => d?.um_id != null));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!doctors.length) return;
    const urlFirst = doctorsFromUrl()[0]?.um_id;
    const valid = (id) => doctors.some((d) => String(d.um_id) === String(id));
    let next = selectedDoctorId;
    if (!next || !valid(next)) {
      next = urlFirst != null ? String(urlFirst) : String(doctors[0].um_id);
    }
    if (String(next) !== String(selectedDoctorId)) {
      setSelectedDoctorIdState(String(next));
    }
  }, [doctors, selectedDoctorId]);

  useEffect(() => {
    if (selectedDoctorId) {
      setReceptionistAttendingDoctor(selectedDoctorId);
      try {
        sessionStorage.setItem(SESSION_KEY, String(selectedDoctorId));
      } catch {
        // ignore
      }
    }
  }, [selectedDoctorId]);

  const setSelectedDoctorId = (id) => {
    if (id == null) return;
    // Update attending-doctor extras immediately (not only in useEffect) so
    // the next list fetch already carries the newly selected um_id / doctor_id.
    setReceptionistAttendingDoctor(id);
    setSelectedDoctorIdState(String(id));
  };

  const selectedDoctor = useMemo(
    () => doctors.find((d) => String(d.um_id) === String(selectedDoctorId)) || null,
    [doctors, selectedDoctorId]
  );

  const value = useMemo(
    () => ({
      doctors,
      loading,
      selectedDoctorId,
      selectedDoctor,
      setSelectedDoctorId,
    }),
    [doctors, loading, selectedDoctorId, selectedDoctor]
  );

  return (
    <SelectedDoctorContext.Provider value={value}>{children}</SelectedDoctorContext.Provider>
  );
}

export function useSelectedDoctor() {
  const ctx = useContext(SelectedDoctorContext);
  if (!ctx) throw new Error("useSelectedDoctor must be used within SelectedDoctorProvider");
  return ctx;
}
