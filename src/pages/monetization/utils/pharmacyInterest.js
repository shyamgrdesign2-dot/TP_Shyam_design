import moment from "moment";

import {
  PERSISTANT_STORAGE_KEY_EXTRA,
  S_PHARMACY,
  S_TATVA_PRACTICE,
  TRIAL,
} from "../../../utils/constants";

const PHARMACY_INTEREST_DATE_KEY = "pharmacy_date";

function readExtraStorage() {
  try {
    const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_EXTRA);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeExtraStorage(jsonData) {
  localStorage.setItem(PERSISTANT_STORAGE_KEY_EXTRA, JSON.stringify(jsonData));
}

export function hasPharmacyInterestSubmittedToday() {
  const jsonData = readExtraStorage();
  const today = moment().format("YYYY-MM-DD");
  return jsonData[PHARMACY_INTEREST_DATE_KEY] === today;
}

/** Mark interest form submitted for today (gates same-day sidebar SSO). */
export function markPharmacyInterestSubmittedToday() {
  const jsonData = readExtraStorage();
  jsonData[PHARMACY_INTEREST_DATE_KEY] = moment().format("YYYY-MM-DD");
  writeExtraStorage(jsonData);
}

/**
 * Pharmacy access segments for Know More / sidebar.
 * - trial_active: dual TRIAL and EMR plan_expiry_date not past
 * - trial_expired: dual TRIAL but expiry past
 * - locked: EMR paid, Pharmacy still TRIAL (no SSO)
 * - paid: Pharmacy not on TRIAL
 */
export function getPharmacyAccessState(planDetails) {
  const { service_mappings, plan_expiry_date } = planDetails || {};
  const emr = service_mappings?.find((e) => e.service_name === S_TATVA_PRACTICE);
  const pharmacy = service_mappings?.find((e) => e.service_name === S_PHARMACY);

  const emrTrial = emr?.plan_tier === TRIAL;
  const pharmacyTrial = pharmacy?.plan_tier === TRIAL;
  const pharmacyPaid = pharmacy && pharmacy.plan_tier !== TRIAL;
  const emrPaid = emr && emr.plan_tier !== TRIAL;

  const remainingDays = emrTrial
    ? moment(plan_expiry_date).diff(moment().format("YYYY-MM-DD"), "days")
    : 0;

  if (pharmacyPaid && emrPaid) {
    return { segment: "paid", canSso: true, canTryPharmacy: false };
  }

  if (emrTrial && pharmacyTrial) {
    if (remainingDays < 0) {
      return { segment: "trial_expired", canSso: false, canTryPharmacy: false };
    }
    return { segment: "trial_active", canSso: true, canTryPharmacy: true };
  }

  if (emrPaid && pharmacyTrial) {
    return { segment: "locked", canSso: false, canTryPharmacy: false };
  }

  // Fall-through (e.g. missing mapping): allow SSO like existing sidebar else branch
  return { segment: "other", canSso: true, canTryPharmacy: false };
}

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
