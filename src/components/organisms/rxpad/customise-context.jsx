"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore } from

"react";

import {
  CUSTOM_MODULE_CAP,
  CUSTOM_MODULE_FIELD_CAP,
  CUSTOM_MODULE_NAME_MAX,
  DEFAULT_RXPAD,
  DEFAULT_SIDEBAR,
  addCustomModule as storeAddCustomModule,
  deleteCustomModule as storeDeleteCustomModule,
  getConfig,
  getModules,
  resetLayoutToDefaults as storeResetLayoutToDefaults,
  setConfig,
  subscribeConfig,
  subscribeModules,
  updateCustomModule as storeUpdateCustomModule } from





"@/src/components/organisms/rxpad/customise-store";

// SSR-safe default snapshot — used until the client has hydrated and the
// store can read localStorage. Mirrors the shape of getConfig() so consumers
// don't have to special-case the first render.
const SSR_CONFIG = {
  sidebar: DEFAULT_SIDEBAR.map((d) => ({ ...d })),
  rxpad: DEFAULT_RXPAD.map((d) => ({ ...d }))
};
const SSR_MODULES = [];

// ── Context shape ────────────────────────────────────────────────────────








































const CustomiseContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────

export function CustomiseProvider({ children }) {
  // useSyncExternalStore subscribes both the layout config and the module
  // list to the store's pub/sub. Snapshots are referentially stable between
  // writes (the store memoises) so this is cheap.
  const config = useSyncExternalStore(subscribeConfig, getConfig, () => SSR_CONFIG);
  const modules = useSyncExternalStore(subscribeModules, getModules, () => SSR_MODULES);

  const setSidebarConfig = useCallback((nextSidebar) => {
    const current = getConfig();
    setConfig({ ...current, sidebar: nextSidebar });
  }, []);

  const setRxConfig = useCallback((nextRxpad) => {
    const current = getConfig();
    setConfig({ ...current, rxpad: nextRxpad });
  }, []);

  const resetLayoutToDefaults = useCallback(() => {
    storeResetLayoutToDefaults();
  }, []);

  const addModule = useCallback((input) => {
    return storeAddCustomModule(input);
  }, []);

  const updateModule = useCallback((id, patch) => {
    storeUpdateCustomModule(id, patch);
  }, []);

  const deleteModule = useCallback((id) => {
    storeDeleteCustomModule(id);
  }, []);

  const [customModulesDrawerOpen, setCustomModulesDrawerOpen] = useState(false);
  const [customModulesDrawerInitialTab, setCustomModulesDrawerInitialTab] = useState("select");
  const [customModulesDrawerEditingId, setCustomModulesDrawerEditingId] = useState(null);

  const openCustomModulesDrawer = useCallback((opts) => {
    setCustomModulesDrawerInitialTab(opts?.initialTab ?? (opts?.editingId ? "create" : "select"));
    setCustomModulesDrawerEditingId(opts?.editingId ?? null);
    setCustomModulesDrawerOpen(true);
  }, []);

  const closeCustomModulesDrawer = useCallback(() => {
    setCustomModulesDrawerOpen(false);
    setCustomModulesDrawerEditingId(null);
  }, []);

  const value = useMemo(
    () => ({
      config,
      modules,
      setSidebarConfig,
      setRxConfig,
      resetLayoutToDefaults,
      addModule,
      updateModule,
      deleteModule,
      customModulesDrawerOpen,
      customModulesDrawerInitialTab,
      customModulesDrawerEditingId,
      openCustomModulesDrawer,
      closeCustomModulesDrawer
    }),
    [
    config,
    modules,
    setSidebarConfig,
    setRxConfig,
    resetLayoutToDefaults,
    addModule,
    updateModule,
    deleteModule,
    customModulesDrawerOpen,
    customModulesDrawerInitialTab,
    customModulesDrawerEditingId,
    openCustomModulesDrawer,
    closeCustomModulesDrawer]

  );

  return <CustomiseContext.Provider value={value}>{children}</CustomiseContext.Provider>;
}

// ── Hooks ────────────────────────────────────────────────────────────────

function useCustomiseContext() {
  const ctx = useContext(CustomiseContext);
  if (!ctx) {
    // Soft fallback so a stray consumer rendered outside the shell still
    // renders something sensible. The defaults match the SSR snapshot.
    return {
      config: SSR_CONFIG,
      modules: SSR_MODULES,
      setSidebarConfig: () => {},
      setRxConfig: () => {},
      resetLayoutToDefaults: () => {},
      addModule: () => {
        throw new Error("CustomiseProvider not mounted");
      },
      updateModule: () => {},
      deleteModule: () => {},
      customModulesDrawerOpen: false,
      customModulesDrawerInitialTab: "select",
      customModulesDrawerEditingId: null,
      openCustomModulesDrawer: () => {},
      closeCustomModulesDrawer: () => {}
    };
  }
  return ctx;
}

export function useSidebarConfig() {
  return useCustomiseContext().config.sidebar;
}

export function useRxSectionConfig() {
  return useCustomiseContext().config.rxpad;
}

export function useCustomModules() {
  return useCustomiseContext().modules;
}

export function useCustomiseMutators() {
  const {
    setSidebarConfig,
    setRxConfig,
    resetLayoutToDefaults,
    addModule,
    updateModule,
    deleteModule
  } = useCustomiseContext();
  return {
    setSidebarConfig,
    setRxConfig,
    resetLayoutToDefaults,
    addModule,
    updateModule,
    deleteModule
  };
}

export function useCustomModulesDrawer() {
  const {
    customModulesDrawerOpen,
    customModulesDrawerInitialTab,
    customModulesDrawerEditingId,
    openCustomModulesDrawer,
    closeCustomModulesDrawer
  } = useCustomiseContext();
  return {
    open: customModulesDrawerOpen,
    initialTab: customModulesDrawerInitialTab,
    editingId: customModulesDrawerEditingId,
    openDrawer: openCustomModulesDrawer,
    closeDrawer: closeCustomModulesDrawer
  };
}

// Re-export caps so consumers don't double-import.
export { CUSTOM_MODULE_CAP, CUSTOM_MODULE_FIELD_CAP, CUSTOM_MODULE_NAME_MAX };