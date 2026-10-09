import React from 'react';
import './TranscriptPanel.scss';

function isPatientSpeaker(speaker = '') {
  const normalized = String(speaker).trim().toLowerCase();
  return normalized === 'patient' || normalized.includes('patient');
}

function TranscriptPanel({ conversation = [] }) {
  const hasConversation = conversation.length > 0;

  return (
    <div className="tp-transcript-panel">
      <p className="tp-transcript-panel__label">
        Diarised transcript · speaker labels inferred by AI
      </p>

      {hasConversation ? (
        <div className="tp-transcript-panel__messages">
          {conversation.map((line, index) => {
            const isPatient = isPatientSpeaker(line.speaker);
            return (
              <div
                key={`${line.speaker}-${index}`}
                className={`tp-transcript-panel__row ${isPatient ? 'tp-transcript-panel__row--patient' : 'tp-transcript-panel__row--doctor'}`}
              >
                <div className="tp-transcript-panel__meta">
                  <span className={`tp-transcript-panel__speaker ${isPatient ? 'tp-transcript-panel__speaker--patient' : 'tp-transcript-panel__speaker--doctor'}`}>
                    {line.speaker || 'Unknown'}
                  </span>
                  {line.t && <span className="tp-transcript-panel__time">{line.t}</span>}
                </div>
                <div className={`tp-transcript-panel__bubble ${isPatient ? 'tp-transcript-panel__bubble--patient' : 'tp-transcript-panel__bubble--doctor'}`}>
                  {line.text}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="tp-transcript-panel__empty">No transcript available.</p>
      )}
    </div>
  );
}

export default TranscriptPanel;
