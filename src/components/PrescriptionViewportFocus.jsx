import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RX_ROUTES = new Set(['/prescription', '/smart-prescription', '/snap-rx', '/snap-rx/digitise', '/smart-rx-digitise']);
const FIELD_SELECTOR = 'input:not([type="hidden"]), textarea, [contenteditable="true"]';
const SCROLLABLE = /auto|scroll/;
const GUTTER = 12;

export function viewportCorrection(start, end, visibleStart, visibleEnd) {
  if (end - start > visibleEnd - visibleStart) return start - visibleStart;
  if (start < visibleStart) return start - visibleStart;
  if (end > visibleEnd) return end - visibleEnd;
  return 0;
}

// Move only the necessary scroll containers. The visual viewport accounts for
// iPad's keyboard and zoom; layout viewport height alone does not.
export function revealPrescriptionField(field, viewport = window.visualViewport) {
  if (!field?.matches?.(FIELD_SELECTOR) || field.disabled || field.readOnly || !field.getClientRects().length) return;
  const visual = {
    top: (viewport?.offsetTop || 0) + GUTTER,
    bottom: (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - GUTTER,
    left: (viewport?.offsetLeft || 0) + GUTTER,
    right: (viewport?.offsetLeft || 0) + (viewport?.width || window.innerWidth) - GUTTER,
  };
  // Portaled dialogs have their own scrolling and aren't covered by the page header.
  if (!field.closest('[role="dialog"], .ant-drawer, .ant-modal, .ant-popover')) {
    const header = document.querySelector('.rx-workflow-header');
    if (header && !header.contains(field)) {
      const rect = header.getBoundingClientRect();
      if (rect.top <= visual.top && rect.bottom > visual.top) visual.top = rect.bottom + GUTTER;
    }
  }
  for (let parent = field.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const scrollY = SCROLLABLE.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1;
    const scrollX = SCROLLABLE.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1;
    if (!scrollX && !scrollY) continue;
    const bounds = parent.getBoundingClientRect();
    const rect = field.getBoundingClientRect();
    const intersects = bounds.bottom > visual.top && bounds.top < visual.bottom;
    const top = intersects ? Math.max(bounds.top + GUTTER, visual.top) : bounds.top + GUTTER;
    const bottom = intersects ? Math.min(bounds.bottom - GUTTER, visual.bottom) : bounds.bottom - GUTTER;
    // The pinned delete column must not cover a horizontally focused field.
    const action = parent.classList.contains('tesseract-ct') ? parent.querySelector('.tesseract-ct-sticky-action') : null;
    const pinnedWidth = action?.getBoundingClientRect().width || 0;
    const left = Math.max(bounds.left + GUTTER, visual.left);
    const right = Math.min(bounds.right - pinnedWidth - GUTTER, visual.right);
    const dx = scrollX && right > left ? viewportCorrection(rect.left, rect.right, left, right) : 0;
    const dy = scrollY && bottom > top ? viewportCorrection(rect.top, rect.bottom, top, bottom) : 0;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) parent.scrollBy({ left: dx, top: dy, behavior: 'auto' });
  }
  const rect = field.getBoundingClientRect();
  const page = document.scrollingElement;
  const dx = page?.scrollWidth > window.innerWidth + 1 ? viewportCorrection(rect.left, rect.right, visual.left, visual.right) : 0;
  const dy = page?.scrollHeight > window.innerHeight + 1 ? viewportCorrection(rect.top, rect.bottom, visual.top, visual.bottom) : 0;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) window.scrollBy({ left: dx, top: dy, behavior: 'auto' });
}

export function installPrescriptionViewportFocus(viewport = window.visualViewport) {
  let frame;
  let keyboardTimer;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => revealPrescriptionField(document.activeElement, viewport));
  };
  const focus = event => {
    if (!event.target.matches?.(FIELD_SELECTOR)) return;
    schedule();
    clearTimeout(keyboardTimer);
    // Recheck after the software keyboard's opening animation (including Safari
    // versions that report its final geometry only once).
    keyboardTimer = setTimeout(schedule, 350);
  };
  document.addEventListener('focusin', focus);
  window.addEventListener('resize', schedule);
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  return () => {
    document.removeEventListener('focusin', focus);
    window.removeEventListener('resize', schedule);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    cancelAnimationFrame(frame);
    clearTimeout(keyboardTimer);
  };
}

export default function PrescriptionViewportFocus() {
  const { pathname } = useLocation();
  useEffect(() => RX_ROUTES.has(pathname) ? installPrescriptionViewportFocus() : undefined, [pathname]);
  return null;
}
