import { customizedPad } from "../redux/doctorsSlice";

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
          tmdpm_name: "Dental",
          tmdpm_short_name: "Dental",
          tmdpm_status: 0,
          tmdpm_icon_url: "https://pm-uat-dhspl-2.tatvacare.in/img/microservices/left/tooth.svg"
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
