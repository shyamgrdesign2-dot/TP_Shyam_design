import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@dhspl-tatvacare/tesseract-ui';
import { prescriptionHeaderActions } from './prescriptionHeaderActions';

test('draft selection uses its own handler rather than ending the visit', () => {
  const onEnd = jest.fn(); const onDraft = jest.fn();
  render(<Header actions={prescriptionHeaderActions({visit:{label:'End Visit',onClick:onEnd,menu:[{id:'draft',label:'Save as Draft',onClick:onDraft}]}})} />);
  fireEvent.click(screen.getByRole('button',{name:'More actions'}));
  expect(screen.getAllByRole('menuitem')).toEqual([
    screen.getByRole('menuitem', {name:'End Visit'}),
    screen.getByRole('menuitem', {name:'Save as Draft'}),
  ]);
  screen.getAllByRole('menuitem').forEach(item => {
    expect(item.querySelectorAll('[data-tp-icon]')).toHaveLength(1);
    expect(item.querySelector('[data-tp-icon]')).toHaveAttribute('data-tp-icon','arrow-right4/linear');
    expect(item.querySelector('svg')).toBeNull();
  });
  fireEvent.click(screen.getByRole('menuitem',{name:/Save as Draft/}));
  expect(onDraft).toHaveBeenCalledTimes(1);
  expect(onEnd).not.toHaveBeenCalled();
});

test('End Visit in the menu uses the main action and respects its availability', () => {
  const onEnd = jest.fn();
  const { rerender } = render(<Header actions={prescriptionHeaderActions({visit:{label:'End Visit',onClick:onEnd,menu:[{id:'draft',label:'Save as Draft'}]}})} />);
  fireEvent.click(screen.getByRole('button', {name:'More actions'}));
  fireEvent.click(screen.getByRole('menuitem', {name:'End Visit'}));
  expect(onEnd).toHaveBeenCalledTimes(1);
  rerender(<Header actions={prescriptionHeaderActions({visit:{label:'End Visit',onClick:onEnd,endVisitDisabled:true,menu:[{id:'draft',label:'Save as Draft'}]}})} />);
  fireEvent.click(screen.getByRole('button', {name:'More actions'}));
  expect(screen.getByRole('menuitem', {name:'End Visit'})).toBeDisabled();
});

test('an ineligible draft remains disabled in the split menu', () => {
  const onDraft = jest.fn();
  render(<Header actions={prescriptionHeaderActions({visit:{label:'End Visit',menu:[{id:'draft',label:'Save as Draft',disabled:true,onClick:onDraft}]}})} />);
  fireEvent.click(screen.getByRole('button',{name:'More actions'}));
  const draft = screen.getByRole('menuitem',{name:/Save as Draft/});
  expect(draft).toBeDisabled();
  fireEvent.click(draft);
  expect(onDraft).not.toHaveBeenCalled();
});

test('workflow launchers and unreleased preview stay out of the header', () => {
  render(<Header actions={prescriptionHeaderActions({smart:['voice-rx','snap','smart','repeat','preview'].map(key=>({key,label:key})),primary:{label:'Submit'}})} />);
  expect(screen.getByRole('button',{name:'Visit'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'More actions'})).not.toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
test('teleconsultation and letterhead are tonal icon buttons with accessible names', () => {
  render(<Header actions={prescriptionHeaderActions({smart:[{key:'tele',label:'Tele-Consultation',icon:<svg />},{key:'letterhead',label:'Letterhead',icon:<svg />}]})} />);
  ['Tele-Consultation','Letterhead'].forEach(name=>{
    const button=screen.getByRole('button',{name});
    expect(button).toHaveAttribute('data-variant','tonal');
    expect(button).not.toHaveTextContent(name);
  });
});
