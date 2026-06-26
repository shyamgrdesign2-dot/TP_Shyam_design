import moment from "moment";
import SnapRxDigitization from "../api/services/SnapRxDigitization";

export const getCrossConsultFromRecord = (record) => {
  const crossConsult = record?.cross_consult ?? record?.crossConsult;
  return crossConsult && typeof crossConsult === "object" ? crossConsult : null;
};

export const hasCrossConsultReferralData = (referralData) =>
  Boolean(referralData?.um_id && String(referralData?.um_name || "").trim());

const normalizeCrossConsultToReferralData = (data) => {
  if (!data) return null;

  const list = Array.isArray(data)
    ? data
    : data?.content ?? data?.referrals ?? null;
  const item = Array.isArray(list) ? list[0] : data;

  if (!item?.um_id) return null;

  return {
    um_id: item.um_id,
    um_name: item.um_name ?? "",
    dp_id: item.dp_id ?? item.department_id ?? null,
    department_name: item.department_name ?? "",
    reason_for_cross_consult: item.reason_for_cross_consult ?? "",
  };
};

export const fetchReferralDataForCaseManager = async (
  caseManagerData,
  { tcmId } = {}
) => {
  const crossConsultRaw =
    caseManagerData?.cross_consult ?? caseManagerData?.crossConsult;
  const inlineReferral = normalizeCrossConsultToReferralData(crossConsultRaw);
  if (inlineReferral) return inlineReferral;

  const lookupIds = [
    caseManagerData?.crossconsultrefNo,
    tcmId > 0 ? tcmId : null,
  ].filter(Boolean);

  for (const lookupId of [...new Set(lookupIds)]) {
    try {
      const response = await SnapRxDigitization.getCrossConsultData(lookupId);
      const fetchedReferral = normalizeCrossConsultToReferralData(response?.data);
      if (fetchedReferral) return fetchedReferral;
    } catch (error) {
      console.error("[cross-consult] Failed to fetch referral data:", error);
    }
  }

  return null;
};

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
  { tcmId, patientUniqueId, referredBy, pendingCrossConsult }
) => {
  if (!tcmId || !patientUniqueId) return null;

  if (pendingCrossConsult?._id && !Number(pendingCrossConsult.tcm_id)) {
    return SnapRxDigitization.updateCrossConsult(pendingCrossConsult._id, {
      tcm_id: Number(tcmId),
    });
  }

  if (!hasCrossConsultReferralData(referralData)) {
    return null;
  }

  const payload = buildCrossConsultPayload(referralData, {
    tcmId,
    patientUniqueId,
    referredBy,
  });

  return SnapRxDigitization.createCrossConsult(payload);
};
