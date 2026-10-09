import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Skeleton } from "antd";
import NeoConsultationPanel from "../../components/neo/NeoConsultationPanel";
import { useNeoConsultationContext } from "../../components/neo/NeoConsultationProvider";
import "../../components/neo/NeoConsultation.scss";

/**
 * Skeleton screen shown while the voice API is digitising the recording.
 * Mimics the actual panel layout (patient bar → tabs → section cards) using
 * the portal's existing shimmer animation pattern so the transition feels smooth.
 */
function ProcessingState() {
  return (
    <div className="neo-skeleton">
      {/* Inline processing banner */}
      <div className="neo-skeleton__banner">
        <span className="neo-skeleton__banner-dot" />
        <span className="neo-skeleton__banner-text">
          Processing your consultation — AI is extracting clinical notes…
        </span>
      </div>

      {/* Patient-bar skeleton */}
      <div className="neo-skeleton__patient-bar">
        <Skeleton.Avatar active size={40} shape="circle" />
        <div className="neo-skeleton__patient-info">
          <Skeleton.Input active size="small" style={{ width: 140 }} />
          <Skeleton.Input active size="small" style={{ width: 90, marginTop: 6 }} />
        </div>
        <div className="neo-skeleton__patient-actions">
          <Skeleton.Button active size="default" style={{ width: 90 }} />
          <Skeleton.Button active size="default" style={{ width: 110 }} />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="neo-skeleton__tabs">
        <Skeleton.Input active size="small" style={{ width: 80 }} />
        <Skeleton.Input active size="small" style={{ width: 110 }} />
      </div>

      {/* Section card skeletons */}
      {[130, 80, 110].map((w, i) => (
        <div key={i} className="neo-skeleton__section">
          <div className="neo-skeleton__section-header">
            <Skeleton.Avatar active size={26} shape="square" />
            <Skeleton.Input active size="small" style={{ width: w }} />
          </div>
          <div className="neo-skeleton__section-body">
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Live-recording state shown when the doctor is still dictating.
 */
function RecordingState() {
  return (
    <div className="neo-recording-state">
      <div className="neo-recording-state__indicator">
        <span className="neo-recording-state__dot" />
        <span className="neo-recording-state__label">Recording in progress</span>
      </div>
      <p className="neo-recording-state__hint">
        Dictate the consultation. When you stop recording, the transcript will
        appear here automatically.
      </p>
    </div>
  );
}

/**
 * Standalone page for the Neo consultation result. Lives at /neo-consult and
 * is rendered inside `AppointmentList`'s shared shell (Header + SidebarDoctor
 * + Welcome yellow band). The page itself only provides the white card body —
 * identical to how AppointmentData works.
 *
 * States:
 *   hasResult    → structured consultation panel (NeoConsultationPanel)
 *   isProcessing → skeleton shimmer while voice API runs
 *   isRecording  → live-recording indicator
 *   idle         → empty state with CTA to go pair the device
 */
function NeoConsultPage() {
  const navigate = useNavigate();
  const ctx = useNeoConsultationContext();
  const hasResult = !!ctx?.consultationResult;
  const isProcessing = !!ctx?.isProcessing;
  const isRecording = !!ctx?.isRecording;

  let body;
  if (hasResult) {
    body = <NeoConsultationPanel />;
  } else if (isProcessing) {
    body = <ProcessingState />;
  } else if (isRecording) {
    body = <RecordingState />;
  } else {
    body = (
      <div className="neo-idle-state">
        <div className="neo-idle-state__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <h3 className="neo-idle-state__title">No consultation yet</h3>
        <p className="neo-idle-state__sub">
          Connect your Neo device from the appointment page, start recording,
          dictate the visit, then come back here to review and copy the
          extracted notes.
        </p>
        <Button
          type="primary"
          size="middle"
          className="neo-idle-state__cta"
          onClick={() => navigate("/")}
        >
          Go to appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-4 appointment-wrap dateborder neo-consult-wrap">
      <div className="neo-consult-page">{body}</div>
    </div>
  );
}

export default NeoConsultPage;
