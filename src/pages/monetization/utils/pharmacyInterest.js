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
  try {
    localStorage.setItem(PERSISTANT_STORAGE_KEY_EXTRA, JSON.stringify(jsonData));
  } catch {
    // Private mode / quota — interest gate may not persist; avoid crashing the UI.
  }
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

function remainingDaysFrom(dateValue) {
  if (!dateValue) return null;
  const expiry = moment(dateValue);
  if (!expiry.isValid()) return null;
  return expiry.startOf("day").diff(moment().startOf("day"), "days");
}

/**
 * Pharmacy access for sidebar / lead-gen.
 * SSO only when Pharmacy is paid and the Pharmacy offering is not expired.
 * Dual trial, locked, expired, and unknown mappings → no-access (canSso: false).
 */
export function getPharmacyAccessState(planDetails) {
  const { service_mappings, plan_expiry_date } = planDetails || {};
  const emr = service_mappings?.find((e) => e.service_name === S_TATVA_PRACTICE);
  const pharmacy = service_mappings?.find((e) => e.service_name === S_PHARMACY);

  const emrTrial = emr?.plan_tier === TRIAL;
  const pharmacyTrial = pharmacy?.plan_tier === TRIAL;
  const pharmacyPaid = Boolean(pharmacy && pharmacy.plan_tier !== TRIAL);
  const emrPaid = Boolean(emr && emr.plan_tier !== TRIAL);

  // Dual-trial expiry follows EMR plan_expiry_date (FreeTrialButton parity).
  const dualTrialRemainingDays = emrTrial
    ? remainingDaysFrom(plan_expiry_date)
    : null;

  // Pharmacy paid alone (do not require EMR paid). Expiry from pharmacy mapping when present.
  if (pharmacyPaid) {
    const pharmacyRemainingDays = remainingDaysFrom(
      pharmacy?.plan_expiry_date || pharmacy?.expiry_date,
    );
    if (pharmacyRemainingDays !== null && pharmacyRemainingDays < 0) {
      return { segment: "paid_expired", canSso: false, canTryPharmacy: false };
    }
    return { segment: "paid", canSso: true, canTryPharmacy: false };
  }

  if (emrTrial && pharmacyTrial) {
    if (dualTrialRemainingDays === null || dualTrialRemainingDays < 0) {
      return { segment: "trial_expired", canSso: false, canTryPharmacy: false };
    }
    // Lead-gen for dual trial — no SSO.
    return { segment: "trial_active", canSso: false, canTryPharmacy: true };
  }

  if (emrPaid && pharmacyTrial) {
    return { segment: "locked", canSso: false, canTryPharmacy: false };
  }

  // Missing / unknown mapping — only paid may SSO.
  return { segment: "other", canSso: false, canTryPharmacy: false };
}

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
