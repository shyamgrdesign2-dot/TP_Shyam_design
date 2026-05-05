"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, MicOff, WifiOff, Mic, AlertCircle } from "lucide-react";

import { VoiceRxSiriWaveform } from "@/src/components/organisms/voicerx/VoiceRxSiriWaveform";
import { useNetConnection } from "@/src/components/organisms/voicerx/use-net-connection";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/atoms/Popover";
import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { cn } from "@/src/hooks/utils";
import { playVoiceRxErrorSound, playVoiceRxStartSound } from "@/src/components/organisms/voicerx/audio";
import styles from "./VoiceRxModuleRecorder.module.scss";

// Minimal ambient typings for Web Speech API (not in lib.dom.d.ts).


















function AnimatedTranscriptPreview({
  text,
  className



}) {
  const tokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text]);
  const prevVisibleCountRef = useRef(0);
  let visibleIndex = -1;
  const prevVisible = prevVisibleCountRef.current;

  const rendered = tokens.map((token, index) => {
    if (/^\s+$/.test(token)) return <span key={index}>{token}</span>;

    visibleIndex += 1;
    const isNew = visibleIndex >= prevVisible;
    const stagger = Math.min((visibleIndex - prevVisible) * 26, 220);

    return (
      <span
        key={index}
        className="vrx-word"
        style={
        isNew ?
        { "--vrx-stagger": `${stagger}ms` } :
        undefined
        }
        data-word-new={isNew ? "true" : undefined}>
        
        {token}
      </span>);

  });

  useEffect(() => {
    prevVisibleCountRef.current = visibleIndex + 1;
  });

  return <p className={className}>{rendered}</p>;
}

/**
 * Inline per-Rx-module / per-sidebar-section voice recorder.
 *
 * Two-column layout inside a lighter AI-gradient rectangle:
 *
 *   ┌── gradient rectangle ───────────────────────────────────────────┐
 *   │  ┌ transcript (left ~60%) ──────┐  ┌ actions (right ~40%) ────┐ │
 *   │  │  rolling 4-5 line transcript │  │  [wave reactive strip]   │ │
 *   │  │  with top-fade mask          │  │  [✕] [🎤 ⌄] [✓ Submit]   │ │
 *   │  │  OR illustrated error state  │  │  · Listening · 00:04 ·    │ │
 *   │  └───────────────────────────────┘  └──────────────────────────┘ │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Error states (permission denied, offline, slow connection) replace
 * the transcript zone with a Dr. Agent-style illustrated block: chunky
 * icon, concise title, short secondary explainer, and a retry CTA when
 * applicable. Submit + mic actions on the right are disabled under any
 * critical block so the user can't kick off more recording attempts.
 */

























