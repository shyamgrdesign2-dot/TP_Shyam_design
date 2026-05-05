"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight Web Speech API wrapper — lets the VoiceRx panel render REAL live
 * transcription while the doctor speaks. Zero dependencies; works in Chrome,
 * Edge, Safari (partial). Gracefully reports unsupported environments so callers
 * can fall back to a scripted demo transcript.
 */

// Shape of the browser-provided SpeechRecognition constructor we expect.




































function getCtor() {
  if (typeof window === "undefined") return null;
  const w = window;



  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}























export function useLiveTranscript(opts) {
  const { enabled, paused = false, lang = "en-IN" } = opts;
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimeoutRef = useRef(null);

  useEffect(() => {
    const Ctor = getCtor();
    setIsSupported(!!Ctor);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    if (!enabled) return;

    shouldListenRef.current = !paused;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let finalBits = "";
      let interimBits = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) finalBits += piece;else
        interimBits += piece;
      }
      if (finalBits) {
        setTranscript((prev) => {
          // Keep spacing tidy.
          const needsSpace = prev && !prev.endsWith(" ") && !finalBits.startsWith(" ");
          return prev + (needsSpace ? " " : "") + finalBits.trim() + " ";
        });
      }
      setInterim(interimBits);
    };

    rec.onerror = (e) => {
      // "no-speech" is expected and harmless — the recognizer simply heard silence.
      // "aborted" means we stopped it ourselves. Both should stay silent in the UI.
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access was denied");
      } else if (e.error === "network") {
        setError("Speech recognition is offline");
      } else if (e.error) {
        setError(e.error);
      }
    };

    rec.onend = () => {
      // Chrome ends sessions every ~60s — restart if we still want to listen.
      if (shouldListenRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            rec.start();
          } catch {

            /* already started — ignore */}
        }, 120);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start speech recognition");
    }

    return () => {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.abort();
      } catch {

        /* ignore */}
      recognitionRef.current = null;
    };
  }, [enabled, lang]); // paused handled via ref + effect below

  // Pause/resume without tearing down — preserves captured text.
  useEffect(() => {
    shouldListenRef.current = enabled && !paused;
    const rec = recognitionRef.current;
    if (!rec) return;
    if (paused) {
      try {
        rec.stop();
      } catch {

        /* ignore */}
      setInterim("");
    }
    // Un-pausing re-triggers onend → auto-restart path above.
  }, [enabled, paused]);

  return {
    transcript: transcript.trim(),
    interim: interim.trim(),
    isSupported,
    error,
    reset
  };
}