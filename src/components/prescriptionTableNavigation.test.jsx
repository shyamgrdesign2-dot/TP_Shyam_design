import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoComplete } from 'antd';
import { attachTesseractCtBehind } from './tesseractCt';

beforeEach(() => jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}]));
afterEach(() => jest.restoreAllMocks());

function setup() {
  render(<div ref={attachTesseractCtBehind}>
    <div className="ant-row symptoms-table-row">
      <div><input aria-label="Name" /></div>
      <div><input aria-label="Since" /></div>
      <div><input aria-label="Status" role="combobox" readOnly /></div>
      <div><textarea aria-label="Notes" /></div>
    </div>
    <div className="ant-row symptoms-table-row">
      <div><input aria-label="Second name" /></div>
      <div><input aria-label="Second since" /></div>
      <div><input aria-label="Second status" disabled /></div>
      <div><textarea aria-label="Second notes" /></div>
    </div>
    <div className="ant-row symptoms-table-row prescription-empty-line-row--draft">
      <div><input aria-label="Search & add" /></div>
      <div><input aria-label="Disabled since" disabled /></div>
    </div>
  </div>);
}
function arrow(label, key, extra = {}) {
  const field = screen.getByLabelText(label);
  field.focus();
  return fireEvent.keyDown(field, { key, ...extra });
}

test('Left/Right move between enabled fields, including readonly select controls', () => {
  setup();
  arrow('Since', 'ArrowRight'); expect(screen.getByLabelText('Status')).toHaveFocus();
  arrow('Status', 'ArrowLeft'); expect(screen.getByLabelText('Since')).toHaveFocus();
  arrow('Second since', 'ArrowRight'); expect(screen.getByLabelText('Second notes')).toHaveFocus();
});

test('Up/Down preserve the column and fall back to Search & add in the draft row', () => {
  setup();
  arrow('Since', 'ArrowDown'); expect(screen.getByLabelText('Second since')).toHaveFocus();
  arrow('Second since', 'ArrowDown'); expect(screen.getByLabelText('Search & add')).toHaveFocus();
  arrow('Search & add', 'ArrowUp'); expect(screen.getByLabelText('Second name')).toHaveFocus();
  arrow('Name', 'ArrowUp'); expect(screen.getByLabelText('Name')).toHaveFocus();
});

test('open dropdowns keep Up/Down but allow horizontal navigation to adjacent cells', () => {
  setup();
  screen.getByLabelText('Since').setAttribute('aria-expanded', 'true');
  expect(arrow('Since', 'ArrowDown')).toBe(true);
  expect(screen.getByLabelText('Since')).toHaveFocus();
  arrow('Since', 'ArrowRight'); expect(screen.getByLabelText('Status')).toHaveFocus();
});

test('text cursor, selection, multiline notes, modifiers and IME are preserved', () => {
  setup();
  const since = screen.getByLabelText('Since');
  fireEvent.change(since, {target: {value: '3 days'}});
  since.setSelectionRange(2, 2);
  expect(arrow('Since', 'ArrowRight')).toBe(true);
  since.setSelectionRange(0, 3);
  expect(arrow('Since', 'ArrowLeft')).toBe(true);
  since.setSelectionRange(6, 6);
  arrow('Since', 'ArrowRight'); expect(screen.getByLabelText('Status')).toHaveFocus();
  const notes = screen.getByLabelText('Notes');
  fireEvent.change(notes, {target: {value: 'First line\nSecond line'}});
  notes.setSelectionRange(4, 4);
  expect(arrow('Notes', 'ArrowDown')).toBe(true);
  expect(arrow('Since', 'ArrowDown', {shiftKey: true})).toBe(true);
  expect(arrow('Since', 'ArrowDown', {isComposing: true})).toBe(true);
});

test('native custom tables navigate across and between rows, skipping hidden controls', () => {
  render(<div ref={attachTesseractCtBehind}><table><tbody>
    <tr><td><input aria-label="OD" /></td><td hidden><input aria-label="Hidden" /></td><td><input aria-label="OD near" /></td></tr>
    <tr><td><input aria-label="OS" /></td><td hidden /><td><input aria-label="OS near" /></td></tr>
  </tbody></table></div>);
  arrow('OD', 'ArrowRight'); expect(screen.getByLabelText('OD near')).toHaveFocus();
  arrow('OD near', 'ArrowDown'); expect(screen.getByLabelText('OS near')).toHaveFocus();
});

test('Alt+Home/End jump to row edges while plain Home/End and Tab stay native', () => {
  setup();
  arrow('Since', 'End', {altKey: true}); expect(screen.getByLabelText('Notes')).toHaveFocus();
  arrow('Notes', 'Home', {altKey: true}); expect(screen.getByLabelText('Name')).toHaveFocus();
  expect(arrow('Since', 'Home')).toBe(true);
  expect(arrow('Since', 'Tab')).toBe(true);
  expect(arrow('Since', 'Tab', {shiftKey: true})).toBe(true);
});

test('nested medication controls retain their logical column when changing rows', () => {
  render(<div ref={attachTesseractCtBehind}>{[1, 2].map(index => <div className="taper-dose" key={index}>
    <div>Medicine</div><div><div className="ant-row">
      <input aria-label={`Dose ${index}`} /><input aria-label={`Frequency ${index}`} />
    </div></div>
  </div>)}</div>);
  arrow('Frequency 1', 'ArrowDown'); expect(screen.getByLabelText('Frequency 2')).toHaveFocus();
});

test('Escape closes an Ant dropdown and removes focus without selecting a suggestion', async () => {
  const onSelect = jest.fn();
  render(<div ref={attachTesseractCtBehind}><div className="ant-row">
    <div><AutoComplete aria-label="Search diagnosis" options={[{value: 'Example'}]} onSelect={onSelect} /></div>
  </div></div>);
  const field = screen.getByRole('combobox');
  field.focus();
  fireEvent.change(field, {target: {value: 'Exam'}});
  await waitFor(() => expect(field).toHaveAttribute('aria-expanded', 'true'));
  fireEvent.keyDown(field, {key: 'Escape', keyCode: 27});
  await waitFor(() => expect(field).not.toHaveFocus());
  expect(field).toHaveAttribute('aria-expanded', 'false');
  expect(field).toHaveValue('Exam');
  expect(onSelect).not.toHaveBeenCalled();
});
