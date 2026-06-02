"use client";

/**
 * PatientActionsMenu — three-dot kebab menu used across patient-listing
 * pages (Appointments, All Patients, Follow-ups). The full list of
 * possible items is shared so iconography and labels stay aligned;
 * each caller passes a `slots` prop that picks the subset relevant to
 * its surface.
 *
 *   <PatientActionsMenu
 *     slots={["edit", "upload", "certificate", "admit-ipd",
 *             "advance-deposit", "add-labs", "health-checkup",
 *             "create-bill"]}
 *     onSelect={(id) => router.push(...) /* etc. *\/}
 *   />
 *
 * Icons are rendered in TP violet (`var(--tp-violet-500)`) so the kebab
 * menu reads as an "AI / contextual action" surface, distinct from
 * primary CTAs (which use TP blue).
 */

import {
  ClipboardEdit as EditIcon,
  UploadCloud,
  FileText,
  Hospital as HospitalIcon,
  Wallet,
  FlaskConical,
  Stethoscope,
  ReceiptText,
  XCircle,
  CheckCircle2,
  Eye,
  BellRing,
  Calendar,
  MoreVertical,
} from "@/src/components/atoms/icons/lucide";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/molecules/DropdownMenu";

/**
 * Single source of truth for every kebab action across the patient
 * surfaces. Adding an action here makes it available to any page that
 * lists its slot id in `slots`.
 */
const ACTION_DEFS = {
  // ── Patient profile actions ──
  view: { label: "View patient details", icon: Eye },
  edit: { label: "Edit patient details", icon: EditIcon },
  upload: { label: "Upload medical records", icon: UploadCloud },
  certificate: { label: "Create certificate", icon: FileText },
  "admit-ipd": { label: "Admit to IPD", icon: HospitalIcon },
  "advance-deposit": { label: "Advance deposit", icon: Wallet },
  "add-labs": { label: "Add lab results", icon: FlaskConical },
  "health-checkup": { label: "Generate health checkup report", icon: Stethoscope },
  "create-bill": { label: "Create bill", icon: ReceiptText },
  "book-appointment": { label: "Book appointment", icon: Calendar },

  // ── Appointment-specific actions ──
  "cancel-appointment": {
    label: "Cancel appointment",
    icon: XCircle,
    tone: "danger",
  },
  "end-visit": { label: "End visit", icon: CheckCircle2 },

  // ── Follow-up specific actions ──
  "send-reminder": { label: "Send patient reminder", icon: BellRing },
};

export function PatientActionsMenu({
  slots,
  onSelect,
  align = "end",
  ariaLabel = "More actions",
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-tp-slate-500 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-700">
          <MoreVertical size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className="w-[260px] rounded-[12px] border border-tp-slate-100 bg-white p-1 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.18)]">
        {slots.map((slot, i) => {
          // Insert a thin separator before "Cancel appointment" / "End visit"
          // / "send-reminder" so destructive / terminal actions are
          // visually grouped at the bottom of the menu.
          const def = ACTION_DEFS[slot];
          if (!def) return null;
          const Icon = def.icon;
          const tone = def.tone === "danger" ? "text-tp-error-600" : "text-tp-slate-700";
          // Neutral icons in dropdowns — color follows the row's text tone
          // (slate for normal items, error for danger items) via currentColor.
          const iconColor = "currentColor";
          const isTerminal =
            slot === "cancel-appointment" || slot === "end-visit" || slot === "send-reminder";
          const prevSlot = i > 0 ? slots[i - 1] : null;
          const prevTerminal =
            prevSlot === "cancel-appointment" ||
            prevSlot === "end-visit" ||
            prevSlot === "send-reminder";
          const showSeparator = isTerminal && i > 0 && !prevTerminal;
          return (
            <span key={slot}>
              {showSeparator ? <DropdownMenuSeparator className="my-1 bg-tp-slate-100" /> : null}
              <DropdownMenuItem
                className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-medium ${tone} focus:bg-tp-violet-50/60`}
                onSelect={(e) => {
                  e.preventDefault();
                  onSelect?.(slot);
                }}>
                <Icon size={16} strokeWidth={1.6} color={iconColor} />
                <span>{def.label}</span>
              </DropdownMenuItem>
            </span>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
