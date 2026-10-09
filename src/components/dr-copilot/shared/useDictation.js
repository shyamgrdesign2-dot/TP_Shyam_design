/**
 * Live dictation: a running transcript to keep, and a media stream to draw.
 *
 * Shared, because the same gesture belongs in two places - the search bar out
 * on the page, and the mic in Copilot's own composer. Same engine, same
 * behaviour, one implementation.
 *
 * Two independent halves, on purpose:
 *
 *   The words come from `react-speech-recognition`, the maintained React
 *   wrapper around the browser's Speech Recognition API. It owns the tricky
 *   parts - one recogniser shared across every component that asks for it,
 *   restarting it when the browser ends a "continuous" session early (Chrome
 *   does, after a pause), and the Android quirks. Hand-rolling that was fine
 *   while this was one bar; it is not fine now that two surfaces use it.
 *
 *   The waveform needs an audio stream, which the recognition API does not
 *   expose, so `getUserMedia` is opened alongside it. A refused microphone
 *   therefore still leaves recognition a chance, and a browser with no
 *   recognition still draws a live waveform. Neither half failing takes the
 *   other down.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"

export function useDictation() {
  const [state, setState] = useState("idle")
  const [stream, setStream] = useState(null)
  const [micError, setMicError] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const streamRef = useRef(null)
  const startedAtRef = useRef(0)

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  const transcriptRef = useRef("")
  transcriptRef.current = transcript

  const teardown = useCallback(() => {
    SpeechRecognition.stopListening()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setStream(null)
    setState("idle")
    setElapsed(0)
  }, [])

  useEffect(() => teardown, [teardown])

  useEffect(() => {
    if (state !== "recording") return undefined
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      250
    )
    return () => clearInterval(id)
  }, [state])

  const start = useCallback(async () => {
    if (state === "recording" && streamRef.current) return
    resetTranscript()
    setMicError(false)
    startedAtRef.current = Date.now()
    setState("recording")

    /* `continuous` keeps the recogniser alive across the pauses in normal
       speech; the library restarts it for us when the browser cuts a session
       short, which is the whole reason for depending on it. */
    SpeechRecognition.startListening({ continuous: true, language: "en-IN" })

    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = media
      setStream(media)
    } catch (err) {
      /* No mic, or permission refused. Say so: a waveform sitting flat while
         the doctor talks is worse than an honest "blocked", because it looks
         like the feature is broken rather than un-permitted. Recognition may
         still work on its own, so carry on rather than dropping the gesture. */
      setMicError(true)
    }
  }, [state, resetTranscript])

  const stop = useCallback(() => {
    const text = transcriptRef.current
    teardown()
    return text
  }, [teardown])

  const cancel = useCallback(() => {
    resetTranscript()
    teardown()
  }, [teardown, resetTranscript])

  return {
    state,
    stream,
    transcript,
    elapsed,
    micError,
    start,
    stop,
    cancel,
    supported: browserSupportsSpeechRecognition,
  }
}
