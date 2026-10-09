import { GB_CHIKITSALAY } from "./constants";
import { isGrowthBookFeatureOn } from "./growthbook";

export const buildNoCustomDataPayload = (isChikitsalayAccessable) => ({
  noCustomData:
    isChikitsalayAccessable !== undefined
      ? !!isChikitsalayAccessable
      : isGrowthBookFeatureOn(GB_CHIKITSALAY),
});
