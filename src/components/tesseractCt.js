/* Scroll-shadow driver for Tesseract-skinned RxPad tables.
   Mirrors ClinicalTable's behavior exactly: the pinned action column shows a
   left fade ONLY while content is scrolled behind it — i.e. whenever the
   table overflows and is not scrolled fully right (visible on load, gone at
   the right end). Attach as a ref callback on the `.tesseract-ct` wrapper. */

import { navigatePrescriptionTable } from './prescriptionTableNavigation';

const rowSelector = '.symptoms-table-row, .taper-dose';

function editableFields(container) {
  return [...container.querySelectorAll('input, textarea')].filter(field =>
    !field.disabled && field.type !== 'hidden' && !field.closest('[aria-hidden="true"]')
  );
}

export function focusNewPrescriptionRow(draftInput) {
  const draftRow = draftInput?.closest('.prescription-empty-line-row--draft');
  const rows = draftRow?.parentElement?.querySelectorAll(rowSelector);
  const committed = [...(rows || [])].filter(row => !row.classList.contains('prescription-empty-line-row--draft'));
  const newRow = committed.at(-1);
  // Drag and name occupy the first two cells. Details start in the third.
  const detailCell = newRow?.children[2];
  const field = detailCell && editableFields(detailCell)[0];
  field?.focus();
  return Boolean(field);
}

export function advancePrescriptionField(event) {
  if (event.key !== 'Enter' || event.isComposing || event.shiftKey || event.ctrlKey || event.metaKey) return;
  const field = event.target;
  // Preserve multiline editing and the draft name's own commit handler.
  if (field.tagName !== 'INPUT') return;
  const row = field.closest(rowSelector);
  if (!row || row.classList.contains('prescription-empty-line-row--draft')) return;
  const fields = editableFields(row);
  const next = fields[fields.indexOf(field) + 1];
  if (next) {
    // Allow antd's Enter selection and React's value update to finish first.
    setTimeout(() => { if (next.isConnected) next.focus(); }, 0);
  }
}

export function attachTesseractCtBehind(el) {
  if (!el || el.__tpCtBehindAttached) return;
  el.__tpCtBehindAttached = true;

  const update = () => {
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.toggleAttribute("data-behind", maxScroll > 1 && el.scrollLeft < maxScroll - 1);
    el.toggleAttribute('data-behind-left', maxScroll > 1 && el.scrollLeft > 1);
    el.style.setProperty('--tp-ct-scroll-left', `${Math.max(0, el.scrollLeft)}px`);
  };

  update();
  el.addEventListener("scroll", update, { passive: true });
  el.addEventListener("keydown", advancePrescriptionField);
  el.addEventListener("keydown", navigatePrescriptionTable, true);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Rows mounting/unmounting change scrollWidth without resizing `el`;
    // watching the row container catches those.
    if (el.firstElementChild) ro.observe(el.firstElementChild);
  }
}