function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VoiceRxModuleRecorder({
  sectionLabel,
  onCancel,
  onSubmit,
  transcript: scriptedTranscript,
  radiusClassName = "rounded-b-[16px]",
  variant = "row",
  fillHeight = false
}) {
  const [manualMute, setManualMute] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCompactLayout, setIsCompactLayout] = useState(variant === "stack");
  // ULTRA-compact at narrow iPad widths (<460px). Drops wave + CTA
  // sizing further so the row variant doesn't overlap on small tablets.
  const [isUltraCompact, setIsUltraCompact] = useState(false);
  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(undefined);
  const [stream, setStream] = useState(null);
  const [micError, setMicError] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [micRetryKey, setMicRetryKey] = useState(0);
  const startRef = useRef(Date.now());
  const containerRef = useRef(null);
  // 0..1 smoothed audio level fed by the SiriWaveform analyser; drives
  // the bottom-anchored violet blob's wobble + opacity. Without this the
  // blob runs on a fixed CSS keyframe and looks "decorative" — we want
  // the same speaking-reactive glow as the Dr. Agent panel.
  const levelRef = useRef(0);
  const net = useNetConnection();
  const { setActiveVoiceModule } = useRxPadSync();

  useEffect(() => {
    setActiveVoiceModule(sectionLabel);
    return () => setActiveVoiceModule(null);
  }, [sectionLabel, setActiveVoiceModule]);

  useEffect(() => {
    playVoiceRxStartSound();
  }, []);

  useEffect(() => {
    if (variant === "stack") {
      setIsCompactLayout(true);
      setIsUltraCompact(false);
      return;
    }
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const w = node.getBoundingClientRect().width;
      // Compact thresholds tuned for the in-visit RxPad — when the
      // historical sidebar AND the Dr. Agent panel are both open the
      // form column can drop to ~380px, which is well past the older
      // `< 460` breakpoint. Bumping these so the CTAs / wave / pill
      // collapse into the compact + ultra-compact treatments earlier
      // and the recorder never feels crammed.
      setIsCompactLayout(w < 620);
      setIsUltraCompact(w < 500);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant]);

  // ── Publish smoothed audio level to a CSS variable on the recorder
  //    container so the bottom-anchored .tp-voice-blob can scale + boost
  //    its opacity with the user's voice. We update on every animation
  //    frame so the wobble feels physical rather than tween-y.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const tick = () => {
      const node = containerRef.current;
      if (node) {
        const v = Math.max(0, Math.min(1, levelRef.current || 0));
        node.style.setProperty("--vrx-blob-level", v.toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Mic stream ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone not supported in this browser");
      return;
    }
    let cancelled = false;
    let acquired = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = s;
        setStream(s);
        setMicError(null);
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) {
            setDevices(
              all.
              filter((d) => d.kind === "audioinput").
              map((d) => ({
                deviceId: d.deviceId,
                label: d.label || `Microphone (${(d.deviceId || "default").slice(0, 6)})`
              }))
            );
          }
        } catch {/* ignore */}
      } catch (e) {
        if (!cancelled) setMicError(e instanceof Error ? e.message : "Microphone access denied");
      }
    })();
    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [selectedDeviceId, micRetryKey]);

  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {t.enabled = !manualMute;});
  }, [manualMute, stream]);

  // ── Web Speech live transcript ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";
    recog.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      setLiveTranscript(text.trim());
    };
    recog.onerror = () => {/* swallow transient no-speech */};
    recog.onend = () => {try {recog.start();} catch {/* ignore */}};
    try {recog.start();} catch {/* ignore */}
    return () => {recog.onend = null;try {recog.stop();} catch {/* ignore */}};
  }, []);

  const networkPaused = !net.online || net.slowConnection;
  const hasMicError = Boolean(micError);
  const criticalBlock = hasMicError || networkPaused;
  const isPaused = manualMute || criticalBlock;
  const isListening = !isPaused;

  useEffect(() => {
    if (isPaused) return;
    const tick = () => setElapsedMs(Date.now() - startRef.current);
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused) startRef.current = Date.now() - elapsedMs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  const displayTranscript = scriptedTranscript && scriptedTranscript.length > 0 ?
  scriptedTranscript :
  liveTranscript;
  const hasTranscript = displayTranscript.trim().length > 0;
  const transcriptScrollRef = useRef(null);
  const compactControls = variant === "stack" || isCompactLayout;

  useEffect(() => {
    const node = transcriptScrollRef.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
  }, [displayTranscript]);

  // ── Critical-block empty state, mirroring the Dr. Agent panel ──────────
  const block = useMemo(





    () => {
      if (!net.online) return {
        kind: "offline",
        icon: <WifiOff size={32} strokeWidth={2.2} absoluteStrokeWidth />,
        title: "You\u2019re offline",
        description: "Recording is paused until you\u2019re back online. Your transcript so far is safe — it resumes automatically.",
        canRetry: false
      };
      if (net.slowConnection) return {
        kind: "slow",
        icon: <AlertCircle size={32} strokeWidth={2.2} absoluteStrokeWidth />,
        title: "Connection unstable",
        description: "We\u2019ve paused recording because the connection is slow. It will resume automatically when the network stabilises.",
        canRetry: false
      };
      if (hasMicError) return {
        kind: "mic",
        icon: <MicOff size={32} strokeWidth={2.2} absoluteStrokeWidth />,
        title: "Microphone unavailable",
        description: micError || "Allow microphone access in your browser to start dictation. Your transcript so far stays safe.",
        canRetry: true
      };
      return null;
    }, [net.online, net.slowConnection, hasMicError, micError]);

  const lastErrorToneRef = useRef(null);
  useEffect(() => {
    const errorKey = block ? `${block.kind}:${block.title}` : null;
    if (!errorKey) {
      lastErrorToneRef.current = null;
      return;
    }
    if (lastErrorToneRef.current === errorKey) return;
    lastErrorToneRef.current = errorKey;
    playVoiceRxErrorSound();
  }, [block]);

  // Status pill label — short. Full explanation already lives in the
  // empty-state block on the left, so the pill only needs a terse cue.
  const statusLabel = hasMicError ?
  "Mic error" :
  !net.online ?
  "Offline" :
  net.slowConnection ?
  "On hold" :
  manualMute ?
  "Paused" :
  "Listening";

  // ── Shared render pieces (used by both `row` and `stack` variants) ────
  const waveStrip =
  // 60px high so the Siri wave has room to warble without clipping
  // top/bottom when the clinician speaks loudly. Used by both the row
  // variant (Rx modules) and the stack variant (sidebar overlay).
  // The waveform also feeds `levelRef` so the bottom-anchored blob
  // wobbles in time with the speaker.
  <div
    className={cn(
      "relative w-full overflow-hidden rounded-[10px]",
      variant === "stack" ?
      "h-[48px] max-w-[260px]" :
      isUltraCompact ?
      "h-[44px] max-w-[220px]" :
      compactControls ?
      "h-[52px] max-w-[280px]" :
      "h-[60px] max-w-[320px]"
    )}>
    
      <VoiceRxSiriWaveform
      className="absolute inset-0 h-full w-full"
      stream={stream}
      paused={isPaused}
      levelRef={levelRef} />
    
      {isPaused ? <div className="absolute inset-0 backdrop-blur-[2px]" /> : null}
    </div>;


  const transcriptBlock = block ?
  // Error empty-state. Two shapes:
  //  • ROW variant   — compact horizontal (40px icon, title + retry
  //                    inline on the right) so the card can stay
  //                    near its 80px minimum height.
  //  • STACK variant — full empty-state illustration: large centered
  //                    icon in a soft halo, bold title, 12px
  //                    description line, outlined blue retry CTA.
  //                    Proper "there's nothing here yet" feel.
  variant === "stack" ?
  <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
        {/* Empty-state mark — soft slate circle, slate-400 glyph inside.
         Heavier gray-on-gray treatment (no violet ring) so it reads
         as an illustration-quiet background element, not a control. */}
        <div
      aria-hidden
      className={cn("relative mb-[14px] inline-flex h-[68px] w-[68px] items-center justify-center rounded-full", styles.errorHaloOuter)}>
      
          <span
        className={cn("absolute inset-[10px] rounded-full", styles.errorHaloInner)} />
      
          <span className="relative text-tp-slate-400">
            {block.icon}
          </span>
        </div>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-tp-slate-700">
          {block.title}
        </h3>
        <p className="mt-[6px] max-w-[280px] text-[12px] leading-[1.55] text-tp-slate-500">
          {block.description}
        </p>
        {block.canRetry ?
    <button
      type="button"
      onClick={() => setMicRetryKey((k) => k + 1)}
      className={cn("mt-[14px] inline-flex h-[34px] items-center gap-[6px] rounded-[8px] border bg-transparent px-[14px] text-[12px] font-semibold transition-colors active:scale-[0.98] hover:bg-tp-blue-50/40", styles.retryBtn)}>
      
            <Mic size={13} strokeWidth={2.2} aria-hidden />
            Allow microphone access
          </button> :
    null}
      </div> :

  // Row variant — vertical stack (icon → title → CTA). Larger icon
  // centered with minimal padding so the empty state reads like a
  // proper illustration, not a squeezed chip.
  <div className="flex flex-col items-center gap-[6px] text-center" role="status" aria-live="polite">
        <div
      aria-hidden
      className={cn("relative inline-flex h-[56px] w-[56px] items-center justify-center rounded-full", styles.errorHaloOuterRow)}>
      
          <span
        className={cn("absolute inset-[8px] rounded-full", styles.errorHaloInnerRow)} />
      
          <span className="relative text-tp-slate-400 [&>svg]:h-[28px] [&>svg]:w-[28px]">
            {block.icon}
          </span>
        </div>
        <h3 className="text-[12px] font-semibold tracking-[-0.01em] text-tp-slate-700">
          {block.title}
        </h3>
        {block.canRetry ?
    <button
      type="button"
      onClick={() => setMicRetryKey((k) => k + 1)}
      className={cn("inline-flex h-[28px] items-center gap-[5px] rounded-[6px] border bg-transparent px-[10px] text-[12px] font-semibold transition-colors active:scale-[0.98] hover:bg-tp-blue-50/40", styles.retryBtnRow)}>
      
            <Mic size={11} strokeWidth={2.2} aria-hidden />
            Allow microphone access
          </button> :

    <p className="max-w-[240px] text-[12px] leading-[16px] text-tp-slate-500">
            {block.description}
          </p>
    }
      </div> :


  <div className="flex w-full items-center justify-center text-center">
      <div
      ref={transcriptScrollRef}
      className={cn(
        "w-full overflow-y-auto px-1",
        variant === "stack" ? "max-h-[176px]" : "max-h-[108px]",
        styles.transcriptScroll
      )}>
      
        {hasTranscript ?
      <AnimatedTranscriptPreview
        text={displayTranscript}
        className={cn(
          "whitespace-pre-wrap break-words text-center tracking-[-0.01em] text-tp-slate-400",
          variant === "stack" ?
          "text-[16px] font-medium leading-[1.8]" :
          "text-[14px] font-medium leading-[1.72]"
        )} /> :


      <p
        className={cn(
          "text-center tracking-[-0.01em] text-tp-slate-400/70",
          variant === "stack" ?
          "text-[14px] font-normal leading-[1.65]" :
          "text-[14px] font-normal leading-[1.55]"
        )}>
        
            Start speaking, you&apos;ll see the caption here
          </p>
      }
      </div>
    </div>;


  const ctaRow =
  <div className={cn(
    "flex items-center justify-center",
    isUltraCompact ? "gap-[8px]" : compactControls ? "gap-[10px]" : "gap-[14px]"
  )}>
      {/* Close — matches VoiceRxActiveAgent's red X */}
      <button
      type="button"
      onClick={() => setConfirmCloseOpen(true)}
      aria-label="Cancel dictation"
      className={cn(
        "vrx-lg-btn vrx-close-btn group relative flex shrink-0 items-center justify-center rounded-[12px] transition-transform active:scale-[0.94]",
        isUltraCompact ? "h-[34px] w-[34px]" : compactControls ? "h-[38px] w-[38px]" : "h-[42px] w-[42px]"
      )}>
      
        <span className="vrx-lg-surface" aria-hidden />
        <span className="vrx-lg-sheen" aria-hidden />
        <svg width={isUltraCompact ? 18 : compactControls ? 20 : 24} height={isUltraCompact ? 18 : compactControls ? 20 : 24} viewBox="0 0 24 24" fill="none" className="relative text-[#DC2626] transition-colors">
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 6L18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className={cn("vrx-cta-divider", compactControls && "h-[30px]", isUltraCompact && "h-[24px]")} aria-hidden />

      {/* Segmented mic — bulk icon matching VoiceRxActiveAgent */}
      <div
      className={cn(
        "vrx-lg-btn relative flex items-stretch overflow-hidden rounded-[12px] transition-opacity",
        isUltraCompact ? "h-[34px]" : compactControls ? "h-[38px]" : "h-[42px]",
        manualMute && "vrx-mic-muted",
        criticalBlock && "opacity-60 pointer-events-none"
      )}>
      
        <span className="vrx-lg-surface" aria-hidden />
        <span className="vrx-lg-sheen" aria-hidden />
        <button
        type="button"
        onClick={() => setManualMute((v) => !v)}
        disabled={criticalBlock}
        className={cn(
          "relative flex h-full items-center justify-center transition-transform active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-60",
          isUltraCompact ? "w-[34px]" : compactControls ? "w-[38px]" : "w-[44px]",
          manualMute ? "text-amber-600" : "text-tp-slate-500"
        )}
        aria-label={manualMute ? "Unmute microphone" : "Mute microphone"}
        aria-pressed={manualMute}>
        
          <span className="relative inline-flex h-[24px] w-[24px] items-center justify-center">
            {/* Bulk mic icon — same as VoiceRxActiveAgent */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path opacity="0.4" d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
              <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
            </svg>
            {manualMute &&
          <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
                <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
          }
          </span>
        </button>
        <div className="vrx-lg-divider" aria-hidden />
        <Popover open={devicePopoverOpen} onOpenChange={setDevicePopoverOpen}>
          <PopoverTrigger asChild>
            <button
            type="button"
            disabled={criticalBlock}
            className={cn(
              "relative flex h-full items-center justify-center transition-transform active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60",
              compactControls ? "w-[24px]" : "w-[28px]",
              manualMute ? "text-amber-600 hover:text-amber-700" : "text-tp-slate-500 hover:text-tp-slate-700"
            )}
            aria-label="Choose microphone">
            
              <ChevronDown
              size={compactControls ? 14 : 16}
              strokeWidth={2.5}
              className={cn("relative transition-transform duration-200", devicePopoverOpen && "rotate-180")} />
            
            </button>
          </PopoverTrigger>
          <PopoverContent
          align="center" side="top" sideOffset={10}
          data-voice-allow
          className="w-[240px] overflow-hidden rounded-2xl border border-tp-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]">
          
            <div className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">
              Microphone
            </div>
            {devices.length === 0 ?
          <div className="px-3 py-3 text-[14px] text-tp-slate-500">
                {micError ? micError : "No input devices detected"}
              </div> :

          devices.map((d, i) => {
            const isSelected = selectedDeviceId ? selectedDeviceId === d.deviceId : i === 0;
            return (
              <button
                key={d.deviceId || i}
                type="button"
                onClick={() => {setSelectedDeviceId(d.deviceId);setDevicePopoverOpen(false);}}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors",
                  isSelected ?
                  "bg-tp-slate-100 font-semibold text-tp-slate-900" :
                  "text-tp-slate-700 hover:bg-tp-slate-50"
                )}>
                
                    <span className="truncate">{d.label}</span>
                    {isSelected && <Check size={14} className="shrink-0 text-tp-slate-700" />}
                  </button>);

          })
          }
          </PopoverContent>
        </Popover>
      </div>

      <span className={cn("vrx-cta-divider", compactControls && "h-[30px]", isUltraCompact && "h-[24px]")} aria-hidden />

      {/* Submit — gradient hero with sheen, matching VoiceRxActiveAgent */}
      <button
      type="button"
      onClick={() => onSubmit(displayTranscript)}
      disabled={criticalBlock || !hasTranscript}
      aria-label="Submit dictation"
      className={cn(
        "vrx-submit-hero group relative flex items-center overflow-hidden rounded-[12px] text-white transition-transform",
        isUltraCompact ? "gap-[6px]" : "gap-[8px]",
        isUltraCompact ?
        "h-[34px] pl-[10px] pr-[12px]" :
        compactControls ?
        "h-[38px] pl-[14px] pr-[16px]" :
        "h-[42px] pl-[18px] pr-[22px]",
        !criticalBlock && hasTranscript ?
        "hover:scale-[1.03] active:scale-[0.97]" :
        criticalBlock ? "vrx-submit-dim cursor-not-allowed opacity-40" : "vrx-submit-dim cursor-not-allowed"
      )}>
      
        <span className="vrx-submit-gradient absolute inset-0 rounded-[inherit]" aria-hidden />
        <span
        className={cn("pointer-events-none absolute inset-x-0 top-0 h-[55%] rounded-[inherit]", styles.submitTopSheen)}
        aria-hidden />
      
        {!criticalBlock && hasTranscript &&
      <span aria-hidden className="vrx-submit-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />
      }
        <span className={cn("relative z-[1]", isUltraCompact ? styles.submitIconRowUltra : styles.submitIconRow)}>
          <svg width={isUltraCompact ? 18 : compactControls ? 20 : 24} height={isUltraCompact ? 18 : compactControls ? 20 : 24} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20.46 6.17969L8.82003 17.8197L3.53003 12.5297" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={cn("font-semibold tracking-[0.2px]", isUltraCompact ? "text-[11px]" : compactControls ? "text-[12px]" : "text-[14px]")}>Submit</span>
        </span>
      </button>
    </div>;


  return (
    <div
      ref={containerRef}
      data-voice-allow
      className={cn(
        "relative overflow-hidden",
        fillHeight && "h-full",
        radiusClassName,
        // Outer background:
        //   ROW variant   — Dr. Agent brand textured AI gradient washed to
        //                   ~10% visibility by a near-opaque white overlay,
        //                   so the card reads white with a faint violet tint.
        //   STACK variant — same base bg + top-fade mask that dissolves the
        //                   top edge into the scrolling cards above.
        variant === "stack" ? styles.recorderBgStack : styles.recorderBg
      )}>
      
      {variant === "stack" ?
      // ── STACK variant — used inside sidebar historical panels.
      //    Transcript fills the top, wave + CTAs below, pill at the
      //    bottom edge. Takes the whole container height so the
      //    transcript can stretch like Dr. Agent's voice active mode.
      <>
          {/* Wobbling violet blob — pinned to the very bottom edge of
             the panel with overflow-hidden so only the top arc / "half
             heart" reads. Larger than the previous decorative blob
             (240×96) and reactive to the speaker via --vrx-blob-level
             so the glow swells when the clinician speaks. */}
          <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden flex justify-center", styles.blobWrapperStack)}>
          
            <div className={cn("tp-voice-blob tp-voice-blob--reactive h-[120px] w-[280px]", styles.blobMargin)} />
          </div>
          <div
          className={cn(
            "relative z-10 flex flex-col px-4 pt-6 pb-[48px]",
            fillHeight && "h-full"
          )}>
          
            {/* Transcript / empty-state — fills the upper portion. */}
            <div className="flex min-h-0 flex-1 items-end justify-center overflow-hidden pb-4">
              <div className="w-full max-w-[340px]">
                {transcriptBlock}
              </div>
            </div>
            {/* Wave strip — its own breathing room. */}
            <div className="mt-[20px] flex justify-center">{waveStrip}</div>
            {/* CTAs — clear separation from the wave above and the
               Listening pill that's pinned at the bottom. */}
            <div className="mt-[18px] flex justify-center">{ctaRow}</div>
          </div>
        </> :

      // ── ROW variant — used inside Rx modules (wide horizontal card).
      //    Left: wave + CTAs. Right: transcript / empty-state.
      <>
        {/* Bottom-pinned wobble blob — clipped by the outer
             overflow-hidden of the recorder rectangle. Larger size +
             reactive via --vrx-blob-level. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden flex justify-center",
            isUltraCompact ? styles.blobWrapperRowUltra : styles.blobWrapperRow
          )}>
          
          <div
            className={cn(
              "tp-voice-blob tp-voice-blob--reactive",
              isUltraCompact ? "h-[88px] w-[200px]" : "h-[104px] w-[240px]",
              styles.blobMargin
            )} />
          
        </div>
        <div className={cn(
          // Generous symmetric vertical padding (`py-[34px]`) so the
          // recorder reads as airy and the absolute-bottom status pill
          // sits well clear of the cancel / mic / Submit cluster on
          // every screen width. Min heights bumped in step so the
          // cluster never feels crammed even when both sidebars are
          // open and the form column is squeezed.
          "relative z-10 flex items-center gap-0 py-[34px]",
          isUltraCompact ? "min-h-[160px]" : "min-h-[180px]"
        )}>
        {/* LEFT: transcript / empty-state (mic status, "Allow microphone
               access" CTA, etc.). Flipped from its old position on the
               right so the read-only content hugs the leading edge while
               the action cluster sits at the trailing edge. */}
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center px-4 text-center">
          {transcriptBlock}
        </div>
        {/* Vertical divider — faint, not a cut. */}
        <div aria-hidden className="self-stretch w-px bg-gradient-to-b from-transparent via-tp-slate-200/60 to-transparent" />
        {/* RIGHT: wave + CTA cluster. `items-center` on the parent
               vertically centers the column to the violet recorder card. */}
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[10px] px-4">
          {waveStrip}
          {ctaRow}
        </div>
      </div>
      </>
      }

      {/* ── Status pill — matches VoiceRxActiveAgent's vrx-status-card ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center">
            <div
          className={cn(
            // Pill kept compact so the absolute-bottom badge doesn't
            // overlap the cancel/mic CTAs in the right column on
            // narrower widths. Vertical padding shrunk from 8/10 to
            // 4/5; the inner row below now reserves matching top +
            // bottom padding for breathing room.
            "vrx-status-card relative inline-flex items-center gap-[6px] rounded-t-[10px] rounded-b-none bg-white/60 pl-[10px] pr-[12px] pt-[4px] pb-[5px] backdrop-blur-[10px] transition-all duration-200",
            hasMicError || !net.online || net.slowConnection ? "vrx-status-card--error" : manualMute && "vrx-status-card--paused"
          )}
          role={hasMicError ? "alert" : "status"}
          aria-live="polite">
          
              {criticalBlock ?
          <span className="inline-flex h-[14px] w-[14px] items-center justify-center text-red-500" aria-hidden>
                  <AlertCircle size={14} strokeWidth={2.4} />
                </span> :
          isListening ?
          <span className="relative inline-flex h-[10px] w-[10px] items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-rose-400" />
                  <span className={cn("absolute inset-0 rounded-full bg-rose-400/55", styles.recRingAnim)} />
                </span> :
          manualMute ?
          <span className="inline-flex h-[10px] w-[10px] items-center justify-center text-amber-500/80">
                  <svg width={7} height={9} viewBox="0 0 8 10" fill="none" aria-hidden>
                    <rect x="0" y="0" width="3" height="10" rx="1" fill="currentColor" />
                    <rect x="5" y="0" width="3" height="10" rx="1" fill="currentColor" />
                  </svg>
                </span> :

          <span className="inline-block h-[7px] w-[7px] rounded-full bg-tp-slate-400/70" />
          }

              <span className={cn(
            // Text dropped from 14px → 12px so the pill stays compact;
            // pairs with the smaller 4/5 vertical padding so the badge
            // sits cleanly under the cancel / mic / Submit row without
            // overlapping it on narrow widths.
            "text-[12px] font-medium tracking-[-0.05px] leading-none tabular-nums",
            criticalBlock ? "text-red-600" : "text-tp-slate-600"
          )}>
                {statusLabel}
                {!criticalBlock && <span className="ml-[3px] font-normal text-tp-slate-400/80">· {sectionLabel}</span>}
                {!criticalBlock && (isListening || manualMute) && elapsedMs > 0 &&
            <span className="ml-[6px] font-normal text-tp-slate-400">
                    ({formatElapsed(elapsedMs)})
                  </span>
            }
              </span>
            </div>
      </div>

      <TPConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title="Close this voice consultation?"
        warning="Are you sure you want to close this voice Rx? If you close it, no data will be stored."
        primaryLabel="Keep recording"
        onPrimary={() => setConfirmCloseOpen(false)}
        secondaryLabel="Close and discard"
        secondaryTone="destructive"
        onSecondary={() => {setConfirmCloseOpen(false);onCancel();}} />
      

      {/* All vrx-* styles live in app/globals.css */}
    </div>);

}