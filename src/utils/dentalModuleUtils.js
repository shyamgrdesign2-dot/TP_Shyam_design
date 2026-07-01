import { customizedPad, savePrintsettings } from "../redux/doctorsSlice";
import {
  mergeDentalPrintCaseOptions,
  buildSavePrintSettingsPayload,
} from "./dentalDefaultPrintSettings";

export const DENTAL_PLAN_MODULE_ICON_URL =
  "/icons/medical/surgical-scissors-02--line.svg";

/**
 * Utility thunk to verify conditions and add the Dental module 
 * to the user's custom modules if it's missing.
 * @param {string} userId - The user ID to add the module for
 * @param {boolean} isDentalEnabled - Flag representing if the feature is on for the user
 */
export const verifyAndAddDentalModule = (userId, isDentalEnabled) => async (dispatch, getState) => {
  try {
    const state = getState();
    const leftModules = state.doctors?.customizedPadLeftList || [];
    const rightModules = state.doctors?.customizedPadRightList || [];
    
    const hasDentalInLeftModules = leftModules.some(m => m.tmdpm_id === 26);
    
    if (isDentalEnabled && !hasDentalInLeftModules) {
      const updatedLeftModules = [
        ...leftModules,
        {
          tmdpm_id: 26,
          tmdpm_type: "L",
          tmdpm_name: "Dental Plan",
          tmdpm_short_name: "Dental Plan",
          tmdpm_status: 0,
          tmdpm_icon_url: DENTAL_PLAN_MODULE_ICON_URL
        }
      ];

      const sendData = {
        data: {
          default: false,
          reset: false,
          left: updatedLeftModules,
          right: rightModules,
        },
      };

      const response = await dispatch(customizedPad(sendData)).unwrap();
    }
  } catch (err) {
    console.error("Error adding dental module automatically:", err);
  }
};

/**
 * Ensures Dental Examination (id 21) and Oral Examination (id 22) exist in the
 * doctor's saved print settings, with default section toggles.
 */
export const verifyAndAddDentalPrintOptions = (isDentalEnabled) => async (dispatch, getState) => {
  if (!isDentalEnabled) return;

  try {
    const { doctors } = getState();
    const defaultPrintSettings = doctors?.defaultPrintSettings;
    if (!defaultPrintSettings?.prescription) return;

    const existing = defaultPrintSettings.prescription.case_option || [];
    const { caseOptions, updateFlag } = mergeDentalPrintCaseOptions(existing);

    if (updateFlag) {
      const sendData = buildSavePrintSettingsPayload(defaultPrintSettings, caseOptions);
      await dispatch(savePrintsettings(sendData));
    }
  } catch (err) {
    console.error("Error syncing dental print case options:", err);
  }
};
