import React from 'react';
import './PrescriptionDropdownHints.scss';

export default function PrescriptionDropdownHints() {
  return <div className="prescription-dropdown-hints" aria-label="Keyboard shortcuts" onMouseDown={event => event.preventDefault()}>
    <span><kbd aria-label="Up arrow">↑</kbd><kbd aria-label="Down arrow">↓</kbd> Navigate</span>
    <span><kbd aria-label="Enter">↵</kbd> Select</span>
    <span><kbd aria-label="Left arrow">←</kbd><kbd aria-label="Right arrow">→</kbd> Fields</span>
    <span><kbd>Tab</kbd> Next field</span>
    <span><kbd>⇧ Tab</kbd> Previous field</span>
    <span><kbd>Alt Home</kbd><kbd>Alt End</kbd> Row edges</span>
    <span><kbd aria-label="Escape">esc</kbd> Close & leave field</span>
  </div>;
}
export const renderPrescriptionDropdown = menu => <>{menu}<PrescriptionDropdownHints /></>;
