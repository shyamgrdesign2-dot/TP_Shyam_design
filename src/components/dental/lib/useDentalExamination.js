import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDentalExamination,
  updateToothData,
  syncWholeState,
  clearDentalChart,
  saveDentalExamination
} from "../../../redux/dentalExaminationSlice";

import { transformToothStateToApi } from "./examination-helpers";

/**
 * useDentalExamination Hook
 * Manages the patient's dental chart state via Redux.
 */
export function useDentalExamination(patientId) {
  const dispatch = useDispatch();
  const { toothState, version, dentitionType, loading, saving, error, lastSaved } = useSelector(
    (state) => state.dentalExamination
  );

  // Load examination data on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      dispatch(fetchDentalExamination(patientId));
    }
  }, [patientId, dispatch]);

  const updateTooth = useCallback((toothId, data) => {
    dispatch(updateToothData({ toothId, data }));
  }, [dispatch]);

  const syncState = useCallback((state) => {
    dispatch(syncWholeState(state));
  }, [dispatch]);

  const clearChart = useCallback(() => {
    dispatch(clearDentalChart());
  }, [dispatch]);

  const saveChart = useCallback(async () => {
    if (!patientId) return;

    const tooth_states = transformToothStateToApi(toothState);

    return dispatch(
      saveDentalExamination({
        patientId,
        data: {
          dentition_type: dentitionType,
          tooth_states: tooth_states,
          version: version,
        },
      })
    );
  }, [patientId, toothState, version, dentitionType, dispatch]);

  return {
    toothState,
    version,
    loading,
    saving,
    error,
    lastSaved,
    updateTooth,
    syncState,
    clearChart,
    saveChart
  };
}
