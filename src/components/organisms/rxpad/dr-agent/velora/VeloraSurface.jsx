"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CopilotIcon } from './CopilotIcon';
import s from './VeloraSurface.module.scss';

// One mounted panel across popup/dock/closed states: a live recorder must survive a presentation change.
export function VeloraSurface({ open, expanded, onClose, onToggle, voiceActive = false, dockTop = 62, children }) {
  const surface = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (!ready || !open) return;
    const origin = document.activeElement;
    const node = surface.current;
    const focusable = () => [...node.querySelectorAll('button:not([disabled]), input, textarea, [tabindex="0"]')].filter(el => el.getClientRects().length);
    const focusFrame = requestAnimationFrame(() => {
      (node.querySelector('textarea:not([disabled])') || focusable()[0])?.focus({ preventScroll: true });
    });
    const keydown = event => {
      if (!expanded || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const list = focusable();
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(focusFrame); node.removeEventListener('keydown', keydown); if (origin?.isConnected) origin.focus({ preventScroll: true }); };
  }, [ready, open, expanded]);
  if (!ready) return null;
  return createPortal(<div className={`${s.layer} ${expanded ? s.expanded : s.docked}`} style={{ '--velora-dock-top': `${dockTop}px`, ...(!open ? { visibility: 'hidden', pointerEvents: 'none' } : {}) }} aria-hidden={!open || undefined} inert={!open ? true : undefined} onMouseDown={event => { if (event.target === event.currentTarget && expanded) onClose(); }}>
    <section ref={surface} data-voice-scope="dragent" className={s.surface} role={expanded ? 'dialog' : 'complementary'} aria-modal={expanded || undefined} aria-label="Dr.Velora">
      <div className={s.controls}>
        <button className={s.control} aria-label={expanded ? 'Minimise to side panel' : 'Expand Dr.Velora'} disabled={voiceActive} title={expanded ? 'Minimise' : 'Expand'} onClick={onToggle}><CopilotIcon name={expanded ? 'expand-max' : 'expand-full'} variant="linear" size={14} /></button>
        <button className={s.control} aria-label="Close Dr.Velora" title="Close" onClick={onClose}><CopilotIcon name="close-square" variant="bold" size={20} /></button>
      </div>
      {children}
    </section>
  </div>, document.body);
}

export { VeloraSearch, VeloraPatientHeader } from "./VeloraSearch";
