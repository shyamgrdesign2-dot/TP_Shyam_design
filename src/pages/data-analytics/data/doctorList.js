import ApiBulkMessages from "../../../api/services/ApiBulkMessages";

let promise = null;

export function getDoctorList() {
  if (!promise) {
    promise = ApiBulkMessages.listDoctor()
      .then((r) => (Array.isArray(r) ? r : r?.data ?? []))
      .catch(() => []);
  }
  return promise;
}
