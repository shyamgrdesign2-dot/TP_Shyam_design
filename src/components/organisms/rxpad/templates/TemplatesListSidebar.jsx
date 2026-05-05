"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search, Trash2 } from "@/src/components/atoms/icons/lucide";

import { deleteTemplate } from "@/src/components/organisms/rxpad/template-store";
import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";

import { useTemplateSidebars, useTemplatesForModule } from "./template-context";
import { CloseSquareIcon } from "./shared";

export function TemplatesListSidebar() {
  const { openSidebar, activeModule, closeSidebar } = useTemplateSidebars();
  const isOpen = openSidebar === "list" && !!activeModule;

  const moduleId = activeModule?.moduleId ?? "";
  const moduleName = activeModule?.moduleName ?? "";

  // ── Mount/animate ────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const id = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setIsVisible(false);
    const id = window.setTimeout(() => setIsMounted(false), 280);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const handler = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMounted, closeSidebar]);

  const templates = useTemplatesForModule(moduleId);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen, moduleId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, query]);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const confirmTarget = useMemo(
    () => templates.find((t) => t.id === confirmDeleteId) ?? null,
    [confirmDeleteId, templates]
  );

  function handleApply(t) {
    activeModule?.applyRows(t.rows);
    closeSidebar();
  }

  function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    deleteTemplate(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  if (!isMounted) return null;

  return (
    <>
      {/* Confirm-delete dialog */}
      <TPConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="Delete this template?"
        warning={
        confirmTarget ?
        `Deleting "${confirmTarget.name}" removes the saved rows under this template. This action cannot be undone.` :
        ""
        }
        primaryLabel="Delete Template"
        primaryTone="destructive"
        onPrimary={handleConfirmDelete}
        secondaryLabel="Cancel"
        onSecondary={() => setConfirmDeleteId(null)} />
      

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={closeSidebar}
        className={`fixed inset-0 z-[170] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`
        } />
      

      {/* Slide-in panel */}
      <aside
        role="dialog"
        aria-label={`${moduleName} templates`}
        aria-hidden={!isVisible}
        className={`fixed right-0 top-0 z-[171] flex h-full w-[94vw] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:w-[75vw] lg:w-[480px] ${
        isVisible ? "translate-x-0" : "translate-x-full"}`
        }>
        
        {/* Header */}
        <header className="flex h-[56px] shrink-0 items-stretch justify-between gap-[12px] border-b border-tp-slate-100 px-[16px]">
          <div className="flex min-w-0 items-stretch gap-[12px]">
            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Close templates list"
              className="my-auto flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-700 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900 active:scale-[0.96]">

              <CloseSquareIcon size={24} />
            </button>
            <span aria-hidden className="w-px shrink-0 self-stretch bg-tp-slate-200" />
            <span className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-tp-blue-50 text-tp-blue-500">
              <ClipboardList size={16} strokeWidth={1.5} />
            </span>
            <h3 className="truncate text-[16px] font-semibold tracking-[-0.1px] text-tp-slate-800">
              {moduleName} Templates
            </h3>
          </div>
        </header>

        {/* Search */}
        <div className="shrink-0 border-b border-tp-slate-100 px-[20px] py-[14px]">
          <div className="relative">
            <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-tp-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${moduleName.toLowerCase()} templates`}
              className="w-full rounded-[10px] border border-tp-slate-200 bg-white py-[10px] pl-[36px] pr-[12px] text-[13px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none" />
            
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-[20px] py-[18px]">
          {filtered.length === 0 ?
          templates.length === 0 ?
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-[20px] py-[40px] text-center">
                <span className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-tp-blue-50 text-tp-blue-500">
                  <ClipboardList size={20} strokeWidth={1.5} />
                </span>
                <div className="mt-[10px] text-[14px] font-semibold text-tp-slate-700">
                  No saved {moduleName.toLowerCase()} templates yet
                </div>
                <div className="mt-[4px] max-w-[300px] text-[13px] text-tp-slate-500">
                  Add some rows in the {moduleName} section, then click <strong className="font-semibold text-tp-slate-700">Save</strong> to capture them as a reusable template.
                </div>
              </div> :

          <div className="rounded-[12px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-[16px] py-[24px] text-center text-[13px] text-tp-slate-500">
                No templates match &quot;{query.trim()}&quot;.
              </div> :


          <div className="space-y-[10px]">
              {filtered.map((t) =>
            <div
              key={t.id}
              className="flex items-center gap-[12px] rounded-[12px] border border-tp-slate-200 bg-white px-[14px] py-[12px]">
              
                  <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-tp-blue-50 text-tp-blue-500">
                    <ClipboardList size={18} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-tp-slate-800">{t.name}</p>
                    <p className="mt-[2px] truncate text-[12px] text-tp-slate-500">
                      {t.rows.length} {t.rows.length === 1 ? "row" : "rows"} · updated{" "}
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                type="button"
                onClick={() => handleApply(t)}
                className="inline-flex h-[32px] items-center rounded-[8px] bg-tp-blue-500 px-[12px] text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600 active:scale-[0.98]">
                
                    Apply
                  </button>
                  <button
                type="button"
                aria-label={`Delete ${t.name}`}
                onClick={() => setConfirmDeleteId(t.id)}
                className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-tp-slate-400 transition-colors hover:bg-tp-error-50 hover:text-tp-error-500">
                
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
            )}
            </div>
          }
        </div>
      </aside>
    </>);

}