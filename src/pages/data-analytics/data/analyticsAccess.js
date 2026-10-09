import { env } from "../../../EnvironmentConfig";
import {
  NATIVE_DATA_ANALYTICS_NAV_ENABLED,
  MISSION_ANALYTICS_SPECIAL_USER_IDS,
  EXTERNAL_HOSPITAL_BUSINESS_IDS,
} from "../../../utils/constants";

/** Full Tesseract analytics (all OPD/IPD sections). */
export const DA_ACCESS_FULL = "full";
/** Native analytics limited to OPD → Consultation Modes only. */
export const DA_ACCESS_CONSULT_MODES = "consult_modes";
/** Legacy PHP data analytics via SSO. */
export const DA_ACCESS_SSO = "sso";

export function isAnalyticsAdmin(tokenResult, profile) {
  return Number(tokenResult?.admin) === 1 || Number(profile?.ownerDoctor) === 1;
}

export function isMissionAnalyticsSpecialUser(tokenResult) {
  const userId = tokenResult?.user_id;
  if (userId == null) return false;
  return MISSION_ANALYTICS_SPECIAL_USER_IDS.some((id) => String(id) === String(userId));
}

/**
 * Mission Hospital tenant — sync check from JWT business id (no GrowthBook).
 * Prefer this for Mission Analytics gates so hard refresh never waits on GB.
 */
export function isMissionHospitalUser(tokenResult) {
  const businessId = String(tokenResult?.hospital_business_id ?? "");
  const missionId = String(EXTERNAL_HOSPITAL_BUSINESS_IDS.MISSION_HOSPITAL ?? "");
  return !!businessId && !!missionId && businessId === missionId;
}

/**
 * Mission sidebar: Data Analytics for admin or special allowlisted users only.
 * Other Mission doctors never see it (even if module_data includes data_analytics).
 */
export function canShowMissionAnalyticsNav(tokenResult, profile) {
  if (!isMissionHospitalUser(tokenResult)) return false;
  return (
    isAnalyticsAdmin(tokenResult, profile) ||
    isMissionAnalyticsSpecialUser(tokenResult)
  );
}

/** Special Mission users: sidebar is analytics-only (no Appointment / other modules). */
export function isMissionAnalyticsOnlyUser(tokenResult) {
  return isMissionHospitalUser(tokenResult) && isMissionAnalyticsSpecialUser(tokenResult);
}

/**
 * Who gets the native Data Analytics page vs legacy SSO.
 * - NATIVE_DATA_ANALYTICS_NAV_ENABLED → full native for everyone else
 * - Mission Hospital business id → OPD Consultation Modes only (legacy path)
 * - Everyone else → SSO (pre-module behaviour)
 */
export function getDataAnalyticsAccessMode(tokenResult) {
  if (NATIVE_DATA_ANALYTICS_NAV_ENABLED) {
    return DA_ACCESS_FULL;
  }

  const businessId = String(tokenResult?.hospital_business_id ?? "");
  const missionBusinessId = String(env.mission_hospital_business_id ?? "");

  if (businessId && missionBusinessId && businessId === missionBusinessId) {
    return DA_ACCESS_CONSULT_MODES;
  }

  return DA_ACCESS_SSO;
}

export function canOpenNativeDataAnalytics(tokenResult) {
  const mode = getDataAnalyticsAccessMode(tokenResult);
  return mode === DA_ACCESS_FULL || mode === DA_ACCESS_CONSULT_MODES;
}

/**
 * Resolve click destination for Data Analytics.
 * @returns {"mission"|"native"|"sso"|"none"}
 */
export function resolveDataAnalyticsDestination({
  tokenResult,
  profile,
} = {}) {
  if (isMissionHospitalUser(tokenResult)) {
    return canShowMissionAnalyticsNav(tokenResult, profile) ? "mission" : "none";
  }
  if (NATIVE_DATA_ANALYTICS_NAV_ENABLED) {
    return "native";
  }
  if (canOpenNativeDataAnalytics(tokenResult)) {
    return "native";
  }
  return "sso";
}

/** Whether non-Mission sidebar should render a Data Analytics item. */
export function canShowNonCvtDataAnalyticsNav({
  tokenResult,
  hasModuleData,
} = {}) {
  if (isMissionHospitalUser(tokenResult)) return false;
  if (NATIVE_DATA_ANALYTICS_NAV_ENABLED) return true;
  return !!hasModuleData;
}
