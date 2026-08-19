import React from "react";
import { Dropdown, TPIcon, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import { TAB_IDS } from "../data/appointmentsConfig";

// The house kebab: straight/bold settings/3-dots-more, rotated to vertical.
export const KebabIcon = ({ size = 16 }) => (
  <TPLibraryIcon
    name="3-dots-more"
    variant="bold"
    corner="straight"
    family="settings"
    size={size}
    style={{ transform: "rotate(90deg)" }}
  />
);

// Per-tab primary CTA for a row, shared by the table's Action column and the
// calendar event card/popover: Queue gets the TypeRx split button, Finished
// prints, Draft resumes, Pending digitises. Cancelled has no CTA at all.
export function rowPrimaryAction(tabId, row, onRowAction) {
  const act = (action) => () => onRowAction?.(action, row);
  switch (tabId) {
    case TAB_IDS.QUEUE:
      return {
        label: "TypeRx",
        variant: "outline",
        theme: "primary",
        onClick: act("type-rx"),
        menu: [
          { id: "type-rx", label: "TypeRx", onClick: act("type-rx") },
          { id: "voice-rx", label: "VoiceRx", onClick: act("voice-rx") },
          { id: "snap-rx", label: "SnapRx", onClick: act("snap-rx") },
          { id: "smart-sync", label: "SmartSync", onClick: act("smart-sync") },
          { id: "tab-rx", label: "TabRx", onClick: act("tab-rx") },
        ],
      };
    case TAB_IDS.FINISHED:
      return { label: "Print Rx", variant: "outline", theme: "primary", icon: "printer", onClick: act("print-rx") };
    case TAB_IDS.DRAFT:
      return { label: "Resume", variant: "outline", theme: "primary", onClick: act("resume-rx") };
    case TAB_IDS.PENDING:
      return { label: "Digitise Rx", variant: "outline", theme: "primary", onClick: act("digitise-rx") };
    default:
      return null;
  }
}

/**
 * The same primary CTA expressed as a kebab row. Calendar cards that are too
 * small to carry a button fold their CTA in here, so the action is never lost
 * just because the card shrank.
 */
export function primaryKebabOption(tabId) {
  switch (tabId) {
    case TAB_IDS.QUEUE:
      return { value: "type-rx", label: "TypeRx", icon: "document-text" };
    case TAB_IDS.FINISHED:
      return { value: "print-rx", label: "Print Rx", icon: "printer" };
    case TAB_IDS.DRAFT:
      return { value: "resume-rx", label: "Resume", icon: "document-text" };
    case TAB_IDS.PENDING:
      return { value: "digitise-rx", label: "Digitise Rx", icon: "document-text" };
    default:
      return null;
  }
}

// Three-dot menu options, mirroring the legacy screen's per-row menu.
export function kebabOptions(tabId) {
  const opts = [];
  /* Joining a teleconsultation lives on the video marker itself, in a
     popover that shows what the call is before you commit to it. Burying it
     in this menu made it one more indistinguishable row. */
  if (tabId === TAB_IDS.DRAFT) {
    opts.push({ value: "print-draft-rx", label: "Print Draft Rx", icon: "printer" });
  }
  // Icon families are pinned to the exact CDN files the design specifies
  // (rounded/linear unless noted).
  opts.push({ value: "patient-details", label: "Patient Details", icon: "user", iconFamily: "users" });
  if (tabId === TAB_IDS.QUEUE) {
    opts.push({ value: "reschedule", label: "Reschedule", icon: "calendar-edit" });
  }
  opts.push({ value: "create-bill", label: "Create Bill", icon: "receipt-text" });
  opts.push({ value: "advance-deposit", label: "Advance Deposit", icon: "money-recive" });
  opts.push({ value: "add-lab-results", label: "Add Lab Results", icon: "lab", iconFamily: "medical" });
  if (tabId !== TAB_IDS.DRAFT && tabId !== TAB_IDS.CANCELLED) {
    opts.push({ value: "cancel-appointment", label: "Cancel Appointment", icon: "clipboard-close", iconFamily: "content-edit" });
  }
  opts.push({ value: "create-certificate", label: "Create Certificate", icon: "award-badge3", iconFamily: "sports2" });
  if (tabId !== TAB_IDS.DRAFT) {
    opts.push({ value: "end-visit", label: "End Visit", icon: "login", iconFamily: "arrow", iconCorner: "straight" });
  }
  return opts;
}

/**
 * The row kebab as a Tesseract Dropdown: icon-only vertical-dots trigger,
 * rows rendered as icon + label with a trailing chevron.
 *
 * The DS menu portals to <body> anchored to the trigger's LEFT edge; from
 * the sticky right column that reads misaligned, so after it opens we snap
 * its right edge to the trigger (menu found via the trigger's aria-controls).
 */
export function RowKebabMenu({ tabId, row, onRowAction, extraOptions = [] }) {
  const wrapRef = React.useRef(null);
  const alignMenu = () => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const trigger = wrapRef.current?.querySelector('button[aria-haspopup="listbox"]');
        const menuId = trigger?.getAttribute("aria-controls");
        const menu = menuId ? document.getElementById(menuId) : null;
        if (!trigger || !menu) return;
        const tr = trigger.getBoundingClientRect();
        menu.style.left = `${Math.max(8, tr.right - menu.offsetWidth)}px`;
      })
    );
  };
  return (
    <div ref={wrapRef} onClickCapture={alignMenu} style={{ display: "inline-flex" }}>
      {renderKebabDropdown(tabId, row, onRowAction, extraOptions)}
    </div>
  );
}

function renderKebabDropdown(tabId, row, onRowAction, extraOptions = []) {
  return (
    <Dropdown
      className="tpKebabMenu"
      options={[...extraOptions, ...kebabOptions(tabId)]}
      value={null}
      onChange={(v) => v && onRowAction?.(v, row)}
      chevron={false}
      variant="seamless"
      placeholder=""
      leadingIcon={<KebabIcon size={16} />}
      ariaLabel="More actions"
      width={232}
      renderOption={(o) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "2px 0" }}>
          <TPLibraryIcon
            name={o.icon}
            family={o.iconFamily}
            corner={o.iconCorner}
            size={16}
            color="var(--tesseract-slate-500)"
          />
          <span style={{ flex: 1, fontSize: 14, color: "var(--tesseract-slate-700)", whiteSpace: "nowrap" }}>
            {o.label}
          </span>
          <TPIcon name="chevron-right" size={14} color="var(--tesseract-slate-400)" />
        </div>
      )}
    />
  );
}
