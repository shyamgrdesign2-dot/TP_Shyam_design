/**
 * AddEditPlanDrawer — Create or edit a treatment plan.
 *
 * Layout:
 *   - Header: [✕ close] | divider (full height) | "Create Treatment Plan" | [Create Plan CTA]
 *   - Plan Name: simple input (flush with header, no gap) — h-[42px]
 *   - Services: cluster card matching EntryTab procedures table
 *     - Table with padding, corner radius, stroke (NOT edge-to-edge)
 *     - ToothPicker styled like SurfacePicker (no inner border)
 *     - SurfacePicker dropdown uses createPortal to avoid clipping
 *     - All row heights h-[42px]
 *   - Sticky bottom: Total estimate
 *   - Background: bg-tp-slate-100
 */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { Eraser } from "iconsax-reactjs";
import { ConfigProvider } from "antd";
import { ExaminationTemplateActions } from "../examination/ExaminationTemplateActions";
import { createPortal } from "react-dom";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { TPMedicalIcon } from "../tp-ui/medical-icons/TPMedicalIcon";
import { usePlanContext } from "./plan-context";
import {
  DrawerHeader,
  formatINR,
  PLAN_DRAWER_WIDE_PANEL_CLASS,
} from "./plan-shared";
import { genId } from "./plan-types";
import { getDefaultPlanSurfaces } from "./plan-types";
import { fdiToLabel, buildExamSuggestions } from "./exam-suggestions";
import {
  getUniqueDentalBillItems,
  mapApiBillItemToDentalCatalog,
  sortDentalBillItemsForSearch,
} from "../lib/billing-catalog";
import { useBillingCatalog } from "../lib/useBillingCatalog";
import { searchDentalBillItems } from "../../../pages/opdBilling/service";
import ServiceItemPopup from "../../../pages/opdBilling/components/serviceItemPopup/ServiceItemPopup";
import { useDirtyDrawerGuard } from "./use-dirty-drawer-guard";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import { PlanServiceTable } from "./PlanServiceTable";
import { PlanSearchDropdown } from "./PlanSearchDropdown";
import {
  createRow,
  fanOutServices,
  computeTotalAmount,
  rowsToTemplatePayload,
  rowsToServiceTemplatePayload,
  mergeTemplateRows,
} from "./lib/planFormHelpers";
import { useTreatmentPlanTemplates } from "./lib/useTreatmentPlanTemplates";
import styles from "./AddEditPlanDrawer.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

// Radix Sheet overlay sits at z-index 10000; antd popups default to ~1030.
// Raise antd's base so template popovers render above the overlay.
const ABOVE_DRAWER_THEME = { token: { zIndexPopupBase: 10001 } };

// ─── Component ───────────────────────────────────────────────────────────────

