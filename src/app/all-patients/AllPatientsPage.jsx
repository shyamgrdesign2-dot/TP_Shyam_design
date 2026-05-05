"use client";

/**
 * AllPatientsPage — practice-wide patient directory.
 *
 * Mirrors `DrAgentPage` chrome (AppTopHeader + SecondaryNavPanel +
 * AppointmentBanner + white-card with -mt-[60px] overlap). Body shows
 * a single-table directory with search, date filter, and a "Showing X
 * of Y" count + download affordance at the right end of the toolbar.
 *
 * Per spec:
 *   • Single primary CTA in the banner ("Add New Patient") — no
 *     secondary CTA on this page.
 *   • Filter bar: search input + date range picker (replaces the
 *     generic "Filter" dropdown). Right end shows a soft "Showing X of
 *     Y patients" count and a Lucide download icon.
 *   • Action column renders a TP-styled "View" button (≥90px wide so
 *     it stays clickable) plus the shared PatientActionsMenu (kebab).
 *   • Every patient gets a `lastVisit`; the symptom virus icon is not
 *     shown here — that affordance belongs on the Appointments queue.
 *   • Patient IDs follow the practice convention: `P80` prefix + a
 *     6-digit suffix.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { Profile2User } from "iconsax-reactjs";

import { cn } from "@/src/hooks/utils";
import { TPButton as Button } from "@/src/components/atoms/Button/button-system";
import { SecondaryNavPanel as TPSecondaryNavPanel } from "@/src/components/organisms/shared/SecondaryNavPanel";
import { AppTopHeader } from "@/src/components/organisms/shared/AppTopHeader";
import { DASHBOARD_NAV_ITEMS } from "@/src/components/organisms/shared/dashboard-nav-items";
import { PatientActionsMenu } from "@/src/components/organisms/shared/PatientActionsMenu";
import { AppointmentBanner } from "@/src/components/molecules/AppointmentBanner";
import { DateRangePicker } from "@/src/components/molecules/DateRangePicker";
import { Plus } from "lucide-react";

// Patient ID convention: `P80` prefix + 6-digit suffix (e.g. P80123456).
const MOCK_PATIENTS = [
  { id: "apt-ramesh-ckd", name: "Ramesh Kumar", gender: "M", age: 76, contact: "+91-9876012345", pid: "P80290101", category: "Chronic – CKD", lastVisit: "2025-12-04" },
  { id: "apt-neha", name: "Neha Gupta", gender: "F", age: 32, contact: "+91-9876501234", pid: "P80290234", category: "Follow-up", lastVisit: "2026-02-15" },
  { id: "apt-zerodata", name: "Ramesh M", gender: "M", age: 35, contact: "+91-9812700001", pid: "P80290367", category: "New", lastVisit: "2026-01-08" },
  { id: "__patient__", name: "Shyam GR", gender: "M", age: 25, contact: "+91-9812734567", pid: "P80290412", category: "Follow-up", lastVisit: "2026-01-22" },
  { id: "apt-anjali", name: "Anjali Patel", gender: "F", age: 28, contact: "+91-9988771122", pid: "P80290578", category: "New", lastVisit: "2026-01-15" },
  { id: "apt-vikram", name: "Vikram Singh", gender: "M", age: 42, contact: "+91-9001234567", pid: "P80290643", category: "Chronic – HTN", lastVisit: "2026-01-30" },
  { id: "apt-priya", name: "Priya Rao", gender: "F", age: 26, contact: "+91-9876543210", pid: "P80290721", category: "Follow-up", lastVisit: "2026-02-10" },
  { id: "apt-arjun", name: "Arjun S", gender: "M", age: 4, contact: "+91-9123456789", pid: "P80290854", category: "Pediatric", lastVisit: "2026-01-18" },
  { id: "apt-lakshmi", name: "Lakshmi K", gender: "F", age: 45, contact: "+91-9988776655", pid: "P80290917", category: "Follow-up", lastVisit: "2026-02-21" },
  { id: "fin-meera", name: "Meera Nair", gender: "F", age: 38, contact: "+91-9811223344", pid: "P80291023", category: "Follow-up", lastVisit: "2026-02-28" },
  { id: "fin-suresh", name: "Suresh Kumar", gender: "M", age: 52, contact: "+91-9900112233", pid: "P80291148", category: "Chronic – DM+HTN", lastVisit: "2026-02-08" },
  { id: "fin-deepa", name: "Deepa Verma", gender: "F", age: 30, contact: "+91-9876001122", pid: "P80291269", category: "New", lastVisit: "2026-01-12" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const ALL_PATIENTS_ACTIONS = [
  "edit",
  "upload",
  "certificate",
  "admit-ipd",
  "advance-deposit",
  "add-labs",
  "health-checkup",
  "create-bill",
];

export function AllPatientsPage() {
  const router = useRouter();
  const [activeRailItem, setActiveRailItem] = useState("all-patients");
  const [query, setQuery] = useState("");
  // Default to the "Till Date" preset — every patient up to and
  // including today. Doctor can switch to a tighter window via the
  // picker. Matches the "till-date" id added to DateRangePicker.
  const [dateFilter, setDateFilter] = useState("till-date");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_PATIENTS;
    return MOCK_PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.contact.toLowerCase().includes(q) ||
        p.pid.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [query]);

  function openPatientDetails(p) {
    const params = new URLSearchParams({
      patientId: p.id,
      name: p.name,
      gender: p.gender,
      age: String(p.age),
      from: "all-patients",
    });
    router.push(`/patient-details?${params.toString()}`);
  }

  function handlePatientAction(slotId, p) {
    // Stub: the real wiring will route each slot to the appropriate
    // sub-flow once the backend services land. For now, log + visit
    // patient details so the menu is interactive.
    // eslint-disable-next-line no-console
    console.info("[all-patients] action", slotId, p.name);
    if (slotId === "edit" || slotId === "view") openPatientDetails(p);
  }

  function handleDownload() {
    // CSV export of the currently filtered list. Kept inline because
    // it's a single-row dependency-free helper.
    const rows = [
      ["#", "Name", "Gender", "Age", "Contact", "Patient ID", "Category", "Last Visit"],
      ...filtered.map((p, i) => [
        i + 1,
        p.name,
        p.gender === "M" ? "Male" : "Female",
        p.age,
        p.contact,
        p.pid,
        p.category || "",
        formatDate(p.lastVisit),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-tp-slate-100 font-sans text-tp-slate-900">
      <AppTopHeader />

      <div className="flex h-[calc(100vh-62px)]">
        <aside className="hidden h-full shrink-0 md:block">
          <TPSecondaryNavPanel
            items={DASHBOARD_NAV_ITEMS}
            activeId={activeRailItem}
            onSelect={(id) => {
              setActiveRailItem(id);
              const target = DASHBOARD_NAV_ITEMS.find((it) => it.id === id);
              if (target?.href) router.push(target.href);
            }}
            variant="primary"
            height="100%"
            bottomSpacerPx={96}
            renderIcon={({ item, isActive, iconSize }) => {
              const Icon = item.icon;
              return (
                <Icon
                  size={iconSize}
                  variant={isActive ? "Bulk" : "Linear"}
                  strokeWidth={isActive ? undefined : 1.5}
                  color={isActive ? "var(--tp-slate-0)" : "var(--tp-slate-700)"}
                />
              );
            }}
          />
        </aside>

        <main className="flex-1 overflow-hidden">
          <div className="flex h-full min-w-0">
            <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
              {/* Mobile nav strip */}
              <div className="shrink-0 px-3 py-3 md:hidden">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {DASHBOARD_NAV_ITEMS.map((item) => {
                    const isActive = item.id === activeRailItem;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveRailItem(item.id);
                          if (item.href) router.push(item.href);
                        }}
                        className={cn(
                          "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "border-tp-blue-500 bg-tp-blue-50 text-tp-blue-700"
                            : "border-tp-slate-200 bg-white text-tp-slate-600"
                        )}>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Banner — single secondary-style CTA matching the
                   Appointments banner ("Add Appointment"): translucent
                   white backdrop + white border + white text on the
                   dark gradient. Looks like a quiet outline pill so it
                   doesn't compete with the brand visual of the banner. */}
              <div className="shrink-0">
                <AppointmentBanner
                  title="All Patients"
                  actions={
                    <Button
                      variant="outline"
                      theme="primary"
                      size="md"
                      surface="dark"
                      className="whitespace-nowrap !bg-[rgba(255,255,255,0.13)] backdrop-blur-sm"
                      leftIcon={<Plus size={20} strokeWidth={1.5} />}>
                      Add New Patient
                    </Button>
                  }
                />
              </div>

              {/* White card overlapping banner by 60px */}
              <div className="relative z-10 -mt-[60px] flex flex-1 flex-col px-3 pb-6 sm:px-4 lg:px-[18px]">
                <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-tp-slate-200 bg-white">

                  {/* Toolbar: search + date filter (left), count + download (right) */}
                  <div className="shrink-0 px-3 pt-4 pb-3 sm:px-4 lg:px-[18px] lg:pt-5 lg:pb-4">
                    <div className="flex flex-nowrap items-center justify-between gap-3">
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <label className="relative min-w-[160px] w-full max-w-[420px]">
                          <Search
                            size={18}
                            strokeWidth={1.5}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tp-slate-400"
                          />
                          <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by patient name / ID / mobile number"
                            className="h-[38px] w-full rounded-[10px] border border-tp-slate-200 bg-white pl-10 pr-3 text-sm text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-300 focus:border-tp-blue-300 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/15"
                          />
                        </label>
                        <DateRangePicker
                          value={dateFilter}
                          onChange={(sel) => setDateFilter(sel.presetId)}
                          className="min-w-[120px] max-w-[200px]"
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <p className="text-[12px] text-tp-slate-300 font-medium whitespace-nowrap">
                          (Showing{" "}
                          <span className="text-tp-slate-500 font-semibold">
                            {filtered.length}
                          </span>{" "}
                          of{" "}
                          <span className="text-tp-slate-500 font-semibold">
                            {MOCK_PATIENTS.length}
                          </span>{" "}
                          patients)
                        </p>
                        <button
                          type="button"
                          onClick={handleDownload}
                          aria-label="Download patient list as CSV"
                          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-tp-slate-200 bg-white text-tp-slate-600 transition-colors hover:border-tp-slate-300 hover:bg-tp-slate-50 hover:text-tp-slate-700">
                          <Download size={16} strokeWidth={1.6} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <div className="flex-1 min-h-0 overflow-auto px-3 pb-4 sm:px-4 lg:px-[18px]">
                      <div className="pt-1">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="rounded-[12px] bg-tp-slate-100">
                              <th className="rounded-l-[12px] px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 w-[48px]">
                                #
                              </th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[200px]">
                                Patient details
                              </th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[155px]">
                                Contact
                              </th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">
                                Patient ID
                              </th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[140px]">
                                Category
                              </th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">
                                Last visit
                              </th>
                              <th className="sticky right-0 z-20 w-[1%] whitespace-nowrap rounded-tr-[12px] rounded-br-[12px] bg-tp-slate-100 pl-3 pr-2 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center">
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                    <Profile2User size={140} variant="Bulk" color="var(--tp-slate-200)" />
                                    <p className="text-[14px] font-medium text-tp-slate-500">
                                      No patients match "{query}".
                                    </p>
                                    {query && (
                                      <button
                                        type="button"
                                        onClick={() => setQuery("")}
                                        className="mt-0.5 text-[12px] font-semibold text-tp-warning-600 underline underline-offset-2 decoration-tp-warning-400 transition-colors hover:text-tp-warning-700">
                                        Clear search
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filtered.map((p, i) => (
                                <tr
                                  key={p.id}
                                  className="h-16 border-b border-tp-slate-100 last:border-b-0 hover:bg-tp-slate-50/50">
                                  <td className="w-[48px] px-3 py-3 text-sm text-tp-slate-700">
                                    {i + 1}
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                    <div className="overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => openPatientDetails(p)}
                                        className="block truncate text-left text-sm font-semibold text-tp-blue-500 hover:underline">
                                        {p.name}
                                      </button>
                                      <p className="mt-1 truncate text-sm text-tp-slate-700">
                                        {p.gender === "M" ? "Male" : "Female"}, {p.age}y
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 align-middle text-sm text-tp-slate-700">
                                    {p.contact}
                                  </td>
                                  <td className="px-3 py-3 align-middle font-mono text-[13px] text-tp-slate-700">
                                    {p.pid}
                                  </td>
                                  <td className="px-3 py-3 align-middle text-sm text-tp-slate-700">
                                    {p.category || "—"}
                                  </td>
                                  <td className="px-3 py-3 align-middle text-sm text-tp-slate-700">
                                    {formatDate(p.lastVisit)}
                                  </td>
                                  <td className="sticky right-0 z-10 bg-white pl-3 pr-2 py-3 align-middle">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        theme="primary"
                                        size="sm"
                                        className="!min-w-[90px] whitespace-nowrap"
                                        onClick={() => openPatientDetails(p)}>
                                        View
                                      </Button>
                                      <PatientActionsMenu
                                        slots={ALL_PATIENTS_ACTIONS}
                                        ariaLabel={`More actions for ${p.name}`}
                                        onSelect={(slot) => handlePatientAction(slot, p)}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
