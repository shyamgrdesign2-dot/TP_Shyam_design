import ApiChat from "../../api/services/ApiChat";
import { setPatientNames, setPatientDemo } from "../../redux/chatSlice";

const inFlight = new Set();

export function loadPatientNames(dispatch, patientUniqueIds, cachedNames) {
  const ids = [...new Set(patientUniqueIds.filter(Boolean))].filter(
    (id) => !cachedNames?.[id] && !inFlight.has(id)
  );
  if (!ids.length) return Promise.resolve();

  ids.forEach((id) => inFlight.add(id));
  return ApiChat.getPatientNames(ids)
    .then((res) => {
      const patients = res?.patients || [];
      const nameUpdates = patients.map((p) => ({
        patientUniqueId: p.patient_unique_id,
        name: p.first_name,
      }));
      if (nameUpdates.length) dispatch(setPatientNames(nameUpdates));

      const demoUpdates = patients
        .map((p) => {
          const demo = {};
          if (p.gender) demo.gender = p.gender;
          if (p.age != null) demo.age = String(p.age);
          if (p.ward) demo.ward = p.ward;
          if (p.bed_number || p.bedNumber) demo.bedNumber = p.bed_number || p.bedNumber;
          if (p.mrno || p.uhid) demo.mrno = p.mrno || p.uhid;
          return Object.keys(demo).length ? { patientUniqueId: p.patient_unique_id, demo } : null;
        })
        .filter(Boolean);
      if (demoUpdates.length) dispatch(setPatientDemo(demoUpdates));
    })
    .catch(() => {})
    .finally(() => ids.forEach((id) => inFlight.delete(id)));
}
