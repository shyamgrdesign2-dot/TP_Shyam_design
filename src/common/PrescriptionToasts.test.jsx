import React from 'react';
import { queryHelpers, act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { PrescriptionToastHost, installPrescriptionMessageBridge, showPrescriptionToast, dismissPrescriptionToast, toastContent } from './PrescriptionToasts';

const renderHost = () => render(<MemoryRouter initialEntries={['/prescription']}><PrescriptionToastHost /></MemoryRouter>);
let api, uninstall;
beforeEach(() => {
    jest.useFakeTimers();
    api = Object.fromEntries(['open','success','error','warning','warn','info','loading','destroy','config'].map(key => [key, jest.fn()]));
    uninstall = installPrescriptionMessageBridge(api, () => true);
});
afterEach(() => { act(() => api.destroy()); uninstall(); jest.useRealTimers(); });

test.each(['info','success','warning','error'])('uses the %s Tesseract status without inventing subtext or a CTA', type => {
    renderHost();
    act(() => api[type]('Existing message'));
    const toast = screen.getByRole(['warning', 'error'].includes(type) ? 'alert' : 'status');
    expect(toast).toHaveTextContent('Existing message');
    expect(toast).toHaveAttribute('data-status', type);
    expect(toast).toHaveAttribute('data-lines', 'one');
    expect(screen.queryByRole('button', {name:'Dismiss'})).not.toBeInTheDocument();
    const expectedIcon = type === 'info' ? 'information' : type === 'success' ? 'verify' : 'danger';
    expect(queryHelpers.queryByAttribute('data-tp-icon', toast, `${expectedIcon}/bold`)).toHaveAttribute('data-tp-icon', `${expectedIcon}/bold`);
    expect(queryHelpers.queryByAttribute('data-tp-icon', toast, `${expectedIcon}/bold`).style.mask).toContain(`/essential/${expectedIcon}.svg`);
});

test('plain info messages expire without a close button and notify callers once', () => {
    renderHost();
    const onClose = jest.fn();
    act(() => api.info({content:'Enter the name to fill in all other details.',closable:false,onClose}));
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByText('Enter the name to fill in all other details.')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(3000));
    expect(onClose).toHaveBeenCalledTimes(1);
});

test('updates keyed loading messages and settles all callers once when closed', async () => {
    renderHost();
    const onClose = jest.fn(); let loading, success;
    act(() => { loading = api.loading({key:'save',content:'Saving',duration:0,onClose}); });
    act(() => jest.advanceTimersByTime(20000));
    expect(screen.getByText('Saving')).toBeInTheDocument();
    act(() => { success = api.success({key:'save',content:'Saved',duration:1}); });
    expect(screen.queryByText('Saving')).not.toBeInTheDocument();
    expect(screen.getAllByText('Saved')).toHaveLength(1);
    act(() => jest.advanceTimersByTime(1000));
    await loading; await success;
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});

test('preserves existing subtext and actionable content, removing legacy decoration', () => {
    renderHost();
    const onAction = jest.fn(); const onDismiss = jest.fn();
    const card = <div><img src="check.svg" alt="Check" /><div><div>Saved</div><div>Existing detail</div></div><button onClick={onAction}>Undo</button><img alt="Close" onClick={onDismiss} /></div>;
    act(() => api.open({key:'rich',type:'success',content:card,duration:0,progress:true}));
    expect(screen.getByText('Existing detail')).toBeInTheDocument();
    expect(screen.queryByAltText('Check')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Undo'}));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', {name:'Dismiss'})).not.toBeInTheDocument();
    act(() => api.destroy('rich'));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});

test('programmatic close supports the Ant message callable and callback signature', async () => {
    renderHost();
    const onClose = jest.fn(); let hide;
    act(() => { hide = api.info('Information', onClose); });
    act(() => hide()); await hide;
    act(() => hide());
    expect(onClose).toHaveBeenCalledTimes(1);
});

test('passes notifications on other routes through unchanged', () => {
    renderHost();
    const original = {info:jest.fn(),open:jest.fn(),success:jest.fn(),error:jest.fn(),warning:jest.fn(),warn:jest.fn(),loading:jest.fn(),destroy:jest.fn(),config:jest.fn()};
    const info = original.info;
    const restore = installPrescriptionMessageBridge(original, () => false);
    original.info('Outside prescription', 5);
    expect(info).toHaveBeenCalledWith('Outside prescription',5);
    expect(screen.queryByText('Outside prescription')).not.toBeInTheDocument();
    restore();
});

test('supports progress and expiry even when a legacy caller requests a close button', () => {
    renderHost();
    const onDismiss = jest.fn();
    act(() => showPrescriptionToast({key:'progress',content:'Existing timed message',duration:5,progress:true,closable:true,onDismiss}));
    expect(screen.getByRole('status').style.getPropertyValue('--toast-duration')).toBe('5000ms');
    expect(screen.queryByRole('button',{name:'Dismiss'})).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    act(() => dismissPrescriptionToast('progress'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('retains plain React inline copy', () => {
    renderHost();
    expect(toastContent(<>Enter the name to fill in all other details.</>).title).toBe('Enter the name to fill in all other details.');
});

test('legacy informational cards do not become success messages', () => {
    renderHost();
    act(() => api.open({type:'',className:'message-appointment',content:<div><InfoCircleOutlined /><div>Please fill in all required fields before saving</div></div>}));
    expect(screen.getByRole('status')).toHaveAttribute('data-status','info');
});
