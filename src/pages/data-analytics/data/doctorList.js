import ApiBulkMessages from "../../../api/services/ApiBulkMessages";
import { getSpecialityList as fetchPmSpecialities } from "../../auth/authService";

let promise = null;
let specialityPromise = null;

export function getDoctorList() {
  if (!promise) {
    promise = ApiBulkMessages.listDoctor()
      .then((r) => (Array.isArray(r) ? r : r?.data ?? []))
      .catch(() => {
        // Do not stick an empty roster forever after a transient failure.
        promise = null;
        return [];
      });
  }
  return promise;
}

function unwrapSpecialities(r) {
  if (Array.isArray(r)) return r;
  const src = r?.data ?? r ?? {};
  const list =
    (Array.isArray(src.speciality) && src.speciality) ||
    (Array.isArray(src.specialities) && src.specialities) ||
    (Array.isArray(src.data?.speciality) && src.data.speciality) ||
    (Array.isArray(src.data?.specialities) && src.data.specialities) ||
    (Array.isArray(src.data?.data?.speciality) && src.data.data.speciality) ||
    [];
  return Array.isArray(list) ? list : [];
}

// Same master list Signup uses (displayName + code/id). That is what we
// previously dumped into the dropdown as "all specialities".
export function getSpecialityList() {
  if (!specialityPromise) {
    specialityPromise = fetchPmSpecialities()
      .then(unwrapSpecialities)
      .then((list) => {
        if (list.length) return list;
        return ApiBulkMessages.listPmSpecialities().then(unwrapSpecialities);
      })
      .catch(() =>
        ApiBulkMessages.listPmSpecialities()
          .then(unwrapSpecialities)
          .catch(() => {
            specialityPromise = null;
            return [];
          })
      );
  }
  return specialityPromise;
}

/** Drop cached roster (logout, account switch, manual refresh). */
export function clearDoctorListCache() {
  promise = null;
  specialityPromise = null;
}
