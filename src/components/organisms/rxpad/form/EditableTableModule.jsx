"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Microphone2, Trash } from "iconsax-reactjs";
import styles from "./EditableTableModule.module.scss";
import {
  ChevronDown,
  GripVertical,
  Info,
  Plus,
  Search } from
"@/src/components/atoms/icons/lucide";


import {
  getRowId,
  normalizeText,
  rowHasValues,
  getColumnMinWidth,
  snapFieldToViewportTop,
  filterByQuery,
  isCustomOption,
  getOptionValue,
  getOptionLabel,
  getCatalogOptions,
  moveSelectedOptionToTop,
  buildDefaultRow,
  useTabletMode } from
"./rxpad-table-utils";
import { VoiceRxModuleRecorder } from "@/src/components/organisms/voicerx/VoiceRxModuleRecorder";
import { VoiceRxSectionProcessing } from "./VoiceRxSectionProcessing";
import { useModuleTemplateHandlers } from "@/src/components/organisms/rxpad/templates";
import { Tooltip as TPTooltip, HoverTooltip } from "@/src/components/atoms/Tooltip";
import { ShineBorder } from "@/src/components/atoms/ShineBorder";
import { TPRxPadSearchInput } from "@/src/components/organisms/rxpad/RxPadSearchInput";
import { RxPadSection as TPRxPadSection } from "@/src/components/organisms/rxpad/form/RxPadSection";

/**
 * The shared editable table component powering every RxPad section
 * (Symptoms, Diagnosis, Medication, Advice, Labs, Surgery, custom modules).
 *
 * Extracted from RxPadFunctional.tsx during Phase 8 decomposition.
 */

// Conditionally wraps a cell's content with a tooltip when the row is
// flagged as unverified ("ungrounded"). The wrapper exists so hovering
// anywhere on the highlighted cell — not just the small Info icon —
// surfaces the verification hint.
function UngroundedTooltipWrap({ enabled, text, children }) {
  if (!enabled) return children;
  return (
    <HoverTooltip content={text} side="top">
      {children}
    </HoverTooltip>
  );
}

