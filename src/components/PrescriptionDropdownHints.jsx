import React from 'react';
import './PrescriptionDropdownHints.scss';

export default function PrescriptionDropdownHints() {
  return <div className="prescription-dropdown-hints" aria-label="Keyboard shortcuts" onMouseDown={event => event.preventDefault()}>
    <span><kbd aria-label="Up arrow">↑</kbd><kbd aria-label="Down arrow">↓</kbd> Navigate</span>
    <span><kbd aria-label="Enter">↵</kbd> Select</span>
    <span><kbd aria-label="Escape">esc</kbd> Close</span>
  </div>;
}
export const renderPrescriptionDropdown = menu => <>{menu}<PrescriptionDropdownHints /></>;
