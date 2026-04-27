import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from "react";

function chromeReducer(state, action) {
  switch (action.type) {
    case "set_dr_agent":
      if (action.open) {
        return { drAgentOpen: true, secondarySidebarActiveId: null };
      }
      return { ...state, drAgentOpen: false };
    case "set_dr_agent_functional": {
      const next = action.fn(state.drAgentOpen);
      if (next) {
        return { drAgentOpen: true, secondarySidebarActiveId: null };
      }
      return { ...state, drAgentOpen: false };
    }
    case "toggle_secondary": {
      const nextId =
        state.secondarySidebarActiveId === action.id ? null : action.id;
      if (nextId) {
        return { drAgentOpen: false, secondarySidebarActiveId: nextId };
      }
      return { ...state, secondarySidebarActiveId: null };
    }
    case "set_secondary":
      if (action.id) {
        return { drAgentOpen: false, secondarySidebarActiveId: action.id };
      }
      return { ...state, secondarySidebarActiveId: null };
    default:
      return state;
  }
}

export const RxPadChromeContext = createContext(null);

export function RxPadChromeProvider({ children }) {
  const [rxPadExamTab, setRxPadExamTab] = useState("base");
  const [state, dispatch] = useReducer(chromeReducer, {
    drAgentOpen: false,
    secondarySidebarActiveId: null,
  });

  const setDrAgentOpen = useCallback((open) => {
    if (typeof open === "function") {
      dispatch({ type: "set_dr_agent_functional", fn: open });
    } else {
      dispatch({ type: "set_dr_agent", open });
    }
  }, []);

  const toggleSecondarySidebar = useCallback((id) => {
    dispatch({ type: "toggle_secondary", id });
  }, []);

  const setSecondarySidebarActiveId = useCallback((id) => {
    dispatch({ type: "set_secondary", id });
  }, []);

  const value = useMemo(
    () => ({
      drAgentOpen: state.drAgentOpen,
      setDrAgentOpen,
      secondarySidebarActiveId: state.secondarySidebarActiveId,
      toggleSecondarySidebar,
      setSecondarySidebarActiveId,
      rxPadExamTab,
      setRxPadExamTab,
    }),
    [
      state.drAgentOpen,
      state.secondarySidebarActiveId,
      setDrAgentOpen,
      toggleSecondarySidebar,
      setSecondarySidebarActiveId,
      rxPadExamTab,
    ],
  );

  return (
    <RxPadChromeContext.Provider value={value}>
      {children}
    </RxPadChromeContext.Provider>
  );
}

export function useRxPadChrome() {
  const ctx = useContext(RxPadChromeContext);
  if (!ctx) {
    throw new Error("useRxPadChrome must be used within RxPadChromeProvider");
  }
  return ctx;
}
