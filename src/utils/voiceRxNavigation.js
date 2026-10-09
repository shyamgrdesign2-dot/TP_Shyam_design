import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { isMobile, isTablet } from "react-device-detect";

import { GB_VOICE_RX_NEW_UI } from "./constants";

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
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);

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
