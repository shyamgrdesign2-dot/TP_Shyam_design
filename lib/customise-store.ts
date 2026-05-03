// Customise store — single source of truth for the doctor's globally-saved
// pad layout (which sidebar tabs are shown and in what order, which RxPad
// modules are shown and in what order) plus the catalogue of custom modules
// they have created.
//
// Persistence is localStorage-only (no backend in this demo). Two keys:
//
//   tp.customise.config.v1     — layout config (sidebar + rxpad ordering/toggles)
//   tp.custom-modules.v1       — list of custom module definitions
//
// A tiny pub/sub lets `useSyncExternalStore` consumers re-render across the
// tree the instant any setter writes, without prop-drilling or a context
// re-render cascade.

// ── Types ─────────────────────────────────────────────────────────────────

export type SidebarItemId =
  | "pastVisits"
  | "vitals"
  | "history"
  | "labResults"
  | "medicalRecords"
  | "gynec"
  | "obstetric"
  | "vaccine"
  | "growth"
  | "personalNotes"

export type BuiltinRxSectionId =
  | "symptoms"
  | "examinations"
  | "diagnosis"
  | "medication"
  | "advice"
  | "lab"
  | "surgery"

export type RxSectionId = BuiltinRxSectionId | `custom:${string}`

export type LayoutItem<T extends string> = { id: T; enabled: boolean }

export type RxLayoutItem = LayoutItem<RxSectionId> & {
  kind?: "builtin" | "custom"
}

export type CustomiseConfig = {
  sidebar: LayoutItem<SidebarItemId>[]
  rxpad: RxLayoutItem[]
}

// Field kind retained as a type for stored compatibility; for v1 UI we
// only emit "text" but tolerate older records that carried "textarea" /
// "autocomplete" values.
export type CustomFieldKind = "text" | "textarea" | "autocomplete"

export type CustomModuleField = {
  id: string
  label: string
  kind?: CustomFieldKind
}

export type CustomModule = {
  id: string
  name: string
  fields: CustomModuleField[]
  createdAt: number
  // Flips true the first time a doctor types into one of this module's row
  // fields. Once true, Edit/Delete are disabled in the customise sheet's
  // More menu — same guard the reference uses to prevent destructive edits
  // on a module that already has patient data attached.
  hasBeenUsed: boolean
  // Auto-matched (or doctor-overridden) icon from the Iconsax catalogue.
  // `iconName` is the iconsax slug (e.g. "heart", "bottle-and-glass").
  // `iconSvg` is the inline SVG string we render directly. Either may be
  // null when the proxy didn't find a match — surfaces fall back to the
  // ModuleAtomIcon component in that case.
  iconName?: string | null
  iconStyle?: string | null
  iconSvg?: string | null
}

// ── Defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_SIDEBAR: LayoutItem<SidebarItemId>[] = [
  { id: "pastVisits", enabled: true },
  { id: "vitals", enabled: true },
  { id: "history", enabled: true },
  { id: "labResults", enabled: true },
  { id: "medicalRecords", enabled: true },
  { id: "gynec", enabled: true },
  { id: "obstetric", enabled: true },
  { id: "vaccine", enabled: true },
  { id: "growth", enabled: true },
  { id: "personalNotes", enabled: true },
]

export const DEFAULT_RXPAD: RxLayoutItem[] = [
  { id: "symptoms", enabled: true, kind: "builtin" },
  { id: "examinations", enabled: true, kind: "builtin" },
  { id: "diagnosis", enabled: true, kind: "builtin" },
  { id: "medication", enabled: true, kind: "builtin" },
  { id: "advice", enabled: true, kind: "builtin" },
  { id: "lab", enabled: true, kind: "builtin" },
  { id: "surgery", enabled: true, kind: "builtin" },
]

export const CUSTOM_MODULE_CAP = 15
export const CUSTOM_MODULE_FIELD_CAP = 10
export const CUSTOM_MODULE_NAME_MAX = 30

// ── Storage keys ─────────────────────────────────────────────────────────

