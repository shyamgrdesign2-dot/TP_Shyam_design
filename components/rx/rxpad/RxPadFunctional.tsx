"use client"

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Calendar2, Notepad2, Trash } from "iconsax-reactjs"
import {
  ChevronDown,
  GripVertical,
  Info,
  Plus,
  Search,
} from "lucide-react"

import {
  diagnosisSuggestions,
  examinationSuggestions,
  medicationSuggestions,
  symptomSuggestions,
} from "../sample-data"
import {
  type HistoricalUpdateBatch,
  type RxPadCopyPayload,
  useRxPadSync,
} from "@/components/tp-rxpad/rxpad-sync-context"
import type { NavItemId } from "@/components/tp-rxpad/secondary-sidebar/types"
import { buildHistoricalUpdatesFromPayload } from "@/components/tp-rxpad/historical-updates-from-payload"
import { VoiceRxModuleRecorder } from "@/components/voicerx/VoiceRxModuleRecorder"
import { ShineBorder } from "@/components/magicui/shine-border"
import { DictationTranscript } from "@/components/voicerx/VoiceTranscriptProcessingCard"
import { AiTriggerChip } from "@/components/tp-rxpad/dr-agent/shared/AiTriggerChip"
import { useV0Mode } from "@/components/tp-rxpad/dr-agent/hooks/useV0Mode"
import { DEFAULT_SECTION_CONFIG, type RxSectionId, type RxSectionItem } from "@/components/tp-rxpad/RxCustomiseSidebar"
import { useCustomModules, useCustomModulesDrawer, useRxSectionConfig } from "@/components/tp-rxpad/customise-context"
import { CUSTOM_MODULE_CAP, markModuleUsed, type CustomModule } from "@/lib/customise-store"
import { ModuleIcon } from "@/components/tp-rxpad/custom-modules/ModuleIcon"
import { useModuleTemplateHandlers } from "@/components/tp-rxpad/templates"
import { PER_PATIENT_RXPAD_DATA, checkDrugInteraction, checkTableInteractions } from "./per-patient-rxpad-data"
import {
  TPMedicalIcon,
  TPRxPadSearchInput,
  TPRxPadSection,
  TPSnackbar,
  TPTooltip,
} from "@/components/tp-ui"

type TableRow = {
  id: string
  [key: string]: string
}

type ColumnConfig = {
  key: string
  label: string
  width: number
  minWidth?: number
  maxWidth?: number
  placeholder?: string
  multiline?: boolean
  maxLines?: 1 | 2 | 3
  editable?: boolean
  restrictToOptions?: boolean
  showDropdownToggle?: boolean
  getOptions?: (query: string, row: TableRow) => string[]
}

type TableModuleConfig = {
  id: string
  title: string
  icon: React.ReactNode
  columns: ColumnConfig[]
  primaryKey: string
  rows: TableRow[]
  onChangeRows: (rows: TableRow[]) => void
  searchPlaceholder: string
  cannedChips: string[]
  searchSuggestions?: string[]
  onRowAdded?: (text: string) => void
  onSaveClick?: () => void
  onTemplateClick?: () => void
  onClearClick?: () => void
  /** Per-module voice dictation trigger (renders a gradient mic square in the header). */
  onVoiceClick?: () => void
  /** Directly close voice recorder (bypasses toggle guard). */
  onVoiceClose?: () => void
  /** Whether voice dictation is currently active for this module. */
  voiceActive?: boolean
  /** Optional content rendered right-aligned after the search input area */
  afterSearch?: React.ReactNode
  /** Optional tag renderer for search dropdown options (e.g. "AI Suggested") */
  getOptionTag?: (option: string) => React.ReactNode
  /** data-rxpad-module attribute for scroll targeting */
  moduleDataAttr?: string
  /** Set of row IDs to highlight (e.g. drug interaction warnings) */
  highlightedRowIds?: Set<string>
  /** Tooltip text for highlighted rows, keyed by row ID */
  highlightedRowTooltips?: Record<string, string>
  /** Column key whose value must be grounded to a DB entry — only the
   *  primary "name" cell of medications / lab investigations carries
   *  this. When the row's id is in `ungroundedRowIds`, the cell renders
   *  a yellow stroke + orange info icon; selecting an option from the
   *  dropdown calls `onGroundRow` to clear the flag. */
  groundedKey?: string
  ungroundedRowIds?: Set<string>
  onGroundRow?: (rowId: string) => void
  /** Called with the raw transcript when the user submits the inline recorder. */
  onVoiceSubmit?: (transcript: string) => void
  /** When set (non-empty), replaces the module body with a processing overlay showing this transcript. */
  voiceProcessingTranscript?: string
  /** Number of rows just added from voice — drives the blue count badge. */
  voiceAddedCount?: number
  /** Identity for the template store. When set, the Save / Template
   *  header buttons drive the global template sidebars instead of the
   *  raw onSaveClick / onTemplateClick callbacks. */
  templateModuleId?: string
  templateModuleName?: string
}

type ActiveMenu = {
  mode: "cell" | "search"
  rowId?: string
  colKey?: string
  query: string
  highlightedIndex: number
  anchorRect: DOMRect
}

function getRowId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function rowHasValues(row: TableRow) {
  return Object.entries(row).some(([key, value]) => key !== "id" && value.trim().length > 0)
}

