/**
 * Schema-driven display primitives for the historical sidebar.
 *
 * Three visual contracts, all derived from the AI digitization JSON schema:
 *
 *   <SchemaField name unit value layout="row|stack" />
 *     Single key/value row — used for vitals & lab-results style sections
 *     where a label sits left and the value sits right.
 *
 *   <SchemaListItem name fields={[{label,value}]} />
 *     One item from a list-typed schema field (symptoms, diagnosis,
 *     medications, vaccinations, surgeries, lab results, medical history).
 *     The schema's `name` (or equivalent identifier) renders bold/dark, and
 *     every other present property renders inside a single parenthesised
 *     run as `(Label: value | Label: value | ...)`.
 *
 *   <SchemaSection title fields={[{label,value}]} notes? />
 *     One section of an object-typed schema field (gynec, obstetric,
 *     patientDetails). The section title is the dark header; the present
 *     properties render below as inline `Label: value | Label: value`.
 *
 * Empty / missing values are filtered out — matching the schema's
 * "leave empty if not present" semantics.
 */

import React from "react";
import clsx from "clsx";

// ─── Token classes ────────────────────────────────────────────────────────────

const labelClass =
"font-sans font-semibold text-[14px] leading-[20px] tracking-[0.012px] text-tp-slate-700";
const unitClass = "font-sans text-[14px] leading-[20px] text-tp-slate-500";
const valueRowClass =
"font-sans font-semibold text-[14px] leading-[20px] text-tp-slate-700";
const valueStackClass =
"font-sans text-[14px] leading-[20px] text-tp-slate-500";
const bracketClass =
"font-sans text-[14px] leading-[20px] text-tp-slate-500";
const inlineFieldsClass =
"font-sans text-[14px] leading-[20px] text-tp-slate-600";

// ─── Helpers ──────────────────────────────────────────────────────────────────






function presentEntries(entries) {
  return entries.filter(({ value }) => {
    if (value === undefined || value === null) return false;
    const s = String(value).trim();
    if (!s) return false;
    if (s === "0") return false; // schema convention — 0 means "not mentioned"
    return true;
  });
}

function joinLabelled(entries) {
  return presentEntries(entries).
  map((e) => `${e.label}: ${String(e.value).trim()}`).
  join(" | ");
}

// ─── SchemaField (single key/value row) ───────────────────────────────────────











export function SchemaField({ name, value, unit, layout = "row", className }) {
  const display = value === undefined || value === null ? "" : String(value).trim();
  if (!display) return null;

  if (layout === "stack") {
    return (
      <div className={clsx("flex flex-col", className)}>
        <span className={labelClass}>
          {name}
          {unit ? <span className={clsx("ml-1", unitClass)}>({unit})</span> : null}
        </span>
        <span className={valueStackClass}>({display})</span>
      </div>);

  }

  return (
    <div className={clsx("flex items-center justify-between gap-3", className)}>
      <span className={labelClass}>
        {name}
        {unit ? <span className={clsx("ml-1", unitClass)}>({unit})</span> : null}
      </span>
      <span className={valueRowClass}>{display}</span>
    </div>);

}

// ─── SchemaListItem (name + bracketed labelled fields) ────────────────────────









export function SchemaListItem({ name, fields, className }) {
  const detail = joinLabelled(fields);
  return (
    <div className={clsx("flex flex-col gap-[2px]", className)}>
      <span className={labelClass}>{name}</span>
      {detail ? <span className={bracketClass}>({detail})</span> : null}
    </div>);

}

// ─── SchemaSection (object-typed schema slice with subtitle) ──────────────────










export function SchemaSection({ title, fields, notes, className }) {
  const detail = joinLabelled(fields);
  const notesText = notes?.trim();
  if (!detail && !notesText) {
    // Empty section — render only the title so the schema structure is still
    // discoverable in the UI.
    return <span className={labelClass}>{title}</span>;
  }
  return (
    <div className={clsx("flex flex-col gap-[2px]", className)}>
      <span className={labelClass}>{title}</span>
      {detail ? <span className={inlineFieldsClass}>{detail}</span> : null}
      {notesText && !detail.toLowerCase().includes("notes:") ?
      <span className={inlineFieldsClass}>Notes: {notesText}</span> :
      null}
    </div>);

}