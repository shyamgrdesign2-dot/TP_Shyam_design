"use client";
import { useEffect, useRef, useState } from 'react';
import { CopilotIcon } from './CopilotIcon';
import s from './QuestionDictation.module.scss';

// Header and composer share this same question-dictation entry point.
export function QuestionDictation({ onKeep, onCancel }) {
  const recognition = useRef(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Starting microphone…');
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // Report browser capability after mount; this component also renders on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!SpeechRecognition) { setStatus('Voice input is unavailable in this browser. Type your question below.'); return; }
    const session = new SpeechRecognition();
    recognition.current = session;
    session.lang = 'en-IN'; session.continuous = true; session.interimResults = true;
    session.onstart = () => setStatus('Listening…');
    session.onresult = event => setText(Array.from(event.results).map(result => result[0].transcript).join(' '));
    session.onerror = event => setStatus(event.error === 'not-allowed' ? 'Microphone access is blocked. You can type your question below.' : 'Voice input stopped. Review or type your question below.');
    session.onend = () => setStatus(current => current === 'Listening…' ? 'Recording stopped. Review your question.' : current);
    try { session.start(); } catch { setStatus('Microphone unavailable. Type your question below.'); }
    return () => { session.onstart = session.onresult = session.onerror = session.onend = null; session.abort(); recognition.current = null; };
  }, []);
  return <section className={s.panel} aria-label="Dictate a question">
    <div className={s.header}><CopilotIcon name="microphone-2" size={18} /><span role="status">{status}</span></div>
    <textarea autoFocus aria-label="Dictated question" value={text} onChange={event => setText(event.target.value)} placeholder="Ask your question…" />
    <div className={s.actions}><button type="button" onClick={onCancel}>Cancel</button><button type="button" disabled={!text.trim()} onClick={() => { recognition.current?.abort(); onKeep(text.trim()); }}>Use question</button></div>
  </section>;
}
