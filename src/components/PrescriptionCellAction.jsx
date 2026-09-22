import React from 'react';
import { TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import './PrescriptionCellAction.scss';

// Hover actions overlay the cell without reserving space in its normal layout.
export default function PrescriptionCellAction({ children, icon = 'copy', onClick, title }) {
  return (
    <button type="button" className="prescription-cell-action" title={title}
      onClick={event => { event.stopPropagation(); onClick?.(event); }}>
      <TPLibraryIcon name={icon} variant="linear" size={14} />
      <span>{children}</span>
    </button>
  );
}
