import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import PendantArtwork from './PendantArtwork';
import './ConnectingOverlay.scss';

const RING_COUNT = 6;

function OverlayPendantArtwork() {
  return <PendantArtwork glow="orange" className="tp-connecting__pendant-svg" />;
}

function ConnectingOverlay({ visible, onCancel, title = 'Looking for device', subtitle = 'Make sure your pendant is nearby and powered on.' }) {
  useEffect(() => {
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && onCancel) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onCancel]);

  if (!visible) return null;

  const rings = Array.from({ length: RING_COUNT }, (_, i) => i);

  return ReactDOM.createPortal(
    <div className="tp-connecting" role="dialog" aria-live="polite" aria-label={title}>
      <button
        type="button"
        className="tp-connecting__scrim"
        aria-label="Cancel scanning"
        onClick={onCancel}
      />

      <div className="tp-connecting__ripple" aria-hidden>
        {rings.map((i) => (
          <span
            key={i}
            className="tp-connecting__ring"
            style={{ animationDelay: `${i * 0.55}s` }}
          />
        ))}
      </div>

      <div className="tp-connecting__pendant" aria-hidden>
        <OverlayPendantArtwork />
      </div>

      <div className="tp-connecting__copy">
        <p className="tp-connecting__title">
          <span className="tp-connecting__title-dot" aria-hidden />
          {title}
        </p>
        <p className="tp-connecting__subtitle">{subtitle}</p>
      </div>

      {onCancel && (
        <button
          type="button"
          className="tp-connecting__cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>,
    document.body,
  );
}

export default ConnectingOverlay;
