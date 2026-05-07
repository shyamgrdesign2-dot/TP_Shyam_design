"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Portal } from "@/src/hooks/ui/Portal";
import { LayoutGrid, Plus, Search } from "@/src/components/atoms/icons/lucide";

import {
  CUSTOM_MODULE_CAP } from

"@/src/components/organisms/rxpad/customise-store";
import {
  useCustomModules,
  useCustomModulesDrawer,
  useCustomiseMutators,
  useRxSectionConfig } from
"@/src/components/organisms/rxpad/customise-context";

import { SidebarHeader } from "@/src/components/molecules/SidebarHeader";
import { CustomModuleEditor } from "./CustomModuleEditor";
import { CustomModuleListItem } from "./CustomModuleListItem";
import { ModuleAtomIcon } from "./ModuleAtomIcon";

// ── Close icon (matches the customise sheet) ─────────────────────────────

function CloseSquareIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ color }}>
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" />
    </svg>);

}

// ── Gradient divider — same recipe as the home/visit-page top bar's NavDivider.
function DrawerGradientDivider() {
  return (
    <div
      aria-hidden
      className="shrink-0 opacity-80"
      style={{
        width: "1.05px",
        height: 36,
        background:
        "linear-gradient(to bottom, rgba(208,213,221,0.2) 0%, #d0d5dd 50%, rgba(208,213,221,0.2) 100%)"
      }} />);


}

// ── Drawer ───────────────────────────────────────────────────────────────

export function CustomModulesDrawer() {
  const { open, initialTab, editingId, closeDrawer } = useCustomModulesDrawer();
  const modules = useCustomModules();
  const rxConfig = useRxSectionConfig();
  const { addModule, updateModule, setRxConfig } = useCustomiseMutators();

  const [tab, setTab] = useState(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // ── Mount/animate ────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const id = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setIsVisible(false);
    const id = window.setTimeout(() => setIsMounted(false), 280);
    return () => window.clearTimeout(id);
  }, [open]);

  // ESC closes.
  useEffect(() => {
    if (!isMounted) return;
    const handler = (e) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMounted, closeDrawer]);

  // ── Editor wiring ────────────────────────────────────────────────────

  const editingModule = useMemo(
    () => editingId ? modules.find((m) => m.id === editingId) ?? null : null,
    [editingId, modules]
  );

  const existingNames = useMemo(
    () => modules.filter((m) => m.id !== editingId).map((m) => m.name),
    [modules, editingId]
  );

  const inRxIds = useMemo(
    () => new Set(rxConfig.filter((s) => s.id.startsWith("custom:")).map((s) => s.id.slice("custom:".length))),
    [rxConfig]
  );

  const editorRef = useRef(null);
  const [editorValid, setEditorValid] = useState(false);

  function handleAddExisting(moduleId) {
    const fullId = `custom:${moduleId}`;
    if (rxConfig.find((s) => s.id === fullId)) return;
    setRxConfig([
    ...rxConfig,
    { id: fullId, enabled: true, kind: "custom" }]
    );
  }

  function handleEditorSubmit(payload) {
    const iconPatch = {
      iconName: payload.icon?.name ?? null,
      iconStyle: payload.icon?.style ?? null,
      iconSvg: payload.icon?.svg ?? null
    };
    if (editingModule) {
      try {
        updateModule(editingModule.id, {
          name: payload.name,
          fields: payload.fields.map((f) => ({ label: f.label, kind: "text" })),
          ...iconPatch
        });
      } catch {
        return;
      }
    } else {
      try {
        addModule({
          name: payload.name,
          fields: payload.fields.map((f) => ({ label: f.label, kind: "text" })),
          ...iconPatch
        });
      } catch {
        return;
      }
    }
    closeDrawer();
  }

  // Header CTA fires the editor's imperative submit.
  function handleHeaderSubmit() {
    editorRef.current?.submit();
  }

  if (!isMounted) return null;

  const cap = modules.length >= CUSTOM_MODULE_CAP;
  const isEditingMode = !!editingModule;
  const isCreatingMode = !isEditingMode && tab === "create";
  const submitLabel = isEditingMode ? "Save Changes" : "Create Module";

  return (
    // Portal to document.body — critical so this drawer escapes any CSS stacking
    // context in the parent tree and competes at document level with the
    // Sidebar-molecule portal (z-160/161). Layer 2: z-[162]/z-[163].
    <Portal>
      <>
      {/* Backdrop — layer 2 (opened from within RxCustomiseSidebar which is layer 1).
           Rule: sidebars opened from within another sidebar use z-[162]/z-[163].
           See Sidebar molecule for the full stacking contract. */}
      <div
        aria-hidden
        onClick={closeDrawer}
        className={`fixed inset-0 z-[162] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`
        } />

      {/* Slide-in panel — layer 2: z-[163]. 70% desktop / 75% iPad / 94vw mobile */}
      <aside
        role="dialog"
        aria-label="Custom modules"
        aria-hidden={!isVisible}
        className={`fixed right-0 top-0 z-[163] flex h-full w-[94vw] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:w-[75vw] lg:w-[70vw] ${
        isVisible ? "translate-x-0" : "translate-x-full"}`
        }>
        
        {/* Header — close X | divider | title | (right) CTAs */}
        <SidebarHeader
          onClose={closeDrawer}
          closeAriaLabel="Close custom modules drawer"
          closeIcon={<CloseSquareIcon size={24} />}
          titlePrefix={
            <span className="my-auto inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-tp-blue-50 text-tp-blue-500">
              <ModuleAtomIcon size={18} />
            </span>
          }
          title={isEditingMode ? "Edit Custom Module" : "Custom Modules"}
          actionsDivider={(isCreatingMode || isEditingMode) ? <DrawerGradientDivider /> : null}
          actions={(isCreatingMode || isEditingMode) ? (
            <>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] border border-tp-blue-300 bg-white px-[16px] text-[13px] font-semibold text-tp-blue-500 transition-colors hover:bg-tp-blue-50 active:scale-[0.98]">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHeaderSubmit}
                disabled={!editorValid}
                className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] bg-tp-blue-500 px-[16px] text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tp-blue-500">
                {submitLabel}
              </button>
            </>
          ) : null}
        />

        {/* Tabs (hidden in edit mode) — icons + blue selected text + blue divider */}
        {!isEditingMode &&
        <div className="relative flex shrink-0 border-b border-tp-slate-100">
            <button
            type="button"
            onClick={() => setTab("select")}
            className={`relative inline-flex flex-1 items-center justify-center gap-[8px] px-[16px] py-[14px] text-[13px] font-semibold transition-colors ${
            tab === "select" ? "text-tp-blue-500" : "text-tp-slate-500 hover:text-tp-slate-700"}`
            }>
            
              <LayoutGrid size={14} strokeWidth={1.5} />
              Select Existing
              {tab === "select" &&
            <span aria-hidden className="absolute inset-x-[12px] bottom-0 h-[2px] rounded-t-full bg-tp-blue-500" />
            }
            </button>
            <button
            type="button"
            onClick={() => setTab("create")}
            disabled={cap}
            className={`relative inline-flex flex-1 items-center justify-center gap-[8px] px-[16px] py-[14px] text-[13px] font-semibold transition-colors ${
            tab === "create" ? "text-tp-blue-500" : "text-tp-slate-500 hover:text-tp-slate-700"} disabled:cursor-not-allowed disabled:opacity-40`
            }
            title={cap ? "15-module cap reached" : undefined}>
            
              <Plus size={14} strokeWidth={2} />
              Create New
              {tab === "create" &&
            <span aria-hidden className="absolute inset-x-[12px] bottom-0 h-[2px] rounded-t-full bg-tp-blue-500" />
            }
            </button>
          </div>
        }

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {isEditingMode ?
          <CustomModuleEditor
            ref={editorRef}
            initial={{ name: editingModule.name, fields: editingModule.fields }}
            existingNames={existingNames}
            onSubmit={handleEditorSubmit}
            onValidityChange={setEditorValid} /> :

          tab === "create" ?
          <CustomModuleEditor
            ref={editorRef}
            existingNames={existingNames}
            onSubmit={handleEditorSubmit}
            onValidityChange={setEditorValid} /> :


          <SelectExistingPane
            modules={modules}
            inRxIds={inRxIds}
            onAdd={handleAddExisting}
            onCreateNew={() => setTab("create")}
            cap={cap} />

          }
        </div>
      </aside>
    </>
    </Portal>
  );

}

