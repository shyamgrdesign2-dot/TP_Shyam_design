import React from 'react';
import { Input } from 'antd';

// Keep the existing handlers/value contract while sharing the medication notes
// layout. Notes grow to three wrapped lines, then scroll inside the textarea.
const PrescriptionNoteInput = React.forwardRef(function PrescriptionNoteInput(
    { enabled, legacyMultiline = false, className = '', autoSize, style, ...props }, ref
) {
    if (!enabled) {
        const LegacyInput = legacyMultiline ? Input.TextArea : Input;
        return <LegacyInput ref={ref} {...props} className={className} autoSize={autoSize} style={style} />;
    }
    return <div className={`prescription-table-notes${props.disabled ? ' prescription-empty-line-draft-disabled-control' : ''}`}>
        <Input.TextArea ref={ref} {...props} wrap="soft" autoSize={{ minRows: 1, maxRows: 3 }}
            className={`${className} prescription-table-notes-input`} />
    </div>;
});

export default PrescriptionNoteInput;
