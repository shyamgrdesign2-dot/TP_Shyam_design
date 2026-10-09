import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_QUEUE_MANAGEMENT } from "../../utils/constants";

/**
 * Determines if real Queue Management backend routing should be used.
 * Separate from GB_CHIKITSALAY, which still controls the tab shell itself.
 */
export function useQueueManagement() {
  const isEnabledByGrowthBook = useFeatureIsOn(GB_QUEUE_MANAGEMENT);
  return isEnabledByGrowthBook;
}
