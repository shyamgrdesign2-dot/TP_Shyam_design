import React from "react";
import { Dropdown, DateRangePicker } from "@dhspl-tatvacare/tesseract-ui";
import { InfoTooltip } from "../sections/KpiRow";

const CLINIC_LOCK_HINT =
  "To view another clinic, switch to it from Home page, then open Data Analytics again.";

// Quick-select presets. Backend endpoints cap ranges at 31 days, so no
// "This year" / "Till date" options (they'd always 400).
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const DA_PRESETS = [
  { id: "today", label: "Today", getRange: () => ({ start: startOfDay(new Date()), end: startOfDay(new Date()) }) },
  { id: "yesterday", label: "Yesterday", getRange: () => ({ start: addDays(new Date(), -1), end: addDays(new Date(), -1) }) },
  { id: "last-7", label: "Past 7 days", getRange: () => ({ start: addDays(new Date(), -6), end: startOfDay(new Date()) }) },
  { id: "last-30", label: "Past 30 days", getRange: () => ({ start: addDays(new Date(), -30), end: startOfDay(new Date()) }) },
  { id: "this-month", label: "This month", getRange: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: startOfDay(new Date()) }) },
  { id: "last-month", label: "Last month", getRange: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) }) },
];

// The sticky filter row: Doctor + Clinic multi-selects on the left, the date
// range picker on the right, and — when anything deviates from default — a
// red underlined "Clear all" at the very right end.
//
// Doctor and Clinic are Tesseract Dropdowns in mode="multi" with checkbox
// option rows; empty selection means "all". Each dropdown also carries its own
// footer "Clear" action to reset just that filter.
//
// Role scoping (spec §1.7): a sub-doctor's doctor filter is locked to their
// own name (disabled, no menu). Clinic is always read-only — locked to the
// logged-in clinic from the auth token (dropdown hidden for everyone).
export default function FilterBar({
  dateValue,
  onDateChange,
  doctors = [],
  onDoctorsChange,
  clinics = [],
  onClinicsChange,
  doctorOptions = [],
  clinicOptions = [],
  doctorLocked = false,
  lockedDoctorLabel,
  singleClinic = true,
  lockedClinicLabel,
  hasActiveFilters = false,
  onClearAll,
  hideDateFilter = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      {/* Doctor + Clinic shrink to fit on the left; each keeps a legible min. */}
      <div style={{ flex: "1 1 150px", minWidth: 130, maxWidth: 220 }}>
        {doctorLocked ? (
          // Disabled trigger that reads the sub-doctor's own name (the menu
          // can never open, so the placeholder is the display text).
          <Dropdown
            placeholder={lockedDoctorLabel || "You"}
            options={[]}
            value={[]}
            mode="multi"
            disabled
            chevron={false}
            ariaLabel="Doctor (locked to you)"
          />
        ) : (
          <Dropdown
            placeholder="All doctors"
            options={doctorOptions}
            value={doctors}
            onChange={onDoctorsChange}
            mode="multi"
            optionControl="checkbox"
            searchable
            secondaryAction={{ label: "Clear", onClick: () => onDoctorsChange([]) }}
            ariaLabel="Filter by doctors"
          />
        )}
      </div>

      <div
        style={{
          flex: "1 1 150px",
          minWidth: 130,
          maxWidth: 250,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {/* Clinic multi-select is intentionally disabled for all users — scope
            is always the auth-token clinic. Keep the branch so re-enabling the
            dropdown later is a one-flag change. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {singleClinic ? (
            <Dropdown
              placeholder={lockedClinicLabel || clinicOptions[0]?.label || "Your clinic"}
              options={[]}
              value={[]}
              mode="multi"
              disabled
              chevron={false}
              ariaLabel="Clinic (locked to logged-in clinic)"
            />
          ) : (
            <Dropdown
              placeholder="All clinics"
              options={clinicOptions}
              value={clinics}
              onChange={onClinicsChange}
              mode="multi"
              optionControl="checkbox"
              searchable={clinicOptions.length > 5}
              secondaryAction={{ label: "Clear", onClick: () => onClinicsChange([]) }}
              ariaLabel="Filter by clinics"
            />
          )}
        </div>
        {singleClinic && <InfoTooltip text={CLINIC_LOCK_HINT} />}
      </div>

      {/* Date range pinned right; shrinks but stays wide enough for the label. */}
      {!hideDateFilter && (
        <div style={{ flex: "0 1 auto", minWidth: 160, maxWidth: 260, marginLeft: "auto" }}>
          <DateRangePicker
            mode="range"
            months={2}
            showPresets
            presets={DA_PRESETS}
            fullWidth
            value={dateValue}
            onChange={onDateChange}
          />
        </div>
      )}

      {/* Common reset — very right end, after the date filter */}
      {hasActiveFilters && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--tesseract-warning-600)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
