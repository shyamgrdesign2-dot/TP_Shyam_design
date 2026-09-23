import React, { useState } from 'react';
import { AutoComplete, Input, Select } from 'antd';
import { attachTesseractCtBehind } from '../../components/tesseractCt';
import { renderPrescriptionDropdown } from '../../components/PrescriptionDropdownHints';
import './PrescriptionKeyboardSmoke.scss';

const CELL = {padding: 8, border: '1px solid #dddde5', width: '25%'};

export default function PrescriptionKeyboardSmoke() {
  const [focus, setFocus] = useState('None');
  return <main className="rx-keyboard-smoke">
    <h1>RX pad · Keyboard smoke test</h1>
    <p>Local sample fields using the shared RX pad navigation. No patient data is saved.</p>
    <p>← → fields at text boundaries · ↑ ↓ rows when suggestions are closed · Tab / Shift+Tab fields · Alt+Home / Alt+End row edges · Escape closes and leaves the field.</p>
    <div ref={attachTesseractCtBehind} onFocusCapture={event => setFocus(event.target.getAttribute('aria-label') || event.target.closest('[data-field]')?.dataset.field || 'Field')}
      onBlurCapture={event => {if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) setFocus('None');}}>
      <table style={{width: '100%', background: '#fff', borderCollapse: 'collapse'}}>
        <thead><tr>{['Name', 'Since', 'Status', 'Notes'].map(label => <th key={label} style={CELL}>{label}</th>)}</tr></thead>
        <tbody>{[0, 1, 2].map(index => <tr key={index}>
          <td style={CELL} data-field={`Name ${index + 1}`}><AutoComplete style={{width: '100%'}} aria-label={`Name ${index + 1}`} placeholder={index === 2 ? 'Search & add' : 'Diagnosis name'}
            options={[{value: 'Sample diagnosis A'}, {value: 'Sample diagnosis B'}]} dropdownRender={renderPrescriptionDropdown} /></td>
          <td style={CELL} data-field={`Since ${index + 1}`}><AutoComplete style={{width: '100%'}} aria-label={`Since ${index + 1}`} placeholder="Since" disabled={index === 2}
            options={[{value: '1 day'}, {value: '2 days'}]} dropdownRender={renderPrescriptionDropdown} /></td>
          <td style={CELL} data-field={`Status ${index + 1}`}><Select style={{width: '100%'}} aria-label={`Status ${index + 1}`} placeholder="Status" disabled={index === 2}
            options={[{value: 'Confirmed'}, {value: 'Suspected'}]} dropdownRender={renderPrescriptionDropdown} /></td>
          <td style={CELL}><Input.TextArea aria-label={`Notes ${index + 1}`} placeholder="Notes" autoSize={{minRows: 1, maxRows: 3}} disabled={index === 2} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p role="status" style={{marginTop: 20}}>Focused field: {focus}</p>
  </main>;
}
