import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { message } from 'antd';
import { useLocation } from 'react-router-dom';
import { Button, LoadingIndicator, Toast, TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import './PrescriptionToasts.scss';

let notices = [];
let sequence = 0;
const listeners = new Set();
const subscriptions = new Map();
const publish = () => listeners.forEach(listener => listener());
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => notices;
const statusIcons = {
    info: ['information', 'var(--tesseract-warning-400, #fbbf24)'],
    success: ['verify', 'var(--tesseract-success-400, #34d399)'],
    warning: ['danger', 'var(--tesseract-warning-400, #fbbf24)'],
    error: ['danger', 'var(--tesseract-error-400, #fb7185)'],
};
const prescriptionToastRoutes = new Set(['/prescription', '/smart-prescription', '/snap-rx', '/snap-rx/digitise', '/smart-rx-digitise']);
export const isPrescriptionToastRoute = () => typeof window !== 'undefined' && prescriptionToastRoutes.has(window.location.pathname);

// Extract existing copy/actions from the old message cards; their decorative icons,
// close buttons and layout wrappers are replaced by the native Toast slots.
export function toastContent(content) {
    const lines = [];
    const actions = [];
    let close;
    let status;
    function walk(node) {
        if (node == null || typeof node === 'boolean') return;
        if (typeof node === 'string' || typeof node === 'number') { if (String(node).trim()) lines.push(node); return; }
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (!React.isValidElement(node)) return;
        const { children, onClick, ...props } = node.props;
        const iconName = node.type?.displayName || node.type?.render?.displayName || node.type?.name || '';
        if (/InfoCircle/.test(iconName)) status = 'info';
        else if (/Warning|ExclamationCircle/.test(iconName)) status = 'warning';
        else if (/CloseCircle/.test(iconName)) status = 'error';
        else if (/CheckCircle/.test(iconName)) status = 'success';
        const isClose = /close|dismiss/i.test(`${props['aria-label'] || ''} ${props.alt || ''} ${props.className || ''}`) || children === '×';
        if (isClose || (node.type === 'img' && onClick)) { close = onClick; return; }
        if (props['aria-hidden'] || ['img', 'svg', 'i'].includes(node.type)) return;
        if ((onClick || props.href) && children) {
            actions.push(props.href
                ? <a key={actions.length} href={props.href} target={props.target} rel={props.rel} onClick={onClick}>{children}</a>
                : <Button key={actions.length} variant="link" theme="neutral" size="sm" onClick={onClick}>{children}</Button>);
            return;
        }
        const parts = React.Children.toArray(children);
        if (parts.length && parts.every(part => ['string', 'number'].includes(typeof part))) lines.push(parts.join(''));
        else parts.forEach(walk);
    }
    walk(content);
    return { title: lines[0], subtext: lines.length > 1 ? lines.slice(1).map((line, index) => <div key={index}>{line}</div>) : undefined,
        action: actions.length ? actions : undefined, legacyClose: close, status };
}

export function dismissPrescriptionToast(key, manual = false) {
    const notice = notices.find(item => item.key === key);
    if (!notice) return;
    notices = notices.filter(item => item.key !== key);
    const waiting = subscriptions.get(key) || [];
    subscriptions.delete(key);
    publish();
    waiting.forEach(({ resolve, onClose }) => { try { onClose?.(); } finally { resolve(); } });
    if (manual) {
        notice.onDismiss?.();
        notice.legacyClose?.({ stopPropagation() {}, preventDefault() {} });
    }
}

export function showPrescriptionToast(options) {
    const key = options.key ?? `prescription-toast-${++sequence}`;
    const parsed = toastContent(options.content ?? options.title);
    const type = options.type || parsed.status || (/error/i.test(options.className || '') ? 'error' : /warning/i.test(options.className || '') ? 'warning' : /message-appointment/.test(options.className || '') ? 'success' : 'info');
    const status = ['success', 'warning', 'error'].includes(type) ? type : 'info';
    const duration = options.duration ?? 3;
    const notice = { ...parsed, ...options, title: options.title ?? parsed.title,
        subtext: options.subtext ?? parsed.subtext, action: options.action ?? parsed.action,
        key, revision: ++sequence, status, loading: type === 'loading', duration: duration * 1000,
        dismissible: false };
    const promise = new Promise(resolve => {
        subscriptions.set(key, [...(subscriptions.get(key) || []), { resolve, onClose: options.onClose }]);
    });
    const existing = notices.findIndex(item => item.key === key);
    notices = existing < 0 ? [...notices, notice] : notices.map(item => item.key === key ? notice : item);
    if (notices.length > 5) dismissPrescriptionToast(notices[0].key);
    publish();
    const hide = () => dismissPrescriptionToast(key);
    hide.then = promise.then.bind(promise);
    hide.promise = promise;
    return hide;
}

// Route-scoped compatibility for the existing static antd message calls in all
// prescription children. Other pages retain their original notification behavior.
export function installPrescriptionMessageBridge(api = message, active = isPrescriptionToastRoute) {
    const original = {};
    let defaultDuration = 3;
    ['open', 'info', 'success', 'warning', 'warn', 'error', 'loading'].forEach(method => {
        original[method] = api[method];
        api[method] = (...args) => {
            if (!active()) return original[method].apply(api, args);
            const [content, duration, onClose] = args;
            const options = content && typeof content === 'object' && !React.isValidElement(content) && !Array.isArray(content)
                ? { ...content } : { content };
            if (method !== 'open') options.type = method === 'warn' ? 'warning' : method;
            if (typeof duration === 'number') options.duration = duration;
            if (typeof duration === 'function') options.onClose = duration;
            if (onClose) options.onClose = onClose;
            options.duration ??= defaultDuration;
            return showPrescriptionToast(options);
        };
    });
    original.destroy = api.destroy;
    api.destroy = key => {
        (key === undefined ? [...notices] : notices.filter(item => item.key === key)).forEach(item => dismissPrescriptionToast(item.key));
        return original.destroy.call(api, key);
    };
    original.config = api.config;
    api.config = options => { if (options.duration !== undefined) defaultDuration = options.duration; return original.config.call(api, options); };
    return () => Object.assign(api, original);
}

export function PrescriptionToastHost() {
    const items = useSyncExternalStore(subscribe, snapshot, snapshot);
    const { pathname } = useLocation();
    useEffect(() => {
        document.body.classList.toggle('prescription-overlay-scope', prescriptionToastRoutes.has(pathname));
        return () => document.body.classList.remove('prescription-overlay-scope');
    }, [pathname]);
    return createPortal(<div className="prescription-toast-stack">
        {items.map(item => <Toast key={item.revision} status={item.status} surface="dark" title={item.title}
            action={item.action} showIcon dismissible={item.dismissible} maxWidth={640}
            onClick={item.onClick}
            duration={item.duration} progress={item.progress === true && !item.loading}
            icon={item.loading ? <LoadingIndicator size="sm" /> : <TPLibraryIcon name={statusIcons[item.status][0]} family="essential" corner="rounded" variant="bold"
                size={item.subtext != null ? 42 : 24} color={statusIcons[item.status][1]} />}
            onDismiss={() => dismissPrescriptionToast(item.key, true)}>
            {item.subtext}
        </Toast>)}
    </div>, document.body);
}
