import React from "react";
import { Button, Switch, Spin } from "antd";
import { useNeoConsultationContext } from "./NeoConsultationProvider";
import {
  NeoMicIcon,
  NeoArrowRightIcon,
  NeoSettingIcon,
} from "./icons";
import "./NeoConsultation.scss";

function NeoConnectCard() {
  const ctx = useNeoConsultationContext();

  if (!ctx?.enabled) return null;

  const {
    isConnected,
    isSpeaking,
    isRecording,
    isProcessing,
    pairedDevice,
    bridgeUnreachable,
    openPairing,
    toggleRecording,
  } = ctx;

  // ──────── Disconnected state ────────
  // No BLE link → primary CTA is "Connect Device" (opens the pairing modal).
  if (!isConnected) {
    const variant = bridgeUnreachable ? "error" : "idle";
    const headline = bridgeUnreachable
      ? "Neo bridge not running"
      : pairedDevice?.name
      ? `Neo paired · ${pairedDevice.name}`
      : "Connect Your Neo Device";
    const subline = bridgeUnreachable
      ? "Start ws_server.py on this computer to enable Neo consultations."
      : pairedDevice
      ? "Tap Connect to turn on the smart stethoscope"
      : "Enable smart stethoscope & ECG monitoring";
    const buttonLabel = bridgeUnreachable ? "Retry" : "Connect";

    return (
      <div
        className={`neo-connect-card neo-connect-card--${variant}`}
        role="region"
        aria-label="Neo device connection"
      >
        <div className="neo-connect-card__icon">
          <NeoMicIcon size={20} />
        </div>

        <div className="neo-connect-card__copy">
          <div className="neo-connect-card__title">{headline}</div>
          <div className="neo-connect-card__subtitle">{subline}</div>
        </div>

        <Button
          type="primary"
          size="large"
          className="neo-connect-card__cta"
          onClick={openPairing}
        >
          {buttonLabel} <NeoArrowRightIcon size={14} />
        </Button>
      </div>
    );
  }

  // ──────── Connected state ────────
  // BLE link is up → show a recording toggle. The Manage link opens the
  // pairing modal so the user can switch / disconnect devices.
  const variant = isRecording ? "recording" : "connected";
  const headline = isProcessing
    ? "Processing consultation…"
    : isRecording
    ? "Recording consultation"
    : pairedDevice?.name
    ? `Neo connected · ${pairedDevice.name}`
    : "Neo device connected";
  const subline = isProcessing
    ? "Uploading and digitizing the recording"
    : isRecording
    ? isSpeaking
      ? "Listening — speak naturally"
      : "Ready to capture · waiting for speech"
    : "Toggle on to start a recording";

  return (
    <div
      className={`neo-connect-card neo-connect-card--${variant}${
        isSpeaking ? " neo-connect-card--listening" : ""
      }`}
      role="region"
      aria-label="Neo device connection"
    >
      <div className="neo-connect-card__icon">
        <NeoMicIcon size={20} />
        {isRecording && <span className="neo-connect-card__icon-pulse" />}
      </div>

      <div className="neo-connect-card__copy">
        <div className="neo-connect-card__title">{headline}</div>
        <div className="neo-connect-card__subtitle">{subline}</div>
      </div>

      <div className="neo-connect-card__controls">
        <div className="neo-connect-card__rec">
          <Switch
            checked={isRecording}
            disabled={isProcessing}
            onChange={toggleRecording}
            aria-label="Toggle recording"
          />
          <div className="neo-connect-card__rec-label">
            {isProcessing ? (
              <span>
                <Spin size="small" /> Processing
              </span>
            ) : isRecording ? (
              <span className="neo-connect-card__rec-label--on">
                <span className="neo-connect-card__rec-dot" /> Recording
              </span>
            ) : (
              <span>Start recording</span>
            )}
          </div>
        </div>

        <Button
          type="text"
          size="small"
          icon={<NeoSettingIcon size={16} />}
          className="neo-connect-card__manage"
          onClick={openPairing}
        >
          Manage
        </Button>
      </div>
    </div>
  );
}

export default NeoConnectCard;
