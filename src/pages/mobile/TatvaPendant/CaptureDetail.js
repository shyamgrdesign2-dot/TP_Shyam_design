import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { putNeoConsultation, matchNeoConsultationPatient } from '../../../api/services/ApiNeoSapien';
import { useTatvaPendantData } from './context/TatvaPendantContext';
import {
  buildNeoModuleCopyPayload,
  extractCaptureTasks,
  findCaptureById,
  formatNeoVoiceApiError,
  getDetectedIdentifierTags,
  getEncounterPatientLabel,
  getIpdTabSections,
  getVisibleIpdCaptureTabs,
  IPD_CAPTURE_TABS,
  getStructuredNoteSections,
  resolveConsultationConversation,
  resolveDigitizedOutput,
} from './utils/neoConsultationUtils';
import {
  buildNeoPatientLinkPayload,
} from './utils/patientPickerUtils';
import {
  CaptureBedIcon,
  CaptureBuildingIcon,
  CaptureCakeIcon,
  CaptureChevronRightIcon,
  CaptureHashIcon,
  CaptureUserCheckIcon,
  CaptureUserIcon,
  ClipboardTick,
  FingerScan,
  InfoCircle,
  NOTE_SECTION_ICONS,
  NoteCopyIcon,
  StatSparklesIcon,
  TpIcon,
  UserAdd,
} from './components/TpIcons';
import AssignPatientSheet from './components/AssignPatientSheet';
import SoapNotesPanel from './components/SoapNotesPanel';
import TranscriptPanel from './components/TranscriptPanel';
import { useCaptureSoapNotes } from './hooks/useCaptureSoapNotes';
import './CaptureDetail.scss';

const CLINICAL_TAB = 'clinical';
const SOAP_TAB = 'soap';
const TRANSCRIPT_TAB = 'transcript';
const TASKS_TAB = 'tasks';

const COPY_LABELS = {
  all: 'Clinical notes',
  soapNotes: 'SOAP notes',
  symptoms: 'Symptoms',
  presentingComplaints: 'Presenting complaints',
  currentMedications: 'Medications',
  pastMedicalHistory: 'Medical history',
  provisionalDiagnosis: 'Diagnosis',
  treatmentPlan: 'Treatment plan',
  additionalNotes: 'Additional notes',
  informant: 'Informant',
  roomNumber: 'Ward / room',
  patientName: 'Patient details',
  examination: 'Examination',
  functionalAssessment: 'Functional assessment',
  vitals: 'Vitals',
  medications: 'Medications',
  examinations: 'Examination',
  diagnosis: 'Diagnosis',
  advice: 'Advice',
  labResults: 'Lab results',
  medicalHistory: 'Medical history',
  vitalsAndBodyComposition: 'Vitals',
  patientDetails: 'Patient details',
  others: 'Notes',
  ASSESSMENTS: 'Assessments',
  PROGRESS_NOTES: 'Progress notes',
  CONSULTANT_NOTES: 'Consultant notes',
  OT_NOTES: 'OT notes',
  CROSS_REFERRAL: 'Cross referral',
  DISCHARGE_SUMMARY: 'Discharge summary',
};

function DetailArrowLeftIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function NoteSectionCard({ section, onCopyModule, copyingKey }) {
  const SectionIcon = NOTE_SECTION_ICONS[section.icon];
  const copyKey = section.copyKey ?? section.key;

  const handleCopyClick = () => {
    onCopyModule(copyKey, section);
  };

  return (
    <section className="tp-note-card">
      <div className="tp-note-card__head">
        <span className="tp-note-card__icon-wrap">
          {SectionIcon && <SectionIcon size={14} color="#7c3aed" />}
        </span>
        <span className="tp-note-card__title">{section.label}</span>
        {section.count > 0 && (
          <span className="tp-note-card__count">{section.count}</span>
        )}
        <button
          type="button"
          className="tp-note-card__copy"
          aria-label={`Copy ${section.label} to RxPad`}
          disabled={copyingKey === copyKey}
          onClick={handleCopyClick}
        >
          <NoteCopyIcon size={14} color="#64748b" />
        </button>
      </div>

      <div className="tp-note-card__body">
        {section.layout === 'split' && section.items.map((item, index) => (
          <div key={`${section.key}-${index}`} className="tp-note-card__split-row">
            <span>{item.title}</span>
            {item.meta && <span className="tp-note-card__meta">{item.meta}</span>}
          </div>
        ))}

        {section.layout === 'bullets' && (
          <ul className="tp-note-card__bullets">
            {section.items.map((item, index) => (
              <li key={`${section.key}-${index}`}>
                <span className="tp-note-card__bullet" aria-hidden />
                {item.meta ? `${item.title} · ${item.meta}` : item.title}
              </li>
            ))}
          </ul>
        )}

        {section.layout === 'meds' && (
          <div className="tp-note-card__meds">
            {section.items.map((item, index) => (
              <div key={`${section.key}-${index}`} className="tp-note-card__med">
                <p className="tp-note-card__med-name">{item.title}</p>
                {item.meta && <p className="tp-note-card__med-meta">{item.meta}</p>}
              </div>
            ))}
          </div>
        )}

        {section.layout === 'followup' && (
          <div className="tp-note-card__followup">
            {section.followUp.badge && (
              <span className="tp-note-card__followup-badge">{section.followUp.badge}</span>
            )}
            <span className="tp-note-card__followup-detail">{section.followUp.detail}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function CaptureDetail() {
  const navigate = useNavigate();
  const { captureId } = useParams();
  const { captures, loading, refetch } = useTatvaPendantData();
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [assigningPatient, setAssigningPatient] = useState(false);
  const [copyingKey, setCopyingKey] = useState(null);

  const capture = useMemo(
    () => findCaptureById(captures, captureId),
    [captures, captureId]
  );

  const isAssigned = capture?.patientUniqueId > 0;
  const encounter = capture?.rawEncounter;
  const consultation = capture?.rawConsultation;
  const isIpd = capture?.type === 'IPD'
    || Boolean(resolveDigitizedOutput(encounter, consultation));

  const [activeTab, setActiveTab] = useState(CLINICAL_TAB);

  const noteSections = useMemo(
    () => getStructuredNoteSections(encounter, consultation),
    [encounter, consultation]
  );
  const tasks = useMemo(() => extractCaptureTasks(encounter), [encounter]);
  const identifierTags = useMemo(
    () => getDetectedIdentifierTags(capture, encounter, consultation),
    [capture, encounter, consultation]
  );
  const conversation = useMemo(
    () => resolveConsultationConversation(consultation, encounter),
    [consultation, encounter]
  );

  const visibleIpdTabs = useMemo(() => {
    if (!isIpd) return [];
    return getVisibleIpdCaptureTabs(encounter, {
      consultation,
      conversation,
      transcription: consultation?.transcription,
      tasks,
    });
  }, [isIpd, encounter, consultation, conversation, tasks]);

  useEffect(() => {
    if (!isIpd) {
      setActiveTab(CLINICAL_TAB);
      return;
    }
    const visibleKeys = visibleIpdTabs.map((tab) => tab.key);
    if (!visibleKeys.length) return;
    setActiveTab((current) => (visibleKeys.includes(current) ? current : visibleKeys[0]));
  }, [captureId, isIpd, visibleIpdTabs]);

  const ipdTabSections = useMemo(
    () => (isIpd ? getIpdTabSections(encounter, activeTab, consultation) : []),
    [encounter, activeTab, isIpd, consultation]
  );

  const suggestedPatient = identifierTags.find((tag) => tag.type === 'name')?.value || '';
  const dbMatchCandidates = encounter?.dbMatchCandidates || capture?.dbMatchCandidates || [];
  const activeIpdTab = IPD_CAPTURE_TABS.find((tab) => tab.key === activeTab);
  const isIpdModuleTab = Boolean(activeIpdTab);

  const soapTabActive = activeTab === SOAP_TAB;
  const {
    soapSections,
    loading: soapLoading,
    error: soapError,
    retry: retrySoapNotes,
  } = useCaptureSoapNotes({
    capture,
    consultation,
    encounter,
    enabled: soapTabActive,
  });

  const handleAssignPatient = async (patient) => {
    if (!capture?.consultationId || !patient?.patient_unique_id) return;

    setAssigningPatient(true);
    try {
      await matchNeoConsultationPatient({
        consultationId: capture.consultationId,
        ...buildNeoPatientLinkPayload(patient),
        previousLabel: getEncounterPatientLabel(encounter, capture),
      });
      const patientName = patient.pm_fullname || capture.patient || 'patient';
      message.success(
        isAssigned ? `Changed assignment to ${patientName}` : `Assigned to ${patientName}`
      );
      setAssignPickerOpen(false);
      await refetch();
    } catch (error) {
      message.error(error?.message || 'Unable to assign patient');
    } finally {
      setAssigningPatient(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Copied');
    } catch {
      message.error('Unable to copy');
    }
  };

  const copyToRxPad = async (copy) => {
    if (!capture?.consultationId || !isAssigned) {
      if (!isAssigned) {
        message.warning('Assign a patient before copying to RxPad');
      }
      return;
    }

    setCopyingKey(copy);
    try {
      const payload = buildNeoModuleCopyPayload({
        capture,
        encounter,
        consultation,
        copy,
      });

      await putNeoConsultation(payload);
      const label = COPY_LABELS[copy] || String(copy).charAt(0).toUpperCase() + String(copy).slice(1);
      message.success(`${label} copied to RxPad`);
    } catch (error) {
      const apiMessage = formatNeoVoiceApiError(error);
      message.error(apiMessage || 'Unable to copy to RxPad');
    } finally {
      setCopyingKey(null);
    }
  };

  const copyTranscript = () => {
    if (conversation.length) {
      handleCopy(
        conversation.map((line) => `${line.speaker}: ${line.text}`).join('\n')
      );
      return;
    }
    handleCopy(consultation?.transcription || '');
  };

  const renderTagIcon = (tag) => {
    if (tag.type === 'name') {
      if (isAssigned) {
        return <CaptureUserCheckIcon size={13} color="#16a34a" />;
      }
      return <CaptureUserIcon size={13} color="#d97706" />;
    }
    if (tag.type === 'bed') {
      return <CaptureBedIcon size={13} color="#64748b" />;
    }
    if (tag.type === 'location') {
      return <CaptureBuildingIcon size={13} color="#64748b" />;
    }
    if (tag.type === 'age') {
      return <CaptureCakeIcon size={13} color="#64748b" />;
    }
    if (tag.type === 'mrn' || tag.type === 'uhid' || tag.type === 'mrno') {
      return tag.type === 'mrno'
        ? <TpIcon icon={FingerScan} size={13} color="#64748b" />
        : <CaptureHashIcon size={13} color="#64748b" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="tp-capture-detail tp-capture-detail--loading">
        <Spin />
      </div>
    );
  }

  if (!capture) {
    return (
      <div className="tp-capture-detail tp-capture-detail--empty">
        <button type="button" className="tp-capture-detail__back" onClick={() => navigate(-1)}>
          <DetailArrowLeftIcon size={18} color="#475569" />
        </button>
        <p>Capture not found.</p>
      </div>
    );
  }

  const tabs = isIpd
    ? visibleIpdTabs
    : [
      { key: CLINICAL_TAB, label: 'Clinical notes' },
      { key: SOAP_TAB, label: 'SOAP' },
      { key: TRANSCRIPT_TAB, label: 'Transcript' },
      {
        key: TASKS_TAB,
        label: 'Tasks',
        count: tasks.length || null,
      },
    ];

  const showIpdTabBar = isIpd && tabs.length > 0;

  const footerConfig = (() => {
    if (isIpd && activeIpdTab) {
      const footerCopyKey = activeIpdTab.copyKey === 'ASSESSMENTS' ? 'all' : activeIpdTab.copyKey;
      return {
        visible: true,
        label: isAssigned
          ? `Copy ${activeIpdTab.label} to RxPad`
          : 'Assign a patient to copy',
        onClick: () => copyToRxPad(footerCopyKey),
        disabled: !isAssigned || copyingKey === footerCopyKey,
        useClipboardIcon: true,
      };
    }
    if (activeTab === CLINICAL_TAB) {
      return {
        visible: true,
        label: isAssigned ? 'Copy Clinical notes to RxPad' : 'Assign a patient to copy',
        onClick: () => copyToRxPad('all'),
        disabled: !isAssigned || copyingKey === 'all',
        useClipboardIcon: true,
      };
    }
    if (activeTab === SOAP_TAB) {
      return {
        visible: true,
        label: isAssigned ? 'Copy SOAP to RxPad' : 'Assign a patient to copy',
        onClick: () => copyToRxPad('soapNotes'),
        disabled: !isAssigned || soapLoading || soapSections.length === 0 || copyingKey === 'soapNotes',
        useClipboardIcon: true,
      };
    }
    if (activeTab === TRANSCRIPT_TAB) {
      return {
        visible: true,
        label: 'Copy transcript',
        onClick: copyTranscript,
        disabled: false,
        useClipboardIcon: false,
      };
    }
    return { visible: false };
  })();

  return (
    <div className="tp-capture-detail">
      <header className="tp-capture-detail__sticky-header">
        <button type="button" className="tp-capture-detail__back" onClick={() => navigate(-1)}>
          <DetailArrowLeftIcon size={18} color="#475569" />
        </button>

        {isAssigned ? (
          <div className="tp-capture-detail__header-patient">
            <div className="tp-capture-detail__header-patient-row">
              <p className="tp-capture-detail__header-name">{capture.patient}</p>
              <span className={`tp-capture-detail__type tp-capture-detail__type--${capture.type.toLowerCase()}`}>
                {capture.type}
              </span>
            </div>
            <span className="tp-capture-detail__header-time">
              {capture.time} · {capture.duration}
            </span>
          </div>
        ) : (
          <div className="tp-capture-detail__header-meta">
            <span className={`tp-capture-detail__type tp-capture-detail__type--${capture.type.toLowerCase()}`}>
              {capture.type}
            </span>
            <span className="tp-capture-detail__time">
              {capture.time} · {capture.duration}
            </span>
          </div>
        )}
      </header>

      <div className="tp-capture-detail__scroll">
        <div className="tp-capture-detail__body">
          <h1 className="tp-capture-detail__title">
            {capture.title}
          </h1>
          <p className="tp-capture-detail__title-sub">
            AI-generated &middot; {capture.sessionGroup}
          </p>

          {identifierTags.length > 0 && (
            <section className={`tp-capture-detail__identifiers ${isAssigned ? 'tp-capture-detail__identifiers--assigned' : ''}`}>
              <span className="tp-capture-detail__identifiers-label">
                {isAssigned ? 'Patient information' : 'Detected identifiers'}
              </span>
              <div className="tp-capture-detail__identifier-chips">
                {identifierTags.map((tag) => (
                  <span
                    key={`${tag.type}-${tag.value}`}
                    className={`tp-detail-chip ${
                      tag.highlight
                        ? 'tp-detail-chip--patient'
                        : isAssigned && tag.type === 'name'
                          ? 'tp-detail-chip--assigned'
                          : 'tp-detail-chip--soft'
                    }`}
                  >
                    {renderTagIcon(tag)}
                    {tag.value}
                  </span>
                ))}
              </div>
            </section>
          )}

          {isAssigned ? (
            <>
              <button
                type="button"
                className="tp-capture-detail__assigned-card"
                onClick={() => setAssignPickerOpen(true)}
              >
                <span className="tp-capture-detail__assigned-avatar">
                  <CaptureUserCheckIcon size={18} color="#ffffff" />
                </span>
                <div className="tp-capture-detail__assigned-copy">
                  <p className="tp-capture-detail__assigned-kicker">Assigned to</p>
                  <p className="tp-capture-detail__assigned-name">
                    {capture.patient}
                  </p>
                </div>
                <span className="tp-capture-detail__assigned-change">Change</span>
                <CaptureChevronRightIcon size={16} color="#cbd5e1" />
              </button>
              <AssignPatientSheet
                open={assignPickerOpen}
                onClose={() => setAssignPickerOpen(false)}
                mode={isIpd ? 'ipd' : 'opd'}
                suggestedName={suggestedPatient}
                dbMatchCandidates={dbMatchCandidates}
                title="Change patient"
                confirmLabel="Confirm change"
                onConfirm={handleAssignPatient}
                confirming={assigningPatient}
              />
            </>
          ) : (
            <AssignPatientSheet
              open={assignPickerOpen}
              onClose={() => setAssignPickerOpen(false)}
              mode={isIpd ? 'ipd' : 'opd'}
              suggestedName={suggestedPatient}
              dbMatchCandidates={dbMatchCandidates}
              title="Assign to patient"
              confirmLabel="Confirm assignment"
              onConfirm={handleAssignPatient}
              confirming={assigningPatient}
            />
          )}
        </div>

        {!isAssigned ? (
          <div className="tp-capture-detail__locked-wrap">
            <div className="tp-capture-detail__locked-skeleton" aria-hidden>
              <div className="tp-capture-detail__locked-tabs">
                <span className="tp-capture-detail__locked-tab tp-capture-detail__locked-tab--active" />
                <span className="tp-capture-detail__locked-tab" />
                <span className="tp-capture-detail__locked-tab" />
              </div>
              <div className="tp-capture-detail__locked-lines">
                <span style={{ width: '92%' }} />
                <span style={{ width: '78%' }} />
                <span style={{ width: '88%' }} />
                <span style={{ width: '62%' }} />
              </div>
            </div>
            <section className="tp-capture-detail__summary-card tp-capture-detail__summary-card--overlay">
              <div className="tp-capture-detail__summary-label">
                <StatSparklesIcon size={13} color="#7c3aed" />
                AI summary
              </div>
              <p>{encounter?.aiSummary || capture.snippet}</p>
              <p className="tp-capture-detail__summary-hint">
                <TpIcon icon={InfoCircle} size={14} color="#f97316" />
                <span>Assign a patient to view the complete clinical notes and transcript.</span>
              </p>
            </section>
          </div>
        ) : (
        <div className="tp-capture-detail__locked-wrap">
        <div className="tp-capture-detail__locked-body">
        {(showIpdTabBar || !isIpd) && (
        <div className="tp-capture-detail__tabs-sticky">
          <div className="tp-capture-detail__tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tp-capture-detail__tab ${activeTab === tab.key ? 'tp-capture-detail__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>
                  {tab.label}
                  {tab.count ? <span className="tp-capture-detail__tab-count">{tab.count}</span> : null}
                </span>
                {activeTab === tab.key && <span className="tp-capture-detail__tab-indicator" />}
              </button>
            ))}
          </div>
        </div>
        )}

        <div className="tp-capture-detail__content">
          {isIpd && tabs.length === 0 && (
            <section className="tp-note-card tp-note-card--empty">
              <p>No structured IPD notes extracted yet.</p>
            </section>
          )}

          {!isIpd && activeTab === CLINICAL_TAB && (
            noteSections.length === 0 ? (
              <section className="tp-note-card tp-note-card--empty">
                <p>No structured clinical notes extracted yet.</p>
              </section>
            ) : (
              <div className="tp-capture-detail__notes">
                {noteSections.map((section) => (
                  <NoteSectionCard
                    key={section.key}
                    section={section}
                    onCopyModule={copyToRxPad}
                    copyingKey={copyingKey}
                  />
                ))}
              </div>
            )
          )}

          {isIpd && isIpdModuleTab && ipdTabSections.length > 0 && (
              <div className="tp-capture-detail__notes">
                {ipdTabSections.map((section) => (
                  <NoteSectionCard
                    key={section.key}
                    section={{
                      ...section,
                      copyKey: section.copyKey ?? activeIpdTab?.copyKey,
                    }}
                    onCopyModule={copyToRxPad}
                    copyingKey={copyingKey}
                  />
                ))}
              </div>
          )}

          {!isIpd && activeTab === SOAP_TAB && (
            <SoapNotesPanel
              sections={soapSections}
              loading={soapLoading}
              error={soapError}
              onCopyModule={copyToRxPad}
              copyingKey={copyingKey}
              onRetry={retrySoapNotes}
            />
          )}

          {activeTab === TRANSCRIPT_TAB && (
            <TranscriptPanel conversation={conversation} />
          )}

          {activeTab === TASKS_TAB && (
            <section className="tp-note-card tp-note-card--empty">
              {tasks.length === 0 ? (
                <p>No tasks extracted yet.</p>
              ) : (
                <ul className="tp-capture-detail__tasks">
                  {tasks.map((task, index) => (
                    <li key={`${task.label}-${index}`} className={task.done ? 'done' : ''}>
                      <span className="tp-capture-detail__task-check" aria-hidden />
                      <span>{task.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        </div>
        </div>
        )}
      </div>

      {!isAssigned && (
        <footer className="tp-capture-detail__footer tp-capture-detail__footer--assign">
          <button
            type="button"
            className="tp-capture-detail__footer-primary tp-capture-detail__footer-primary--assign"
            onClick={() => setAssignPickerOpen(true)}
          >
            <TpIcon icon={UserAdd} size={17} color="#ffffff" />
            Assign a patient
          </button>
        </footer>
      )}

      {isAssigned && footerConfig.visible && (
        <footer className="tp-capture-detail__footer">
          <button
            type="button"
            className="tp-capture-detail__footer-primary"
            disabled={footerConfig.disabled}
            onClick={footerConfig.onClick}
          >
            {footerConfig.useClipboardIcon ? (
              <TpIcon icon={ClipboardTick} size={17} color="#ffffff" />
            ) : (
              <NoteCopyIcon size={17} color="#ffffff" />
            )}
            {footerConfig.label}
          </button>
        </footer>
      )}
    </div>
  );
}

export default CaptureDetail;
