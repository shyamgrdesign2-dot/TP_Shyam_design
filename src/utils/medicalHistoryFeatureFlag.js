import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_MEDICAL_HISTORY_NEW_UI } from "./constants";

/**
 * Rollout switch for the redesigned Medical History drawer.
 *
 * Off (the default whenever GrowthBook has not loaded or the feature does not
 * exist) means the doctor sees exactly what production ships today: the legacy
 * MedicalHistoryBox, the old drawer sizing, and no section-order API calls.
 */
export function useMedicalHistoryNewUi() {
  return Boolean(useFeatureIsOn(GB_MEDICAL_HISTORY_NEW_UI));
}

/**
 * Drawer props that differ between the two Medical History UIs.
 *
 * The redesigned box owns its own unsaved-changes guard, so the drawer must not
 * close itself on mask click or Esc. The legacy box has no such guard and keeps
 * antd's defaults, so those keys are omitted entirely rather than set to true.
 *
 * Widths are passed in because they are per-call-site: the tab layouts were
 * already full width on production, only the desktop drawers grew 75% -> 85%.
 */
export function useMedicalHistoryDrawerProps({ legacyWidth = "75%", newWidth = "85%" } = {}) {
  const isNewUi = useMedicalHistoryNewUi();

  if (!isNewUi) return { width: legacyWidth };

  return {
    width: newWidth,
    maskClosable: false,
    keyboard: false,
  };
}
