const ROWS = '.symptoms-table-row, .taper-dose, tr, .ant-row';
const FIELDS = 'input:not([type="hidden"]), textarea, [role="combobox"][tabindex]';

function rowFor(field) {
  return field.closest('.symptoms-table-row, .taper-dose, tr') || field.closest('.ant-row');
}

function fieldsIn(row) {
  return [...row.querySelectorAll(FIELDS)].filter(field =>
    rowFor(field) === row && !field.disabled &&
    (!field.readOnly || field.getAttribute('role') === 'combobox') &&
    !field.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]') &&
    field.getClientRects().length > 0
  );
}

function columnOf(field, row) {
  let cell = field;
  while (cell.parentElement && cell.parentElement !== row) cell = cell.parentElement;
  return [...row.children].indexOf(cell);
}

function canLeaveText(field, key) {
  if (field.readOnly || !field.value) return true;
  const { selectionStart: start, selectionEnd: end, value } = field;
  if (start == null) return true;
  if (start !== end) return false;
  if (key === 'ArrowLeft') return start === 0;
  if (key === 'ArrowRight') return end === value.length;
  // Keep vertical cursor movement within multiline notes, including wrapped lines.
  if (field.tagName === 'TEXTAREA') return key === 'ArrowUp' ? start === 0 : end === value.length;
  return true;
}

// Shared by the Rx pad's Ant rows, medication rows and native/custom tables.
// Run in capture so rc-select does not open a popup after focus has moved.
export function navigatePrescriptionTable(event) {
  const rowEdge = event.altKey && ['Home', 'End'].includes(event.key);
  if ((!rowEdge && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) ||
      event.defaultPrevented || event.isComposing || event.keyCode === 229 ||
      (event.altKey && !rowEdge) || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const field = event.target;
  const table = event.currentTarget;
  if (!field.matches?.(FIELDS)) return;
  const row = rowFor(field);
  if (!row || !table.contains(row)) return;
  if (event.key === 'Escape') {
    // Let the dropdown's own Escape handler close controlled/portaled popups,
    // then leave the field as well. Do not erase or commit the typed value.
    setTimeout(() => { if (document.activeElement === field) field.blur(); }, 0);
    return;
  }
  const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
  // Up/Down belong to an open dropdown. Left/Right may leave it at text edges.
  if (!horizontal && !rowEdge && (field.getAttribute('aria-expanded') === 'true' ||
      field.closest('[aria-expanded="true"], .ant-select-open, .custom-module-v2__table-row--dropdown-open'))) return;
  if (!rowEdge && !canLeaveText(field, event.key)) return;
  const fields = fieldsIn(row);
  const fieldIndex = fields.indexOf(field);
  if (fieldIndex < 0) return;
  const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
  let next;
  if (rowEdge) {
    next = event.key === 'Home' ? fields[0] : fields[fields.length - 1];
  } else if (horizontal) {
    next = fields[fieldIndex + direction];
  } else {
    const rows = [...table.querySelectorAll(ROWS)].filter(candidate => fieldsIn(candidate).length > 0);
    const nextRow = rows[rows.indexOf(row) + direction];
    if (nextRow) {
      const candidates = fieldsIn(nextRow);
      const column = columnOf(field, row);
      // Medication details can contain multiple controls inside one outer cell.
      const offset = fields.filter(candidate => columnOf(candidate, row) === column).indexOf(field);
      next = candidates.filter(candidate => columnOf(candidate, nextRow) === column)[offset] || candidates[0];
    }
  }
  if (!next) return;
  event.preventDefault();
  event.stopPropagation();
  next.focus();
}