export
function EditableTableModule({
  id,
  title,
  icon,
  columns,
  primaryKey,
  rows,
  onChangeRows,
  searchPlaceholder,
  cannedChips = [],
  searchSuggestions = [],
  onRowAdded,
  onSaveClick,
  onTemplateClick,
  onClearClick,
  onVoiceClick,
  onVoiceClose,
  voiceActive,
  afterSearch,
  getOptionTag,
  // Optional render-prop hook: when supplied, replaces the default single-line
  // search-dropdown row. Receives ({ option, index, isHighlighted, isExpanded,
  // setExpanded, onSelect }) and returns the row's JSX. `setExpanded` and the
  // expansion state are owned by EditableTableModule so only one option can
  // expand at a time and the state clears when the menu closes.
  renderSearchRow,
  // Optional render-prop hook: rendered absolutely inside each grounded-key
  // cell's relative wrapper. Receives ({ row, column, value, onSelect }) where
  // onSelect(nextValue) commits the new value into the cell. Used by the
  // medication module to surface stock + alternatives directly in the cell.
  renderCellOverlay,
  moduleDataAttr,
  highlightedRowIds,
  highlightedRowTooltips,
  groundedKey,
  ungroundedRowIds,
  onGroundRow,
  onVoiceSubmit,
  voiceProcessingTranscript,
  voiceAddedCount,
  templateModuleId,
  templateModuleName,
  /** When true: hides the search bar + canned chips and shows an
   *  "+ Add new line" link instead. Used by custom modules where every
   *  column is free-text with history-based suggestions. */
  hideSearch = false,
}) {
  const isTablet = useTabletMode();
  const [searchText, setSearchText] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [draggingRowId, setDraggingRowId] = useState(null);
  const [dragOverRowId, setDragOverRowId] = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  // Per-cell voice dictation. Tapping the inline mic on any free-form
  // text cell opens the same VoiceRx waveform/transcript recorder UI
  // used for module-level dictation, but scoped to a single cell — the
  // final transcript replaces only that cell's value.
  const [recordingCell, setRecordingCell] = useState(null);
  const [editingCellValues, setEditingCellValues] = useState({});
  // One-at-a-time expansion of search-dropdown rows (e.g. medication
  // alternatives). Cleared whenever the menu closes or the colKey switches.
  const [expandedOptionKey, setExpandedOptionKey] = useState(null);
  const [isActionSticky, setIsActionSticky] = useState(false);
  const [menuIndicator, setMenuIndicator] = useState({
    hasOverflow: false,
    thumbTop: 0,
    thumbHeight: 18
  });

  const moduleRootRef = useRef(null);
  const tableWrapRef = useRef(null);
  const searchInputRef = useRef(null);
  const menuListRef = useRef(null);
  const inputRefs = useRef({});
  const transparentDragImageRef = useRef(null);
  const rowTopByIdRef = useRef({});
  const dragPreviewTargetRef = useRef(null);
  const colIndexByKey = useMemo(
    () => Object.fromEntries(columns.map((column, idx) => [column.key, idx])),
    [columns]
  );
  const searchCatalog = useMemo(
    () => searchSuggestions.length > 0 ? searchSuggestions : cannedChips,
    [cannedChips, searchSuggestions]
  );
  const searchCatalogKey = useMemo(() => searchCatalog.join("||"), [searchCatalog]);
  const [dynamicSearchCatalog, setDynamicSearchCatalog] = useState(searchCatalog);
  const shouldFilterCellOnOpen = useCallback(
    (column) =>
    column.key === primaryKey && Boolean(column.getOptions) && !column.restrictToOptions,
    [primaryKey]
  );

  useEffect(() => {
    setDynamicSearchCatalog(searchCatalog);
  }, [searchCatalog, searchCatalogKey]);

  useEffect(() => {
    // Keep committed primary-field values discoverable in future dropdown searches.
    setDynamicSearchCatalog((prev) => {
      const seen = new Set(prev.map((item) => normalizeText(item)));
      const additions = [];
      for (const row of rows) {
        const value = (row[primaryKey] ?? "").trim();
        if (!value) continue;
        const key = normalizeText(value);
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push(value);
      }
      if (additions.length === 0) return prev;
      return [...additions, ...prev];
    });
  }, [rows, primaryKey]);
  const totalColumnWidth = useMemo(
    () =>
    Math.max(
      1,
      columns.reduce((sum, column) => sum + Math.max(column.width, getColumnMinWidth(column)), 0)
    ),
    [columns]
  );

  const getResponsiveColumnStyle = useCallback(
    (column) => ({
      width: `${column.width / totalColumnWidth * 100}%`,
      minWidth: getColumnMinWidth(column),
      maxWidth: column.maxWidth
    }),
    [totalColumnWidth]
  );

  const setCellValue = useCallback(
    (rowId, key, value) => {
      onChangeRows(
        rows.map((row) =>
        row.id === rowId ?
        {
          ...row,
          [key]: value
        } :
        row
        )
      );
    },
    [onChangeRows, rows]
  );

  // Helper to find a column definition (so we can render a friendly
  // section label inside the cell-scoped recorder).
  const findColumn = useCallback(
    (colKey) => columns.find((c) => c.key === colKey) ?? null,
    [columns]
  );

  // Toggle / open / close the per-cell recorder UI.
  const startCellRecording = useCallback((rowId, colKey) => {
    setRecordingCell((current) => {
      if (current && current.rowId === rowId && current.colKey === colKey) {
        return null;
      }
      return { rowId, colKey };
    });
  }, []);
  const stopCellRecording = useCallback(() => setRecordingCell(null), []);

  const registerCustomValue = useCallback((value) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    setDynamicSearchCatalog((prev) => {
      const exists = prev.some((item) => normalizeText(item) === normalizeText(nextValue));
      if (exists) return prev;
      return [nextValue, ...prev];
    });
  }, []);

  const beginDropdownEditing = useCallback((key, value) => {
    setEditingCellValues((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const endDropdownEditing = useCallback((key) => {
    setEditingCellValues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const ensureCellVisibleInTable = useCallback((element) => {
    const wrapper = tableWrapRef.current;
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const cellRect = element.getBoundingClientRect();
    const rightSafetyInset = 62;
    const leftSafetyInset = 8;

    if (cellRect.right > wrapperRect.right - rightSafetyInset) {
      const delta = cellRect.right - (wrapperRect.right - rightSafetyInset);
      wrapper.scrollBy({ left: delta + 8, behavior: "smooth" });
    } else if (cellRect.left < wrapperRect.left + leftSafetyInset) {
      const delta = wrapperRect.left + leftSafetyInset - cellRect.left;
      wrapper.scrollBy({ left: -delta - 8, behavior: "smooth" });
    }
  }, []);

  const addRow = useCallback(
    (seedText = "") => {
      const row = buildDefaultRow(id, columns, primaryKey, seedText);
      onChangeRows([...rows, row]);
      onRowAdded?.(seedText);
    },
    [columns, id, onChangeRows, onRowAdded, primaryKey, rows]
  );

  const hasAnyData = useMemo(() => rows.some((row) => rowHasValues(row)), [rows]);

  // ── Template integration ──
  // When templateModuleId is provided, the Save / Template buttons open
  // the global template sidebars (Save = save-template flow, Template =
  // load-template list). Otherwise we fall back to the raw callbacks
  // (legacy behaviour) so callers without templates wired still work.
  const applyTemplateRows = useCallback(
    (templateRows) => {
      if (!templateRows.length) return;
      const enriched = templateRows.map((src) => {
        const next = { id: getRowId(id) };
        for (const col of columns) {
          const v = src[col.key];
          next[col.key] = typeof v === "string" ? v : "";
        }
        return next;
      });
      onChangeRows([...rows, ...enriched]);
    },
    [columns, id, onChangeRows, rows]
  );

  const templateHandlers = useModuleTemplateHandlers(
    templateModuleId ?? "",
    templateModuleName ?? title,
    rows,
    applyTemplateRows
  );

  const handleTemplateClick = useCallback(() => {
    if (templateModuleId) {
      templateHandlers.onTemplateClick();
      return;
    }
    if (onTemplateClick) {
      onTemplateClick();
      return;
    }
    addRow(cannedChips[0] ?? "");
  }, [addRow, cannedChips, onTemplateClick, templateHandlers, templateModuleId]);

  const handleSaveClick = useCallback(() => {
    if (templateModuleId) {
      templateHandlers.onSaveClick();
      return;
    }
    onSaveClick?.();
  }, [onSaveClick, templateHandlers, templateModuleId]);

  const handleClearClick = useCallback(() => {
    if (onClearClick) {
      onClearClick();
      return;
    }
    onChangeRows([]);
  }, [onChangeRows, onClearClick]);

  const removeRow = useCallback(
    (rowId) => {
      onChangeRows(rows.filter((row) => row.id !== rowId));
    },
    [onChangeRows, rows]
  );

  const moveRow = useCallback(
    (sourceId, targetId) => {
      if (sourceId === targetId) return;
      const sourceIndex = rows.findIndex((row) => row.id === sourceId);
      const targetIndex = rows.findIndex((row) => row.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;
      const clone = [...rows];
      const [picked] = clone.splice(sourceIndex, 1);
      clone.splice(targetIndex, 0, picked);
      onChangeRows(clone);
    },
    [onChangeRows, rows]
  );

  const focusCell = useCallback(
    (rowIndex, colIndex) => {
      const nextRow = rows[rowIndex];
      const nextColumn = columns[colIndex];
      if (!nextRow || !nextColumn) return;
      const key = `${nextRow.id}:${nextColumn.key}`;
      const element = inputRefs.current[key];
      if (!element) return;
      element.focus();
      const len = element.value.length;
      element.setSelectionRange(len, len);
    },
    [columns, rows]
  );

  const focusOwnSearch = useCallback(() => {
    const node = searchInputRef.current;
    if (!node) return;
    node.focus();
    node.select();
    if (isTablet) {
      snapFieldToViewportTop(node);
    }
  }, [isTablet]);

  const focusNextModuleSearch = useCallback(() => {
    if (typeof document === "undefined") return;
    const current = searchInputRef.current;
    if (!current) return;
    const allSearches = Array.from(
      document.querySelectorAll('[data-rx-module-search="true"]')
    );
    const idx = allSearches.findIndex((node) => node === current);
    if (idx < 0 || idx >= allSearches.length - 1) {
      current.focus();
      current.select();
      return;
    }
    const next = allSearches[idx + 1];
    next.focus();
    next.select();
    if (isTablet) {
      snapFieldToViewportTop(next);
    }
  }, [isTablet]);

  const focusPreviousModuleSearch = useCallback(() => {
    if (typeof document === "undefined") return;
    const current = searchInputRef.current;
    if (!current) return;
    const allSearches = Array.from(
      document.querySelectorAll('[data-rx-module-search="true"]')
    );
    const idx = allSearches.findIndex((node) => node === current);
    if (idx <= 0) {
      current.focus();
      current.select();
      return;
    }
    const prev = allSearches[idx - 1];
    prev.focus();
    prev.select();
    if (isTablet) {
      snapFieldToViewportTop(prev);
    }
  }, [isTablet]);

  const focusFirstCellInModule = useCallback(
    (moduleRoot) => {
      if (!moduleRoot) return false;

      const firstCell = moduleRoot.querySelector(
        '[data-rx-cell-input="true"]'
      );
      if (firstCell) {
        firstCell.focus();
        const len = firstCell.value.length;
        firstCell.setSelectionRange(len, len);
        if (isTablet) {
          snapFieldToViewportTop(firstCell);
        }
        return true;
      }

      const moduleSearch = moduleRoot.querySelector('[data-rx-module-search="true"]');
      if (moduleSearch) {
        moduleSearch.focus();
        moduleSearch.select();
        if (isTablet) {
          snapFieldToViewportTop(moduleSearch);
        }
        return true;
      }

      return false;
    },
    [isTablet]
  );

  const focusNextModuleFirstCell = useCallback(() => {
    if (typeof document === "undefined") return;
    const currentRoot = moduleRootRef.current;
    if (!currentRoot) {
      focusNextModuleSearch();
      return;
    }
    const allRoots = Array.from(document.querySelectorAll('[data-rx-module-root="true"]'));
    const idx = allRoots.findIndex((node) => node === currentRoot);
    if (idx < 0 || idx >= allRoots.length - 1) {
      focusOwnSearch();
      return;
    }
    const nextRoot = allRoots[idx + 1];
    if (!focusFirstCellInModule(nextRoot)) {
      focusNextModuleSearch();
    }
  }, [focusFirstCellInModule, focusNextModuleSearch, focusOwnSearch]);

  const focusPreviousModuleLastCell = useCallback(() => {
    if (typeof document === "undefined") return;
    const currentRoot = moduleRootRef.current;
    if (!currentRoot) {
      focusPreviousModuleSearch();
      return;
    }
    const allRoots = Array.from(document.querySelectorAll('[data-rx-module-root="true"]'));
    const idx = allRoots.findIndex((node) => node === currentRoot);
    if (idx <= 0) {
      focusOwnSearch();
      return;
    }
    const prevRoot = allRoots[idx - 1];
    const cells = Array.from(
      prevRoot.querySelectorAll('[data-rx-cell-input="true"]')
    );
    const lastCell = cells[cells.length - 1];
    if (lastCell) {
      lastCell.focus();
      const len = lastCell.value.length;
      lastCell.setSelectionRange(len, len);
      if (isTablet) {
        snapFieldToViewportTop(lastCell);
      }
      return;
    }
    focusPreviousModuleSearch();
  }, [focusOwnSearch, focusPreviousModuleSearch, isTablet]);

  const focusNextFromCell = useCallback(
    (rowIndex, colIndex) => {
      const lastColIndex = columns.length - 1;
      if (colIndex < lastColIndex) {
        focusCell(rowIndex, colIndex + 1);
        return;
      }
      if (rowIndex < rows.length - 1) {
        focusCell(rowIndex + 1, 0);
        return;
      }
      focusOwnSearch();
    },
    [columns.length, focusCell, focusOwnSearch, rows.length]
  );

  const focusPreviousFromCell = useCallback(
    (rowIndex, colIndex) => {
      const lastColIndex = columns.length - 1;
      if (colIndex > 0) {
        focusCell(rowIndex, colIndex - 1);
        return;
      }
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, lastColIndex);
        return;
      }
      focusOwnSearch();
    },
    [columns.length, focusCell, focusOwnSearch]
  );

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  // Reset any expanded-row state whenever the menu closes / re-anchors so the
  // host renderer never sees a stale expansion.
  useEffect(() => {
    if (!activeMenu) setExpandedOptionKey(null);
  }, [activeMenu?.colKey, activeMenu?.rowId, activeMenu?.mode]);

  const optionsForMenu = useMemo(() => {
    if (!activeMenu) return [];
    if (activeMenu.mode === "search") {
      return getCatalogOptions(dynamicSearchCatalog, activeMenu.query, 10);
    }
    const rowId = activeMenu.rowId ?? "";
    const colKey = activeMenu.colKey ?? "";
    const row = rows.find((item) => item.id === rowId);
    const column = columns.find((item) => item.key === colKey);
    if (!row || !column) return [];
    // If the column supplies its own getOptions (e.g. custom modules with
    // per-column history), always use it — even for the primary key column.
    if (column.getOptions) {
      const filtered = filterByQuery(column.getOptions(activeMenu.query, row), activeMenu.query);
      return moveSelectedOptionToTop(filtered, row[colKey] ?? "");
    }
    // Built-in modules: primary key falls back to the global search catalog.
    if (column.key === primaryKey && !column.restrictToOptions) {
      const filtered = getCatalogOptions(dynamicSearchCatalog, activeMenu.query, 10);
      return moveSelectedOptionToTop(filtered, row[colKey] ?? "");
    }
    return [];
  }, [activeMenu, columns, rows, dynamicSearchCatalog, primaryKey]);

  const getMenuHighlightedIndex = useCallback(
    (row, column, query, selectedValue) => {
      // column.getOptions takes priority (custom modules with per-column history).
      const options = column.getOptions
        ? moveSelectedOptionToTop(filterByQuery(column.getOptions(query, row), query), selectedValue)
        : column.key === primaryKey && !column.restrictToOptions
          ? moveSelectedOptionToTop(getCatalogOptions(dynamicSearchCatalog, query, 10), selectedValue)
          : [];
      if (options.length === 0) return 0;
      const selected = normalizeText(selectedValue);
      const selectedIndex = options.findIndex(
        (option) => !isCustomOption(option) && normalizeText(getOptionValue(option)) === selected
      );
      return selectedIndex >= 0 ? selectedIndex : 0;
    },
    [dynamicSearchCatalog, primaryKey]
  );

  const openCellMenu = useCallback(
    (
    row,
    column,
    anchorRect,
    selectedValue,
    query,
    showAllOptions = false) =>
    {
      if (!column.getOptions) return;
      const nextQuery = showAllOptions ? "" : query;
      setActiveMenu({
        mode: "cell",
        rowId: row.id,
        colKey: column.key,
        query: nextQuery,
        highlightedIndex: getMenuHighlightedIndex(row, column, nextQuery, selectedValue),
        anchorRect
      });
    },
    [getMenuHighlightedIndex]
  );

  const openSearchMenu = useCallback(
    (query, showAllOptions = false) => {
      const anchorRect = searchInputRef.current?.getBoundingClientRect();
      if (!anchorRect) return;
      const nextQuery = showAllOptions ? "" : query;
      const options = getCatalogOptions(dynamicSearchCatalog, nextQuery, 10);
      const selected = normalizeText(query);
      const selectedIndex = options.findIndex(
        (option) => !isCustomOption(option) && normalizeText(getOptionValue(option)) === selected
      );
      setActiveMenu({
        mode: "search",
        query: nextQuery,
        highlightedIndex: selectedIndex >= 0 ? selectedIndex : 0,
        anchorRect
      });
    },
    [dynamicSearchCatalog]
  );

  useEffect(() => {
    if (!activeMenu) return;
    const updateAnchor = () => {
      const anchor =
      activeMenu.mode === "search" ?
      searchInputRef.current :
      inputRefs.current[`${activeMenu.rowId ?? ""}:${activeMenu.colKey ?? ""}`];
      if (!anchor) return;
      const nextRect = anchor.getBoundingClientRect();
      setActiveMenu((current) => {
        if (!current) return current;
        const prev = current.anchorRect;
        if (
        prev &&
        prev.top === nextRect.top &&
        prev.left === nextRect.left &&
        prev.width === nextRect.width &&
        prev.height === nextRect.height)
        {
          // No-op: rect unchanged. Returning the same reference lets
          // React bail out, which prevents this effect (which depends
          // on activeMenu) from re-running into an infinite loop.
          return current;
        }
        return {
          ...current,
          anchorRect: nextRect
        };
      });
    };
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    const node = menuListRef.current;
    if (!activeMenu || !node) {
      setMenuIndicator((prev) =>
      prev.hasOverflow || prev.thumbTop !== 0 ?
      { hasOverflow: false, thumbTop: 0, thumbHeight: 18 } :
      prev
      );
      return;
    }

    const updateIndicator = () => {
      const clientHeight = node.clientHeight;
      const scrollHeight = node.scrollHeight;
      const scrollTop = node.scrollTop;
      const hasOverflow = scrollHeight > clientHeight + 1;

      const trackPadding = 8;
      const trackHeight = Math.max(0, clientHeight - trackPadding * 2);
      const thumbHeight = hasOverflow ?
      Math.max(18, Math.min(trackHeight, clientHeight / scrollHeight * trackHeight)) :
      trackHeight;
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const thumbTop =
      hasOverflow && scrollHeight > clientHeight ?
      scrollTop / (scrollHeight - clientHeight) * maxThumbTop :
      0;

      setMenuIndicator((prev) => {
        if (
        prev.hasOverflow === hasOverflow &&
        Math.abs(prev.thumbTop - thumbTop) < 0.5 &&
        Math.abs(prev.thumbHeight - thumbHeight) < 0.5)
        {
          return prev;
        }
        return { hasOverflow, thumbTop, thumbHeight };
      });
    };

    updateIndicator();
    node.addEventListener("scroll", updateIndicator, { passive: true });
    window.addEventListener("resize", updateIndicator);

    return () => {
      node.removeEventListener("scroll", updateIndicator);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeMenu, optionsForMenu.length]);

  useEffect(() => {
    const node = menuListRef.current;
    if (!activeMenu || !node) return;
    const index = activeMenu.highlightedIndex;
    if (index < 0) return;

    const target = node.querySelector(`[data-rx-menu-index="${index}"]`);
    if (!target) return;

    const targetTop = target.offsetTop;
    const targetBottom = targetTop + target.offsetHeight;
    const viewTop = node.scrollTop;
    const viewBottom = viewTop + node.clientHeight;

    if (targetTop < viewTop) {
      node.scrollTo({ top: Math.max(0, targetTop - 4), behavior: "smooth" });
      return;
    }
    if (targetBottom > viewBottom) {
      node.scrollTo({ top: targetBottom - node.clientHeight + 4, behavior: "smooth" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
  activeMenu?.mode,
  activeMenu?.rowId,
  activeMenu?.colKey,
  activeMenu?.highlightedIndex,
  optionsForMenu.length]
  );

  useEffect(() => {
    if (rows.length > 0) return;
    setActiveCell(null);
    setActiveMenu(null);
  }, [rows.length]);

  useLayoutEffect(() => {
    const wrapper = tableWrapRef.current;
    const tbody = wrapper?.querySelector("tbody");
    if (!tbody) {
      rowTopByIdRef.current = {};
      return;
    }

    const rowElements = Array.from(
      tbody.querySelectorAll("tr[data-row-id]")
    );

    const nextTopById = {};
    for (const rowElement of rowElements) {
      const rowId = rowElement.dataset.rowId;
      if (!rowId) continue;
      const nextTop = rowElement.getBoundingClientRect().top;
      nextTopById[rowId] = nextTop;

      const prevTop = rowTopByIdRef.current[rowId];
      if (prevTop == null) continue;
      const deltaY = prevTop - nextTop;
      if (Math.abs(deltaY) < 1) continue;

      rowElement.style.transition = "transform 0s";
      rowElement.style.transform = `translateY(${deltaY}px)`;
      rowElement.getBoundingClientRect();
      rowElement.style.transition = "transform 220ms cubic-bezier(0.22,1,0.36,1)";
      rowElement.style.transform = "";
    }

    rowTopByIdRef.current = nextTopById;
  }, [rows]);

  useEffect(() => {
    if (!draggingRowId) return;

    const handleDocumentDragOver = (event) => {
      if (event.clientX === 0 && event.clientY === 0) return;
      const wrapper = tableWrapRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const withinX = event.clientX >= rect.left && event.clientX <= rect.right;
      const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (!withinX || !withinY) {
        setDragOverRowId(null);
      }
    };

    const handleDocumentDrop = () => {
      setDraggingRowId(null);
      setDragOverRowId(null);
      dragPreviewTargetRef.current = null;
    };

    const handleDocumentDragEnd = () => {
      setDraggingRowId(null);
      setDragOverRowId(null);
      dragPreviewTargetRef.current = null;
    };

    document.addEventListener("dragover", handleDocumentDragOver);
    document.addEventListener("drop", handleDocumentDrop);
    document.addEventListener("dragend", handleDocumentDragEnd);

    return () => {
      document.removeEventListener("dragover", handleDocumentDragOver);
      document.removeEventListener("drop", handleDocumentDrop);
      document.removeEventListener("dragend", handleDocumentDragEnd);
    };
  }, [draggingRowId]);

  useEffect(() => {
    const wrapper = tableWrapRef.current;
    if (!wrapper || rows.length === 0) {
      setIsActionSticky(false);
      return;
    }

    const updateStickyState = () => {
      const hasOverflow = wrapper.scrollWidth > wrapper.clientWidth + 1;
      setIsActionSticky(hasOverflow);
    };

    updateStickyState();
    window.addEventListener("resize", updateStickyState);
    wrapper.addEventListener("scroll", updateStickyState, { passive: true });

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateStickyState);
      observer.observe(wrapper);
      const table = wrapper.querySelector("table");
      if (table) {
        observer.observe(table);
      }
    }

    return () => {
      window.removeEventListener("resize", updateStickyState);
      wrapper.removeEventListener("scroll", updateStickyState);
      observer?.disconnect();
    };
  }, [rows.length, columns.length]);

  const stickyActionHeaderClass = isActionSticky ?
  "sticky right-0 z-40 border-l border-tp-slate-200/80 bg-tp-slate-50 shadow-[-8px_7px_14px_-12px_rgba(15,23,42,0.18)] before:pointer-events-none before:absolute before:inset-y-0 before:-left-2 before:w-2 before:content-[''] before:bg-gradient-to-l before:from-tp-slate-900/6 before:to-transparent" :
  "";

  const stickyActionCellClass = isActionSticky ?
  "sticky right-0 z-40 border-l border-tp-slate-200/80 bg-white shadow-[-8px_7px_14px_-12px_rgba(15,23,42,0.18)] before:pointer-events-none before:absolute before:inset-y-0 before:-left-2 before:w-2 before:content-[''] before:bg-gradient-to-l before:from-tp-slate-900/6 before:to-transparent" :
  "";

  const menuPosition = activeMenu ?
  (() => {
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
    const activeColumn =
    activeMenu.mode === "cell" ?
    columns.find((column) => column.key === activeMenu.colKey) :
    undefined;
    const allowWideCellDropdown = Boolean(activeColumn && shouldFilterCellOnOpen(activeColumn));

    const desiredWidth = (() => {
      if (activeMenu.mode === "search") {
        return activeMenu.anchorRect.width;
      }
      if (allowWideCellDropdown) {
        return activeMenu.anchorRect.width + (isTablet ? 32 : 40);
      }
      return activeMenu.anchorRect.width;
    })();

    const minWidth = activeMenu.mode === "search" ? 220 : 120;
    const width = Math.min(desiredWidth, Math.max(minWidth, viewportWidth - 16));
    const rawLeft = Math.max(8, activeMenu.anchorRect.left);
    const left = Math.min(rawLeft, Math.max(8, viewportWidth - width - 8));
    return {
      left,
      top: activeMenu.anchorRect.bottom + 6,
      width
    };
  })() :
  null;

  const regularOptionEntries = useMemo(
    () =>
    optionsForMenu.
    map((option, index) => ({ option, index })).
    filter((entry) => !isCustomOption(entry.option)),
    [optionsForMenu]
  );

  const customOptionEntry = useMemo(() => {
    const index = optionsForMenu.findIndex((option) => isCustomOption(option));
    if (index < 0) return null;
    return { option: optionsForMenu[index], index };
  }, [optionsForMenu]);
  const showMenuFooter = activeMenu?.mode === "search" || Boolean(customOptionEntry);

  return (
    <div {...moduleDataAttr ? { "data-rxpad-module": moduleDataAttr } : {}}>
    <TPRxPadSection
        title={title}
        icon={icon}
        onTemplateClick={handleTemplateClick}
        onSaveClick={handleSaveClick}
        onClearClick={handleClearClick}
        clearDisabled={!hasAnyData}
        saveDisabled={!hasAnyData}
        onVoiceClick={onVoiceClick}
        voiceActive={voiceActive}
        headerBadge={null}>
        
      <div ref={moduleRootRef} data-rx-module-root="true" className="space-y-[18px]">
        {rows.length > 0 ?
          <div
            ref={tableWrapRef}
            className="relative overflow-x-auto rounded-[10px] border border-tp-slate-100"
            onDragOver={(event) => {
              if (!draggingRowId) return;
              event.preventDefault();
            }}
            onDragLeave={(event) => {
              if (!draggingRowId) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const withinX = event.clientX >= rect.left && event.clientX <= rect.right;
              const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom;
              if (withinX && withinY) return;
              setDragOverRowId(null);
            }}>
            
            <table className="min-w-full w-max table-fixed font-['Inter',sans-serif] text-[14px]">
              <colgroup>
                <col className={styles.sideCol} />
                {columns.map((column) =>
                <col key={`col-${column.key}`} style={getResponsiveColumnStyle(column)} />
                )}
                <col className={styles.sideCol} />
              </colgroup>
              <thead>
                <tr className="h-[38px] bg-tp-slate-50 font-['Inter',sans-serif] text-[12px] text-tp-slate-500">
                <th className={`border-r border-tp-slate-100 px-0 py-2 text-center font-semibold ${styles.sideCol}`} />
                {columns.map((column) =>
                  <th
                    key={column.key}
                    className="border-r border-tp-slate-100 px-3 py-2 text-left text-[12px] font-semibold"
                    style={getResponsiveColumnStyle(column)}>
                    
                    {column.label}
                  </th>
                  )}
                <th
                    className={[
                    "relative px-0 py-2 text-center text-[12px] font-semibold",
                    stickyActionHeaderClass,
                    styles.sideCol].
                    join(" ")} />
                  
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) =>
                (() => {
                  const isDraggingRow = draggingRowId === row.id;
                  const isDropTargetRow = dragOverRowId === row.id && !isDraggingRow;
                  const isHighlighted = highlightedRowIds?.has(row.id);
                  const highlightTooltip = highlightedRowTooltips?.[row.id];
                  return (
                    <tr
                      key={row.id}
                      data-row-id={row.id}
                      title={highlightTooltip}
                      className={[
                      "h-[52px] border-t border-tp-slate-100 align-middle transition-colors duration-150 will-change-transform",
                      isHighlighted ? "bg-tp-warning-50/40 border-l-2 border-l-tp-warning-300" : "bg-white",
                      isDraggingRow ? "bg-tp-blue-50/45" : "",
                      isDropTargetRow ? "bg-tp-blue-50/65" : "hover:bg-tp-slate-50/50"].
                      join(" ")}
                      onDragOver={(event) => {
                        if (!draggingRowId) return;
                        event.preventDefault();
                        setDragOverRowId(row.id);
                        if (draggingRowId !== row.id && dragPreviewTargetRef.current !== row.id) {
                          dragPreviewTargetRef.current = row.id;
                          moveRow(draggingRowId, row.id);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!draggingRowId) return;
                        setDragOverRowId(null);
                        setDraggingRowId(null);
                        dragPreviewTargetRef.current = null;
                      }}>
                      
                  <td className={`border-r border-tp-slate-100 p-0 text-center align-middle ${styles.sideCol}`}>
                    <button
                          type="button"
                          data-drag-handle="true"
                          draggable
                          className={[
                          "inline-flex h-[52px] w-full cursor-grab items-center justify-center transition-colors active:cursor-grabbing",
                          isDraggingRow ?
                          "bg-tp-blue-50 text-tp-blue-600" :
                          "text-tp-slate-400 hover:bg-tp-slate-100 hover:text-tp-slate-600"].
                          join(" ")}
                          aria-label="Drag to reorder row"
                          onDragStart={(event) => {
                            setDraggingRowId(row.id);
                            setDragOverRowId(row.id);
                            dragPreviewTargetRef.current = row.id;
                            event.dataTransfer.effectAllowed = "move";
                            try {
                              event.dataTransfer.setData("application/x-rx-row-id", row.id);
                            } catch {

                              // keep drag alive in strict browser modes without polluting clipboard text
                            }
                            if (!transparentDragImageRef.current) {
                              const transparent = new Image();
                              transparent.src =
                              "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                              transparentDragImageRef.current = transparent;
                            }
                            event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0);
                          }}
                          onDragEnd={() => {
                            setDraggingRowId(null);
                            setDragOverRowId(null);
                            dragPreviewTargetRef.current = null;
                          }}>
                          
                      <GripVertical size={18} strokeWidth={1.5} />
                    </button>
                  </td>

                  {columns.map((column) => {
                        const key = `${row.id}:${column.key}`;
                        const hasDropdown = Boolean(column.getOptions);
                        const showDropdownToggle = column.showDropdownToggle ?? true;
                        const isMultiline = false;
                        const isMenuOpen = Boolean(
                          activeMenu &&
                          activeMenu.rowId === row.id &&
                          activeMenu.colKey === column.key
                        );
                        const value = row[column.key] ?? "";
                        const displayValue = hasDropdown ? editingCellValues[key] ?? value : value;
                        const isUngroundedCell =
                        column.key === groundedKey && !!ungroundedRowIds?.has(row.id);
                        // When the grounded cell is unverified, show the info icon on the right
                        // side so it doesn't break the left-alignment of the text.
                        // Free-form cells (no dropdown options) get an
                        // inline mic affordance when the cell is active —
                        // but only until dictation actually begins. Once
                        // recording, the mic button + blue focus ring are
                        // hidden and the cell wraps in a shining gradient
                        // border so the doctor can see exactly which cell
                        // their speech is filling.
                        const isFreeFormCell = !hasDropdown;
                        const isCellActive =
                        activeCell?.rowId === row.id && activeCell?.colKey === column.key;
                        const isCellRecording =
                        recordingCell?.rowId === row.id && recordingCell?.colKey === column.key;
                        // Single-mic invariant: only show the cell mic
                        // when nothing else is dictating. If THIS cell is
                        // recording we hide it (the shiner replaces it);
                        // if another cell or the module-level mic is
                        // active we also hide it so the doctor can't
                        // start a competing session.
                        const showCellMic =
                        isFreeFormCell &&
                        isCellActive &&
                        !isCellRecording &&
                        !recordingCell &&
                        !voiceActive;
                        const cellPadding = isUngroundedCell ?
                        hasDropdown ? "pl-3 pr-[56px]" : "pl-3 pr-[32px]" :
                        hasDropdown ? "pl-3 pr-8" : showCellMic ? "pl-3 pr-[42px]" : "px-3";
                        const fieldClass = [
                        "h-[52px] w-full border-0 bg-transparent py-0",
                        cellPadding,
                        "font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#454551]",
                        "focus:bg-tp-blue-50/30 focus:outline-none focus:ring-0",
                        "relative z-20",
                        "rounded-none",
                        isMultiline ? "overflow-hidden whitespace-normal break-words py-[10px] leading-[18px]" : "overflow-hidden text-ellipsis whitespace-nowrap"].
                        join(" ");

                        return (
                          <td
                            key={column.key}
                            className={`border-r border-tp-slate-100 p-0 align-middle transition-colors ${
                            activeCell?.rowId === row.id && activeCell?.colKey === column.key ?
                            "bg-tp-blue-50/20" :
                            isUngroundedCell ?
                            "bg-[rgba(217,119,6,0.07)]" :
                            ""}`
                            }
                            style={getResponsiveColumnStyle(column)}>

                        <UngroundedTooltipWrap
                          enabled={isUngroundedCell}
                          text={
                            /^med/i.test(title)
                              ? `This medication is not from your Zydus inventory list. Click to search and add the medicine.`
                              : `Auto-filled from voice. Tap and pick a match from the ${title.toLowerCase()} list to verify this row.`
                          }>
                        {/* Outer cell wrapper — positioned ancestor for any
                            renderCellOverlay decorations (e.g. VC pill on the
                            input row + the medication's generic/stock lines
                            rendered as block children below). */}
                        <div className="relative">
                        {/* Blue focus ring on the OUTER wrapper so it wraps the
                            full cell (input row + any block content the
                            renderCellOverlay adds below). Suppressed during
                            cell recording so it doesn't compete with the
                            shiner. */}
                        {activeCell?.rowId === row.id && activeCell?.colKey === column.key && !isCellRecording ?
                          <span className="pointer-events-none absolute inset-[2px] z-10 rounded-[6px] border border-tp-blue-500 shadow-[0_0_0_2px_rgba(75,74,213,0.16)]" /> :
                          null}
                        <div className={`relative h-[52px] ${isCellRecording ? "vrx-cell-shiner overflow-hidden rounded-[8px]" : ""}`}>
                          {/* Shining gradient border while this cell is
                                   the dictation target — clearly anchors the
                                   recording to one box. */}
                          {isCellRecording ?
                              <ShineBorder
                                variant="rotate"
                                borderWidth={1.5}
                                duration={2.2}
                                shineColor={["#D565EA", "#673AAC", "#1A1994"]}
                                baseColor="rgba(226,226,234,0.95)" /> :
                              null}
                          {/* Inline per-cell mic — surfaces on free-form
                                   text cells (NOTE on built-in modules; every
                                   cell on custom modules) when the cell is
                                   active. Click to dictate directly into this
                                   cell; click again or blur to stop. */}
                          {showCellMic ?
                            <span className="absolute right-[6px] top-1/2 z-30 -translate-y-1/2">
                              <HoverTooltip content={isCellRecording ? "Stop dictation" : "Dictate notes here"} side="top">
                                <button
                                  type="button"
                                  data-voice-allow
                                  aria-label={isCellRecording ? "Stop dictation" : "Dictate notes here"}
                                  onMouseDown={(event) => {
                                    // Prevent input blur before we toggle.
                                    event.preventDefault();
                                  }}
                                  onClick={() => {
                                    if (isCellRecording) {
                                      stopCellRecording();
                                    } else {
                                      startCellRecording(row.id, column.key);
                                    }
                                  }}
                                  className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-full transition-transform active:scale-[0.92] ${
                                  isCellRecording ? "bg-tp-blue-50 ring-2 ring-tp-blue-500/40" : "hover:bg-tp-slate-100"}`
                                  }>
                                  <Microphone2
                                    size={18}
                                    variant={isCellRecording ? "Bold" : "Linear"}
                                    color={isCellRecording ? "var(--tp-blue-600)" : "var(--tp-slate-600)"}
                                    strokeWidth={1.6} />
                                </button>
                              </HoverTooltip>
                            </span> :
                            null}
                          {/* Per-row "needs verification" glyph — only on
                                   the grounded cell when this row was filled
                                   from voice and the doctor hasn't picked a
                                   matching entry from the dropdown yet. Sits
                                   on the right edge so it doesn't break text alignment. */}
                          {isUngroundedCell ?
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[rgba(217,119,6,0.14)] text-[#B45309] ${
                                hasDropdown ? "right-[32px]" : "right-[8px]"}`
                                }>

                                <Info size={12} strokeWidth={2.4} />
                              </span> :
                              null}
                          {isMultiline ?
                              <textarea
                                data-rx-cell-input="true"
                                ref={(node) => {
                                  inputRefs.current[key] = node;
                                }}
                                value={displayValue}
                                title={displayValue || undefined}
                                rows={column.maxLines ?? 2}
                                placeholder={column.placeholder}
                                className={fieldClass}
                                style={{ maxHeight: `${(column.maxLines ?? 2) * 18 + 20}px`, resize: "none" }}
                                onFocus={(event) => {
                                  setActiveCell({ rowId: row.id, colKey: column.key });
                                  if (hasDropdown) {
                                    beginDropdownEditing(key, value);
                                    ensureCellVisibleInTable(event.currentTarget);
                                    const len = event.currentTarget.value.length;
                                    event.currentTarget.setSelectionRange(len, len);
                                  }
                                  if (isTablet) {
                                    snapFieldToViewportTop(event.currentTarget);
                                  }
                                  if (hasDropdown) {
                                    openCellMenu(
                                      row,
                                      column,
                                      event.currentTarget.getBoundingClientRect(),
                                      value,
                                      value,
                                      !shouldFilterCellOnOpen(column)
                                    );
                                  }
                                }}
                                onClick={(event) => {
                                  if (hasDropdown) {
                                    beginDropdownEditing(key, value);
                                    ensureCellVisibleInTable(event.currentTarget);
                                  }
                                  if (hasDropdown) {
                                    openCellMenu(
                                      row,
                                      column,
                                      event.currentTarget.getBoundingClientRect(),
                                      value,
                                      value,
                                      !shouldFilterCellOnOpen(column)
                                    );
                                  }
                                }}
                                onChange={(event) => {
                                  const next = event.currentTarget.value;
                                  if (hasDropdown) {
                                    beginDropdownEditing(key, next);
                                  } else {
                                    setCellValue(row.id, column.key, next);
                                  }
                                  openCellMenu(
                                    row,
                                    column,
                                    event.currentTarget.getBoundingClientRect(),
                                    next,
                                    next
                                  );
                                }}
                                onBlur={() => {
                                  window.setTimeout(() => {
                                    if (hasDropdown) {
                                      endDropdownEditing(key);
                                    }
                                    setActiveMenu((current) => {
                                      if (!current) return current;
                                      if (current.rowId !== row.id || current.colKey !== column.key) return current;
                                      return null;
                                    });
                                    setActiveCell((current) => {
                                      if (!current) return current;
                                      if (current.rowId !== row.id || current.colKey !== column.key) return current;
                                      return null;
                                    });
                                  }, 80);
                                }}
                                onKeyDown={(event) => {
                                  const colIndex = colIndexByKey[column.key];
                                  const menuOpened =
                                  activeMenu &&
                                  activeMenu.rowId === row.id &&
                                  activeMenu.colKey === column.key &&
                                  optionsForMenu.length > 0;

                                  if (menuOpened && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                                    event.preventDefault();
                                    const delta = event.key === "ArrowDown" ? 1 : -1;
                                    setActiveMenu((current) => {
                                      if (!current) return current;
                                      const next = (current.highlightedIndex + delta + optionsForMenu.length) % optionsForMenu.length;
                                      return { ...current, highlightedIndex: next };
                                    });
                                    return;
                                  }

                                  if (menuOpened && event.key === "Enter") {
                                    event.preventDefault();
                                    const picked = optionsForMenu[activeMenu.highlightedIndex] ?? optionsForMenu[0];
                                    if (picked) {
                                      const pickedValue = getOptionValue(picked);
                                      setCellValue(row.id, column.key, pickedValue);
                                      if (isCustomOption(picked)) {
                                        registerCustomValue(pickedValue);
                                      } else if (
                                      groundedKey &&
                                      column.key === groundedKey &&
                                      ungroundedRowIds?.has(row.id))
                                      {
                                        // DB-backed option — ground row.
                                        onGroundRow?.(row.id);
                                      }
                                      endDropdownEditing(key);
                                    }
                                    closeMenu();
                                    focusNextFromCell(rowIndex, colIndex);
                                    return;
                                  }

                                  if (event.key === "Escape") {
                                    closeMenu();
                                    return;
                                  }

                                  if (event.key === "ArrowUp") {
                                    event.preventDefault();
                                    if (rowIndex <= 0) {
                                      focusPreviousModuleLastCell();
                                    } else {
                                      focusCell(rowIndex - 1, colIndex);
                                    }
                                    return;
                                  }
                                  if (event.key === "ArrowDown") {
                                    event.preventDefault();
                                    if (rowIndex >= rows.length - 1) {
                                      focusOwnSearch();
                                    } else {
                                      focusCell(rowIndex + 1, colIndex);
                                    }
                                    return;
                                  }
                                  if (event.key === "ArrowLeft") {
                                    event.preventDefault();
                                    focusPreviousFromCell(rowIndex, colIndex);
                                    return;
                                  }
                                  if (event.key === "ArrowRight") {
                                    event.preventDefault();
                                    focusNextFromCell(rowIndex, colIndex);
                                    return;
                                  }
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    focusNextFromCell(rowIndex, colIndex);
                                  }
                                }} /> :


                              <input
                                data-rx-cell-input="true"
                                ref={(node) => {
                                  inputRefs.current[key] = node;
                                }}
                                value={displayValue}
                                title={displayValue || undefined}
                                placeholder={column.placeholder}
                                className={fieldClass}
                                onFocus={(event) => {
                                  setActiveCell({ rowId: row.id, colKey: column.key });
                                  if (hasDropdown) {
                                    beginDropdownEditing(key, value);
                                    ensureCellVisibleInTable(event.currentTarget);
                                    const len = event.currentTarget.value.length;
                                    event.currentTarget.setSelectionRange(len, len);
                                  }
                                  if (isTablet) {
                                    snapFieldToViewportTop(event.currentTarget);
                                  }
                                  if (hasDropdown) {
                                    openCellMenu(
                                      row,
                                      column,
                                      event.currentTarget.getBoundingClientRect(),
                                      value,
                                      value,
                                      !shouldFilterCellOnOpen(column)
                                    );
                                  }
                                }}
                                onClick={(event) => {
                                  if (hasDropdown) {
                                    beginDropdownEditing(key, value);
                                    ensureCellVisibleInTable(event.currentTarget);
                                  }
                                  if (hasDropdown) {
                                    openCellMenu(
                                      row,
                                      column,
                                      event.currentTarget.getBoundingClientRect(),
                                      value,
                                      value,
                                      !shouldFilterCellOnOpen(column)
                                    );
                                  }
                                }}
                                onChange={(event) => {
                                  const next = event.currentTarget.value;
                                  if (hasDropdown) {
                                    beginDropdownEditing(key, next);
                                  } else {
                                    setCellValue(row.id, column.key, next);
                                  }
                                  openCellMenu(
                                    row,
                                    column,
                                    event.currentTarget.getBoundingClientRect(),
                                    next,
                                    next
                                  );
                                }}
                                onBlur={() => {
                                  window.setTimeout(() => {
                                    if (hasDropdown) {
                                      endDropdownEditing(key);
                                    }
                                    setActiveMenu((current) => {
                                      if (!current) return current;
                                      if (current.rowId !== row.id || current.colKey !== column.key) return current;
                                      return null;
                                    });
                                    setActiveCell((current) => {
                                      if (!current) return current;
                                      if (current.rowId !== row.id || current.colKey !== column.key) return current;
                                      return null;
                                    });
                                  }, 80);
                                }}
                                onKeyDown={(event) => {
                                  const colIndex = colIndexByKey[column.key];
                                  const menuOpened =
                                  activeMenu &&
                                  activeMenu.rowId === row.id &&
                                  activeMenu.colKey === column.key &&
                                  optionsForMenu.length > 0;

                                  if (menuOpened && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                                    event.preventDefault();
                                    const delta = event.key === "ArrowDown" ? 1 : -1;
                                    setActiveMenu((current) => {
                                      if (!current) return current;
                                      const next = (current.highlightedIndex + delta + optionsForMenu.length) % optionsForMenu.length;
                                      return { ...current, highlightedIndex: next };
                                    });
                                    return;
                                  }

                                  if (menuOpened && event.key === "Enter") {
                                    event.preventDefault();
                                    const picked = optionsForMenu[activeMenu.highlightedIndex] ?? optionsForMenu[0];
                                    if (picked) {
                                      const pickedValue = getOptionValue(picked);
                                      setCellValue(row.id, column.key, pickedValue);
                                      if (isCustomOption(picked)) {
                                        registerCustomValue(pickedValue);
                                      } else if (
                                      groundedKey &&
                                      column.key === groundedKey &&
                                      ungroundedRowIds?.has(row.id))
                                      {
                                        // DB-backed option — ground row.
                                        onGroundRow?.(row.id);
                                      }
                                      endDropdownEditing(key);
                                    }
                                    closeMenu();
                                    focusNextFromCell(rowIndex, colIndex);
                                    return;
                                  }

                                  if (event.key === "Escape") {
                                    closeMenu();
                                    return;
                                  }

                                  if (event.key === "ArrowUp") {
                                    event.preventDefault();
                                    if (rowIndex <= 0) {
                                      focusPreviousModuleLastCell();
                                    } else {
                                      focusCell(rowIndex - 1, colIndex);
                                    }
                                    return;
                                  }
                                  if (event.key === "ArrowDown") {
                                    event.preventDefault();
                                    if (rowIndex >= rows.length - 1) {
                                      focusOwnSearch();
                                    } else {
                                      focusCell(rowIndex + 1, colIndex);
                                    }
                                    return;
                                  }
                                  if (event.key === "ArrowLeft") {
                                    event.preventDefault();
                                    focusPreviousFromCell(rowIndex, colIndex);
                                    return;
                                  }
                                  if (event.key === "ArrowRight") {
                                    event.preventDefault();
                                    focusNextFromCell(rowIndex, colIndex);
                                    return;
                                  }
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    focusNextFromCell(rowIndex, colIndex);
                                  }
                                }} />

                              }
                          {hasDropdown && showDropdownToggle ?
                              <TPTooltip title="Use ↑ ↓ to navigate options, press Enter to select" placement="top" arrow>
                              <button
                                  type="button"
                                  aria-label="Toggle options"
                                  className="absolute right-[6px] top-1/2 z-10 inline-flex h-[20px] w-[20px] -translate-y-1/2 items-center justify-center text-tp-slate-500 transition-colors"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    const inputNode = inputRefs.current[key];
                                    if (!inputNode) return;
                                    if (isMenuOpen) {
                                      closeMenu();
                                      return;
                                    }
                                    inputNode.focus();
                                    openCellMenu(
                                      row,
                                      column,
                                      inputNode.getBoundingClientRect(),
                                      value,
                                      value,
                                      !shouldFilterCellOnOpen(column)
                                    );
                                  }}>
                                  
                                <ChevronDown
                                    size={14}
                                    strokeWidth={1.5}
                                    className={`transition-transform duration-150 ${isMenuOpen ? "rotate-180" : ""}`} />
                                  
                              </button>
                            </TPTooltip> :
                              null}
                        </div>
                          {/* Host-supplied overlay for the grounded-key cell —
                              e.g. medication generic / stock / find-alt lines
                              that sit below the input, plus any decorations
                              anchored to the outer relative wrapper. */}
                          {renderCellOverlay && column.key === groundedKey ?
                            (() => {
                              // Render as a real component so its hooks have
                              // their own scope (see SearchRowComponent above).
                              const CellOverlay = renderCellOverlay;
                              return (
                                <CellOverlay
                                  row={row}
                                  column={column}
                                  value={value}
                                  onSelect={(next) => {
                                    setCellValue(row.id, column.key, String(next ?? ""));
                                    if (groundedKey && ungroundedRowIds?.has(row.id)) {
                                      onGroundRow?.(row.id);
                                    }
                                  }} />);

                            })() :
                            null}
                        </div>
                        </UngroundedTooltipWrap>
                      </td>);

                      })}

                  <td
                        className={[
                        "relative p-0 text-center align-middle",
                        stickyActionCellClass,
                        styles.sideCol].
                        join(" ")}>
                        
                    <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-[52px] w-full items-center justify-center text-tp-slate-700 hover:bg-tp-slate-100 hover:text-tp-slate-700"
                          aria-label="Delete row">
                          
                      <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" />
                    </button>
                  </td>
                </tr>);

                })()
                )}
              </tbody>
            </table>
          </div> :
          null}

        {voiceActive ?
          <div>
            <VoiceRxModuleRecorder
              sectionLabel={title}
              onCancel={() => onVoiceClose?.()}
              onSubmit={(transcript) => {
                onVoiceClose?.();
                onVoiceSubmit?.(transcript);
              }}
              radiusClassName="rounded-[14px]" />

          </div> :
          null}
        {recordingCell && !voiceActive ?
          (() => {
            const col = findColumn(recordingCell.colKey);
            const cellLabel = col?.label
              ? `${title} · ${col.label.charAt(0).toUpperCase() + col.label.slice(1).toLowerCase()}`
              : title;
            return (
              <div>
                <VoiceRxModuleRecorder
                  sectionLabel={cellLabel}
                  onCancel={stopCellRecording}
                  onSubmit={(transcript) => {
                    const t = (transcript ?? "").toString().trim();
                    if (t) {
                      const current = rows.find((r) => r.id === recordingCell.rowId);
                      const prev = (current?.[recordingCell.colKey] ?? "").toString();
                      const merged = prev ? `${prev.replace(/\s+$/u, "")} ${t}` : t;
                      setCellValue(recordingCell.rowId, recordingCell.colKey, merged);
                    }
                    stopCellRecording();
                  }}
                  radiusClassName="rounded-[14px]" />
              </div>);
          })() :
          null}
        {voiceProcessingTranscript != null ?
          <VoiceRxSectionProcessing transcript={voiceProcessingTranscript} sectionLabel={title} /> :
          null}
        {hideSearch ?
          /* ── Custom-module mode: "+ Add new line" link ── */
          <button
            type="button"
            onClick={() => {
              const nextRowIndex = rows.length;
              addRow("");
              window.requestAnimationFrame(() => {
                focusCell(nextRowIndex, 0);
              });
            }}
            className="inline-flex items-center gap-[6px] self-start text-[13px] font-semibold text-tp-blue-500 transition-colors hover:text-tp-blue-600 active:opacity-70">
            <Plus size={14} strokeWidth={2.5} />
            Add new line
          </button> :

          /* ── Standard module mode: search bar + canned chips ── */
          <>
            <div className={`relative ${voiceActive || voiceProcessingTranscript != null ? "hidden" : ""}`}>
              <TPRxPadSearchInput
                  ref={searchInputRef}
                  data-rx-module-search="true"
                  value={searchText}
                  className={afterSearch ? "pr-[220px]" : undefined}
                  onFocus={() => {
                    openSearchMenu(searchText);
                  }}
                  onClick={() => {
                    openSearchMenu(searchText);
                  }}
                  onChange={(event) => {
                    const next = event.currentTarget.value;
                    setSearchText(next);
                    openSearchMenu(next);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setActiveMenu((current) => current?.mode === "search" ? null : current);
                    }, 90);
                  }}
                  onKeyDown={(event) => {
                    const searchMenuOpen = activeMenu?.mode === "search" && optionsForMenu.length > 0;

                    if (searchMenuOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                      event.preventDefault();
                      const delta = event.key === "ArrowDown" ? 1 : -1;
                      setActiveMenu((current) => {
                        if (!current || current.mode !== "search") return current;
                        const next = (current.highlightedIndex + delta + optionsForMenu.length) % optionsForMenu.length;
                        return { ...current, highlightedIndex: next };
                      });
                      return;
                    }

                    if (searchMenuOpen && event.key === "Enter") {
                      event.preventDefault();
                      const picked = optionsForMenu[activeMenu.highlightedIndex] ?? optionsForMenu[0];
                      const value = picked ? getOptionValue(picked).trim() : searchText.trim();
                      if (!value) {
                        focusNextModuleFirstCell();
                        return;
                      }
                      if (picked && isCustomOption(picked)) {
                        registerCustomValue(value);
                      }
                      const nextRowIndex = rows.length;
                      addRow(value);
                      setSearchText("");
                      closeMenu();
                      window.requestAnimationFrame(() => {
                        focusCell(nextRowIndex, 0);
                      });
                      return;
                    }

                    if (searchMenuOpen && event.key === "Escape") {
                      event.preventDefault();
                      closeMenu();
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();
                      const value = searchText.trim();
                      if (!value) {
                        focusNextModuleFirstCell();
                        return;
                      }
                      openSearchMenu(value);
                      return;
                    }

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusNextModuleFirstCell();
                      return;
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (rows.length > 0) {
                        focusCell(rows.length - 1, Math.max(0, columns.length - 1));
                      } else {
                        focusPreviousModuleLastCell();
                      }
                      return;
                    }

                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      focusNextModuleSearch();
                      return;
                    }

                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      focusPreviousModuleSearch();
                    }
                  }}
                  placeholder={searchPlaceholder} />

              {afterSearch ?
                <div className="pointer-events-none absolute inset-y-0 right-2 z-20 flex items-center">
                  <div className="pointer-events-auto flex max-w-[200px] items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {afterSearch}
                  </div>
                </div> :
                null}
            </div>

            {isTablet ?
              <div className="flex flex-wrap gap-3">
                {cannedChips.map((chip) =>
                <button
                  key={`${id}-${chip}`}
                  type="button"
                  className="inline-flex h-[36px] items-center rounded-[10px] bg-tp-slate-100 px-3 text-[12px] font-medium text-tp-slate-600 transition-colors hover:bg-tp-slate-200 hover:text-tp-slate-700"
                  onClick={() => addRow(chip)}>

                    {chip}
                  </button>
                )}
              </div> :
              null}
          </>
        }

      </div>

      {activeMenu && menuPosition && (optionsForMenu.length > 0 || activeMenu.mode === "search") && typeof document !== "undefined" ?
        createPortal(
          <div
            className="fixed z-[130] flex flex-col overflow-hidden rounded-[10px] border border-tp-slate-100 bg-white shadow-lg"
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              width: menuPosition.width
            }}>
            
              {activeMenu.mode === "search" && activeMenu.query.trim().length === 0 ?
            <div className="flex items-center justify-between border-b border-tp-slate-100 px-2 py-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">
                    Frequently used
                  </span>
                </div> :
            null}
              <div className="relative">
                <div
                ref={menuListRef}
                className={`max-h-[220px] overflow-y-auto space-y-0.5 bg-tp-slate-50/35 p-1 pr-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${styles.menuList}`}>
                
                  {regularOptionEntries.length === 0 ?
                <div className="flex items-center gap-2 px-[10px] py-[10px] text-[14px] font-medium text-tp-slate-400">
                      <Search size={14} strokeWidth={1.5} className="text-tp-slate-400/90" />
                      <span>No results found</span>
                    </div> :
                null}
                  {regularOptionEntries.map(({ option, index }) => {
                    const optionValue = getOptionValue(option);
                    const rowKey = `${activeMenu.mode}-${activeMenu.colKey ?? "search"}-${optionValue}`;
                    // Shared commit handler — used by the default row and by any
                    // alternative the host renderer (e.g. medication's "Show
                    // alternatives") chooses to commit instead of the parent.
                    const commitSelection = (rawValue) => {
                      const value = String(rawValue ?? optionValue ?? "").trim();
                      if (!value) {
                        closeMenu();
                        return;
                      }
                      if (activeMenu.mode === "search") {
                        const nextRowIndex = rows.length;
                        addRow(value);
                        setSearchText("");
                        closeMenu();
                        window.requestAnimationFrame(() => {
                          focusCell(nextRowIndex, 0);
                        });
                        return;
                      }
                      if (activeMenu.rowId && activeMenu.colKey) {
                        setCellValue(activeMenu.rowId, activeMenu.colKey, value);
                        endDropdownEditing(`${activeMenu.rowId}:${activeMenu.colKey}`);
                        // Picking a DB-suggested option for the
                        // grounded column clears the ungrounded flag
                        // — now we know this row maps to a real
                        // formulary entry.
                        if (
                        groundedKey &&
                        activeMenu.colKey === groundedKey &&
                        ungroundedRowIds?.has(activeMenu.rowId))
                        {
                          onGroundRow?.(activeMenu.rowId);
                        }
                      }
                      closeMenu();
                    };

                    if (renderSearchRow) {
                      // Invoke as a real React component (capitalised tag) so
                      // any hooks inside it live in their own scope, not
                      // ours — otherwise the hook order shifts as the option
                      // list changes and React's Rules-of-Hooks fires.
                      const SearchRowComponent = renderSearchRow;
                      return (
                        <SearchRowComponent
                          key={rowKey}
                          option={option}
                          index={index}
                          isHighlighted={index === activeMenu.highlightedIndex}
                          isExpanded={expandedOptionKey === optionValue}
                          setExpanded={(expanded) =>
                            setExpandedOptionKey(expanded ? optionValue : null)}
                          onSelect={commitSelection}
                          tag={activeMenu.mode === "search" ? getOptionTag?.(optionValue) : null} />);
                    }

                    return (
                      <button
                        key={rowKey}
                        type="button"
                        data-rx-menu-index={index}
                        className={[
                          "w-full rounded-[8px] px-[10px] py-[7px] text-left text-[14px] font-medium font-['Inter',sans-serif] flex items-center gap-2",
                          index === activeMenu.highlightedIndex ?
                          "bg-tp-slate-100 text-tp-slate-700" :
                          "text-tp-slate-700 hover:bg-tp-slate-100"
                        ].join(" ")}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => commitSelection(optionValue)}>

                        <span className="flex-1 truncate">{getOptionLabel(option)}</span>
                        {activeMenu.mode === "search" && getOptionTag?.(getOptionValue(option))}
                      </button>);
                  })}
                </div>
                {menuIndicator.hasOverflow ?
              <>
                    <div className="pointer-events-none absolute bottom-2 right-1 top-2 w-[3px] rounded-full bg-tp-slate-200/90" />
                    <div
                  className="pointer-events-none absolute right-1 w-[3px] rounded-full bg-tp-slate-400/80"
                  style={{
                    top: `${menuIndicator.thumbTop + 8}px`,
                    height: `${menuIndicator.thumbHeight}px`
                  }} />
                
                  </> :
              null}
              </div>
              {showMenuFooter ?
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-tp-slate-100 bg-white px-2 py-1.5 text-[12px] text-tp-slate-500 max-lg:flex-col max-lg:items-stretch">
                  {customOptionEntry ?
              <button
                type="button"
                className={[
                "inline-flex items-center gap-2 rounded-[8px] border border-dashed px-[10px] py-[6px] text-[12px] font-semibold font-['Inter',sans-serif] max-lg:order-1 max-lg:w-full",
                customOptionEntry.index === activeMenu.highlightedIndex ?
                "border-tp-blue-300 bg-tp-blue-50 text-tp-blue-700" :
                "border-tp-blue-200 bg-tp-blue-50/60 text-tp-blue-600 hover:bg-tp-blue-50"].
                join(" ")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const value = getOptionValue(customOptionEntry.option).trim();
                  if (!value) {
                    closeMenu();
                    return;
                  }
                  registerCustomValue(value);
                  if (activeMenu.mode === "search") {
                    const nextRowIndex = rows.length;
                    addRow(value);
                    setSearchText("");
                    closeMenu();
                    window.requestAnimationFrame(() => {
                      focusCell(nextRowIndex, 0);
                    });
                    return;
                  }
                  if (activeMenu.rowId && activeMenu.colKey) {
                    setCellValue(activeMenu.rowId, activeMenu.colKey, value);
                    endDropdownEditing(`${activeMenu.rowId}:${activeMenu.colKey}`);
                  }
                  closeMenu();
                }}>
                
                      <Plus size={14} strokeWidth={1.5} />
                      <span className="max-w-[220px] truncate max-lg:max-w-full">
                        {`Add custom: "${getOptionValue(customOptionEntry.option)}"`}
                      </span>
                    </button> :
              <span />}
                  {/* "Add new line item" removed — every section relies on
                      the search + "Add custom" affordances instead. */}
                  {activeMenu.mode === "search" ?
              <div className="flex items-center gap-3 max-lg:order-3 max-lg:flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <kbd className="rounded border border-tp-slate-200 bg-tp-slate-50 px-1 py-0.5 text-[10px] font-semibold text-tp-slate-600">↑</kbd>
                        Up
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <kbd className="rounded border border-tp-slate-200 bg-tp-slate-50 px-1 py-0.5 text-[10px] font-semibold text-tp-slate-600">↓</kbd>
                        Down
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <kbd className="rounded border border-tp-slate-200 bg-tp-slate-50 px-1 py-0.5 text-[10px] font-semibold text-tp-slate-600">↵</kbd>
                        Enter
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <kbd className="rounded border border-tp-slate-200 bg-tp-slate-50 px-1 py-0.5 text-[10px] font-semibold text-tp-slate-600">Esc</kbd>
                        Close
                      </span>
                    </div> :
              null}
                </div> :
            null}
            </div>,
          document.body
        ) :
        null}

    </TPRxPadSection>
    </div>);

}