const KEY_CONFIG = "tp.customise.config.v1"
const KEY_MODULES = "tp.custom-modules.v1"
const KEY_AUTOCOMPLETE = "tp.custom-modules.autocomplete.v1"

// ── Pub/sub ──────────────────────────────────────────────────────────────

type Listener = () => void
const configListeners = new Set<Listener>()
const moduleListeners = new Set<Listener>()

export function subscribeConfig(fn: Listener): () => void {
  configListeners.add(fn)
  return () => configListeners.delete(fn)
}

export function subscribeModules(fn: Listener): () => void {
  moduleListeners.add(fn)
  return () => moduleListeners.delete(fn)
}

function notifyConfig() {
  configListeners.forEach((l) => l())
}
function notifyModules() {
  moduleListeners.forEach((l) => l())
}

// ── Memoised snapshots so useSyncExternalStore returns referentially-stable
//    objects between writes. Without this React would re-render every tick
//    because each `getConfig()` call would build a fresh object.

let cachedConfig: CustomiseConfig | null = null
let cachedModules: CustomModule[] | null = null

function invalidateConfig() {
  cachedConfig = null
  notifyConfig()
}
function invalidateModules() {
  cachedModules = null
  notifyModules()
}

// ── Low-level I/O ────────────────────────────────────────────────────────

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode — drop the write silently */
  }
}

// ── Config: read / merge with defaults / write ───────────────────────────

function mergeLayout<T extends string>(
  stored: LayoutItem<T>[] | undefined,
  defaults: LayoutItem<T>[],
): LayoutItem<T>[] {
  // Two goals:
  //   1. Preserve the doctor's saved order + enabled flags for items they
  //      already know about.
  //   2. Append any defaults the saved config doesn't yet contain (so a
  //      newly-shipped builtin section surfaces automatically without
  //      blowing away their saved layout).
  if (!stored || !Array.isArray(stored)) return defaults.map((d) => ({ ...d }))
  const seen = new Set<string>()
  const out: LayoutItem<T>[] = []
  for (const item of stored) {
    if (!item || typeof item.id !== "string") continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push({ id: item.id, enabled: !!item.enabled })
  }
  for (const def of defaults) {
    if (!seen.has(def.id)) {
      seen.add(def.id)
      out.push({ ...def })
    }
  }
  return out
}

function mergeRxLayout(
  stored: RxLayoutItem[] | undefined,
  defaults: RxLayoutItem[],
  knownCustomIds: string[],
): RxLayoutItem[] {
  if (!stored || !Array.isArray(stored)) {
    // First boot — just ship the defaults. Custom modules (if any from a
    // prior install) get appended at the end.
    const out = defaults.map((d) => ({ ...d }))
    for (const cid of knownCustomIds) {
      out.push({
        id: `custom:${cid}` as RxSectionId,
        enabled: true,
        kind: "custom",
      })
    }
    return out
  }
  const seen = new Set<string>()
  const out: RxLayoutItem[] = []
  for (const item of stored) {
    if (!item || typeof item.id !== "string") continue
    if (seen.has(item.id)) continue
    // Drop stale custom entries whose underlying module was deleted.
    if (typeof item.id === "string" && item.id.startsWith("custom:")) {
      const cid = item.id.slice("custom:".length)
      if (!knownCustomIds.includes(cid)) continue
    }
    seen.add(item.id)
    out.push({
      id: item.id as RxSectionId,
      enabled: !!item.enabled,
      kind: item.kind ?? (item.id.startsWith("custom:") ? "custom" : "builtin"),
    })
  }
  for (const def of defaults) {
    if (!seen.has(def.id)) {
      seen.add(def.id)
      out.push({ ...def })
    }
  }
  // Custom modules created since the last save: append at the end as
  // enabled.
  for (const cid of knownCustomIds) {
    const fullId = `custom:${cid}`
    if (!seen.has(fullId)) {
      seen.add(fullId)
      out.push({
        id: fullId as RxSectionId,
        enabled: true,
        kind: "custom",
      })
    }
  }
  return out
}

