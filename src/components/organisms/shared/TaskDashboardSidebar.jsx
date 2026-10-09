"use client";

/**
 * TaskDashboardSidebar — 90vw right-side overlay for approval tasks +
 * personal reminders. Ported from gen-admission_redesign's TaskDashboardPage
 * with all shared sub-components inlined so the Auth Frontend has ZERO
 * dependency on gen-UILibrary or the redesign project.
 *
 * Props:
 *   open     — boolean, controls visibility
 *   onClose  — callback, fires on backdrop click or back arrow
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Header, Tabs, TabsList, TabsTrigger,
  Badge, Button, Dropdown, InputBox, ConfirmDialog, TPIcon, TPLibraryIcon,
  DatePicker, DataTable, Checkbox, Toast,
} from "@dhspl-tatvacare/tesseract-ui";
import styles from "./TaskDashboardSidebar.module.css";

/* ════════════════════════════════════════════════════════════════════════════
   INLINED SUB-COMPONENTS (self-contained, no cross-project imports)
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const SORT_SVG = "https://pmdoctorportal.tatvacare.in/tp-icons/straight/outline/essential/sort.svg";

function SortIcon({ size = 16 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block", width: size, height: size, flexShrink: 0,
        backgroundColor: "currentcolor",
        mask: `url(${SORT_SVG}) center/contain no-repeat`,
        WebkitMask: `url(${SORT_SVG}) center/contain no-repeat`,
      }}
    />
  );
}

function KebabIcon({ size = 18 }) {
  return (
    <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
      <TPLibraryIcon name="3-dots-more" variant="bold" corner="straight" size={size} />
    </span>
  );
}

/* ── TopToast ────────────────────────────────────────────────────────────────── */
function TopToast({ status, title, subtext, duration = 2800, onDismiss }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 7000, pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto" }}>
        <Toast status={status} title={title} subtext={subtext || undefined} duration={duration} dismissible onDismiss={onDismiss} className={styles.toast} />
      </div>
    </div>,
    document.body,
  );
}

