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
import { Search, Trash2, Plus } from "lucide-react";
import { Grid5, Ram, Eraser, ArrowDown2, InfoCircle } from "iconsax-reactjs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider } from
"../ui/tooltip";
import { createPortal } from "react-dom";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { TPMedicalIcon } from "../tp-ui/medical-icons/TPMedicalIcon";
import { usePlanContext } from "./plan-context";
import {
  DrawerHeader,
  formatINR,
  PlanSurfaceAbbrTags,
  PLAN_DRAWER_WIDE_PANEL_CLASS } from
"./plan-shared";
import { genId } from "./plan-types";
import {
  SURFACE_OPTIONS,
  SURFACE_COLORS,
  SURFACE_ABBR,
  getDefaultPlanSurfaces } from
"./plan-types";
import { getRate } from "./treatments";
import { ToothPicker } from "./ToothPicker";
import { fdiToLabel, buildExamSuggestions } from "./exam-suggestions";
import {
  findDentalBillItemByName,
  getUniqueDentalBillItems,
  sortDentalBillItemsForSearch } from
"../lib/billing-catalog";
import { useBillingCatalog } from "../lib/billing-catalog-context";
import { AddDentalBillItemDrawer } from "../AddDentalBillItemDrawer";
import { useDirtyDrawerGuard } from "./use-dirty-drawer-guard";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import styles from "./AddEditPlanDrawer.module.scss";
const cx = (...classes) => classes.filter(Boolean).join(" ");

