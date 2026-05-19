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
import { Grid5, Ram, Eraser, InfoCircle } from "iconsax-reactjs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
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
import { SURFACE_COLORS, SURFACE_ABBR, getDefaultPlanSurfaces } from "./plan-types";
import { fdiToLabel, buildExamSuggestions } from "./exam-suggestions";
import {
  getUniqueDentalBillItems,
  sortDentalBillItemsForSearch,
} from "../lib/billing-catalog";
import { useBillingCatalog } from "../lib/useBillingCatalog";
import { AddDentalBillItemDrawer } from "../AddDentalBillItemDrawer";
import { useDirtyDrawerGuard } from "./use-dirty-drawer-guard";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import { PlanServiceTable } from "./PlanServiceTable";
import { PlanSearchDropdown } from "./PlanSearchDropdown";
import {
  createRow,
  fanOutServices,
  computeTotalAmount,
} from "./lib/planFormHelpers";
import styles from "./AddEditPlanDrawer.module.scss";

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
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
    return dentalBillItems
      .filter((t) => !rows.some((r) => r.treatment === t.name))
      .slice(0, 8);
  }, [rows, dentalBillItems]);

  useEffect(() => {
    if (!searchOpen || !searchRef.current) return;
    const rect = searchRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
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
          const mergedTeeth = [...new Set([...r.teeth, ...teeth])];
          const mergedSurfaces = [...new Set([...r.surfaces, ...nextSurfaces])];
          return { ...r, teeth: mergedTeeth, surfaces: mergedSurfaces };
        })
      );
    }
    setSearchQuery("");
    setSearchOpen(false);
    // Don't focus search input — user asked not to activate input on tag click
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
      dispatch({
        type: "UPDATE_PLAN",
        planId: editPlanId,
        patch: {
          name: planName.trim(),
          services,
          additionalDiscount: additionalDiscountAmount || undefined,
        },
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
        additionalDiscount: additionalDiscountAmount || undefined,
      };
      newPlan.services = services.map((s) => ({ ...s, planId: newPlan.id }));
      dispatch({ type: "ADD_PLAN", plan: newPlan });
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
      dropdownRef.current.contains(e.target)
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
            if (catalogDentalDrawerOpen) e.preventDefault();
          }}
          style={{ background: "#F4F5F7" }}
        >
          <DrawerHeader
            title={isEdit ? "Edit Plan" : "Create Treatment Plan"}
            onClose={() => guard.attemptClose()}
            action={
              <div className={styles.headerActionRow}>
                <button
                  type="button"
                  title="Templates"
                  className={styles.iconBtn}
                >
                  <Grid5
                    color="currentColor"
                    size={16}
                    strokeWidth={1.5}
                    variant="Linear"
                  />
                </button>
                <button
                  type="button"
                  title="Save as template"
                  className={styles.iconBtn}
                >
                  <Ram
                    color="currentColor"
                    size={16}
                    strokeWidth={1.5}
                    variant="Linear"
                  />
                </button>
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
                  <button
                    type="button"
                    title="Templates"
                    className={styles.iconBtn}
                  >
                    <Grid5
                      color="currentColor"
                      size={16}
                      strokeWidth={1.5}
                      variant="Linear"
                    />
                  </button>
                  <button
                    type="button"
                    title="Save as template"
                    className={styles.iconBtn}
                  >
                    <Ram
                      color="currentColor"
                      size={16}
                      strokeWidth={1.5}
                      variant="Linear"
                    />
                  </button>
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

              <PlanServiceTable
                rows={rows}
                updateRow={updateRow}
                removeRow={removeRow}
                activeCell={activeCell}
                setCellActive={setCellActive}
                clearCellActive={clearCellActive}
                isCellActive={isCellActive}
              />

              <div
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
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                        setHighlightedIndex(0);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search & Add Service"
                      className={styles.searchInput}
                    />
                  </div>
                  <div className={styles.searchSections}>
                    {remainingExamSuggestions.length > 0 && (
                      <div className={styles.examCard}>
                        <div className={styles.examHeaderRow}>
                          <TPMedicalIcon
                            name="tooth"
                            variant="bulk"
                            size={18}
                            color="var(--tp-blue-600)"
                          />
                          <p className={styles.examHeaderText}>
                            From today's dental examination
                          </p>
                          <TooltipProvider delayDuration={120}>
                            <Tooltip>
                              <TooltipTrigger asChild={true}>
                                <button
                                  type="button"
                                  aria-label="About this section"
                                  className={styles.examInfoBtn}
                                >
                                  <InfoCircle
                                    size={14}
                                    variant="Linear"
                                    color="currentColor"
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className={styles.examInfoTooltip}
                              >
                                These are treatments suggested from findings
                                charted in today's dental examination. Each chip
                                is already linked to the tooth it was recorded
                                on — tap to add it to this plan in one click.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className={styles.examChipList}>
                          {remainingExamSuggestions.map((sug) => (
                            <button
                              key={`${sug.treatment}-${sug.toothFdi}`}
                              type="button"
                              title={sug.hint}
                              onClick={() =>
                                addTreatmentRow(
                                  sug.treatment,
                                  [sug.toothFdi],
                                  sug.surfaces
                                )
                              }
                              className={styles.examChip}
                            >
                              <span className={styles.examChipTooth}>
                                T{sug.toothFdi}
                              </span>
                              <span className={styles.examChipMain}>
                                <span className={styles.examChipTitle}>
                                  {sug.treatment}
                                </span>
                                {sug.surfaces.length > 0 && (
                                  <span className={styles.examSurfaceList}>
                                    {sug.surfaces.map((s, si) => (
                                      <span
                                        key={`${s}-${si}`}
                                        className={styles.examSurfaceItem}
                                      >
                                        <span
                                          className={styles.examSurfaceDot}
                                          style={{
                                            backgroundColor:
                                              SURFACE_COLORS[s] || "#94a3b8",
                                          }}
                                        />
                                        <span className={styles.examSurfaceAbbr}>
                                          {SURFACE_ABBR[s] || s}
                                        </span>
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
              </div>
            </div>
          </div>

          {rows.length > 0 && (
            <div className={styles.totalBar}>
              <div className={styles.totalBarRow}>
                <label className={styles.additionalDiscountLabel}>
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
                </label>
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

      {mounted && typeof document !== "undefined"
        ? createPortal(
            <AddDentalBillItemDrawer
              open={catalogDentalDrawerOpen}
              onOpenChange={setCatalogDentalDrawerOpen}
              initialName={catalogDentalInitialName}
              onSaved={(item) => {
                addTreatmentRow(item.name, [], [], item);
                showSnackbar?.(`"${item.name}" has been added successfully.`);
              }}
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
