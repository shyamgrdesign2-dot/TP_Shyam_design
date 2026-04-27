import {
  useMemo,
  useState,
  useId,
  useRef,
  useEffect,
  useCallback } from
"react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Inter } from "next/font/google";
import {
  ChevronLeft,
  Plus,
  Search,
  Settings,
  Upload,
  Pencil,
  Trash2,
  ListFilter,
  Check,
  X } from
"lucide-react";
import { ArrowDown2, ArrowUp2, InfoCircle } from "iconsax-reactjs";
import { TPButton as Button } from "../tp-ui/button-system";
import { DR_AGENT_MAIN_RESERVE_CLASS } from "../tp-rxpad/DrAgentLayoutShell";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { TPSnackbar } from "../tp-ui/tp-snackbar";
import { DrawerHeader } from "../plan/plan-shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"../ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"../ui/alert-dialog";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import dui from "../dental-ui.module.scss";
import svgPaths from "../tp-rxpad/imports/svg-gb0jbe9ifm";
import rxHeaderStyles from "../tp-rxpad/imports/RxpadHeader.module.scss";
import styles from "./billing-settings.module.scss";
import { useBillingCatalog } from "../lib/billing-catalog-context";
import { computeBillingLineTotal } from "../lib/billing-catalog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-billing",
  weight: ["400", "500", "600", "700"]
});

const CATALOG = {
  service: [
  "Consultation",
  "Blood & Organ Banks - Blood Test",
  "X-ray/radiology - Full Body Check Up",
  "X-ray/radiology - Pediatric specialty care",
  "ECG — Resting",
  "Physiotherapy session"],


  consumable: [
  "Dressing (Fracture)",
  "Disposable syringe (5ml)",
  "Surgical gloves (pair)",
  "Cotton roll pack"],


  dental: [
  "Dental cleaning (scaling & polishing)",
  "Root canal treatment (single visit)",
  "Dental crown — ceramic",
  "Tooth extraction — simple",
  "Composite filling — posterior",
  "Dental implant consultation"]

};

const BILLING_TYPE_OPTS = [
{ id: "service", label: "Clinical services" },
{ id: "consumable", label: "Consumables" },
{ id: "dental", label: "Dental services" }];


const DRAWER_TYPES = BILLING_TYPE_OPTS;

function TypeFieldHelpContent() {
  return (
    <div className="space-y-[8px] text-[12px] leading-[1.45] text-tp-slate-700">
      <p className="font-semibold text-tp-slate-900">
        Pick the right item type
      </p>
      <ul className="space-y-[6px] pl-[2px]">
        <li className="flex gap-[6px]">
          <span
            aria-hidden
            className="mt-[5px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />

          <span>
            <strong className="font-semibold text-tp-slate-900">
              Clinical services
            </strong>
            <span className="text-tp-slate-600">
              {" "}
              — OPD‑style billables: consultations, procedures, diagnostics.
            </span>
          </span>
        </li>
        <li className="flex gap-[6px]">
          <span
            aria-hidden
            className="mt-[5px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />

          <span>
            <strong className="font-semibold text-tp-slate-900">
              Consumables
            </strong>
            <span className="text-tp-slate-600">
              {" "}
              — supplies &amp; pharmacy‑style stock items.
            </span>
          </span>
        </li>
        <li className="flex gap-[6px]">
          <span
            aria-hidden
            className="mt-[5px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />

          <span>
            <strong className="font-semibold text-tp-slate-900">
              Dental services
            </strong>
            <span className="text-tp-slate-600">
              {" "}
              — treatments charted under the dental workflow.
            </span>
          </span>
        </li>
      </ul>
    </div>);

}

