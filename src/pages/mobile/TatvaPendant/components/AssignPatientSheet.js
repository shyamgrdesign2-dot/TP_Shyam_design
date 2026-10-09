import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import AssignPatientPicker from './AssignPatientPicker';
import './AssignPatientSheet.scss';

function AssignPatientSheet({
  open,
  onClose,
  mode = 'opd',
  suggestedName = '',
  dbMatchCandidates = [],
  title = 'Change patient',
  confirmLabel = 'Confirm change',
  onConfirm,
  confirming = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="tp-assign-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="tp-assign-sheet__scrim"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="tp-assign-sheet__panel">
        <span className="tp-assign-sheet__handle" aria-hidden />
        <header className="tp-assign-sheet__header">
          <div>
            <p className="tp-assign-sheet__title">{title}</p>
            <p className="tp-assign-sheet__sub">Search or pick a patient to assign this capture.</p>
          </div>
          <button
            type="button"
            className="tp-assign-sheet__close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <div className="tp-assign-sheet__body">
          <AssignPatientPicker
            open
            mode={mode}
            suggestedName={suggestedName}
            dbMatchCandidates={dbMatchCandidates}
            title={title}
            confirmLabel={confirmLabel}
            onConfirm={async (patient) => {
              if (onConfirm) await onConfirm(patient);
              onClose?.();
            }}
            confirming={confirming}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AssignPatientSheet;
