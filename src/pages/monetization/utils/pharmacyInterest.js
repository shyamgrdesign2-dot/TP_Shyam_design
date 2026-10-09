import axios from "axios";
import moment from "moment";

import config from "../../../config";
import {
  S_PHARMACY,
  S_PHARMACY_NEW,
  TRIAL,
} from "../../../utils/constants";

function isPlanDateExpired(planExpiryDate) {
  if (!planExpiryDate) return false;
  return moment(planExpiryDate).diff(moment().format("YYYY-MM-DD"), "days") < 0;
}

/**
 * Pharmacy access for a single SKU (legacy pharmacy or pharmacy_new).
 * Entitlement is based only on that module's plan_tier + plan_expiry_date —
 * EMR (tatva_practice) is not required.
 *
 * - paid: tier not TRIAL and expiry not past (or no expiry set)
 * - expired: tier not TRIAL but expiry past
 * - trial_active: TRIAL and expiry not past
 * - trial_expired: TRIAL and expiry past
 * - other: missing mapping / unknown
 *
 * @param {string} serviceName - Defaults to legacy pharmacy (S_PHARMACY);
 *   SCM launch checks S_PHARMACY_NEW separately.
 */
export function getPharmacyAccessState(planDetails, serviceName = S_PHARMACY) {
  const { service_mappings } = planDetails || {};
  const pharmacy = service_mappings?.find((e) => e.service_name === serviceName);

  if (!pharmacy) {
    return { segment: "other", canSso: true, canTryPharmacy: false };
  }

  const expired = isPlanDateExpired(pharmacy.plan_expiry_date);
  const isTrial = pharmacy.plan_tier === TRIAL;
  const isPaidTier = Boolean(pharmacy.plan_tier) && pharmacy.plan_tier !== TRIAL;

  if (isPaidTier && !expired) {
    return { segment: "paid", canSso: true, canTryPharmacy: false };
  }

  if (isPaidTier && expired) {
    return { segment: "expired", canSso: false, canTryPharmacy: false };
  }

  if (isTrial && !expired) {
    return { segment: "trial_active", canSso: false, canTryPharmacy: true };
  }

  if (isTrial && expired) {
    return { segment: "trial_expired", canSso: false, canTryPharmacy: false };
  }

  return { segment: "other", canSso: true, canTryPharmacy: false };
}

/** True when the doctor has paid access via either legacy pharmacy or pharmacy_new. */
export function hasPharmacyPaidAccess(planDetails) {
  return (
    getPharmacyAccessState(planDetails, S_PHARMACY_NEW).segment === "paid" ||
    getPharmacyAccessState(planDetails).segment === "paid"
  );
}

/**
 * Sidebar pharmacy click routing — pharmacy_new launch takes priority over legacy SSO.
 * @returns {"launch_new" | "sso_legacy" | "intro"}
 */
export function resolvePharmacySidebarAction(planDetails) {
  if (getPharmacyAccessState(planDetails, S_PHARMACY_NEW).segment === "paid") {
    return "launch_new";
  }
  if (getPharmacyAccessState(planDetails).segment === "paid") {
    return "sso_legacy";
  }
  return "intro";
}

/**
 * Normalize GET /api/v1/pm/pharmacy/status body.
 * Ready example: { isSetup: true, redirectUrl, requiresExistingLogin }
 * Not ready: { isSetup: false, fields?: string[] }
 */
export function parsePharmacyStatus(responseData) {
  const body = responseData?.body || {};
  const isSetup = body.isSetup === true;
  const fields = Array.isArray(body.fields) ? body.fields : [];
  return {
    isSetup,
    redirectUrl: body.redirectUrl || "",
    requiresExistingLogin: !!body.requiresExistingLogin,
    fields,
  };
}

/** GET pharmacy setup status for the authenticated business (JWT tenancy). */
export async function fetchPharmacyStatus(token) {
  const response = await axios.get(
    `${config.monetization_url}/api/v1/pm/pharmacy/status`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return parsePharmacyStatus(response?.data);
}

/**
 * Split profile um_name into first/last for pharmacy/launch.
 * Strips a leading "Dr" / "Dr." title. First token → firstName; remainder → lastName.
 */
export function splitDoctorName(fullName = "") {
  const cleaned = String(fullName)
    .trim()
    .replace(/^(dr\.?)\s+/i, "");
  if (!cleaned) {
    return { firstName: "", lastName: "" };
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Body for POST /api/v1/pm/pharmacy/launch.
 * Matches monetization contract: doctor.firstName/lastName/email/mobile + clinic/business.name.
 *
 * @param {object} profile - doctor profile from redux
 * @param {{organizationName?: string, branchName?: string, email?: string}} [overrides]
 * @param {string} [clinicName] - resolved clinic display name
 */
export function buildPharmacyLaunchPayload(
  profile,
  overrides = {},
  clinicName = ""
) {
  const { firstName, lastName } = splitDoctorName(profile?.um_name);
  const branchName = overrides.branchName || clinicName;
  const organizationName =
    overrides.organizationName || overrides.branchName || clinicName;

  return {
    doctor: {
      firstName,
      lastName,
      email: overrides.email || profile?.um_email || "",
      mobile: profile?.um_contact ? String(profile.um_contact) : "",
    },
    clinic: {
      name: branchName,
    },
    business: {
      name: organizationName,
    },
  };
}
