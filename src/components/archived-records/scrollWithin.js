// Scroll `node` into view by moving only `container`. Element.scrollIntoView
// also scrolls every scrollable ancestor, which on the patient page nudges the
// whole page behind the workspace.
export function scrollWithin(container, node, { align = "start", offset = 0, smooth = false } = {}) {
  if (!container || !node) return;
  const top = node.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  const target = align === "center" ? top - (container.clientHeight - node.offsetHeight) / 2 : top - offset;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  container.scrollTo({ top: Math.max(0, target), behavior: smooth && !reduce ? "smooth" : "auto" });
}
