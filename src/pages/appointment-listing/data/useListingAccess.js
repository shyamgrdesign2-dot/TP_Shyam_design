import { useMemo } from "react";
import { useSelector } from "react-redux";
import { isMobile, isTablet } from "react-device-detect";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useIsDentalEnabled } from "../../../hooks/useIsDentalEnabled";
import { useChikitsalay } from "../../chikitsalay/useChikitsalay";
import { useQueueManagement } from "../../chikitsalay/useQueueManagement";
import { useCrossConsult } from "../../../hooks/useCrossConsult";
import { isVoiceRxFree, shouldMonetizationDisabled, isMunshiHospital } from "../../../utils/utils";
import {
  GB_CVT_EXT_HOS,
  GB_ISCRIBE,
  GB_SAVE_AS_DRAFT_RX,
  GB_SMARTSYNC_CVT,
  GB_SNAP_RX,
  GB_SNAP_RX_DIGITIZATION,
  GB_TAB_RX,
  GB_TAB_RX_CVT,
  GB_VOICE_RX_FREE,
  GB_ZYDUS_USER,
  PAID,
  S_VOICE_RX,
} from "../../../utils/constants";
import { getDecodedToken } from "../../../utils/localStorage";
import { env } from "../../../EnvironmentConfig";

/* Stable empty fallback for the finishedData selector. `useSelector(...) || []`
   would mint a fresh array every render when the slice is empty, changing the
   finishedEncounterIds memo's dependency identity each render — which in turn
   re-mints the whole access object this hook returns (finishedEncounterIds is
   one of its memo deps). One shared constant keeps that identity stable. */
const EMPTY_FINISHED = [];

/**
 * iPad desktop mode reports as Macintosh UA — detect via touch points, not
 * viewport width (same as PrimaryActionButton).
 */
function rxDeviceCaps() {
  const isIPadDesktopMode =
    typeof navigator !== "undefined" &&
    /Macintosh/.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 1;
  const isTabletDevice = isTablet || isIPadDesktopMode;
  return {
    isDesktopRx: !isMobile && !isTabletDevice,
    isTouchRx: isMobile || isTabletDevice,
  };
}

/**
 * Mission Hospital / CVT external-hospital gates, matching AppointmentData.js
 * and Welcome.js. `GB_CVT_EXT_HOS` is the GrowthBook flag those screens use
 * (Mission Hospital is the tenant that flag targets).
 *
 * Legacy hides, for that flag:
 *   - the whole row kebab
 *   - the Draft tab
 *   - billing chips on the visit-type column
 *   - Add Appointment and Start Walk-In (the Welcome action cluster)
 *   - Consult / VoiceRx / SnapRx / TabRx on the queue CTA (SmartRx only)
 *
 * Queue CTA flags match PrimaryActionButton: SmartRx > TabRx > VoiceRx >
 * SnapRx > Consult, with Zydus / dental pinning Consult as the primary.
 */
export function useListingAccess() {
  const isCvtExtHos = useFeatureIsOn(GB_CVT_EXT_HOS);
  const isZydusUserFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const showDraft = useFeatureIsOn(GB_SAVE_AS_DRAFT_RX) && !isCvtExtHos;
  const isSmartRxAccessible = useFeatureIsOn(GB_ISCRIBE);
  const isSnapRxAccessible = useFeatureIsOn(GB_SNAP_RX);
  const isTabRxEnabled = useFeatureIsOn(GB_TAB_RX);
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isVoiceRxAccessible = isVoiceRxFree(isVoiceRxFreeFromGB) || !shouldMonetizationDisabled();
  // Legacy Pending Digitisation tab: any of these CVT / Snap digitisation flags.
  const isSmartSyncCvtFromGB = useFeatureIsOn(GB_SMARTSYNC_CVT);
  const isSnapRxDigitizationFromGB = useFeatureIsOn(GB_SNAP_RX_DIGITIZATION);
  const isTabRxCvtFromGB = useFeatureIsOn(GB_TAB_RX_CVT);
  const digitisationWorklistEnabled =
    isSmartSyncCvtFromGB || isSnapRxDigitizationFromGB || isTabRxCvtFromGB;
  const { planDetails } = useSelector((state) => state.subscription);
  const isVoiceRxPaid =
    planDetails?.service_mappings?.find((e) => e.service_name === S_VOICE_RX)?.plan_tier === PAID;
  const isDentalEnabled = useIsDentalEnabled();
  const isChikitsalay = useChikitsalay();
  const isQueueManagementEnabled = useQueueManagement();
  const showReferral = useCrossConsult();
  const profile = useSelector((state) => state.doctors?.profile);
  // Legacy hide Encounter Consult once finishedData already has pam_ref_id.
  const finishedData = useSelector((state) => state.records?.finishedData) || EMPTY_FINISHED;

  // Zydus: business_id check + GrowthBook flag, matching AppointmentData.js
  const tokenData = getDecodedToken()?.result;
  const isZydusAccount =
    tokenData?.hospital_business_id == env.zydus_business_id && isZydusUserFromGB;
  const { isDesktopRx, isTouchRx } = rxDeviceCaps();

  const finishedEncounterIds = useMemo(() => {
    const ids = new Set();
    finishedData.forEach((item) => {
      if (item?.pam_ref_id != null) ids.add(String(item.pam_ref_id));
    });
    return ids;
  }, [finishedData]);

  return useMemo(
    () => ({
      isCvtExtHos,
      isSmartRxAccessible,
      canShowSmartRx: isSmartRxAccessible && isDesktopRx,
      isSnapRxAccessible,
      isVoiceRxAccessible,
      isVoiceRxPaid,
      isTabRxVisible: isTabRxEnabled && isTouchRx,
      isDentalEnabled,
      isChikitsalay,
      isQueueManagementEnabled,
      isZydusAccount,
      showDraft,
      showReferral,
      /* AppointmentData.js: Pending Digitisation tab only when one of the
         digitisation GB flags is on AND undigitised ids exist. Flag gate
         lives here; the id-count gate is applied in AppointmentListingPage. */
      digitisationWorklistEnabled,
      finishedEncounterIds,
      // Zydus: no kebab / Add Appointment / billing badge (legacy Welcome).
      // Walk-In remains available and routes to the Zydus walk-in screen.
      showKebab: !isCvtExtHos && !isZydusAccount,
      showBilling: !isCvtExtHos && !isZydusAccount,
      showBookActions: !isCvtExtHos && !isZydusAccount,
      showWalkIn: !isCvtExtHos,
      hipId: profile?.HipID,
      abhaEnable: profile?.abhaEnable,
      isMunshiHospital: isMunshiHospital(),
    }),
    [
      isCvtExtHos,
      isSmartRxAccessible,
      isDesktopRx,
      isSnapRxAccessible,
      isVoiceRxAccessible,
      isVoiceRxPaid,
      isTabRxEnabled,
      isTouchRx,
      isDentalEnabled,
      isChikitsalay,
      isQueueManagementEnabled,
      isZydusAccount,
      showDraft,
      showReferral,
      digitisationWorklistEnabled,
      finishedEncounterIds,
      profile?.HipID,
      profile?.abhaEnable,
    ]
  );
}
