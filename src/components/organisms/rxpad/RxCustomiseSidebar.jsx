"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, MoreHorizontal } from "@/src/components/atoms/icons/lucide";
import { toast } from "@/src/components/molecules/Toaster";

import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { TutorialPlayIcon } from "@/src/components/atoms/TutorialPlayIcon/TutorialPlayIcon";
import { Note1, DocumentText, Ruler, Eye } from "iconsax-reactjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";

import {
  CUSTOM_MODULE_CAP } from





"@/src/components/organisms/rxpad/customise-store";
import {
  useCustomModules,
  useCustomModulesDrawer,
  useCustomiseMutators,
  useRxSectionConfig,
  useSidebarConfig } from
"@/src/components/organisms/rxpad/customise-context";
import { CustomModulesDrawer } from "@/src/components/organisms/rxpad/custom-modules";
import { ModuleIcon } from "@/src/components/organisms/rxpad/custom-modules/ModuleIcon";

// ── Solid close-square icon (same glyph used in RxPreviewSidebar) ──────────
function CloseSquareIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ color }}>
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" />
    </svg>);

}

// ── Section config types — kept for backwards-compat with consumers that
//    import the old shapes (e.g. RxPadFunctional's prop fallback). ───────
















const SECTION_META = {
  symptoms: { label: "Symptoms", iconName: "Virus" },
  examinations: { label: "Examinations", iconName: "medical service" },
  diagnosis: { label: "Diagnosis", iconName: "Diagnosis" },
  medication: { label: "Medication (Rx)", iconName: "Tablets" },
  advice: { label: "Advices", iconName: "health care" },
  lab: { label: "Lab Investigation", iconName: "Test Tube" },
  surgery: { label: "Surgery", iconName: "surgical-scissors-02" }
};

export const DEFAULT_SECTION_CONFIG =
Object.keys(SECTION_META).
map((id) => ({ id, label: SECTION_META[id].label, enabled: true }));

// ── Sidebar item meta (icon + label) ─────────────────────────────────────
//
// Mirrors NavPanel.tsx so the sheet's left column shows the same labels +
// icons as the live sidebar. Keeping this in lock-step is fine here — it's
// a small enum.



const SIDEBAR_META = {
  pastVisits: { label: "Past Visits", iconKind: "iconsax", IconsaxIcon: Note1 },
  vitals: { label: "Vitals", iconKind: "medical", iconName: "Heart Rate" },
  history: { label: "History", iconKind: "medical", iconName: "clipboard-activity" },
  labResults: { label: "Lab Results", iconKind: "medical", iconName: "Lab" },
  medicalRecords: { label: "Records", iconKind: "medical", iconName: "health-file-03" },
  gynec: { label: "Gynec", iconKind: "medical", iconName: "Gynec" },
  obstetric: { label: "Obstetric", iconKind: "medical", iconName: "Obstetric" },
  vaccine: { label: "Vaccine", iconKind: "medical", iconName: "injection" },
  growth: { label: "Growth", iconKind: "iconsax", IconsaxIcon: Ruler },
  optal: { label: "Ophthal", iconKind: "iconsax", IconsaxIcon: Eye },
  personalNotes: { label: "Private Notes", iconKind: "iconsax", IconsaxIcon: DocumentText }
};

function SidebarRowIcon({ id }) {
  const meta = SIDEBAR_META[id];
  // Defensive: if a stored layout references a section that's been
  // retired or not yet registered in SIDEBAR_META, render an empty
  // placeholder rather than crashing on `meta.iconKind`.
  if (!meta) {
    return (
      <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-tp-blue-50" />
    );
  }
  return (
    <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-tp-blue-50">
      {meta.iconKind === "medical" && meta.iconName ?
      <TPMedicalIcon name={meta.iconName} variant="bulk" size={20} color="var(--tp-blue-500)" /> :
      meta.IconsaxIcon ?
      <meta.IconsaxIcon size={20} variant="Bulk" color="var(--tp-blue-500)" strokeWidth={1.5} /> :
      null}
    </span>);

}

