import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useFeatureIsOn, useFeatureValue } from "@growthbook/growthbook-react";
import { isMobile, isTablet } from "react-device-detect";
import moment from "moment";

import { GB_VOICE_RX_FREE, GB_VOICE_RX_NEW_UI } from "./constants";
import { isVoiceRxFree } from "./utils";
import { getDecodedToken } from "./localStorage.js";

const TP_CONFIG_DATA_FEATURE_KEY = "tp-config-data";

// Buckets every REACT_APP_ENV into "prod" or "uat" for env-keyed tp-config
// values. NODE_ENV is NOT usable here — CRA sets it to "production" for
// every build, including UAT builds.
const TP_CONFIG_ENV_BUCKET = ["prod", "zy-prod"].includes(process.env.REACT_APP_ENV)
  ? "prod"
  : "uat";

/**
 * Resolves a tp-config-data value that may be either a plain value
 * ("2026-09-01", [...]) or an env-keyed object ({ uat: ..., prod: ... }).
 */
export function resolveTpConfigEnvValue(value) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("uat" in value || "prod" in value)
  ) {
    return value[TP_CONFIG_ENV_BUCKET];
  }
  return value;
}

/**
 * Doctors onboarded on or after the GrowthBook-configured cutoff date are
 * forced onto the new VoiceRx prescription UI — the old voice UI is never
 * shown to them. Cutoff comes from the `tp-config-data` JSON feature:
 *   { "newVoiceUiOnboardCutoff": "YYYY-MM-DD" }
 * onboarding_date comes from the plan API (body.profile.onboarding_date),
 * stored in state.subscription.planDetails.
 * Moving the cutoff forward means doctors onboarded before the new cutoff
 * fall back to the old UI (unless the voice-rx-new flag covers them).
 */
export function isOnboardedAfterNewVoiceUiCutoff(onboardingDate, cutoffDate) {
  if (!onboardingDate || !cutoffDate) return false;
  const parsedOnboarding = moment(onboardingDate);
  const parsedCutoff = moment(cutoffDate, "YYYY-MM-DD", true);
  if (!parsedOnboarding.isValid() || !parsedCutoff.isValid()) return false;
  return parsedOnboarding.startOf("day").isSameOrAfter(parsedCutoff.startOf("day"), "day");
}

/**
 * True once today's date reaches the given "YYYY-MM-DD" switch date
 * (inclusive). Invalid/missing date → false.
 */
export function hasNewVoiceUiSwitchDateArrived(switchDate) {
  if (!switchDate) return false;
  const parsed = moment(switchDate, "YYYY-MM-DD", true);
  if (!parsed.isValid()) return false;
  return moment().startOf("day").isSameOrAfter(parsed.startOf("day"), "day");
}

/**
 * Single source of truth for "should this doctor get the new VoiceRx UI".
 *
 * Hard override first: doctors listed in tp-config-data.oldVoiceUiOnlyDoctors
 * (by JWT user_id, e.g. [12469, 12475]) always get the OLD UI, no matter what.
 *
 * Otherwise true when any of:
 *  - the voice-rx-new GrowthBook flag is on
 *  - the doctor was onboarded on/after tp-config-data.newVoiceUiOnboardCutoff
 *  - the doctor is a free VoiceRx user (free-voice-rx flag / Zydus window)
 *    AND today is on/after tp-config-data.newVoiceUiForFreeUsersFrom
 *
 * Every tp-config value may be plain ("2026-09-01" / [...]) or env-keyed
 * ({ "uat": ..., "prod": ... }) — resolved via resolveTpConfigEnvValue.
 * UI selection only — credit gating is decided independently elsewhere.
 */
export function useVoiceRxNewUiFlag() {
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const tpConfigData = useFeatureValue(TP_CONFIG_DATA_FEATURE_KEY, {});
  const onboardingDate = useSelector(
    (state) => state.subscription?.planDetails?.onboarding_date
  );
  const doctorId = getDecodedToken()?.result?.user_id;

  const oldUiOnlyDoctors = resolveTpConfigEnvValue(tpConfigData?.oldVoiceUiOnlyDoctors);
  if (
    Array.isArray(oldUiOnlyDoctors) &&
    doctorId != null &&
    oldUiOnlyDoctors.some((id) => Number(id) === Number(doctorId))
  ) {
    return false;
  }

  return (
    isVoiceRxNewFromGB ||
    isOnboardedAfterNewVoiceUiCutoff(
      onboardingDate,
      resolveTpConfigEnvValue(tpConfigData?.newVoiceUiOnboardCutoff)
    ) ||
    (isVoiceRxFree(isVoiceRxFreeFromGB) &&
      hasNewVoiceUiSwitchDateArrived(
        resolveTpConfigEnvValue(tpConfigData?.newVoiceUiForFreeUsersFrom)
      ))
  );
}

export function shouldUseVoiceRxNewUiNavigation(isVoiceRxNewFromGB, isMobilePhone = isMobile && !isTablet) {
  return isVoiceRxNewFromGB && !isMobilePhone;
}

export function getVoiceRxNavigationPath(isVoiceRxNewFromGB, isMobilePhone) {
  return shouldUseVoiceRxNewUiNavigation(isVoiceRxNewFromGB, isMobilePhone) ? "/prescription" : "/voice-rx-consult";
}

export function getVoiceRxNavigationState(isVoiceRxNewFromGB, state = {}, voiceRxEntryPoint, isMobilePhone) {
  const shouldUseNewUi = shouldUseVoiceRxNewUiNavigation(isVoiceRxNewFromGB, isMobilePhone);

  return {
    ...(state || {}),
    ...(shouldUseNewUi
      ? {
          isVoiceRxNewUiFlow: true,
          ...(voiceRxEntryPoint ? { voiceRxEntryPoint } : {}),
        }
      : {}),
  };
}

export function useVoiceRxNavigation() {
  const navigate = useNavigate();
  const isVoiceRxNewFromGB = useVoiceRxNewUiFlag();

  return useCallback(
    (state = {}, options = {}, voiceRxEntryPoint) => {
      navigate(getVoiceRxNavigationPath(isVoiceRxNewFromGB), {
        ...options,
        state: getVoiceRxNavigationState(isVoiceRxNewFromGB, state, voiceRxEntryPoint),
      });
    },
    [isVoiceRxNewFromGB, navigate]
  );
}
