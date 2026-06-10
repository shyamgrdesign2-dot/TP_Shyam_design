/**
 * Medication inventory model
 * ─────────────────────────────
 * Tags each medication in the search catalogue with:
 *   • source — "MOG" (your own formulary) or "VC" (e-Vitals reference catalogue)
 *   • stock  — units available at the dispensary
 *   • class  — drug class used to compute in-stock alternatives
 *
 * Exposes:
 *   • MEDICATION_INVENTORY — flat array (also includes alt-only entries)
 *   • MEDICATION_NAMES     — the names array used to drive the search suggestions
 *   • getInventoryByName(name)
 *   • getStockStatus(inv)  → "in" | "low" | "out"
 *   • getStockLabel(inv)   → "In stock · 42" / "Low stock · 3" / "Out of stock"
 *   • getAlternativesFor(name, limit = 5) → up to N in-stock entries in the same class
 *
 * The mock data covers every state combination (MOG / VC × in / low / out) so the
 * UI is exercised end-to-end.
 */

const LOW_THRESHOLD = 5;

export const MEDICATION_INVENTORY = [
  // ─── Main catalogue (appears in the doctor's search suggestions) ────────────
  { name: "Paracetamol 650mg Tablet",      generic: "Paracetamol",                            source: "MOG", stock: 42,  class: "analgesic" },
  { name: "Azithromycin 500mg Tablet",     generic: "Azithromycin",                           source: "MOG", stock: 18,  class: "antibiotic" },
  { name: "Pantoprazole 40mg Tablet",      generic: "Pantoprazole",                           source: "MOG", stock: 22,  class: "ppi" },
  { name: "Cetirizine 10mg Tablet",        generic: "Cetirizine Hydrochloride",               source: "VC",  stock: 0,   class: "antihistamine" },
  { name: "Ondansetron 4mg Tablet",        generic: "Ondansetron",                            source: "MOG", stock: 24,  class: "antiemetic" },
  { name: "Dolo 650 Tablet",               generic: "Paracetamol",                            source: "MOG", stock: 56,  class: "analgesic" },
  { name: "Ibuprofen 400mg Tablet",        generic: "Ibuprofen",                              source: "MOG", stock: 4,   class: "analgesic" },
  { name: "Amoxicillin 500mg Capsule",     generic: "Amoxicillin",                            source: "VC",  stock: 0,   class: "antibiotic" },
  { name: "Levocetirizine 5mg Tablet",     generic: "Levocetirizine",                         source: "MOG", stock: 22,  class: "antihistamine" },
  { name: "Montelukast 10mg Tablet",       generic: "Montelukast Sodium",                     source: "MOG", stock: 11,  class: "antihistamine" },
  { name: "ORS Sachet",                    generic: "Oral Rehydration Salts",                 source: "MOG", stock: 200, class: "supplement" },
  { name: "Vitamin D3 60000 IU Capsule",   generic: "Cholecalciferol",                        source: "VC",  stock: 2,   class: "supplement" },
  { name: "Calcium + Vitamin D Tablet",    generic: "Calcium Carbonate + Cholecalciferol",    source: "MOG", stock: 32,  class: "supplement" },
  { name: "Metformin 500mg Tablet",        generic: "Metformin Hydrochloride",                source: "MOG", stock: 60,  class: "diabetes" },
  { name: "Amlodipine 5mg Tablet",         generic: "Amlodipine Besilate",                    source: "VC",  stock: 15,  class: "antihypertensive" },

  // ─── Alternative-only entries (surfaced when "Show alternatives" is opened) ─
  { name: "Crocin 500mg Tablet",           generic: "Paracetamol",                            source: "MOG", stock: 75,  class: "analgesic" },
  { name: "Roxithromycin 150mg Tablet",    generic: "Roxithromycin",                          source: "MOG", stock: 28,  class: "antibiotic" },
  { name: "Cefixime 200mg Tablet",         generic: "Cefixime",                               source: "VC",  stock: 14,  class: "antibiotic" },
  { name: "Fexofenadine 120mg Tablet",     generic: "Fexofenadine Hydrochloride",             source: "VC",  stock: 19,  class: "antihistamine" },
  { name: "Multivitamin Tablet",           generic: "Multivitamin + Minerals",                source: "MOG", stock: 38,  class: "supplement" }
];

// Public catalogue (the existing `medicationSuggestions`) — first 15 entries.
export const MEDICATION_NAMES = MEDICATION_INVENTORY.slice(0, 15).map((m) => m.name);

const BY_NAME = new Map(MEDICATION_INVENTORY.map((m) => [m.name, m]));

/** Look up the inventory record for an exact medication name. */
export function getInventoryByName(name) {
  if (!name) return null;
  return BY_NAME.get(String(name).trim()) ?? null;
}

/** "in" | "low" | "out" — derived purely from stock + threshold. */
export function getStockStatus(inv) {
  if (!inv) return null;
  if (inv.stock <= 0) return "out";
  if (inv.stock <= LOW_THRESHOLD) return "low";
  return "in";
}

/** Short label for the stock pill (no count when out of stock). */
export function getStockLabel(inv) {
  const status = getStockStatus(inv);
  if (status === "out") return "Out of stock";
  if (status === "low") return `Low stock · ${inv.stock}`;
  if (status === "in") return `In stock · ${inv.stock}`;
  return "";
}

/**
 * Up to `limit` in-stock alternatives for a given medicine — same class,
 * excludes the medicine itself, sorted by descending stock so the best-stocked
 * options surface first.
 */
export function getAlternativesFor(name, limit = 5) {
  const target = getInventoryByName(name);
  if (!target) return [];
  return MEDICATION_INVENTORY
    .filter((m) => m.name !== target.name && m.class === target.class && getStockStatus(m) === "in")
    .sort((a, b) => b.stock - a.stock)
    .slice(0, limit);
}
