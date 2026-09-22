import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { attachTesseractCtBehind, focusNewPrescriptionRow } from './tesseractCt';

test('scroll shadows reflect hidden content on either side and disappear at the edges', () => {
  const el = document.createElement('div');
  Object.defineProperties(el, {scrollWidth:{value:1000},clientWidth:{value:500}});
  attachTesseractCtBehind(el);
  expect(el.hasAttribute('data-behind')).toBe(true);
  expect(el.hasAttribute('data-behind-left')).toBe(false);
  el.scrollLeft = 200; fireEvent.scroll(el);
  expect(el.hasAttribute('data-behind-left')).toBe(true);
  expect(el.style.getPropertyValue('--tp-ct-scroll-left')).toBe('200px');
  el.scrollLeft = 500; fireEvent.scroll(el);
  expect(el.hasAttribute('data-behind')).toBe(false);
  expect(el.hasAttribute('data-behind-left')).toBe(true);
  el.scrollLeft = 0; fireEvent.scroll(el);
  expect(el.hasAttribute('data-behind-left')).toBe(false);
});

test('new rows focus Since and Enter advances single-line fields while Notes keeps line breaks', async () => {
  render(<div ref={attachTesseractCtBehind}>
    <div>
      <div className="symptoms-table-row">
        <div />
        <div><input aria-label="Name" /></div>
        <div><input aria-label="Since" /></div>
        <div><input aria-label="Severity" /></div>
        <div><textarea aria-label="Notes" /></div>
      </div>
      <div className="symptoms-table-row prescription-empty-line-row--draft"><input aria-label="Search & add" /></div>
    </div>
  </div>);
  expect(focusNewPrescriptionRow(screen.getByLabelText('Search & add'))).toBe(true);
  expect(screen.getByLabelText('Since')).toHaveFocus();
  fireEvent.keyDown(screen.getByLabelText('Since'), {key:'Enter'});
  await waitFor(() => expect(screen.getByLabelText('Severity')).toHaveFocus());
  fireEvent.keyDown(screen.getByLabelText('Severity'), {key:'Enter'});
  await waitFor(() => expect(screen.getByLabelText('Notes')).toHaveFocus());
  expect(fireEvent.keyDown(screen.getByLabelText('Notes'), {key:'Enter'})).toBe(true);
  expect(screen.getByLabelText('Notes')).toHaveFocus();
});

test('medication navigation enters nested dosage cells and skips disabled fields', async () => {
  render(<div ref={attachTesseractCtBehind}><div>
    <div className="taper-dose"><div /><div>Medicine</div><div>
      <div><input aria-label="Dose" /><input disabled aria-label="Disabled" /><input aria-label="Frequency" /></div>
    </div></div>
    <div className="taper-dose prescription-empty-line-row--draft"><input aria-label="Add medicine" /></div>
  </div></div>);
  focusNewPrescriptionRow(screen.getByLabelText('Add medicine'));
  expect(screen.getByLabelText('Dose')).toHaveFocus();
  fireEvent.keyDown(screen.getByLabelText('Dose'), {key:'Enter',isComposing:true});
  expect(screen.getByLabelText('Dose')).toHaveFocus();
  fireEvent.keyDown(screen.getByLabelText('Dose'), {key:'Enter'});
  await waitFor(() => expect(screen.getByLabelText('Frequency')).toHaveFocus());
});
