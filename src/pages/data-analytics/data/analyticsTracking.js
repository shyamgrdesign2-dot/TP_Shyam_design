import { trackEvent } from "../../../utils/utils";
import { getDecodedToken } from "../../../utils/localStorage";
import { store } from "../../../redux/store";

function getBaseAttrs() {
  const state = store.getState();
  const profile = state.doctors?.profile || {};
  const token = getDecodedToken()?.result || {};
  const clinics = Array.isArray(profile.hospital_data) ? profile.hospital_data : [];
  const primaryClinic = clinics[0] || {};

  return {
    doctor_name: profile.um_name || "",
    doctor_id: token.user_id || profile.um_id || "",
    doctor_unique_id: profile.doctor_unique_id || "",
    doctor_mobile_no: profile.um_contact || "",
    hospital_name: primaryClinic.hm_name || "",
    hospital_id: primaryClinic.hm_id || "",
    doctor_specialty: profile.dp_name || "",
    dp_id: profile.dp_id || "",
    module: "data_analytics",
  };
}

export function trackAnalytics(eventName, attrs = {}) {
  trackEvent(eventName, { ...getBaseAttrs(), ...attrs });
}

export const EVENTS = {
  OPENED: "TP_Analytics_Opened",
  CLOSED: "TP_Analytics_Closed",
  DEPT_SWITCH: "TP_Analytics_DeptSwitch",
  SECTION_VIEW: "TP_Analytics_SectionView",
  SUBTAB_VIEW: "TP_Analytics_SubtabView",
  FILTER_APPLIED: "TP_Analytics_FilterApplied",
  FILTER_CLEARED: "TP_Analytics_FilterCleared",
  REFRESH: "TP_Analytics_Refresh",
  REPORT_OPENED: "TP_Analytics_ReportOpened",
  REPORT_DOWNLOADED: "TP_Analytics_ReportDownloaded",
  REPORT_ERROR: "TP_Analytics_ReportError",
  DATA_ERROR: "TP_Analytics_DataError",
};