export function getModules(): CustomModule[] {
  if (cachedModules) return cachedModules
  const raw = readJSON<CustomModule[]>(KEY_MODULES) ?? []
  // Filter to safe shapes only — guards against a corrupt write.
  const cleaned = raw.filter(
    (m): m is CustomModule =>
      !!m &&
      typeof m.id === "string" &&
      typeof m.name === "string" &&
      Array.isArray(m.fields) &&
      typeof m.createdAt === "number",
  )
  cachedModules = cleaned
  return cleaned
}

export function getConfig(): CustomiseConfig {
  if (cachedConfig) return cachedConfig
  const stored = readJSON<Partial<CustomiseConfig>>(KEY_CONFIG)
  const customIds = getModules().map((m) => m.id)
  const merged: CustomiseConfig = {
    sidebar: mergeLayout(stored?.sidebar, DEFAULT_SIDEBAR),
    rxpad: mergeRxLayout(stored?.rxpad, DEFAULT_RXPAD, customIds),
  }
  cachedConfig = merged
  return merged
}

export function setConfig(next: CustomiseConfig) {
  writeJSON(KEY_CONFIG, next)
  invalidateConfig()
}

export function setModules(next: CustomModule[]) {
  writeJSON(KEY_MODULES, next)
  invalidateModules()
  // Custom-module changes can change which custom rows belong in the rxpad
  // layout, so let consumers of the layout config re-derive too.
  invalidateConfig()
}

// ── Mutators ─────────────────────────────────────────────────────────────

