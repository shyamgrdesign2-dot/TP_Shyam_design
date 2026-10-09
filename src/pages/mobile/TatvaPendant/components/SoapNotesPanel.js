import React from 'react';
import { Spin } from 'antd';
import { NoteCopyIcon } from './TpIcons';
import './SoapNotesPanel.scss';

const SOAP_THEMES = {
  subjective: {
    letter: 'S',
    headerBg: '#eef2ff',
    badgeBg: '#4b4ad5',
    bullet: '#4b4ad5',
  },
  objective: {
    letter: 'O',
    headerBg: '#ede9fe',
    badgeBg: '#7c3aed',
    bullet: '#7c3aed',
  },
  assessment: {
    letter: 'A',
    headerBg: '#fffbeb',
    badgeBg: '#d97706',
    bullet: '#d97706',
  },
  plan: {
    letter: 'P',
    headerBg: '#f0fdf4',
    badgeBg: '#16a34a',
    bullet: '#16a34a',
  },
};

function SoapNotesPanel({
  sections,
  loading,
  error,
  onCopyModule,
  copyingKey,
  onRetry,
}) {
  const SOAP_COPY_KEY = 'soapNotes';

  if (loading) {
    return (
      <div className="tp-soap-panel">
        <div className="tp-soap-panel__loading">
          <Spin size="small" />
          <span>Generating SOAP notes…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tp-soap-panel">
        <div className="tp-soap-panel__empty">
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="tp-soap-panel__retry" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="tp-soap-panel">
        <div className="tp-soap-panel__empty">
          <p>No SOAP notes extracted for this capture yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-soap-panel">
      {sections.map((section) => {
        const theme = SOAP_THEMES[section.key] || SOAP_THEMES.subjective;

        return (
          <section key={section.key} className="tp-soap-card">
            <div
              className="tp-soap-card__head"
              style={{ background: theme.headerBg }}
            >
              <span
                className="tp-soap-card__badge"
                style={{ background: theme.badgeBg }}
              >
                {theme.letter}
              </span>
              <span className="tp-soap-card__title">{section.label}</span>
              <button
                type="button"
                className="tp-soap-card__copy"
                aria-label={`Copy ${section.label} to RxPad`}
                disabled={copyingKey === SOAP_COPY_KEY}
                onClick={() => onCopyModule?.(SOAP_COPY_KEY)}
              >
                <NoteCopyIcon size={14} color="#64748b" />
              </button>
            </div>
            <ul className="tp-soap-card__list">
              {section.items.map((item, index) => (
                <li key={`${section.key}-${index}`}>
                  <span
                    className="tp-soap-card__bullet"
                    style={{ background: theme.bullet }}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default SoapNotesPanel;
