"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Info, AlertCircle, Search as SearchIcon, Sparkles } from "lucide-react"

import {
  CUSTOM_MODULE_NAME_MAX,
  type CustomModule,
} from "@/lib/customise-store"
import { ModuleAtomIcon } from "./ModuleAtomIcon"
import { ModuleIcon } from "./ModuleIcon"
import { autoMatchIcon, searchIcons, type IconsaxResult } from "./iconsax-client"

// ── Public types ─────────────────────────────────────────────────────────

export type EditorIcon = {
  name: string | null
  style: string | null
  svg: string | null
} | null

export type EditorSubmitPayload = {
  name: string
  fields: { label: string }[]
  icon: EditorIcon
}

export type CustomModuleEditorHandle = {
  // Drawer header CTAs trigger this. Returns true when the form was valid
  // and submission fired; false when validation blocked.
  submit: () => boolean
  // Mirror the form's validity so the drawer header CTA can be disabled
  // before the user even attempts to submit.
  isValid: () => boolean
}

interface CustomModuleEditorProps {
  // When editing an existing module the form is pre-filled.
  initial?: Pick<CustomModule, "name" | "fields">
  // Names already in use by OTHER modules — flagged as duplicates.
  existingNames: string[]
  onSubmit: (payload: EditorSubmitPayload) => void
  // Notifies the drawer header so it can enable / disable its CTA.
  onValidityChange?: (valid: boolean) => void
}

// Reference (CreateNewModuleTab.js) constraints.
const MAX_COLUMN_LABEL_LENGTH = 15
const COLUMN_COUNT_OPTIONS = [1, 2, 3, 4] as const
type ColumnCount = (typeof COLUMN_COUNT_OPTIONS)[number]

// ── Component ────────────────────────────────────────────────────────────

