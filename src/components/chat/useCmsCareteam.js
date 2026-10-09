import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_CMS_CARETEAM } from "../../utils/constants";

export function useCmsCareteam() {
  return useFeatureIsOn(GB_CMS_CARETEAM);
}