export function addCustomModule(input: {
  name: string
  fields: Array<Pick<CustomModuleField, "label"> & Partial<Pick<CustomModuleField, "kind">>>
  iconName?: string | null
  iconStyle?: string | null
  iconSvg?: string | null
}): CustomModule {
  const modules = getModules()
  if (modules.length >= CUSTOM_MODULE_CAP) {
    throw new Error("Custom module cap reached")
  }
  const id = `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const newModule: CustomModule = {
    id,
    name: input.name.trim(),
    fields: input.fields.map((f, i) => ({
      id: `f-${i}-${Math.random().toString(36).slice(2, 7)}`,
      label: f.label.trim(),
      kind: f.kind ?? "text",
    })),
    createdAt: Date.now(),
    hasBeenUsed: false,
    iconName: input.iconName ?? null,
    iconStyle: input.iconStyle ?? null,
    iconSvg: input.iconSvg ?? null,
  }
  setModules([...modules, newModule])

  // Append to rxpad layout so it shows up immediately.
  const cfg = getConfig()
  const fullId = `custom:${id}` as RxSectionId
  if (!cfg.rxpad.find((s) => s.id === fullId)) {
    setConfig({
      ...cfg,
      rxpad: [...cfg.rxpad, { id: fullId, enabled: true, kind: "custom" }],
    })
  }
  return newModule
}

export function updateCustomModule(
  id: string,
  patch: {
    name?: string
    fields?: Array<Pick<CustomModuleField, "label"> & Partial<Pick<CustomModuleField, "kind">>>
    iconName?: string | null
    iconStyle?: string | null
    iconSvg?: string | null
  },
) {
  const modules = getModules()
  const idx = modules.findIndex((m) => m.id === id)
  if (idx === -1) return
  const target = modules[idx]
  // Field structure / name edits remain locked once the module has been
  // used. Icon changes are still allowed — they don't affect saved row
  // data and the doctor may want to retune the avatar.
  const fieldsOrNameChanging =
    patch.name !== undefined && patch.name.trim() !== target.name ||
    patch.fields !== undefined
  if (fieldsOrNameChanging && target.hasBeenUsed) {
    throw new Error("Cannot edit a custom module that has been used")
  }
  const next: CustomModule = {
    ...target,
    name: patch.name !== undefined ? patch.name.trim() : target.name,
    fields:
      patch.fields !== undefined
        ? patch.fields.map((f, i) => ({
            // Try to preserve field IDs by index so per-patient row data
            // doesn't get orphaned when only the label changes.
            id: target.fields[i]?.id ?? `f-${i}-${Math.random().toString(36).slice(2, 7)}`,
            label: f.label.trim(),
            kind: f.kind ?? "text",
          }))
        : target.fields,
    iconName: patch.iconName !== undefined ? patch.iconName : target.iconName,
    iconStyle: patch.iconStyle !== undefined ? patch.iconStyle : target.iconStyle,
    iconSvg: patch.iconSvg !== undefined ? patch.iconSvg : target.iconSvg,
  }
  const out = [...modules]
  out[idx] = next
  setModules(out)
}

export function deleteCustomModule(id: string) {
  const modules = getModules()
  const target = modules.find((m) => m.id === id)
  if (!target) return
  if (target.hasBeenUsed) {
    throw new Error("Cannot delete a custom module that has been used")
  }
  setModules(modules.filter((m) => m.id !== id))
  // Drop the layout entry too.
  const cfg = getConfig()
  const fullId = `custom:${id}`
  const filtered = cfg.rxpad.filter((s) => s.id !== fullId)
  if (filtered.length !== cfg.rxpad.length) {
    setConfig({ ...cfg, rxpad: filtered })
  }
}

export function markModuleUsed(id: string) {
  const modules = getModules()
  const idx = modules.findIndex((m) => m.id === id)
  if (idx === -1) return
  if (modules[idx].hasBeenUsed) return
  const next = [...modules]
  next[idx] = { ...next[idx], hasBeenUsed: true }
  setModules(next)
}

export function resetLayoutToDefaults() {
  // Layout-only reset. Custom modules are preserved; their entries get
  // re-appended at the end of the rxpad list with enabled: true.
  const customIds = getModules().map((m) => m.id)
  const customRows: RxLayoutItem[] = customIds.map((cid) => ({
    id: `custom:${cid}` as RxSectionId,
    enabled: true,
    kind: "custom",
  }))
  setConfig({
    sidebar: DEFAULT_SIDEBAR.map((d) => ({ ...d })),
    rxpad: [...DEFAULT_RXPAD.map((d) => ({ ...d })), ...customRows],
  })
}

// ── Autocomplete suggestions ─────────────────────────────────────────────
//
// Stored as a flat map { `${moduleId}:${fieldId}`: string[] }. Suggestions
// are deduplicated case-insensitively and capped per field so the
// dropdown stays usable.

const AUTOCOMPLETE_PER_FIELD_CAP = 30

type AutocompleteMap = Record<string, string[]>

let cachedAutocomplete: AutocompleteMap | null = null

function getAutocompleteMap(): AutocompleteMap {
  if (cachedAutocomplete) return cachedAutocomplete
  cachedAutocomplete = readJSON<AutocompleteMap>(KEY_AUTOCOMPLETE) ?? {}
  return cachedAutocomplete
}

export function appendAutocompleteValue(
  moduleId: string,
  fieldId: string,
  value: string,
) {
  const trimmed = value.trim()
  if (!trimmed) return
  const map = getAutocompleteMap()
  const k = `${moduleId}:${fieldId}`
  const existing = map[k] ?? []
  // Dedup case-insensitively, most-recent first.
  const dedup = [trimmed, ...existing.filter((v) => v.toLowerCase() !== trimmed.toLowerCase())]
  map[k] = dedup.slice(0, AUTOCOMPLETE_PER_FIELD_CAP)
  cachedAutocomplete = { ...map }
  writeJSON(KEY_AUTOCOMPLETE, cachedAutocomplete)
}

export function getAutocompleteSuggestions(
  moduleId: string,
  fieldId: string,
  query?: string,
): string[] {
  const map = getAutocompleteMap()
  const all = map[`${moduleId}:${fieldId}`] ?? []
  const q = (query ?? "").trim().toLowerCase()
  if (!q) return all
  return all.filter((v) => v.toLowerCase().includes(q))
}
