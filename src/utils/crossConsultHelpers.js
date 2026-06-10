import moment from "moment";
import SnapRxDigitization from "../api/services/SnapRxDigitization";

export const hasCrossConsultReferralData = (referralData) =>
  Boolean(referralData?.um_id && String(referralData?.um_name || "").trim());

export const buildCrossConsultPayload = (
  referralData,
  { tcmId, patientUniqueId, referredBy }
) => ({
  referred_tcm_id: Number(tcmId),
  department_id: referralData?.dp_id,
  department_name: referralData?.department_name || "",
  um_id: referralData?.um_id,
  um_name: referralData?.um_name,
  patient_unique_id: String(patientUniqueId),
  date_of_referral: moment().format("YYYY-MM-DD"),
  reason_for_cross_consult: referralData?.reason_for_cross_consult || "",
  referred_by: referredBy || "",
});

export const syncCrossConsultReferral = async (
  referralData,
  { tcmId, patientUniqueId, referredBy }
) => {
  if (
    !hasCrossConsultReferralData(referralData) ||
    !tcmId ||
    !patientUniqueId
  ) {
    return null;
  }

  const payload = buildCrossConsultPayload(referralData, {
    tcmId,
    patientUniqueId,
    referredBy,
  });

  return SnapRxDigitization.createCrossConsult(payload);
};
