import React, { useState } from 'react';
import { Button } from '@dhspl-tatvacare/tesseract-ui';
import RxWorkflowHeader, { RxFulfilmentToggle, rxClearAction } from '../../common/prescription-header/RxWorkflowHeader';
import { HeaderPatient } from '../../common/prescription-header/HeaderPatient';
import { prescriptionHeaderActions, headerIcon, visitActionIcon } from '../../common/prescription-header/prescriptionHeaderActions';
import styles from '../../common/prescription-header/HeaderPrescription.module.scss';
import { ASSETS } from '../../assets';
import './PrescriptionHeaderSmoke.scss';

const CATALOG = [
  ['tele', 'Tele-Consultation', 'video'],
  ['letterhead', 'Letterhead', 'document'], ['upload', 'Upload more', 'document-upload'],
  ['print', 'Print', 'printer'],
  ['connect', 'Connect device', 'bluetooth'], ['disconnect', 'Disconnect device', 'close-circle'],
];
const PRESETS = {
  'All CTAs': CATALOG.map(([id]) => id),
  'Voice Rx': ['tele', 'letterhead'],
  'Snap Rx': ['upload', 'tele'],
  'Snap Rx review': ['tele'],
  'SmartRx review': ['tele'],
  SmartRx: ['connect'],
  'Consultation': ['tele', 'letterhead'],
};
const PHOTO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#dbeafe"/><circle cx="40" cy="29" r="16" fill="#9a674b"/><path d="M8 80v-8a32 32 0 0 1 64 0v8" fill="#6046bc"/><path d="M24 26a16 16 0 0 1 32 0v-5a16 16 0 0 0-32 0" fill="#302d39"/></svg>');

