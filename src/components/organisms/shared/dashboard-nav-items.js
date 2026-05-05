"use client";

/**
 * Top-level dashboard navigation items shown in the SecondaryNavPanel
 * left rail across every listing-style page (Appointments, All Patients,
 * future OPD Billing etc.). The order here is the source of truth — both
 * `DrAgentPage` and `AllPatientsPage` import this list, so adding /
 * reordering an item updates every page at once.
 *
 * Each entry has:
 *   - id     stable identifier; matched against the page's `activeId`
 *   - label  short text shown beneath the icon
 *   - icon   iconsax-reactjs component (Linear when inactive, Bulk when
 *            active — handled by the renderIcon callback)
 *   - href   route to navigate to. Items whose feature page hasn't been
 *            built yet omit `href`; clicking them only updates the
 *            visual selection, the user stays on the current page.
 *   - badge  optional `{ text, gradient }` pill (top-right of icon)
 */

import {
  Calendar2,
  CalendarAdd,
  DocumentLike,
  Hospital,
  MessageProgramming,
  Profile2User,
  ReceiptText,
  Shop,
} from "iconsax-reactjs";

export const DASHBOARD_NAV_ITEMS = [
  // 1) Appointments — also the home (`/` re-exports tp-appointment-screen).
  { id: "appointments", label: "Appointments", icon: Calendar2, href: "/tp-appointment-screen" },
  // 2) All Patients — practice-wide directory.
  { id: "all-patients", label: "All Patients", icon: Profile2User, href: "/all-patients" },
  // 3) Follow-ups — patients with a scheduled return visit.
  { id: "follow-ups", label: "Follow-ups", icon: CalendarAdd, href: "/follow-ups" },
  // 4) OPD Billing — placeholder until the master billing module is ported.
  {
    id: "opd-billing",
    label: "OPD Billing",
    icon: ReceiptText,
    badge: {
      text: "Trial",
      gradient: "linear-gradient(257.32deg, rgb(241, 82, 35) 0%, rgb(255, 152, 122) 47.222%, rgb(241, 82, 35) 94.444%)",
    },
  },
  { id: "pharmacy", label: "Pharmacy", icon: Shop },
  { id: "ipd", label: "IPD", icon: Hospital },
  { id: "daycare", label: "Daycare", icon: DocumentLike },
  { id: "bulk-messages", label: "Bulk Messages", icon: MessageProgramming },
];
