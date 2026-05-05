"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { loadCustomRows, saveCustomRows, rowHasValues } from "./rxpad-table-utils";
import { markModuleUsed } from "@/src/components/organisms/rxpad/customise-store";
import { ModuleIcon } from "@/src/components/organisms/rxpad/custom-modules/ModuleIcon";

/* Lazily imported — avoid circular dep by accepting EditableTableModule as a prop-render
   pattern would be overkill for an internal file; we import from the parent barrel instead. */
import { EditableTableModule } from "./EditableTableModule";

/**
 * Custom module table — uses the same EditableTableModule shell as
 * the built-in Symptoms/Examinations sections so a doctor sees one
 * consistent table grammar across the Rx pad. Rows are persisted per
 * patient + module in localStorage.
 *
 * Extracted from RxPadFunctional.tsx during Phase 8 decomposition.
 */
export function CustomModuleTable({
  patientId,
  moduleDef,
  // Voice plumbing — kept optional so existing call sites (e.g. tests)
  // still work. When provided, the custom module shows the same mic
  // affordance + active-recording overlay as the built-in modules,
  // so a doctor sees one consistent voice grammar across the Rx pad.
  onVoiceClick,
  onVoiceClose,
  voiceActive,
  onVoiceSubmit,
  voiceProcessingTranscript,
}) {
  // Build columns from the module's fields. All custom fields are
  // single-line text in v1.
  const columns = useMemo(
    () =>
    moduleDef.fields.map((f) => ({
      key: f.id,
      label: f.label.toUpperCase(),
      width: 240,
      minWidth: 160,
      maxWidth: 320,
      placeholder: `Add ${f.label.toLowerCase()}`
    })),
    [moduleDef.fields]
  );

  const primaryKey = moduleDef.fields[0]?.id ?? "id";

  const [rows, setRows] = useState(() => loadCustomRows(patientId, moduleDef.id));

  // Re-seed rows when the patient or the module schema changes.
  useEffect(() => {
    setRows(loadCustomRows(patientId, moduleDef.id));
  }, [patientId, moduleDef.id]);

  // Persist on change.
  useEffect(() => {
    saveCustomRows(patientId, moduleDef.id, rows);
  }, [patientId, moduleDef.id, rows]);

  // Flip hasBeenUsed once the doctor types anything into any cell. Same
  // permission gate the customise sheet's Edit / Delete menu reads.
  const usedRef = useRef(moduleDef.hasBeenUsed);
  useEffect(() => {
    if (usedRef.current) return;
    if (!rows.some(rowHasValues)) return;
    usedRef.current = true;
    markModuleUsed(moduleDef.id);
  }, [rows, moduleDef.id]);

  // Suggestions list — pull every previously committed value of the
  // primary column across all rows so search-add can complete.
  const searchSuggestions = useMemo(() => {
    const seen = new Set();
    for (const row of rows) {
      const v = row[primaryKey]?.trim();
      if (v) seen.add(v);
    }
    return Array.from(seen);
  }, [rows, primaryKey]);

  return (
    <EditableTableModule
      id={`custom:${moduleDef.id}`}
      moduleDataAttr={`custom:${moduleDef.id}`}
      title={moduleDef.name}
      icon={
      <span className="inline-flex h-[24px] w-[24px] items-center justify-center text-tp-violet-500">
          <ModuleIcon module={moduleDef} size={22} color="var(--tp-violet-500)" />
        </span>
      }
      columns={columns}
      primaryKey={primaryKey}
      rows={rows}
      onChangeRows={setRows}
      searchPlaceholder={`Search & Add ${moduleDef.name}`}
      cannedChips={searchSuggestions.slice(0, 12)}
      searchSuggestions={searchSuggestions}
      templateModuleId={`custom:${moduleDef.id}`}
      templateModuleName={moduleDef.name}
      onVoiceClick={onVoiceClick}
      onVoiceClose={onVoiceClose}
      voiceActive={voiceActive}
      onVoiceSubmit={onVoiceSubmit}
      voiceProcessingTranscript={voiceProcessingTranscript} />);


}