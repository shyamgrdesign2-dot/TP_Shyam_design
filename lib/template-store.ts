// Module template store — localStorage-backed catalogue of saved row
// snapshots scoped per RxPad module. A template is a named copy of the
// rows in a module that the doctor can save once and apply to any
// future patient. Storage layout:
//
//   tp.module-templates.v1 → RxModuleTemplate[]
//
// Each template is keyed by a stable random id; the moduleId field
// records which RxPad module it came from ("symptoms", "examinations",
// "custom:cm-..." for custom modules, etc.). Templates are global —
// not scoped to a patient — so a doctor builds a "Common Cold pack"
// once and reuses it everywhere.

export type RxRowSnapshot = Record<string, string | undefined> & { id?: string }

export type RxModuleTemplate = {
  id: string
  moduleId: string
  // Module name at save time — used as a fallback label so the
  // Templates sidebar still has something to show even if the module
  // (e.g. a deleted custom module) goes away.
  moduleName: string
  name: string
  rows: RxRowSnapshot[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "tp.module-templates.v1"

// ── Pub/sub ──────────────────────────────────────────────────────────────

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeTemplates(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

let cached: RxModuleTemplate[] | null = null

function notify() {
  cached = null
  listeners.forEach((l) => l())
}

// ── Low-level I/O ────────────────────────────────────────────────────────

function readAll(): RxModuleTemplate[] {
  if (cached) return cached
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cached = []
      return cached
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      cached = []
      return cached
    }
    cached = parsed.filter(
      (t): t is RxModuleTemplate =>
        !!t &&
        typeof t.id === "string" &&
        typeof t.moduleId === "string" &&
        typeof t.name === "string" &&
        Array.isArray(t.rows),
    )
    return cached
  } catch {
    cached = []
    return cached
  }
}

function writeAll(next: RxModuleTemplate[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota — drop silently */
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export function getAllTemplates(): RxModuleTemplate[] {
  return readAll()
}

export function getTemplatesByModule(moduleId: string): RxModuleTemplate[] {
  return readAll()
    .filter((t) => t.moduleId === moduleId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function newId() {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// Strip empty rows + clear any per-row id so saved templates are clean
// snapshots rather than re-imports of the doctor's current row IDs.
function sanitiseRows(rows: RxRowSnapshot[]): RxRowSnapshot[] {
  const out: RxRowSnapshot[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const cleaned: RxRowSnapshot = {}
    let hasValue = false
    for (const [key, value] of Object.entries(row)) {
      if (key === "id") continue
      const v = typeof value === "string" ? value.trim() : ""
      if (v) hasValue = true
      cleaned[key] = v
    }
    if (hasValue) out.push(cleaned)
  }
  return out
}

export function addTemplate(input: {
  moduleId: string
  moduleName: string
  name: string
  rows: RxRowSnapshot[]
}): RxModuleTemplate | null {
  const cleaned = sanitiseRows(input.rows)
  if (!cleaned.length) return null
  const now = Date.now()
  const tpl: RxModuleTemplate = {
    id: newId(),
    moduleId: input.moduleId,
    moduleName: input.moduleName,
    name: input.name.trim(),
    rows: cleaned,
    createdAt: now,
    updatedAt: now,
  }
  writeAll([...readAll(), tpl])
  notify()
  return tpl
}

export function updateTemplate(id: string, patch: { name?: string; rows?: RxRowSnapshot[] }): RxModuleTemplate | null {
  const all = readAll()
  const idx = all.findIndex((t) => t.id === id)
  if (idx === -1) return null
  const current = all[idx]
  const next: RxModuleTemplate = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    rows: patch.rows !== undefined ? sanitiseRows(patch.rows) : current.rows,
    updatedAt: Date.now(),
  }
  const out = [...all]
  out[idx] = next
  writeAll(out)
  notify()
  return next
}

export function deleteTemplate(id: string) {
  const all = readAll()
  const next = all.filter((t) => t.id !== id)
  if (next.length === all.length) return
  writeAll(next)
  notify()
}

// Name-uniqueness guard scoped per module.
export function isTemplateNameTaken(moduleId: string, name: string, excludingId?: string): boolean {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return false
  return readAll().some(
    (t) => t.moduleId === moduleId && t.id !== excludingId && t.name.trim().toLowerCase() === trimmed,
  )
}
