import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addDentalBillingItem,
  loadDentalBillItems,
  selectDentalBillingItems,
  selectDentalBillingItemsLoaded,
  setDentalBillingItems,
} from "../../../redux/dentalMastersSlice";

export function useBillingCatalog() {
  const dispatch = useDispatch();
  const items = useSelector(selectDentalBillingItems);
  const loaded = useSelector(selectDentalBillingItemsLoaded);

  useEffect(() => {
    if (!loaded) dispatch(loadDentalBillItems());
  }, [loaded, dispatch]);

  const setItems = useCallback(
    (nextItems) => {
      dispatch(setDentalBillingItems(nextItems));
    },
    [dispatch]
  );

  const addItem = useCallback(
    (item) => {
      dispatch(addDentalBillingItem(item));
    },
    [dispatch]
  );

  return {
    items,
    setItems,
    addItem,
  };
}
