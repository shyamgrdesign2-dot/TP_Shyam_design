import { env } from "../../../EnvironmentConfig";
import {
  Data_ANALYTICS_ENABLED,
  NATIVE_DATA_ANALYTICS_NAV_ENABLED,
  MISSION_ANALYTICS_SPECIAL_USER_IDS,
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
 * Mission / CVT sidebar: Data Analytics for admin or special allowlisted users only.
 * Other doctors never see it (even if module_data includes data_analytics).
 */
export function canShowMissionAnalyticsNav(isCvtExtHos, tokenResult, profile) {
  if (!isCvtExtHos) return false;
  return (
    isAnalyticsAdmin(tokenResult, profile) ||
    isMissionAnalyticsSpecialUser(tokenResult)
  );
}

/** Special Mission users: sidebar is analytics-only (no Appointment / other modules). */
export function isMissionAnalyticsOnlyUser(isCvtExtHos, tokenResult) {
  return !!isCvtExtHos && isMissionAnalyticsSpecialUser(tokenResult);
}

/**
 * Who gets the native Data Analytics page vs legacy SSO.
 * - NATIVE_DATA_ANALYTICS_NAV_ENABLED → full native for everyone else
 * - Allowlisted user ids (Data_ANALYTICS_ENABLED) → full module
 * - Mission Hospital business id → OPD Consultation Modes only (legacy path)
 * - Everyone else → SSO (pre-module behaviour)
 */
export function getDataAnalyticsAccessMode(tokenResult) {
  if (NATIVE_DATA_ANALYTICS_NAV_ENABLED) {
    return DA_ACCESS_FULL;
  }

  // const userId = tokenResult?.user_id;
  // if (
  //   userId != null &&
  //   Data_ANALYTICS_ENABLED.some((id) => String(id) === String(userId))
  // ) {
  //   return DA_ACCESS_FULL;
  // }

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
  isCvtExtHos,
  tokenResult,
  profile,
} = {}) {
  if (isCvtExtHos) {
    return canShowMissionAnalyticsNav(isCvtExtHos, tokenResult, profile)
      ? "mission"
      : "none";
  }
  if (NATIVE_DATA_ANALYTICS_NAV_ENABLED) {
    return "native";
  }
  if (canOpenNativeDataAnalytics(tokenResult)) {
    return "native";
  }
  return "sso";
}

/** Whether non-CVT sidebar should render a Data Analytics item. */
export function canShowNonCvtDataAnalyticsNav({
  isCvtExtHos,
  hasModuleData,
} = {}) {
  if (isCvtExtHos) return false;
  if (NATIVE_DATA_ANALYTICS_NAV_ENABLED) return true;
  return !!hasModuleData;
}
