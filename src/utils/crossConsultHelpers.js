import moment from "moment";
import SnapRxDigitization from "../api/services/SnapRxDigitization";

export const getCrossConsultFromRecord = (record) => {
  const crossConsult = record?.cross_consult ?? record?.crossConsult;
  if (!crossConsult) return null;

  if (Array.isArray(crossConsult)) {
    const item = crossConsult.find((entry) => entry && typeof entry === "object");
    return item ?? null;
  }

  if (typeof crossConsult !== "object") return null;

  const nestedList = crossConsult?.content ?? crossConsult?.referrals;
  if (Array.isArray(nestedList) && nestedList[0] && typeof nestedList[0] === "object") {
    return { ...crossConsult, ...nestedList[0] };
  }

  return crossConsult;
};

export const getCrossConsultRecordId = (record) => {
  if (!record) return null;

  const crossConsult = getCrossConsultFromRecord(record);
  const candidates = [
    crossConsult?._id,
    crossConsult?.id,
    crossConsult?.crossconsultrefNo,
    record?.crossconsultrefNo,
  ];

  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim() !== "") {
      return candidate;
    }
  }

  return null;
};

export const hasCrossConsultReferralData = (referralData) =>
  Boolean(referralData?.um_id && String(referralData?.um_name || "").trim());

const normalizeCrossConsultToReferralData = (data) => {
  if (!data) return null;

  const list = Array.isArray(data)
    ? data
    : data?.content ?? data?.referrals ?? null;
  const item = Array.isArray(list) ? list[0] : data;

  if (!item || typeof item !== "object") return null;

  const umName =
    item.um_name ??
    item.umName ??
    item.referred_by ??
    item.referredBy ??
    "";
  if (!String(umName).trim()) return null;

  return {
    um_id: item.um_id ?? item.umId ?? null,
    um_name: umName,
    dp_id: item.dp_id ?? item.department_id ?? item.dpId ?? null,
    department_name: item.department_name ?? item.departmentName ?? "",
    reason_for_cross_consult: item.reason_for_cross_consult ?? "",
    date_of_referral: item.date_of_referral ?? data?.date_of_referral ?? "",
  };
};

const resolveInlineReferralData = (...sources) => {
  for (const source of sources) {
    if (!source) continue;

    const nestedRaw = source?.cross_consult ?? source?.crossConsult;
    const fromNested = normalizeCrossConsultToReferralData(nestedRaw);
    if (fromNested) return fromNested;

    const direct = normalizeCrossConsultToReferralData(source);
    if (direct) return direct;
  }
  return null;
};

const resolveCrossConsultRefId = (caseManagerData, patientRecord) => {
  for (const source of [caseManagerData, caseManagerData?.patient_data, patientRecord]) {
    const refId = getCrossConsultRecordId(source);
    if (refId) return refId;
  }
  return null;
};

export const fetchReferralDataForCaseManager = async (
  caseManagerData,
  patientRecord = null
) => {
  const inlineReferral = resolveInlineReferralData(
    caseManagerData,
    caseManagerData?.patient_data,
    patientRecord
  );
  if (inlineReferral) return inlineReferral;

  const crossConsultRefId = resolveCrossConsultRefId(caseManagerData, patientRecord);
  if (!crossConsultRefId) return null;

  try {
    const response = await SnapRxDigitization.getCrossConsultData(crossConsultRefId);
    return normalizeCrossConsultToReferralData(response?.data);
  } catch {
    return null;
  }
};

/**
 * Cross-consult fields for add/edit case manager (backend posts cross-consult internally).
 * Omits referred_tcm_id — case manager response supplies the tcm linkage.
 */
export const buildCaseManagerCrossConsultFields = (
  referralData,
  { referredBy, pendingCrossConsult } = {}
) => {
  // Existing pending cross-consult is linked after save via updateCrossConsult.
  if (getCrossConsultRecordId(pendingCrossConsult)) return null;
  if (!hasCrossConsultReferralData(referralData)) return null;

  return {
    department_id: referralData?.dp_id,
    department_name: referralData?.department_name || "",
    um_id: referralData?.um_id,
    um_name: referralData?.um_name,
    date_of_referral:
      referralData?.date_of_referral || moment().format("YYYY-MM-DD"),
    reason_for_cross_consult: referralData?.reason_for_cross_consult || "",
    referred_by: referredBy || "",
  };
};

export const attachCrossConsultToCaseManagerPayload = (
  sendData,
  referralData,
  options = {}
) => {
  if (!sendData) return sendData;
  const fields = buildCaseManagerCrossConsultFields(referralData, options);
  if (!fields) return sendData;
  Object.assign(sendData, fields);
  return sendData;
};

/**
 * After case manager succeeds: only links an existing pending cross-consult to tcm_id.
 * New referrals are created by addCaseManager / editCaseManager from attached payload fields.
 */
export const syncCrossConsultReferral = async (
  _referralData,
  { tcmId, pendingCrossConsult }
) => {
  if (!tcmId) return null;

  const crossConsultId = getCrossConsultRecordId(pendingCrossConsult);
  if (!crossConsultId) return null;

  return SnapRxDigitization.updateCrossConsult(crossConsultId, {
    tcm_id: Number(tcmId),
  });
};