// ── Inline toggle switch ────────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  disabled




}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-blue-400 focus-visible:ring-offset-2 ${
      disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${
      checked ? "bg-tp-blue-500" : "bg-tp-slate-300"}`}>
      
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.22)] transition-transform duration-200 ${
        checked ? "translate-x-[22px]" : "translate-x-[3px]"}`
        } />
      
    </button>);

}

// ── Reorderable list hook (HTML5 drag) ───────────────────────────────────
//
// Extracted so both columns share the same drag affordance. Returns the
// drag handlers + the dragOverId state for visual feedback.

function useReorderableList(
items,
setItems)
{
  const draggingId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  function handleDragStart(id) {
    draggingId.current = id;
  }
  function handleDragOver(e, id) {
    e.preventDefault();
    if (draggingId.current && draggingId.current !== id) setDragOverId(id);
  }
  function handleDrop(targetId) {
    const from = draggingId.current;
    if (!from || from === targetId) {
      draggingId.current = null;
      setDragOverId(null);
      return;
    }
    const fromIdx = items.findIndex((s) => s.id === from);
    const toIdx = items.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setItems(next);
    draggingId.current = null;
    setDragOverId(null);
  }
  function handleDragEnd() {
    draggingId.current = null;
    setDragOverId(null);
  }
  return { dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}

// ── Public props (kept for backwards-compat — open/onClose still drive
//    the sheet from the page; sectionConfig + onSave are now optional and
//    only used as initial seeds for legacy callers). ──────────────────










// ── Component ───────────────────────────────────────────────────────────────

export function RxCustomiseSidebar({
  open,
  onClose,
  onSave
}) {
  // Animation state — same pattern as RxPreviewSidebar.
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const id = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setIsVisible(false);
    const id = window.setTimeout(() => setIsMounted(false), 300);
    return () => window.clearTimeout(id);
  }, [open]);

  // ESC closes.
  useEffect(() => {
    if (!isMounted) return;
    const handler = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMounted, onClose]);

  // ── Live config from the customise store ─────────────────────────────
  const liveSidebar = useSidebarConfig();
  const liveRxpad = useRxSectionConfig();
  const customModules = useCustomModules();
  const { setSidebarConfig, setRxConfig, resetLayoutToDefaults, deleteModule } = useCustomiseMutators();
  const { openDrawer: openCustomModulesDrawer } = useCustomModulesDrawer();

  // Local draft state — seeded on each open. Save commits to the store.
  const [draftSidebar, setDraftSidebar] = useState(liveSidebar);
  const [draftRxpad, setDraftRxpad] = useState(liveRxpad);
  useEffect(() => {
    if (open) {
      setDraftSidebar(liveSidebar.map((s) => ({ ...s })));
      setDraftRxpad(liveRxpad.map((s) => ({ ...s })));
    }
  }, [open, liveSidebar, liveRxpad]);

  // Reflect in-flight module additions (created via the drawer while the
  // sheet is open) into the draft so the new row appears immediately.
  useEffect(() => {
    if (!open) return;
    setDraftRxpad((prev) => {
      const seen = new Set(prev.map((s) => s.id));
      const next = [...prev];
      for (const cm of customModules) {
        const fullId = `custom:${cm.id}`;
        if (!seen.has(fullId)) {
          next.push({ id: fullId, enabled: true, kind: "custom" });
        }
      }
      // Drop drafts whose underlying module was deleted via the More menu.
      return next.filter((s) => {
        if (!s.id.startsWith("custom:")) return true;
        const cid = s.id.slice("custom:".length);
        return customModules.some((m) => m.id === cid);
      });
    });
  }, [open, customModules]);

  const sidebarReorder = useReorderableList(draftSidebar, setDraftSidebar);
  const rxpadReorder = useReorderableList(draftRxpad, setDraftRxpad);

  // ── Toggle handlers (per-side validation: keep ≥1 enabled) ─────────────

  const sidebarEnabledCount = draftSidebar.filter((s) => s.enabled).length;
  const rxpadEnabledCount = draftRxpad.filter((s) => s.enabled).length;

  function toggleSidebar(id) {
    const current = draftSidebar.find((s) => s.id === id);
    if (!current) return;
    if (current.enabled && sidebarEnabledCount <= 1) {
      toast.error("At least one sidebar section must remain enabled");
      return;
    }
    setDraftSidebar((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  function toggleRxpad(id) {
    const current = draftRxpad.find((s) => s.id === id);
    if (!current) return;
    if (current.enabled && rxpadEnabledCount <= 1) {
      toast.error("At least one Rx pad section must remain enabled");
      return;
    }
    setDraftRxpad((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  // ── Per-row More menu (custom modules) ────────────────────────────────

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const moduleById = useMemo(
    () => Object.fromEntries(customModules.map((m) => [m.id, m])),
    [customModules]
  );

  function removeFromRxPad(customId) {
    const fullId = `custom:${customId}`;
    setDraftRxpad((prev) => prev.filter((s) => s.id !== fullId));
  }

  function handleEditModule(customId) {
    openCustomModulesDrawer({ editingId: customId });
  }

  function handleDeleteModuleConfirm() {
    if (!confirmDeleteId) return;
    try {
      deleteModule(confirmDeleteId);
    } catch {

      // hasBeenUsed — guard. Should not reach here because menu is disabled.
    }setDraftRxpad((prev) => prev.filter((s) => s.id !== `custom:${confirmDeleteId}`));
    setConfirmDeleteId(null);
  }

  // ── Save / Reset ──────────────────────────────────────────────────────

  const canSave = sidebarEnabledCount >= 1 && rxpadEnabledCount >= 1;

  function handleSave() {
    if (!canSave) return;
    setSidebarConfig(draftSidebar);
    setRxConfig(draftRxpad);
    // Backwards-compat: emit the legacy callback if a caller wired it.
    onSave?.(
      draftRxpad.
      filter((s) => s.kind !== "custom").
      map((s) => ({
        id: s.id,
        label: SECTION_META[s.id]?.label ?? s.id,
        enabled: s.enabled
      }))
    );
    onClose();
  }

  function handleReset() {
    resetLayoutToDefaults();
    // The store mutator pushed new state; the next open will reseed drafts.
    // For immediate visual feedback while the sheet is open, also pull
    // the new config into the drafts now.
    setDraftSidebar(liveSidebar.map((s) => ({ ...s })));
    setDraftRxpad(liveRxpad.map((s) => ({ ...s })));
    toast.success("Layout reset to defaults");
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (!isMounted) return null;

  return (
    <>
      {/* Custom modules drawer mount — lives here so closing the customise
           sheet doesn't tear it down mid-edit. The drawer animates above
           this sheet via z-[161]. */}
      <CustomModulesDrawer />

      {/* Confirm-delete dialog */}
      <TPConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="Delete this custom module?"
        warning={
        confirmDeleteId ?
        `Deleting "${moduleById[confirmDeleteId]?.name ?? "this module"}" removes the module and any rows you've filled in. This action cannot be undone.` :
        ""
        }
        primaryLabel="Delete Module"
        primaryTone="destructive"
        onPrimary={handleDeleteModuleConfirm}
        secondaryLabel="Cancel"
        onSecondary={() => setConfirmDeleteId(null)} />
      

      {/* Dimming backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[150] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`
        } />
      

      {/* Slide-in panel — 70% desktop, 75% iPad, 94vw mobile */}
      <aside
        role="dialog"
        aria-label="Customise your pad"
        aria-hidden={!isVisible}
        className={`fixed right-0 top-0 z-[151] flex h-full flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] w-[94vw] md:w-[75vw] lg:w-[70vw] ${
        isVisible ? "translate-x-0" : "translate-x-full"}`
        }>
        
        {/* ── Header ──────────────────────────────────────────────────── */}
        {/* Sidebar header convention (applies to every panel sidebar):
              – Close icon: 24px glyph in a 36px button.
              – Divider next to close icon: full header height (56px),
                solid slate-200, separates the close affordance from the
                title.
              – Tutorial icon: 36px glyph in the right-side rail.
              – Header CTAs: 36px height, 10px radius (small variant).  */}
        <header className="flex h-[56px] shrink-0 items-center justify-between gap-[12px] border-b border-tp-slate-100 px-[16px]">
          <div className="flex min-w-0 items-stretch gap-[12px]">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close customise panel"
              className="my-auto flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-700 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900 active:scale-[0.96]">

              <CloseSquareIcon size={24} />
            </button>
            <span aria-hidden className="w-px shrink-0 self-stretch bg-tp-slate-200" />
            <h3 className="my-auto truncate text-[16px] font-semibold tracking-[-0.1px] text-tp-slate-800">
              Customise Your Pad
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <button
              type="button"
              aria-label="Watch tutorial"
              className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-600 transition-colors hover:bg-tp-slate-100 active:scale-[0.96]">

              <TutorialPlayIcon size={36} />
            </button>
            <NavGradientDivider />
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] border border-tp-blue-300 bg-white px-[14px] text-[13px] font-semibold text-tp-blue-500 transition-colors hover:bg-tp-blue-50 active:scale-[0.98]">

              Reset to default
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] bg-tp-blue-500 px-[14px] text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tp-blue-500">

              Save Changes
            </button>
          </div>
        </header>

        {/* ── Body — single grey-shaded container holding two columns ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
          <div className="grid grid-cols-1 gap-[16px] rounded-[16px] bg-tp-slate-50 p-[16px] md:grid-cols-2">
          {/* Left column — Sidebar Sections */}
          <CustomisePanel
              title="Sidebar Sections"
              subtitle="Reorder or hide sections in the secondary navigation."
              enabledCount={sidebarEnabledCount}
              totalCount={draftSidebar.length}>
              
            {draftSidebar.map((row) => {
                const meta = SIDEBAR_META[row.id];
                const isDragOver = sidebarReorder.dragOverId === row.id;
                return (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={() => sidebarReorder.handleDragStart(row.id)}
                    onDragOver={(e) => sidebarReorder.handleDragOver(e, row.id)}
                    onDrop={() => sidebarReorder.handleDrop(row.id)}
                    onDragEnd={sidebarReorder.handleDragEnd}
                    className={`flex items-center gap-[12px] rounded-[14px] border bg-white px-[14px] py-[12px] transition-all duration-150 ${
                    isDragOver ?
                    "border-tp-blue-300 shadow-[0_0_0_2px_rgba(99,102,241,0.12)]" :
                    "border-tp-slate-100"} ${
                    !row.enabled ? "opacity-60" : ""}`}>
                    
                  <GripVertical size={18} strokeWidth={1.5} className="shrink-0 cursor-grab text-tp-slate-400 active:cursor-grabbing" />
                  <SidebarRowIcon id={row.id} />
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-tp-slate-800">
                    {meta?.label ?? row.id}
                  </span>
                  <ToggleSwitch
                      checked={row.enabled}
                      onChange={() => toggleSidebar(row.id)} />
                    
                </div>);

              })}
          </CustomisePanel>

          {/* Right column — Rx Pad Sections */}
          <CustomisePanel
              title="Rx Pad Sections"
              subtitle="Reorder, hide, or add custom modules to the Rx pad."
              enabledCount={rxpadEnabledCount}
              totalCount={draftRxpad.length}
              footer={
              <button
                type="button"
                onClick={() => openCustomModulesDrawer({ initialTab: "select" })}
                disabled={customModules.length >= CUSTOM_MODULE_CAP}
                title={
                customModules.length >= CUSTOM_MODULE_CAP ?
                "15-module cap reached. Delete a module to add more." :
                undefined
                }
                className="inline-flex h-[40px] w-full items-center justify-center gap-[6px] rounded-[12px] border border-dashed border-tp-blue-300 bg-tp-blue-50/30 text-[14px] font-semibold text-tp-blue-600 transition-colors hover:bg-tp-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-tp-blue-50/30">
                
                <span aria-hidden>+</span>
                Add Custom Module
              </button>
              }>
              
            {draftRxpad.map((row) => {
                const isDragOver = rxpadReorder.dragOverId === row.id;
                const isCustom = row.kind === "custom" || row.id.startsWith("custom:");
                const customId = isCustom ? row.id.slice("custom:".length) : null;
                const customDef = customId ? moduleById[customId] : undefined;
                const builtinMeta = !isCustom ? SECTION_META[row.id] : undefined;
                const label = isCustom ?
                customDef?.name ?? "Custom module" :
                builtinMeta?.label ?? row.id;
                const disabled = !!(customDef && customDef.hasBeenUsed);
                return (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={() => rxpadReorder.handleDragStart(row.id)}
                    onDragOver={(e) => rxpadReorder.handleDragOver(e, row.id)}
                    onDrop={() => rxpadReorder.handleDrop(row.id)}
                    onDragEnd={rxpadReorder.handleDragEnd}
                    className={`flex items-center gap-[12px] rounded-[14px] border bg-white px-[14px] py-[12px] transition-all duration-150 ${
                    isDragOver ?
                    "border-tp-blue-300 shadow-[0_0_0_2px_rgba(99,102,241,0.12)]" :
                    "border-tp-slate-100"} ${
                    !row.enabled ? "opacity-60" : ""}`}>
                    
                  <GripVertical size={18} strokeWidth={1.5} className="shrink-0 cursor-grab text-tp-slate-400 active:cursor-grabbing" />
                  <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-tp-violet-50">
                    {isCustom ?
                      <ModuleIcon module={customDef ?? null} size={20} color="var(--tp-violet-500)" /> :
                      builtinMeta ?
                      <TPMedicalIcon name={builtinMeta.iconName} variant="bulk" size={20} color="var(--tp-violet-500)" /> :
                      null}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-tp-slate-800">
                    <span className="block truncate">{label}</span>
                    {isCustom &&
                      <span className="mt-[2px] inline-flex items-center gap-[4px] text-[11px] font-medium text-tp-violet-500">
                        Custom · {customDef?.fields.length ?? 0} {(customDef?.fields.length ?? 0) === 1 ? "column" : "columns"}
                      </span>
                      }
                  </span>
                  <ToggleSwitch
                      checked={row.enabled}
                      onChange={() => toggleRxpad(row.id)} />
                    
                  {isCustom && customId &&
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`More actions for ${label}`}
                          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-500 transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-700">
                          
                          <MoreHorizontal size={18} strokeWidth={1.5} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => removeFromRxPad(customId)}>
                          Remove from Rx Pad
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={disabled}
                          onClick={(e) => {
                            if (disabled) return;
                            handleEditModule(customId);
                          }}>
                          
                          Edit Module
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={disabled}
                          variant="destructive"
                          onClick={(e) => {
                            if (disabled) return;
                            setConfirmDeleteId(customId);
                          }}>
                          
                          Delete Module
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    }
                </div>);

              })}
          </CustomisePanel>
          </div>
        </div>

      </aside>
    </>);

}

// ── Gradient divider — same recipe as the home/visit-page top bar's NavDivider.
function NavGradientDivider() {
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

// ── Inner column component ───────────────────────────────────────────────

function CustomisePanel({
  title,
  subtitle,
  enabledCount,
  totalCount,
  children,
  footer







}) {
  return (
    <section className="flex min-h-0 flex-col rounded-[14px] bg-white p-[14px] ring-1 ring-tp-slate-100">
      <div className="mb-[12px] flex items-start justify-between gap-[8px]">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-tp-slate-800">{title}</p>
          <p className="mt-[2px] text-[12px] text-tp-slate-500">{subtitle}</p>
        </div>
        <span className="inline-flex h-[22px] min-w-[28px] items-center justify-center rounded-full bg-white px-[8px] text-[12px] font-semibold text-tp-blue-600 ring-1 ring-tp-blue-100">
          {enabledCount}/{totalCount}
        </span>
      </div>
      <div className="space-y-[8px]">{children}</div>
      {footer && <div className="mt-[12px]">{footer}</div>}
    </section>);

}