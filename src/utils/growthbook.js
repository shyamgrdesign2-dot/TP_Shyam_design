import { GrowthBook } from "@growthbook/growthbook-react";
import config from "../config";
import { isProductionEnv } from "./environment";

export const growthbook = new GrowthBook({
  apiHost: "https://cdn.growthbook.io",
  clientKey: config?.GROWTHBOOK_CLIENTKEY,
  enableDevMode: !isProductionEnv(),
});

export function isGrowthBookFeatureOn(featureKey) {
  if (!featureKey || typeof growthbook?.isOn !== "function") return false;
  return Boolean(growthbook.isOn(featureKey));
}