function createRow(
treatment,
teeth = [],
surfaces = [],
billingItems,
billItemFromCatalog = null)
{
  const billItem =
  billItemFromCatalog ?? findDentalBillItemByName(billingItems, treatment);
  const rate = billItem ? billItem.price : getRate(treatment);
  let discount = 0;
  if (billItem && billItem.discount > 0) {
    if (billItem.discountUnit === "percent")
    discount = Math.min(rate, Math.round(rate * billItem.discount / 100));else
    discount = Math.min(rate, billItem.discount);
  }
  return {
    id: genId("row"),
    treatment,
    teeth,
    surfaces:
    surfaces.length > 0 ? surfaces : getDefaultPlanSurfaces(treatment),
    rate,
    discount,
    discountType: "flat",
    procedureDate: "",
    notes: ""
  };
}
// ─── Surface picker (portal-based dropdown to avoid clipping) ─
function SurfacePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 260;
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - 12) {
      left = viewportWidth - dropdownWidth - 12;
    }
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      zIndex: 9999,
      minWidth: dropdownWidth,
      pointerEvents: "auto"
    });
    setOpen(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const reposition = () => openDropdown();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, openDropdown]);
  const toggle = (id) => {
    if (id === "whole") {
      onChange(value.includes("whole") ? [] : ["whole"]);
      return;
    }
    const selected = new Set(value);
    if (selected.has("whole")) selected.delete("whole");
    if (selected.has(id)) selected.delete(id);else
    selected.add(id);
    onChange(Array.from(selected));
  };
  const dropdown = open ?
  <div
    ref={dropdownRef}
    style={dropdownStyle}
    className={styles.surfacePickerDropdown}>

      <div className={styles.surfacePickerInfo}>
        <div className={styles.surfacePickerInfoBox}>
          <span className={styles.surfacePickerInfoDot} />
          <span className={styles.surfacePickerInfoText}>
            Select whole tooth or mix individual surfaces
          </span>
        </div>
      </div>
      {SURFACE_OPTIONS.map((opt, index) => {
      const selected = value.includes(opt.id);
      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => toggle(opt.id)}
          className={`${styles.surfacePickerItem} ${selected ? styles.selected : styles.unselected} ${index === 1 ? styles.divider : ""}`}>

            <span className={`${styles.checkbox} ${selected ? styles.checked : ""}`}>
              {selected ?
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path
                d="M2 5L4 7L8 3"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round" />

                </svg> :
            null}
            </span>
            <span
            className={styles.surfaceDot}
            style={{
              background: SURFACE_COLORS[opt.id]
            }} />


            <span className={styles.surfaceLabel}>{opt.label}</span>
            <span className={styles.surfaceAbbr}>
              {opt.abbr}
            </span>
          </button>);

    })}
    </div> :
  null;
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openDropdown();
        }}
        className={styles.surfaceTrigger}>

        <span className={styles.surfaceTriggerText}>
          {value.length > 0 ?
          <PlanSurfaceAbbrTags surfaces={value} gapClass="gap-[4px]" /> :

          <span className={styles.surfacePlaceholder}>Select surface</span>}

        </span>
        <ArrowDown2 size={14} color="currentColor" variant="Linear" />
      </button>
      {mounted && typeof document !== "undefined" && dropdown ?
      createPortal(dropdown, document.body) :
      null}
    </>);

}
// ─── Component ──────────────────────────────────────────────
export function AddEditPlanDrawer() {
  const { items: billingItems } = useBillingCatalog();
  const dentalBillItems = useMemo(
    () => getUniqueDentalBillItems(billingItems),
    [billingItems]
  );
  const [catalogDentalDrawerOpen, setCatalogDentalDrawerOpen] = useState(false);
  const [catalogDentalInitialName, setCatalogDentalInitialName] = useState("");
  const {
    state,
    dispatch,
    closeDrawer,
    patientId: planPatientId,
    showSnackbar
  } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "add-plan" || drawer.type === "edit-plan";
  const isEdit = drawer.type === "edit-plan";
  const editPlanId = isEdit ? drawer.planId : null;
  const editPlan = editPlanId ?
  state.plans.find((p) => p.id === editPlanId) :
  null;
  const [planName, setPlanName] = useState("");
  const [rows, setRows] = useState([]);
  // Plan-level additional discount (flat ₹, applied over the sum of
  // service-level amounts). Stored as a string in the input so empty = 0.
  const [additionalDiscount, setAdditionalDiscount] = useState("");
  // Active-cell state — gives each Services-table cell an input-shell
  // focus ring matching the TP design system (see AddProcedureDrawer).
  const [activeCell, setActiveCell] = useState(null);
  const setCellActive = useCallback((rowId, colKey) => {
    setActiveCell({
      rowId,
      colKey
    });
  }, []);
  const clearCellActive = useCallback((rowId, colKey) => {
    window.setTimeout(() => {
      setActiveCell((current) =>
      current && current.rowId === rowId && current.colKey === colKey ?
      null :
      current
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
    width: 0
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const patientId = planPatientId ?? state.plans[0]?.patientId ?? "apt-1";
  const [examSuggestionTick, setExamSuggestionTick] = useState(0);
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const id = window.setInterval(
      () => setExamSuggestionTick((t) => t + 1),
      700
    );
    const onChart = (e) => {
      if (e.detail?.patientId === patientId)
      setExamSuggestionTick((t) => t + 1);
    };
    window.addEventListener("dental-exam-chart-updated", onChart);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("dental-exam-chart-updated", onChart);
    };
  }, [isOpen, patientId]);
  const examSuggestions = useMemo(
    () =>
    buildExamSuggestions(patientId).map((s) => ({
      ...s,
      surfaces:
      s.surfaces.length > 0 ?
      s.surfaces :
      getDefaultPlanSurfaces(s.treatment)
    })),
    [patientId, examSuggestionTick]
  );
  // Populate form when editing
  useEffect(() => {
    if (isEdit && editPlan) {
      setPlanName(editPlan.name);
      setAdditionalDiscount(
        editPlan.additionalDiscount ? String(editPlan.additionalDiscount) : ""
      );
      const grouped = new Map();
      for (const svc of editPlan.services) {
        const existing = grouped.get(svc.treatment);
        if (existing) {
          existing.teeth.push(svc.toothFdi);
          for (const s of svc.surfaces) {
            if (!existing.surfaces.includes(s)) existing.surfaces.push(s);
          }
        } else {
          grouped.set(svc.treatment, {
            id: genId("row"),
            treatment: svc.treatment,
            teeth: [svc.toothFdi],
            surfaces: [...svc.surfaces],
            rate: svc.rate,
            discount: svc.discount,
            discountType: "flat",
            procedureDate: svc.procedureDate ?? "",
            notes: svc.notes ?? ""
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
  const filteredTreatments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let pool = dentalBillItems.filter(
      (t) => !q || t.name.toLowerCase().includes(q)
    );
    pool = sortDentalBillItemsForSearch(pool, searchQuery.trim());
    return pool.slice(0, 25);
  }, [searchQuery, dentalBillItems]);
  const searchTrim = searchQuery.trim();
  const catalogHasExactName =
  searchTrim.length > 0 &&
  dentalBillItems.some(
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
  // Remaining exam suggestions (not yet added)
  const remainingExamSuggestions = useMemo(() => {
    return examSuggestions.filter(
      (sug) =>
      !rows.some(
        (r) =>
        r.treatment === sug.treatment && r.teeth.includes(sug.toothFdi)
      )
    );
  }, [examSuggestions, rows]);
  // Remaining catalog chips (not yet added)
  const remainingCatalogChips = useMemo(() => {
    return dentalBillItems.
    filter((t) => !rows.some((r) => r.treatment === t.name)).
    slice(0, 8);
  }, [rows, dentalBillItems]);
  useEffect(() => {
    if (!searchOpen || !searchRef.current) return;
    const rect = searchRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width
    });
  }, [searchOpen, searchQuery]);
  // Hide this drawer's dropdown whenever the nested "Add dental service" drawer
  // opens so it doesn't paint above the child sidebar via its portal.
  useEffect(() => {
    if (catalogDentalDrawerOpen) setSearchOpen(false);
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
  billItemFromCatalog = null) =>
  {
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
      )]
      );
    } else if (teeth.length > 0) {
      setRows((prev) =>
      prev.map((r) => {
        if (r.treatment !== treatmentName) return r;
        const mergedTeeth = [...new Set([...r.teeth, ...teeth])];
        const mergedSurfaces = [...new Set([...r.surfaces, ...nextSurfaces])];
        return {
          ...r,
          teeth: mergedTeeth,
          surfaces: mergedSurfaces
        };
      })
      );
    }
    setSearchQuery("");
    setSearchOpen(false);
    // Don't focus search input — user asked not to activate input on tag click
  };

  const updateRow = (id, patch) => {
    setRows((prev) =>
    prev.map((r) =>
    r.id === id ?
    {
      ...r,
      ...patch
    } :
    r
    )
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
    const showCatalog = q.length > 0;
    const examCount = filteredExamSuggestions.length;
    const catCount = showCatalog ? filteredTreatments.length : 0;
    const customRowCount = showCatalog && showAddCustomDental ? 1 : 0;
    const totalItems = examCount + catCount + customRowCount;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalItems > 0)
      setHighlightedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems > 0) setHighlightedIndex((prev) => Math.max(prev - 1, 0));
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
    const showCat = q.length > 0;
    const examCount = filteredExamSuggestions.length;
    const catCount = showCat ? filteredTreatments.length : 0;
    const customRowCount = showCat && showAddCustomDental ? 1 : 0;
    const total = examCount + catCount + customRowCount;
    if (total <= 0) return;
    setHighlightedIndex((i) => Math.min(i, total - 1));
  }, [
  searchOpen,
  searchQuery,
  filteredExamSuggestions.length,
  filteredTreatments.length,
  showAddCustomDental]
  );
  const computeDiscount = (row) => {
    const raw = Number(row.discount);
    const d = Number.isFinite(raw) && raw > 0 ? raw : 0;
    return Math.min(row.rate, d);
  };
  const fanOutServices = () => {
    const services = [];
    const planId = editPlanId ?? genId("plan");
    for (const row of rows) {
      if (!row.treatment) continue;
      const teeth = row.teeth.length > 0 ? row.teeth : ["full-mouth"];
      const discAmt = computeDiscount(row);
      for (const fdi of teeth) {
        services.push({
          id: genId("svc"),
          planId,
          treatment: row.treatment,
          toothFdi: fdi,
          toothLabel: fdiToLabel(fdi),
          surfaces: [...row.surfaces],
          rate: row.rate,
          discount: discAmt,
          amount: Math.max(0, row.rate - discAmt),
          status: "planned",
          sittings: [],
          procedures: [],
          procedureDate: row.procedureDate?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        });
      }
    }
    return services;
  };
  const additionalDiscountAmount = Math.max(
    0,
    parseInt(additionalDiscount || "0", 10) || 0
  );
  const handleSave = () => {
    if (!planName.trim() || rows.length === 0) return;
    const services = fanOutServices();
    if (isEdit && editPlanId) {
      dispatch({
        type: "UPDATE_PLAN",
        planId: editPlanId,
        patch: {
          name: planName.trim(),
          services,
          additionalDiscount: additionalDiscountAmount || undefined
        }
      });
    } else {
      const newPlan = {
        id: genId("plan"),
        name: planName.trim(),
        patientId: patientId,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        status: "draft",
        services: [],
        additionalDiscount: additionalDiscountAmount || undefined
      };
      newPlan.services = services.map((s) => ({
        ...s,
        planId: newPlan.id
      }));
      dispatch({
        type: "ADD_PLAN",
        plan: newPlan
      });
    }
    closeDrawer();
    showSnackbar?.(
      isEdit ? "Plan updated successfully." : "Plan created successfully."
    );
  };
  const totalAmount = rows.reduce((sum, r) => {
    const teeth = r.teeth.length || 1;
    const discAmt = computeDiscount(r);
    return sum + Math.max(0, r.rate - discAmt) * teeth;
  }, 0);
  const canSave = planName.trim().length > 0 && rows.length > 0;
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
        additionalDiscount
      });
    }
    if (!isOpen) initialSnapshotRef.current = null;
  }, [isOpen]);
  const isDirty =
  isOpen &&
  initialSnapshotRef.current != null &&
  JSON.stringify({
    planName,
    rows,
    additionalDiscount
  }) !== initialSnapshotRef.current;
  const guard = useDirtyDrawerGuard({
    isDirty,
    onClose: () => {
      closeDrawer();
      setShowNameError(false);
    }
  });
  // Clear error when user types
  const handleNameChange = (e) => {
    setPlanName(e.target.value);
    if (showNameError && e.target.value.trim()) setShowNameError(false);
  };
  const showCatalogInDropdown = searchQuery.trim().length > 0;
  const showChartDropdownSection = filteredExamSuggestions.length > 0;
  const showDentalServiceDropdownSection = showCatalogInDropdown;
  const showSearchEmptyHint =
  searchQuery.trim() === "" && !showChartDropdownSection;
  const blockPlanSheetDismissFromPortals = (e) => {
    if (catalogDentalDrawerOpen) {
      e.preventDefault();
      return;
    }
    if (
    searchOpen &&
    dropdownRef.current &&
    e.target instanceof Node &&
    dropdownRef.current.contains(e.target))

    e.preventDefault();
  };
  return (
    <>
      <TPDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) guard.attemptClose();
        }}>

        <TPDrawerContent
          side="right"
          size="lg"
          className={`${PLAN_DRAWER_WIDE_PANEL_CLASS} ${styles.drawerPanel}`}
          onPointerDownOutside={blockPlanSheetDismissFromPortals}
          onInteractOutside={blockPlanSheetDismissFromPortals}
          onFocusOutside={(e) => {
            if (catalogDentalDrawerOpen) e.preventDefault();
          }}
          style={{
            background: "#F4F5F7"
          }}>

          <DrawerHeader
            title={isEdit ? "Edit Plan" : "Create Treatment Plan"}
            onClose={() => guard.attemptClose()}
            action={
            <div className={styles.headerActionRow}>
                <button
                type="button"
                title="Templates"
                className={styles.iconBtn}>

                  <Grid5
                  color="currentColor"
                  size={16}
                  strokeWidth={1.5}
                  variant="Linear" />

                </button>
                <button
                type="button"
                title="Save as template"
                className={styles.iconBtn}>

                  <Ram
                  color="currentColor"
                  size={16}
                  strokeWidth={1.5}
                  variant="Linear" />

                </button>
                <button
                type="button"
                title="Erase"
                onClick={clearAllRows}
                disabled={rows.length === 0}
                className={styles.iconBtn}>

                  <Eraser
                  color="currentColor"
                  size={16}
                  strokeWidth={1.5}
                  variant="Linear" />

                </button>
                <div className={styles.headerDivider} />
                <button
                type="button"
                onClick={handleSaveWithValidation}
                className={styles.saveBtn}>

                  {isEdit ? "Save Changes" : "Create Plan"}
                </button>
              </div>} />



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
                className={`${styles.input} ${showNameError ? styles.error : ""}`} />


              {showNameError &&
              <p className={styles.errorText}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="1.5" />


                    <path
                    d="M12 8v5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round" />


                    <circle cx="12" cy="16" r="0.75" fill="currentColor" />
                  </svg>
                  Please enter a plan name to create a plan.
                </p>}

            </div>
            <div className={styles.clusterCard}>
              <header className={styles.clusterHeader}>
                <TPMedicalIcon
                  name="first-aid"
                  variant="bulk"
                  size={22}
                  color="var(--tp-violet-500)" />


                <h3 className={styles.servicesTitle}>
                  Services
                </h3>
                {rows.length > 0 &&
                <span className={styles.servicesCount}>
                    {rows.length}
                  </span>}


                <div className={styles.servicesHeaderActions}>
                  <button
                    type="button"
                    title="Templates"
                    className={styles.iconBtn}>

                    <Grid5
                      color="currentColor"
                      size={16}
                      strokeWidth={1.5}
                      variant="Linear" />

                  </button>
                  <button
                    type="button"
                    title="Save as template"
                    className={styles.iconBtn}>

                    <Ram
                      color="currentColor"
                      size={16}
                      strokeWidth={1.5}
                      variant="Linear" />

                  </button>
                  <button
                    type="button"
                    title="Clear all"
                    onClick={clearAllRows}
                    disabled={rows.length === 0}
                    className={styles.iconBtn}>

                    <Eraser
                      color="currentColor"
                      size={16}
                      strokeWidth={1.5}
                      variant="Linear" />

                  </button>
                </div>
              </header>
              {rows.length > 0 &&
              <div className={styles.tableWrapPad}>
                  <div className={styles.tableShell}>
                    <table className={styles.servicesTable}>
                      <colgroup>
                        <col
                        style={{
                          width: 40,
                          minWidth: 36
                        }} />


                        <col
                        style={{
                          minWidth: 132,
                          maxWidth: 200
                        }} />


                        <col
                        style={{
                          width: 104,
                          minWidth: 96
                        }} />


                        <col
                        style={{
                          width: 108,
                          minWidth: 100
                        }} />


                        <col
                        style={{
                          width: 118,
                          minWidth: 108
                        }} />


                        <col
                        style={{
                          minWidth: 112,
                          maxWidth: 200
                        }} />


                        <col
                        style={{
                          width: 88,
                          minWidth: 76
                        }} />


                        <col
                        style={{
                          width: 72,
                          minWidth: 64
                        }} />


                        <col
                        style={{
                          width: 84,
                          minWidth: 72
                        }} />


                        <col
                        style={{
                          width: 44,
                          minWidth: 44,
                          maxWidth: 44
                        }} />

                      </colgroup>
                      <thead>
                        <tr className={styles.tableHeadRow}>
                          <th className={styles.tableHeadCellCenter} />
                          <th className={styles.tableHeadCellLeft}>
                            Service
                          </th>
                          <th className={styles.tableHeadCellLeft}>
                            Teeth
                          </th>
                          <th className={styles.tableHeadCellLeft}>
                            Surfaces
                          </th>
                          <th className={styles.tableHeadCellLeftNarrow}>
                            Surgery date
                          </th>
                          <th className={styles.tableHeadCellLeftNarrow}>
                            Notes
                          </th>
                          <th className={styles.tableHeadCellRight}>
                            Rate
                          </th>
                          <th className={styles.tableHeadCellRight}>
                            Disc.
                          </th>
                          <th className={styles.tableHeadCellRight}>
                            Amount
                          </th>
                          <th className={styles.tableHeadCellSticky} />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => {
                        const teethCount = Math.max(1, row.teeth.length);
                        const discAmt = computeDiscount(row);
                        const rowAmount =
                        Math.max(0, row.rate - discAmt) * teethCount;
                        const isDateActive = isCellActive(row.id, "date");
                        const isNoteActive = isCellActive(row.id, "note");
                        const isRateActive = isCellActive(row.id, "rate");
                        const isDiscActive = isCellActive(row.id, "disc");
                        return (
                          <tr className={styles.tableBodyRow}>
                              <td className={styles.rowIndexCell}>
                                {idx + 1}
                              </td>
                              <td className={styles.tableCell}>
                                <div className={styles.serviceNameWrap}>
                                  <p className={styles.serviceNameText}>
                                    {row.treatment}
                                  </p>
                                </div>
                              </td>
                              <td className={styles.tableCell}>
                                <ToothPicker
                                value={row.teeth}
                                onChange={(teeth) =>
                                updateRow(row.id, {
                                  teeth
                                })}

                                variant="inline" />

                              </td>
                              <td className={styles.tableCell}>
                                <SurfacePicker
                                value={row.surfaces}
                                onChange={(surfaces) =>
                                updateRow(row.id, {
                                  surfaces
                                })} />


                              </td>
                              <td
                              className={`${styles.tableCellInteractive} ${isDateActive ? styles.cellActiveBg : styles.cellHoverBg}`}>

                                {isDateActive ?
                              <span className={styles.cellFocusRing} /> :
                              null}
                                <div className={styles.cellInputWrap}>
                                  {!row.procedureDate &&
                                <div className={styles.datePlaceholderWrap}>
                                      <span className={styles.datePlaceholderText}>
                                        DD/MM/YYYY
                                      </span>
                                    </div>}


                                  <input
                                  type="date"
                                  value={row.procedureDate || ""}
                                  onChange={(e) =>
                                  updateRow(row.id, {
                                    procedureDate: e.target.value
                                  })}

                                  onFocus={() =>
                                  setCellActive(row.id, "date")}

                                  onBlur={() =>
                                  clearCellActive(row.id, "date")}

                                  className={`${styles.dateInput} ${row.procedureDate ? styles.dateInputFilled : styles.dateInputEmpty}`} />

                                </div>
                              </td>
                              <td
                              className={`${styles.tableCellInteractive} ${isNoteActive ? styles.cellActiveBg : styles.cellHoverBg}`}>

                                {isNoteActive ?
                              <span className={styles.cellFocusRing} /> :
                              null}
                                <input
                                type="text"
                                value={row.notes ?? ""}
                                onChange={(e) =>
                                updateRow(row.id, {
                                  notes: e.target.value
                                })}

                                onFocus={() => setCellActive(row.id, "note")}
                                onBlur={() => clearCellActive(row.id, "note")}
                                placeholder="Add notes..."
                                className={styles.noteInput} />

                              </td>
                              <td
                              className={`${styles.tableCellInteractive} ${isRateActive ? styles.cellActiveBg : styles.cellHoverBg}`}>

                                {isRateActive ?
                              <span className={styles.cellFocusRing} /> :
                              null}
                                <div className={styles.currencyInputWrap}>
                                  <span className={styles.currencySymbol}>
                                    ₹
                                  </span>
                                  <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  autoComplete="off"
                                  value={row.rate ? String(row.rate) : ""}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(
                                      /\D/g,
                                      ""
                                    );
                                    updateRow(row.id, {
                                      rate:
                                      v === "" ?
                                      0 :
                                      Math.min(
                                        parseInt(v, 10) || 0,
                                        999999999
                                      )
                                    });
                                  }}
                                  onFocus={() =>
                                  setCellActive(row.id, "rate")}

                                  onBlur={() =>
                                  clearCellActive(row.id, "rate")}

                                  className={styles.currencyInput} />

                                </div>
                              </td>
                              <td
                              className={`${styles.tableCellInteractive} ${isDiscActive ? styles.cellActiveBg : styles.cellHoverBg}`}>

                                {isDiscActive ?
                              <span className={styles.cellFocusRing} /> :
                              null}
                                <div className={styles.discountInputWrap}>
                                  <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  autoComplete="off"
                                  value={
                                  row.discount ? String(row.discount) : ""}

                                  onChange={(e) => {
                                    const v = e.target.value.replace(
                                      /\D/g,
                                      ""
                                    );
                                    updateRow(row.id, {
                                      discount:
                                      v === "" ?
                                      0 :
                                      Math.min(
                                        parseInt(v, 10) || 0,
                                        999999999
                                      )
                                    });
                                  }}
                                  onFocus={() =>
                                  setCellActive(row.id, "disc")}

                                  onBlur={() =>
                                  clearCellActive(row.id, "disc")}

                                  placeholder="0"
                                  className={styles.discountInput} />

                                </div>
                              </td>
                              <td className={styles.tableCell}>
                                <div className={styles.amountWrap}>
                                  {formatINR(rowAmount)}
                                </div>
                              </td>
                              <td className={styles.tableStickyCell}>
                                <div className={styles.rowActionWrap}>
                                  <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className={styles.deleteBtn}>

                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>);

                      })}
                      </tbody>
                    </table>
                  </div>
                </div>}


              <div
                data-rx-module-root="true"
                className={styles.searchBlock}>

                <div>
                  <div className={styles.searchInputWrap}>
                    <span className={styles.searchIconWrap}>
                      <Search size={16} strokeWidth={1.5} />
                    </span>
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                        setHighlightedIndex(0);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search & Add Service"
                      className={styles.searchInput} />

                  </div>
                  <div className={styles.searchSections}>
                    {remainingExamSuggestions.length > 0 &&
                    <div className={styles.examCard}>
                        <div className={styles.examHeaderRow}>
                          <TPMedicalIcon
                          name="tooth"
                          variant="bulk"
                          size={18}
                          color="var(--tp-blue-600)" />


                          <p className={styles.examHeaderText}>
                            From today’s dental examination
                          </p>
                          <TooltipProvider delayDuration={120}>
                            <Tooltip>
                              <TooltipTrigger asChild={true}>
                                <button
                                type="button"
                                aria-label="About this section"
                                className={styles.examInfoBtn}>

                                  <InfoCircle
                                  size={14}
                                  variant="Linear"
                                  color="currentColor" />

                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                              side="top"
                              align="start"
                              className={styles.examInfoTooltip}>

                                These are treatments suggested from findings
                                charted in today’s dental examination. Each chip
                                is already linked to the tooth it was recorded
                                on — tap to add it to this plan in one click.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className={styles.examChipList}>
                          {remainingExamSuggestions.map((sug, i) =>
                        <button
                          type="button"
                          title={sug.hint}
                          onClick={() =>
                          addTreatmentRow(
                            sug.treatment,
                            [sug.toothFdi],
                            sug.surfaces
                          )}

                          className={styles.examChip}>

                              <span className={styles.examChipTooth}>
                                T{sug.toothFdi}
                              </span>
                              <span className={styles.examChipMain}>
                                <span className={styles.examChipTitle}>
                                  {sug.treatment}
                                </span>
                                {sug.surfaces.length > 0 &&
                            <span className={styles.examSurfaceList}>
                                    {sug.surfaces.map((s, si) =>
                              <span className={styles.examSurfaceItem}>
                                        <span
                                  className={styles.examSurfaceDot}
                                  style={{
                                    backgroundColor:
                                    SURFACE_COLORS[s] || "#94a3b8"
                                  }} />


                                        <span className={styles.examSurfaceAbbr}>
                                          {SURFACE_ABBR[s] || s}
                                        </span>
                                      </span>
                              )}
                                  </span>}

                              </span>
                            </button>
                        )}
                        </div>
                      </div>}


                    {remainingCatalogChips.length > 0 &&
                    <div>
                        <p className={styles.catalogChipTitle}>
                          Dental service
                        </p>
                        <div className={styles.catalogChipList}>
                          {remainingCatalogChips.map((t) =>
                        <button
                          type="button"
                          onClick={() => addTreatmentRow(t.name, [], [], t)}
                          className={styles.catalogChip}>

                              {t.name}
                            </button>
                        )}
                        </div>
                      </div>}

                  </div>
                </div>
              </div>
            </div>
          </div>
          {rows.length > 0 &&
          <div className={styles.totalBar}>
              <div className={styles.totalBarRow}>
                <label className={styles.additionalDiscountLabel}>
                  <span className={styles.additionalDiscountText}>
                    Additional discount
                  </span>
                  <div className={styles.additionalDiscountInputWrap}>
                    <span className={styles.additionalDiscountCurrency}>
                      ₹
                    </span>
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
                    className={styles.additionalDiscountInput} />

                  </div>
                </label>
                <div className={styles.totalValuesWrap}>
                  {additionalDiscountAmount > 0 &&
                <>
                      <span className={styles.totalStruck}>
                        {formatINR(totalAmount)}
                      </span>
                      <span className={styles.totalDiscountPill}>
                        − {formatINR(additionalDiscountAmount)}
                      </span>
                    </>}


                  <p className={styles.totalLabel}>
                    {additionalDiscountAmount > 0 ?
                  "Final Total" :
                  "Estimated Total"}
                  </p>
                  <p className={styles.totalValue}>
                    {formatINR(
                    Math.max(0, totalAmount - additionalDiscountAmount)
                  )}
                  </p>
                </div>
              </div>
            </div>}

        </TPDrawerContent>
        {searchOpen &&
        mounted &&
        !catalogDentalDrawerOpen && (
        showChartDropdownSection ||
        showDentalServiceDropdownSection ||
        showSearchEmptyHint) &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: Math.max(dropdownPos.width, 400),
              zIndex: 9999,
              pointerEvents: "auto"
            }}
            className={styles.searchDropdown}>

              {showChartDropdownSection &&
            <>
                  <div className={styles.dropdownExamHeader}>
                    <div className={styles.dropdownExamHeaderInner}>
                      <p className={styles.dropdownExamTitle}>
                        From today’s examination
                      </p>
                      <span className={styles.dropdownExamBadge}>
                        Dental tab
                      </span>
                    </div>
                  </div>
                  <div className={styles.dropdownExamList}>
                    {filteredExamSuggestions.map((sug, i) => {
                  const alreadyHasTooth = rows.some(
                    (r) =>
                    r.treatment === sug.treatment &&
                    r.teeth.includes(sug.toothFdi)
                  );
                  return (
                    <button
                      type="button"
                      disabled={alreadyHasTooth}
                      title={sug.hint}
                      onClick={() =>
                      addTreatmentRow(
                        sug.treatment,
                        [sug.toothFdi],
                        sug.surfaces
                      )}

                      className={cx(
                        styles.dropdownExamItem,
                        i === highlightedIndex ? styles.dropdownExamItemActive : styles.dropdownExamItemHover,
                        alreadyHasTooth ? styles.dropdownExamItemDisabled : ""
                      )}>

                          <span className={styles.dropdownToothTag}>
                            T{sug.toothFdi}
                          </span>
                          <div className={styles.dropdownItemMain}>
                            <p className={styles.dropdownItemTitle}>
                              {sug.treatment}
                            </p>
                            <p className={styles.dropdownItemMeta}>
                              <span className={styles.dropdownItemMetaLabel}>{sug.toothLabel}</span>
                              {sug.surfaces.length > 0 &&
                          <span className={styles.dropdownSurfaceList}>
                                  <span>·</span>
                                  {sug.surfaces.map((s, si) =>
                            <span className={styles.dropdownSurfaceItem}>
                                      <span
                                className={styles.dropdownSurfaceDot}
                                style={{
                                  backgroundColor:
                                  SURFACE_COLORS[s] || "#94a3b8"
                                }} />


                                      <span className={styles.dropdownSurfaceText}>
                                        {SURFACE_ABBR[s] || s}
                                      </span>
                                    </span>
                            )}
                                </span>}

                            </p>
                          </div>
                        </button>);

                })}
                  </div>
                </>}


              {showDentalServiceDropdownSection &&
            <>
                  <div className={styles.dropdownCatalogHeader}>
                    <p className={styles.dropdownCatalogTitle}>
                      Dental service
                    </p>
                  </div>
                  <div className={styles.dropdownCatalogList}>
                    <>
                      {filteredTreatments.map((t, i) => {
                    const globalIdx = filteredExamSuggestions.length + i;
                    const alreadyAdded = rows.some(
                      (r) => r.treatment === t.name
                    );
                    return (
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => addTreatmentRow(t.name, [], [], t)}
                        className={cx(
                          styles.dropdownCatalogItem,
                          globalIdx === highlightedIndex ? styles.dropdownCatalogItemActive : styles.dropdownCatalogItemHover,
                          alreadyAdded ? styles.dropdownCatalogItemDisabled : ""
                        )}>

                            <div className={styles.dropdownCatalogItemMain}>
                              <p className={styles.dropdownCatalogItemTitle}>
                                {t.name}
                              </p>
                            </div>
                            <span className={styles.dropdownCatalogItemPrice}>
                              {formatINR(t.price)}
                            </span>
                          </button>);

                  })}
                      {showAddCustomDental &&
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogDentalInitialName(searchQuery.trim());
                      setCatalogDentalDrawerOpen(true);
                      setSearchOpen(false);
                    }}
                    className={cx(
                      styles.dropdownCustomAdd,
                      highlightedIndex === filteredExamSuggestions.length + filteredTreatments.length ? styles.dropdownCustomAddActive : styles.dropdownCustomAddHover
                    )}>

                          <Plus
                      size={18}
                      strokeWidth={2}
                      className={styles.dropdownCustomAddIcon} />


                          <span className={styles.dropdownCustomAddText}>
                            Add "{searchQuery.trim()}" as custom dental service
                          </span>
                        </button>}

                    </>
                  </div>
                </>}


              {showSearchEmptyHint &&
            <div className={styles.searchEmptyWrap}>
                  <p className={styles.searchEmptyText}>
                    Nothing from today’s dental examination yet. Type above to
                    search dental services.
                  </p>
                </div>}

            </div>,
          document.body
        )}
      </TPDrawer>
      {mounted && typeof document !== "undefined" ?
      createPortal(
        <AddDentalBillItemDrawer
          open={catalogDentalDrawerOpen}
          onOpenChange={setCatalogDentalDrawerOpen}
          initialName={catalogDentalInitialName}
          onSaved={(item) => {
            addTreatmentRow(item.name, [], [], item);
            showSnackbar?.(`"${item.name}" has been added successfully.`);
          }} />,


        document.body
      ) :
      null}
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
        onPrimary={guard.cancelDiscard} />

    </>);

}