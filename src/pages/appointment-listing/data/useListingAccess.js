import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_CVT_EXT_HOS, GB_ISCRIBE, GB_SAVE_AS_DRAFT_RX } from "../../../utils/constants";

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
 *   - TypeRx / VoiceRx / SnapRx / TabRx on the queue CTA (SmartRx only)
 */
export function useListingAccess() {
  const isCvtExtHos = useFeatureIsOn(GB_CVT_EXT_HOS);
  const showDraft = useFeatureIsOn(GB_SAVE_AS_DRAFT_RX) && !isCvtExtHos;
  const isSmartRxAccessible = useFeatureIsOn(GB_ISCRIBE);
  return {
    isCvtExtHos,
    isSmartRxAccessible,
    showDraft,
    showKebab: !isCvtExtHos,
    showBilling: !isCvtExtHos,
    showBookActions: !isCvtExtHos,
  };
}
