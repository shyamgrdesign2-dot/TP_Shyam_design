import moment from "moment";

export const DENTAL_DEPARTMENT_DP_ID = 26;

/** Dental pilot: onboarded on or after 23 June 2026 (inclusive). */
const PILOT_ONBOARDING_START_DATE = "2026-06-23";

/**
 * Dental pilot: dp_id 26 doctors onboarded from 24 June 2026 onward.
 * onboarding_date comes from plan API (body.profile.onboarding_date).
 */
export function isDentalPilotOnboardingDoctor(profile, planDetails) {
  if (Number(profile?.dp_id) !== DENTAL_DEPARTMENT_DP_ID) {
    return false;
  }

  const onboardingDate = planDetails?.onboarding_date;
  if (!onboardingDate) {
    return false;
  }

  const parsed = moment(onboardingDate);
  if (!parsed.isValid()) {
    return false;
  }

  const pilotStart = moment(PILOT_ONBOARDING_START_DATE, "YYYY-MM-DD").startOf("day");
  return parsed.startOf("day").isSameOrAfter(pilotStart, "day");
}

export function resolveIsDentalEnabled(isDentalFromGrowthBook, profile, planDetails) {
  return Boolean(
    isDentalFromGrowthBook ||
      isDentalPilotOnboardingDoctor(profile, planDetails),
  );
}