// ── Select-existing pane — search + list, no footer ──────────────────────

function SelectExistingPane({
  modules,
  inRxIds,
  onAdd,
  onCreateNew,
  cap






}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const sorted = [...modules].sort((a, b) => b.createdAt - a.createdAt);
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((m) => {
      if (m.name.toLowerCase().includes(q)) return true;
      return m.fields.some((f) => f.label.toLowerCase().includes(q));
    });
  }, [modules, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Search bar */}
      <div className="shrink-0 border-b border-tp-slate-100 px-[20px] py-[14px]">
        <div className="relative">
          <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-tp-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by module name or column label"
            className="w-full rounded-[10px] border border-tp-slate-200 bg-white py-[10px] pl-[36px] pr-[12px] text-[13px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none" />
          
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-[20px] py-[18px]">
        {filtered.length === 0 ?
        modules.length === 0 ?
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-[20px] py-[40px] text-center">
              <div className="text-[14px] font-semibold text-tp-slate-700">No custom modules yet</div>
              <div className="mt-[4px] max-w-[320px] text-[13px] text-tp-slate-500">
                Create one in the next tab to add a new section to your Rx pad.
              </div>
              <button
            type="button"
            onClick={onCreateNew}
            disabled={cap}
            className="mt-[16px] inline-flex h-[36px] items-center rounded-[10px] bg-tp-blue-500 px-[16px] text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-tp-blue-500">
            
                + Create New Module
              </button>
            </div> :

        <div className="rounded-[12px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-[16px] py-[24px] text-center text-[13px] text-tp-slate-500">
              No modules match &quot;{query}&quot;.
            </div> :


        <div className="space-y-[10px]">
            {filtered.map((m) =>
          <CustomModuleListItem
            key={m.id}
            module={m}
            added={inRxIds.has(m.id)}
            onAdd={() => onAdd(m.id)} />

          )}
          </div>
        }
      </div>
    </div>);

}