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
















const STORAGE_KEY = "tp.module-templates.v1";

// ── Pub/sub ──────────────────────────────────────────────────────────────


const listeners = new Set();

export function subscribeTemplates(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let cached = null;

function notify() {
  cached = null;
  listeners.forEach((l) => l());
}

// ── Low-level I/O ────────────────────────────────────────────────────────

function readAll() {
  if (cached) return cached;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cached = [];
      return cached;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cached = [];
      return cached;
    }
    cached = parsed.filter(
      (t) =>
      !!t &&
      typeof t.id === "string" &&
      typeof t.moduleId === "string" &&
      typeof t.name === "string" &&
      Array.isArray(t.rows)
    );
    return cached;
  } catch {
    cached = [];
    return cached;
  }
}

function writeAll(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {

    /* quota — drop silently */}
}

// ── Public API ───────────────────────────────────────────────────────────

export function getAllTemplates() {
  return readAll();
}

export function getTemplatesByModule(moduleId) {
  return readAll().
  filter((t) => t.moduleId === moduleId).
  sort((a, b) => b.updatedAt - a.updatedAt);
}

function newId() {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Strip empty rows + clear any per-row id so saved templates are clean
// snapshots rather than re-imports of the doctor's current row IDs.
function sanitiseRows(rows) {
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const cleaned = {};
    let hasValue = false;
    for (const [key, value] of Object.entries(row)) {
      if (key === "id") continue;
      const v = typeof value === "string" ? value.trim() : "";
      if (v) hasValue = true;
      cleaned[key] = v;
    }
    if (hasValue) out.push(cleaned);
  }
  return out;
}

export function addTemplate(input)




{
  const cleaned = sanitiseRows(input.rows);
  if (!cleaned.length) return null;
  const now = Date.now();
  const tpl = {
    id: newId(),
    moduleId: input.moduleId,
    moduleName: input.moduleName,
    name: input.name.trim(),
    rows: cleaned,
    createdAt: now,
    updatedAt: now
  };
  writeAll([...readAll(), tpl]);
  notify();
  return tpl;
}

export function updateTemplate(id, patch) {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const current = all[idx];
  const next = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    rows: patch.rows !== undefined ? sanitiseRows(patch.rows) : current.rows,
    updatedAt: Date.now()
  };
  const out = [...all];
  out[idx] = next;
  writeAll(out);
  notify();
  return next;
}

export function deleteTemplate(id) {
  const all = readAll();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return;
  writeAll(next);
  notify();
}

// Name-uniqueness guard scoped per module.
export function isTemplateNameTaken(moduleId, name, excludingId) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return false;
  return readAll().some(
    (t) => t.moduleId === moduleId && t.id !== excludingId && t.name.trim().toLowerCase() === trimmed
  );
}