import React from 'react';
import './PrescriptionDropdownHints.scss';

// Display only: the owning dropdown retains its existing selection payload.
export default function PrescriptionCustomOption({ value, category }) {
  return <span className="prescription-custom-option">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    <span>Add '{String(value ?? '').trim()}'{category ? ` as Custom ${category}` : ''}</span>
  </span>;
}
