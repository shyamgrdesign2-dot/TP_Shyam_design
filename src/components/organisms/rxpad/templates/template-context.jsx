"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore } from

"react";

import {
  getAllTemplates,
  subscribeTemplates } from


"@/src/components/organisms/rxpad/template-store";

// ── Module context shape ─────────────────────────────────────────────────
//
// Whenever the doctor clicks Save or Template inside a module, the
// module passes a small context object identifying itself + a callback
// to apply rows back. The TemplateProvider stashes the latest context
// per moduleId so the sidebars can read fresh state without prop
// drilling.


























const TemplateContext = createContext(null);

const SSR_TEMPLATES = [];

export function TemplateProvider({ children }) {
  const templates = useSyncExternalStore(subscribeTemplates, getAllTemplates, () => SSR_TEMPLATES);

  const [openSidebar, setOpenSidebar] = useState(null);
  const [activeModule, setActiveModule] = useState(null);

  const openSaveTemplate = useCallback((ctx) => {
    setActiveModule(ctx);
    setOpenSidebar("save");
  }, []);

  const openTemplatesList = useCallback((ctx) => {
    setActiveModule(ctx);
    setOpenSidebar("list");
  }, []);

  const closeSidebar = useCallback(() => {
    setOpenSidebar(null);
    // Don't drop activeModule immediately — the close animation reads
    // it for the title fade-out. It gets overwritten on the next open.
  }, []);

  const value = useMemo(
    () => ({
      templates,
      openSidebar,
      activeModule,
      openSaveTemplate,
      openTemplatesList,
      closeSidebar
    }),
    [templates, openSidebar, activeModule, openSaveTemplate, openTemplatesList, closeSidebar]
  );

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

function useCtx() {
  const ctx = useContext(TemplateContext);
  if (!ctx) {
    return {
      templates: SSR_TEMPLATES,
      openSidebar: null,
      activeModule: null,
      openSaveTemplate: () => {},
      openTemplatesList: () => {},
      closeSidebar: () => {}
    };
  }
  return ctx;
}

export function useTemplateSidebars() {
  return useCtx();
}

export function useTemplatesForModule(moduleId) {
  const { templates } = useCtx();
  return useMemo(
    () =>
    templates.
    filter((t) => t.moduleId === moduleId).
    sort((a, b) => b.updatedAt - a.updatedAt),
    [templates, moduleId]
  );
}

// Helper hook that callers in EditableTableModule can use directly.
// Keeps the latest moduleCtx in a ref so onSaveClick / onTemplateClick
// callbacks always read fresh row state without React re-render cycles.
export function useModuleTemplateHandlers(
moduleId,
moduleName,
rows,
applyRows)
{
  const { openSaveTemplate, openTemplatesList } = useCtx();
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const applyRef = useRef(applyRows);
  applyRef.current = applyRows;

  const onSaveClick = useCallback(() => {
    openSaveTemplate({
      moduleId,
      moduleName,
      currentRows: rowsRef.current,
      applyRows: (r) => applyRef.current(r)
    });
  }, [moduleId, moduleName, openSaveTemplate]);

  const onTemplateClick = useCallback(() => {
    openTemplatesList({
      moduleId,
      moduleName,
      currentRows: rowsRef.current,
      applyRows: (r) => applyRef.current(r)
    });
  }, [moduleId, moduleName, openTemplatesList]);

  return { onSaveClick, onTemplateClick };
}