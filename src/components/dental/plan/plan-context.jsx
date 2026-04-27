import { TPSnackbar } from "../tp-ui/tp-snackbar";
/**
 * plan-context.tsx — React context + useReducer for treatment plan state.
 *
 * Provides: state, dispatch, and derived selectors (estimatePlans,
 * inProgressPlans, completedPlans, activePlan).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState } from
"react";
import {
  PLAN_CONSULTATION_FLUSH_EVENT,
  PLAN_CONSULTATION_QUEUE_PREFIX } from
"../lib/plan-consultation-queue";
import { genId } from "./plan-types";
import { getMockPlans } from "./plan-mock-data";
// ─── Reducer ────────────────────────────────────────────────
function planReducer(state, action) {
  switch (action.type) {
    // ── Plan CRUD ────────────────────────────────────────
    case "ADD_PLAN":
      return {
        ...state,
        plans: [...state.plans, action.plan]
      };
    case "UPDATE_PLAN":
      return {
        ...state,
        plans: state.plans.map((p) =>
        p.id === action.planId ?
        {
          ...p,
          ...action.patch,
          updatedAt: new Date().toISOString().slice(0, 10)
        } :
        p
        )
      };
    case "DELETE_PLAN":
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.planId)
      };
    case "DUPLICATE_PLAN":{
        const source = state.plans.find((p) => p.id === action.planId);
        if (!source) return state;
        const newPlanId = genId("plan");
        const dup = {
          ...source,
          id: newPlanId,
          name: `${source.name} (Copy)`,
          status: "draft",
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
          services: source.services.map((s) => ({
            ...s,
            id: genId("svc"),
            planId: newPlanId,
            status: "planned",
            surfaces: [...s.surfaces],
            sittings: [],
            procedures: [],
            appointments: [],
            consultations: [],
            startedAt: undefined,
            completedAt: undefined
          }))
        };
        return {
          ...state,
          plans: [...state.plans, dup]
        };
      }
    // ── Plan lifecycle ───────────────────────────────────
    case "ACTIVATE_PLAN":
      return {
        ...state,
        plans: state.plans.map((p) => {
          if (p.id === action.planId)
          return {
            ...p,
            status: "active"
          };
          // Demote any current active → draft
          if (p.status === "active")
          return {
            ...p,
            status: "draft"
          };
          return p;
        })
      };
    case "START_TREATMENT":
      return {
        ...state,
        plans: state.plans.map((p) => {
          if (p.id !== action.planId) return p;
          if (p.status !== "draft" && p.status !== "active") return p;
          const now = new Date().toISOString().slice(0, 10);
          return {
            ...p,
            status: "in-progress",
            updatedAt: now,
            services: p.services.map((s) => ({
              ...s,
              status: "planned",
              startedAt: undefined
            }))
          };
        })
      };
    case "REVERT_PLAN_TO_ESTIMATES":
      return {
        ...state,
        plans: state.plans.map((p) => {
          if (p.id !== action.planId) return p;
          if (p.status !== "in-progress") return p;
          return {
            ...p,
            status: "draft",
            updatedAt: new Date().toISOString().slice(0, 10),
            services: p.services.map((s) => ({
              ...s,
              status: "planned",
              startedAt: undefined,
              completedAt: undefined,
              sittings: [],
              procedures: [],
              appointments: [],
              consultations: []
            }))
          };
        })
      };
    case "MARK_PLAN_COMPLETED":{
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...state,
          plans: state.plans.map((p) => {
            if (p.id !== action.planId) return p;
            return {
              ...p,
              status: "completed",
              updatedAt: now,
              services: p.services.map((s) => ({
                ...s,
                status: "completed",
                completedAt: s.completedAt ?? now
              }))
            };
          })
        };
      }
    case "REVERT_PLAN_TO_PROGRESS":
      return {
        ...state,
        plans: state.plans.map((p) => {
          if (p.id !== action.planId) return p;
          if (p.status !== "completed") return p;
          return {
            ...p,
            status: "in-progress",
            updatedAt: new Date().toISOString().slice(0, 10),
            services: p.services.map((s) => ({
              ...s,
              status: "in-progress",
              completedAt: undefined
            }))
          };
        })
      };
    // ── Service CRUD ─────────────────────────────────────
    case "ADD_SERVICE":
      return {
        ...state,
        plans: state.plans.map((p) =>
        p.id === action.planId ?
        {
          ...p,
          services: [...p.services, action.service],
          updatedAt: new Date().toISOString().slice(0, 10)
        } :
        p
        )
      };
    case "UPDATE_SERVICE":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            ...action.patch
          } :
          s
          )
        }))
      };
    case "APPEND_SERVICE_CONSULTATION":{
        const now = new Date().toISOString().slice(0, 10);
        const { serviceId, consultation } = action;
        return {
          ...state,
          plans: state.plans.map((p) => ({
            ...p,
            services: p.services.map((s) => {
              if (s.id !== serviceId) return s;
              const nextConsultations = [
              ...(s.consultations ?? []),
              consultation];


              const next = {
                ...s,
                consultations: nextConsultations
              };
              if (s.status === "planned") {
                return {
                  ...next,
                  status: "in-progress",
                  startedAt: s.startedAt ?? now
                };
              }
              return next;
            })
          }))
        };
      }
    case "REMOVE_SERVICE_CONSULTATION":{
        const { serviceId, consultationId } = action;
        return {
          ...state,
          plans: state.plans.map((p) => ({
            ...p,
            services: p.services.map((s) =>
            s.id !== serviceId ?
            s :
            {
              ...s,
              consultations: (s.consultations ?? []).filter(
                (c) => c.id !== consultationId
              )
            }
            )
          }))
        };
      }
    case "REMOVE_SERVICE":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.filter((s) => s.id !== action.serviceId)
        }))
      };
    case "MARK_SERVICE_COMPLETED":{
        const now = new Date().toISOString().slice(0, 10);
        const newPlans = state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            status: "completed",
            completedAt: now
          } :
          s
          )
        }));
        return {
          ...state,
          plans: newPlans
        };
      }
    case "REVERT_SERVICE_TO_PROGRESS":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            status: "in-progress",
            completedAt: undefined
          } :
          s
          )
        }))
      };
    // ── Sittings & procedures ────────────────────────────
    case "ADD_SITTING":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            status: s.status === "planned" ? "in-progress" : s.status,
            sittings: [...s.sittings, action.sitting]
          } :
          s
          )
        }))
      };
    case "UPDATE_SITTING":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            sittings: s.sittings.map((sit) =>
            sit.id === action.sittingId ?
            {
              ...sit,
              ...action.patch
            } :
            sit
            )
          } :
          s
          )
        }))
      };
    case "REMOVE_SITTING":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            sittings: s.sittings.filter(
              (sit) => sit.id !== action.sittingId
            )
          } :
          s
          )
        }))
      };
    case "ADD_SUB_PROCEDURE":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            status: s.status === "planned" ? "in-progress" : s.status,
            procedures: [...s.procedures, action.procedure]
          } :
          s
          )
        }))
      };
    case "UPDATE_SUB_PROCEDURE":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            procedures: s.procedures.map((proc) =>
            proc.id === action.procedureId ?
            {
              ...proc,
              ...action.patch
            } :
            proc
            )
          } :
          s
          )
        }))
      };
    case "REMOVE_SUB_PROCEDURE":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            procedures: s.procedures.filter(
              (proc) => proc.id !== action.procedureId
            )
          } :
          s
          )
        }))
      };
    case "ADD_APPOINTMENT":
      // Note: adding an appointment does NOT change the service status.
      // Status only transitions to "in-progress" when a sitting or
      // procedure is recorded. Scheduling a visit is intent, not activity.
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            appointments: [...(s.appointments ?? []), action.appointment]
          } :
          s
          )
        }))
      };
    case "UPDATE_APPOINTMENT":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            appointments: (s.appointments ?? []).map((appt) =>
            appt.id === action.appointmentId ?
            {
              ...appt,
              ...action.patch
            } :
            appt
            )
          } :
          s
          )
        }))
      };
    case "REMOVE_APPOINTMENT":
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          services: p.services.map((s) =>
          s.id === action.serviceId ?
          {
            ...s,
            appointments: (s.appointments ?? []).filter(
              (appt) => appt.id !== action.appointmentId
            )
          } :
          s
          )
        }))
      };
    // ── Drawer ───────────────────────────────────────────
    case "SET_DRAWER":
      return {
        ...state,
        drawer: action.drawer
      };
    default:
      return state;
  }
}
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
  const [state, dispatch] = useReducer(planReducer, {
    plans: getMockPlans(patientId),
    drawer: initialDrawer ?? {
      type: "closed"
    }
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: ""
  });
  const showSnackbar = useCallback((message) => {
    if (!message) return;
    setSnackbar({
      open: true,
      message
    });
  }, []);
  const closeSnackbar = useCallback(
    () =>
    setSnackbar((s) => ({
      ...s,
      open: false
    })),
    []
  );
  const estimatePlans = useMemo(
    () =>
    state.plans.filter((p) => p.status === "draft" || p.status === "active"),
    [state.plans]
  );
  const inProgressPlans = useMemo(
    () => state.plans.filter((p) => p.status === "in-progress"),
    [state.plans]
  );
  const completedPlans = useMemo(
    () => state.plans.filter((p) => p.status === "completed"),
    [state.plans]
  );
  const activePlan = useMemo(
    () => state.plans.find((p) => p.status === "active"),
    [state.plans]
  );
  const findPlanForService = useMemo(
    () => (serviceId) =>
    state.plans.find((p) => p.services.some((s) => s.id === serviceId)),
    [state.plans]
  );
  const findService = useMemo(
    () => (serviceId) => {
      for (const p of state.plans) {
        const svc = p.services.find((s) => s.id === serviceId);
        if (svc) return svc;
      }
      return undefined;
    },
    [state.plans]
  );
  const openDrawer = (drawer) =>
  dispatch({
    type: "SET_DRAWER",
    drawer
  });
  const closeDrawer = () =>
  dispatch({
    type: "SET_DRAWER",
    drawer: {
      type: "closed"
    }
  });
  const hasInProgressPlan = inProgressPlans.length > 0;
  const value = useMemo(
    () => ({
      patientId,
      embedInPatientShell,
      state,
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
    state,
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
    closeSnackbar]

  );
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
        !item.summaryText)

        continue;
        dispatch({
          type: "APPEND_SERVICE_CONSULTATION",
          serviceId: item.serviceId,
          consultation: {
            id: item.id ?? `cns-${Date.now()}`,
            endedAt: item.endedAt ?? new Date().toISOString(),
            source:
            item.source === "appointment" ? "appointment" : "treatment-row",
            appointmentId: item.appointmentId,
            summaryText: item.summaryText
          }
        });
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
        }} />

    </PlanContext.Provider>);

}