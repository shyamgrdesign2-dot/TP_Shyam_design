import React from "react";

import MedicalHistoryBoxLegacy from "./MedicalHistoryBoxLegacy";
import MedicalHistoryBoxV2 from "./MedicalHistoryBoxV2";
import { useMedicalHistoryNewUi } from "../utils/medicalHistoryFeatureFlag";

/**
 * Rollout dispatcher for the Medical History drawer body.
 *
 * Every caller keeps importing MedicalHistoryBox; the GrowthBook feature
 * `medical-history-new-ui` decides which implementation renders. Off (the
 * default) serves MedicalHistoryBoxLegacy, a verbatim copy of the production
 * component, so the flag is a true kill switch. MedicalHistoryBoxLegacy is
 * throwaway and should be deleted along with this dispatcher once the redesign
 * is fully rolled out.
 */
function MedicalHistoryBox(props) {
  const isNewUi = useMedicalHistoryNewUi();

  return isNewUi ? <MedicalHistoryBoxV2 {...props} /> : <MedicalHistoryBoxLegacy {...props} />;
}

export default MedicalHistoryBox;