function CatalogHelpContent() {
  return (
    <div className="space-y-[8px] text-[12px] leading-[1.45] text-tp-slate-700">
      <p className="font-semibold text-tp-slate-900">Shared billing catalog</p>
      <p className="text-tp-slate-600">
        Items saved here are reused across TatvaPractice wherever procedures are
        billed.
      </p>
      <div>
        <p className="mb-[4px] text-[10px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">
          Where it shows up
        </p>
        <ul className="space-y-[4px] pl-[2px]">
          <li className="flex gap-[6px]">
            <span
              aria-hidden
              className="mt-[5px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />

            <span className="text-tp-slate-600">
              Dental examination &amp; charting
            </span>
          </li>
          <li className="flex gap-[6px]">
            <span
              aria-hidden
              className="mt-[5px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />

            <span className="text-tp-slate-600">
              Treatment plans &amp; estimates
            </span>
          </li>
          <li className="flex gap-[6px]">
            <span
              aria-hidden
              className="mt-[5px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />

            <span className="text-tp-slate-600">Bills &amp; invoices</span>
          </li>
        </ul>
      </div>
      <p className="text-tp-slate-500">
        Use{" "}
        <strong className="font-semibold text-tp-slate-700">clear names</strong>{" "}
        and{" "}
        <strong className="font-semibold text-tp-slate-700">
          accurate pricing
        </strong>{" "}
        so estimates stay consistent.
      </p>
    </div>);

}

function typeLabel(key) {
  if (key === "service") return "Clinical services";
  if (key === "consumable") return "Consumables";
  return "Dental services";
}

function nameLabelForType(key) {
  if (key === "service") return "Clinical service name";
  if (key === "consumable") return "Consumable name";
  return "Dental service name";
}

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function sanitizeDecimal(raw) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, ""));

}

function formatDiscountCell(row) {
  const d = row.discount;
  if (d === undefined || d === null || d === "") return "—";
  const num = Number(d);
  if (!Number.isFinite(num) || num === 0) return "—";
  if (row.discountUnit === "percent") return `${num}%`;
  return formatInr(num);
}

