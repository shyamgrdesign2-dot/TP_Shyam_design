import ApiBulkMessages from "../../../api/services/ApiBulkMessages";

let promise = null;

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

/** Drop cached roster (logout, account switch, manual refresh). */
export function clearDoctorListCache() {
  promise = null;
}
