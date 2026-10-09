import React from "react";
import { Dropdown, TPIcon, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import { TAB_IDS } from "../../appointment-listing/data/appointmentsConfig";
import { KebabIcon } from "../../appointment-listing/components/rowActions";

/** Receptionist kebab: reschedule (queue) and cancel only. */
export function receptionistKebabOptions(tabId, row) {
  const tab = tabId === TAB_IDS.ALL ? row?.status || tabId : tabId;
  const isQueue = tab === TAB_IDS.QUEUE;
  const isCancelled = tab === TAB_IDS.CANCELLED;
  const isFinished = tab === TAB_IDS.FINISHED;
  const opts = [];

  if (isQueue) {
    opts.push({ value: "reschedule", label: "Reschedule", icon: "calendar-edit" });
  }
  if (!isFinished && !isCancelled) {
    opts.push({
      value: "cancel-appointment",
      label: "Cancel Appointment",
      icon: "clipboard-close",
      iconFamily: "content-edit",
    });
  }
  return opts;
}

export function ReceptionistRowKebabMenu({ tabId, row, onRowAction }) {
  const wrapRef = React.useRef(null);
  const options = React.useMemo(
    () => receptionistKebabOptions(tabId, row),
    [tabId, row]
  );

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

  if (options.length === 0) return null;

  return (
    <div ref={wrapRef} onClickCapture={alignMenu} style={{ display: "inline-flex" }}>
      <Dropdown
        className="tpKebabMenu"
        options={options}
        value={null}
        onChange={(v) => {
          const value = v && typeof v === "object" ? v.value : v;
          if (value) onRowAction?.(value, row);
        }}
        chevron={false}
        variant="seamless"
        placeholder=""
        leadingIcon={<KebabIcon size={16} />}
        ariaLabel="More actions"
        width={300}
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
    </div>
  );
}

/** No primary Rx CTA for receptionist rows. */
export function receptionistRowPrimaryAction() {
  return null;
}
