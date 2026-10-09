import React, { useMemo } from "react";
import { Button, Spin, Tooltip } from "antd";
import { NeoSettingIcon, NeoFlashIcon } from "./icons";
import {
  NEO_WS_PHASE,
  deviceStateLabel,
} from "../../utils/neoConsultationUtils";
import "./NeoConsultation.scss";

function NeoConsultationStatusBanner({
  phase,
  deviceStatus,
  deviceAddress,
  errorMessage,
  rms = 0,
  rmsThreshold = 1000,
  isSpeaking = false,
  isConnected = false,
  pairedDevice = null,
  onRetryConnect,
  onOpenPairing,
}) {
  const showBar = phase !== NEO_WS_PHASE.IDLE;

  const rmsPercent = useMemo(() => {
    const cap = 5000;
    return Math.min(100, Math.round((rms / cap) * 100));
  }, [rms]);

  if (!showBar) return null;

  const deviceLabel = deviceStateLabel(phase, deviceStatus);
  const devicePillClass = isConnected
    ? "neo-status-bar__pill--connected"
    : phase === NEO_WS_PHASE.SCAN_NO_DEVICE ||
      phase === NEO_WS_PHASE.CONNECT_FAILED ||
      phase === NEO_WS_PHASE.ERROR
    ? "neo-status-bar__pill--error"
    : phase === NEO_WS_PHASE.DISCONNECTED
    ? "neo-status-bar__pill--disconnected"
    : "neo-status-bar__pill--connecting";

  const speakingPillClass = isSpeaking
    ? "neo-status-bar__pill--speaking"
    : "neo-status-bar__pill--idle";

  const showProcessing = phase === NEO_WS_PHASE.PROCESSING;
  const showRetry =
    (phase === NEO_WS_PHASE.SCAN_NO_DEVICE ||
      phase === NEO_WS_PHASE.CONNECT_FAILED ||
      phase === NEO_WS_PHASE.DISCONNECTED) &&
    onRetryConnect;

  return (
    <div className="neo-status-bar" role="status" aria-live="polite">
      <Tooltip title={deviceAddress || errorMessage || ""}>
        <span className={`neo-status-bar__pill ${devicePillClass}`}>
          <span className="neo-status-bar__dot" />
          {deviceLabel}
        </span>
      </Tooltip>

      <span className={`neo-status-bar__pill ${speakingPillClass}`}>
        {isSpeaking ? "Speaking…" : "Idle"}
      </span>

      {isConnected && (
        <div className="neo-status-bar__meter" title={`RMS ${rms} / ${rmsThreshold}`}>
          <div
            className={`neo-status-bar__meter-fill${
              isSpeaking ? " neo-status-bar__meter-fill--active" : ""
            }`}
            style={{
              width: `${rmsPercent}%`,
              backgroundColor: rms >= rmsThreshold ? "#22c55e" : undefined,
            }}
          />
        </div>
      )}

      {showProcessing && (
        <span className="neo-status-bar__processing">
          <Spin size="small" />
          Processing consultation…
        </span>
      )}

      {showRetry && (
        <Button size="small" type="link" onClick={onRetryConnect}>
          Reconnect
        </Button>
      )}

      {onOpenPairing && (
        <Tooltip
          title={
            pairedDevice
              ? `Manage Neo (${pairedDevice.name || pairedDevice.address})`
              : "Pair a Neo device to this computer"
          }
        >
          <Button
            size="small"
            className="neo-status-bar__pair-btn"
            icon={pairedDevice ? <NeoSettingIcon size={14} /> : <NeoFlashIcon size={14} />}
            onClick={onOpenPairing}
          >
            {pairedDevice ? "Manage" : "Pair Neo"}
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

export default NeoConsultationStatusBanner;
