import React, { useState } from 'react';
import { AutoComplete, Button as AntButton, Col, DatePicker, Input, Layout, Row, Select } from 'antd';
import { Badge, Button, RxPadSection, TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import { SidebarLeft } from 'iconsax-reactjs';
import RxWorkflowHeader from '../../common/prescription-header/RxWorkflowHeader';
import { HeaderPatient } from '../../common/prescription-header/HeaderPatient';
import { prescriptionHeaderActions, headerIcon } from '../../common/prescription-header/prescriptionHeaderActions';
import RxActionTooltip from '../../common/prescription-header/RxActionTooltip';
import { NAV_ITEMS, NavPanel, RxSection, SECTION_TITLES } from '../../components/sideNavbar/SideNavbar';
import { AiDraftHeaderTag, ArchivedRecordsRailPanel, useCaseFileRailSignal } from '../../components/archived-records';
import { PrescriptionEmptyLineDraftSearch, PrescriptionEmptyLineRow } from '../../components/PrescriptionEmptyLineUi';
import PrescriptionNoteInput from '../../components/PrescriptionNoteInput';
import { attachTesseractCtBehind } from '../../components/tesseractCt';
import shellStyles from '../../components/dr-agent/rxpad/dr-agent/PrescriptionNew.module.scss';
import moduleStyles from '../../components/dr-agent/voicerx/VoiceRxModuleCapture.module.scss';
import { ASSETS } from '../../assets';
import CASE_FILE from '../../components/archived-records/mock/archivedRecordsMock';
import '../../components/tesseractRxPad.scss';
import './SampleRxPad.scss';

/**
 * A login-free copy of the Rx pad for design review of the Case File panel.
 *
 * Real pieces: the blue rail (NavPanel), the Case File panel and its section
 * kit, the page header shell, the section cards (RxPadSection) and the table
 * row parts the product uses for its empty "Search & add" line.
 * Sample pieces: the patient, the empty tables and every action. Nothing here
 * reads or saves patient data.
 */

const { Content } = Layout;
const NOOP = () => {};
const NO_OPTIONS = [];
// The patient the Case File belongs to: the name, sex and age read from the
// file when the bundle carries them, a placeholder otherwise.
const FILE_PATIENT = CASE_FILE.patient || {};
const SAMPLE_PATIENT = { pm_fullname: FILE_PATIENT.name || 'Sample patient', pm_gender: FILE_PATIENT.sex || 'Female' };
const SAMPLE_AGE = FILE_PATIENT.age ? `${FILE_PATIENT.age}y` : '82y';

// The rail of a general consultation, in the product's order.
const RAIL_IDS = ['pastVisits', 'archivedRecords', 'vitals', 'history', 'labResults', 'medicalRecords', 'gynec', 'obstetric', 'vaccine', 'growth', 'optal', 'personalNotes', 'carePlan'];
const RAIL_ITEMS = NAV_ITEMS.filter(item => RAIL_IDS.includes(item.id));

// Column spans are the ones each section box uses on the Rx pad.
const TABLE_SECTIONS = [
  { id: 'symptoms', title: 'Symptoms', icon: 'bulk/virus', cellClassName: 'border-end', columns: [
    { label: 'Name', lg: 6, sm: 6 },
    { label: 'Since', lg: 3, sm: 3, kind: 'auto', placeholder: 'Since' },
    { label: 'Severity', lg: 3, sm: 3, kind: 'select', placeholder: 'Severity', fieldClassName: 'symptoms-select-box' },
    { label: 'Notes', lg: 10, sm: 9, kind: 'note', placeholder: 'Notes' },
  ] },
  { id: 'examinations', title: 'Examinations', icon: 'bulk/stethoscope', searchClassName: 'fontroboto fw-medium w-100', columns: [
    { label: 'Name', lg: 8, sm: 8 },
    { label: 'Notes', lg: 14, sm: 13, kind: 'note', placeholder: 'Notes' },
  ] },
  { id: 'diagnosis', title: 'Diagnosis', icon: 'bulk/diagnosis', searchClassName: 'fontroboto fw-medium w-100', columns: [
    { label: 'Name', lg: 6, sm: 6 },
    { label: 'Since', lg: 4, sm: 4, kind: 'auto', placeholder: 'Since' },
    { label: 'Status', lg: 4, sm: 4, kind: 'select', placeholder: 'Status' },
    { label: 'Notes', lg: 8, sm: 7, kind: 'note', placeholder: 'Notes' },
  ] },
];
const INVESTIGATION_SECTION = { id: 'investigation', title: 'Investigation', icon: 'bulk/microscope', searchClassName: 'fontroboto fw-medium w-100', columns: [
  { label: 'Name', lg: 8, sm: 8 },
  { label: 'Notes', lg: 14, sm: 13, kind: 'note', placeholder: 'Instruction' },
] };
const MEDICATION_DETAILS = [
  { label: 'UNIT PER DOSE', span: 5, kind: 'auto', placeholder: 'e.g 1 Tablet', border: 'border-end border-start' },
  { label: 'FREQUENCY', span: 4, kind: 'select', placeholder: 'e.g 1-0-1', border: 'border-end', info: true },
  { label: 'WHEN', span: 4, kind: 'select', placeholder: 'e.g Before Food', border: 'border-end' },
  { label: 'DURATION', span: 4, kind: 'auto', placeholder: 'e.g 1 Day', border: 'border-end', cellClassName: 'autofill', fieldClassName: 'truncate-autocomplete' },
  { label: 'NOTE', span: 6, kind: 'note', placeholder: 'Notes', border: 'border-end' },
];
const FOLLOW_UP_OPTIONS = ['2 Days', '2 Weeks', '2 Months'];
const DISABLED_FIELD = 'prescription-empty-line-draft-disabled-control';

// The sample fields take no input: the browser skips an inert subtree for
// pointer, focus and typing. Set on the node so it works on any React version.
const setInert = (node) => { if (node) node.setAttribute('inert', ''); };

function DraftSearch({ className }) {
  return <PrescriptionEmptyLineDraftSearch inputClassName={className} value="" options={NO_OPTIONS} onSearch={NOOP} onSelect={NOOP} onInputKeyDown={NOOP} />;
}

function DraftField({ kind, placeholder, className = '' }) {
  if (kind === 'auto') {
    return <AutoComplete value="" placeholder={placeholder} variant="borderless" defaultOpen={false} disabled className={`autocomplete-custom w-100 ${className} ${DISABLED_FIELD}`} />;
  }
  if (kind === 'select') {
    return <Select className={`autocomplete-custom w-100 ${className} ${DISABLED_FIELD}`} placeholder={placeholder} value={null} disabled />;
  }
  return <PrescriptionNoteInput enabled legacyMultiline={false} className={`notesinput border-0 ${DISABLED_FIELD}`} placeholder={placeholder} value="" disabled />;
}

// Header row plus the one empty "Search & add" row, as on an untouched pad.
function SampleTable({ columns, cellClassName = 'symptoms-table-cell', searchClassName }) {
  return (
    <div className="tesseract-ct" ref={attachTesseractCtBehind}>
      <Row gutter={0} className="tesseract-ct-head">
        <Col lg={1} md={1} sm={1} xs={1} className="tesseract-ct-th" />
        {columns.map(col => <Col key={col.label} lg={col.lg} md={col.lg} sm={col.sm} xs={col.sm} className="tesseract-ct-th">{col.label}</Col>)}
        <Col lg={1} md={1} sm={2} xs={2} className="tesseract-ct-th tesseract-ct-sticky-action" />
      </Row>
      <div className="prescription-empty-line-ui" ref={setInert}>
        <PrescriptionEmptyLineRow gutter={0} className="symptoms-table-row prescription-empty-line-row--animated prescription-empty-line-row--draft">
          <Col lg={1} md={1} sm={1} xs={1} className="symptoms-table-cell center" />
          {columns.map((col, index) => (
            <Col key={col.label} lg={col.lg} md={col.lg} sm={col.sm} xs={col.sm}
              className={index === 0 ? 'symptoms-table-cell prescription-empty-line-cell--draft-active' : cellClassName}>
              {index === 0 ? <DraftSearch className={searchClassName} /> : <DraftField kind={col.kind} placeholder={col.placeholder} className={col.fieldClassName} />}
            </Col>
          ))}
          <Col lg={1} md={1} sm={2} xs={2} className="symptoms-table-cell center tesseract-ct-sticky-action" />
        </PrescriptionEmptyLineRow>
      </div>
    </div>
  );
}

// The medication table nests its detail columns, so it is laid out by hand.
function SampleMedicationTable() {
  return (
    <div className="tesseract-ct tesseract-ct-wide" ref={attachTesseractCtBehind}>
      <Row gutter={[0]} className="border-top border-bottom align-items-center tesseract-ct-med-head">
        <Col lg={1} md={1} sm={1} xs={1} className="border-end">&nbsp;</Col>
        <Col lg={5} md={5} sm={5} xs={5}>
          <div className="fontroboto fw-medium p-2 fs-12 text-welcome"><label>MEDICINE</label></div>
        </Col>
        <Col lg={18} md={18} sm={18} xs={18}>
          <Row>
            {MEDICATION_DETAILS.map(col => (
              <Col key={col.label} lg={col.span} md={col.span} sm={col.span} xs={col.span} className={col.border}>
                <div className={`fontroboto fw-medium p-2 fs-12 text-welcome ${col.info ? 'd-flex align-items-center flex-wrap' : ''}`}>
                  <label>{col.label}</label>
                  {col.info ? <TPLibraryIcon name="info-circle" family="essential" variant="linear" size={16} className="ms-1" /> : null}
                </div>
              </Col>
            ))}
            <Col lg={1} md={1} sm={2} xs={2} className="text-center tesseract-ct-sticky-action">
              <div className="fontroboto fw-medium p-2 fs-12 text-welcome"><label></label></div>
            </Col>
          </Row>
        </Col>
      </Row>
      <div className="prescription-empty-line-ui" ref={setInert}>
        <PrescriptionEmptyLineRow gutter={[0]} className="taper-dose align-items-center border-bottom prescription-empty-line-row--animated prescription-empty-line-row--draft">
          <Col lg={1} md={1} sm={1} xs={1} className="text-center d-flex flex-column align-self-stretch border-end">
            <div className="d-flex align-items-center justify-content-center flex-grow-1 w-100" />
          </Col>
          <Col lg={5} md={5} sm={5} xs={5} className="symptoms-table-cell prescription-empty-line-cell--draft-active">
            <DraftSearch className="fontroboto fw-medium w-100" />
          </Col>
          <Col lg={18} md={18} sm={18} xs={18}>
            <Row>
              {MEDICATION_DETAILS.map(col => (
                <Col key={col.label} lg={col.span} md={col.span} sm={col.span} xs={col.span} className={`${col.border} ${col.cellClassName || ''}`}>
                  {col.kind === 'note' ? (
                    <div className={`prescription-table-notes ${DISABLED_FIELD}`}>
                      <Input.TextArea className={`notesinput border-0 ${DISABLED_FIELD} prescription-table-notes-input`} placeholder={col.placeholder} value="" disabled autoSize={{ minRows: 1, maxRows: 3 }} />
                    </div>
                  ) : (
                    <DraftField kind={col.kind} placeholder={col.placeholder} className={`h-100 inputborder ${col.fieldClassName || ''}`} />
                  )}
                </Col>
              ))}
              <Col lg={1} md={1} sm={2} xs={2} className="d-flex align-items-center justify-content-center tesseract-ct-sticky-action" />
            </Row>
          </Col>
        </PrescriptionEmptyLineRow>
      </div>
    </div>
  );
}

function SectionAction({ icon, label, tip, disabled }) {
  return (
    <RxActionTooltip placement="bottom" title={tip}>
      <span>
        <Button variant="tonal" theme="neutral" size="sm" aria-label={label} disabled={disabled} onClick={NOOP}
          icon={<TPLibraryIcon name={icon} variant="linear" size={18} />} />
      </span>
    </RxActionTooltip>
  );
}

// The card every section box sits in. Save and Clear are off, as they are on
// the product while a section is empty.
function SampleSection({ title, icon, name = title.toLowerCase(), children }) {
  return (
    <div className="prescription-box-sm">
      <RxPadSection title={title} icon={icon} className={`tesseract-rxpad ${moduleStyles.moduleRoot || ''}`}
        headerActions={
          <>
            <SectionAction icon="grid-5" label={`Browse ${name} templates`} tip="Browse templates" />
            <SectionAction icon="ram" label={`Save ${name} as template`} tip="Save as template" disabled />
            <SectionAction icon="eraser" label={`Clear ${name}`} tip="Clear all entries" disabled />
          </>
        }>
        {children}
      </RxPadSection>
    </div>
  );
}

function SampleNotesAndFollowUp() {
  return (
    <div className="prescription-box-sm">
      <div className={moduleStyles.moduleRoot} ref={setInert}>
        <div className="p-14-pb0">
          <div>
            <div className="d-flex align-items-center justify-content-between mb-14">
              <div className="d-flex align-items-center">
                <TPLibraryIcon name="note-2" family="medical" variant="bulk" size={20} color="var(--tesseract-violet-500)" className="me-2" />
                <div className="title-common">Additional Notes</div>
              </div>
            </div>
            <div className="textarea-save">
              <Input.TextArea placeholder="Enter any specific note here" value="" readOnly className="textareaPlaceholder fontroboto text-main" rows={3} />
            </div>
          </div>
          <div className="srx-card-divider" />
          <div>
            <div className="d-flex align-items-center mb-14">
              <TPLibraryIcon name="calendar-2" family="time" variant="bulk" size={20} color="var(--tesseract-violet-500)" className="me-2" />
              <div className="title-common">Follow-up</div>
            </div>
            <div className="d-flex calender-merge-input mt-3">
              <Input className="w-100 calnder-input1" placeholder="e.g. 3 Days" value="" readOnly />
              <DatePicker inputReadOnly open={false} value={null} />
            </div>
            <div className="d-flex flex-wrap mt-14 fllowbtn">
              {FOLLOW_UP_OPTIONS.map(label => <AntButton key={label} type="text" className="btn btn-primary2 px-5-16 btn-fw-bold fs-12">{label}</AntButton>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Same frame the product draws around every rail section: blue header with
// the section title and the collapse button, then the scrolling body.
function SectionPanel({ activeId, onClose, onOpenReview }) {
  const title = SECTION_TITLES[activeId] || 'Section';
  return (
    <section className="snv-content-panel">
      <div className="snv-section-header">
        <span className="snv-section-title">
          {title}
          {activeId === 'archivedRecords' ? <AiDraftHeaderTag /> : null}
        </span>
        <span className="snv-section-actions">
          <button type="button" className="snv-collapse-btn" onClick={onClose} aria-label="Collapse section panel">
            <SidebarLeft size={16} variant="Linear" />
          </button>
        </span>
      </div>
      <div key={activeId} className="snv-section-anim">
        {activeId === 'archivedRecords' ? (
          <div className="snv-content-scroll snv-archived-records-content" data-snv-scroll-root="true">
            <ArchivedRecordsRailPanel kit={{ RxSection }} onOpenReview={onOpenReview} />
          </div>
        ) : (
          <div className="snv-content-scroll" data-snv-scroll-root="true">
            <div className="snv-section-empty-state">
              <img className="snv-section-empty-icon" src="/new-assets/icons/dr-agent/empty-docs.svg" alt="" width={72} height={72} draggable={false} />
              <p className="snv-section-empty-text">Not part of this preview. Open a patient&apos;s Rx pad to see {title}.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SampleHeader() {
  const actions = prescriptionHeaderActions({
    tutorial: { key: 'tutorial', ariaLabel: 'Play tutorial', icon: <img src={ASSETS.images.tutorial2} width={42} height={42} alt="" />, variant: 'ghost', style: { padding: 0, border: 0 }, onClick: NOOP },
    tools: [
      { key: 'templates', ariaLabel: 'Browse prescription templates', icon: headerIcon('grid-5'), onClick: NOOP },
      { key: 'save-template', ariaLabel: 'Save prescription as template', icon: headerIcon('ram'), disabled: true },
      { key: 'customize', ariaLabel: 'Customize prescription sections', icon: headerIcon('setting-4'), onClick: NOOP },
    ],
    visit: { label: 'End Visit', icon: headerIcon('clipboard-export'), endVisitDisabled: true, onClick: NOOP,
      menu: [{ id: 'save-draft', label: 'Save as Draft', disabled: true }] },
    more: { ariaLabel: 'More prescription options', icon: headerIcon('more'), onClick: NOOP },
  });
  return (
    <RxWorkflowHeader height={62} back backIconVariant="linear" onBack={NOOP} aria-label="Sample prescription header"
      leading={
        <>
          <HeaderPatient patient={SAMPLE_PATIENT} age={SAMPLE_AGE} />
          <Badge variant="soft" color="neutral" size="sm">Case File demo</Badge>
        </>
      }
      actions={actions} />
  );
}

export default function SampleRxPad({ onOpenReview }) {
  // The pad opens with the rail only, as it does for the doctor: the red dot
  // on Case File says there is something to open, and opening it clears the dot.
  const [activeId, setActiveId] = useState(null);
  const signals = useCaseFileRailSignal();
  // Same rule as the product: the active item closes the panel, any other opens its own.
  const select = (id) => setActiveId(current => (current === id ? null : id));
  return (
    <div className="srx-root">
      <SampleHeader />
      <div className={`${shellStyles.prescriptionNewRouteShell || ''} srx-shell`}>
        <aside className="snv-root" data-side-navbar="true">
          <NavPanel activeId={activeId} onSelect={select} items={RAIL_ITEMS} signals={signals} />
          {activeId ? <SectionPanel activeId={activeId} onClose={() => setActiveId(null)} onOpenReview={onOpenReview} /> : null}
        </aside>
        <div className="w-100 bg-body wrapper2 prescription-wrapper prescription-wrapper--newrx srx-pad">
          <div className="row">
            <div className="col-lg-12 col-md-12 col-12 mt-lg-0 mt-3">
              <Content>
                {TABLE_SECTIONS.map(section => (
                  <SampleSection key={section.id} title={section.title} icon={section.icon}>
                    <SampleTable columns={section.columns} cellClassName={section.cellClassName} searchClassName={section.searchClassName} />
                  </SampleSection>
                ))}
                <SampleSection title="Medications (Rx)" name="medications" icon="bulk/pills">
                  <SampleMedicationTable />
                </SampleSection>
                <SampleSection title="Advices" icon="bulk/clipboard-check">
                  <div ref={setInert}>
                    <AutoComplete value="" options={NO_OPTIONS} open={false} className="autocomplete-custom w-100" popupClassName="boxpopup">
                      <Input placeholder="Search Advices" prefix={<i className="icon-search"></i>} readOnly />
                    </AutoComplete>
                  </div>
                </SampleSection>
                <SampleSection title={INVESTIGATION_SECTION.title} icon={INVESTIGATION_SECTION.icon}>
                  <SampleTable columns={INVESTIGATION_SECTION.columns} searchClassName={INVESTIGATION_SECTION.searchClassName} />
                </SampleSection>
                <SampleNotesAndFollowUp />
              </Content>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
