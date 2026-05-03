"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

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
  updateCustomModule as storeUpdateCustomModule,
  type CustomModule,
  type CustomiseConfig,
  type RxLayoutItem,
  type SidebarItemId,
  type LayoutItem,
} from "@/lib/customise-store"

// SSR-safe default snapshot — used until the client has hydrated and the
// store can read localStorage. Mirrors the shape of getConfig() so consumers
// don't have to special-case the first render.
const SSR_CONFIG: CustomiseConfig = {
  sidebar: DEFAULT_SIDEBAR.map((d) => ({ ...d })),
  rxpad: DEFAULT_RXPAD.map((d) => ({ ...d })),
}
const SSR_MODULES: CustomModule[] = []

// ── Context shape ────────────────────────────────────────────────────────

type CustomiseContextValue = {
  config: CustomiseConfig
  modules: CustomModule[]

  // Layout mutators
  setSidebarConfig: (next: LayoutItem<SidebarItemId>[]) => void
  setRxConfig: (next: RxLayoutItem[]) => void
  resetLayoutToDefaults: () => void

  // Module mutators
  addModule: (input: {
    name: string
    fields: { label: string; kind?: NonNullable<CustomModule["fields"][number]["kind"]> }[]
    iconName?: string | null
    iconStyle?: string | null
    iconSvg?: string | null
  }) => CustomModule
  updateModule: (
    id: string,
    patch: {
      name?: string
      fields?: { label: string; kind?: NonNullable<CustomModule["fields"][number]["kind"]> }[]
      iconName?: string | null
      iconStyle?: string | null
      iconSvg?: string | null
    },
  ) => void
  deleteModule: (id: string) => void

  // Custom Modules drawer global state — single source of truth so the
  // drawer can be opened from the customise sheet, the bottom-of-RxPad CTA,
  // or any future entry point.
  customModulesDrawerOpen: boolean
  customModulesDrawerInitialTab: "select" | "create"
  customModulesDrawerEditingId: string | null
  openCustomModulesDrawer: (opts?: { initialTab?: "select" | "create"; editingId?: string }) => void
  closeCustomModulesDrawer: () => void
}

const CustomiseContext = createContext<CustomiseContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────

export function CustomiseProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore subscribes both the layout config and the module
  // list to the store's pub/sub. Snapshots are referentially stable between
  // writes (the store memoises) so this is cheap.
  const config = useSyncExternalStore(subscribeConfig, getConfig, () => SSR_CONFIG)
  const modules = useSyncExternalStore(subscribeModules, getModules, () => SSR_MODULES)

  const setSidebarConfig = useCallback((nextSidebar: LayoutItem<SidebarItemId>[]) => {
    const current = getConfig()
    setConfig({ ...current, sidebar: nextSidebar })
  }, [])

  const setRxConfig = useCallback((nextRxpad: RxLayoutItem[]) => {
    const current = getConfig()
    setConfig({ ...current, rxpad: nextRxpad })
  }, [])

  const resetLayoutToDefaults = useCallback(() => {
    storeResetLayoutToDefaults()
  }, [])

  const addModule = useCallback<CustomiseContextValue["addModule"]>((input) => {
    return storeAddCustomModule(input)
  }, [])

  const updateModule = useCallback<CustomiseContextValue["updateModule"]>((id, patch) => {
    storeUpdateCustomModule(id, patch)
  }, [])

  const deleteModule = useCallback<CustomiseContextValue["deleteModule"]>((id) => {
    storeDeleteCustomModule(id)
  }, [])

  const [customModulesDrawerOpen, setCustomModulesDrawerOpen] = useState(false)
  const [customModulesDrawerInitialTab, setCustomModulesDrawerInitialTab] = useState<"select" | "create">("select")
  const [customModulesDrawerEditingId, setCustomModulesDrawerEditingId] = useState<string | null>(null)

  const openCustomModulesDrawer = useCallback<CustomiseContextValue["openCustomModulesDrawer"]>((opts) => {
    setCustomModulesDrawerInitialTab(opts?.initialTab ?? (opts?.editingId ? "create" : "select"))
    setCustomModulesDrawerEditingId(opts?.editingId ?? null)
    setCustomModulesDrawerOpen(true)
  }, [])

  const closeCustomModulesDrawer = useCallback(() => {
    setCustomModulesDrawerOpen(false)
    setCustomModulesDrawerEditingId(null)
  }, [])

  const value = useMemo<CustomiseContextValue>(
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
      closeCustomModulesDrawer,
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
      closeCustomModulesDrawer,
    ],
  )

  return <CustomiseContext.Provider value={value}>{children}</CustomiseContext.Provider>
}

// ── Hooks ────────────────────────────────────────────────────────────────

function useCustomiseContext(): CustomiseContextValue {
  const ctx = useContext(CustomiseContext)
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
        throw new Error("CustomiseProvider not mounted")
      },
      updateModule: () => {},
      deleteModule: () => {},
      customModulesDrawerOpen: false,
      customModulesDrawerInitialTab: "select",
      customModulesDrawerEditingId: null,
      openCustomModulesDrawer: () => {},
      closeCustomModulesDrawer: () => {},
    }
  }
  return ctx
}

export function useSidebarConfig() {
  return useCustomiseContext().config.sidebar
}

export function useRxSectionConfig() {
  return useCustomiseContext().config.rxpad
}

export function useCustomModules() {
  return useCustomiseContext().modules
}

export function useCustomiseMutators() {
  const {
    setSidebarConfig,
    setRxConfig,
    resetLayoutToDefaults,
    addModule,
    updateModule,
    deleteModule,
  } = useCustomiseContext()
  return {
    setSidebarConfig,
    setRxConfig,
    resetLayoutToDefaults,
    addModule,
    updateModule,
    deleteModule,
  }
}

export function useCustomModulesDrawer() {
  const {
    customModulesDrawerOpen,
    customModulesDrawerInitialTab,
    customModulesDrawerEditingId,
    openCustomModulesDrawer,
    closeCustomModulesDrawer,
  } = useCustomiseContext()
  return {
    open: customModulesDrawerOpen,
    initialTab: customModulesDrawerInitialTab,
    editingId: customModulesDrawerEditingId,
    openDrawer: openCustomModulesDrawer,
    closeDrawer: closeCustomModulesDrawer,
  }
}

// Re-export caps so consumers don't double-import.
export { CUSTOM_MODULE_CAP, CUSTOM_MODULE_FIELD_CAP, CUSTOM_MODULE_NAME_MAX }