function formatGstCell(row) {
  const g = row.gstPct;
  if (g === undefined || g === null || g === "") return "—";
  const n = Number(g);
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n}%`;
}

/** Returns CGST or SGST percent for a row, falling back to half of the legacy total `gstPct`. */
function formatSplitGstCell(row, which) {
  const key = which === "cgst" ? "cgstPct" : "sgstPct";
  const explicit = row[key];
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const n = Number(explicit);
    if (Number.isFinite(n) && n > 0) return `${n}%`;
  }
  const total = Number(row.gstPct);
  if (!Number.isFinite(total) || total <= 0) return "—";
  return `${total / 2}%`;
}

export default function BillingSettingsClient() {
  const formId = useId();
  const { items, setItems } = useBillingCatalog();
  const [appliedTypes, setAppliedTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState("service");
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCgst, setFormCgst] = useState("");
  const [formSgst, setFormSgst] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [formDiscountUnit, setFormDiscountUnit] = useState("inr");
  const [formErrors, setFormErrors] = useState({ name: "", price: "" });
  const [nameOpen, setNameOpen] = useState(false);

  const filterBtnRef = useRef(null);
  const filterPanelRef = useRef(null);
  const tableScrollRef = useRef(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStyle, setFilterStyle] = useState({});
  const [filterMounted, setFilterMounted] = useState(false);
  const [actionColumnEdgeShadow, setActionColumnEdgeShadow] = useState(false);
  /** { id, name } when delete confirmation is open */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSnackbarOpen, setDeleteSnackbarOpen] = useState(false);
  const [deleteSnackbarMessage, setDeleteSnackbarMessage] = useState("");
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState(false);
  const [saveSnackbarMessage, setSaveSnackbarMessage] = useState("");

  const updateActionColumnShadow = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setActionColumnEdgeShadow(
      maxScroll > 1 && el.scrollLeft > 0 && el.scrollLeft < maxScroll - 0.5
    );
  }, []);

  useEffect(() => {
    setFilterMounted(true);
  }, []);

  const suggestions = useMemo(() => {
    const q = formName.trim().toLowerCase();
    const list = CATALOG[formType] ?? [];
    if (!q) return list.slice(0, 8);
    return list.filter((n) => n.toLowerCase().includes(q)).slice(0, 12);
  }, [formType, formName]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      const typeOk =
      appliedTypes.length === 0 || appliedTypes.includes(row.type);
      const searchOk = !q || row.name.toLowerCase().includes(q);
      return typeOk && searchOk;
    });
  }, [items, appliedTypes, search]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    updateActionColumnShadow();
    const ro = new ResizeObserver(() => updateActionColumnShadow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateActionColumnShadow, filteredRows.length]);

  const activeFilterCount = appliedTypes.length;

  function handleFilterBtnClick() {
    if (filterOpen) {
      setFilterOpen(false);
      return;
    }
    const rect = filterBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFilterStyle({
      position: "fixed",
      top: rect.bottom + 4,
      right: typeof window !== "undefined" ? window.innerWidth - rect.right : 0,
      zIndex: 9999
    });
    setFilterOpen(true);
  }

  function applyTypes(types) {
    setAppliedTypes(types);
    setFilterOpen(false);
  }

  function resetForm() {
    setFormType("service");
    setFormName("");
    setFormPrice("");
    setFormCgst("");
    setFormSgst("");
    setFormDiscount("");
    setFormDiscountUnit("inr");
    setFormErrors({ name: "", price: "" });
    setNameOpen(false);
    setEditingId(null);
  }

  function openAddDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEditDrawer(row) {
    setEditingId(row.id);
    setFormType(row.type);
    setFormName(row.name);
    setFormPrice(row.price === 0 ? "0" : String(row.price));
    // Prefer explicit CGST/SGST if stored; otherwise split legacy total GST 50/50.
    const cg = row.cgstPct;
    const sg = row.sgstPct;
    if (cg !== undefined || sg !== undefined) {
      setFormCgst(
        cg === undefined || cg === null || Number(cg) === 0 ? "" : String(cg)
      );
      setFormSgst(
        sg === undefined || sg === null || Number(sg) === 0 ? "" : String(sg)
      );
    } else {
      const gTotal = Number(row.gstPct);
      if (!Number.isFinite(gTotal) || gTotal === 0) {
        setFormCgst("");
        setFormSgst("");
      } else {
        const half = gTotal / 2;
        setFormCgst(String(half));
        setFormSgst(String(half));
      }
    }
    setFormDiscount(
      row.discount === 0 || row.discount === undefined ?
      "" :
      String(row.discount)
    );
    setFormDiscountUnit(row.discountUnit === "percent" ? "percent" : "inr");
    setFormErrors({ name: "", price: "" });
    setNameOpen(false);
    setDrawerOpen(true);
  }

  function handleDrawerOpenChange(open) {
    setDrawerOpen(open);
    if (!open) {
      setEditingId(null);
      setFormErrors({ name: "", price: "" });
    }
  }

  function handleSave() {
    const name = formName.trim();
    const priceNum = Number(sanitizeDecimal(String(formPrice)));
    const nextErrors = { name: "", price: "" };
    if (!name) nextErrors.name = "Enter a name to continue.";
    if (!Number.isFinite(priceNum) || priceNum <= 0)
    nextErrors.price = "Enter a valid price greater than zero.";
    if (nextErrors.name || nextErrors.price) {
      setFormErrors(nextErrors);
      return;
    }

    const cgstPct =
    formCgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formCgst))) || 0;
    const sgstPct =
    formSgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formSgst))) || 0;
    const gstPct = cgstPct + sgstPct;
    const discountRaw = sanitizeDecimal(String(formDiscount));
    const discount = discountRaw === "" ? 0 : Number(discountRaw);
    if (!Number.isFinite(discount) || discount < 0) return;

    const payload = {
      name,
      type: formType,
      price: priceNum,
      priceUnit: "per_unit",
      discount,
      discountUnit: formDiscountUnit,
      cgstPct,
      sgstPct,
      gstPct
    };

    if (editingId) {
      setItems((prev) =>
      prev.map((r) => r.id === editingId ? { ...r, ...payload } : r)
      );
    } else {
      setItems((prev) => [
      ...prev,
      {
        id:
        typeof crypto !== "undefined" && crypto.randomUUID ?
        crypto.randomUUID() :
        `row-${Date.now()}`,
        ...payload
      }]
      );
    }
    setDrawerOpen(false);
    setEditingId(null);
    setFormErrors({ name: "", price: "" });
    setSaveSnackbarMessage(
      editingId ?
      `"${name}" has been updated successfully.` :
      `"${name}" has been added successfully.`
    );
    setSaveSnackbarOpen(true);
  }

  function removeRow(id) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.name;
    removeRow(deleteTarget.id);
    setDeleteSnackbarMessage(`"${deletedName}" has been deleted successfully.`);
    setDeleteSnackbarOpen(true);
  }

  const isEdit = Boolean(editingId);

  const drawerPreviewTotal = useMemo(() => {
    const priceNum = Number(sanitizeDecimal(String(formPrice)));
    if (!Number.isFinite(priceNum) || priceNum <= 0) return null;
    const cgstPct =
    formCgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formCgst))) || 0;
    const sgstPct =
    formSgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formSgst))) || 0;
    const gstPct = cgstPct + sgstPct;
    const discountRaw = sanitizeDecimal(String(formDiscount));
    const discount = discountRaw === "" ? 0 : Number(discountRaw);
    if (!Number.isFinite(discount) || discount < 0) return null;
    return computeBillingLineTotal(
      priceNum,
      discount,
      gstPct,
      formDiscountUnit
    );
  }, [formPrice, formCgst, formSgst, formDiscount, formDiscountUnit]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`${inter.variable} ${styles.page}`}>
        <header className={styles.topBar}>
          <Link
            to="/appointments"
            className={`${rxHeaderStyles.backBtn} ${styles.backLink}`}
            aria-label="Back to appointments">

            <span className={rxHeaderStyles.backBtnBorder} aria-hidden />
            <span className={rxHeaderStyles.backIconWrap}>
              <ChevronLeft
                size={24}
                strokeWidth={2}
                color="#454551"
                style={{ opacity: 0.7 }}
                aria-hidden />

            </span>
          </Link>
          <div className={styles.topBarMain}>
            <h1 className={styles.topTitle}>Billing Settings</h1>
            <div className={styles.topActions}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={rxHeaderStyles.iconBtn}
                    aria-label="Play tutorial">

                    <svg
                      className={rxHeaderStyles.tutorialSvg}
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 42 42"
                      aria-hidden>

                      <g opacity="0.8">
                        <path
                          clipRule="evenodd"
                          d={svgPaths.p3172ac80}
                          fill="var(--fill-0, #8A4DBB)"
                          fillRule="evenodd" />

                        <path
                          clipRule="evenodd"
                          d={svgPaths.p2ee5cec0}
                          fill="var(--fill-0, #8A4DBB)"
                          fillRule="evenodd" />

                      </g>
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[260px] text-xs font-medium">

                  Short walkthrough of billing settings and how to use this
                  screen.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={rxHeaderStyles.toolGrey}
                    aria-label="Advanced billing settings">

                    <Settings
                      size={20}
                      strokeWidth={1.5}
                      color="#454551"
                      aria-hidden />

                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[240px] text-xs font-medium">

                  Advanced billing configuration and integration options.
                </TooltipContent>
              </Tooltip>
              <div className={rxHeaderStyles.toolbarDivider} aria-hidden />
              <Button
                variant="outline"
                theme="primary"
                size="md"
                surface="light"
                className={styles.importBtn}
                leftIcon={<Upload size={18} strokeWidth={1.5} />}>

                Import Bill Items
              </Button>
              <Button
                variant="solid"
                theme="primary"
                size="md"
                surface="light"
                leftIcon={<Plus size={18} strokeWidth={2} />}
                onClick={openAddDrawer}>

                Add new bill item
              </Button>
            </div>
          </div>
        </header>

        <main className={`${styles.main} ${DR_AGENT_MAIN_RESERVE_CLASS}`}>
          <div className={styles.searchBar}>
            <div className={styles.searchRow}>
              <label className={styles.searchLabel}>
                <Search
                  size={18}
                  strokeWidth={1.5}
                  className={styles.searchIcon}
                  aria-hidden />

                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search by item name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off" />

              </label>
              <div className={styles.toolbarRight}>
                <button
                  ref={filterBtnRef}
                  type="button"
                  onClick={handleFilterBtnClick}
                  className={`${styles.filterBtn} ${
                    activeFilterCount > 0 ? styles.filterBtnActive : ""
                  }`}>

                  <ListFilter
                    size={15}
                    strokeWidth={2}
                    className={styles.filterBtnIcon} />

                  <span>Filter</span>
                  {activeFilterCount > 0 &&
                  <span className={styles.filterCountBadge}>
                      {activeFilterCount}
                    </span>}

                </button>
              </div>
            </div>
          </div>

          {activeFilterCount > 0 &&
          <div className={styles.filterTagsOuter}>
              <div className={styles.filterTagsBar}>
                <span className={styles.filterTagsLabel}>
                  Filter: {activeFilterCount}
                </span>
                <span className={styles.filterTagsDivider} />
                {appliedTypes.map((tid) =>
              <FilterTag
                key={tid}
                prefix="Type"
                value={typeLabel(tid)}
                onRemove={() =>
                setAppliedTypes((p) => p.filter((t) => t !== tid))} />


              )}
                <button
                type="button"
                onClick={() => {
                  setAppliedTypes([]);
                  setSearch("");
                }}
                className={`${styles.linkWarning} ${styles.linkWarningEnd}`}>

                  Clear all
                </button>
              </div>
            </div>}


          <div className={styles.bodyFlex}>
            <div
              ref={tableScrollRef}
              className={styles.tableScroll}
              onScroll={updateActionColumnShadow}>

              <div className={styles.tableInner}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      <th className={styles.thSerial}>#</th>
                      <th className={styles.thItem}>Items</th>
                      <th className={styles.thType}>Type</th>
                      <th className={styles.thPrice}>Price per unit</th>
                      <th className={styles.thDisc}>Discount</th>
                      <th className={styles.thGst}>CGST (%)</th>
                      <th className={styles.thGst}>SGST (%)</th>
                      <th className={styles.thTotal}>Total amount</th>
                      <th
                        className={`${styles.thAction} ${
                          actionColumnEdgeShadow ? styles.thActionEdgeShadow : ""
                        }`}>

                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ?
                    <tr>
                        <td colSpan={9} className={styles.emptyCell}>
                          <div className={styles.emptyState}>
                            <p className={styles.emptyText}>
                              {activeFilterCount > 0 || search.trim() ?
                            "No items matching your filters." :
                            "No billing items yet."}
                            </p>
                            {(activeFilterCount > 0 || search.trim()) &&
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedTypes([]);
                              setSearch("");
                            }}
                            className={`${styles.linkWarning} ${styles.emptyClear}`}>

                                Clear all filters
                              </button>}

                          </div>
                        </td>
                      </tr> :

                    filteredRows.map((row, rowIndex) =>
                    <tr key={row.id} className={styles.dataRow}>
                          <td
                        className={`${styles.tdMiddle} ${styles.tdSerial}`}>

                            {rowIndex + 1}
                          </td>
                          <td className={`${styles.tdMiddle} ${styles.tdItem}`}>
                             <div className={styles.cellClamp}>
                               <span className={styles.itemName}>
                                 {row.name}
                               </span>
                             </div>
                           </td>
                           <td className={`${styles.tdMiddle} ${styles.tdType}`}>
                             {typeLabel(row.type)}
                           </td>
                           <td className={`${styles.tdMiddle} ${styles.tdNum}`}>
                             {formatInr(row.price)}
                           </td>
                           <td className={`${styles.tdMiddle} ${styles.tdNum}`}>
                             {formatDiscountCell(row)}
                           </td>
                           <td className={`${styles.tdMiddle} ${styles.tdNum}`}>
                             {formatSplitGstCell(row, "cgst")}
                           </td>
                           <td className={`${styles.tdMiddle} ${styles.tdNum}`}>
                             {formatSplitGstCell(row, "sgst")}
                           </td>
                           <td className={`${styles.tdMiddle} ${styles.tdNum}`}>
                             {formatInr(
                           computeBillingLineTotal(
                             row.price,
                             row.discount,
                             row.gstPct,
                             row.discountUnit ?? "inr"
                           )
                         )}
                           </td>
                           <td
                        className={`${styles.tdAction} ${
                          actionColumnEdgeShadow ?
                          styles.tdActionEdgeShadow : ""
                        }`}>

                            <div className={styles.actionRow}>
                              <button
                            type="button"
                            className={styles.rowActionBtn}
                            aria-label={`Edit ${row.name}`}
                            onClick={() => openEditDrawer(row)}>

                                <Pencil size={16} strokeWidth={1.5} />
                              </button>
                              <button
                            type="button"
                            className={styles.rowActionBtn}
                            aria-label={`Delete ${row.name}`}
                            onClick={() =>
                            setDeleteTarget({
                              id: row.id,
                              name: row.name
                            })}>


                                <Trash2 size={16} strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {filterMounted && filterOpen &&
        <BillingTypeFilterPanel
          style={filterStyle}
          panelRef={filterPanelRef}
          triggerRef={filterBtnRef}
          appliedTypes={appliedTypes}
          onApply={applyTypes} />}



        <TPConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title="Delete this bill item?"
          warning={
          deleteTarget ?
          `Deletes "${deleteTarget.name}" from the billing catalog. This action cannot be undone.` :
          "This action cannot be undone."}

          secondaryLabel="Cancel"
          primaryLabel="Delete"
          primaryTone="destructive"
          onPrimary={handleConfirmDelete} />


        <TPDrawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
          <TPDrawerContent
            side="right"
            size="lg"
            className={`!gap-0 !p-0 !rounded-none ${styles.drawerSheet}`}>

            <DrawerHeader
              title={
              <span className={styles.billingDrawerTitleRow}>
                  <span>{isEdit ? "Edit bill item" : "Add new bill item"}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                      type="button"
                      className={styles.infoIconBtn}
                      aria-label="About shared billing catalog">

                        <InfoCircle
                        size={16}
                        variant="Linear"
                        color="var(--tp-slate-500)" />

                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                    side="bottom"
                    align="start"
                    className="max-w-[320px] rounded-[12px] p-[12px]">

                      <CatalogHelpContent />
                    </TooltipContent>
                  </Tooltip>
                </span>}

              titleClassName={styles.billingDrawerTitle}
              onClose={() => handleDrawerOpenChange(false)}
              action={
              <Button
                type="button"
                variant="solid"
                theme="primary"
                size="sm"
                surface="light"
                className={styles.drawerSaveCompact}
                onClick={handleSave}>

                  Save
                </Button>} />



            <div className={styles.drawerBody}>
              <form
                id={formId}
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}>

                <div className={`${styles.field} ${styles.fieldTypeTabs}`}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Type</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={styles.infoIconBtn}
                          aria-label="About item types">

                          <InfoCircle
                            size={16}
                            variant="Linear"
                            color="var(--tp-slate-500)" />

                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        className="max-w-[320px] rounded-[12px] p-[12px]">

                        <TypeFieldHelpContent />
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div
                    className={`${dui.tpTabPills} ${styles.drawerTabPills}`}
                    role="tablist"
                    aria-label="Item type">

                    {DRAWER_TYPES.map((t) => {
                      const active = formType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          className={`${dui.tabPill} ${
                            active ? dui.tabPillActive : ""
                          }`}
                          onClick={() => {
                            const next = t.id;
                            setFormType(next);
                            if (!isEdit) setFormName("");
                          }}>

                          {t.label}
                        </button>);

                    })}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${formId}-name`}>
                    {nameLabelForType(formType)}
                    <span className={styles.requiredMark} aria-hidden>
                      {" "}
                      *
                    </span>
                  </label>
                  <div className={styles.combo}>
                    <input
                      id={`${formId}-name`}
                      className={`${styles.drawerInput} ${
                        formErrors.name ? styles.drawerInputError : ""
                      }`}
                      value={formName}
                      onChange={(e) => {
                        setFormName(e.target.value);
                        if (formErrors.name)
                        setFormErrors((e2) => ({ ...e2, name: "" }));
                      }}
                      onFocus={() => setNameOpen(true)}
                      onBlur={() => setTimeout(() => setNameOpen(false), 180)}
                      placeholder="Search or type a name"
                      autoComplete="off" />


                    {nameOpen && suggestions.length > 0 ?
                    <ul className={styles.suggestList} role="listbox">
                        {suggestions.map((s) =>
                      <li key={s}>
                            <button
                          type="button"
                          className={styles.suggestBtn}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormName(s);
                            setNameOpen(false);
                          }}>

                              {s}
                            </button>
                          </li>
                      )}
                      </ul> :
                    null}
                  </div>
                  {formErrors.name ?
                  <p className={styles.fieldError}>{formErrors.name}</p> :
                  null}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${formId}-price`}>
                    Price (₹)
                    <span className={styles.requiredMark} aria-hidden>
                      {" "}
                      *
                    </span>
                  </label>
                  <div
                    className={`${styles.inputAffix} ${
                      formErrors.price ? styles.inputAffixError : ""
                    }`}>

                    <span className={styles.inputAffixPrefix} aria-hidden>
                      ₹
                    </span>
                    <input
                      id={`${formId}-price`}
                      className={styles.drawerInputAffixed}
                      inputMode="decimal"
                      value={formPrice}
                      onChange={(e) => {
                        setFormPrice(sanitizeDecimal(e.target.value));
                        if (formErrors.price)
                        setFormErrors((e2) => ({ ...e2, price: "" }));
                      }}
                      placeholder="0" />

                  </div>
                  {formErrors.price ?
                  <p className={styles.fieldError}>{formErrors.price}</p> :
                  null}
                </div>

                <div className={styles.field}>
                  <div className={styles.drawerPricingTriple}>
                    <div className={styles.pricingCol}>
                      <label
                        className={styles.pricingMiniLabel}
                        htmlFor={`${formId}-cgst`}>

                        CGST (%)
                      </label>
                      <div className={styles.inputAffix}>
                        <input
                          id={`${formId}-cgst`}
                          className={styles.drawerInputAffixedGst}
                          inputMode="decimal"
                          value={formCgst}
                          onChange={(e) =>
                          setFormCgst(sanitizeDecimal(e.target.value))}

                          placeholder="0" />


                        <span className={styles.inputAffixSuffix} aria-hidden>
                          %
                        </span>
                      </div>
                    </div>
                    <div className={styles.pricingCol}>
                      <label
                        className={styles.pricingMiniLabel}
                        htmlFor={`${formId}-sgst`}>

                        SGST (%)
                      </label>
                      <div className={styles.inputAffix}>
                        <input
                          id={`${formId}-sgst`}
                          className={styles.drawerInputAffixedGst}
                          inputMode="decimal"
                          value={formSgst}
                          onChange={(e) =>
                          setFormSgst(sanitizeDecimal(e.target.value))}

                          placeholder="0" />


                        <span className={styles.inputAffixSuffix} aria-hidden>
                          %
                        </span>
                      </div>
                    </div>
                    <div className={styles.pricingCol}>
                      <label
                        className={styles.pricingMiniLabel}
                        htmlFor={`${formId}-disc`}>

                        Discount
                      </label>
                      <div className={styles.discountInline}>
                        <input
                          id={`${formId}-disc`}
                          className={styles.discountInlineInput}
                          inputMode="decimal"
                          value={formDiscount}
                          onChange={(e) =>
                          setFormDiscount(sanitizeDecimal(e.target.value))}

                          placeholder="0"
                          aria-label={
                          formDiscountUnit === "percent" ?
                          "Discount percent" :
                          "Discount amount"} />



                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                          setFormDiscountUnit(
                            formDiscountUnit === "inr" ? "percent" : "inr"
                          )}

                          className={styles.discountUnitSwitch}
                          title={
                          formDiscountUnit === "inr" ?
                          "Switch to %" :
                          "Switch to ₹"}>


                          <span>{formDiscountUnit === "inr" ? "₹" : "%"}</span>
                          <span
                            className={styles.discountUnitChevrons}
                            aria-hidden>

                            <ArrowUp2
                              size={8}
                              color="currentColor"
                              variant="Bold" />

                            <ArrowDown2
                              size={8}
                              color="currentColor"
                              variant="Bold" />

                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className={styles.drawerTotalFooter} aria-live="polite">
              <p className={styles.drawerTotalLabel}>
                Total amount (incl. GST)
              </p>
              <p className={styles.drawerTotalValue}>
                {drawerPreviewTotal === null ?
                "—" :
                formatInr(drawerPreviewTotal)}
              </p>
            </div>
          </TPDrawerContent>
        </TPDrawer>

        <TPSnackbar
          open={deleteSnackbarOpen}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          autoHideDuration={4000}
          severity="success"
          message={deleteSnackbarMessage}
          onClose={(_, reason) => {
            if (reason === "clickaway") return;
            setDeleteSnackbarOpen(false);
          }} />


        <TPSnackbar
          open={saveSnackbarOpen}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          autoHideDuration={3000}
          severity="success"
          message={saveSnackbarMessage}
          onClose={(_, reason) => {
            if (reason === "clickaway") return;
            setSaveSnackbarOpen(false);
          }} />

      </div>
    </TooltipProvider>);

}

function FilterTag({ prefix, value, onRemove }) {
  return (
    <span className={styles.filterChip}>
      <span className={styles.filterChipPrefix}>{prefix}:</span>
      <span className={styles.filterChipValue}>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className={styles.filterChipRemove}
        aria-label={`Remove ${value} filter`}>

        <X size={10} strokeWidth={2.5} />
      </button>
    </span>);

}

function BillingTypeFilterPanel({
  style,
  panelRef,
  triggerRef,
  appliedTypes,
  onApply
}) {
  const [staged, setStaged] = useState(() => [...appliedTypes]);
  const onApplyRef = useRef(onApply);
  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    function handler(e) {
      const panel = panelRef.current;
      if (panel?.contains(e.target)) return;
      if (triggerRef?.current?.contains(e.target)) return;
      onApplyRef.current([...staged]);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [staged, triggerRef, panelRef]);

  function toggle(id) {
    setStaged((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleClear() {
    setStaged([]);
  }

  return createPortal(
    <div ref={panelRef} style={style} className={styles.filterPanel}>
      <div className={styles.filterSection}>
        <p className={styles.filterSectionTitle}>Item type</p>
        <div className={styles.filterOptionList}>
          {BILLING_TYPE_OPTS.map(({ id, label }) => {
            const on = staged.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={styles.filterOptionBtn}>

                <span
                  className={`${styles.checkboxOuter} ${
                    on ? styles.checkboxOuterOn : ""
                  }`}>

                  {on &&
                  <Check
                    size={10}
                    strokeWidth={3}
                    className={styles.checkIcon} />}


                </span>
                <span
                  className={`${styles.filterOptionLabel} ${
                    on ?
                    styles.filterOptionLabelOn :
                    styles.filterOptionLabelOff
                  }`}>

                  {label}
                </span>
              </button>);

          })}
        </div>
      </div>
      <div className={styles.filterDivider} />
      <div className={styles.filterFooter}>
        <button
          type="button"
          onClick={handleClear}
          className={styles.linkWarning}>

          Clear
        </button>
        <button
          type="button"
          onClick={() => onApply([...staged])}
          className={styles.applyBtn}>

          Apply
        </button>
      </div>
    </div>,
    document.body
  );
}