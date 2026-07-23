import { env } from "../../../EnvironmentConfig";
import { Data_ANALYTICS_ENABLED } from "../../../utils/constants";

/** Full Tesseract analytics (all OPD/IPD sections). */
export const DA_ACCESS_FULL = "full";
/** Native analytics limited to OPD → Consultation Modes only. */
export const DA_ACCESS_CONSULT_MODES = "consult_modes";
/** Legacy PHP data analytics via SSO. */
export const DA_ACCESS_SSO = "sso";

/**
 * Who gets the native Data Analytics page vs legacy SSO.
 * - Allowlisted user ids (Data_ANALYTICS_ENABLED) → full module
 * - Mission Hospital business id → OPD Consultation Modes only
 * - Everyone else (including Zydus) → SSO (pre-module behaviour)
 */
export function getDataAnalyticsAccessMode(tokenResult) {
  const userId = tokenResult?.user_id;
  if (
    userId != null &&
    Data_ANALYTICS_ENABLED.some((id) => String(id) === String(userId))
  ) {
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