/* ── EmptyState ──────────────────────────────────────────────────────────────── */
function EmptyState({ icon = "clipboard-text", title, message, actionLabel, onAction, actionIcon = "add", filtered = false, onClear }) {
  const heading = title || (filtered ? "No matching results" : "Nothing here yet");
  const body = message || (filtered ? "No records match your current search or filters." : "Records will appear here once added.");
  const ES = {
    wrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 24px", textAlign: "center" },
    iconCircle: { width: 64, height: 64, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--tesseract-bg-muted, #f2f4f7)", marginBottom: 4 },
    title: { fontFamily: "var(--tesseract-font-heading, Mulish, system-ui, sans-serif)", fontSize: 16, fontWeight: 600, color: "var(--tesseract-fg-primary, #101828)" },
    body: { margin: "0 0 6px", fontSize: 13, color: "var(--tesseract-fg-secondary, #475467)", maxWidth: 360, lineHeight: 1.5 },
  };
  return (
    <div style={ES.wrap}>
      <div style={ES.iconCircle}><TPIcon name={filtered ? "search-normal" : icon} size={30} color="var(--tesseract-fg-tertiary, #98a2b3)" /></div>
      <div style={ES.title}>{heading}</div>
      <p style={ES.body}>{body}</p>
      {filtered && onClear ? (
        <Button variant="outline" theme="neutral" size="md" leftIcon={<TPIcon name="close-circle" size={16} />} onClick={onClear}>Clear filters</Button>
      ) : (!filtered && actionLabel && onAction && (
        <Button variant="solid" theme="primary" size="md" leftIcon={<TPIcon name={actionIcon} size={16} />} onClick={onAction}>{actionLabel}</Button>
      ))}
    </div>
  );
}

/* ── RowActions + RowKebab ───────────────────────────────────────────────────── */
function RowActions({ children }) {
  return <div className={styles.raRow}>{children}</div>;
}

function RowKebab({ options, onChange, ariaLabel }) {
  return (
    <Dropdown variant="seamless" chevron={false} width="auto" placeholder="" value={null}
      leadingIcon={<KebabIcon />} ariaLabel={ariaLabel} options={options} onChange={onChange} />
  );
}

/* ── SearchableFilter ────────────────────────────────────────────────────────── */
function SearchableFilter({ groups = [], value: controlledValue, onChange }) {
  const val = controlledValue || {};
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open]);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const activeCount = Object.values(val).reduce((n, arr) => n + (Array.isArray(arr) ? arr.filter(Boolean).length : 0), 0);
  const q = query.trim().toLowerCase();
  const filteredGroups = groups.map((g) => ({ ...g, options: q ? g.options.filter((o) => o.label.toLowerCase().includes(q)) : g.options })).filter((g) => g.options.length > 0);

  const toggle = (groupId, optValue) => {
    const current = val[groupId] || [];
    const next = current.includes(optValue) ? current.filter((v) => v !== optValue) : [...current, optValue];
    onChange?.({ ...val, [groupId]: next });
  };
  const clearAll = () => { const cleared = {}; groups.forEach((g) => { cleared[g.id] = []; }); onChange?.(cleared); };

  return (
    <div className={styles.sfRoot} ref={rootRef}>
      <button type="button" className={`${styles.sfTrigger} ${open ? styles.sfTriggerOpen : ""}`.trim()} onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open}>
        <span className={styles.sfTriggerIcon}><SortIcon size={16} /></span>
        <span className={styles.sfTriggerLabel}>Filters</span>
        {activeCount > 0 && <span className={styles.sfBadge}>{activeCount}</span>}
        <span className={styles.sfChevron}><TPIcon name="chevron-down" size={14} /></span>
      </button>
      {open && (
        <div className={styles.sfPanel}>
          <div className={styles.sfSearchWrap}>
            <InputBox size="md" placeholder="Search filters..." value={query} onChange={(e) => setQuery(e.target.value)} leftIcon={<TPIcon name="search-normal" size={16} />} fullWidth />
          </div>
          <div className={styles.sfGroupList}>
            {filteredGroups.map((g) => {
              const selected = val[g.id] || [];
              return (
                <div key={g.id} className={styles.sfGroup}>
                  <div className={styles.sfGroupLabel}>{g.label}</div>
                  <div className={styles.sfGroupOptions}>
                    {g.options.map((opt) => (
                      <label key={opt.value} className={styles.sfOptionRow}>
                        <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(g.id, opt.value)} size="md" />
                        <span className={styles.sfOptionLabel}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredGroups.length === 0 && <div className={styles.sfEmptyHint}>No filters match &ldquo;{query}&rdquo;</div>}
          </div>
          {activeCount > 0 && (
            <div className={styles.sfPanelFooter}><button type="button" className={styles.sfClearBtn} onClick={clearAll}>Clear all</button></div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── FilterChips ─────────────────────────────────────────────────────────────── */
function FilterChips({ groups = [], value = {}, onChange }) {
  const chips = [];
  for (const g of groups) {
    const selected = value?.[g.id] || [];
    for (const v of selected) {
      const opt = (g.options || []).find((o) => o.value === v);
      chips.push({ groupId: g.id, group: g.label, value: v, label: opt?.label ?? v });
    }
  }
  if (!chips.length) return null;
  const remove = (groupId, v) => onChange({ ...value, [groupId]: (value[groupId] || []).filter((x) => x !== v) });
  const clearAll = () => onChange({});

  return (
    <div className={styles.fcWrap}>
      <div className={styles.fcCard} role="region" aria-label="Active filters">
        <span className={styles.fcLabel}>Filter: {chips.length}</span>
        <span className={styles.fcDivider} aria-hidden="true" />
        <div className={styles.fcChips}>
          {chips.map((c) => (
            <span key={`${c.groupId}:${c.value}`} className={styles.fcChip}>
              <span className={styles.fcChipGroup}>{c.group}:</span>
              <span className={styles.fcChipValue}>{c.label}</span>
              <button type="button" className={styles.fcRemove} aria-label={`Remove ${c.group} ${c.label}`} onClick={() => remove(c.groupId, c.value)}>
                <TPIcon name="close-square" size={12} />
              </button>
            </span>
          ))}
        </div>
        <button type="button" className={styles.fcClear} onClick={clearAll}>Clear all</button>
      </div>
    </div>
  );
}

/* ── InfiniteTable ───────────────────────────────────────────────────────────── */
function InfiniteTable({ columns, data = [], rowKey, chunk = 12, emptyState = null, rowHeight = "lg", stickyHeader = true, sortable = false, serial = true, className, ...rest }) {
  const allColumns = useMemo(() => {
    if (!serial) return columns;
    const order = new Map();
    data.forEach((row, i) => order.set(row, i + 1));
    const serialCol = { id: "__serial", header: "#", minWidth: 44, maxWidth: 52, width: 48, align: "left", sortable: false, cell: (r) => <span className={styles.itSerial}>{order.get(r) ?? ""}</span> };
    return [serialCol, ...columns];
  }, [columns, data, serial]);

  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(chunk);
  const [availH, setAvailH] = useState(0);

  const [prevReset, setPrevReset] = useState({ data, chunk });
  if (prevReset.data !== data || prevReset.chunk !== chunk) { setPrevReset({ data, chunk }); setVisible(chunk); }

  const total = data.length;
  const loadMore = useCallback(() => { setVisible((v) => (v < total ? Math.min(v + chunk, total) : v)); }, [chunk, total]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setAvailH(Math.max(0, Math.round(el.clientHeight)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;
    const scroller = root.querySelector('[class*="scroller"]') || root;
    const onScroll = () => { if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 96) loadMore(); };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [loadMore, visible, availH]);

  if (total === 0) return <>{emptyState}</>;
  const effectiveMax = availH || 420;

  return (
    <div ref={wrapRef} className={[styles.itScroll, styles.itFill, className].filter(Boolean).join(" ")}>
      <DataTable columns={allColumns} data={data.slice(0, visible)} rowKey={rowKey} rowHeight={rowHeight} stickyHeader={stickyHeader} maxHeight={effectiveMax} stickyMaxHeight={effectiveMax} sortable={sortable} {...rest} />
    </div>
  );
}

/* ── FormDrawer ──────────────────────────────────────────────────────────────── */
function FormDrawer({ open, onClose, title, children, onSave, saveLabel = "Save", saveDisabled = false, hideFooter }) {
  const panelRef = useRef(null);
  const lastFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    lastFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) { panel.focus({ preventScroll: true }); }
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current?.(); } };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const prev = lastFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const FD = {
    overlay: { position: "fixed", inset: 0, background: "rgba(16,24,40,0.45)", display: "flex", justifyContent: "flex-end", zIndex: 7000 },
    panel: { height: "100%", width: "90vw", maxWidth: "96vw", background: "var(--tesseract-bg-surface, #fff)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(16,24,40,0.18)", fontFamily: "var(--tesseract-font-body, Inter, system-ui, sans-serif)", outline: "none" },
    headerActions: { display: "flex", alignItems: "center", gap: 8, flex: "none" },
    body: { flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16, background: "var(--tesseract-bg-page, #f9fafb)" },
  };
  const showHeaderActions = !hideFooter && onSave;
  return createPortal(
    <div onMouseDown={onClose} style={FD.overlay}>
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} style={FD.panel}>
        <Header back onBack={onClose} backIcon="arrow-left3" title={title} height={62} bordered
          trailing={showHeaderActions ? (
            <div style={FD.headerActions}>
              <Button variant="solid" theme="primary" size="md" disabled={saveDisabled} leftIcon={<TPIcon name="check-mark---tick" size={16} />} onClick={onSave}>{saveLabel}</Button>
            </div>
          ) : undefined}
        />
        <div style={FD.body}>{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

function Field({ label, required, children, full }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tesseract-fg-secondary, #475467)" }}>{label}{required && <span style={{ color: "var(--tesseract-fg-error, #d92d20)", marginLeft: 2 }}>*</span>}</span>
      {children}
    </label>
  );
}

function FieldGrid({ columns = 2, children }) {
  const cols = Math.min(columns, 3);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cols === 1 ? "100%" : "280px"}), 1fr))`, gap: 16, maxWidth: "100%" }}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TASK DASHBOARD DATA + CONSTANTS (ported verbatim from redesign)
   ════════════════════════════════════════════════════════════════════════════ */

const WORKFLOW_ICON = {
  purchase_order: "shopping-cart", purchase_request: "document-text",
  rate_contract: "receipt-text", refund: "money-recive",
  invoice_cancellation: "close-circle", receipt_reversal: "rotate-left",
  discharge_clearance: "logout", tpa_clearance: "shield-tick",
  patient_care: "health",
};

const PRIORITY_TONE = { HIGH: "error", MEDIUM: "warning", LOW: "neutral" };
const TASK_STATUS_TONE = { Pending: "warning", Approved: "success", Rejected: "error" };

const TYPE_FILTER_OPTIONS = [
  { value: "purchase_order", label: "Purchase Order" },
  { value: "purchase_request", label: "Purchase Request" },
  { value: "rate_contract", label: "Rate Contract" },
  { value: "refund", label: "Refund" },
  { value: "invoice_cancellation", label: "Invoice Cancellation" },
  { value: "receipt_reversal", label: "Receipt Reversal" },
  { value: "discharge_clearance", label: "Discharge Clearance" },
  { value: "tpa_clearance", label: "TPA Clearance" },
  { value: "patient_care", label: "Patient Care" },
];

const TASK_FILTER_GROUPS = [
  { id: "type", label: "Type", options: TYPE_FILTER_OPTIONS },
  { id: "priority", label: "Priority", options: [
    { value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" },
  ] },
  { id: "branch", label: "Branch", options: [
    { value: "BLR-MAIN", label: "BLR Main" }, { value: "BLR-NORTH", label: "BLR North" }, { value: "DXB-JLT", label: "DXB JLT" },
  ] },
];

const DETAIL_FIELDS = {
  purchase_order: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "vendor", label: "Vendor" }, { key: "store", label: "Store" },
    { key: "item", label: "Item" }, { key: "amount", label: "Amount" },
  ],
  purchase_request: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "department", label: "Department" }, { key: "estimatedAmount", label: "Est. Amount" },
  ],
  rate_contract: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "vendor", label: "Vendor" }, { key: "contractPeriod", label: "Contract Period" },
  ],
  refund: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "patient", label: "Patient" }, { key: "uhid", label: "UHID" },
    { key: "invoice", label: "Invoice" }, { key: "amount", label: "Amount" },
  ],
  invoice_cancellation: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "patient", label: "Patient" }, { key: "uhid", label: "UHID" },
    { key: "invoice", label: "Invoice" }, { key: "reason", label: "Reason" },
  ],
  receipt_reversal: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "receiptNo", label: "Receipt No." }, { key: "amount", label: "Amount" },
  ],
  discharge_clearance: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "patient", label: "Patient" }, { key: "uhid", label: "UHID" },
    { key: "admissionNo", label: "Admission No." },
  ],
  tpa_clearance: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "patient", label: "Patient" }, { key: "uhid", label: "UHID" },
    { key: "tpa", label: "TPA" },
  ],
  patient_care: [
    { key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" },
    { key: "patient", label: "Patient" }, { key: "uhid", label: "UHID" },
    { key: "ward", label: "Ward" },
  ],
};

const MOCK_TASKS = [
  { id: "T-PO-001", title: "PO Amendment Review", type: "purchase_order", priority: "HIGH", subType: "Amendment", branch: "BLR-NORTH", typeLabel: "Purchase Order", dueDate: "02 Jul 2026", createdDate: "28 Jun 2026", vendor: "MedSupply Co.", store: "Central Store", item: "Surgical Gloves", amount: "₹45,000", status: "Pending" },
  { id: "T-PO-002", title: "PO Approval - Emergency Purchase", type: "purchase_order", priority: "HIGH", subType: "New PO", branch: "BLR-MAIN", typeLabel: "Purchase Order", dueDate: "03 Jul 2026", createdDate: "01 Jul 2026", vendor: "PharmaDirect Ltd.", store: "Pharmacy Store", item: "Antibiotics Batch", amount: "₹1,20,000", status: "Pending" },
  { id: "T-PR-001", title: "Purchase Request - Lab Equipment", type: "purchase_request", priority: "MEDIUM", subType: "Capital", branch: "BLR-MAIN", typeLabel: "Purchase Request", dueDate: "05 Jul 2026", createdDate: "01 Jul 2026", department: "Laboratory", estimatedAmount: "₹8,50,000", status: "Pending" },
  { id: "T-RC-001", title: "Rate Contract Renewal", type: "rate_contract", priority: "MEDIUM", subType: "Renewal", branch: "BLR-NORTH", typeLabel: "Rate Contract", dueDate: "06 Jul 2026", createdDate: "27 Jun 2026", vendor: "Global Med Supplies", contractPeriod: "Jul 2026 - Jun 2027", status: "Pending" },
  { id: "T-RF-001", title: "Refund Approval", type: "refund", priority: "HIGH", subType: "Refund", branch: "BLR-MAIN", typeLabel: "Refund", dueDate: "02 Jul 2026", createdDate: "28 Jun 2026", patient: "Ravi Kumar", uhid: "UHID-10234", invoice: "INV-77821", amount: "₹12,500", status: "Pending" },
  { id: "T-IC-001", title: "Invoice Cancellation Request", type: "invoice_cancellation", priority: "MEDIUM", subType: "Cancellation", branch: "BLR-MAIN", typeLabel: "Invoice Cancellation", dueDate: "04 Jul 2026", createdDate: "01 Jul 2026", patient: "Anita Sharma", uhid: "UHID-20456", invoice: "INV-88234", reason: "Duplicate billing", status: "Pending" },
  { id: "T-RR-001", title: "Receipt Reversal - Wrong Entry", type: "receipt_reversal", priority: "LOW", subType: "Reversal", branch: "BLR-NORTH", typeLabel: "Receipt Reversal", dueDate: "07 Jul 2026", createdDate: "02 Jul 2026", receiptNo: "RCP-44521", amount: "₹3,200", status: "Pending" },
  { id: "T-DC-001", title: "Discharge Clearance - IP-240166", type: "discharge_clearance", priority: "HIGH", subType: "Clearance", branch: "BLR-MAIN", typeLabel: "Discharge Clearance", dueDate: "02 Jul 2026", createdDate: "28 Jun 2026", patient: "Mohammed Ali", uhid: "UHID-30112", admissionNo: "IP-240166", status: "Pending" },
  { id: "T-TPA-001", title: "TPA Clearance - Star Health", type: "tpa_clearance", priority: "HIGH", subType: "Clearance", branch: "BLR-MAIN", typeLabel: "TPA Clearance", dueDate: "03 Jul 2026", createdDate: "01 Jul 2026", patient: "Priya Nair", uhid: "UHID-18902", tpa: "Star Health Insurance", status: "Pending" },
  { id: "T-PC-001", title: "Patient Care Plan Review", type: "patient_care", priority: "MEDIUM", subType: "Care Plan", branch: "BLR-NORTH", typeLabel: "Patient Care", dueDate: "05 Jul 2026", createdDate: "01 Jul 2026", patient: "Suresh Patel", uhid: "UHID-22109", ward: "ICU-3", status: "Pending" },
];

const BRANCH_OPTS = [
  { value: "BLR-MAIN", label: "BLR Main" },
  { value: "BLR-NORTH", label: "BLR North" },
  { value: "DXB-JLT", label: "DXB JLT" },
];

const REMINDER_TABS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "overdue", label: "Overdue" },
  { id: "done", label: "Done" },
];

const SORT_OPTS = [
  { value: "due_asc", label: "Due Date ↑" },
  { value: "due_desc", label: "Due Date ↓" },
  { value: "created_desc", label: "Created Date ↓" },
];

const REMINDER_STATUS_TONE = { OPEN: "neutral", OVERDUE: "error", DONE: "success" };

const INITIAL_REMINDERS = [
  { id: "R-001", title: "Follow-up TPA clearance for IP-240166", dueDate: "2026-07-02T11:30", createdDate: "2026-06-28", branch: "DXB-JLT", notes: "Need final discharge approval", status: "OPEN" },
  { id: "R-002", title: "Review refund policy docs for duplicate collections", dueDate: "2026-07-03T10:00", createdDate: "2026-07-01", branch: "BLR-MAIN", notes: "Prepare checklist", status: "OPEN" },
  { id: "R-003", title: "Call insurance desk for pre-auth renewal", dueDate: "2026-07-12T14:00", createdDate: "2026-07-05", branch: "BLR-NORTH", notes: "Patient UHID-22109 - Star Health", status: "OPEN" },
  { id: "R-004", title: "Verify discharge summary for IP-240188", dueDate: "2026-06-28T09:00", createdDate: "2026-06-24", branch: "BLR-MAIN", notes: "Pending doctor sign-off", status: "OPEN" },
  { id: "R-005", title: "Submit monthly TPA reconciliation report", dueDate: "2026-06-25T17:00", createdDate: "2026-06-20", branch: "DXB-JLT", notes: "Overdue - escalate to finance", status: "DONE" },
];

function getReminderCategory(r) {
  if (r.status === "DONE") return "done";
  if (new Date(r.dueDate) < new Date()) return "overdue";
  return "open";
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h12}:${m} ${ampm}`;
}

const emptyDraft = { title: "", dueDate: "", branch: null, notes: "" };

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function TaskDashboardSidebar({ open, onClose }) {
  /* ── Top-level toggle ────────────────────────────────────────────────────── */
  const [view, setView] = useState("tasks");

  /* ── Tasks state ─────────────────────────────────────────────────────────── */
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilters, setTaskFilters] = useState({});
  const [taskDateRange, setTaskDateRange] = useState(null);
  const [reminderDateRange, setReminderDateRange] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [toast, setToast] = useState(null);

  /* ── Reminders state ─────────────────────────────────────────────────────── */
  const [reminders, setReminders] = useState(INITIAL_REMINDERS);
  const [reminderTab, setReminderTab] = useState("all");
  const [reminderSort, setReminderSort] = useState("due_asc");
  const [reminderDrawer, setReminderDrawer] = useState(false);
  const [reminderDraft, setReminderDraft] = useState(emptyDraft);
  const [editId, setEditId] = useState(null);

  /* ── Filtered tasks ──────────────────────────────────────────────────────── */
  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (taskFilters.type?.length && !taskFilters.type.includes(t.type)) return false;
      if (q && !(t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.vendor || "").toLowerCase().includes(q) || (t.patient || "").toLowerCase().includes(q))) return false;
      if (taskFilters.priority?.length && !taskFilters.priority.includes(t.priority)) return false;
      if (taskFilters.branch?.length && !taskFilters.branch.includes(t.branch)) return false;
      if (taskDateRange?.from) {
        const from = new Date(taskDateRange.from); from.setHours(0, 0, 0, 0);
        if (new Date(t.dueDate) < from) return false;
      }
      if (taskDateRange?.to) {
        const to = new Date(taskDateRange.to); to.setHours(23, 59, 59, 999);
        if (new Date(t.dueDate) > to) return false;
      }
      return true;
    });
  }, [tasks, taskQuery, taskFilters, taskDateRange]);

  const tasksFiltered = taskQuery.trim() !== "" || taskFilters.priority?.length || taskFilters.branch?.length || taskFilters.type?.length;
  const clearTaskFilters = () => { setTaskQuery(""); setTaskFilters({}); };

  /* ── Task decision ───────────────────────────────────────────────────────── */
  const decide = (task, decision) => { setPendingDecision({ task, decision }); setDecisionComment(""); };
  const confirmDecision = () => {
    if (!pendingDecision) return;
    if (pendingDecision.decision === "REJECT" && !decisionComment.trim()) return;
    const { task, decision } = pendingDecision;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: decision === "APPROVE" ? "Approved" : "Rejected" } : t));
    setPendingDecision(null);
    setDecisionComment("");
    setToast({ status: decision === "APPROVE" ? "success" : "info", title: `${task.id} ${decision === "APPROVE" ? "approved" : "rejected"}` });
  };

  /* ── Task columns ────────────────────────────────────────────────────────── */
  const taskColumns = [
    {
      id: "title", header: "Task", minWidth: 280, sortable: true, sortAccessor: (r) => r.title,
      cell: (r) => (
        <div className={styles.taskCell}>
          <span className={styles.taskTitle}>{r.title}</span>
          <span className={styles.taskMeta}>{r.id} · {r.subType}</span>
        </div>
      ),
    },
    {
      id: "type", header: "Type", minWidth: 160, sortable: true, sortAccessor: (r) => r.typeLabel,
      cell: (r) => (
        <Badge variant="soft" color="neutral" size="sm">
          <span className={styles.typeBadge}>
            <TPIcon name={WORKFLOW_ICON[r.type] || "task-square"} variant="bulk" size={13} color="currentColor" />
            {r.typeLabel}
          </span>
        </Badge>
      ),
    },
    {
      id: "priority", header: "Priority", minWidth: 100, sortable: true, sortAccessor: (r) => r.priority,
      cell: (r) => <Badge variant="outline" color={PRIORITY_TONE[r.priority] || "neutral"} size="sm">{r.priority}</Badge>,
    },
    {
      id: "branch", header: "Branch", minWidth: 120, sortable: true, sortAccessor: (r) => r.branch,
      cell: (r) => <span className={styles.muted}>{r.branch}</span>,
    },
    {
      id: "due", header: "Due", minWidth: 130, sortable: true, sortAccessor: (r) => r.dueDate,
      cell: (r) => <span className={styles.nowrap}>{r.dueDate}</span>,
    },
    {
      id: "status", header: "Status", minWidth: 110, sortable: true, sortAccessor: (r) => r.status,
      cell: (r) => <Badge variant="soft" color={TASK_STATUS_TONE[r.status] || "neutral"} size="sm">{r.status}</Badge>,
    },
    {
      id: "actions", header: "", sticky: "right", align: "right", minWidth: 160,
      cell: (r) => (
        <RowActions>
          {r.status === "Pending" && (
            <>
              <Button variant="solid" theme="success" size="sm" leftIcon={<TPIcon name="check-mark---tick" size={14} />} onClick={() => decide(r, "APPROVE")} aria-label={`Approve ${r.id}`}>
                Approve
              </Button>
              <Button variant="outline" theme="error" size="sm" leftIcon={<TPIcon name="close-circle" size={14} />} onClick={() => decide(r, "REJECT")} aria-label={`Reject ${r.id}`}>
                Reject
              </Button>
            </>
          )}
          <RowKebab
            ariaLabel={`More for ${r.id}`}
            options={[{ value: "detail", label: "View Details", icon: <TPIcon name="arrow-right2" corner="straight" variant="outline" size={16} /> }]}
            onChange={(v) => { if (v === "detail") setDetailTask(r); }}
          />
        </RowActions>
      ),
    },
  ];

  /* ── Filtered + sorted reminders ─────────────────────────────────────────── */
  const filteredReminders = useMemo(() => {
    let list = reminders.map((r) => ({ ...r, category: getReminderCategory(r) }));
    if (reminderTab !== "all") list = list.filter((r) => r.category === reminderTab);
    if (reminderDateRange?.from) {
      const from = new Date(reminderDateRange.from); from.setHours(0, 0, 0, 0);
      list = list.filter((r) => new Date(r.dueDate) >= from);
    }
    if (reminderDateRange?.to) {
      const to = new Date(reminderDateRange.to); to.setHours(23, 59, 59, 999);
      list = list.filter((r) => new Date(r.dueDate) <= to);
    }
    list.sort((a, b) => {
      if (reminderSort === "due_asc") return new Date(a.dueDate) - new Date(b.dueDate);
      if (reminderSort === "due_desc") return new Date(b.dueDate) - new Date(a.dueDate);
      return new Date(b.createdDate) - new Date(a.createdDate);
    });
    return list;
  }, [reminders, reminderTab, reminderSort, reminderDateRange]);

  /* ── Reminder CRUD ───────────────────────────────────────────────────────── */
  const openNewReminder = () => { setEditId(null); setReminderDraft(emptyDraft); setReminderDrawer(true); };
  const openEditReminder = (r) => {
    setEditId(r.id);
    setReminderDraft({ title: r.title, dueDate: r.dueDate, branch: r.branch, notes: r.notes || "" });
    setReminderDrawer(true);
  };
  const saveReminder = () => {
    if (!reminderDraft.title.trim()) return;
    if (editId) {
      setReminders((prev) => prev.map((r) => r.id === editId ? { ...r, title: reminderDraft.title, dueDate: reminderDraft.dueDate, branch: reminderDraft.branch, notes: reminderDraft.notes } : r));
      setToast({ status: "success", title: "Reminder updated" });
    } else {
      const next = { id: `R-${Date.now()}`, title: reminderDraft.title, dueDate: reminderDraft.dueDate || new Date().toISOString(), createdDate: new Date().toISOString().slice(0, 10), branch: reminderDraft.branch || "BLR-MAIN", notes: reminderDraft.notes, status: "OPEN" };
      setReminders((prev) => [next, ...prev]);
      setToast({ status: "success", title: "Reminder created" });
    }
    setReminderDrawer(false);
  };
  const toggleDone = (r) => {
    const next = r.status === "DONE" ? "OPEN" : "DONE";
    setReminders((prev) => prev.map((x) => x.id === r.id ? { ...x, status: next } : x));
    setToast({ status: next === "DONE" ? "success" : "info", title: next === "DONE" ? "Marked done" : "Re-opened" });
  };

  const setRField = (k) => (v) => setReminderDraft((d) => ({ ...d, [k]: v }));
  const setRInput = (k) => (e) => setReminderDraft((d) => ({ ...d, [k]: e.target.value }));

  /* ── Reminder columns ────────────────────────────────────────────────────── */
  const reminderColumns = [
    {
      id: "title", header: "Reminder", minWidth: 320, sortable: true, sortAccessor: (r) => r.title,
      cell: (r) => (
        <div className={styles.taskCell}>
          <span className={styles.taskTitle}>{r.title}</span>
          {r.notes && <span className={styles.taskMeta}>{r.notes}</span>}
        </div>
      ),
    },
    { id: "branch", header: "Branch", minWidth: 120, sortable: true, sortAccessor: (r) => r.branch, cell: (r) => <span className={styles.muted}>{r.branch}</span> },
    { id: "due", header: "Due", minWidth: 190, sortable: true, sortAccessor: (r) => r.dueDate, cell: (r) => <span className={styles.nowrap}>{fmtDateTime(r.dueDate)}</span> },
    { id: "created", header: "Created", minWidth: 130, sortable: true, sortAccessor: (r) => r.createdDate, cell: (r) => <span className={styles.muted}>{fmtDate(r.createdDate)}</span> },
    {
      id: "status", header: "Status", minWidth: 110,
      cell: (r) => {
        const cat = r.category || getReminderCategory(r);
        return <Badge variant="soft" color={REMINDER_STATUS_TONE[cat.toUpperCase()] || "neutral"} size="sm">{cat.charAt(0).toUpperCase() + cat.slice(1)}</Badge>;
      },
    },
    {
      id: "actions", header: "", sticky: "right", align: "right", minWidth: 140,
      cell: (r) => (
        <RowActions>
          <Button variant="outline" theme={r.status === "DONE" ? "neutral" : "success"} size="sm"
            leftIcon={<TPIcon name={r.status === "DONE" ? "rotate-left" : "check-mark---tick"} size={14} />}
            onClick={() => toggleDone(r)}>
            {r.status === "DONE" ? "Re-open" : "Mark Done"}
          </Button>
          <RowKebab
            ariaLabel={`More for ${r.id}`}
            options={[{ value: "edit", label: "Edit", icon: <TPIcon name="edit-2" size={16} /> }]}
            onChange={(v) => { if (v === "edit") openEditReminder(r); }}
          />
        </RowActions>
      ),
    },
  ];

  /* ── Detail fields for task drawer ───────────────────────────────────────── */
  const detailFields = detailTask ? (DETAIL_FIELDS[detailTask.type] || [{ key: "id", label: "Task ID" }, { key: "dueDate", label: "Due" }]) : [];

  /* ── Don't render anything if closed ─────────────────────────────────────── */
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* ── Backdrop + sliding panel ──────────────────────────────────────── */}
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.page}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <Header bordered back onBack={onClose} backIcon="arrow-left3" title="Task Dashboard" />

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className={styles.body}>
              <div className={styles.tabBar}>
                <Tabs value={view} onValueChange={setView} size="md" variant="line">
                  <TabsList>
                    <TabsTrigger value="tasks" icon={<TPIcon name="task-square" size={18} />}>
                      <span className={styles.tabLabel}>My Tasks{filteredTasks.length > 0 && <Badge variant="soft" color="neutral" size="sm">{filteredTasks.length}</Badge>}</span>
                    </TabsTrigger>
                    <TabsTrigger value="reminders" icon={<TPIcon name="notification" size={18} />}>
                      <span className={styles.tabLabel}>My Reminders{reminders.length > 0 && <Badge variant="soft" color="neutral" size="sm">{reminders.length}</Badge>}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* ═══ MY TASKS ═════════════════════════════════════════════ */}
              {view === "tasks" && (
                <div className={styles.card}>
                  <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                      <InputBox size="md" leftIcon={<TPIcon name="search-normal" size={18} />} placeholder="Search task, vendor or patient..." value={taskQuery} onChange={(e) => setTaskQuery(e.target.value)} />
                    </div>
                    <div style={{ width: 260 }}>
                      <DatePicker mode="range" months={2} showPresets placeholder="Date range" size="md" value={taskDateRange} onChange={setTaskDateRange} fullWidth />
                    </div>
                    <div className={styles.toolbarRight}>
                      <SearchableFilter groups={TASK_FILTER_GROUPS} value={taskFilters} onChange={setTaskFilters} />
                    </div>
                  </div>
                  <FilterChips groups={TASK_FILTER_GROUPS} value={taskFilters} onChange={setTaskFilters} />

                  <InfiniteTable
                    columns={taskColumns}
                    data={filteredTasks}
                    rowKey={(r) => r.id}
                    chunk={15}
                    rowHeight="lg"
                    stickyHeader
                    sortable
                    className={styles.infTable}
                    emptyState={
                      tasksFiltered
                        ? <EmptyState filtered onClear={clearTaskFilters} />
                        : <EmptyState icon="task-square" title="No pending tasks" message="All approval tasks have been actioned." />
                    }
                  />
                </div>
              )}

              {/* ═══ MY REMINDERS ═════════════════════════════════════════ */}
              {view === "reminders" && (
                <div className={styles.card}>
                  <div className={styles.reminderHeader}>
                    <div className={styles.reminderPills}>
                      {REMINDER_TABS.map((tab) => {
                        const count = tab.id === "all" ? reminders.length : reminders.filter((r) => getReminderCategory(r) === tab.id).length;
                        return (
                          <button key={tab.id} className={`${styles.wfPill} ${reminderTab === tab.id ? styles.wfPillActive : ""}`}
                            onClick={() => setReminderTab(tab.id)} aria-pressed={reminderTab === tab.id}>
                            {tab.label}
                            {count > 0 && <span className={styles.wfCount}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className={styles.reminderActions}>
                      <div style={{ width: 220 }}>
                        <DatePicker mode="range" months={2} showPresets placeholder="Date range" size="md" value={reminderDateRange} onChange={setReminderDateRange} fullWidth />
                      </div>
                      <Dropdown size="md" variant="outline" placeholder="Sort" options={SORT_OPTS} value={reminderSort} onChange={setReminderSort} />
                      <Button variant="solid" theme="primary" size="md" leftIcon={<TPIcon name="add" corner="straight" variant="outline" size={16} />} onClick={openNewReminder}>
                        New Reminder
                      </Button>
                    </div>
                  </div>

                  <InfiniteTable
                    columns={reminderColumns}
                    data={filteredReminders}
                    rowKey={(r) => r.id}
                    chunk={15}
                    rowHeight="lg"
                    stickyHeader
                    sortable
                    className={styles.infTable}
                    emptyState={<EmptyState icon="notification" title="No reminders" message="Create a reminder to keep track of follow-ups." actionLabel="New Reminder" onAction={openNewReminder} />}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Task detail drawer ─────────────────────────────────────────────── */}
      <FormDrawer open={!!detailTask} onClose={() => setDetailTask(null)} title={detailTask ? `${detailTask.typeLabel} · ${detailTask.id}` : ""} hideFooter>
        {detailTask && (
          <>
            <div className={styles.detailHead}>
              <Badge variant="soft" color={PRIORITY_TONE[detailTask.priority] || "neutral"} size="md">{detailTask.priority}</Badge>
              <Badge variant="soft" color={TASK_STATUS_TONE[detailTask.status] || "neutral"} size="md">{detailTask.status}</Badge>
            </div>
            <h3 className={styles.detailTitle}>{detailTask.title}</h3>
            <FieldGrid columns={2}>
              {detailFields.map((f) => (
                <Field key={f.key} label={f.label}><span className={styles.detailValue}>{detailTask[f.key] || "-"}</span></Field>
              ))}
              <Field label="Branch"><span className={styles.detailValue}>{detailTask.branch}</span></Field>
              <Field label="Created"><span className={styles.detailValue}>{detailTask.createdDate}</span></Field>
            </FieldGrid>
            {detailTask.status === "Pending" && (
              <div className={styles.detailActions}>
                <Button variant="solid" theme="success" size="md" leftIcon={<TPIcon name="check-mark---tick" size={16} />} onClick={() => { setDetailTask(null); decide(detailTask, "APPROVE"); }}>Approve</Button>
                <Button variant="outline" theme="error" size="md" leftIcon={<TPIcon name="close-circle" size={16} />} onClick={() => { setDetailTask(null); decide(detailTask, "REJECT"); }}>Reject</Button>
              </div>
            )}
          </>
        )}
      </FormDrawer>

      {/* ── Reminder create/edit drawer ─────────────────────────────────────── */}
      <FormDrawer open={reminderDrawer} onClose={() => setReminderDrawer(false)} title={editId ? "Edit Reminder" : "New Reminder"} onSave={saveReminder} saveLabel={editId ? "Update" : "Create"} saveDisabled={!reminderDraft.title.trim()}>
        <Field label="Reminder Title" required full>
          <InputBox size="md" placeholder="e.g. Follow-up TPA clearance" value={reminderDraft.title} onChange={setRInput("title")} fullWidth />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Due Date & Time">
            <InputBox type="datetime-local" size="md" value={reminderDraft.dueDate} onChange={setRInput("dueDate")} leftIcon={<TPIcon name="calendar" size={18} />} fullWidth />
          </Field>
          <Field label="Branch">
            <Dropdown options={BRANCH_OPTS} value={reminderDraft.branch} onChange={setRField("branch")} placeholder="Select branch" />
          </Field>
        </FieldGrid>
        <Field label="Notes" full>
          <InputBox size="md" placeholder="Additional context (max 500 chars)" value={reminderDraft.notes} onChange={setRInput("notes")} autoGrow maxHeight={140} fullWidth />
        </Field>
      </FormDrawer>

      {/* ── Decision confirm dialog ────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!pendingDecision}
        onOpenChange={(o) => { if (!o) setPendingDecision(null); }}
        title={pendingDecision?.decision === "APPROVE" ? "Approve Task" : "Reject Task"}
        description={pendingDecision ? `${pendingDecision.decision === "APPROVE" ? "Approve" : "Reject"} ${pendingDecision.task.id} - ${pendingDecision.task.title}?` : ""}
        primaryLabel={pendingDecision?.decision === "APPROVE" ? "Approve" : "Reject"}
        primaryVariant="solid"
        primaryTheme={pendingDecision?.decision === "APPROVE" ? "success" : "error"}
        primaryDisabled={pendingDecision?.decision === "REJECT" && !decisionComment.trim()}
        onPrimary={confirmDecision}
        secondaryLabel="Cancel"
        secondaryVariant="outline"
        secondaryTheme="neutral"
        onSecondary={() => setPendingDecision(null)}
      >
        <Field label={pendingDecision?.decision === "REJECT" ? "Reason (required)" : "Comments (optional)"} full>
          <InputBox size="md" placeholder="Add a comment..." value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} autoGrow maxHeight={140} fullWidth />
        </Field>
      </ConfirmDialog>

      {toast && <TopToast status={toast.status} title={toast.title} onDismiss={() => setToast(null)} />}
    </>,
    document.body,
  );
}

export default TaskDashboardSidebar;
