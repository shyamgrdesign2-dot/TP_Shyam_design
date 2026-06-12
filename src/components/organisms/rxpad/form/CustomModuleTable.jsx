"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  loadCustomRows,
  saveCustomRows,
  rowHasValues,
  filterByQuery,
  withCustomOption,
} from "./rxpad-table-utils";
import { markModuleUsed } from "@/src/components/organisms/rxpad/customise-store";
import { ModuleIcon } from "@/src/components/organisms/rxpad/custom-modules/ModuleIcon";
import { EditableTableModule } from "./EditableTableModule";

/**
 * Custom module table — uses EditableTableModule with `hideSearch` mode.
 *
 * UX contract:
 *  • No search bar. Instead, an "+ Add new line" link appends empty rows.
 *  • Clicking any cell opens a dropdown populated with every value
 *    previously typed into *that column* (per-column history).
 *  • History is persisted in localStorage (via loadCustomRows /
 *    saveCustomRows) and surfaces automatically next session.
 *  • Works for any number of columns the doctor defined.
 */
export function CustomModuleTable({
  patientId,
  moduleDef,
  onVoiceClick,
  onVoiceClose,
  voiceActive,
  onVoiceSubmit,
  voiceProcessingTranscript,
  voiceProcessingWasAutoSubmitted = false,
}) {
  const [rows, setRows] = useState(() => loadCustomRows(patientId, moduleDef.id));

  // Re-seed rows when the patient or module schema changes.
  useEffect(() => {
    setRows(loadCustomRows(patientId, moduleDef.id));
  }, [patientId, moduleDef.id]);

  // Persist every change.
  useEffect(() => {
    saveCustomRows(patientId, moduleDef.id, rows);
  }, [patientId, moduleDef.id, rows]);

  // Flip hasBeenUsed once any cell has content.
  const usedRef = useRef(moduleDef.hasBeenUsed);
  useEffect(() => {
    if (usedRef.current) return;
    if (!rows.some(rowHasValues)) return;
    usedRef.current = true;
    markModuleUsed(moduleDef.id);
  }, [rows, moduleDef.id]);

  // ── Per-column suggestion maps ─────────────────────────────────────────
  // For each column key, collect every unique non-empty value across all
  // rows. These become the dropdown suggestions when a cell is clicked.
  const colSuggestions = useMemo(() => {
    const map = {};
    for (const field of moduleDef.fields) {
      const seen = new Set();
      for (const row of rows) {
        const v = row[field.id]?.trim();
        if (v) seen.add(v);
      }
      map[field.id] = Array.from(seen);
    }
    return map;
  }, [rows, moduleDef.fields]);

  // ── Columns ────────────────────────────────────────────────────────────
  // Each column gets a `getOptions` callback that returns history-based
  // suggestions filtered by whatever the user has typed so far.
  const columns = useMemo(
    () =>
      moduleDef.fields.map((f) => ({
        key: f.id,
        label: f.label.toUpperCase(),
        width: 240,
        minWidth: 160,
        maxWidth: 320,
        placeholder: `Add ${f.label.toLowerCase()}`,
        // Return filtered history for this column, plus an "Add custom: X"
        // entry when the user has typed something not in history yet.
        // This means the dropdown always surfaces on first type even with
        // zero history, and grows richer on every subsequent visit.
        getOptions: (query) => {
          const suggestions = colSuggestions[f.id] ?? [];
          const filtered = filterByQuery(suggestions, query);
          return withCustomOption(filtered, query);
        },
        // Don't restrict to suggestions — free text is always allowed.
        restrictToOptions: false,
        // Hide the chevron toggle — the dropdown opens automatically on
        // cell focus / typing, no explicit toggle button needed.
        showDropdownToggle: false,
      })),
    [moduleDef.fields, colSuggestions]
  );

  const primaryKey = moduleDef.fields[0]?.id ?? "id";

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
      hideSearch
      templateModuleId={`custom:${moduleDef.id}`}
      templateModuleName={moduleDef.name}
      onVoiceClick={onVoiceClick}
      onVoiceClose={onVoiceClose}
      voiceActive={voiceActive}
      onVoiceSubmit={onVoiceSubmit}
      voiceProcessingTranscript={voiceProcessingTranscript}
      voiceProcessingWasAutoSubmitted={voiceProcessingWasAutoSubmitted}
    />
  );
}
