import React from "react";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { Dropdown, TPIcon, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import { TAB_IDS } from "../data/appointmentsConfig";
import { useOpdBilling } from "../../opdBilling/useOpdBilling";
import { env } from "../../../EnvironmentConfig";
import { getDecodedToken } from "../../../utils/localStorage";
import { shouldShowAdmitToIpdCta } from "../../../utils/utils";
import { GB_HEALTH_CHECKUP_REPORT, GB_NEW_IPD, GB_NEW_IPD_HOS_BUSINESS_ID } from "../../../utils/constants";
import { useListingAccess } from "../data/useListingAccess";

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

const RX = {
  smart: { id: "smart-rx", action: "smart-sync", label: "SmartRx" },
  tab: { id: "tab-rx", action: "tab-rx", label: "TabRx" },
  voice: { id: "voice-rx", action: "voice-rx", label: "Voice Rx" },
  snap: { id: "snap-rx", action: "snap-rx", label: "SnapRx" },
  consult: { id: "consult", action: "type-rx", label: "Consult" },
};

/**
 * Same option lists and priority logic as PrimaryActionButton.js:
 *
 * Priority order: SmartRx > TabRx > VoiceRx (paid) > SnapRx > Consult > VoiceRx (free/unpaid)
 *
 * Special cases:
 *   Chikitsalay: Consult only (no dropdown)
 *   CVT / Mission: SmartRx only (if accessible on desktop), else Consult only
 *   Dental & Enabled: Consult is primary, dropdown has SmartRx, VoiceRx, SnapRx, TabRx
 *   Zydus: Consult is primary, dropdown has SmartRx, TabRx, VoiceRx, SnapRx
 */
export function queueRxChoices(ctx = {}) {
  // Chikitsalay clinic queue: a plain Consult, same as AppointmentData.js / Welcome1.js
  if (ctx.isChikitsalay) return { primary: RX.consult, rest: [] };

  if (ctx.isCvtExtHos) {
    if (ctx.canShowSmartRx) return { primary: RX.smart, rest: [] };
    return { primary: RX.consult, rest: [] };
  }

  if (ctx.isDentalEnabled) {
    const dropdown = [];
    if (ctx.canShowSmartRx) dropdown.push(RX.smart);
    if (ctx.isVoiceRxAccessible) dropdown.push(RX.voice);
    if (ctx.isSnapRxAccessible) dropdown.push(RX.snap);
    if (ctx.isTabRxVisible) dropdown.push(RX.tab);
    return { primary: RX.consult, rest: dropdown };
  }

  if (ctx.isZydusAccount) {
    const dropdown = [];
    if (ctx.canShowSmartRx) dropdown.push(RX.smart);
    if (ctx.isTabRxVisible) dropdown.push(RX.tab);
    if (ctx.isVoiceRxAccessible) dropdown.push(RX.voice);
    if (ctx.isSnapRxAccessible) dropdown.push(RX.snap);
    return { primary: RX.consult, rest: dropdown };
  }

  const allAvailableOptions = [];
  if (ctx.canShowSmartRx) {
    allAvailableOptions.push(RX.smart);
  }
  if (ctx.isTabRxVisible) {
    allAvailableOptions.push(RX.tab);
  }
  if (ctx.isVoiceRxAccessible && ctx.isVoiceRxPaid) {
    allAvailableOptions.push(RX.voice);
  }
  if (ctx.isSnapRxAccessible) {
    allAvailableOptions.push(RX.snap);
  }
  allAvailableOptions.push(RX.consult);
  if (ctx.isVoiceRxAccessible && !ctx.isVoiceRxPaid) {
    allAvailableOptions.push(RX.voice);
  }

  const primary = allAvailableOptions[0] || RX.consult;
  const rest = allAvailableOptions.slice(1);
  return { primary, rest };
}

function asTablePrimary(choice, act) {
  if (!choice?.primary) return null;
  const { primary, rest } = choice;
  const menu = rest
    .filter((o) => o.action !== primary.action && o.label !== "TypeRx")
    .map((o) => ({ id: o.id, label: o.label, onClick: act(o.action) }));
  return {
    label: primary.label === "TypeRx" ? "Consult" : primary.label,
    variant: "outline",
    theme: "primary",
    onClick: act(primary.action),
    ...(menu.length ? { menu } : {}),
  };
}

// Per-tab primary CTA for a row, shared by the table's Action column and the
// calendar event card/popover: Queue gets the Consult split button, Finished
// prints, Draft resumes, Pending digitises. Cancelled has no CTA at all.
export function rowPrimaryAction(tabId, row, onRowAction, ctx = {}) {
  const act = (action) => () => onRowAction?.(action, row);
  switch (tabId) {
    case TAB_IDS.QUEUE:
      return asTablePrimary(queueRxChoices(ctx), act);
    case TAB_IDS.REFERRAL:
      // Same Consult / SmartRx / VoiceRx / SnapRx split as Queue (AppointmentData.js
      // treats TAB_QUEUE and TAB_REFERRAL as isQueueOrReferralTab). Chikitsalay
      // Consult-only does not apply here — that gate is clinic-queue only.
      return asTablePrimary(queueRxChoices({ ...ctx, isChikitsalay: false }), act);
    case TAB_IDS.FINISHED:
      return { label: "Print Rx", variant: "outline", theme: "primary", icon: "printer", onClick: act("print-rx") };
    case TAB_IDS.DRAFT:
      return { label: "Resume", variant: "outline", theme: "primary", onClick: act("resume-rx") };
    case TAB_IDS.PENDING:
      return { label: "Digitise Rx", variant: "outline", theme: "primary", onClick: act("digitise-rx") };
      // Chikitsalay Appointment tab: no Action column (AppointmentData.js).
      // Normally no Action column here — Check-in when Queue Management is on.
    case TAB_IDS.CLINIC_APPOINTMENT:
      return ctx.isQueueManagementEnabled
        ? { label: "Check-in", variant: "outline", theme: "primary", onClick: act("check-in") }
        : null;
    // Zydus Encounter: Rx split like legacy PrimaryActionButton, but hide once
    // finishedData already has this encounter (legacy AppointmentData.js).
    case TAB_IDS.ZYDUS_ENCOUNTER: {
      const encounterId = row?.raw?.encounterId ?? row?.raw?.pam_ref_id;
      if (
        encounterId != null &&
        ctx.finishedEncounterIds?.has(String(encounterId))
      ) {
        return null;
      }
      return asTablePrimary(queueRxChoices(ctx), act);
    }
    // Legacy UAT: Appointment tab has an empty Action column — no Consult.
    case TAB_IDS.ZYDUS_APPOINTMENT:
      return null;
    default:
      return null;
  }
}

/**
 * The same primary CTA expressed as a kebab row. Calendar cards that are too
 * small to carry a button fold their CTA in here, so the action is never lost
 * just because the card shrank.
 */
export function primaryKebabOption(tabId, ctx = {}) {
  switch (tabId) {
    case TAB_IDS.QUEUE: {
      const { primary } = queueRxChoices(ctx);
      return primary ? { value: primary.action, label: primary.label, icon: "document-text" } : null;
    }
    case TAB_IDS.REFERRAL: {
      const { primary } = queueRxChoices({ ...ctx, isChikitsalay: false });
      return primary ? { value: primary.action, label: primary.label, icon: "document-text" } : null;
    }
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

/* Pending digitisation is finished visits waiting to be typed up, so the
   kebab follows the Finished filters (no Cancel / End Visit; End Visit
   Reason stays). Calendar "All" passes the row's own status as tabId. */
function kebabTab(tabId) {
  return tabId === TAB_IDS.PENDING ? TAB_IDS.FINISHED : tabId;
}

/**
 * Three-dot menu options, matching AppointmentData.getMenuItems: same
 * items, same order, same tab / Zydus / billing / ABHA / IPD / health-
 * checkup gates. Join stays on the video marker, not in this menu.
 */
export function kebabOptions(tabId, row, ctx = {}) {
  if (ctx.isCvtExtHos) return [];
  // Zydus Encounter / Appointment rows have no kebab — consult is the only action
  if (tabId === TAB_IDS.ZYDUS_ENCOUNTER || tabId === TAB_IDS.ZYDUS_APPOINTMENT) return [];
  // Chikitsalay Appointment tab has no kebab unless Queue Management is on (mirrors the Check-in CTA gate in rowPrimaryAction above).
  if (tabId === TAB_IDS.CLINIC_APPOINTMENT && !ctx.isQueueManagementEnabled) return [];
  const tab = kebabTab(tabId);
  const rec = row?.raw || row || {};
  const isDraft = tab === TAB_IDS.DRAFT;
  const isQueue = tab === TAB_IDS.QUEUE;
  const isClinicAppointment = tab === TAB_IDS.CLINIC_APPOINTMENT;
  const isFinished = tab === TAB_IDS.FINISHED;
  const isCancelled = tab === TAB_IDS.CANCELLED;
  const isReferral = tab === TAB_IDS.REFERRAL;
  const billed = !!(rec.billStatus && rec.billStatus !== "Unbilled");
  const opts = [];

  if (isDraft) {
    opts.push({ value: "print-draft-rx", label: "Print Draft Rx", icon: "printer" });
  }
  opts.push({ value: "patient-details", label: "Patient Details", icon: "user", iconFamily: "users" });
  if (isQueue || isClinicAppointment) {
    opts.push({ value: "reschedule", label: "Reschedule", icon: "calendar-edit" });
  }
  if (ctx.isOpdBillingAccessable) {
    opts.push({
      value: "create-bill",
      label: billed ? "View/Create Bill" : "Create Bill",
      icon: "receipt-text",
    });
    opts.push({ value: "advance-deposit", label: "Advance Deposit", icon: "money-recive" });
  }
  opts.push({ value: "add-lab-results", label: "Add Lab Results", icon: "lab", iconFamily: "medical" });
  /* Legacy: hidden on Draft at build time, then stripped on Finished /
     Cancelled (and Queue+Zydus does not touch Cancel). */
  if (!isDraft && !isFinished && !isCancelled && !isReferral) {
    opts.push({
      value: "cancel-appointment",
      label: "Cancel Appointment",
      icon: "clipboard-close",
      iconFamily: "content-edit",
    });
  }
  opts.push({ value: "create-certificate", label: "Create Certificate", icon: "award-badge3", iconFamily: "sports2" });
  if (ctx.canAdmitToIpd) {
    opts.push({ value: "admit-to-ipd", label: "Admit to IPD", icon: "hospital", iconFamily: "medical" });
  }
  /* End Visit: not Draft; stripped on Finished / Cancelled; Queue+Zydus
     also strips it (Zydus encounters are closed from their own flow).
     Referral matches Cancelled (AppointmentData.js filters endvisit / cancelappt). */
  if (!isDraft && !isFinished && !isCancelled && !isReferral && !(isQueue && ctx.isZydus)) {
    opts.push({ value: "end-visit", label: "End Visit", icon: "login", iconFamily: "arrow", iconCorner: "straight" });
  }
  /* End Visit Reason is the read-only Finished view of tpvl_remarks.
     Queue, Draft, Cancelled, and Zydus Queue never show it — except
     Chikitsalay clinic queue, where AppointmentData.js falls through
     to the unfiltered menu and leaves it in. */
  if (isFinished || (isQueue && ctx.isChikitsalay)) {
    opts.push({ value: "end-visit-reason", label: "End Visit Reason", icon: "message-text" });
  }
  opts.push({ value: "upload-records", label: "Upload Medical Records", icon: "document-upload" });
  if (!rec.abhaAddress && ctx.hipId && ctx.abhaEnable) {
    opts.push({ value: "create-abha", label: "Create/Link ABHA", icon: "card" });
  }
  if (ctx.canHealthCheckupReport) {
    opts.push({
      value: "health-checkup-report",
      label: "Generate Health Check-up Report",
      icon: "clipboard-text",
    });
  }
  if (rec.abhaAddress && ctx.hipId && ctx.abhaEnable) {
    opts.push({ value: "download-abha", label: "Download ABHA Card", icon: "document-download" });
  }
  return opts;
}

const EMPTY_EXTRA = [];

/**
 * The row kebab as a Tesseract Dropdown: icon-only vertical-dots trigger,
 * rows rendered as icon + label with a trailing chevron.
 *
 * The DS menu portals to <body> anchored to the trigger's LEFT edge; from
 * the sticky right column that reads misaligned, so after it opens we snap
 * its right edge to the trigger (menu found via the trigger's aria-controls).
 */
export function RowKebabMenu({ tabId, row, onRowAction, extraOptions = EMPTY_EXTRA }) {
  const wrapRef = React.useRef(null);
  const { isOpdBillingAccessable } = useOpdBilling();
  const isNewIPDAccessableFromGB = useFeatureIsOn(GB_NEW_IPD);
  const isNewIPDHosBusinessIdAccessableFromGB = useFeatureIsOn(GB_NEW_IPD_HOS_BUSINESS_ID);
  const isHealthCheckupReportAccessableFromGB = useFeatureIsOn(GB_HEALTH_CHECKUP_REPORT);
  const { isCvtExtHos, isChikitsalay, isQueueManagementEnabled } = useListingAccess();
  const profile = useSelector((state) => state.doctors?.profile);
  const isZydus = getDecodedToken()?.result?.hospital_business_id == env.zydus_business_id;
  const options = React.useMemo(
    () => [
      ...extraOptions,
      ...kebabOptions(tabId, row, {
        isCvtExtHos,
        isChikitsalay,
        isQueueManagementEnabled,
        isOpdBillingAccessable,
        isZydus,
        canAdmitToIpd: shouldShowAdmitToIpdCta({
          isNewIPDAccessableFromGB,
          isNewIPDHosBusinessIdAccessableFromGB,
        }),
        canHealthCheckupReport: isHealthCheckupReportAccessableFromGB,
        hipId: profile?.HipID,
        abhaEnable: profile?.abhaEnable,
      }),
    ],
    [
      extraOptions,
      tabId,
      row,
      isCvtExtHos,
      isChikitsalay,
      isQueueManagementEnabled,
      isOpdBillingAccessable,
      isZydus,
      isNewIPDAccessableFromGB,
      isNewIPDHosBusinessIdAccessableFromGB,
      isHealthCheckupReportAccessableFromGB,
      profile?.HipID,
      profile?.abhaEnable,
    ]
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
      {renderKebabDropdown(row, onRowAction, options)}
    </div>
  );
}

function renderKebabDropdown(row, onRowAction, options) {
  return (
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
      renderOption={(o) => {
        const body = (
          <>
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
          </>
        );
        const rowStyle = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "2px 0", margin: 0 };
        return <div style={rowStyle}>{body}</div>;
      }}
    />
  );
}
