import { TPSnackbar } from "../tp-ui/tp-snackbar";
/**
 * plan-context.tsx — React context + useDentalPlan for treatment plan state.
 *
 * Provides: state, dispatch, and derived selectors (estimatePlans,
 * inProgressPlans, completedPlans, activePlan).
 * This version is wired to the ApiDental service via Redux.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  PLAN_CONSULTATION_FLUSH_EVENT,
  PLAN_CONSULTATION_QUEUE_PREFIX
} from "../lib/plan-consultation-queue";
import { useDentalPlan } from "../lib/useDentalPlan";

const PlanContext = createContext(null);

export function usePlanContext() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlanContext must be used within PlanProvider");
  return ctx;
}

export function PlanProvider({
  patientId,
  children,
  onNavigateTab,
  initialDrawer,
  embedInPatientShell = false
}) {
  // 1. Connect to Redux-backed API hook
  const {
    plans,
    loading,
    error: apiError,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    activatePlan,
    startTreatment,
    markCompleted,
    addService,
    updateService,
    removeService,
    clearError
  } = useDentalPlan(patientId);

  // 2. Local UI state (Drawer, Snackbar)
  const [drawer, setDrawer] = useState(initialDrawer ?? { type: "closed" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const showSnackbar = useCallback((message) => {
    if (!message) return;
    setSnackbar({ open: true, message });
  }, []);

  const closeSnackbar = useCallback(
    () => setSnackbar((s) => ({ ...s, open: false })),
    []
  );

  const openDrawer = useCallback((d) => setDrawer(d), []);
  const closeDrawer = useCallback(() => setDrawer({ type: "closed" }), []);

  // 3. Derived selectors
  const estimatePlans = useMemo(
    () => plans.filter((p) => p.status === "draft" || p.status === "active"),
    [plans]
  );
  const inProgressPlans = useMemo(
    () => plans.filter((p) => p.status === "in-progress"),
    [plans]
  );
  const completedPlans = useMemo(
    () => plans.filter((p) => p.status === "completed"),
    [plans]
  );
  const activePlan = useMemo(
    () => plans.find((p) => p.status === "active"),
    [plans]
  );

  const findPlanForService = useCallback(
    (serviceId) => plans.find((p) => p.services?.some((s) => s.id === serviceId)),
    [plans]
  );

  const findService = useCallback(
    (serviceId) => {
      for (const p of plans) {
        const svc = p.services?.find((s) => s.id === serviceId);
        if (svc) return svc;
      }
      return undefined;
    },
    [plans]
  );

  const hasInProgressPlan = inProgressPlans.length > 0;

  // 4. Bridge dispatch to API calls
  // This maintains backward compatibility with components calling dispatch()
  const dispatch = useCallback(
    async (action) => {
      try {
        switch (action.type) {
          case "ADD_PLAN":
            await createPlan(action.plan);
            break;
          case "UPDATE_PLAN":
            await updatePlan(action.planId, action.patch);
            break;
          case "DELETE_PLAN":
            await deletePlan(action.planId);
            break;
          case "DUPLICATE_PLAN":
            await duplicatePlan(action.planId);
            break;
          case "ACTIVATE_PLAN":
            await activatePlan(action.planId, { status: "active" });
            break;
          case "START_TREATMENT":
            await startTreatment(action.planId, { status: "in-progress" });
            break;
          case "MARK_PLAN_COMPLETED":
            await markCompleted(action.planId, { status: "completed" });
            break;
          case "ADD_SERVICE":
            await addService(action.planId, action.service);
            break;
          case "UPDATE_SERVICE":
            await updateService(action.planId, action.serviceId, action.patch);
            break;
          case "REMOVE_SERVICE":
            await removeService(action.planId, action.serviceId);
            break;
          case "SET_DRAWER":
            setDrawer(action.drawer);
            break;
          // Note: Sittings & Procedures might need separate API handling or local persistence
          default:
            console.warn("Unhandled action type in PlanProvider dispatch:", action.type);
        }
      } catch (err) {
        console.error("Plan action failed:", err);
        showSnackbar(`Error: ${err.message || "Action failed"}`);
      }
    },
    [
      createPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      activatePlan,
      startTreatment,
      markCompleted,
      addService,
      updateService,
      removeService,
      showSnackbar
    ]
  );

  const value = useMemo(
    () => ({
      patientId,
      embedInPatientShell,
      state: { plans, drawer, loading, error: apiError }, // Mimic old state structure
      dispatch,
      estimatePlans,
      inProgressPlans,
      completedPlans,
      activePlan,
      findPlanForService,
      findService,
      hasInProgressPlan,
      openDrawer,
      closeDrawer,
      navigateTab: onNavigateTab,
      showSnackbar,
      snackbar,
      closeSnackbar
    }),
    [
      patientId,
      embedInPatientShell,
      plans,
      drawer,
      loading,
      apiError,
      dispatch,
      estimatePlans,
      inProgressPlans,
      completedPlans,
      activePlan,
      findPlanForService,
      findService,
      hasInProgressPlan,
      onNavigateTab,
      showSnackbar,
      snackbar,
      closeSnackbar
    ]
  );

  // 5. Consultation Queue Sync (Existing logic)
  useEffect(() => {
    const key = `${PLAN_CONSULTATION_QUEUE_PREFIX}${patientId || "apt-1"}`;
    const flush = () => {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      let queue = [];
      try {
        queue = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return;
      } catch {
        return;
      }
      localStorage.removeItem(key);
      for (const item of queue) {
        if (
          !item ||
          item.patientId !== patientId ||
          !item.serviceId ||
          !item.summaryText
        )
          continue;

        // Bridge to API or Redux
        // For now, we'll just log or handle via a dedicated consultation thunk if available
        console.log("Flushing consultation queue item:", item);
      }
    };
    flush();
    window.addEventListener("storage", flush);
    window.addEventListener(PLAN_CONSULTATION_FLUSH_EVENT, flush);
    return () => {
      window.removeEventListener("storage", flush);
      window.removeEventListener(PLAN_CONSULTATION_FLUSH_EVENT, flush);
    };
  }, [patientId]);

  return (
    <PlanContext.Provider value={value}>
      {children}
      <TPSnackbar
        open={snackbar.open}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center"
        }}
        autoHideDuration={3000}
        severity="success"
        message={snackbar.message}
        onClose={(_e, reason) => {
          if (reason === "clickaway") return;
          closeSnackbar();
        }}
      />
    </PlanContext.Provider>
  );
}