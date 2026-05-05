/**
 * Hand-rolled `cn` — class-name composer. Replaces clsx + tailwind-merge.
 *
 *   cn("p-2", isActive && "bg-blue-500", { "text-white": ok })
 *
 * Behaviour:
 *   1. Flattens arrays / falsy values / objects (clsx-equivalent).
 *   2. De-duplicates conflicting Tailwind utility classes for a CURATED
 *      set of high-confidence groups (padding, margin, width, height,
 *      gap, position offsets, display, flex/grid alignment). For
 *      everything else, classes pass through unchanged — Tailwind's CSS
 *      already disambiguates because text-size / text-color /
 *      text-align target different properties.
 *
 * Non-goals: full twMerge replication. The previous attempt collapsed
 * `text-[12px]` and `text-tp-slate-700` into one group, dropping the
 * size class. We don't try to be smart about prefixes that span
 * multiple CSS properties — passing through is safer.
 */

const CONFLICT_GROUPS = [
  // Padding / margin (single-axis only — these reliably collide)
  /^p-/, /^px-/, /^py-/, /^pt-/, /^pr-/, /^pb-/, /^pl-/, /^ps-/, /^pe-/,
  /^m-/, /^mx-/, /^my-/, /^mt-/, /^mr-/, /^mb-/, /^ml-/, /^ms-/, /^me-/,
  // Width / height
  /^w-/, /^min-w-/, /^max-w-/, /^h-/, /^min-h-/, /^max-h-/,
  // Gap / space-between
  /^gap-/, /^gap-x-/, /^gap-y-/, /^space-x-/, /^space-y-/,
  // Position offsets
  /^top-/, /^right-/, /^bottom-/, /^left-/, /^inset-/, /^inset-x-/, /^inset-y-/,
  // Z-index, opacity
  /^z-/, /^opacity-/,
  // Display (one of: block, inline-block, flex, hidden, grid, etc.)
  /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/,
  // Position (static/fixed/absolute/relative/sticky)
  /^(static|fixed|absolute|relative|sticky)$/,
];

function classGroup(token) {
  for (const re of CONFLICT_GROUPS) {
    if (re.test(token)) return re.source;
  }
  return null;
}

function flatten(input, out) {
  if (input === null || input === undefined || input === false || input === true) return;
  if (typeof input === "string" || typeof input === "number") {
    out.push(String(input));
    return;
  }
  if (Array.isArray(input)) {
    for (const x of input) flatten(x, out);
    return;
  }
  if (typeof input === "object") {
    for (const key in input) {
      if (input[key]) out.push(key);
    }
  }
}

export function cn(...inputs) {
  const parts = [];
  flatten(inputs, parts);
  const tokens = parts.flatMap((s) => s.split(/\s+/)).filter(Boolean);

  // For tokens in a known conflict group: last-wins. For everything
  // else (including all text-*, bg-*, border-*, rounded-*, shadow-*,
  // ring-*, transition-*, hover:*, focus:*, etc.): pass through in
  // source order — Tailwind's CSS layer ordering disambiguates them.
  const seen = new Map();
  const passthrough = [];
  for (const tok of tokens) {
    const group = classGroup(tok);
    if (group) {
      seen.set(group, tok);
    } else {
      passthrough.push(tok);
    }
  }
  return [...passthrough, ...seen.values()].join(" ");
}

export function safeClipboardWrite(text) {
  try {
    const result = navigator.clipboard?.writeText(text);
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {
    /* permission denied (synchronous throw) */
  }
}
