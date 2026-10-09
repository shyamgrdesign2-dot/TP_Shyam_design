import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_CROSS_CONSULT } from "../utils/constants";


export function useCrossConsult() {
    const isEnabledByGrowthBook = useFeatureIsOn(GB_CROSS_CONSULT);
    return isEnabledByGrowthBook;
}