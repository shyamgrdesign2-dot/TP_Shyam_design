/* Scroll-shadow driver for Tesseract-skinned RxPad tables.
   Mirrors ClinicalTable's behavior exactly: the pinned action column shows a
   left fade ONLY while content is scrolled behind it — i.e. whenever the
   table overflows and is not scrolled fully right (visible on load, gone at
   the right end). Attach as a ref callback on the `.tesseract-ct` wrapper. */

export function attachTesseractCtBehind(el) {
  if (!el || el.__tpCtBehindAttached) return;
  el.__tpCtBehindAttached = true;

  const update = () => {
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.toggleAttribute("data-behind", maxScroll > 1 && el.scrollLeft < maxScroll - 1);
  };

  update();
  el.addEventListener("scroll", update, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Rows mounting/unmounting change scrollWidth without resizing `el`;
    // watching the row container catches those.
    if (el.firstElementChild) ro.observe(el.firstElementChild);
  }
}
