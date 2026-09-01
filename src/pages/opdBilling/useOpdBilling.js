import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { checkToShowOpdBilling } from "./service";
import { setShouldShowOpdBilling } from "../../redux/billingSlice";

export const useOpdBilling = () => {
  const dispatch = useDispatch();
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const { shouldShowOpdBilling, isOpdBillChecked } = useSelector(
    (state) => state.billing
  );
  const { profile } = useSelector((state) => state.doctors);

  useEffect(() => {
    if (!isOpdBillChecked && !isReceptionist) {
      checkToShowOpdBilling()
        .then((res) => {
          dispatch(setShouldShowOpdBilling(Boolean(res)));
        })
        .catch((err) => {
          console.error("Error fetching checkToShowOpdBilling:", err);
          dispatch(setShouldShowOpdBilling(false));
        });
    }
  }, [isOpdBillChecked, dispatch]);

  const isOpdBillingAccessableFromGB = useFeatureIsOn("new-opd-billing");

  const isOpdBillingEnabledInPhp = profile?.module_data?.find(
    (module) => module.type === "opd_billing"
  );

  return {
    isOpdBillingAccessable: Boolean(
      (isOpdBillingAccessableFromGB || shouldShowOpdBilling) &&
        isOpdBillingEnabledInPhp
    ),
  };
};