export function AddEditPlanDrawer() {
  const { items: billingItems, addItem: addBillingCatalogItem } =
    useBillingCatalog();
  const isChikitsalayAccessable = useChikitsalay();
  const dentalBillItems = useMemo(
    () => getUniqueDentalBillItems(billingItems),
    [billingItems]
  );
  const [apiDentalBillItems, setApiDentalBillItems] = useState([]);
  const [apiDentalLoading, setApiDentalLoading] = useState(false);
  const apiDentalReqIdRef = useRef(0);
  const [catalogDentalDrawerOpen, setCatalogDentalDrawerOpen] = useState(false);
  const [catalogDentalInitialName, setCatalogDentalInitialName] = useState("");
  const {
    state,
    createPlan,
    updatePlan,
    closeDrawer,
    patientId: planPatientId,
    showSnackbar,
  } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "add-plan" || drawer.type === "edit-plan";
  const isEdit = drawer.type === "edit-plan";
  const editPlanId = isEdit ? drawer.planId : null;
  const editPlan = editPlanId
    ? state.plans.find((p) => p.id === editPlanId)
    : null;

  const [planName, setPlanName] = useState("");
  const [rows, setRows] = useState([]);
  // Plan-level additional discount (flat ₹, applied over the sum of
  // service-level amounts). Stored as a string in the input so empty = 0.
  const [additionalDiscount, setAdditionalDiscount] = useState("");

  // Active-cell state — gives each Services-table cell an input-shell
  // focus ring matching the TP design system (see AddProcedureDrawer).
  const [activeCell, setActiveCell] = useState(null);
  const setCellActive = useCallback((rowId, colKey) => {
    setActiveCell({ rowId, colKey });
  }, []);
  const clearCellActive = useCallback((rowId, colKey) => {
    window.setTimeout(() => {
      setActiveCell((current) =>
        current && current.rowId === rowId && current.colKey === colKey
          ? null
          : current
      );
    }, 80);
  }, []);
  const isCellActive = useCallback(
    (rowId, colKey) =>
      activeCell?.rowId === rowId && activeCell?.colKey === colKey,
    [activeCell]
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 260,
    placement: "below",
    bottom: undefined,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownPos = useCallback(() => {
    if (!searchRef.current) return;
    const rect = searchRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const width = Math.max(rect.width, 400);
    const left = Math.max(8, Math.min(rect.left, vw - width - 8));
    const GAP = 4;
    const MARGIN = 8;
    const HEADER_H = 40;
    const MIN_LIST_H = 80;
    const PREFERRED_LIST_H = 260;
    const spaceBelow = vh - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;
    const openBelow = spaceBelow >= spaceAbove;
    const available = openBelow ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(
      MIN_LIST_H,
      Math.min(PREFERRED_LIST_H, available - HEADER_H)
    );

    if (openBelow) {
      setDropdownPos({
        top: rect.bottom + GAP,
        bottom: undefined,
        left,
        width,
        maxHeight,
        placement: "below",
      });
    } else {
      setDropdownPos({
        top: undefined,
        bottom: vh - rect.top + GAP,
        left,
        width,
        maxHeight,
        placement: "above",
      });
    }
  }, []);

  const fetchDentalServices = useCallback(async (query) => {
    const reqId = ++apiDentalReqIdRef.current;
    setApiDentalLoading(true);
    try {
      const raw = await searchDentalBillItems(query);
      if (apiDentalReqIdRef.current !== reqId) return;
      const mapped = (raw || [])
        .map((item) => mapApiBillItemToDentalCatalog(item))
        .filter(Boolean);
      // De-dupe by case-insensitive name
      const seen = new Set();
      const unique = [];
      for (const t of mapped) {
        const key = String(t?.name ?? "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(t);
      }
      setApiDentalBillItems(unique);
    } catch (e) {
      // Non-blocking; keep previous data (or fallback to local catalog)
      if (apiDentalReqIdRef.current === reqId) {
        setApiDentalBillItems([]);
      }
      // eslint-disable-next-line no-console
      console.error("Failed to fetch dental services:", e);
    } finally {
      if (apiDentalReqIdRef.current === reqId) setApiDentalLoading(false);
    }
  }, []);

  const planTpl = useTreatmentPlanTemplates("plan");
  const serviceTpl = useTreatmentPlanTemplates("service");

  const applyTemplate = useCallback((tpl, tplHook) => {
    tplHook.apply(tpl, (payload) => {
      setRows((prev) => mergeTemplateRows(payload, prev));
      setPlanName((prevName) => {
        if (!prevName.trim()) return tpl.name;
        return prevName;
      });
      if (payload.additionalDiscount !== undefined) {
        setAdditionalDiscount(String(payload.additionalDiscount));
      }
    });
  }, []);

  const patientId = planPatientId ?? state.plans[0]?.patientId ?? "apt-1";
  const [examSuggestionTick, setExamSuggestionTick] = useState(0);
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const onChart = (e) => {
      if (e.detail?.patientId === patientId)
        setExamSuggestionTick((t) => t + 1);
    };
    window.addEventListener("dental-exam-chart-updated", onChart);
    return () => {
      window.removeEventListener("dental-exam-chart-updated", onChart);
    };
  }, [isOpen, patientId]);

  const examSuggestions = useMemo(
    () =>
      buildExamSuggestions(patientId).map((s) => ({
        ...s,
        surfaces:
          s.surfaces.length > 0
            ? s.surfaces
            : getDefaultPlanSurfaces(s.treatment),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patientId, examSuggestionTick]
  );

  // Populate form when editing
  useEffect(() => {
    if (isEdit && editPlan) {
      setPlanName(editPlan.name);
      setAdditionalDiscount(
        editPlan.additionalDiscount
          ? String(editPlan.additionalDiscount)
          : ""
      );
      const grouped = new Map();
      for (const svc of editPlan.services) {
        const svcTeeth = svc.teeth?.length > 0 ? svc.teeth : [svc.toothFdi];
        const existing = grouped.get(svc.treatment);
        if (existing) {
          for (const t of svcTeeth) {
            if (!existing.teeth.includes(t)) existing.teeth.push(t);
          }
          for (const s of svc.surfaces) {
            if (!existing.surfaces.includes(s)) existing.surfaces.push(s);
          }
        } else {
          grouped.set(svc.treatment, {
            id: genId("row"),
            treatment: svc.treatment,
            teeth: [...svcTeeth],
            surfaces: [...svc.surfaces],
            rate: svc.rate,
            discount: svc.discount,
            discountType: "flat",
            procedureDate: svc.procedureDate ?? "",
            notes: svc.notes ?? "",
          });
        }
      }
      setRows(grouped.size > 0 ? Array.from(grouped.values()) : []);
    } else if (!isEdit && isOpen) {
      setPlanName("");
      setRows([]);
      setAdditionalDiscount("");
    }
    setSearchQuery("");
    setSearchOpen(false);
  }, [isOpen, isEdit, editPlan]);

  // API-driven catalog results; fallback to local catalog if API yields nothing.
  const catalogPool = useMemo(() => {
    if (apiDentalBillItems.length > 0) return apiDentalBillItems;
    return dentalBillItems;
  }, [apiDentalBillItems, dentalBillItems]);

  const filteredTreatments = useMemo(() => {
    const qTrim = searchQuery.trim();
    const q = qTrim.toLowerCase();
    let pool = catalogPool.filter((t) => !q || t.name.toLowerCase().includes(q));
    pool = sortDentalBillItemsForSearch(pool, qTrim);
    return pool.slice(0, 25);
  }, [searchQuery, catalogPool]);

  const searchTrim = searchQuery.trim();
  const catalogHasExactName =
    searchTrim.length > 0 &&
    catalogPool.some(
      (t) => t.name.toLowerCase() === searchTrim.toLowerCase()
    );
  const showAddCustomDental = searchTrim.length > 0 && !catalogHasExactName;

  const filteredExamSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return examSuggestions;
    return examSuggestions.filter(
      (s) =>
        s.treatment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.toothLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `T${s.toothFdi}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, examSuggestions]);

  // Remaining catalog chips (not yet added)
  const remainingCatalogChips = useMemo(() => {
    return catalogPool
      .filter((t) => !rows.some((r) => r.treatment === t.name))
      .slice(0, 8);
  }, [rows, catalogPool]);

  useEffect(() => {
    if (!searchOpen) return;
    updateDropdownPos();
    const reposition = () => updateDropdownPos();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [searchOpen, searchQuery, rows.length, updateDropdownPos]);

  // Fetch dental services when dropdown opens and while typing (debounced).
  useEffect(() => {
    if (!searchOpen || catalogDentalDrawerOpen) return;
    const t = window.setTimeout(() => {
      fetchDentalServices(searchQuery);
    }, searchQuery.trim() ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [searchOpen, searchQuery, catalogDentalDrawerOpen, fetchDentalServices]);

  // Hide this drawer's dropdown whenever the nested "Add dental service" drawer
  // opens so it doesn't paint above the child sidebar via its portal.
  useEffect(() => {
    if (catalogDentalDrawerOpen) {
      setSearchOpen(false);
      searchRef.current?.blur();
    }
  }, [catalogDentalDrawerOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const addTreatmentRow = (
    treatmentName,
    teeth = [],
    surfaces = [],
    billItemFromCatalog = null
  ) => {
    const nextSurfaces =
      surfaces.length > 0 ? surfaces : getDefaultPlanSurfaces(treatmentName);
    const exists = rows.find((r) => r.treatment === treatmentName);
    if (!exists) {
      setRows((prev) => [
        ...prev,
        createRow(
          treatmentName,
          teeth,
          nextSurfaces,
          billingItems,
          billItemFromCatalog
        ),
      ]);
    } else if (teeth.length > 0) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.treatment !== treatmentName) return r;
          const mergedTeeth = [...new Set([...r.teeth.map(String), ...teeth.map(String)])];
          const mergedSurfaces = [...new Set([...r.surfaces, ...nextSurfaces])];
          return { ...r, teeth: mergedTeeth, surfaces: mergedSurfaces };
        })
      );
    }
    setSearchQuery("");
    setHighlightedIndex(0);
    // Keep dropdown open so users can add multiple services in a row.
    setSearchOpen(true);
    window.requestAnimationFrame(() => updateDropdownPos());
  };

  const updateRow = (id, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };
  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };
  const clearAllRows = () => {
    setRows([]);
  };

  const handleSearchKeyDown = (e) => {
    const q = searchQuery.trim();
    const showCatalog = true;
    const examCount = filteredExamSuggestions.length;
    const catCount = showCatalog ? filteredTreatments.length : 0;
    const customRowCount = showCatalog && q.length > 0 && showAddCustomDental ? 1 : 0;
    const totalItems = examCount + catCount + customRowCount;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalItems > 0)
        setHighlightedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems > 0)
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex < examCount) {
        const sug = filteredExamSuggestions[highlightedIndex];
        if (sug) addTreatmentRow(sug.treatment, [sug.toothFdi], sug.surfaces);
      } else if (showCatalog) {
        const catIdx = highlightedIndex - examCount;
        if (catIdx < catCount) {
          const pick = filteredTreatments[catIdx];
          if (pick) addTreatmentRow(pick.name, [], [], pick);
        } else if (customRowCount === 1 && catIdx === catCount) {
          setCatalogDentalInitialName(q);
          setCatalogDentalDrawerOpen(true);
          setSearchOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    const showCat = true;
    const examCount = filteredExamSuggestions.length;
    const catCount = showCat ? filteredTreatments.length : 0;
    const customRowCount = showCat && q.length > 0 && showAddCustomDental ? 1 : 0;
    const total = examCount + catCount + customRowCount;
    if (total <= 0) return;
    setHighlightedIndex((i) => Math.min(i, total - 1));
  }, [
    searchOpen,
    searchQuery,
    filteredExamSuggestions.length,
    filteredTreatments.length,
    showAddCustomDental,
  ]);

  const additionalDiscountAmount = Math.max(
    0,
    parseInt(additionalDiscount || "0", 10) || 0
  );

  const handleSave = () => {
    if (!planName.trim() || rows.length === 0) return;
    const services = fanOutServices(rows, editPlanId);
    if (isEdit && editPlanId) {
      updatePlan(editPlanId, {
        name: planName.trim(),
        services,
        additionalDiscount: additionalDiscountAmount || undefined,
      });
    } else {
      createPlan({
        name: planName.trim(),
        patientId: patientId,
        status: "draft",
        services,
        additionalDiscount: additionalDiscountAmount || undefined,
      });
    }
    closeDrawer();
    showSnackbar?.(
      isEdit ? "Plan updated successfully." : "Plan created successfully."
    );
  };

  const totalAmount = computeTotalAmount(rows);

  // Validation state
  const [showNameError, setShowNameError] = useState(false);
  const nameInputRef = useRef(null);
  const handleSaveWithValidation = () => {
    if (!planName.trim()) {
      setShowNameError(true);
      nameInputRef.current?.focus();
      return;
    }
    if (rows.length === 0) return;
    handleSave();
  };

  // Snapshot form state at drawer-open time so the dirty-check compares
  // against the true initial values (important in edit mode).
  const initialSnapshotRef = useRef(null);
  useEffect(() => {
    if (isOpen && initialSnapshotRef.current == null) {
      initialSnapshotRef.current = JSON.stringify({
        planName,
        rows,
        additionalDiscount,
      });
    }
    if (!isOpen) initialSnapshotRef.current = null;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty =
    isOpen &&
    initialSnapshotRef.current != null &&
    JSON.stringify({ planName, rows, additionalDiscount }) !==
      initialSnapshotRef.current;

  const guard = useDirtyDrawerGuard({
    isDirty,
    onClose: () => {
      closeDrawer();
      setShowNameError(false);
    },
  });

  // Clear error when user types
  const handleNameChange = (e) => {
    setPlanName(e.target.value);
    if (showNameError && e.target.value.trim()) setShowNameError(false);
  };

  const showCatalogInDropdown = true;
  const showChartDropdownSection = false;
  const showDentalServiceDropdownSection = showCatalogInDropdown;
  const showSearchEmptyHint = searchQuery.trim() === "" && !apiDentalLoading && filteredTreatments.length === 0;

  const isAntdOverlayTarget = (target) =>
    target instanceof Element &&
    !!target.closest(
      ".ant-popover, .ant-select-dropdown, .ant-tooltip, .ant-drawer"
    );

  const blockPlanSheetDismissFromPortals = (e) => {
    if (catalogDentalDrawerOpen) {
      e.preventDefault();
      return;
    }
    
    const target = e.detail?.originalEvent?.target || e.target;

    // Prevent sheet close when interacting with antd overlay portals (template popovers, selects)
    if (isAntdOverlayTarget(target)) {
      e.preventDefault();
      return;
    }
    if (target instanceof Element && target.closest('[data-tp-portal="true"]')) {
      e.preventDefault();
      return;
    }
    if (
      searchOpen &&
      dropdownRef.current &&
      target instanceof Node &&
      dropdownRef.current.contains(target)
    )
      e.preventDefault();
  };

  const showDropdown =
    searchOpen &&
    mounted &&
    !catalogDentalDrawerOpen &&
    (showChartDropdownSection ||
      showDentalServiceDropdownSection ||
      showSearchEmptyHint);

  return (
    <>
      <TPDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) guard.attemptClose();
        }}
      >
        <TPDrawerContent
          side="right"
          size="lg"
          className={`${PLAN_DRAWER_WIDE_PANEL_CLASS} ${styles.drawerPanel}`}
          onPointerDownOutside={blockPlanSheetDismissFromPortals}
          onInteractOutside={blockPlanSheetDismissFromPortals}
          onFocusOutside={(e) => {
            // Allow focus to move to antd overlay content (template popovers, selects, ServiceItemPopup)
            const focusedEl = e.detail?.originalEvent?.target;
            if (isAntdOverlayTarget(focusedEl)) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (document.querySelector('[data-tp-portal="true"]') || searchOpen) {
              e.preventDefault();
            }
          }}
          style={{ background: "#F4F5F7" }}
        >
          <DrawerHeader
            title={isEdit ? "Edit Plan" : "Create Treatment Plan"}
            onClose={() => guard.attemptClose()}
            action={
              <div className={styles.headerActionRow}>
                <ConfigProvider 
                  theme={ABOVE_DRAWER_THEME}
                  getPopupContainer={(trigger) => trigger?.closest('[role="dialog"]') || document.body}
                >
                  <ExaminationTemplateActions
                    title="Plan Templates"
                    templates={planTpl.templates}
                    saving={planTpl.saving}
                    hasData={rows.length > 0}
                    onSelect={(t) => applyTemplate(t, planTpl)}
                    onDelete={planTpl.remove}
                    onSaveNew={(name) => planTpl.save(name, rowsToTemplatePayload(rows, additionalDiscountAmount))}
                    onUpdate={(tpl) => planTpl.update(tpl.id, tpl.name, rowsToTemplatePayload(rows, additionalDiscountAmount))}
                    btnClassName={styles.iconBtn}
                  />
                </ConfigProvider>
                <button
                  type="button"
                  title="Erase"
                  onClick={clearAllRows}
                  disabled={rows.length === 0}
                  className={styles.iconBtn}
                >
                  <Eraser
                    color="currentColor"
                    size={16}
                    strokeWidth={1.5}
                    variant="Linear"
                  />
                </button>
                <div className={styles.headerDivider} />
                <button
                  type="button"
                  onClick={handleSaveWithValidation}
                  className={styles.saveBtn}
                >
                  {isEdit ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            }
          />

          <div className={styles.drawerBody}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                Plan Name <span className={styles.required}>*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={planName}
                onChange={handleNameChange}
                placeholder="e.g., Wisdom Tooth Removal"
                className={`${styles.input} ${showNameError ? styles.error : ""}`}
              />
              {showNameError && (
                <p className={styles.errorText}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12 8v5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16" r="0.75" fill="currentColor" />
                  </svg>
                  Please enter a plan name to create a plan.
                </p>
              )}
            </div>

            <div className={styles.clusterCard}>
              <header className={styles.clusterHeader}>
                <TPMedicalIcon
                  name="first-aid"
                  variant="bulk"
                  size={22}
                  color="var(--tp-violet-500)"
                />
                <h3 className={styles.servicesTitle}>Services</h3>
                {rows.length > 0 && (
                  <span className={styles.servicesCount}>{rows.length}</span>
                )}
                <div className={styles.servicesHeaderActions}>
                  <ConfigProvider 
                    theme={ABOVE_DRAWER_THEME}
                    getPopupContainer={(trigger) => trigger?.closest('[role="dialog"]') || document.body}
                  >
                    <ExaminationTemplateActions
                      title="Service Templates"
                      templates={serviceTpl.templates}
                      saving={serviceTpl.saving}
                      hasData={rows.length > 0}
                      onSelect={(t) => applyTemplate(t, serviceTpl)}
                      onDelete={serviceTpl.remove}
                      onSaveNew={(name) => serviceTpl.save(name, rowsToServiceTemplatePayload(rows))}
                      onUpdate={(tpl) => serviceTpl.update(tpl.id, tpl.name, rowsToServiceTemplatePayload(rows))}
                      btnClassName={styles.iconBtn}
                    />
                  </ConfigProvider>
                  <button
                    type="button"
                    title="Clear all"
                    onClick={clearAllRows}
                    disabled={rows.length === 0}
                    className={styles.iconBtn}
                  >
                    <Eraser
                      color="currentColor"
                      size={16}
                      strokeWidth={1.5}
                      variant="Linear"
                    />
                  </button>
                </div>
              </header>

              {rows.length > 0 && (
                <div className={styles.servicesTableScroll}>
                  <PlanServiceTable
                    rows={rows}
                    updateRow={updateRow}
                    removeRow={removeRow}
                    activeCell={activeCell}
                    setCellActive={setCellActive}
                    clearCellActive={clearCellActive}
                    isCellActive={isCellActive}
                  />
                </div>
              )}

              {!isChikitsalayAccessable && <div
                data-rx-module-root="true"
                className={styles.searchBlock}
              >
                <div>
                  <div className={styles.searchInputWrap}>
                    <span className={styles.searchIconWrap}>
                      <Search size={16} strokeWidth={1.5} />
                    </span>
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      disabled={catalogDentalDrawerOpen}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                        setHighlightedIndex(0);
                      }}
                      onFocus={() => {
                        setSearchOpen(true);
                        setHighlightedIndex(0);
                        fetchDentalServices(searchQuery);
                        window.requestAnimationFrame(() => updateDropdownPos());
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search & Add Service"
                      className={styles.searchInput}
                    />
                  </div>
                  <div className={styles.searchSections}>
                    {remainingCatalogChips.length > 0 && (
                      <div>
                        <p className={styles.catalogChipTitle}>
                          Dental service
                        </p>
                        <div className={styles.catalogChipList}>
                          {remainingCatalogChips.map((t) => (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => addTreatmentRow(t.name, [], [], t)}
                              className={styles.catalogChip}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>}
            </div>
          </div>

          {rows.length > 0 && (
            <div className={styles.totalBar}>
              <div className={styles.totalBarRow}>
                {!isChikitsalayAccessable && <label className={styles.additionalDiscountLabel}>
                  <span className={styles.additionalDiscountText}>
                    Additional discount
                  </span>
                  <div className={styles.additionalDiscountInputWrap}>
                    <span className={styles.additionalDiscountCurrency}>₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={additionalDiscount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setAdditionalDiscount(v);
                      }}
                      placeholder="0"
                      className={styles.additionalDiscountInput}
                    />
                  </div>
                </label>}
                <div className={styles.totalValuesWrap}>
                  {additionalDiscountAmount > 0 && (
                    <>
                      <span className={styles.totalStruck}>
                        {formatINR(totalAmount)}
                      </span>
                      <span className={styles.totalDiscountPill}>
                        − {formatINR(additionalDiscountAmount)}
                      </span>
                    </>
                  )}
                  <p className={styles.totalLabel}>
                    {additionalDiscountAmount > 0
                      ? "Final Total"
                      : "Estimated Total"}
                  </p>
                  <p className={styles.totalValue}>
                    {formatINR(
                      Math.max(0, totalAmount - additionalDiscountAmount)
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </TPDrawerContent>

        {showDropdown &&
          createPortal(
            <PlanSearchDropdown
              ref={dropdownRef}
              dropdownPos={dropdownPos}
              filteredExamSuggestions={filteredExamSuggestions}
              filteredTreatments={filteredTreatments}
              rows={rows}
              highlightedIndex={highlightedIndex}
              showChartDropdownSection={showChartDropdownSection}
              showDentalServiceDropdownSection={showDentalServiceDropdownSection}
              showSearchEmptyHint={showSearchEmptyHint}
              showAddCustomDental={showAddCustomDental}
              searchQuery={searchQuery}
              catalogLoading={apiDentalLoading}
              onAddExamSuggestion={addTreatmentRow}
              onAddCatalogItem={addTreatmentRow}
              onOpenCustomDentalDrawer={() => {
                setCatalogDentalInitialName(searchQuery.trim());
                setCatalogDentalDrawerOpen(true);
                setSearchOpen(false);
              }}
            />,
            document.body
          )}
      </TPDrawer>

      {mounted &&
        catalogDentalDrawerOpen &&
        typeof document !== "undefined"
        ? createPortal(
            <ServiceItemPopup
              dentalOnly
              editIndex={-1}
              item={{ name: catalogDentalInitialName }}
              onCancel={() => {
                setCatalogDentalDrawerOpen(false);
                setSearchQuery("");
              }}
              onSaved={(billItemRes, finalItem) => {
                const catalogItem = mapApiBillItemToDentalCatalog({
                  ...billItemRes,
                  name: finalItem?.name ?? billItemRes?.name,
                  price: finalItem?.price,
                  amount: finalItem?.price,
                  discount: finalItem?.discount,
                  discountType: finalItem?.discountType,
                  gst: finalItem?.gst,
                });
                if (catalogItem) {
                  addBillingCatalogItem(catalogItem);
                  addTreatmentRow(catalogItem.name, [], [], catalogItem);
                  showSnackbar?.(
                    `"${catalogItem.name}" has been added successfully.`
                  );
                }
                setSearchQuery("");
              }}
              zIndex={10001}
            />,
            document.body
          )
        : null}

      <TPConfirmDialog
        open={guard.confirmOpen}
        onOpenChange={(open) => {
          if (!open) guard.cancelDiscard();
        }}
        title="Are you sure you want to go back?"
        warning="If you go back now, your changes will not be saved."
        secondaryLabel="Yes, Go Back"
        onSecondary={guard.confirmDiscard}
        primaryLabel="No, Stay"
        primaryTone="primary"
        onPrimary={guard.cancelDiscard}
      />
    </>
  );
}
