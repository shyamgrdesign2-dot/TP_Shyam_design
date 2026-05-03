"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  getAllTemplates,
  subscribeTemplates,
  type RxModuleTemplate,
  type RxRowSnapshot,
} from "@/lib/template-store"

// ── Module context shape ─────────────────────────────────────────────────
//
// Whenever the doctor clicks Save or Template inside a module, the
// module passes a small context object identifying itself + a callback
// to apply rows back. The TemplateProvider stashes the latest context
// per moduleId so the sidebars can read fresh state without prop
// drilling.

export type ModuleContext = {
  moduleId: string
  moduleName: string
  // Current rows the doctor has typed. Captured at click-time and
  // refreshed each open so the Save sidebar always shows the latest
  // preview.
  currentRows: RxRowSnapshot[]
  // Called by the Templates sidebar when the doctor selects a
  // template. Implementation appends the rows to the module.
  applyRows: (rows: RxRowSnapshot[]) => void
}

type SidebarKind = "save" | "list"

type TemplateContextValue = {
  templates: RxModuleTemplate[]
  // UI state
  openSidebar: SidebarKind | null
  activeModule: ModuleContext | null
  // Triggers
  openSaveTemplate: (ctx: ModuleContext) => void
  openTemplatesList: (ctx: ModuleContext) => void
  closeSidebar: () => void
}

const TemplateContext = createContext<TemplateContextValue | null>(null)

const SSR_TEMPLATES: RxModuleTemplate[] = []

export function TemplateProvider({ children }: { children: ReactNode }) {
  const templates = useSyncExternalStore(subscribeTemplates, getAllTemplates, () => SSR_TEMPLATES)

  const [openSidebar, setOpenSidebar] = useState<SidebarKind | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleContext | null>(null)

  const openSaveTemplate = useCallback((ctx: ModuleContext) => {
    setActiveModule(ctx)
    setOpenSidebar("save")
  }, [])

  const openTemplatesList = useCallback((ctx: ModuleContext) => {
    setActiveModule(ctx)
    setOpenSidebar("list")
  }, [])

  const closeSidebar = useCallback(() => {
    setOpenSidebar(null)
    // Don't drop activeModule immediately — the close animation reads
    // it for the title fade-out. It gets overwritten on the next open.
  }, [])

  const value = useMemo<TemplateContextValue>(
    () => ({
      templates,
      openSidebar,
      activeModule,
      openSaveTemplate,
      openTemplatesList,
      closeSidebar,
    }),
    [templates, openSidebar, activeModule, openSaveTemplate, openTemplatesList, closeSidebar],
  )

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>
}

function useCtx(): TemplateContextValue {
  const ctx = useContext(TemplateContext)
  if (!ctx) {
    return {
      templates: SSR_TEMPLATES,
      openSidebar: null,
      activeModule: null,
      openSaveTemplate: () => {},
      openTemplatesList: () => {},
      closeSidebar: () => {},
    }
  }
  return ctx
}

export function useTemplateSidebars() {
  return useCtx()
}

export function useTemplatesForModule(moduleId: string): RxModuleTemplate[] {
  const { templates } = useCtx()
  return useMemo(
    () =>
      templates
        .filter((t) => t.moduleId === moduleId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [templates, moduleId],
  )
}

// Helper hook that callers in EditableTableModule can use directly.
// Keeps the latest moduleCtx in a ref so onSaveClick / onTemplateClick
// callbacks always read fresh row state without React re-render cycles.
export function useModuleTemplateHandlers(
  moduleId: string,
  moduleName: string,
  rows: RxRowSnapshot[],
  applyRows: (rows: RxRowSnapshot[]) => void,
) {
  const { openSaveTemplate, openTemplatesList } = useCtx()
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const applyRef = useRef(applyRows)
  applyRef.current = applyRows

  const onSaveClick = useCallback(() => {
    openSaveTemplate({
      moduleId,
      moduleName,
      currentRows: rowsRef.current,
      applyRows: (r) => applyRef.current(r),
    })
  }, [moduleId, moduleName, openSaveTemplate])

  const onTemplateClick = useCallback(() => {
    openTemplatesList({
      moduleId,
      moduleName,
      currentRows: rowsRef.current,
      applyRows: (r) => applyRef.current(r),
    })
  }, [moduleId, moduleName, openTemplatesList])

  return { onSaveClick, onTemplateClick }
}