export const CustomModuleEditor = forwardRef<CustomModuleEditorHandle, CustomModuleEditorProps>(
  function CustomModuleEditor(
    { initial, existingNames, onSubmit, onValidityChange }: CustomModuleEditorProps,
    ref,
  ) {
    const [name, setName] = useState(initial?.name ?? "")
    const [icon, setIcon] = useState<EditorIcon>(() =>
      initial && (initial as Partial<CustomModule>).iconSvg
        ? {
            name: (initial as Partial<CustomModule>).iconName ?? null,
            style: (initial as Partial<CustomModule>).iconStyle ?? null,
            svg: (initial as Partial<CustomModule>).iconSvg ?? null,
          }
        : null,
    )
    const [iconAutoFetching, setIconAutoFetching] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickerQuery, setPickerQuery] = useState("")
    const [pickerResults, setPickerResults] = useState<IconsaxResult[]>([])
    const [pickerLoading, setPickerLoading] = useState(false)
    const initialColumnCount = (
      initial?.fields.length && COLUMN_COUNT_OPTIONS.includes(initial.fields.length as ColumnCount)
        ? (initial.fields.length as ColumnCount)
        : 2
    ) as ColumnCount
    const [columnCount, setColumnCount] = useState<ColumnCount>(initialColumnCount)
    const [columnLabels, setColumnLabels] = useState<string[]>(() => {
      if (initial?.fields.length) {
        const out = initial.fields.map((f) => f.label)
        // Pad to the count selector (defensive — initial fields may be < count).
        while (out.length < initialColumnCount) out.push("")
        return out.slice(0, initialColumnCount)
      }
      return Array(initialColumnCount).fill("")
    })
    const [submitted, setSubmitted] = useState(false)

    // Reseed when editing a different module.
    useEffect(() => {
      if (!initial) return
      const cnt = (
        COLUMN_COUNT_OPTIONS.includes(initial.fields.length as ColumnCount)
          ? (initial.fields.length as ColumnCount)
          : 2
      ) as ColumnCount
      setName(initial.name)
      setColumnCount(cnt)
      const labels = initial.fields.map((f) => f.label)
      while (labels.length < cnt) labels.push("")
      setColumnLabels(labels.slice(0, cnt))
      setSubmitted(false)
      const init = initial as Partial<CustomModule>
      setIcon(
        init.iconSvg
          ? { name: init.iconName ?? null, style: init.iconStyle ?? null, svg: init.iconSvg }
          : null,
      )
    }, [initial])

    // Auto-fetch an icon ~600ms after the doctor stops typing the
    // module name. Skips when the doctor has already overridden via
    // the picker. In edit mode, only fires if no icon was persisted.
    const lastAutoQueryRef = useRef("")
    const overrideRef = useRef(false)
    useEffect(() => {
      if (overrideRef.current) return
      const q = name.trim()
      if (q.length < 3) return
      if (q.toLowerCase() === lastAutoQueryRef.current) return
      const handle = window.setTimeout(async () => {
        lastAutoQueryRef.current = q.toLowerCase()
        setIconAutoFetching(true)
        const match = await autoMatchIcon(q)
        setIconAutoFetching(false)
        if (overrideRef.current) return
        if (match) {
          setIcon({ name: match.name, style: match.style, svg: match.svg })
        } else {
          setIcon(null)
        }
      }, 600)
      return () => window.clearTimeout(handle)
    }, [name])

    // Picker search debounce.
    useEffect(() => {
      if (!pickerOpen) return
      const q = pickerQuery.trim() || name.trim()
      if (q.length < 2) {
        setPickerResults([])
        return
      }
      setPickerLoading(true)
      const handle = window.setTimeout(async () => {
        const results = await searchIcons(q)
        setPickerResults(results)
        setPickerLoading(false)
      }, 300)
      return () => window.clearTimeout(handle)
    }, [pickerOpen, pickerQuery, name])

    // Keep the labels array sized to the count selector.
    useEffect(() => {
      setColumnLabels((prev) => {
        if (prev.length === columnCount) return prev
        const out = Array(columnCount).fill("")
        for (let i = 0; i < Math.min(prev.length, columnCount); i++) out[i] = prev[i]
        return out
      })
    }, [columnCount])

    // ── Validation ────────────────────────────────────────────────────────
    const trimmedName = name.trim()
    const nameDuplicate = useMemo(
      () =>
        existingNames
          .map((n) => n.trim().toLowerCase())
          .includes(trimmedName.toLowerCase()) && trimmedName.length > 0,
      [existingNames, trimmedName],
    )

    const labelErrors = useMemo(() => {
      const seen = new Map<string, number>()
      const errors: string[] = columnLabels.map((label) => {
        const trimmed = label.trim()
        if (!trimmed) return "Label required"
        const k = trimmed.toLowerCase()
        seen.set(k, (seen.get(k) ?? 0) + 1)
        return ""
      })
      columnLabels.forEach((label, i) => {
        if (errors[i]) return
        const k = label.trim().toLowerCase()
        if ((seen.get(k) ?? 0) > 1) errors[i] = "Duplicate label"
      })
      return errors
    }, [columnLabels])

    const formError = useMemo(() => {
      if (!trimmedName) return "Module name is required"
      if (trimmedName.length > CUSTOM_MODULE_NAME_MAX)
        return `Module name must be ≤ ${CUSTOM_MODULE_NAME_MAX} characters`
      if (nameDuplicate) return "A module with this name already exists"
      if (!columnLabels.length) return "Add at least one column"
      if (labelErrors.some((e) => e)) return "Fix column errors below"
      return null
    }, [trimmedName, nameDuplicate, columnLabels.length, labelErrors])

    const isValid = !formError

    // Sync validity upward so the drawer header CTA can disable itself.
    const lastValidRef = useRef<boolean | null>(null)
    useEffect(() => {
      if (lastValidRef.current === isValid) return
      lastValidRef.current = isValid
      onValidityChange?.(isValid)
    }, [isValid, onValidityChange])

    // ── Imperative handle for the drawer header CTA ──────────────────────
    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          setSubmitted(true)
          if (formError) return false
          onSubmit({
            name: trimmedName,
            fields: columnLabels.map((label) => ({ label: label.trim() })),
            icon,
          })
          return true
        },
        isValid: () => isValid,
      }),
      [columnLabels, formError, icon, isValid, onSubmit, trimmedName],
    )

    // ── Mutators ──────────────────────────────────────────────────────────
    function handleLabelChange(idx: number, value: string) {
      setColumnLabels((prev) => prev.map((l, i) => (i === idx ? value.slice(0, MAX_COLUMN_LABEL_LENGTH) : l)))
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-[20px] py-[18px]">
          {/* Module name */}
          <div className="mb-[6px] flex items-center gap-[6px]">
            <span className="text-[13px] font-semibold text-tp-slate-700">
              Module Name <span className="text-tp-error-500">*</span>
            </span>
            <span title="Enter a unique name for your custom module" className="inline-flex h-[16px] w-[16px] items-center justify-center text-tp-slate-400">
              <Info size={14} strokeWidth={1.5} />
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, CUSTOM_MODULE_NAME_MAX))}
              placeholder="Eg., Cardiac Assessment or Diet Plan"
              className="w-full rounded-[10px] border border-tp-slate-200 bg-white px-[12px] py-[10px] pr-[60px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[11px] text-tp-slate-400">
              {trimmedName.length}/{CUSTOM_MODULE_NAME_MAX}
            </span>
          </div>
          {submitted && nameDuplicate && (
            <p className="mt-[6px] text-[12px] text-tp-error-500">A module with this name already exists.</p>
          )}

          {/* Icon picker */}
          <div className="mt-[20px] flex items-center gap-[12px] rounded-[12px] border border-tp-slate-200 bg-white p-[12px]">
            <span className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-tp-blue-50 text-tp-blue-500">
              {icon?.svg ? (
                <ModuleIcon module={{ iconSvg: icon.svg }} size={26} color="var(--tp-blue-500)" />
              ) : (
                <ModuleAtomIcon size={24} color="var(--tp-blue-500)" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-[6px] text-[13px] font-semibold text-tp-slate-700">
                Module Icon
                {iconAutoFetching && (
                  <span className="inline-flex items-center gap-[4px] text-[11px] font-normal text-tp-slate-400">
                    <Sparkles size={10} strokeWidth={2} className="animate-pulse" /> matching…
                  </span>
                )}
              </p>
              <p className="mt-[2px] truncate text-[12px] text-tp-slate-500">
                {icon?.name
                  ? `Auto-matched: ${icon.name.replace(/-/g, " ")}`
                  : "We'll auto-match an icon as you type the name. You can override it below."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPickerOpen((v) => !v)
                setPickerQuery("")
              }}
              className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-[8px] border border-tp-blue-300 bg-white px-[12px] text-[12px] font-semibold text-tp-blue-500 transition-colors hover:bg-tp-blue-50"
            >
              {pickerOpen ? "Close" : "Change"}
            </button>
          </div>

          {pickerOpen && (
            <div className="mt-[8px] rounded-[12px] border border-tp-slate-200 bg-white p-[12px]">
              <div className="relative">
                <SearchIcon size={14} strokeWidth={1.5} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-tp-slate-400" />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder={`Search icons (e.g. ${trimmedName || "heart"})`}
                  className="w-full rounded-[8px] border border-tp-slate-200 bg-white py-[8px] pl-[32px] pr-[10px] text-[13px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none"
                />
              </div>
              <div className="mt-[10px] min-h-[60px]">
                {pickerLoading ? (
                  <p className="text-center text-[12px] text-tp-slate-400">Searching…</p>
                ) : pickerResults.length === 0 ? (
                  <p className="text-center text-[12px] text-tp-slate-400">
                    {pickerQuery.trim() ? `No icons for "${pickerQuery.trim()}".` : "Type a keyword above."}
                  </p>
                ) : (
                  <div className="grid grid-cols-6 gap-[8px] sm:grid-cols-8">
                    {pickerResults.map((r) => {
                      const selected = icon?.name === r.name && icon?.style === r.style
                      return (
                        <button
                          key={`${r.name}:${r.style}`}
                          type="button"
                          onClick={() => {
                            overrideRef.current = true
                            setIcon({ name: r.name, style: r.style, svg: r.svg })
                            setPickerOpen(false)
                          }}
                          title={`${r.name} (${r.style})`}
                          className={`flex aspect-square items-center justify-center rounded-[8px] border transition-colors ${
                            selected
                              ? "border-tp-blue-500 bg-tp-blue-50 text-tp-blue-600"
                              : "border-tp-slate-100 bg-white text-tp-slate-600 hover:border-tp-blue-300 hover:bg-tp-blue-50/40"
                          }`}
                        >
                          {r.svg ? (
                            <ModuleIcon module={{ iconSvg: r.svg }} size={22} color="currentColor" />
                          ) : (
                            <span className="text-[10px]">{r.name.slice(0, 3)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {icon && (
                  <button
                    type="button"
                    onClick={() => {
                      overrideRef.current = true
                      setIcon(null)
                    }}
                    className="mt-[10px] text-[12px] text-tp-slate-500 underline-offset-2 hover:text-tp-slate-700 hover:underline"
                  >
                    Use atom icon instead
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Configure columns */}
          <div className="mt-[20px] mb-[6px] flex items-center gap-[6px]">
            <span className="text-[13px] font-semibold text-tp-slate-700">
              Configure Columns <span className="text-tp-error-500">*</span>
            </span>
            <span title="Select the number of columns for your module" className="inline-flex h-[16px] w-[16px] items-center justify-center text-tp-slate-400">
              <Info size={14} strokeWidth={1.5} />
            </span>
          </div>
          <div className="inline-flex overflow-hidden rounded-[8px] border border-tp-slate-200">
            {COLUMN_COUNT_OPTIONS.map((c, i) => {
              const active = columnCount === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColumnCount(c)}
                  className={`px-[14px] py-[8px] text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-tp-blue-500 text-white"
                      : "bg-white text-tp-slate-600 hover:bg-tp-slate-50"
                  } ${i > 0 ? "border-l border-tp-slate-200" : ""}`}
                >
                  {String(c).padStart(2, "0")} {c === 1 ? "Column" : "Columns"}
                </button>
              )
            })}
          </div>

          {/* Column-label divider */}
          <div className="mt-[18px] flex items-center gap-[12px] text-[12px] font-medium uppercase tracking-wider text-tp-slate-400">
            <span aria-hidden className="h-px flex-1 bg-tp-slate-200" />
            <span>Set Column Labels</span>
            <span aria-hidden className="h-px flex-1 bg-tp-slate-200" />
          </div>

          {/* Column-label grid (2-up on desktop) */}
          <div className="mt-[14px] grid grid-cols-1 gap-[12px] md:grid-cols-2">
            {columnLabels.map((label, idx) => {
              const error = submitted ? labelErrors[idx] : ""
              return (
                <label key={idx} className="block">
                  <span className="mb-[4px] block text-[12px] font-semibold text-tp-slate-700">
                    Column {idx + 1} <span className="text-tp-error-500">*</span>
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => handleLabelChange(idx, e.target.value)}
                      placeholder={`Eg., ${idx === 0 ? "Diet" : "Notes"}`}
                      className={`w-full rounded-[10px] border bg-white px-[12px] py-[10px] pr-[56px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none ${
                        error ? "border-tp-error-300" : "border-tp-slate-200"
                      }`}
                    />
                    <span className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[11px] text-tp-slate-400">
                      {label.length}/{MAX_COLUMN_LABEL_LENGTH}
                    </span>
                  </div>
                  {error && (
                    <p className="mt-[4px] text-[11px] text-tp-error-500">{error}</p>
                  )}
                </label>
              )
            })}
          </div>

          {/* Info box at the bottom — mirrors the reference's
              "Things to Know Before Creating a Custom Module" panel. */}
          <div className="mt-[24px] rounded-[12px] border border-tp-blue-100 bg-tp-blue-50/50 p-[14px]">
            <div className="mb-[6px] flex items-center gap-[8px]">
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0 text-tp-blue-500" />
              <h4 className="text-[13px] font-semibold text-tp-slate-800">
                Things to know before creating a custom module
              </h4>
            </div>
            <ul className="ml-[24px] list-disc space-y-[4px] text-[12px] leading-[1.6] text-tp-slate-600">
              <li>You can <strong className="font-semibold text-tp-slate-800">edit</strong> or <strong className="font-semibold text-tp-slate-800">delete</strong> this module until it's used in a Rx.</li>
              <li>Once used, it becomes <strong className="font-semibold text-tp-slate-800">locked</strong> — column names and structure can't change.</li>
              <li>To make changes later, you'll need to <strong className="font-semibold text-tp-slate-800">create a new module</strong>.</li>
              <li>This keeps past prescriptions accurate and unchanged.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
)
