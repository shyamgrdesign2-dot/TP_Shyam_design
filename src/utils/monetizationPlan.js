import moment from "moment";

import { FREE } from "./constants";

/**
 * A monetization service row (from `GET /api/v1/monetization/services` or
 * `GET /api/v1/monetization/credits`) carries the plan window:
 *
 *   { service_name, credit_balance, plan_tier, plan_start_date, plan_end_date }
 *
 * `plan_tier` alone is not enough to decide entitlement — a purchased plan
 * (e.g. `UNLIMITED`/`PAID`/`TRIAL`) keeps its tier after `plan_end_date` has
 * passed, so the date has to be checked too.
 *
 * FREE is the credit-metered trial tier: its entitlement is decided by
 * `credit_balance`, so it is deliberately exempt here — a trial doctor with
 * credits left must not be cut off by a stale plan window.
 *
 * A missing/unparseable `plan_end_date` is treated as "not expired" so a
 * partial API response can never lock a paying doctor out.
 */
export const isMonetizationPlanExpired = (serviceRow) => {
  if (!serviceRow) return false;

  const planTier = serviceRow?.plan_tier;
  if (!planTier || planTier === FREE) return false;

  const planEndDate = serviceRow?.plan_end_date;
  if (!planEndDate) return false;

  const parsedEndDate = moment(planEndDate);
  if (!parsedEndDate.isValid()) return false;

  // The plan is valid through the whole of its end date.
  return moment().isAfter(parsedEndDate, "day");
};
