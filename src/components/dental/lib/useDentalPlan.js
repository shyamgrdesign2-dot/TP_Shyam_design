import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDentalPlans,
  createDentalPlan,
  updateDentalPlan,
  deleteDentalPlan,
  duplicateDentalPlan,
  activateDentalPlan,
  startDentalTreatment,
  markDentalPlanCompleted,
  revertDentalPlanToEstimates,
  revertDentalPlanToProgress,
  addPlanService,
  updatePlanService,
  deletePlanService,
  markDentalServiceCompleted,
  revertDentalServiceToProgress,
  setCurrentPlan,
  clearPlanError,
  selectDentalPlan,
} from "../../../redux/dentalPlanSlice";

/**
 * useDentalPlan Hook
 * Manages treatment plans and services via Redux.
 */
export function useDentalPlan(patientId) {
  const dispatch = useDispatch();
  const { plans, loading, error, currentPlan } = useSelector(
    selectDentalPlan
  );

  // Load plans on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      dispatch(fetchDentalPlans(patientId));
    }
  }, [patientId, dispatch]);

  const createPlan = useCallback((data) => {
    if (!patientId) return;
    return dispatch(createDentalPlan({ patientId, data }));
  }, [patientId, dispatch]);

  const updatePlan = useCallback((planId, data) => {
    if (!patientId) return;
    return dispatch(updateDentalPlan({ patientId, planId, data }));
  }, [patientId, dispatch]);

  const deletePlan = useCallback((planId) => {
    if (!patientId) return;
    return dispatch(deleteDentalPlan({ patientId, planId }));
  }, [patientId, dispatch]);

  const duplicatePlan = useCallback(async (planId) => {
    if (!patientId) return;
    const result = await dispatch(duplicateDentalPlan({ patientId, planId }));
    if (!result.error) {
      dispatch(fetchDentalPlans(patientId));
    }
    return result;
  }, [patientId, dispatch]);

  const activatePlan = useCallback(async (planId, data) => {
    if (!patientId) return;
    const result = await dispatch(activateDentalPlan({ patientId, planId, data }));
    if (!result.error) {
      dispatch(fetchDentalPlans(patientId));
    }
    return result;
  }, [patientId, dispatch]);

  const startTreatment = useCallback((planId, data) => {
    if (!patientId) return;
    return dispatch(startDentalTreatment({ patientId, planId, data }));
  }, [patientId, dispatch]);

  const markCompleted = useCallback((planId, data) => {
    if (!patientId) return;
    return dispatch(markDentalPlanCompleted({ patientId, planId, data }));
  }, [patientId, dispatch]);

  const revertToEstimates = useCallback((planId, data) => {
    if (!patientId) return;
    return dispatch(revertDentalPlanToEstimates({ patientId, planId, data }));
  }, [patientId, dispatch]);

  const revertToProgress = useCallback((planId, data) => {
    if (!patientId) return;
    return dispatch(revertDentalPlanToProgress({ patientId, planId, data }));
  }, [patientId, dispatch]);

  const addService = useCallback((planId, data) => {
    if (!patientId) return;
    return dispatch(addPlanService({ patientId, planId, data }));
  }, [patientId, dispatch]);

  const updateService = useCallback((planId, serviceId, data) => {
    if (!patientId) return;
    return dispatch(updatePlanService({ patientId, planId, serviceId, data }));
  }, [patientId, dispatch]);

  const removeService = useCallback((planId, serviceId) => {
    if (!patientId) return;
    return dispatch(deletePlanService({ patientId, planId, serviceId }));
  }, [patientId, dispatch]);

  const markServiceDone = useCallback((planId, serviceId, data) => {
    if (!patientId) return;
    return dispatch(markDentalServiceCompleted({ patientId, planId, serviceId, data }));
  }, [patientId, dispatch]);

  const revertServiceToProgress = useCallback((planId, serviceId, data) => {
    if (!patientId) return;
    return dispatch(revertDentalServiceToProgress({ patientId, planId, serviceId, data }));
  }, [patientId, dispatch]);

  const selectPlan = useCallback((plan) => {
    dispatch(setCurrentPlan(plan));
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearPlanError());
  }, [dispatch]);

  const refetchPlans = useCallback(() => {
    if (!patientId) return Promise.resolve();
    return dispatch(fetchDentalPlans(patientId));
  }, [patientId, dispatch]);

  return {
    plans,
    loading,
    error,
    currentPlan,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    activatePlan,
    startTreatment,
    markCompleted,
    revertToEstimates,
    revertToProgress,
    addService,
    updateService,
    removeService,
    markServiceDone,
    revertServiceToProgress,
    selectPlan,
    clearError,
    refetchPlans,
  };
}