function getColumnMinWidth(column: ColumnConfig) {
  return column.minWidth ?? column.width
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null
  let current: HTMLElement | null = node.parentElement
  while (current) {
    const style = window.getComputedStyle(current)
    const scrollable = /(auto|scroll)/.test(style.overflowY)
    if (scrollable && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function snapFieldToViewportTop(element: HTMLElement, offset = 96) {
  if (typeof window === "undefined") return
  const scrollParent = getScrollParent(element)
  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect()
    const fieldRect = element.getBoundingClientRect()
    const delta = fieldRect.top - parentRect.top - offset
    scrollParent.scrollTo({
      top: Math.max(0, scrollParent.scrollTop + delta),
      behavior: "smooth",
    })
    return
  }
  const targetTop = window.scrollY + element.getBoundingClientRect().top - offset
  window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" })
}

function firstPositiveInteger(value: string) {
  const match = value.match(/\d+/)
  if (!match) return 1
  const parsed = Number.parseInt(match[0], 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function pluralize(base: string, count: number) {
  return `${count} ${base}${count > 1 ? "s" : ""}`
}

function getSinceOptions(query: string) {
  const n = firstPositiveInteger(query)
  return [
    pluralize("hour", n),
    pluralize("day", n),
    pluralize("month", n),
    pluralize("year", n),
  ]
}

function getMedicationUnitOptions(query: string) {
  const n = firstPositiveInteger(query)
  return [
    pluralize("tablet", n),
    pluralize("unit", n),
    pluralize("capsule", n),
  ]
}

function getFrequencyOptions(query: string) {
  const n = firstPositiveInteger(query)
  const options = [
    `${n}-0-${n}`,
    `${n}-0-0-${n}`,
    `${n}-${n}-${n}`,
    `${n}-0-${Math.max(1, n - 1)}`,
    `${n}-1-${n}`,
    "1-0-1",
    "1-0-0-1",
    "0-1-0",
    "SOS",
  ]
  return Array.from(new Set(options))
}

const MEDICATION_WHEN_OPTIONS = [
  "Before Breakfast",
  "After Breakfast",
  "Before Lunch",
  "After Lunch",
  "Before Dinner",
  "After Dinner",
  "Before Food",
  "After Food",
  "With Food",
]

const ADVICE_SUGGESTIONS = [
  "Stay hydrated daily",
  "Take steam inhalation",
  "Avoid oily foods",
  "Complete medication course",
  "Monitor blood pressure",
  "Regular morning walk",
  "Salt restricted diet",
  "Follow sleep hygiene",
]

const LAB_INVESTIGATION_BASE_OPTIONS = [
  "Complete Blood Count",
  "Liver Function Test",
  "Renal Function Test",
  "Lipid Profile",
  "Thyroid Profile",
  "HbA1c",
  "Fasting Blood Sugar",
  "Urine Routine",
  "Chest X-Ray",
  "ECG",
]

const SURGERY_SUGGESTIONS = [
  "Thoracic Relief Procedure",
  "Pulmonary Enhancement Surgery",
  "Abdominal Reconstruction Surgery",
  "Urological Restoration Procedure",
  "Articular Repair Surgery",
  "Laparoscopic Appendectomy",
  "Sinus Endoscopy",
  "Tonsillectomy",
]

function getDurationOptions(query: string) {
  const n = firstPositiveInteger(query)
  const options = [
    "Stat",
    "To Be Continued",
    "Only If Required",
    pluralize("day", n),
    pluralize("week", n),
    pluralize("month", n),
    pluralize("year", n),
  ]
  return Array.from(new Set(options))
}

function getSeedQuery(query: string, fallback: string) {
  const next = query.trim()
  if (next.length > 0) return next
  return fallback
}

function filterByQuery(options: string[], query: string) {
  const needle = normalizeText(query)
  if (!needle) return options
  const filtered = options.filter((option) => normalizeText(option).includes(needle))
  return filtered.length > 0 ? filtered : options
}

const CUSTOM_OPTION_PREFIX = "__custom__:"

function toCustomOption(value: string) {
  return `${CUSTOM_OPTION_PREFIX}${value.trim()}`
}

function isCustomOption(value: string) {
  return value.startsWith(CUSTOM_OPTION_PREFIX)
}

function getOptionValue(value: string) {
  return isCustomOption(value) ? value.slice(CUSTOM_OPTION_PREFIX.length) : value
}

function getOptionLabel(value: string) {
  return isCustomOption(value) ? `Add custom: ${getOptionValue(value)}` : value
}

function withCustomOption(options: string[], query: string) {
  const trimmed = query.trim()
  if (!trimmed) return options
  const customOption = toCustomOption(trimmed)
  const hasCustomAlready = options.some(
    (option) =>
      isCustomOption(option) &&
      normalizeText(getOptionValue(option)) === normalizeText(trimmed),
  )
  if (hasCustomAlready) return options
  return [...options, customOption]
}

function getCatalogOptions(catalog: string[], query: string, limit = 10) {
  const needle = normalizeText(query)
  const filtered = needle
    ? catalog.filter((option) => normalizeText(option).includes(needle))
    : catalog
  return withCustomOption(filtered.slice(0, limit), query)
}

function moveSelectedOptionToTop(options: string[], selectedValue: string) {
  const selected = normalizeText(selectedValue)
  if (!selected) return options
  const selectedIndex = options.findIndex(
    (option) => !isCustomOption(option) && normalizeText(getOptionValue(option)) === selected,
  )
  if (selectedIndex <= 0) return options
  const next = [...options]
  const [picked] = next.splice(selectedIndex, 1)
  next.unshift(picked)
  return next
}

function useTabletMode() {
  const [tabletMode, setTabletMode] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const widthQuery = window.matchMedia("(max-width: 1180px)")
    const touchQuery = window.matchMedia("(hover: none), (pointer: coarse)")

    const update = () => {
      const isTabletWidth = window.innerWidth <= 1180
      const touchLike = touchQuery.matches || window.navigator.maxTouchPoints > 0
      setTabletMode(isTabletWidth && touchLike)
    }

    update()
    widthQuery.addEventListener("change", update)
    touchQuery.addEventListener("change", update)
    window.addEventListener("resize", update)

    return () => {
      widthQuery.removeEventListener("change", update)
      touchQuery.removeEventListener("change", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return tabletMode
}

function buildDefaultRow(
  moduleId: string,
  columns: ColumnConfig[],
  primaryKey: string,
  seedText = "",
): TableRow {
  const row: TableRow = { id: getRowId(moduleId) }
  for (const column of columns) {
    if (column.key === primaryKey && seedText.trim()) {
      row[column.key] = seedText.trim()
      continue
    }
    row[column.key] = ""
  }
  return row
}

function VoiceRxSectionProcessing({
  transcript,
  sectionLabel,
}: {
  transcript: string
  sectionLabel: string
}) {
  const captions = useMemo(() => [
    `Analysing your ${sectionLabel.toLowerCase()} dictation…`,
    "Structuring your clinical notes…",
    "Preparing entries for review…",
  ], [sectionLabel])
  const [captionIdx, setCaptionIdx] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => setCaptionIdx((i) => (i + 1) % captions.length), 2000)
    return () => window.clearInterval(t)
  }, [captions.length])

  const transcriptScrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const el = transcriptScrollRef.current
    if (!el) return

    let raf = 0
    let last = performance.now()
    let pausedUntil = 0
    const PX_PER_SEC = 24

    const tick = (now: number) => {
      if (now < pausedUntil) {
        last = now
        raf = requestAnimationFrame(tick)
        return
      }
      const dt = (now - last) / 1000
      last = now
      const max = el.scrollHeight - el.clientHeight
      if (max > 8) {
        const next = el.scrollTop + PX_PER_SEC * dt
        if (next >= max) {
          el.scrollTop = max
          pausedUntil = now + 1400
          window.setTimeout(() => {
            transcriptScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
          }, 1400)
        } else {
          el.scrollTop = next
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex w-full min-h-0 flex-col items-center gap-[10px]">
      {/* Shiner card — wraps to transcript content, maxHeight 140px + scroll */}
      <div
        className="vrx-shiner-enter relative flex w-full min-h-0 flex-col overflow-hidden rounded-[16px] bg-tp-slate-50/60"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04)", maxHeight: 140 }}
      >
        <ShineBorder
          variant="rotate"
          borderWidth={1.5}
          duration={2.2}
          shineColor={["#D565EA", "#673AAC", "#1A1994"]}
          baseColor="rgba(226,226,234,0.95)"
        />
        <div
          ref={transcriptScrollRef}
          className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-[14px] text-center"
        >
          <DictationTranscript raw={transcript} />
        </div>
      </div>

      {/* Caption shimmer carousel adapted for inline modules */}
      <div className="vrx-caption-stage flex w-full items-center justify-center px-[2px] py-[3px] text-[14px] font-semibold leading-[1.4] text-tp-slate-600">
        <span
          key={captionIdx}
          className="vrx-process-caption vrx-caption-slide whitespace-nowrap"
          style={{
            backgroundImage: "linear-gradient(100deg, #45455c 0%, #45455c 32%, #D565EA 46%, #673AAC 50%, #1A1994 54%, #45455c 68%, #45455c 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            display: "inline-block",
            paddingBottom: 2,
          }}
        >
          {captions[captionIdx]}
        </span>
      </div>

      <style>{`
        @keyframes vrxCaptionShine {
          0%   { background-position: 200% 0%; }
          100% { background-position: -200% 0%; }
        }
        .vrx-process-caption { animation: vrxCaptionShine 2.4s linear infinite; }

        @keyframes vrxCaptionSlide {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .vrx-caption-slide {
          animation:
            vrxCaptionSlide 360ms cubic-bezier(0.22, 1, 0.36, 1) both,
            vrxCaptionShine 2.4s linear infinite;
        }

        .vrx-shiner-enter {
          animation: vrxShinerEnter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes vrxShinerEnter {
          0%   { opacity: 0; transform: translateY(12px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vrx-process-caption,
          .vrx-caption-slide,
          .vrx-shiner-enter { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

function EditableTableModule({
  id,
  title,
  icon,
  columns,
  primaryKey,
  rows,
  onChangeRows,
  searchPlaceholder,
  cannedChips,
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
}: TableModuleConfig) {
  const isTablet = useTabletMode()
  const [searchText, setSearchText] = useState("")
  const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null)
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)
  const [activeCell, setActiveCell] = useState<{ rowId: string; colKey: string } | null>(null)
  const [editingCellValues, setEditingCellValues] = useState<Record<string, string>>({})
  const [isActionSticky, setIsActionSticky] = useState(false)
  const [menuIndicator, setMenuIndicator] = useState({
    hasOverflow: false,
    thumbTop: 0,
    thumbHeight: 18,
  })

  const moduleRootRef = useRef<HTMLDivElement | null>(null)
  const tableWrapRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const menuListRef = useRef<HTMLDivElement | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})
  const transparentDragImageRef = useRef<HTMLImageElement | null>(null)
  const rowTopByIdRef = useRef<Record<string, number>>({})
  const dragPreviewTargetRef = useRef<string | null>(null)
  const colIndexByKey = useMemo(
    () => Object.fromEntries(columns.map((column, idx) => [column.key, idx])),
    [columns],
  )
  const searchCatalog = useMemo(
    () => (searchSuggestions.length > 0 ? searchSuggestions : cannedChips),
    [cannedChips, searchSuggestions],
  )
  const searchCatalogKey = useMemo(() => searchCatalog.join("||"), [searchCatalog])
  const [dynamicSearchCatalog, setDynamicSearchCatalog] = useState<string[]>(searchCatalog)
  const shouldFilterCellOnOpen = useCallback(
    (column: ColumnConfig) =>
      column.key === primaryKey && Boolean(column.getOptions) && !column.restrictToOptions,
    [primaryKey],
  )

  useEffect(() => {
    setDynamicSearchCatalog(searchCatalog)
  }, [searchCatalog, searchCatalogKey])

  useEffect(() => {
    // Keep committed primary-field values discoverable in future dropdown searches.
    setDynamicSearchCatalog((prev) => {
      const seen = new Set(prev.map((item) => normalizeText(item)))
      const additions: string[] = []
      for (const row of rows) {
        const value = (row[primaryKey] ?? "").trim()
        if (!value) continue
        const key = normalizeText(value)
        if (seen.has(key)) continue
        seen.add(key)
        additions.push(value)
      }
      if (additions.length === 0) return prev
      return [...additions, ...prev]
    })
  }, [rows, primaryKey])
  const totalColumnWidth = useMemo(
    () =>
      Math.max(
        1,
        columns.reduce((sum, column) => sum + Math.max(column.width, getColumnMinWidth(column)), 0),
      ),
    [columns],
  )

  const getResponsiveColumnStyle = useCallback(
    (column: ColumnConfig): React.CSSProperties => ({
      width: `${(column.width / totalColumnWidth) * 100}%`,
      minWidth: getColumnMinWidth(column),
      maxWidth: column.maxWidth,
    }),
    [totalColumnWidth],
  )

  const setCellValue = useCallback(
    (rowId: string, key: string, value: string) => {
      onChangeRows(
        rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                [key]: value,
              }
            : row,
        ),
      )
    },
    [onChangeRows, rows],
  )

  const registerCustomValue = useCallback((value: string) => {
    const nextValue = value.trim()
    if (!nextValue) return
    setDynamicSearchCatalog((prev) => {
      const exists = prev.some((item) => normalizeText(item) === normalizeText(nextValue))
      if (exists) return prev
      return [nextValue, ...prev]
    })
  }, [])

  const beginDropdownEditing = useCallback((key: string, value: string) => {
    setEditingCellValues((prev) => {
      if (prev[key] === value) return prev
      return { ...prev, [key]: value }
    })
  }, [])

  const endDropdownEditing = useCallback((key: string) => {
    setEditingCellValues((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const ensureCellVisibleInTable = useCallback((element: HTMLElement) => {
    const wrapper = tableWrapRef.current
    if (!wrapper) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const cellRect = element.getBoundingClientRect()
    const rightSafetyInset = 62
    const leftSafetyInset = 8

    if (cellRect.right > wrapperRect.right - rightSafetyInset) {
      const delta = cellRect.right - (wrapperRect.right - rightSafetyInset)
      wrapper.scrollBy({ left: delta + 8, behavior: "smooth" })
    } else if (cellRect.left < wrapperRect.left + leftSafetyInset) {
      const delta = wrapperRect.left + leftSafetyInset - cellRect.left
      wrapper.scrollBy({ left: -delta - 8, behavior: "smooth" })
    }
  }, [])

  const addRow = useCallback(
    (seedText = "") => {
      const row = buildDefaultRow(id, columns, primaryKey, seedText)
      onChangeRows([...rows, row])
      onRowAdded?.(seedText)
    },
    [columns, id, onChangeRows, onRowAdded, primaryKey, rows],
  )

  const hasAnyData = useMemo(() => rows.some((row) => rowHasValues(row)), [rows])

  // ── Template integration ──
  // When templateModuleId is provided, the Save / Template buttons open
  // the global template sidebars (Save = save-template flow, Template =
  // load-template list). Otherwise we fall back to the raw callbacks
  // (legacy behaviour) so callers without templates wired still work.
  const applyTemplateRows = useCallback(
    (templateRows: Array<Record<string, string | undefined>>) => {
      if (!templateRows.length) return
      const enriched: TableRow[] = templateRows.map((src) => {
        const next: TableRow = { id: getRowId(id) }
        for (const col of columns) {
          const v = src[col.key]
          next[col.key] = typeof v === "string" ? v : ""
        }
        return next
      })
      onChangeRows([...rows, ...enriched])
    },
    [columns, id, onChangeRows, rows],
  )

  const templateHandlers = useModuleTemplateHandlers(
    templateModuleId ?? "",
    templateModuleName ?? title,
    rows,
    applyTemplateRows,
  )

  const handleTemplateClick = useCallback(() => {
    if (templateModuleId) {
      templateHandlers.onTemplateClick()
      return
    }
    if (onTemplateClick) {
      onTemplateClick()
      return
    }
    addRow(cannedChips[0] ?? "")
  }, [addRow, cannedChips, onTemplateClick, templateHandlers, templateModuleId])

  const handleSaveClick = useCallback(() => {
    if (templateModuleId) {
      templateHandlers.onSaveClick()
      return
    }
    onSaveClick?.()
  }, [onSaveClick, templateHandlers, templateModuleId])

  const handleClearClick = useCallback(() => {
    if (onClearClick) {
      onClearClick()
      return
    }
    onChangeRows([])
  }, [onChangeRows, onClearClick])

  const removeRow = useCallback(
    (rowId: string) => {
      onChangeRows(rows.filter((row) => row.id !== rowId))
    },
    [onChangeRows, rows],
  )

  const moveRow = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return
      const sourceIndex = rows.findIndex((row) => row.id === sourceId)
      const targetIndex = rows.findIndex((row) => row.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return
      const clone = [...rows]
      const [picked] = clone.splice(sourceIndex, 1)
      clone.splice(targetIndex, 0, picked)
      onChangeRows(clone)
    },
    [onChangeRows, rows],
  )

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const nextRow = rows[rowIndex]
      const nextColumn = columns[colIndex]
      if (!nextRow || !nextColumn) return
      const key = `${nextRow.id}:${nextColumn.key}`
      const element = inputRefs.current[key]
      if (!element) return
      element.focus()
      const len = element.value.length
      element.setSelectionRange(len, len)
    },
    [columns, rows],
  )

  const focusOwnSearch = useCallback(() => {
    const node = searchInputRef.current
    if (!node) return
    node.focus()
    node.select()
    if (isTablet) {
      snapFieldToViewportTop(node)
    }
  }, [isTablet])

  const focusNextModuleSearch = useCallback(() => {
    if (typeof document === "undefined") return
    const current = searchInputRef.current
    if (!current) return
    const allSearches = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-rx-module-search="true"]'),
    )
    const idx = allSearches.findIndex((node) => node === current)
    if (idx < 0 || idx >= allSearches.length - 1) {
      current.focus()
      current.select()
      return
    }
    const next = allSearches[idx + 1]
    next.focus()
    next.select()
    if (isTablet) {
      snapFieldToViewportTop(next)
    }
  }, [isTablet])

  const focusPreviousModuleSearch = useCallback(() => {
    if (typeof document === "undefined") return
    const current = searchInputRef.current
    if (!current) return
    const allSearches = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-rx-module-search="true"]'),
    )
    const idx = allSearches.findIndex((node) => node === current)
    if (idx <= 0) {
      current.focus()
      current.select()
      return
    }
    const prev = allSearches[idx - 1]
    prev.focus()
    prev.select()
    if (isTablet) {
      snapFieldToViewportTop(prev)
    }
  }, [isTablet])

  const focusFirstCellInModule = useCallback(
    (moduleRoot: HTMLElement | null) => {
      if (!moduleRoot) return false

      const firstCell = moduleRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[data-rx-cell-input="true"]',
      )
      if (firstCell) {
        firstCell.focus()
        const len = firstCell.value.length
        firstCell.setSelectionRange(len, len)
        if (isTablet) {
          snapFieldToViewportTop(firstCell)
        }
        return true
      }

      const moduleSearch = moduleRoot.querySelector<HTMLInputElement>('[data-rx-module-search="true"]')
      if (moduleSearch) {
        moduleSearch.focus()
        moduleSearch.select()
        if (isTablet) {
          snapFieldToViewportTop(moduleSearch)
        }
        return true
      }

      return false
    },
    [isTablet],
  )

  const focusNextModuleFirstCell = useCallback(() => {
    if (typeof document === "undefined") return
    const currentRoot = moduleRootRef.current
    if (!currentRoot) {
      focusNextModuleSearch()
      return
    }
    const allRoots = Array.from(document.querySelectorAll<HTMLElement>('[data-rx-module-root="true"]'))
    const idx = allRoots.findIndex((node) => node === currentRoot)
    if (idx < 0 || idx >= allRoots.length - 1) {
      focusOwnSearch()
      return
    }
    const nextRoot = allRoots[idx + 1]
    if (!focusFirstCellInModule(nextRoot)) {
      focusNextModuleSearch()
    }
  }, [focusFirstCellInModule, focusNextModuleSearch, focusOwnSearch])

  const focusPreviousModuleLastCell = useCallback(() => {
    if (typeof document === "undefined") return
    const currentRoot = moduleRootRef.current
    if (!currentRoot) {
      focusPreviousModuleSearch()
      return
    }
    const allRoots = Array.from(document.querySelectorAll<HTMLElement>('[data-rx-module-root="true"]'))
    const idx = allRoots.findIndex((node) => node === currentRoot)
    if (idx <= 0) {
      focusOwnSearch()
      return
    }
    const prevRoot = allRoots[idx - 1]
    const cells = Array.from(
      prevRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-rx-cell-input="true"]'),
    )
    const lastCell = cells[cells.length - 1]
    if (lastCell) {
      lastCell.focus()
      const len = lastCell.value.length
      lastCell.setSelectionRange(len, len)
      if (isTablet) {
        snapFieldToViewportTop(lastCell)
      }
      return
    }
    focusPreviousModuleSearch()
  }, [focusOwnSearch, focusPreviousModuleSearch, isTablet])

  const focusNextFromCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const lastColIndex = columns.length - 1
      if (colIndex < lastColIndex) {
        focusCell(rowIndex, colIndex + 1)
        return
      }
      if (rowIndex < rows.length - 1) {
        focusCell(rowIndex + 1, 0)
        return
      }
      focusOwnSearch()
    },
    [columns.length, focusCell, focusOwnSearch, rows.length],
  )

  const focusPreviousFromCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const lastColIndex = columns.length - 1
      if (colIndex > 0) {
        focusCell(rowIndex, colIndex - 1)
        return
      }
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, lastColIndex)
        return
      }
      focusOwnSearch()
    },
    [columns.length, focusCell, focusOwnSearch],
  )

  const closeMenu = useCallback(() => setActiveMenu(null), [])

  const optionsForMenu = useMemo(() => {
    if (!activeMenu) return []
    if (activeMenu.mode === "search") {
      return getCatalogOptions(dynamicSearchCatalog, activeMenu.query, 10)
    }
    const rowId = activeMenu.rowId ?? ""
    const colKey = activeMenu.colKey ?? ""
    const row = rows.find((item) => item.id === rowId)
    const column = columns.find((item) => item.key === colKey)
    if (!row || !column?.getOptions) return []
    if (column.key === primaryKey && !column.restrictToOptions) {
      const filtered = getCatalogOptions(dynamicSearchCatalog, activeMenu.query, 10)
      return moveSelectedOptionToTop(filtered, row[colKey] ?? "")
    }
    const filtered = filterByQuery(column.getOptions(activeMenu.query, row), activeMenu.query)
    return moveSelectedOptionToTop(filtered, row[colKey] ?? "")
  }, [activeMenu, columns, rows, dynamicSearchCatalog, primaryKey])

  const getMenuHighlightedIndex = useCallback(
    (row: TableRow, column: ColumnConfig, query: string, selectedValue: string) => {
      if (!column.getOptions) return 0
      const options =
        column.key === primaryKey && !column.restrictToOptions
          ? moveSelectedOptionToTop(getCatalogOptions(dynamicSearchCatalog, query, 10), selectedValue)
          : moveSelectedOptionToTop(
              filterByQuery(column.getOptions(query, row), query),
              selectedValue,
            )
      if (options.length === 0) return 0
      const selected = normalizeText(selectedValue)
      const selectedIndex = options.findIndex(
        (option) => !isCustomOption(option) && normalizeText(getOptionValue(option)) === selected,
      )
      return selectedIndex >= 0 ? selectedIndex : 0
    },
    [dynamicSearchCatalog, primaryKey],
  )

  const openCellMenu = useCallback(
    (
      row: TableRow,
      column: ColumnConfig,
      anchorRect: DOMRect,
      selectedValue: string,
      query: string,
      showAllOptions = false,
    ) => {
      if (!column.getOptions) return
      const nextQuery = showAllOptions ? "" : query
      setActiveMenu({
        mode: "cell",
        rowId: row.id,
        colKey: column.key,
        query: nextQuery,
        highlightedIndex: getMenuHighlightedIndex(row, column, nextQuery, selectedValue),
        anchorRect,
      })
    },
    [getMenuHighlightedIndex],
  )

  const openSearchMenu = useCallback(
    (query: string, showAllOptions = false) => {
      const anchorRect = searchInputRef.current?.getBoundingClientRect()
      if (!anchorRect) return
      const nextQuery = showAllOptions ? "" : query
      const options = getCatalogOptions(dynamicSearchCatalog, nextQuery, 10)
      const selected = normalizeText(query)
      const selectedIndex = options.findIndex(
        (option) => !isCustomOption(option) && normalizeText(getOptionValue(option)) === selected,
      )
      setActiveMenu({
        mode: "search",
        query: nextQuery,
        highlightedIndex: selectedIndex >= 0 ? selectedIndex : 0,
        anchorRect,
      })
    },
    [dynamicSearchCatalog],
  )

  useEffect(() => {
    if (!activeMenu) return
    const updateAnchor = () => {
      const anchor =
        activeMenu.mode === "search"
          ? searchInputRef.current
          : inputRefs.current[`${activeMenu.rowId ?? ""}:${activeMenu.colKey ?? ""}`]
      if (!anchor) return
      const nextRect = anchor.getBoundingClientRect()
      setActiveMenu((current) => {
        if (!current) return current
        const prev = current.anchorRect
        if (
          prev &&
          prev.top === nextRect.top &&
          prev.left === nextRect.left &&
          prev.width === nextRect.width &&
          prev.height === nextRect.height
        ) {
          // No-op: rect unchanged. Returning the same reference lets
          // React bail out, which prevents this effect (which depends
          // on activeMenu) from re-running into an infinite loop.
          return current
        }
        return {
          ...current,
          anchorRect: nextRect,
        }
      })
    }
    updateAnchor()
    window.addEventListener("resize", updateAnchor)
    window.addEventListener("scroll", updateAnchor, true)
    return () => {
      window.removeEventListener("resize", updateAnchor)
      window.removeEventListener("scroll", updateAnchor, true)
    }
  }, [activeMenu])

  useEffect(() => {
    const node = menuListRef.current
    if (!activeMenu || !node) {
      setMenuIndicator((prev) =>
        prev.hasOverflow || prev.thumbTop !== 0
          ? { hasOverflow: false, thumbTop: 0, thumbHeight: 18 }
          : prev,
      )
      return
    }

    const updateIndicator = () => {
      const clientHeight = node.clientHeight
      const scrollHeight = node.scrollHeight
      const scrollTop = node.scrollTop
      const hasOverflow = scrollHeight > clientHeight + 1

      const trackPadding = 8
      const trackHeight = Math.max(0, clientHeight - trackPadding * 2)
      const thumbHeight = hasOverflow
        ? Math.max(18, Math.min(trackHeight, (clientHeight / scrollHeight) * trackHeight))
        : trackHeight
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight)
      const thumbTop =
        hasOverflow && scrollHeight > clientHeight
          ? (scrollTop / (scrollHeight - clientHeight)) * maxThumbTop
          : 0

      setMenuIndicator((prev) => {
        if (
          prev.hasOverflow === hasOverflow &&
          Math.abs(prev.thumbTop - thumbTop) < 0.5 &&
          Math.abs(prev.thumbHeight - thumbHeight) < 0.5
        ) {
          return prev
        }
        return { hasOverflow, thumbTop, thumbHeight }
      })
    }

    updateIndicator()
    node.addEventListener("scroll", updateIndicator, { passive: true })
    window.addEventListener("resize", updateIndicator)

    return () => {
      node.removeEventListener("scroll", updateIndicator)
      window.removeEventListener("resize", updateIndicator)
    }
  }, [activeMenu, optionsForMenu.length])

  useEffect(() => {
    const node = menuListRef.current
    if (!activeMenu || !node) return
    const index = activeMenu.highlightedIndex
    if (index < 0) return

    const target = node.querySelector<HTMLElement>(`[data-rx-menu-index="${index}"]`)
    if (!target) return

    const targetTop = target.offsetTop
    const targetBottom = targetTop + target.offsetHeight
    const viewTop = node.scrollTop
    const viewBottom = viewTop + node.clientHeight

    if (targetTop < viewTop) {
      node.scrollTo({ top: Math.max(0, targetTop - 4), behavior: "smooth" })
      return
    }
    if (targetBottom > viewBottom) {
      node.scrollTo({ top: targetBottom - node.clientHeight + 4, behavior: "smooth" })
    }
  }, [
    activeMenu?.mode,
    activeMenu?.rowId,
    activeMenu?.colKey,
    activeMenu?.highlightedIndex,
    optionsForMenu.length,
  ])

  useEffect(() => {
    if (rows.length > 0) return
    setActiveCell(null)
    setActiveMenu(null)
  }, [rows.length])

  useLayoutEffect(() => {
    const wrapper = tableWrapRef.current
    const tbody = wrapper?.querySelector("tbody")
    if (!tbody) {
      rowTopByIdRef.current = {}
      return
    }

    const rowElements = Array.from(
      tbody.querySelectorAll<HTMLTableRowElement>("tr[data-row-id]"),
    )

    const nextTopById: Record<string, number> = {}
    for (const rowElement of rowElements) {
      const rowId = rowElement.dataset.rowId
      if (!rowId) continue
      const nextTop = rowElement.getBoundingClientRect().top
      nextTopById[rowId] = nextTop

      const prevTop = rowTopByIdRef.current[rowId]
      if (prevTop == null) continue
      const deltaY = prevTop - nextTop
      if (Math.abs(deltaY) < 1) continue

      rowElement.style.transition = "transform 0s"
      rowElement.style.transform = `translateY(${deltaY}px)`
      rowElement.getBoundingClientRect()
      rowElement.style.transition = "transform 220ms cubic-bezier(0.22,1,0.36,1)"
      rowElement.style.transform = ""
    }

    rowTopByIdRef.current = nextTopById
  }, [rows])

  useEffect(() => {
    if (!draggingRowId) return

    const handleDocumentDragOver = (event: DragEvent) => {
      if (event.clientX === 0 && event.clientY === 0) return
      const wrapper = tableWrapRef.current
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      const withinX = event.clientX >= rect.left && event.clientX <= rect.right
      const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom

      if (!withinX || !withinY) {
        setDragOverRowId(null)
      }
    }

    const handleDocumentDrop = () => {
      setDraggingRowId(null)
      setDragOverRowId(null)
      dragPreviewTargetRef.current = null
    }

    const handleDocumentDragEnd = () => {
      setDraggingRowId(null)
      setDragOverRowId(null)
      dragPreviewTargetRef.current = null
    }

    document.addEventListener("dragover", handleDocumentDragOver)
    document.addEventListener("drop", handleDocumentDrop)
    document.addEventListener("dragend", handleDocumentDragEnd)

    return () => {
      document.removeEventListener("dragover", handleDocumentDragOver)
      document.removeEventListener("drop", handleDocumentDrop)
      document.removeEventListener("dragend", handleDocumentDragEnd)
    }
  }, [draggingRowId])

  useEffect(() => {
    const wrapper = tableWrapRef.current
    if (!wrapper || rows.length === 0) {
      setIsActionSticky(false)
      return
    }

    const updateStickyState = () => {
      const hasOverflow = wrapper.scrollWidth > wrapper.clientWidth + 1
      setIsActionSticky(hasOverflow)
    }

    updateStickyState()
    window.addEventListener("resize", updateStickyState)
    wrapper.addEventListener("scroll", updateStickyState, { passive: true })

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateStickyState)
      observer.observe(wrapper)
      const table = wrapper.querySelector("table")
      if (table) {
        observer.observe(table)
      }
    }

    return () => {
      window.removeEventListener("resize", updateStickyState)
      wrapper.removeEventListener("scroll", updateStickyState)
      observer?.disconnect()
    }
  }, [rows.length, columns.length])

  const stickyActionHeaderClass = isActionSticky
    ? "sticky right-0 z-40 border-l border-tp-slate-200/80 bg-tp-slate-50 shadow-[-8px_7px_14px_-12px_rgba(15,23,42,0.18)] before:pointer-events-none before:absolute before:inset-y-0 before:-left-2 before:w-2 before:content-[''] before:bg-gradient-to-l before:from-tp-slate-900/6 before:to-transparent"
    : ""

  const stickyActionCellClass = isActionSticky
    ? "sticky right-0 z-40 border-l border-tp-slate-200/80 bg-white shadow-[-8px_7px_14px_-12px_rgba(15,23,42,0.18)] before:pointer-events-none before:absolute before:inset-y-0 before:-left-2 before:w-2 before:content-[''] before:bg-gradient-to-l before:from-tp-slate-900/6 before:to-transparent"
    : ""

  const menuPosition = activeMenu
    ? (() => {
      const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280
      const activeColumn =
        activeMenu.mode === "cell"
          ? columns.find((column) => column.key === activeMenu.colKey)
          : undefined
      const allowWideCellDropdown = Boolean(activeColumn && shouldFilterCellOnOpen(activeColumn))

      const desiredWidth = (() => {
        if (activeMenu.mode === "search") {
          return activeMenu.anchorRect.width
        }
        if (allowWideCellDropdown) {
          return activeMenu.anchorRect.width + (isTablet ? 32 : 40)
        }
        return activeMenu.anchorRect.width
      })()

      const minWidth = activeMenu.mode === "search" ? 220 : 120
      const width = Math.min(desiredWidth, Math.max(minWidth, viewportWidth - 16))
      const rawLeft = Math.max(8, activeMenu.anchorRect.left)
      const left = Math.min(rawLeft, Math.max(8, viewportWidth - width - 8))
        return {
          left,
          top: activeMenu.anchorRect.bottom + 6,
          width,
        }
      })()
    : null

  const regularOptionEntries = useMemo(
    () =>
      optionsForMenu
        .map((option, index) => ({ option, index }))
        .filter((entry) => !isCustomOption(entry.option)),
    [optionsForMenu],
  )

  const customOptionEntry = useMemo(() => {
    const index = optionsForMenu.findIndex((option) => isCustomOption(option))
    if (index < 0) return null
    return { option: optionsForMenu[index], index }
  }, [optionsForMenu])
  const showMenuFooter = activeMenu?.mode === "search" || Boolean(customOptionEntry)

  const sideColumnStyle: React.CSSProperties = {
    width: 50,
    minWidth: 50,
    maxWidth: 50,
  }

  return (
    <div {...(moduleDataAttr ? { "data-rxpad-module": moduleDataAttr } : {})}>
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
      headerBadge={null}
    >
      <div ref={moduleRootRef} data-rx-module-root="true" className="space-y-[18px]">
        {rows.length > 0 ? (
          <div
            ref={tableWrapRef}
            className="relative overflow-x-auto rounded-[10px] border border-tp-slate-100"
            onDragOver={(event) => {
              if (!draggingRowId) return
              event.preventDefault()
            }}
            onDragLeave={(event) => {
              if (!draggingRowId) return
              const rect = event.currentTarget.getBoundingClientRect()
              const withinX = event.clientX >= rect.left && event.clientX <= rect.right
              const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom
              if (withinX && withinY) return
              setDragOverRowId(null)
            }}
          >
            <table className="min-w-full w-max table-fixed font-['Inter',sans-serif] text-[14px]">
              <colgroup>
                <col style={sideColumnStyle} />
                {columns.map((column) => (
                  <col key={`col-${column.key}`} style={getResponsiveColumnStyle(column)} />
                ))}
                <col style={sideColumnStyle} />
              </colgroup>
              <thead>
                <tr className="h-[38px] bg-tp-slate-50 font-['Inter',sans-serif] text-[12px] text-tp-slate-500">
                <th className="border-r border-tp-slate-100 px-0 py-2 text-center font-semibold" style={sideColumnStyle} />
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="border-r border-tp-slate-100 px-3 py-2 text-left text-[12px] font-semibold"
                    style={getResponsiveColumnStyle(column)}
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  className={[
                    "relative px-0 py-2 text-center text-[12px] font-semibold",
                    stickyActionHeaderClass,
                  ].join(" ")}
                  style={sideColumnStyle}
                />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                (() => {
                  const isDraggingRow = draggingRowId === row.id
                  const isDropTargetRow = dragOverRowId === row.id && !isDraggingRow
                  const isHighlighted = highlightedRowIds?.has(row.id)
                  const highlightTooltip = highlightedRowTooltips?.[row.id]
                  return (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  title={highlightTooltip}
                  className={[
                    "h-[52px] border-t border-tp-slate-100 align-middle transition-colors duration-150 will-change-transform",
                    isHighlighted ? "bg-tp-warning-50/40 border-l-2 border-l-tp-warning-300" : "bg-white",
                    isDraggingRow ? "bg-tp-blue-50/45" : "",
                    isDropTargetRow ? "bg-tp-blue-50/65" : "hover:bg-tp-slate-50/50",
                  ].join(" ")}
                  onDragOver={(event) => {
                    if (!draggingRowId) return
                    event.preventDefault()
                    setDragOverRowId(row.id)
                    if (draggingRowId !== row.id && dragPreviewTargetRef.current !== row.id) {
                      dragPreviewTargetRef.current = row.id
                      moveRow(draggingRowId, row.id)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!draggingRowId) return
                    setDragOverRowId(null)
                    setDraggingRowId(null)
                    dragPreviewTargetRef.current = null
                  }}
                >
                  <td className="border-r border-tp-slate-100 p-0 text-center align-middle" style={sideColumnStyle}>
                    <button
                      type="button"
                      data-drag-handle="true"
                      draggable
                      className={[
                        "inline-flex h-[52px] w-full cursor-grab items-center justify-center transition-colors active:cursor-grabbing",
                        isDraggingRow
                          ? "bg-tp-blue-50 text-tp-blue-600"
                          : "text-tp-slate-400 hover:bg-tp-slate-100 hover:text-tp-slate-600",
                      ].join(" ")}
                      aria-label="Drag to reorder row"
                      onDragStart={(event) => {
                        setDraggingRowId(row.id)
                        setDragOverRowId(row.id)
                        dragPreviewTargetRef.current = row.id
                        event.dataTransfer.effectAllowed = "move"
                        try {
                          event.dataTransfer.setData("application/x-rx-row-id", row.id)
                        } catch {
                          // keep drag alive in strict browser modes without polluting clipboard text
                        }

                        if (!transparentDragImageRef.current) {
                          const transparent = new Image()
                          transparent.src =
                            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                          transparentDragImageRef.current = transparent
                        }
                        event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0)
                      }}
                      onDragEnd={() => {
                        setDraggingRowId(null)
                        setDragOverRowId(null)
                        dragPreviewTargetRef.current = null
                      }}
                    >
                      <GripVertical size={18} strokeWidth={1.5} />
                    </button>
                  </td>

                  {columns.map((column) => {
                    const key = `${row.id}:${column.key}`
                    const hasDropdown = Boolean(column.getOptions)
                    const showDropdownToggle = column.showDropdownToggle ?? true
                    const isMultiline = false
                    const isMenuOpen = Boolean(
                      activeMenu &&
                      activeMenu.rowId === row.id &&
                      activeMenu.colKey === column.key,
                    )
                    const value = row[column.key] ?? ""
                    const displayValue = hasDropdown ? (editingCellValues[key] ?? value) : value
                    const isUngroundedCell =
                      column.key === groundedKey && !!ungroundedRowIds?.has(row.id)
                    // When the grounded cell is unverified, show the info icon on the right
                    // side so it doesn't break the left-alignment of the text.
                    const cellPadding = isUngroundedCell
                      ? (hasDropdown ? "pl-3 pr-[56px]" : "pl-3 pr-[32px]")
                      : (hasDropdown ? "pl-3 pr-8" : "px-3")
                    const fieldClass = [
                      "h-[52px] w-full border-0 bg-transparent py-0",
                      cellPadding,
                      "font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#454551]",
                      "focus:bg-tp-blue-50/30 focus:outline-none focus:ring-0",
                      "relative z-20",
                      "rounded-none",
                      isMultiline ? "overflow-hidden whitespace-normal break-words py-[10px] leading-[18px]" : "overflow-hidden text-ellipsis whitespace-nowrap",
                    ].join(" ")

                    return (
                      <td
                        key={column.key}
                        className={`border-r border-tp-slate-100 p-0 align-middle transition-colors ${
                          activeCell?.rowId === row.id && activeCell?.colKey === column.key
                            ? "bg-tp-blue-50/20"
                            : isUngroundedCell
                              ? "bg-[rgba(217,119,6,0.07)]"
                              : ""
                        }`}
                        style={getResponsiveColumnStyle(column)}
                      >
                        <div className="relative h-[52px]">
                          {activeCell?.rowId === row.id && activeCell?.colKey === column.key ? (
                            <span className="pointer-events-none absolute inset-[2px] z-10 rounded-[6px] border border-tp-blue-500 shadow-[0_0_0_2px_rgba(75,74,213,0.16)]" />
                          ) : null}
                          {/* Per-row "needs verification" glyph — only on
                              the grounded cell when this row was filled
                              from voice and the doctor hasn't picked a
                              matching entry from the dropdown yet. Sits
                              on the right edge so it doesn't break text alignment. */}
                          {isUngroundedCell ? (
                            <TPTooltip
                              title={`Auto-filled from voice. Tap and pick a match from the ${title.toLowerCase()} list to verify this row.`}
                              placement="top"
                              arrow
                            >
                              <span
                                className={`pointer-events-auto absolute top-1/2 z-30 -translate-y-1/2 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[rgba(217,119,6,0.14)] text-[#B45309] ${
                                  hasDropdown ? "right-[32px]" : "right-[8px]"
                                }`}
                              >
                                <Info size={12} strokeWidth={2.4} />
                              </span>
                            </TPTooltip>
                          ) : null}
                          {isMultiline ? (
                            <textarea
                              data-rx-cell-input="true"
                              ref={(node) => {
                                inputRefs.current[key] = node
                              }}
                              value={displayValue}
                              title={displayValue || undefined}
                              rows={column.maxLines ?? 2}
                              placeholder={column.placeholder}
                              className={fieldClass}
                              style={{ maxHeight: `${(column.maxLines ?? 2) * 18 + 20}px`, resize: "none" }}
                              onFocus={(event) => {
                                setActiveCell({ rowId: row.id, colKey: column.key })
                                if (hasDropdown) {
                                  beginDropdownEditing(key, value)
                                  ensureCellVisibleInTable(event.currentTarget)
                                  const len = event.currentTarget.value.length
                                  event.currentTarget.setSelectionRange(len, len)
                                }
                                if (isTablet) {
                                  snapFieldToViewportTop(event.currentTarget)
                                }
                                if (hasDropdown) {
                                  openCellMenu(
                                    row,
                                    column,
                                    event.currentTarget.getBoundingClientRect(),
                                    value,
                                    value,
                                    !shouldFilterCellOnOpen(column),
                                  )
                                }
                              }}
                              onClick={(event) => {
                                if (hasDropdown) {
                                  beginDropdownEditing(key, value)
                                  ensureCellVisibleInTable(event.currentTarget)
                                }
                                if (hasDropdown) {
                                  openCellMenu(
                                    row,
                                    column,
                                    event.currentTarget.getBoundingClientRect(),
                                    value,
                                    value,
                                    !shouldFilterCellOnOpen(column),
                                  )
                                }
                              }}
                              onChange={(event) => {
                                const next = event.currentTarget.value
                                if (hasDropdown) {
                                  beginDropdownEditing(key, next)
                                } else {
                                  setCellValue(row.id, column.key, next)
                                }
                                openCellMenu(
                                  row,
                                  column,
                                  event.currentTarget.getBoundingClientRect(),
                                  next,
                                  next,
                                )
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  if (hasDropdown) {
                                    endDropdownEditing(key)
                                  }
                                  setActiveMenu((current) => {
                                    if (!current) return current
                                    if (current.rowId !== row.id || current.colKey !== column.key) return current
                                    return null
                                  })
                                  setActiveCell((current) => {
                                    if (!current) return current
                                    if (current.rowId !== row.id || current.colKey !== column.key) return current
                                    return null
                                  })
                                }, 80)
                              }}
                              onKeyDown={(event) => {
                                const colIndex = colIndexByKey[column.key]
                                const menuOpened =
                                  activeMenu &&
                                  activeMenu.rowId === row.id &&
                                  activeMenu.colKey === column.key &&
                                  optionsForMenu.length > 0

                                if (menuOpened && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                                  event.preventDefault()
                                  const delta = event.key === "ArrowDown" ? 1 : -1
                                  setActiveMenu((current) => {
                                    if (!current) return current
                                    const next = (current.highlightedIndex + delta + optionsForMenu.length) % optionsForMenu.length
                                    return { ...current, highlightedIndex: next }
                                  })
                                  return
                                }

                                if (menuOpened && event.key === "Enter") {
                                  event.preventDefault()
                                  const picked = optionsForMenu[activeMenu.highlightedIndex] ?? optionsForMenu[0]
                                  if (picked) {
                                    const pickedValue = getOptionValue(picked)
                                    setCellValue(row.id, column.key, pickedValue)
                                    if (isCustomOption(picked)) {
                                      registerCustomValue(pickedValue)
                                    } else if (
                                      groundedKey &&
                                      column.key === groundedKey &&
                                      ungroundedRowIds?.has(row.id)
                                    ) {
                                      // DB-backed option — ground row.
                                      onGroundRow?.(row.id)
                                    }
                                    endDropdownEditing(key)
                                  }
                                  closeMenu()
                                  focusNextFromCell(rowIndex, colIndex)
                                  return
                                }

                                if (event.key === "Escape") {
                                  closeMenu()
                                  return
                                }

                                if (event.key === "ArrowUp") {
                                  event.preventDefault()
                                  if (rowIndex <= 0) {
                                    focusPreviousModuleLastCell()
                                  } else {
                                    focusCell(rowIndex - 1, colIndex)
                                  }
                                  return
                                }
                                if (event.key === "ArrowDown") {
                                  event.preventDefault()
                                  if (rowIndex >= rows.length - 1) {
                                    focusOwnSearch()
                                  } else {
                                    focusCell(rowIndex + 1, colIndex)
                                  }
                                  return
                                }
                                if (event.key === "ArrowLeft") {
                                  event.preventDefault()
                                  focusPreviousFromCell(rowIndex, colIndex)
                                  return
                                }
                                if (event.key === "ArrowRight") {
                                  event.preventDefault()
                                  focusNextFromCell(rowIndex, colIndex)
                                  return
                                }
                                if (event.key === "Enter") {
                                  event.preventDefault()
                                  focusNextFromCell(rowIndex, colIndex)
                                }
                              }}
                            />
                          ) : (
                            <input
                              data-rx-cell-input="true"
                              ref={(node) => {
                                inputRefs.current[key] = node
                              }}
                              value={displayValue}
                              title={displayValue || undefined}
                              placeholder={column.placeholder}
                              className={fieldClass}
                              onFocus={(event) => {
                                setActiveCell({ rowId: row.id, colKey: column.key })
                                if (hasDropdown) {
                                  beginDropdownEditing(key, value)
                                  ensureCellVisibleInTable(event.currentTarget)
                                  const len = event.currentTarget.value.length
                                  event.currentTarget.setSelectionRange(len, len)
                                }
                                if (isTablet) {
                                  snapFieldToViewportTop(event.currentTarget)
                                }
                                if (hasDropdown) {
                                  openCellMenu(
                                    row,
                                    column,
                                    event.currentTarget.getBoundingClientRect(),
                                    value,
                                    value,
                                    !shouldFilterCellOnOpen(column),
                                  )
                                }
                              }}
                              onClick={(event) => {
                                if (hasDropdown) {
                                  beginDropdownEditing(key, value)
                                  ensureCellVisibleInTable(event.currentTarget)
                                }
                                if (hasDropdown) {
                                  openCellMenu(
                                    row,
                                    column,
                                    event.currentTarget.getBoundingClientRect(),
                                    value,
                                    value,
                                    !shouldFilterCellOnOpen(column),
                                  )
                                }
                              }}
                              onChange={(event) => {
                                const next = event.currentTarget.value
                                if (hasDropdown) {
                                  beginDropdownEditing(key, next)
                                } else {
                                  setCellValue(row.id, column.key, next)
                                }
                                openCellMenu(
                                  row,
                                  column,
                                  event.currentTarget.getBoundingClientRect(),
                                  next,
                                  next,
                                )
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  if (hasDropdown) {
                                    endDropdownEditing(key)
                                  }
                                  setActiveMenu((current) => {
                                    if (!current) return current
                                    if (current.rowId !== row.id || current.colKey !== column.key) return current
                                    return null
                                  })
                                  setActiveCell((current) => {
                                    if (!current) return current
                                    if (current.rowId !== row.id || current.colKey !== column.key) return current
                                    return null
                                  })
                                }, 80)
                              }}
                              onKeyDown={(event) => {
                                const colIndex = colIndexByKey[column.key]
                                const menuOpened =
                                  activeMenu &&
                                  activeMenu.rowId === row.id &&
                                  activeMenu.colKey === column.key &&
                                  optionsForMenu.length > 0

                                if (menuOpened && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                                  event.preventDefault()
                                  const delta = event.key === "ArrowDown" ? 1 : -1
                                  setActiveMenu((current) => {
                                    if (!current) return current
                                    const next = (current.highlightedIndex + delta + optionsForMenu.length) % optionsForMenu.length
                                    return { ...current, highlightedIndex: next }
                                  })
                                  return
                                }

                                if (menuOpened && event.key === "Enter") {
                                  event.preventDefault()
                                  const picked = optionsForMenu[activeMenu.highlightedIndex] ?? optionsForMenu[0]
                                  if (picked) {
                                    const pickedValue = getOptionValue(picked)
                                    setCellValue(row.id, column.key, pickedValue)
                                    if (isCustomOption(picked)) {
                                      registerCustomValue(pickedValue)
                                    } else if (
                                      groundedKey &&
                                      column.key === groundedKey &&
                                      ungroundedRowIds?.has(row.id)
                                    ) {
                                      // DB-backed option — ground row.
                                      onGroundRow?.(row.id)
                                    }
                                    endDropdownEditing(key)
                                  }
                                  closeMenu()
                                  focusNextFromCell(rowIndex, colIndex)
                                  return
                                }

                                if (event.key === "Escape") {
                                  closeMenu()
                                  return
                                }

                                if (event.key === "ArrowUp") {
                                  event.preventDefault()
                                  if (rowIndex <= 0) {
                                    focusPreviousModuleLastCell()
                                  } else {
                                    focusCell(rowIndex - 1, colIndex)
                                  }
                                  return
                                }
                                if (event.key === "ArrowDown") {
                                  event.preventDefault()
                                  if (rowIndex >= rows.length - 1) {
                                    focusOwnSearch()
                                  } else {
                                    focusCell(rowIndex + 1, colIndex)
                                  }
                                  return
                                }
                                if (event.key === "ArrowLeft") {
                                  event.preventDefault()
                                  focusPreviousFromCell(rowIndex, colIndex)
                                  return
                                }
                                if (event.key === "ArrowRight") {
                                  event.preventDefault()
                                  focusNextFromCell(rowIndex, colIndex)
                                  return
                                }
                                if (event.key === "Enter") {
                                  event.preventDefault()
                                  focusNextFromCell(rowIndex, colIndex)
                                }
                              }}
                            />
                          )}
                          {hasDropdown && showDropdownToggle ? (
                            <TPTooltip title="Use ↑ ↓ to navigate options, press Enter to select" placement="top" arrow>
                              <button
                                type="button"
                                aria-label="Toggle options"
                                className="absolute right-[6px] top-1/2 z-10 inline-flex h-[20px] w-[20px] -translate-y-1/2 items-center justify-center text-tp-slate-500 transition-colors"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  const inputNode = inputRefs.current[key]
                                  if (!inputNode) return
                                  if (isMenuOpen) {
                                    closeMenu()
                                    return
                                  }
                                  inputNode.focus()
                                  openCellMenu(
                                    row,
                                    column,
                                    inputNode.getBoundingClientRect(),
                                    value,
                                    value,
                                    !shouldFilterCellOnOpen(column),
                                  )
                                }}
                              >
                                <ChevronDown
                                  size={14}
                                  strokeWidth={1.5}
                                  className={`transition-transform duration-150 ${isMenuOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                            </TPTooltip>
                          ) : null}
                        </div>
                      </td>
                    )
                  })}

                  <td
                    className={[
                      "relative p-0 text-center align-middle",
                      stickyActionCellClass,
                    ].join(" ")}
                    style={sideColumnStyle}
                  >
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="inline-flex h-[52px] w-full items-center justify-center text-tp-slate-700 hover:bg-tp-slate-100 hover:text-tp-slate-700"
                      aria-label="Delete row"
                    >
                      <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" />
                    </button>
                  </td>
                </tr>
                  )
                })()
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {voiceActive ? (
          <div>
            <VoiceRxModuleRecorder
              sectionLabel={title}
              onCancel={() => onVoiceClose?.()}
              onSubmit={(transcript) => {
                onVoiceClose?.()
                onVoiceSubmit?.(transcript)
              }}
              radiusClassName="rounded-[14px]"
            />
          </div>
        ) : null}
        {voiceProcessingTranscript != null ? (
          <VoiceRxSectionProcessing transcript={voiceProcessingTranscript} sectionLabel={title} />
        ) : null}
        <div className={`relative ${voiceActive || voiceProcessingTranscript != null ? "hidden" : ""}`}>
          <TPRxPadSearchInput
            ref={searchInputRef}
            data-rx-module-search="true"
            value={searchText}
            className={afterSearch ? "pr-[220px]" : undefined}
            onFocus={() => {
              openSearchMenu(searchText)
            }}
            onClick={() => {
              openSearchMenu(searchText)
            }}
            onChange={(event) => {
              const next = event.currentTarget.value
              setSearchText(next)
              openSearchMenu(next)
            }}
            onBlur={() => {
              window.setTimeout(() => {
                setActiveMenu((current) => (current?.mode === "search" ? null : current))
              }, 90)
            }}
            onKeyDown={(event) => {
            const searchMenuOpen = activeMenu?.mode === "search" && optionsForMenu.length > 0

            if (searchMenuOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault()
              const delta = event.key === "ArrowDown" ? 1 : -1
              setActiveMenu((current) => {
                if (!current || current.mode !== "search") return current
                const next = (current.highlightedIndex + delta + optionsForMenu.length) % optionsForMenu.length
                return { ...current, highlightedIndex: next }
              })
              return
            }

            if (searchMenuOpen && event.key === "Enter") {
              event.preventDefault()
              const picked = optionsForMenu[activeMenu.highlightedIndex] ?? optionsForMenu[0]
              const value = picked ? getOptionValue(picked).trim() : searchText.trim()
              if (!value) {
                focusNextModuleFirstCell()
                return
              }
              if (picked && isCustomOption(picked)) {
                registerCustomValue(value)
              }
              const nextRowIndex = rows.length
              addRow(value)
              setSearchText("")
              closeMenu()
              window.requestAnimationFrame(() => {
                focusCell(nextRowIndex, 0)
              })
              return
            }

            if (searchMenuOpen && event.key === "Escape") {
              event.preventDefault()
              closeMenu()
              return
            }

            if (event.key === "Enter") {
              event.preventDefault()
              const value = searchText.trim()
              if (!value) {
                focusNextModuleFirstCell()
                return
              }
              openSearchMenu(value)
              return
            }

            if (event.key === "ArrowDown") {
              event.preventDefault()
              focusNextModuleFirstCell()
              return
            }

            if (event.key === "ArrowUp") {
              event.preventDefault()
              if (rows.length > 0) {
                focusCell(rows.length - 1, Math.max(0, columns.length - 1))
              } else {
                focusPreviousModuleLastCell()
              }
              return
            }

            if (event.key === "ArrowRight") {
              event.preventDefault()
              focusNextModuleSearch()
              return
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault()
              focusPreviousModuleSearch()
            }
            }}
            placeholder={searchPlaceholder}
          />
          {afterSearch ? (
            <div className="pointer-events-none absolute inset-y-0 right-2 z-20 flex items-center">
              <div className="pointer-events-auto flex max-w-[200px] items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {afterSearch}
              </div>
            </div>
          ) : null}
        </div>

        {isTablet ? (
          <div className="flex flex-wrap gap-3">
            {cannedChips.map((chip) => (
              <button
                key={`${id}-${chip}`}
                type="button"
                className="inline-flex h-[36px] items-center rounded-[10px] bg-tp-slate-100 px-3 text-[12px] font-medium text-tp-slate-600 transition-colors hover:bg-tp-slate-200 hover:text-tp-slate-700"
                onClick={() => addRow(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

      </div>

      {activeMenu && menuPosition && optionsForMenu.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[130] flex flex-col overflow-hidden rounded-[10px] border border-tp-slate-100 bg-white shadow-lg"
              style={{
                left: menuPosition.left,
                top: menuPosition.top,
                width: menuPosition.width,
              }}
            >
              {activeMenu.mode === "search" && activeMenu.query.trim().length === 0 ? (
                <div className="flex items-center justify-between border-b border-tp-slate-100 px-2 py-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">
                    Frequently used
                  </span>
                </div>
              ) : null}
              <div className="relative">
                <div
                  ref={menuListRef}
                  className="max-h-[220px] overflow-y-auto space-y-0.5 bg-tp-slate-50/35 p-1 pr-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{
                    msOverflowStyle: "none",
                  }}
                >
                  {regularOptionEntries.length === 0 ? (
                    <div className="flex items-center gap-2 px-[10px] py-[10px] text-[14px] font-medium text-tp-slate-400">
                      <Search size={14} strokeWidth={1.5} className="text-tp-slate-400/90" />
                      <span>No results found</span>
                    </div>
                  ) : null}
                  {regularOptionEntries.map(({ option, index }) => (
                    <button
                      key={`${activeMenu.mode}-${activeMenu.colKey ?? "search"}-${option}`}
                      type="button"
                      data-rx-menu-index={index}
                      className={[
                        "w-full rounded-[8px] px-[10px] py-[7px] text-left text-[14px] font-medium font-['Inter',sans-serif] flex items-center gap-2",
                        index === activeMenu.highlightedIndex
                          ? "bg-tp-slate-100 text-tp-slate-700"
                          : "text-tp-slate-700 hover:bg-tp-slate-100",
                      ].join(" ")}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const value = getOptionValue(option).trim()
                        if (!value) {
                          closeMenu()
                          return
                        }
                        if (activeMenu.mode === "search") {
                          const nextRowIndex = rows.length
                          addRow(value)
                          setSearchText("")
                          closeMenu()
                          window.requestAnimationFrame(() => {
                            focusCell(nextRowIndex, 0)
                          })
                          return
                        }
                        if (activeMenu.rowId && activeMenu.colKey) {
                          setCellValue(activeMenu.rowId, activeMenu.colKey, value)
                          endDropdownEditing(`${activeMenu.rowId}:${activeMenu.colKey}`)
                          // Picking a DB-suggested option for the
                          // grounded column clears the ungrounded flag
                          // — now we know this row maps to a real
                          // formulary entry.
                          if (
                            groundedKey &&
                            activeMenu.colKey === groundedKey &&
                            ungroundedRowIds?.has(activeMenu.rowId)
                          ) {
                            onGroundRow?.(activeMenu.rowId)
                          }
                        }
                        closeMenu()
                      }}
                    >
                      <span className="flex-1 truncate">{getOptionLabel(option)}</span>
                      {activeMenu.mode === "search" && getOptionTag?.(getOptionValue(option))}
                    </button>
                  ))}
                </div>
                {menuIndicator.hasOverflow ? (
                  <>
                    <div className="pointer-events-none absolute bottom-2 right-1 top-2 w-[3px] rounded-full bg-tp-slate-200/90" />
                    <div
                      className="pointer-events-none absolute right-1 w-[3px] rounded-full bg-tp-slate-400/80"
                      style={{
                        top: `${menuIndicator.thumbTop + 8}px`,
                        height: `${menuIndicator.thumbHeight}px`,
                      }}
                    />
                  </>
                ) : null}
              </div>
              {showMenuFooter ? (
                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-tp-slate-100 bg-white px-2 py-1.5 text-[12px] text-tp-slate-500 max-lg:flex-col max-lg:items-stretch">
                  {customOptionEntry ? (
                    <button
                      type="button"
                    className={[
                      "inline-flex items-center gap-2 rounded-[8px] border border-dashed px-[10px] py-[6px] text-[12px] font-semibold font-['Inter',sans-serif] max-lg:order-1 max-lg:w-full",
                      customOptionEntry.index === activeMenu.highlightedIndex
                        ? "border-tp-blue-300 bg-tp-blue-50 text-tp-blue-700"
                        : "border-tp-blue-200 bg-tp-blue-50/60 text-tp-blue-600 hover:bg-tp-blue-50",
                    ].join(" ")}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const value = getOptionValue(customOptionEntry.option).trim()
                        if (!value) {
                          closeMenu()
                          return
                        }
                        registerCustomValue(value)
                        if (activeMenu.mode === "search") {
                          const nextRowIndex = rows.length
                          addRow(value)
                          setSearchText("")
                          closeMenu()
                          window.requestAnimationFrame(() => {
                            focusCell(nextRowIndex, 0)
                          })
                          return
                        }
                        if (activeMenu.rowId && activeMenu.colKey) {
                          setCellValue(activeMenu.rowId, activeMenu.colKey, value)
                          endDropdownEditing(`${activeMenu.rowId}:${activeMenu.colKey}`)
                        }
                        closeMenu()
                      }}
                    >
                      <Plus size={14} strokeWidth={1.5} />
                      <span className="max-w-[220px] truncate max-lg:max-w-full">
                        {`Add custom: "${getOptionValue(customOptionEntry.option)}"`}
                      </span>
                    </button>
                  ) : <span />}
                  {activeMenu.mode === "search" ? (
                    <div className="flex items-center gap-3 max-lg:order-2 max-lg:flex-wrap">
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
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

    </TPRxPadSection>
    </div>
  )
}

/* ── Custom module table — uses the same EditableTableModule shell as
   the built-in Symptoms/Examinations sections so a doctor sees one
   consistent table grammar across the Rx pad. Rows are persisted per
   patient + module in localStorage. */

function loadCustomRows(patientId: string, moduleId: string): TableRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(`tp.custom-module-rows:${patientId}:${moduleId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((r): r is TableRow => !!r && typeof r === "object" && typeof r.id === "string")
      .map((r) => ({ ...r }))
  } catch {
    return []
  }
}

function saveCustomRows(patientId: string, moduleId: string, rows: TableRow[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      `tp.custom-module-rows:${patientId}:${moduleId}`,
      JSON.stringify(rows),
    )
  } catch {
    /* quota — drop silently */
  }
}

function CustomModuleTable({
  patientId,
  moduleDef,
}: {
  patientId: string
  moduleDef: CustomModule
}) {
  // Build columns from the module's fields. All custom fields are
  // single-line text in v1.
  const columns: ColumnConfig[] = useMemo(
    () =>
      moduleDef.fields.map((f) => ({
        key: f.id,
        label: f.label.toUpperCase(),
        width: 240,
        minWidth: 160,
        maxWidth: 320,
        placeholder: `Add ${f.label.toLowerCase()}`,
      })),
    [moduleDef.fields],
  )

  const primaryKey = moduleDef.fields[0]?.id ?? "id"

  const [rows, setRows] = useState<TableRow[]>(() => loadCustomRows(patientId, moduleDef.id))

  // Re-seed rows when the patient or the module schema changes.
  useEffect(() => {
    setRows(loadCustomRows(patientId, moduleDef.id))
  }, [patientId, moduleDef.id])

  // Persist on change.
  useEffect(() => {
    saveCustomRows(patientId, moduleDef.id, rows)
  }, [patientId, moduleDef.id, rows])

  // Flip hasBeenUsed once the doctor types anything into any cell. Same
  // permission gate the customise sheet's Edit / Delete menu reads.
  const usedRef = useRef(moduleDef.hasBeenUsed)
  useEffect(() => {
    if (usedRef.current) return
    if (!rows.some(rowHasValues)) return
    usedRef.current = true
    markModuleUsed(moduleDef.id)
  }, [rows, moduleDef.id])

  // Suggestions list — pull every previously committed value of the
  // primary column across all rows so search-add can complete.
  const searchSuggestions = useMemo(() => {
    const seen = new Set<string>()
    for (const row of rows) {
      const v = (row[primaryKey] as string | undefined)?.trim()
      if (v) seen.add(v)
    }
    return Array.from(seen)
  }, [rows, primaryKey])

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
    />
  )
}

/* ── Medication allergy/interaction check helper ── */

/** Known drug-allergy keyword pairs: allergy keyword → matching drug substrings */
const DRUG_ALLERGY_MAP: Record<string, string[]> = {
  ibuprofen: ["ibuprofen", "brufen", "advil"],
  "sulfa drugs": ["sulfamethoxazole", "trimethoprim", "bactrim", "cotrimoxazole", "sulfa"],
  sulfa: ["sulfamethoxazole", "trimethoprim", "bactrim", "cotrimoxazole", "sulfa"],
  aspirin: ["aspirin", "disprin", "ecosprin"],
  penicillin: ["amoxicillin", "ampicillin", "penicillin", "augmentin"],
}

interface MedicationAlert {
  rowId: string
  medName: string
  allergen: string
}

function checkMedicationAlerts(
  medRows: TableRow[],
  allergies: string[],
): MedicationAlert[] {
  if (allergies.length === 0) return []
  const alerts: MedicationAlert[] = []
  const normalizedAllergies = allergies.map((a) => a.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase())

  for (const row of medRows) {
    const medName = (row.medicine ?? "").trim().toLowerCase()
    if (!medName) continue

    for (let ai = 0; ai < normalizedAllergies.length; ai++) {
      const allergy = normalizedAllergies[ai]
      // Direct name match
      if (medName.includes(allergy) || allergy.includes(medName.split(" ")[0])) {
        alerts.push({ rowId: row.id, medName: row.medicine ?? "", allergen: allergies[ai] })
        break
      }
      // Drug-allergy map match
      const mappedDrugs = DRUG_ALLERGY_MAP[allergy]
      if (mappedDrugs?.some((drug) => medName.includes(drug))) {
        alerts.push({ rowId: row.id, medName: row.medicine ?? "", allergen: allergies[ai] })
        break
      }
    }
  }
  return alerts
}

function tokenizeKeywords(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
}

function bestMatchPercent(option: string, candidates: string[]): number {
  const optionTokens = tokenizeKeywords(option)
  if (optionTokens.length === 0 || candidates.length === 0) return 0

  let best = 0
  for (const candidate of candidates) {
    const candidateTokens = tokenizeKeywords(candidate)
    if (candidateTokens.length === 0) continue
    const overlap = candidateTokens.filter((token) => optionTokens.includes(token)).length
    const score = Math.round((overlap / candidateTokens.length) * 100)
    if (score > best) best = score
  }
  return best
}

function hasFilledPrimaryValue(rows: TableRow[], primaryKey: string): boolean {
  return rows.some((row) => (row[primaryKey] ?? "").trim().length > 0)
}

export function RxPadFunctional({ patientId = "__patient__", sectionConfig }: { patientId?: string; sectionConfig?: RxSectionItem[] }) {
  const { lastCopyRequest, publishSignal, patientAllergies, pushHistoricalUpdates, copyAllAuraActive } = useRxPadSync()
  const copyAllAuraActiveRef = useRef(copyAllAuraActive)
  useEffect(() => { copyAllAuraActiveRef.current = copyAllAuraActive }, [copyAllAuraActive])
  const { isV0Mode } = useV0Mode()

  // Per-module voice dictation — tracks which module currently owns the
  // inline recorder (only one active at a time). Clicking a module's mic
  // icon sets its id here; clicking again (or cancel/submit) clears it.
  // Full transcript-to-rows shaping arrives in the next phase; today's
  // cancel/submit both collapse the inline recorder back to the search row.
  const [voiceModuleId, setVoiceModuleId] = useState<string | null>(null)

  // Grounding — row IDs whose primary "name" cell was filled by a copy
  // payload but hasn't been confirmed against the drug / lab DB yet.
  // Shared across modules (IDs are unique). Cleared per-row when the
  // doctor selects an option from the dropdown for that cell.
  const [ungroundedRowIds, setUngroundedRowIds] = useState<Set<string>>(() => new Set())
  const groundRow = useCallback((rowId: string) => {
    setUngroundedRowIds((prev) => {
      if (!prev.has(rowId)) return prev
      const next = new Set(prev)
      next.delete(rowId)
      return next
    })
  }, [])
  const handleVoiceToggle = useCallback((moduleId: string) => {
    setVoiceModuleId((current) => {
      // If this module is already active, do nothing — the user must
      // use the recorder's Cancel CTA (which triggers a confirmation
      // popup). This prevents accidental stop on re-click.
      if (current === moduleId) return current
      // If a different module is active, block — only one at a time.
      if (current != null) return current
      return moduleId
    })
  }, [])

  // Post-submit processing state — while the "AI is structuring" overlay
  // is visible the recorder is gone and the rows are not yet filled.
  const [voiceModuleProcessing, setVoiceModuleProcessing] = useState<{
    moduleId: string
    transcript: string
  } | null>(null)
  const [voiceAddedCounts, setVoiceAddedCounts] = useState<Record<string, number>>({})

  const handleVoiceSubmit = useCallback((moduleId: string, _transcript: string) => {
    // Module-specific mock transcripts — shown in the shiner processing
    // card while the "AI is structuring" overlay is visible. These match
    // the mock data that will be filled into each module.
    const MOCK_TRANSCRIPTS: Record<string, string> = {
      symptoms: "The patient presents with a moderate headache for the past three days, along with mild nausea for two days and a tightness sensation around the temples.",
      examinations: "Blood pressure is 140 by 90 mmHg, slightly elevated. Neurological examination is normal. ENT examination is also normal.",
      diagnosis: "Tension-type headache, confirmed, present for three days. Stage 1 hypertension, suspected, newly detected today.",
      medication: "I'm prescribing Paracetamol 500 mg to be taken as needed after food for five days, and Telmisartan 40 mg once daily after dinner for thirty days.",
      advice: "Avoid prolonged screen time. Maintain good posture while working at the desk. Follow up in one week if the symptoms persist.",
      lab: "Order a complete blood count, renal function test including KFT, and serum electrolytes to evaluate overall metabolic health.",
      surgery: "Schedule a fundoscopy examination to assess retinal health given the hypertension finding.",
      additionalNotes: "Patient is anxious about the elevated blood pressure reading. Explained that a single reading is not diagnostic. Reassured and advised home monitoring.",
      followUp: "Follow up in one week to recheck blood pressure and review lab results. If headache persists, consider referral to neurology.",
    }
    const mockTranscript = MOCK_TRANSCRIPTS[moduleId] ?? _transcript
    setVoiceModuleProcessing({ moduleId, transcript: mockTranscript })
    window.setTimeout(() => {
      // Module-specific mock data — always filled regardless of what
      // the user actually dictated (demo / POC behaviour).
      const MODULE_LABEL: Record<string, string> = {
        symptoms: "Symptoms",
        examinations: "Examination",
        diagnosis: "Diagnosis",
        medication: "Medications",
        advice: "Advice",
        lab: "Lab Investigations",
        surgery: "Procedures",
        additionalNotes: "Additional Notes",
        followUp: "Follow-up",
      }

      switch (moduleId) {
        case "symptoms":
          setSymptomRows((prev) => [
            ...prev,
            { id: getRowId("symptoms"), name: "Headache", since: "3 days", status: "Moderate", note: "" },
            { id: getRowId("symptoms"), name: "Mild nausea", since: "2 days", status: "Mild", note: "" },
            { id: getRowId("symptoms"), name: "Tightness around temples", since: "3 days", status: "Moderate", note: "" },
          ])
          break
        case "examinations":
          setExaminationRows((prev) => [
            ...prev,
            { id: getRowId("exam"), name: "Blood pressure — 140/90 mmHg", note: "Slightly elevated" },
            { id: getRowId("exam"), name: "Neurological examination — Normal", note: "" },
            { id: getRowId("exam"), name: "ENT examination — Normal", note: "" },
          ])
          break
        case "diagnosis":
          setDiagnosisRows((prev) => [
            ...prev,
            { id: getRowId("diagnosis"), name: "Tension-type headache", since: "3 days", status: "Confirmed", note: "" },
            { id: getRowId("diagnosis"), name: "Stage 1 Hypertension", since: "1 day", status: "Suspected", note: "New finding" },
          ])
          break
        case "medication": {
          const newMedRows = [
            { id: getRowId("med"), medicine: "Paracetamol 500mg", unitPerDose: "1", frequency: "SOS", when: "After food", duration: "5 days", note: "" },
            { id: getRowId("med"), medicine: "Telmisartan 40mg", unitPerDose: "1", frequency: "0-0-1", when: "After dinner", duration: "30 days", note: "" },
          ]
          setMedicationRows((prev) => [...prev, ...newMedRows])
          setUngroundedRowIds((prev) => {
            const next = new Set(prev)
            for (const r of newMedRows) next.add(r.id)
            return next
          })
          break
        }
        case "advice":
          setAdviceRows((prev) => [
            ...prev,
            { id: getRowId("advice"), advice: "Avoid prolonged screen time", note: "" },
            { id: getRowId("advice"), advice: "Maintain good posture while working", note: "" },
            { id: getRowId("advice"), advice: "Follow-up in 1 week if symptoms persist", note: "" },
          ])
          break
        case "lab": {
          const newLabRows = [
            { id: getRowId("lab"), investigation: "Complete Blood Count (CBC)", note: "" },
            { id: getRowId("lab"), investigation: "Renal Function Test (KFT)", note: "" },
            { id: getRowId("lab"), investigation: "Serum Electrolytes", note: "" },
          ]
          setLabRows((prev) => [...prev, ...newLabRows])
          setUngroundedRowIds((prev) => {
            const next = new Set(prev)
            for (const r of newLabRows) next.add(r.id)
            return next
          })
          break
        }
        case "surgery":
          setSurgeryRows((prev) => [
            ...prev,
            { id: getRowId("surgery"), name: "Fundoscopy", note: "" },
          ])
          break
        case "additionalNotes":
          setAdditionalNotes((prev) => prev ? `${prev}\n${mockTranscript}` : mockTranscript)
          break
        case "followUp":
          setFollowUpNotes((prev) => prev ? `${prev}\n${mockTranscript}` : mockTranscript)
          break
      }

      setVoiceModuleProcessing(null)

      // Show toast instead of the inline badge
      const label = MODULE_LABEL[moduleId] ?? moduleId
      setToastMessage(`${label} filled from voice dictation`)

      // Pulse the filled module and snap-scroll to it.
      window.requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>(`[data-rxpad-module="${moduleId}"]`).forEach((el) => {
          el.classList.add("tp-module-just-filled")
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          window.setTimeout(() => el.classList.remove("tp-module-just-filled"), 2000)
        })
      })
    }, 3400)
  }, [])

  // When a module recorder is active we flip the global voice-lock marker
  // on <body>. The existing voice-lock CSS (defined in VoiceRxFlow) freezes
  // every other interactive surface on the page — other Rx modules, search
  // boxes, the "Start Consultation" button in the Dr. Agent panel, the
  // sidebar — and only elements carrying `data-voice-allow` (our recorder
  // card + the module header's mic toggle) stay clickable. This keeps the
  // flow sequential: one dictation at a time.
  useEffect(() => {
    if (typeof document === "undefined") return
    const body = document.body
    if (voiceModuleId) {
      body.setAttribute("data-voice-lock", "on")
      body.setAttribute("data-voice-module-lock", voiceModuleId)
      return () => {
        body.removeAttribute("data-voice-lock")
        body.removeAttribute("data-voice-module-lock")
      }
    }
    return undefined
  }, [voiceModuleId])
  const lastHandledCopyId = useRef<number>(0)
  const symptomInitRef = useRef(false)
  const medInitRef = useRef(false)
  const dxInitRef = useRef(false)
  const symptomCountRef = useRef(0)
  const medCountRef = useRef(0)
  const dxCountRef = useRef(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Per-patient initial data — first-time entry starts with EMPTY rows so
  // the clinician sees only the catalog suggestions, not a pre-filled table.
  // The seed arrays in PER_PATIENT_RXPAD_DATA stay on the module so other
  // call paths (demos, tests) can still opt into them, but the UI no longer
  // renders them by default. ddxSuggestions (used as AI chip tags inside
  // the search dropdown) are still sourced from the patient record.
  const patientData = PER_PATIENT_RXPAD_DATA[patientId] ?? PER_PATIENT_RXPAD_DATA["__patient__"]
  const ddxSuggestions = patientData.ddxSuggestions

  const [symptomRows, setSymptomRows] = useState<TableRow[]>(() => [])
  const [examinationRows, setExaminationRows] = useState<TableRow[]>(() => [])
  const [diagnosisRows, setDiagnosisRows] = useState<TableRow[]>(() => [])
  const [medicationRows, setMedicationRows] = useState<TableRow[]>(() => [])
  const [adviceRows, setAdviceRows] = useState<TableRow[]>(() => [])
  const [labRows, setLabRows] = useState<TableRow[]>(() => [])
  const [surgeryRows, setSurgeryRows] = useState<TableRow[]>(() => [])

  const [additionalNotes, setAdditionalNotes] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [followUpNotes, setFollowUpNotes] = useState("")

  useEffect(() => {
    if (!symptomInitRef.current) {
      symptomInitRef.current = true
      symptomCountRef.current = symptomRows.length
      return
    }

    const currentCount = symptomRows.length
    const previousCount = symptomCountRef.current
    symptomCountRef.current = currentCount
    if (currentCount <= previousCount) return

    const latest = symptomRows[currentCount - 1]?.name?.trim()
    publishSignal({
      type: "symptoms_changed",
      label: latest || "Symptoms updated",
      count: currentCount,
    })
  }, [symptomRows, publishSignal])

  useEffect(() => {
    if (!medInitRef.current) {
      medInitRef.current = true
      medCountRef.current = medicationRows.length
      return
    }

    const currentCount = medicationRows.length
    const previousCount = medCountRef.current
    medCountRef.current = currentCount
    if (currentCount <= previousCount) return

    const latest = medicationRows[currentCount - 1]?.medicine?.trim()
    publishSignal({
      type: "medications_changed",
      label: latest || "Medication updated",
      count: currentCount,
    })
  }, [medicationRows, publishSignal])

  useEffect(() => {
    if (!dxInitRef.current) {
      dxInitRef.current = true
      dxCountRef.current = diagnosisRows.length
      return
    }

    const currentCount = diagnosisRows.length
    const previousCount = dxCountRef.current
    dxCountRef.current = currentCount
    if (currentCount <= previousCount) return

    const latest = diagnosisRows[currentCount - 1]?.name?.trim()
    publishSignal({
      type: "diagnosis_changed",
      label: latest || "Diagnosis updated",
      count: currentCount,
    })
  }, [diagnosisRows, publishSignal])

  /* Medication allergy alerts — recomputed when meds or allergies change */
  const medicationAlerts = useMemo(
    () => checkMedicationAlerts(medicationRows, patientAllergies),
    [medicationRows, patientAllergies],
  )

  /* Drug-drug interaction check for medication table */
  const tableInteractions = useMemo(
    () => checkTableInteractions(medicationRows as { id: string; medicine?: string }[]),
    [medicationRows],
  )
  const interactionRowIds = useMemo(
    () => new Set(tableInteractions.map((t) => t.rowId)),
    [tableInteractions],
  )
  const hasFilledSymptoms = useMemo(
    () => hasFilledPrimaryValue(symptomRows, "name"),
    [symptomRows],
  )
  const hasFilledDiagnosis = useMemo(
    () => hasFilledPrimaryValue(diagnosisRows, "name"),
    [diagnosisRows],
  )
  const hasFilledMedication = useMemo(
    () => hasFilledPrimaryValue(medicationRows, "medicine"),
    [medicationRows],
  )
  const hasFilledAdvice = useMemo(
    () => hasFilledPrimaryValue(adviceRows, "advice"),
    [adviceRows],
  )

  /* Existing med names for search dropdown interaction check */
  const existingMedNames = useMemo(
    () => medicationRows.map((r) => (r.medicine ?? "").trim()).filter(Boolean),
    [medicationRows],
  )

  useEffect(() => {
    if (!lastCopyRequest || lastHandledCopyId.current === lastCopyRequest.id) return
    lastHandledCopyId.current = lastCopyRequest.id
    const payload = lastCopyRequest.payload

    const sourceLabel = payload.sourceDateLabel ?? "Dr. Agent"
    const symptomsList = payload.symptoms ?? []
    if (symptomsList.length) {
      setSymptomRows((prev) => [
        ...prev,
        ...symptomsList.map((item) => ({
          id: getRowId("symptoms"),
          name: item,
          since: "1 day",
          status: "Moderate",
          note: `From ${sourceLabel}`,
        })),
      ])
    }
    const examinationsList = payload.examinations ?? []
    if (examinationsList.length) {
      setExaminationRows((prev) => [
        ...prev,
        ...examinationsList.map((item) => ({
          id: getRowId("exam"),
          name: item,
          note: `From ${sourceLabel}`,
        })),
      ])
    }
    const diagnosesList = payload.diagnoses ?? []
    if (diagnosesList.length) {
      setDiagnosisRows((prev) => [
        ...prev,
        ...diagnosesList.map((item) => ({
          id: getRowId("diagnosis"),
          name: item,
          since: "1 day",
          status: "Suspected",
          note: `From ${sourceLabel}`,
        })),
      ])
    }
    const medicationsList = payload.medications ?? []
    if (medicationsList.length) {
      const newMedRows = medicationsList.map((item) => ({
        id: getRowId("med"),
        medicine: item.medicine,
        unitPerDose: item.unitPerDose,
        frequency: item.frequency,
        when: item.when,
        duration: item.duration,
        note: item.note || `From ${sourceLabel}`,
      }))
      setMedicationRows((prev) => [...prev, ...newMedRows])
      // Mark each new medicine row as ungrounded — the doctor needs
      // to pick a DB-backed option from the dropdown to confirm the
      // exact formulary entry before this row is treated as canonical.
      setUngroundedRowIds((prev) => {
        const next = new Set(prev)
        for (const r of newMedRows) next.add(r.id)
        return next
      })
    }
    const labInvestigationsList = payload.labInvestigations ?? []
    if (labInvestigationsList.length) {
      const newLabRows = labInvestigationsList.map((item) => ({
        id: getRowId("lab"),
        investigation: item,
        note: `From ${sourceLabel}`,
      }))
      setLabRows((prev) => [...prev, ...newLabRows])
      setUngroundedRowIds((prev) => {
        const next = new Set(prev)
        for (const r of newLabRows) next.add(r.id)
        return next
      })
    }
    if (payload.advice) {
      setAdviceRows((prev) => [
        ...prev,
        {
          id: getRowId("advice"),
          advice: payload.advice ?? "",
          note: `From ${sourceLabel}`,
        },
      ])
    }
    if (payload.followUpDate) {
      setFollowUpDate(payload.followUpDate)
    }
    if (payload.followUpNotes) {
      setFollowUpNotes(payload.followUpNotes)
    } else if (payload.targetSection === "followUp" && payload.additionalNotes) {
      setFollowUpNotes(payload.additionalNotes)
    } else if (payload.followUp) {
      setFollowUpNotes(payload.followUp)
    }
    if (payload.additionalNotes) {
      setAdditionalNotes(payload.additionalNotes)
    }

    const histBatch = buildHistoricalUpdatesFromPayload(payload)
    const histBatchKeys = Object.keys(histBatch) as NavItemId[]
    if (histBatchKeys.length) {
      const copyId = lastCopyRequest.id
      const enriched: HistoricalUpdateBatch = {}
      for (const key of histBatchKeys) {
        const arr = histBatch[key]
        if (!arr) continue
        enriched[key] = arr.map((c) => ({
          ...c,
          sourceCopyId: copyId,
          undoPayload: payload,
        }))
      }
      pushHistoricalUpdates(enriched)

      // Per-section copy (NOT a bulk Copy-all): pop the corresponding
      // sidebar tab open so the doctor lands on the section that just
      // received new content. Bobble + red dot get ~700ms to play
      // before the focus signal acknowledges and clears them.
      if (!copyAllAuraActiveRef.current && histBatchKeys.length === 1) {
        const targetNav = histBatchKeys[0]
        window.setTimeout(() => {
          publishSignal({ type: "section_focus", sectionId: targetNav })
        }, 700)
      }
    }

    // Brief AI-gradient pulse on each filled section — gives the
    // doctor a clear "this just got new data" visual confirmation
    // alongside the toast. Selectors map payload fields to the
    // RxPadFunctional module-data attributes used in the DOM tree.
    const filledModules: string[] = []
    if (payload.symptoms?.length) filledModules.push("symptoms")
    if (payload.examinations?.length) filledModules.push("examinations")
    if (payload.diagnoses?.length) filledModules.push("diagnosis")
    if (payload.medications?.length) filledModules.push("medication")
    if (payload.advice) filledModules.push("advice")
    if (payload.labInvestigations?.length) filledModules.push("lab")
    if (payload.followUp || payload.followUpDate) filledModules.push("followUp")
    if (typeof window !== "undefined" && filledModules.length) {
      // When a "Copy all to RxPad" is firing the edge aura is doing
      // the work — skip the per-module pulses so the doctor sees one
      // single coordinated signal, not every section flashing at
      // once. Single-section / single-item copies still get the ring.
      const isBulkAura = copyAllAuraActiveRef.current
      if (!isBulkAura) {
        const flashed: HTMLElement[] = []
        filledModules.forEach((key) => {
          document.querySelectorAll<HTMLElement>(`[data-rxpad-module="${key}"]`).forEach((el) => {
            el.classList.add("tp-module-just-filled")
            flashed.push(el)
          })
        })
        // Snap-scroll to the FIRST affected module so the doctor's eye
        // lands on the new data without searching for it.
        const firstTarget = flashed[0]
        if (firstTarget) {
          firstTarget.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        window.setTimeout(() => {
          flashed.forEach((el) => el.classList.remove("tp-module-just-filled"))
        }, 2000)
      }
    }

    setToastMessage(`Filled in your Rx from ${payload.sourceDateLabel}`)
  }, [lastCopyRequest, pushHistoricalUpdates, publishSignal])

  // ── Consume pending copies from sessionStorage (homepage → RxPad navigation) ──
  const pendingCopyConsumedRef = useRef(false)
  useEffect(() => {
    if (pendingCopyConsumedRef.current) return
    pendingCopyConsumedRef.current = true
    try {
      const raw = sessionStorage.getItem("pendingRxPadCopy")
      if (!raw) return
      sessionStorage.removeItem("pendingRxPadCopy")
      const payloads = JSON.parse(raw) as Array<Record<string, unknown>>
      for (const p of payloads) {
        if (p.symptoms && Array.isArray(p.symptoms)) {
          setSymptomRows((prev) => [...prev, ...(p.symptoms as string[]).map((s) => ({ id: getRowId("symptoms"), name: s, since: "1 day", status: "Moderate", note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))])
        }
        if (p.examinations && Array.isArray(p.examinations)) {
          setExaminationRows((prev) => [...prev, ...(p.examinations as string[]).map((s) => ({ id: getRowId("exam"), name: s, note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))])
        }
        if (p.diagnoses && Array.isArray(p.diagnoses)) {
          setDiagnosisRows((prev) => [...prev, ...(p.diagnoses as string[]).map((s) => ({ id: getRowId("diagnosis"), name: s, since: "1 day", status: "Suspected", note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))])
        }
        if (p.labInvestigations && Array.isArray(p.labInvestigations)) {
          setLabRows((prev) => [...prev, ...(p.labInvestigations as string[]).map((s) => ({ id: getRowId("lab"), investigation: s, note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))])
        }
        const label = typeof p.sourceDateLabel === "string" ? p.sourceDateLabel : "Dr. Agent"
        const pendingHist: RxPadCopyPayload = {
          sourceDateLabel: label,
          symptoms: Array.isArray(p.symptoms) ? (p.symptoms as string[]) : undefined,
          examinations: Array.isArray(p.examinations) ? (p.examinations as string[]) : undefined,
          diagnoses: Array.isArray(p.diagnoses) ? (p.diagnoses as string[]) : undefined,
          labInvestigations: Array.isArray(p.labInvestigations) ? (p.labInvestigations as string[]) : undefined,
        }
        const histFromPending = buildHistoricalUpdatesFromPayload(pendingHist)
        if (Object.keys(histFromPending).length) {
          pushHistoricalUpdates(histFromPending)
        }
      }
      if (payloads.length > 0) {
        setToastMessage("Pre-populated from Dr. Agent")
      }
    } catch { /* ignore parse errors */ }
  }, [pushHistoricalUpdates])

  function setFollowUpByOffset(days: number) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    const iso = date.toISOString().slice(0, 10)
    setFollowUpDate(iso)
  }

  const symptomsColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "name",
        label: "SYMPTOMS NAME",
        width: 275,
        minWidth: 220,
        maxWidth: 320,
        placeholder: "e.g. Fever",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(symptomSuggestions, query),
      },
      {
        key: "since",
        label: "SINCE",
        width: 130,
        minWidth: 120,
        maxWidth: 140,
        placeholder: "e.g. 2 days",
        getOptions: (query, row) => getSinceOptions(getSeedQuery(query, row.since ?? "")),
        restrictToOptions: true,
      },
      {
        key: "status",
        label: "STATUS",
        width: 150,
        minWidth: 135,
        maxWidth: 170,
        placeholder: "e.g. Moderate",
        getOptions: (query) => filterByQuery(["Severe", "Moderate", "Mild"], query),
        restrictToOptions: true,
      },
      { key: "note", label: "NOTE", width: 180, minWidth: 140, maxWidth: 220, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  const examinationsColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "name",
        label: "EXAMINATION NAME",
        width: 300,
        minWidth: 240,
        maxWidth: 360,
        placeholder: "e.g. Left knee tenderness",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(examinationSuggestions, query),
      },
      { key: "note", label: "NOTE", width: 180, minWidth: 140, maxWidth: 220, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  const diagnosisColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "name",
        label: "DIAGNOSIS NAME",
        width: 300,
        minWidth: 240,
        maxWidth: 360,
        placeholder: "e.g. Viral pharyngitis",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(diagnosisSuggestions, query),
      },
      {
        key: "since",
        label: "SINCE",
        width: 130,
        minWidth: 120,
        maxWidth: 140,
        placeholder: "e.g. 2 days",
        getOptions: (query, row) => getSinceOptions(getSeedQuery(query, row.since ?? "")),
        restrictToOptions: true,
      },
      {
        key: "status",
        label: "STATUS",
        width: 150,
        minWidth: 135,
        maxWidth: 170,
        placeholder: "e.g. Suspected",
        getOptions: (query) => filterByQuery(["Suspected", "Ruled Out", "Confirmed"], query),
        restrictToOptions: true,
      },
      { key: "note", label: "NOTE", width: 180, minWidth: 140, maxWidth: 220, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  const medicationColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "medicine",
        label: "MEDICINE NAME",
        width: 240,
        minWidth: 200,
        maxWidth: 300,
        multiline: true,
        maxLines: 2,
        placeholder: "e.g. Paracetamol 650mg",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(medicationSuggestions, query),
      },
      {
        key: "unitPerDose",
        label: "UNIT PER DOSE",
        width: 140,
        minWidth: 120,
        maxWidth: 160,
        placeholder: "e.g. 1 tablet",
        getOptions: (query) => getMedicationUnitOptions(query),
        restrictToOptions: true,
      },
      {
        key: "frequency",
        label: "FREQUENCY",
        width: 150,
        minWidth: 130,
        maxWidth: 170,
        placeholder: "e.g. 1-0-1",
        getOptions: (query) => getFrequencyOptions(query),
        restrictToOptions: true,
      },
      {
        key: "when",
        label: "WHEN",
        width: 150,
        minWidth: 120,
        maxWidth: 180,
        placeholder: "e.g. After Food",
        getOptions: (query) => filterByQuery(MEDICATION_WHEN_OPTIONS, query),
        restrictToOptions: true,
      },
      {
        key: "duration",
        label: "DURATION",
        width: 150,
        minWidth: 130,
        maxWidth: 190,
        placeholder: "e.g. 5 days",
        getOptions: (query, row) => getDurationOptions(getSeedQuery(query, row.duration ?? "")),
      },
      { key: "note", label: "NOTE", width: 190, minWidth: 150, maxWidth: 240, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  const adviceColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "advice",
        label: "ADVICE NAME",
        width: 420,
        minWidth: 320,
        maxWidth: 560,
        multiline: true,
        maxLines: 3,
        placeholder: "e.g. Drink warm water",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(ADVICE_SUGGESTIONS, query),
      },
      { key: "note", label: "NOTE", width: 220, minWidth: 160, maxWidth: 260, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  const labColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "investigation",
        label: "INVESTIGATION NAME",
        width: 420,
        minWidth: 320,
        maxWidth: 560,
        multiline: true,
        maxLines: 2,
        placeholder: "e.g. Complete blood count",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(LAB_INVESTIGATION_BASE_OPTIONS, query),
      },
      { key: "note", label: "NOTE", width: 220, minWidth: 160, maxWidth: 260, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  const surgeryColumns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "surgery",
        label: "SURGERY NAME",
        width: 420,
        minWidth: 320,
        maxWidth: 560,
        multiline: true,
        maxLines: 2,
        placeholder: "e.g. Laparoscopic appendectomy",
        showDropdownToggle: false,
        getOptions: (query) => getCatalogOptions(SURGERY_SUGGESTIONS, query),
      },
      { key: "note", label: "NOTE", width: 220, minWidth: 160, maxWidth: 260, multiline: true, maxLines: 2, placeholder: "Notes" },
    ],
    [],
  )

  // Layout config — prefer the global customise store, fall back to the
  // prop (for backwards-compat with any caller still passing it directly)
  // and finally the static default.
  const rxConfigFromStore = useRxSectionConfig()
  const customModules = useCustomModules()
  const { openDrawer: openCustomModulesDrawer } = useCustomModulesDrawer()
  const liveConfig = sectionConfig ?? (rxConfigFromStore.length ? rxConfigFromStore : DEFAULT_SECTION_CONFIG)
  const activeSections = liveConfig.filter((s) => s.enabled)

  function renderSection(id: string) {
    if (typeof id === "string" && id.startsWith("custom:")) {
      const moduleId = id.slice("custom:".length)
      const moduleDef = customModules.find((m) => m.id === moduleId)
      if (!moduleDef) return null
      return (
        <CustomModuleTable
          key={id}
          patientId={patientId}
          moduleDef={moduleDef}
        />
      )
    }
    switch (id as RxSectionId) {
      case "symptoms":
        return (
          <EditableTableModule
            key="symptoms"
            id="symptoms"
            moduleDataAttr="symptoms"
            title="Symptoms"
            templateModuleId="symptoms"
            templateModuleName="Symptoms"
            icon={<TPMedicalIcon name="Virus" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={symptomsColumns}
            primaryKey="name"
            rows={symptomRows}
            onChangeRows={setSymptomRows}
            onVoiceClick={() => handleVoiceToggle("symptoms")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "symptoms"}
            onVoiceSubmit={(t) => handleVoiceSubmit("symptoms", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "symptoms" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["symptoms"]}
            searchPlaceholder="Search & Add Symptoms"
            searchSuggestions={symptomSuggestions}
            cannedChips={symptomSuggestions.slice(0, 12)}
            afterSearch={
              !isV0Mode && hasFilledSymptoms ? (
                <AiTriggerChip
                  label="Suggest DDX"
                  signalLabel="Generate differential diagnosis based on current symptoms"
                  sectionId="symptoms"
                  onAfterClick={() => {
                    setTimeout(() => {
                      document.querySelector('[data-rxpad-module="diagnosis"]')?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }, 100)
                  }}
                />
              ) : null
            }
          />
        )
      case "examinations":
        return (
          <EditableTableModule
            key="examinations"
            id="examinations"
            moduleDataAttr="examinations"
            title="Examinations"
            templateModuleId="examinations"
            templateModuleName="Examinations"
            icon={<TPMedicalIcon name="medical service" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={examinationsColumns}
            primaryKey="name"
            rows={examinationRows}
            onChangeRows={setExaminationRows}
            onVoiceClick={() => handleVoiceToggle("examinations")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "examinations"}
            onVoiceSubmit={(t) => handleVoiceSubmit("examinations", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "examinations" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["examinations"]}
            searchPlaceholder="Search & Add Examinations"
            searchSuggestions={examinationSuggestions}
            cannedChips={examinationSuggestions.slice(0, 12)}
          />
        )
      case "diagnosis":
        return (
          <EditableTableModule
            key="diagnosis"
            id="diagnosis"
            title="Diagnosis"
            templateModuleId="diagnosis"
            templateModuleName="Diagnosis"
            icon={<TPMedicalIcon name="Diagnosis" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={diagnosisColumns}
            primaryKey="name"
            rows={diagnosisRows}
            onChangeRows={setDiagnosisRows}
            onVoiceClick={() => handleVoiceToggle("diagnosis")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "diagnosis"}
            onVoiceSubmit={(t) => handleVoiceSubmit("diagnosis", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "diagnosis" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["diagnosis"]}
            searchPlaceholder="Search & Add Diagnosis"
            searchSuggestions={diagnosisSuggestions}
            cannedChips={diagnosisSuggestions.slice(0, 12)}
            moduleDataAttr="diagnosis"
            getOptionTag={(option) => {
              const score = bestMatchPercent(option, ddxSuggestions)
              if (score < 50) return null
              return (
                <TPTooltip
                  title={`AI relevance: ${score}% match against differential diagnosis suggestions from symptoms.`}
                  placement="top"
                  arrow
                >
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      background: "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)",
                      border: "1px solid rgba(103,58,172,0.15)",
                      color: "var(--tp-violet-700, #6D28D9)",
                    }}
                  >
                    DDx {score}% match
                  </span>
                </TPTooltip>
              )
            }}
            afterSearch={
              !isV0Mode && hasFilledDiagnosis ? (
                <AiTriggerChip
                  label="Suggest lab tests"
                  signalLabel="Suggest lab investigations based on diagnosis"
                  sectionId="diagnosis"
                />
              ) : null
            }
          />
        )
      case "medication":
        return (
          <EditableTableModule
            key="medication"
            id="medication"
            moduleDataAttr="medication"
            title="Medication (Rx)"
            templateModuleId="medication"
            templateModuleName="Medication"
            icon={<TPMedicalIcon name="Tablets" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={medicationColumns}
            primaryKey="medicine"
            rows={medicationRows}
            onChangeRows={setMedicationRows}
            onVoiceClick={() => handleVoiceToggle("medication")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "medication"}
            onVoiceSubmit={(t) => handleVoiceSubmit("medication", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "medication" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["medication"]}
            searchPlaceholder="Search & Add Medication (Rx)"
            searchSuggestions={medicationSuggestions}
            getOptionTag={(option) => {
              const hit = checkDrugInteraction(option, existingMedNames)
              return hit ? (
                <TPTooltip
                  title={`Potential interaction with ${hit.interactsWith}. Review before prescribing.`}
                  placement="top"
                  arrow
                >
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      background: "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)",
                      border: "1px solid rgba(103,58,172,0.15)",
                      color: "var(--tp-violet-700, #6D28D9)",
                    }}
                  >
                    DDI match
                  </span>
                </TPTooltip>
              ) : null
            }}
            highlightedRowIds={interactionRowIds}
            highlightedRowTooltips={Object.fromEntries(tableInteractions.map((t) => [t.rowId, `⚠ ${t.description} — interacts with ${t.interactsWith}`]))}
            groundedKey="medicine"
            ungroundedRowIds={ungroundedRowIds}
            onGroundRow={groundRow}
            cannedChips={[
              "Paracetamol 650mg",
              "Amoxicillin 500mg",
              "Pantoprazole 40mg",
              "Cetirizine 10mg",
              "Ondansetron 4mg",
              "ORS Sachet",
              "Multivitamin",
              "Ibuprofen 400mg",
            ]}
            afterSearch={
              !isV0Mode && hasFilledMedication ? (
                <AiTriggerChip
                  label="Check interactions"
                  signalLabel="Check drug interactions for current medications"
                  sectionId="medication"
                />
              ) : null
            }
          />
        )
      case "advice":
        return (
          <EditableTableModule
            key="advice"
            id="advice"
            moduleDataAttr="advice"
            title="Advices"
            templateModuleId="advice"
            templateModuleName="Advices"
            icon={<TPMedicalIcon name="health care" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={adviceColumns}
            primaryKey="advice"
            rows={adviceRows}
            onChangeRows={setAdviceRows}
            onVoiceClick={() => handleVoiceToggle("advice")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "advice"}
            onVoiceSubmit={(t) => handleVoiceSubmit("advice", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "advice" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["advice"]}
            searchPlaceholder="Search & Add Advice"
            cannedChips={ADVICE_SUGGESTIONS}
            afterSearch={
              !isV0Mode && hasFilledAdvice ? (
                <AiTriggerChip
                  label="Translate advice"
                  signalLabel="Translate advice to patient's language"
                  sectionId="advice"
                />
              ) : null
            }
          />
        )
      case "lab":
        return (
          <EditableTableModule
            key="lab"
            id="lab"
            moduleDataAttr="lab"
            title="Lab Investigation"
            templateModuleId="lab"
            templateModuleName="Lab Investigation"
            icon={<TPMedicalIcon name="Test Tube" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={labColumns}
            primaryKey="investigation"
            rows={labRows}
            onChangeRows={setLabRows}
            onVoiceClick={() => handleVoiceToggle("lab")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "lab"}
            onVoiceSubmit={(t) => handleVoiceSubmit("lab", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "lab" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["lab"]}
            searchPlaceholder="Search & Add Lab Investigation"
            cannedChips={LAB_INVESTIGATION_BASE_OPTIONS}
            groundedKey="investigation"
            ungroundedRowIds={ungroundedRowIds}
            onGroundRow={groundRow}
            getOptionTag={(option) => {
              const score = bestMatchPercent(
                option,
                diagnosisRows.map((row) => (row.name ?? "").trim()).filter(Boolean),
              )
              if (score < 40) return null
              return (
                <TPTooltip
                  title={`AI relevance: ${score}% match with current diagnosis list.`}
                  placement="top"
                  arrow
                >
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      background: "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)",
                      border: "1px solid rgba(103,58,172,0.15)",
                      color: "var(--tp-violet-700, #6D28D9)",
                    }}
                  >
                    Investigation {score}% match
                  </span>
                </TPTooltip>
              )
            }}
            afterSearch={
              !isV0Mode && hasFilledDiagnosis ? (
                <AiTriggerChip
                  label="Suggest investigations"
                  signalLabel="Suggest lab investigations based on diagnosis"
                  sectionId="lab"
                />
              ) : null
            }
          />
        )
      case "surgery":
        return (
          <EditableTableModule
            key="surgery"
            id="surgery"
            title="Surgery"
            templateModuleId="surgery"
            templateModuleName="Surgery"
            icon={<TPMedicalIcon name="surgical-scissors-02" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={surgeryColumns}
            primaryKey="surgery"
            rows={surgeryRows}
            onChangeRows={setSurgeryRows}
            onVoiceClick={() => handleVoiceToggle("surgery")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "surgery"}
            onVoiceSubmit={(t) => handleVoiceSubmit("surgery", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "surgery" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["surgery"]}
            searchPlaceholder="Search & Add Surgery"
            cannedChips={SURGERY_SUGGESTIONS}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 p-4 max-lg:p-3 [&_input]:[caret-color:var(--tp-blue-500)] [&_textarea]:[caret-color:var(--tp-blue-500)] [&_input]:[caret-width:2px] [&_textarea]:[caret-width:2px]">
      {activeSections.map((s) => renderSection(s.id as RxSectionId))}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TPRxPadSection
          title="Additional Notes"
          icon={<Notepad2 size={24} variant="Bulk" color="var(--tp-violet-500)" />}
          showHeaderActions={false}
          onVoiceClick={() => handleVoiceToggle("additionalNotes")}
          voiceActive={voiceModuleId === "additionalNotes"}
        >
          {voiceModuleId === "additionalNotes" ? (
            <VoiceRxModuleRecorder
              sectionLabel="Additional Notes"
              onCancel={() => setVoiceModuleId(null)}
              onSubmit={(transcript) => {
                setVoiceModuleId(null)
                handleVoiceSubmit("additionalNotes", transcript)
              }}
              radiusClassName="rounded-[14px]"
            />
          ) : null}
          {voiceModuleProcessing?.moduleId === "additionalNotes" ? (
            <VoiceRxSectionProcessing transcript={voiceModuleProcessing.transcript} sectionLabel="Additional Notes" />
          ) : null}
          <div className={voiceModuleId === "additionalNotes" || voiceModuleProcessing?.moduleId === "additionalNotes" ? "hidden" : ""}>
            <textarea
              value={additionalNotes}
              onChange={(event) => setAdditionalNotes(event.currentTarget.value)}
              rows={5}
              className="w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20"
              placeholder="Enter additional notes"
            />
          </div>
        </TPRxPadSection>

        <TPRxPadSection
          title="Follow-up"
          icon={<Calendar2 size={24} variant="Bulk" color="var(--tp-violet-500)" />}
          showHeaderActions={false}
          onVoiceClick={() => handleVoiceToggle("followUp")}
          voiceActive={voiceModuleId === "followUp"}
        >
          {voiceModuleId === "followUp" ? (
            <VoiceRxModuleRecorder
              sectionLabel="Follow-up"
              onCancel={() => setVoiceModuleId(null)}
              onSubmit={(transcript) => {
                setVoiceModuleId(null)
                handleVoiceSubmit("followUp", transcript)
              }}
              radiusClassName="rounded-[14px]"
            />
          ) : null}
          {voiceModuleProcessing?.moduleId === "followUp" ? (
            <VoiceRxSectionProcessing transcript={voiceModuleProcessing.transcript} sectionLabel="Follow-up" />
          ) : null}
          <div className={voiceModuleId === "followUp" || voiceModuleProcessing?.moduleId === "followUp" ? "hidden" : ""}>
          <div className="space-y-2">
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.currentTarget.value)}
              className="h-[42px] w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20"
              placeholder="Select follow-up date"
            />
            <textarea
              value={followUpNotes}
              onChange={(event) => setFollowUpNotes(event.currentTarget.value)}
              rows={3}
              className="w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20"
              placeholder="Follow-up notes/instructions for patient reminder"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { label: "2 days", days: 2 },
                { label: "1 week", days: 7 },
                { label: "1 month", days: 30 },
                { label: "3 months", days: 90 },
              ].map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  className="rounded-lg border border-tp-blue-200 bg-tp-blue-50 px-3 py-1.5 text-[14px] font-medium font-['Inter',sans-serif] text-tp-blue-600 hover:bg-tp-blue-100"
                  onClick={() => setFollowUpByOffset(quick.days)}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </TPRxPadSection>
      </div>

      {/* Add Custom Module CTA — appears at the bottom of the RxPad body
          alongside the Follow-up section. Hidden once the doctor has hit
          the 15-module cap. Opens the same drawer as the in-sheet CTA. */}
      {customModules.length < CUSTOM_MODULE_CAP && (
        <button
          type="button"
          onClick={() => openCustomModulesDrawer()}
          className="flex w-full items-center justify-center gap-[8px] rounded-[14px] border-2 border-dashed border-tp-blue-300 bg-tp-blue-50/30 py-[14px] text-[14px] font-semibold text-tp-blue-500 transition-colors hover:bg-tp-blue-50 active:scale-[0.99]"
          aria-label="Add custom module"
          data-rxpad-add-custom
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          Add Custom Module
        </button>
      )}

      <TPSnackbar
        open={Boolean(toastMessage)}
        message={toastMessage ?? ""}
        severity="success"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={1800}
        onClose={() => setToastMessage(null)}
      />
    </div>
  )
}
