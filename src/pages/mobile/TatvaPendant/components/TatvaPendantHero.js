import React, { useEffect, useMemo, useState } from 'react';
import { useNeoConsultationContext } from '../../../../components/neo/NeoConsultationProvider';
import {
  getLastRecordingStartedAt,
  NEO_WS_PHASE,
} from '../../../../utils/neoConsultationUtils';
import {
  HeroPauseFilledIcon,
  Microphone2,
  TpIcon,
} from './TpIcons';
import ConnectingOverlay from './ConnectingOverlay';
import PendantArtwork from './PendantArtwork';
import SiriWaveform from './SiriWaveform';
import { AnimatedGrid } from './AnimatedGrid';
import './TatvaPendantHero.scss';

function TatvaPendantHero({ greetingPrimary = 'Hi', greetingName = 'Doctor', initials = '' }) {
  const neo = useNeoConsultationContext();
  const [liveTick, setLiveTick] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [micError, setMicError] = useState(null);
  const [showPhoneOption, setShowPhoneOption] = useState(false);

  const isDeviceRecording = neo?.isLocalRecording;
  const isDeviceProcessing = neo?.isLocalProcessing;
  const isLive =
    neo?.isRecording || isDeviceRecording || neo?.phase === NEO_WS_PHASE.RECORDING;
  const isConnected = neo?.isConnected;
  const isBusy = neo?.isProcessing || neo?.isTranscribingChunk || isDeviceProcessing;

  const liveStartedAt = isLive
    ? neo?.recordingStartedAt || getLastRecordingStartedAt()
    : null;

  useEffect(() => {
    if (!isLive) return undefined;
    const id = setInterval(() => setLiveTick((tick) => tick + 1), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) {
      setMicStream(null);
      setMicError(null);
      return undefined;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicError('unsupported');
      return undefined;
    }
    let active = true;
    let acquired = null;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = stream;
        setMicStream(stream);
        setMicError(null);
      })
      .catch((err) => {
        if (!active) return;
        setMicError(err?.name || 'denied');
      });
    return () => {
      active = false;
      if (acquired) acquired.getTracks().forEach((t) => t.stop());
      setMicStream(null);
    };
  }, [isLive]);

  const elapsedShort = useMemo(() => {
    if (!liveStartedAt) return null;
    const total = Math.max(0, Math.floor((Date.now() - liveStartedAt) / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [liveStartedAt, liveTick]);


  const handleRecordToggle = () => {
    if (isBusy) return;
    if (neo?.isRecording) {
      neo.toggleRecording(false);
      return;
    }
    if (isConnected) {
      neo.toggleRecording(true);
      return;
    }
    setIsScanning(true);
    neo?.scanForDevices?.();
  };

  // Browser-mic capture — no pendant required.
  const handleDeviceRecordToggle = () => {
    if (isDeviceProcessing) return;
    neo?.toggleLocalRecording?.(!isDeviceRecording);
  };

  useEffect(() => {
    if (isConnected && isScanning) setIsScanning(false);
  }, [isConnected, isScanning]);

  // Auto-finalize on disconnect mid-recording — stop the active capture so
  // anything buffered gets submitted and the CTA returns to "Connect".
  useEffect(() => {
    if (!isConnected && neo?.isRecording) {
      neo?.toggleRecording?.(false);
    }
  }, [isConnected, neo]);

  useEffect(() => {
    if (!isScanning || isConnected) return;
    const first = neo?.scanResults?.[0];
    if (first && neo?.connectDevice) {
      neo.connectDevice(first);
    }
  }, [isScanning, isConnected, neo?.scanResults, neo?.connectDevice]);

  const stateClass = !isConnected
    ? 'tp-hero--disconnected'
    : isLive
      ? 'tp-hero--live'
      : 'tp-hero--idle';

  const micBlocked = isLive && !!micError;
  const ctaLabel = isBusy
    ? 'Processing…'
    : isLive && !micBlocked
      ? `Listening (${elapsedShort || '00:00'})`
      : isConnected
        ? 'Start listening'
        : 'Connect';

  return (
    <section className={`tp-hero ${stateClass}`}>
      <AnimatedGrid
        className="tp-hero__grid"
        lineColor="rgba(255,255,255,0.45)"
        cometColor="#ffffff"
        edgeFade={false}
      />
      <div className="tp-hero__grain" aria-hidden />
      <div className="tp-hero__border-glow" aria-hidden />

      <div className="tp-hero__inner">
        <header className="tp-hero__header">
          <span
            className="tp-hero__brand-logo"
            role="img"
            aria-label="Tatva Pendant"
          />
          <span className="tp-hero__user-avatar" aria-hidden>
            <img
              className="tp-hero__user-avatar-img"
              src="https://i.pravatar.cc/120?img=49"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="tp-hero__user-avatar-inner">
              {initials || 'DR'}
            </span>
          </span>
        </header>

        {!isConnected ? (
          <div className="tp-hero__disconnected">
            <div
              className={`tp-hero__pendant ${isDeviceRecording ? '' : 'tp-hero__pendant--blink'}`}
              aria-hidden
            >
              <PendantArtwork glow={isDeviceRecording ? 'green' : 'red'} />
            </div>

            {isDeviceRecording ? (
              <>
                <p className="tp-hero__disconnected-headline">
                  Recording on this device
                </p>
                <SiriWaveform
                  active={isLive}
                  stream={micStream}
                  className="tp-hero__siri"
                />
                <button
                  type="button"
                  className="tp-hero__primary-cta"
                  onClick={handleDeviceRecordToggle}
                  disabled={micBlocked}
                >
                  <HeroPauseFilledIcon size={14} color="#ffffff" />
                  <span>{micBlocked ? 'Mic blocked' : `Stop (${elapsedShort || '00:00'})`}</span>
                </button>
                {micBlocked && (
                  <p className="tp-hero__mic-error">
                    {micError === 'NotAllowedError' || micError === 'denied'
                      ? 'Allow microphone access to continue recording'
                      : 'Mic unavailable.'}
                  </p>
                )}
              </>
            ) : isDeviceProcessing ? (
              <>
                <p className="tp-hero__disconnected-headline">Processing…</p>
                <p className="tp-hero__disconnected-sub">
                  Digitizing your recording.
                </p>
                <button type="button" className="tp-hero__primary-cta" disabled>
                  <TpIcon icon={Microphone2} size={14} color="#ffffff" />
                  <span>Processing…</span>
                </button>
              </>
            ) : (
              <>
                <p className="tp-hero__disconnected-headline">
                  Pendant not connected
                </p>
                <p className="tp-hero__disconnected-sub">
                  Pair your pendant to start listening.
                </p>

                <button
                  type="button"
                  className="tp-hero__primary-cta tp-hero__primary-cta--wide"
                  onClick={handleRecordToggle}
                >
                  <TpIcon icon={Microphone2} size={14} color="#ffffff" />
                  <span>{ctaLabel}</span>
                </button>

                {!showPhoneOption ? (
                  <button
                    type="button"
                    className="tp-hero__forgot-link"
                    onClick={() => setShowPhoneOption(true)}
                  >
                    Forgot your device?
                  </button>
                ) : (
                  <div className="tp-hero__phone-reveal">
                    <div className="tp-hero__or-split" aria-hidden>
                      <span className="tp-hero__or-split-line" />
                      <span className="tp-hero__or-split-label">or</span>
                      <span className="tp-hero__or-split-line" />
                    </div>

                    <p className="tp-hero__phone-hint">
                      Record this consultation on your phone mic
                    </p>
                    <button
                      type="button"
                      className="tp-hero__secondary-cta tp-hero__secondary-cta--wide"
                      onClick={handleDeviceRecordToggle}
                    >
                      <TpIcon icon={Microphone2} size={14} color="#ffffff" />
                      <span>Start phone recording</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="tp-hero__connected">
            <div className={`tp-hero__pendant ${!isLive ? 'tp-hero__pendant--blink' : ''}`} aria-hidden>
              <PendantArtwork glow={isLive ? 'green' : 'white'} />
            </div>

            <SiriWaveform
              active={isLive}
              stream={micStream}
              className="tp-hero__siri"
            />

            <button
              type="button"
              className="tp-hero__primary-cta"
              onClick={handleRecordToggle}
              disabled={isBusy || micBlocked}
            >
              {isLive && !micBlocked ? (
                <HeroPauseFilledIcon size={14} color="#ffffff" />
              ) : (
                <TpIcon icon={Microphone2} size={14} color="#ffffff" />
              )}
              <span>{ctaLabel}</span>
            </button>

            {micBlocked && (
              <p className="tp-hero__mic-error">
                {micError === 'NotAllowedError' || micError === 'denied'
                  ? 'Allow microphone access to continue recording'
                  : 'Mic unavailable.'}
              </p>
            )}
          </div>
        )}

      </div>
      <ConnectingOverlay
        visible={isScanning}
        onCancel={() => setIsScanning(false)}
        title={
          neo?.bridgeUnreachable
            ? 'Bridge offline'
            : neo?.scanResults?.length
              ? 'Pairing with device'
              : 'Looking for device'
        }
        subtitle={
          neo?.bridgeUnreachable
            ? 'Start ws_server.py on :8081 to begin scanning.'
            : neo?.scanResults?.length
              ? `${neo.scanResults[0]?.name || 'Tatva Pendant'} found, connecting…`
              : 'Make sure your pendant is nearby and powered on.'
        }
      />
    </section>
  );
}

export default TatvaPendantHero;
