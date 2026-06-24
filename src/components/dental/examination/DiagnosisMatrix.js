/**
 * Single source of truth for tooth-level diagnosis compatibility.
 *
 * Clinical mental model:
 *   - Missing / Denture / Bridge stand alone — nothing else coexists.
 *   - Implant replaces a tooth → compatible only with Crown (implant-supported crown).
 *   - RCT is endodontic treatment → compatible only with Crown (post-endo crown).
 *   - Crown sits on an implant OR on a root-treated tooth.
 *
 * Chips are NEVER disabled in the UI. Clicking a diagnosis auto-removes any
 * currently-set diagnosis that is not in its allow-list. This mirrors how a
 * dentist mentally re-classifies the same tooth.
 */
const COMPATIBLE = {
  Missing: [],
  Denture: [],
  Bridge:  [],
  Implant: ["Crown"],
  RCT:     ["Crown"],
};

export function applyDiagnosisSelection(current, clicked) {
  const next = new Set(current);
  // Toggle-off: clicking an already-active diagnosis removes it.
  if (next.has(clicked)) {
    next.delete(clicked);
    return next;
  }
  // Compatibility rules only apply between COMPATIBLE-tracked procedures.
  // Catalog procedures not in the map are purely additive.
  if (clicked in COMPATIBLE) {
    const allowed = new Set(COMPATIBLE[clicked] ?? []);
    for (const d of Array.from(next)) {
      if (d in COMPATIBLE && !allowed.has(d)) next.delete(d);
    }
  }
  next.add(clicked);
  return next;
}

/** For introspection / testing. */
export function isCompatible(a, b) {
  if (a === b) return false;
  return (COMPATIBLE[a] ?? []).includes(b) || (COMPATIBLE[b] ?? []).includes(a);
}
