import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RxWorkflowHeader, { RxFulfilmentToggle, rxClearAction } from './RxWorkflowHeader';
jest.mock('../ProfilePopover', () => () => <button>Patient</button>);

test('SmartRx visit and device actions keep independent handlers; clear remains in More', async () => {
  const submit = jest.fn(), connect = jest.fn(), clear = jest.fn();
  render(<RxWorkflowHeader actions={{
    smart: [{key:'connect',label:'SmartSync Disconnected',onClick:connect}],
    primary: {label:'Submit',onClick:submit}, more:rxClearAction(clear),
  }} />);
  expect(screen.queryByRole('button',{name:'End Visit'})).not.toBeInTheDocument();
  expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'SmartSync Disconnected'}));
  expect(connect).toHaveBeenCalledTimes(1); expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Visit'}));
  expect(submit).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'More prescription options'}));
  fireEvent.click(await screen.findByRole('menuitem',{name:'Clear All'}));
  expect(clear).toHaveBeenCalledTimes(1);
});

test.each(['PillUp', 'eaZY Dose'])('%s toggle uses controlled fulfilment state', label => {
  const change = jest.fn();
  const { rerender } = render(<RxFulfilmentToggle label={label} logo="/test.svg" checked={false} onChange={change} />);
  fireEvent.click(screen.getByRole('switch',{name:`${label} fulfilment`}));
  expect(change).toHaveBeenCalledWith(true, expect.anything());
  rerender(<RxFulfilmentToggle label={label} logo="/test.svg" checked onChange={change} disabled />);
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked','true');
  expect(screen.getByRole('switch')).toBeDisabled();
});
