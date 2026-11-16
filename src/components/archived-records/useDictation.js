import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictation into a text field, on the browser's own speech recognition (the
 * same engine the Rx pad's live transcript uses, see
 * dr-agent/voicerx/use-live-transcript.js).
 *
 *   const dictation = useDictation({ onFinal: (text) => append(text) });
 *   <button aria-pressed={dictation.listening} onClick={dictation.toggle} />
 *
 * `interim` is what is being heard right now and may still change; show it,
 * do not keep it. Each settled phrase arrives once through `onFinal`.
 *
 * Listening stops when asked to (stop, cancel, toggle), when the speaker
 * pauses for `silenceMs`, or when the hook's owner unmounts. `stop` keeps the
 * phrase being spoken; `cancel` drops it.
 *
 * Nothing here throws. A browser without speech recognition reports
 * `supported: false`. A refused microphone, a missing one or an unreachable
 * speech service sets `available: false` until the owner mounts again.
 */

// Only one recognition can hear the microphone at a time.
let running = null;

const recognitionOf = () => (typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);

// Ends that are not failures: we stopped it ourselves, or nobody spoke.
const QUIET_ENDS = ["aborted", "no-speech"];

export const DICTATION_UNAVAILABLE = "Dictation is not available in this browser";

export function useDictation({ lang = "en-IN", silenceMs = 4000, onFinal } = {}) {
  const supported = Boolean(recognitionOf());
  const [state, setState] = useState({ listening: false, interim: "", failed: false });
  const recognition = useRef(null);
  const quiet = useRef(null);
  // The owner's handler changes on every render; the recognition keeps
  // calling whichever is current.
  const finalHandler = useRef(onFinal);
  useEffect(() => {
    finalHandler.current = onFinal;
  });

  const end = useCallback((keep) => {
    const active = recognition.current;
    if (!active) return;
    try {
      if (keep) active.stop();
      else active.abort();
    } catch (error) {
      // Already ended.
    }
  }, []);
  const stop = useCallback(() => end(true), [end]);
  const cancel = useCallback(() => end(false), [end]);

  const start = useCallback(() => {
    const Recognition = recognitionOf();
    if (!Recognition || recognition.current) return;
    let active;
    try {
      active = new Recognition();
    } catch (error) {
      setState({ listening: false, interim: "", failed: true });
      return;
    }
    active.lang = lang;
    active.continuous = true;
    active.interimResults = true;
    active.maxAlternatives = 1;

    // A pause ends the dictation; every sound heard pushes the end back.
    const hush = () => {
      clearTimeout(quiet.current);
      quiet.current = setTimeout(() => {
        try {
          active.stop();
        } catch (error) {
          // Already ended.
        }
      }, silenceMs);
    };

    active.onstart = () => {
      setState({ listening: true, interim: "", failed: false });
      hush();
    };
    active.onresult = (event) => {
      hush();
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = (result[0]?.transcript || "").trim();
        if (!text) continue;
        if (result.isFinal) finalHandler.current?.(text);
        else interim = `${interim} ${text}`.trim();
      }
      setState((prev) => (prev.interim === interim ? prev : { ...prev, interim }));
    };
    active.onerror = (event) => {
      if (QUIET_ENDS.includes(event.error)) return;
      setState((prev) => ({ ...prev, failed: true }));
    };
    active.onend = () => {
      clearTimeout(quiet.current);
      if (recognition.current === active) recognition.current = null;
      if (running === active) running = null;
      setState((prev) => ({ ...prev, listening: false, interim: "" }));
    };

    if (running) {
      try {
        running.abort();
      } catch (error) {
        // Already ended.
      }
    }
    running = active;
    recognition.current = active;
    try {
      active.start();
    } catch (error) {
      recognition.current = null;
      if (running === active) running = null;
      setState({ listening: false, interim: "", failed: true });
    }
  }, [lang, silenceMs]);

  const { listening } = state;
  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Leaving the field's owner lets go of the microphone.
  useEffect(
    () => () => {
      clearTimeout(quiet.current);
      const active = recognition.current;
      if (!active) return;
      active.onstart = null;
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      recognition.current = null;
      if (running === active) running = null;
      try {
        active.abort();
      } catch (error) {
        // Already ended.
      }
    },
    [],
  );

  return {
    supported,
    available: supported && !state.failed,
    listening,
    interim: state.interim,
    start,
    stop,
    cancel,
    toggle,
  };
}

// Spoken words joined to what the field already holds. A phrase that opens
// the field, or follows a full stop, starts with a capital.
export function joinSpoken(written = "", spoken = "") {
  const before = String(written ?? "").replace(/\s+$/, "");
  const words = String(spoken ?? "").trim();
  if (!words) return String(written ?? "");
  const opens = !before || /[.!?]$/.test(before);
  const said = opens ? words[0].toUpperCase() + words.slice(1) : words;
  return before ? `${before} ${said}` : said;
}

export default useDictation;
