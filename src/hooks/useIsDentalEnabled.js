import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_DENTAL_MODULE } from "../utils/constants";
import { resolveIsDentalEnabled } from "../utils/dentalAccess";

export function useIsDentalEnabled() {
  const isDentalFromGrowthBook = useFeatureIsOn(GB_DENTAL_MODULE);
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);

  return useMemo(
    () => resolveIsDentalEnabled(isDentalFromGrowthBook, profile, planDetails),
    [isDentalFromGrowthBook, profile?.dp_id, planDetails?.onboarding_date],
  );
}
