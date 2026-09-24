"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize4, MinusSquare, ArrowRight2 } from 'iconsax-reactjs';
import s from './VeloraSurface.module.scss';

// One mounted panel across popup/dock/closed states: a live recorder must survive a presentation change.
export function VeloraSurface({ open, expanded, onClose, onToggle, voiceActive = false, children }) {
  const surface = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (!open || !expanded) return;
    const origin = document.activeElement;
    const node = surface.current;
    const focusable = () => [...node.querySelectorAll('button:not([disabled]), input, textarea, [tabindex="0"]')].filter(el => el.getClientRects().length);
    (node.querySelector('textarea') || focusable()[0])?.focus();
    const keydown = event => {
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const list = focusable();
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener('keydown', keydown);
    return () => { node.removeEventListener('keydown', keydown); if (origin?.isConnected) origin.focus(); };
  }, [open, expanded, onClose]);
  if (!ready) return null;
  return createPortal(<div className={`${s.layer} ${expanded ? s.expanded : s.docked}`} style={!open ? { visibility: 'hidden', pointerEvents: 'none' } : undefined} aria-hidden={!open || undefined} inert={!open ? true : undefined} onMouseDown={event => { if (event.target === event.currentTarget && expanded) onClose(); }}>
    <section ref={surface} data-voice-scope="dragent" className={s.surface} role={expanded ? 'dialog' : 'complementary'} aria-modal={expanded || undefined} aria-label="Dr. Velora">
      <button className={s.expand} aria-label={expanded ? 'Minimise to side panel' : 'Expand Dr. Velora'} disabled={voiceActive} title={voiceActive ? 'Finish the voice session before changing the view' : expanded ? 'Minimise' : 'Expand'} onClick={onToggle}>{expanded ? <MinusSquare size={20} /> : <Maximize4 size={20} />}</button>
      {children}
    </section>
  </div>, document.body);
}

export function VeloraSearch({ patientName, onAsk }) {
  const [value, setValue] = useState('');
  return <form className={s.search} onSubmit={event => { event.preventDefault(); onAsk(value.trim()); setValue(''); }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/icons/dr-agent/agent-spark.svg" alt="" width="22" height="22" />
    <input value={value} onChange={event => setValue(event.target.value)} aria-label="Ask Dr. Velora" placeholder={`Ask Dr. Velora about ${patientName?.split(' ')[0] || 'this patient'}…`} />
    <button aria-label="Open Dr. Velora"><ArrowRight2 size={18} /></button>
  </form>;
}
