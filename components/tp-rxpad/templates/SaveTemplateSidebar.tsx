"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, Info, Pencil, Search } from "lucide-react"

import {
  addTemplate,
  isTemplateNameTaken,
  updateTemplate,
} from "@/lib/template-store"
import { useTemplateSidebars, useTemplatesForModule } from "./template-context"
import { CloseSquareIcon } from "./shared"

const TAB_NEW = "new" as const
const TAB_UPDATE = "update" as const

const NAME_MAX = 40

export function SaveTemplateSidebar() {
  const { openSidebar, activeModule, closeSidebar } = useTemplateSidebars()
  const isOpen = openSidebar === "save" && !!activeModule

  // ── Mount/animate ────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(isOpen)
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      const id = window.requestAnimationFrame(() => setIsVisible(true))
      return () => window.cancelAnimationFrame(id)
    }
    setIsVisible(false)
    const id = window.setTimeout(() => setIsMounted(false), 280)
    return () => window.clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    if (!isMounted) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isMounted, closeSidebar])

  const moduleId = activeModule?.moduleId ?? ""
  const moduleName = activeModule?.moduleName ?? ""
  const currentRows = activeModule?.currentRows ?? []
  const moduleTemplates = useTemplatesForModule(moduleId)

  const [tab, setTab] = useState<typeof TAB_NEW | typeof TAB_UPDATE>(TAB_NEW)
  const [name, setName] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [updateQuery, setUpdateQuery] = useState("")
  const [updateTargetId, setUpdateTargetId] = useState<string | null>(null)

  // Reset transient state on each open.
  useEffect(() => {
    if (isOpen) {
      setTab(TAB_NEW)
      setName("")
      setSubmitted(false)
      setUpdateQuery("")
      setUpdateTargetId(null)
    }
  }, [isOpen, activeModule?.moduleId])

  // ── Validation ────────────────────────────────────────────────────────
  const trimmedName = name.trim()
  const nameDuplicate = useMemo(
    () => isTemplateNameTaken(moduleId, trimmedName),
    [moduleId, trimmedName],
  )
  const newError = useMemo(() => {
    if (!trimmedName) return "Template name is required"
    if (trimmedName.length > NAME_MAX) return `Template name must be ≤ ${NAME_MAX} characters`
    if (nameDuplicate) return "A template with this name already exists for this module"
    return null
  }, [trimmedName, nameDuplicate])

  const filteredForUpdate = useMemo(() => {
    const q = updateQuery.trim().toLowerCase()
    if (!q) return moduleTemplates
    return moduleTemplates.filter((t) => t.name.toLowerCase().includes(q))
  }, [moduleTemplates, updateQuery])

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleNewSubmit() {
    setSubmitted(true)
    if (newError) return
    const created = addTemplate({
      moduleId,
      moduleName,
      name: trimmedName,
      rows: currentRows,
    })
    if (created) closeSidebar()
  }

  function handleUpdateSubmit() {
    if (!updateTargetId) return
    const ok = updateTemplate(updateTargetId, { rows: currentRows })
    if (ok) closeSidebar()
  }

  // ── Headers / actions ─────────────────────────────────────────────────
  const canSubmitNew = !newError
  const canSubmitUpdate = !!updateTargetId

  if (!isMounted) return null

  return (
    <>
      <div
        aria-hidden
        onClick={closeSidebar}
        className={`fixed inset-0 z-[170] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
          isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-label={`Save ${moduleName} template`}
        aria-hidden={!isVisible}
        className={`fixed right-0 top-0 z-[171] flex h-full w-[94vw] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:w-[75vw] lg:w-[480px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex h-[56px] shrink-0 items-center justify-between gap-[12px] border-b border-tp-slate-100 px-[16px]">
          <div className="flex min-w-0 items-center gap-[12px]">
            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Close save template"
              className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-700 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900 active:scale-[0.96]"
            >
              <CloseSquareIcon size={22} />
            </button>
            <span aria-hidden className="h-[24px] w-px shrink-0 bg-tp-slate-200" />
            <h3 className="truncate text-[16px] font-semibold tracking-[-0.1px] text-tp-slate-800">
              Save {moduleName} Template
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <button
              type="button"
              onClick={closeSidebar}
              className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] border border-tp-blue-300 bg-white px-[16px] text-[13px] font-semibold text-tp-blue-500 transition-colors hover:bg-tp-blue-50 active:scale-[0.98]"
            >
              Cancel
            </button>
            {tab === TAB_NEW ? (
              <button
                type="button"
                onClick={handleNewSubmit}
                disabled={!canSubmitNew}
                className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] bg-tp-blue-500 px-[16px] text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tp-blue-500"
              >
                Save Template
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpdateSubmit}
                disabled={!canSubmitUpdate}
                className="inline-flex h-[36px] min-w-[100px] items-center justify-center rounded-[10px] bg-tp-blue-500 px-[16px] text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tp-blue-500"
              >
                Update Template
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="relative flex shrink-0 border-b border-tp-slate-100">
          <button
            type="button"
            onClick={() => setTab(TAB_NEW)}
            className={`relative inline-flex flex-1 items-center justify-center gap-[8px] px-[16px] py-[14px] text-[13px] font-semibold transition-colors ${
              tab === TAB_NEW ? "text-tp-blue-500" : "text-tp-slate-500 hover:text-tp-slate-700"
            }`}
          >
            <ClipboardList size={14} strokeWidth={1.5} />
            New Template
            {tab === TAB_NEW && (
              <span aria-hidden className="absolute inset-x-[12px] bottom-0 h-[2px] rounded-t-full bg-tp-blue-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab(TAB_UPDATE)}
            className={`relative inline-flex flex-1 items-center justify-center gap-[8px] px-[16px] py-[14px] text-[13px] font-semibold transition-colors ${
              tab === TAB_UPDATE ? "text-tp-blue-500" : "text-tp-slate-500 hover:text-tp-slate-700"
            }`}
          >
            <Pencil size={14} strokeWidth={1.5} />
            Update Existing
            {tab === TAB_UPDATE && (
              <span aria-hidden className="absolute inset-x-[12px] bottom-0 h-[2px] rounded-t-full bg-tp-blue-500" />
            )}
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-[20px] py-[18px]">
          {tab === TAB_NEW ? (
            <NewTemplatePane
              moduleName={moduleName}
              currentRows={currentRows}
              name={name}
              onNameChange={(v) => setName(v.slice(0, NAME_MAX))}
              error={submitted ? newError : null}
            />
          ) : (
            <UpdateTemplatePane
              moduleName={moduleName}
              templates={filteredForUpdate}
              query={updateQuery}
              onQueryChange={setUpdateQuery}
              targetId={updateTargetId}
              onSelect={(id) => setUpdateTargetId(id)}
              currentRowCount={currentRows.length}
            />
          )}
        </div>
      </aside>
    </>
  )
}

// ── Panes ─────────────────────────────────────────────────────────────────

function NewTemplatePane({
  moduleName,
  currentRows,
  name,
  onNameChange,
  error,
}: {
  moduleName: string
  currentRows: { id?: string; [k: string]: string | undefined }[]
  name: string
  onNameChange: (v: string) => void
  error: string | null
}) {
  const filledRows = useMemo(
    () =>
      currentRows.filter((row) =>
        Object.entries(row).some(([k, v]) => k !== "id" && typeof v === "string" && v.trim().length > 0),
      ),
    [currentRows],
  )

  return (
    <div>
      {/* Educational copy */}
      <div className="rounded-[12px] border border-tp-blue-100 bg-tp-blue-50/50 p-[14px]">
        <div className="mb-[6px] flex items-center gap-[8px]">
          <Info size={16} strokeWidth={1.5} className="shrink-0 text-tp-blue-500" />
          <h4 className="text-[13px] font-semibold text-tp-slate-800">
            Save these {moduleName.toLowerCase()} rows as a template
          </h4>
        </div>
        <p className="text-[12px] leading-[1.6] text-tp-slate-600">
          Templates let you reuse a common set of rows across patients. Apply this template
          from the {moduleName} section's Template button anytime — rows will be appended to
          whatever's already there.
        </p>
      </div>

      {/* Name */}
      <label className="mt-[18px] block">
        <span className="text-[13px] font-semibold text-tp-slate-700">Template name</span>
        <div className="relative mt-[6px]">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={`e.g. Common ${moduleName.toLowerCase()} pack`}
            className="w-full rounded-[10px] border border-tp-slate-200 bg-white px-[12px] py-[10px] pr-[60px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none"
          />
          <span className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[11px] text-tp-slate-400">
            {name.trim().length}/{NAME_MAX}
          </span>
        </div>
        {error && <p className="mt-[6px] text-[12px] text-tp-error-500">{error}</p>}
      </label>

      {/* Preview */}
      <div className="mt-[18px]">
        <div className="mb-[8px] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-tp-slate-700">Preview</span>
          <span className="text-[11px] text-tp-slate-400">
            {filledRows.length} {filledRows.length === 1 ? "row" : "rows"}
          </span>
        </div>
        {filledRows.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-[14px] py-[20px] text-center text-[12px] text-tp-slate-500">
            No filled rows yet. Add rows in the {moduleName} section first.
          </div>
        ) : (
          <ol className="space-y-[6px] rounded-[10px] border border-tp-slate-100 bg-tp-slate-50/40 p-[10px]">
            {filledRows.map((row, idx) => (
              <li key={row.id ?? idx} className="rounded-[8px] bg-white px-[10px] py-[8px] text-[12px] leading-[1.5] text-tp-slate-700 ring-1 ring-tp-slate-100">
                <span className="mr-[6px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-tp-blue-50 px-[5px] text-[10px] font-semibold text-tp-blue-600">
                  {idx + 1}
                </span>
                {Object.entries(row)
                  .filter(([k, v]) => k !== "id" && typeof v === "string" && v.trim())
                  .map(([k, v]) => (v as string).trim())
                  .join(" · ")}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function UpdateTemplatePane({
  moduleName,
  templates,
  query,
  onQueryChange,
  targetId,
  onSelect,
  currentRowCount,
}: {
  moduleName: string
  templates: ReturnType<typeof useTemplatesForModule>
  query: string
  onQueryChange: (v: string) => void
  targetId: string | null
  onSelect: (id: string) => void
  currentRowCount: number
}) {
  const target = useMemo(() => templates.find((t) => t.id === targetId) ?? null, [targetId, templates])

  return (
    <div>
      <div className="rounded-[12px] border border-tp-blue-100 bg-tp-blue-50/50 p-[14px]">
        <div className="mb-[6px] flex items-center gap-[8px]">
          <Info size={16} strokeWidth={1.5} className="shrink-0 text-tp-blue-500" />
          <h4 className="text-[13px] font-semibold text-tp-slate-800">
            Replace an existing {moduleName.toLowerCase()} template
          </h4>
        </div>
        <p className="text-[12px] leading-[1.6] text-tp-slate-600">
          Pick the template you want to overwrite. The current {currentRowCount} {currentRowCount === 1 ? "row" : "rows"}
          {" "}will replace whatever was previously stored under that template name.
        </p>
      </div>

      {/* Search */}
      <div className="relative mt-[16px]">
        <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-tp-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search templates"
          className="w-full rounded-[10px] border border-tp-slate-200 bg-white py-[10px] pl-[36px] pr-[12px] text-[13px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-400 focus:outline-none"
        />
      </div>

      {/* List */}
      <div className="mt-[12px]">
        {templates.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-[14px] py-[20px] text-center text-[12px] text-tp-slate-500">
            {query.trim()
              ? `No templates match "${query.trim()}".`
              : `No saved ${moduleName.toLowerCase()} templates yet. Switch to "New Template" to create one.`}
          </div>
        ) : (
          <div className="space-y-[8px]">
            {templates.map((t) => {
              const selected = targetId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={`flex w-full items-center justify-between gap-[10px] rounded-[10px] border bg-white px-[12px] py-[10px] text-left transition-colors ${
                    selected
                      ? "border-tp-blue-500 ring-1 ring-tp-blue-200"
                      : "border-tp-slate-200 hover:border-tp-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-tp-slate-800">{t.name}</p>
                    <p className="mt-[2px] truncate text-[11px] text-tp-slate-500">
                      {t.rows.length} {t.rows.length === 1 ? "row" : "rows"} · last updated{" "}
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-tp-blue-500 bg-tp-blue-500 text-white" : "border-tp-slate-300"
                    }`}
                  >
                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {target && (
        <div className="mt-[16px] rounded-[10px] bg-tp-amber-50/40 px-[12px] py-[10px] text-[12px] text-tp-slate-600 ring-1 ring-amber-200/40">
          <strong className="font-semibold text-tp-slate-800">Heads up:</strong> "Update Template" will overwrite
          "{target.name}" ({target.rows.length} {target.rows.length === 1 ? "row" : "rows"}) with your
          current {currentRowCount} {currentRowCount === 1 ? "row" : "rows"}. This can't be undone.
        </div>
      )}
    </div>
  )
}
