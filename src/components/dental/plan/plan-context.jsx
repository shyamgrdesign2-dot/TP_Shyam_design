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
import { useSelector } from "react-redux";
import {
  PLAN_CONSULTATION_FLUSH_EVENT,
  PLAN_CONSULTATION_QUEUE_PREFIX
} from "../lib/plan-consultation-queue";
import { useDentalPlan } from "../lib/useDentalPlan";
import { selectSessionPendingServices } from "../../../redux/dentalPlanSlice";
import { mergePendingIntoDraftPlans } from "./exam-suggestions";

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
    revertToEstimates,
    revertToProgress,
    addService,
    updateService,
    removeService,
    markServiceDone,
    revertServiceToProgress,
    clearError,
    refetchPlans,
  } = useDentalPlan(patientId);
  const sessionPendingServices = useSelector(selectSessionPendingServices);

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
  const displayPlans = useMemo(
    () => mergePendingIntoDraftPlans(plans, sessionPendingServices),
    [plans, sessionPendingServices],
  );
  const estimatePlans = useMemo(
    () => displayPlans.filter((p) => p.status === "draft"),
    [displayPlans]
  );
  const inProgressPlans = useMemo(
    () => plans.filter((p) => p.status === "active" || p.status === "in-progress"),
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

  const value = useMemo(
    () => ({
      patientId,
      embedInPatientShell,
      state: { plans: displayPlans, drawer, loading, error: apiError },
      // API actions — call directly instead of via string-keyed dispatch
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
      refetchPlans,
      // UI state
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
      closeSnackbar,
    }),
    [
      patientId,
      embedInPatientShell,
      displayPlans,
      plans,
      drawer,
      loading,
      apiError,
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
      refetchPlans,
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
      closeSnackbar,
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

        // TODO: bridge to API or Redux via a dedicated consultation thunk
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