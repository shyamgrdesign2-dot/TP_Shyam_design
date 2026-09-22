import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrescriptionEmptyLineRow, PrescriptionEmptyLineDraftSearch, createPrescriptionSearchHeading, usePrescriptionNewEmptyLineUi } from './PrescriptionEmptyLineUi';
import { message } from 'antd';

jest.mock('../utils/utils', () => ({ removeBeforeWhiteSpace: value => value.trimStart() }));

beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({matches:false,addListener:()=>{},removeListener:()=>{}}));
});

test('empty action cells including nested medication cells show an inert delete button', () => {
  render(<PrescriptionEmptyLineRow><div><div className="tesseract-ct-sticky-action" /></div></PrescriptionEmptyLineRow>);
  expect(screen.getByRole('button', {name:'Delete row'})).toBeDisabled();
});

test('committing a draft mounts the row and focuses its first detail field', async () => {
  function Harness() {
    const [rows, setRows] = React.useState([]);
    const draft = usePrescriptionNewEmptyLineUi({rows, setRows, useTesseractUi:true, nameField:'name', rowKeyPrefix:'test',
      createCommittedRow: source => source, createCustomRow: name => ({name})});
    return <div>
      {rows.map(row => <div key={row.name} className="symptoms-table-row"><div /><div>{row.name}</div><div><input aria-label="New Since" /></div></div>)}
      <div className="prescription-empty-line-row--draft"><div ref={draft.draftInputRef}><input aria-label="New name" /></div></div>
      <button onClick={() => draft.onDraftSelect('Example', {key:'{"name":"Example"}'})}>Choose</button>
    </div>;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button',{name:'Choose'}));
  await waitFor(() => expect(screen.getByLabelText('New Since')).toHaveFocus());
});

test('frequently used is a disabled heading and keyboard selection reaches the first real option', async () => {
  const onSelect = jest.fn();
  render(<PrescriptionEmptyLineDraftSearch options={[createPrescriptionSearchHeading(), {value:'Headache',label:'Headache'}]}
    onSearch={jest.fn()} onSelect={onSelect} onInputKeyDown={jest.fn()} />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  const heading = await screen.findByTitle('FREQUENTLY USED');
  expect(heading).toHaveClass('ant-select-item-option-disabled');
  fireEvent.click(heading);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('combobox'), {key:'Enter',keyCode:13});
  expect(onSelect).toHaveBeenCalledWith('Headache', expect.objectContaining({value:'Headache'}));
});

test('clicking a locked detail cell focuses search, opens suggestions and can reopen them', async () => {
  const showInfo = jest.spyOn(message, 'info').mockImplementation(() => {});
  render(<PrescriptionEmptyLineRow>
    <div className="ant-col prescription-empty-line-cell--draft-active">
      <PrescriptionEmptyLineDraftSearch options={[{value:'Headache',label:'Headache'}]}
        onSearch={jest.fn()} onSelect={jest.fn()} onInputKeyDown={jest.fn()} />
    </div>
    <div className="ant-col" data-testid="notes-cell"><input disabled placeholder="Notes" className="prescription-empty-line-draft-disabled-control" /></div>
  </PrescriptionEmptyLineRow>);
  fireEvent.pointerDown(screen.getByTestId('notes-cell'));
  fireEvent.click(screen.getByTestId('notes-cell'));
  expect(screen.getByRole('combobox')).toHaveFocus();
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  await waitFor(() => expect(screen.getByTitle('Headache')).toBeVisible());
  expect(showInfo).toHaveBeenCalledWith({ key: 'prescription-add-name', content: 'Enter the name to fill in all other details.' });
  expect(screen.getByPlaceholderText('Notes')).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('combobox'), {key:'Escape',keyCode:27});
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false'));
  fireEvent.click(screen.getByTestId('notes-cell'));
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  showInfo.mockRestore();
});

test('dropdown keyboard hints stay inside the popup and arrows select the highlighted option', async () => {
  const onSelect=jest.fn(), fallback=jest.fn();
  render(<PrescriptionEmptyLineDraftSearch options={[createPrescriptionSearchHeading(),{value:'One',label:'One'},{value:'Two',label:'Two'}]} onSearch={jest.fn()} onSelect={onSelect} onInputKeyDown={fallback} />);
  expect(screen.queryByLabelText('Keyboard shortcuts')).not.toBeInTheDocument();
  const input=screen.getByRole('combobox');
  fireEvent.mouseDown(input);
  expect(await screen.findByLabelText('Keyboard shortcuts')).toBeInTheDocument();
  fireEvent.keyDown(input,{key:'ArrowDown',keyCode:40});
  fireEvent.keyDown(input,{key:'Enter',keyCode:13});
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('Two',expect.objectContaining({value:'Two'}));
  fireEvent.mouseDown(input);
  fireEvent.keyDown(input,{key:'Escape',keyCode:27});
  expect(input).toHaveAttribute('aria-expanded','false');
});


test('editing a committed row keeps focus and its DOM input through immutable updates and reorder', () => {
  function Harness() {
    const [rows, setRows] = React.useState([{name:'First'}, {name:'Second'}]);
    const ui = usePrescriptionNewEmptyLineUi({rows, setRows, useTesseractUi:true, nameField:'name', rowKeyPrefix:'focus'});
    return <><div>{rows.map((row,index) => <input key={ui.getRowKey(row,index)} aria-label={index === 0 ? 'First input' : 'Second input'} value={row.name}
      onChange={event => setRows(previous => previous.map((item,i) => i === index ? {...item,name:event.target.value} : item))} />)}</div>
      <button onClick={() => setRows(previous => [...previous].reverse())}>Reorder</button></>;
  }
  render(<Harness />);
  const input=screen.getByLabelText('First input');
  input.focus();
  for (const value of ['d','di','dia','diasm']) {
    fireEvent.change(input,{target:{value}});
    expect(input).toHaveFocus();
    expect(screen.getByLabelText('First input')).toBe(input);
  }
  fireEvent.click(screen.getByRole('button',{name:'Reorder'}));
  expect(screen.getByLabelText('Second input')).toBe(input);
  expect(input).toHaveValue('diasm');
});
