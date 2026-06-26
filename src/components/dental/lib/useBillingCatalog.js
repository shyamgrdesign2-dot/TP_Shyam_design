import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addDentalBillingItem,
  selectDentalBillingItems,
  setDentalBillingItems,
} from "../../../redux/dentalMastersSlice";

export function useBillingCatalog() {
  const dispatch = useDispatch();
  const items = useSelector(selectDentalBillingItems);

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