export default function PrescriptionHeaderSmoke() {
  const [selected, setSelected] = useState(PRESETS['All CTAs']);
  const [name, setName] = useState('Alexandra Catherine Montgomery Williams');
  const [photo, setPhoto] = useState('none');
  const [gender, setGender] = useState(true);
  const [blood, setBlood] = useState(true);
  const [draft, setDraft] = useState(true);
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState('100%');
  const [lastAction, setLastAction] = useState('Choose any CTA to inspect its interaction.');
  const [mode, setMode] = useState('All CTAs');
  const [hospital, setHospital] = useState('standard');
  const [fulfilment, setFulfilment] = useState(false);
  const [connected, setConnected] = useState(false);
  const log = label => () => setLastAction(`${label} selected (preview only).`);
  const actions = prescriptionHeaderActions({
    tutorial: { key: 'tutorial', ariaLabel: 'Play tutorial', icon: <img src={ASSETS.images.tutorial2} width={42} height={42} alt="" />, variant: 'ghost', style: {padding:0,border:0}, onClick: log('Tutorial') },
    tools: hospital === 'external' ? [] : [
      { key: 'templates', ariaLabel: 'Browse prescription templates', icon: headerIcon('grid-5'), onClick: log('Templates') },
      { key: 'save-template', ariaLabel: 'Save prescription as template', icon: headerIcon('ram'), disabled: true },
      { key: 'customize', ariaLabel: 'Customize prescription sections', icon: headerIcon('setting-4'), onClick: log('Customize') },
      { key: 'fulfilment', node: <RxFulfilmentToggle label={hospital === 'zydus' ? 'eaZY Dose' : 'PillUp'} logo={hospital === 'zydus' ? ASSETS.images.eazydoseLogo : ASSETS.images.pillup} checked={fulfilment} onChange={setFulfilment} /> },
      ...(hospital === 'zydus' ? [{key: 'hospital-cds', label: 'Zydus Data Engine', theme: 'secondary', icon: headerIcon('info-circle'), onClick: log('Zydus Data Engine')}] : []),
    ],
    smart: CATALOG.filter(([id]) => selected.includes(id) && !['connect','disconnect'].includes(id)).map(([key, label, icon]) => ({key, label, icon: headerIcon(icon), onClick: log(label)})).concat(selected.some(id => ['connect','disconnect'].includes(id)) ? [{key:'connection', label: connected ? 'SmartSync Connected' : 'SmartSync Disconnected', icon: headerIcon('bluetooth'), variant: 'tonal', theme: connected ? 'success' : 'error', onClick: () => setConnected(!connected)}] : []),
    primary: ['SmartRx', 'Snap Rx', 'Snap Rx review', 'SmartRx review'].includes(mode) ? {icon: visitActionIcon, label: mode.endsWith('review') ? 'Save Digitised Rx' : 'Visit', onClick:log(mode.endsWith('review') ? 'Save Digitised Rx' : 'Visit'), loading} : undefined,
    visit: ['SmartRx', 'Snap Rx', 'Snap Rx review', 'SmartRx review'].includes(mode) ? undefined : { label: 'End Visit', icon: headerIcon('clipboard-export'), loading, onClick: log('End Visit'),
      menu: [{id:'draft', label:'Save as Draft', disabled: !draft, onClick:log('Save as Draft')}] },
    more: hospital === 'external' ? undefined : rxClearAction(log('Clear All')),
  });
  return (
    <main className="header-smoke-page">
      <h1>Prescription header · CTA smoke test</h1>
      <p>Combine actions from consultation, Voice Rx, Snap Rx and SmartRx. All buttons in this view are previews.</p>
      <div className="header-smoke-presets">{Object.entries(PRESETS).map(([label, ids]) => <Button key={label} variant="outline" size="sm" onClick={() => { setSelected(ids); setMode(label); }}>{label}</Button>)}</div>
      <div className="header-smoke-options">
        <label>Hospital <select value={hospital} onChange={e => setHospital(e.target.value)}><option value="standard">Standard</option><option value="zydus">Zydus · eaZY Dose / Data Engine</option><option value="external">External hospital · restricted tools</option></select></label>
        <label>Patient name <input value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Avatar <select value={photo} onChange={e => setPhoto(e.target.value)}><option value="none">Default user icon</option><option value="photo">Uploaded photo</option><option value="broken">Unavailable photo → initials</option></select></label>
        <label>Header width <select value={width} onChange={e => setWidth(e.target.value)}><option value="100%">Full width</option><option value="1024px">Tablet · 1024 px</option><option value="768px">Tablet · 768 px</option><option value="390px">Mobile · 390 px</option></select></label>
        <label><input type="checkbox" checked={gender} onChange={e => setGender(e.target.checked)} /> Gender</label>
        <label><input type="checkbox" checked={blood} onChange={e => setBlood(e.target.checked)} /> Blood group</label>
        <label><input type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)} /> Save as Draft menu</label>
        <label><input type="checkbox" checked={loading} onChange={e => setLoading(e.target.checked)} /> Saving state</label>
      </div>
      <fieldset className="header-smoke-toggles"><legend>Visible CTAs</legend>{CATALOG.map(([id,label]) => <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={e => setSelected(old => e.target.checked ? [...old,id] : old.filter(v=>v!==id))} />{label}</label>)}</fieldset>
      <div className="header-smoke-canvas" style={{width, maxWidth:'100%'}}>
        <RxWorkflowHeader variant={({ SmartRx: 'smart-rx', 'Snap Rx': 'snap-rx', 'SmartRx review': 'smart-rx-review', 'Snap Rx review': 'snap-rx-review' })[mode] || 'voice-rx'} className={styles.header} height={62} back onBack={log('Back')}
          leading={<HeaderPatient patient={{pm_fullname:name,pm_gender:gender?'Female':null,pm_blood_group:blood?'O+':null,pm_image_path:photo==='photo'?PHOTO:photo==='broken'?'data:image/png;base64,invalid':null}} age="42y" onClick={log('Patient details')} />}
          actions={actions} />
      </div>
      <p className="header-smoke-status" role="status">{lastAction}</p>
      <p>On narrow layouts, scroll the action strip horizontally to inspect every selected CTA.</p>
    </main>
  );
}
