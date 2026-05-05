"use client";

/**
 * VoiceTranscriptProcessingCard — the card that takes over the Dr.Agent
 * chat surface immediately after the user submits a voice consultation.
 *
 * Two visual phases, ~10s total:
 *   1. STRUCTURING (~7s)
 *      • Card body shows the live/transformed transcript inside a 400px
 *        scrollable area, wrapped by an animated TP-blue "shine border"
 *        that rotates clockwise on a static white base.
 *      • Below the card sits a shimmer caption-carousel loader cycling
 *        through ~3 phrases ("Structuring your transcript...", etc.) +
 *        a small spinner — the doctor knows we're working.
 *   2. TABS (after total ~10s)
 *      • The same card chrome morphs into a tabbed view:
 *        Transcript / TP EMR / Clinical Notes
 *      • Defaults to TP EMR (per spec), Clinical Notes shows the
 *        existing note format slot.
 *      • The shine border keeps spinning subtly so the AI-generation
 *        feel persists, but the caption loader retires.
 *
 * Props:
 *   - mode: "ambient_consultation" | "dictation" — drives transcript
 *     rendering (doctor/patient bubbles vs single paragraph).
 *   - transcript: raw transcript text to render in the Transcript tab.
 *   - structuringMs / totalMs: timings; defaulting to 3000 / 10000 to
 *     match the spec ("3s before transcript appears, ~7s more before
 *     tabs reveal"). Submit-button spinner duration is owned by the
 *     parent's `isAwaitingResponse` flag.
 *   - tpEmrSlot / clinicalNotesSlot: tab body slots — pass already-
 *     rendered cards (e.g. existing VoiceStructuredRxCard for TP EMR).
 *     If undefined, the tab shows a placeholder.
 *   - onComplete: optional callback fired when the tabs phase begins
 *     (parent can cancel/replace this card with the final card list).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/src/hooks/utils";
import { ShineBorder } from "@/src/components/atoms/ShineBorder";
import styles from "./VoiceTranscriptProcessingCard.module.scss";

/**
 * Tiny in-view hook — fires `inView=true` once the target's bounding box
 * crosses the viewport (or scroll-root) by `threshold`. Stays true after
 * first reveal so the stagger animation plays exactly once even if the
 * element scrolls in and out.
 */
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}















const CAPTION_PHRASES = [
"Structuring your transcript",
"Capturing the clinical data",
"Drafting the TP EMR",
"Generating clinical notes"];


// ─── Transcript renderer ─────────────────────────────────────────────────────

/**
 * Split a transcript into doctor/patient turns. Looks for explicit
 * `Doctor:` / `Patient:` markers first; if none are found, falls back to
 * sentence-alternating heuristic (good enough for a demo).
 */
function parseConversation(raw) {
  // Markers can appear ANYWHERE in the stream — when chunks are joined
  // with "" (which is what the demo does) the "Doctor:" / "Patient:"
  // prefixes end up mid-string, not at line starts. Split on a global
  // lookahead so each marker, wherever it sits, anchors a new turn.
  const explicit = raw.split(/(?=\b(?:Doctor|Patient)\s*:)/g).map((s) => s.trim()).filter(Boolean);
  const turns = [];
  if (explicit.length > 1) {
    for (const seg of explicit) {
      const m = seg.match(/^(Doctor|Patient)\s*:\s*([\s\S]*)/i);
      if (m) turns.push({ speaker: m[1].toLowerCase(), text: m[2].trim() });
    }
    if (turns.length) return turns;
  }
  // Fallback — alternate sentences.
  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return sentences.map((s, i) => ({ speaker: i % 2 === 0 ? "doctor" : "patient", text: s }));
}

export function ConversationTranscript({ raw }) {
  const turns = useMemo(() => parseConversation(raw), [raw]);
  const [rootRef, inView] = useInView(0.15);
  // Chat-style bubbles: inline "Doctor:" / "Patient:" prefix on the
  // same line as the body, one corner cut to 4px (bottom-left for
  // doctor, bottom-right for patient) so the bubble points back at the
  // speaker. Background mirrors the Dr. Agent chat — translucent white
  // for doctor, soft TP-violet wash for patient.
  return (
    <ul ref={rootRef} className="flex flex-col gap-[8px]">
      {turns.map((t, i) => {
        const label = t.speaker.charAt(0).toUpperCase() + t.speaker.slice(1);
        return (
          <li
            key={i}
            className={cn("flex w-full", t.speaker === "doctor" ? "justify-start" : "justify-end")}>
            
            <div
              className={cn(
                "vrx-chat-turn max-w-[85%] rounded-[12px] px-[12px] py-[8px] text-[14px] leading-[1.55] text-tp-slate-700",
                t.speaker === "doctor" ?
                "bg-white/70 rounded-bl-[4px] vrx-chat-turn--doctor" :
                "bg-[rgba(139,92,246,0.07)] rounded-br-[4px] vrx-chat-turn--patient",
                inView && "vrx-chat-turn--in"
              )}
              style={{ animationDelay: `${i * 180}ms` }}>
              
              <span className="font-semibold text-tp-slate-800">{label}:</span>{" "}
              <span>{t.text}</span>
            </div>
          </li>);

      })}
    </ul>);

}

export function DictationTranscript({ raw, animate = true }) {
  const cleaned = raw.replace(/\b(Doctor|Patient)\s*:\s*/gi, "").replace(/\n+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return (
    <p
      aria-label={cleaned}
      className="whitespace-pre-wrap px-[6px] py-[8px] text-[14px] italic leading-[1.75] text-tp-slate-600">
      
      <span aria-hidden="true" className={cn(animate && "vrx-dt-word vrx-dt-word--quote")}>{`“`}</span>
      {words.map((word, i) =>
      <span key={`${i}-${word}`} aria-hidden="true">
          <span
          className={cn(animate && "vrx-dt-word inline-block")}
          style={animate ? { animationDelay: `${i * 35}ms` } : undefined}>
          
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      )}
      <span aria-hidden="true" className={cn(animate && "vrx-dt-word")} style={animate ? { animationDelay: `${words.length * 35}ms` } : undefined}>{`”`}</span>
      {/* vrx-* word-by-word stagger styles live in app/globals.css.
           NOTE: a previous attempt left a `{animate && {…}}` expression
           here which evaluated to an empty object `{}` and threw
           "Objects are not valid as a React child" whenever the
           transcript animated. */}
    </p>);

}

// ─── Caption carousel ────────────────────────────────────────────────────────

/**
 * Shimmer caption carousel — exported so other surfaces (e.g. the active
 * agent footer during the processing phase) can reuse the exact same
 * loader vocabulary instead of re-inventing it.
 */
export function CaptionCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % CAPTION_PHRASES.length), 2000);
    return () => window.clearInterval(t);
  }, []);
  // Each phrase enters from below (slide-up + fade in) and the previous
  // one slides up out at the same time. Stacking absolutely on top of
  // a fixed-height row so the layout doesn't jump as words change
  // length.
  return (
    <div className="vrx-caption-stage flex w-full items-center justify-center px-[2px] py-[3px] text-[14px] font-semibold leading-[1.4] text-tp-slate-600">
      {/* Single keyed span — React unmounts/remounts on idx change so
           the entrance animation re-runs for every new phrase. Earlier
           this used absolute-positioned children which collapsed the
           parent flex to 0 width and clipped everything past the first
           glyph; the simpler in-flow span sizes correctly. */}
      <span
        key={idx}
        className={cn("vrx-process-caption vrx-caption-slide whitespace-nowrap", styles.captionShimmerSpan)}>
        
        {CAPTION_PHRASES[idx]}…
      </span>
      {/* vrx-* styles live in app/globals.css */}
    </div>);

}

// ─── Tabs ────────────────────────────────────────────────────────────────────



function Tabs({
  active,
  onChange



}) {
  const TABS = [
  { id: "tp_emr", label: "TP EMR" },
  { id: "clinical_notes", label: "Clinical Notes" },
  { id: "transcript", label: "Transcript" }];

  return (
    <div
      className={cn("flex shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-tp-slate-100 px-3 pt-[6px]", styles.tabsScrollbar)}>
      
      {TABS.map((t) =>
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={cn(
          "relative shrink-0 px-3 py-2 text-[12px] font-medium transition-colors",
          active === t.id ? "text-tp-blue-700" : "text-tp-slate-500 hover:text-tp-slate-800"
        )}>
        
          {t.label}
          {active === t.id ?
        <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-tp-blue-600" /> :
        null}
        </button>
      )}
    </div>);

}

// ─── Public component ────────────────────────────────────────────────────────

export function VoiceTranscriptProcessingCard({
  mode,
  transcript,
  structuringMs = 3000,
  totalMs = 10000,
  tpEmrSlot,
  clinicalNotesSlot,
  onComplete
}) {
  // Phase machine — the inline structuring → tabs swap is gone. The
  // shiner card stays on the transcript view for its entire lifetime;
  // the next surface (the full result-tabs panel) takes over from the
  // outer DrAgentPanel via `setVoiceRxResult` instead of morphing this
  // card into a tab strip in place. We still fire `onComplete` on the
  // same schedule so callers that gate other UI on it stay in sync.
  const [phase] = useState("structuring");
  const [activeTab, setActiveTab] = useState("tp_emr");

  useEffect(() => {
    const t = window.setTimeout(() => {
      onComplete?.();
    }, totalMs - structuringMs);
    return () => window.clearTimeout(t);
  }, [structuringMs, totalMs, onComplete]);

  const isAmbient = mode === "ambient_consultation";

  // Slow auto-scroll of the inner transcript while the structuring
  // phase is running. Two reasons:
  //   1) it reads as a "loader" — the doctor's eye sees motion and
  //      knows the system is working
  //   2) longer transcripts get visited in full without the doctor
  //      having to scroll manually while they wait
  // Behaviour: drift down at ~24 px/sec; on hitting the bottom, pause
  // briefly, then smooth-scroll back to top and resume. Honors
  // prefers-reduced-motion.
  const transcriptScrollRef = useRef(null);
  useEffect(() => {
    if (phase !== "structuring") return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = transcriptScrollRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    let pausedUntil = 0;
    const PX_PER_SEC = 24;

    const tick = (now) => {
      if (now < pausedUntil) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - last) / 1000;
      last = now;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 8) {
        const next = el.scrollTop + PX_PER_SEC * dt;
        if (next >= max) {
          // Hit bottom — hold for ~1.4s, then loop back to top.
          el.scrollTop = max;
          pausedUntil = now + 1400;
          window.setTimeout(() => {
            transcriptScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }, 1400);
        } else {
          el.scrollTop = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    // Conversation mode: ~60% of the Dr. Agent panel's centered slot
    // (with sensible min/max floors). Dictation mode: hug content —
    // the doctor's note is usually 1–2 short lines, no point reserving
    // a tall slot for it. The shiner shell + inner scroll inherit
    // h-full / flex-1 from here when sized, or wrap content otherwise.
    <div
      className={cn("flex w-full min-h-0 flex-col gap-[10px]", styles.cardContainer)}>
      
      {/* Card chrome: 16px radius, white base + rotating TP-blue shine.
           `vrx-shiner-enter` plays a one-shot fade/slide on mount. */}
      <div
        className={cn("vrx-shiner-enter relative flex w-full min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-tp-slate-50/60", styles.shinerCard)}>
        
        {/* Static white outer ring is achieved by the bg-white above; the
             rotating shine sits on top via ShineBorder's `rotate` variant. */}
        <ShineBorder
          variant="rotate"
          borderWidth={1.5}
          /* Faster spin — so the rotating shine reads as an active
             "loading" cue, not ambient decoration. Shine palette is
             the AI gradient stops (pink → violet → indigo). */
          duration={2.2}
          shineColor={["#D565EA", "#673AAC", "#1A1994"]}
          baseColor="rgba(226,226,234,0.95)" />
        

        {phase === "structuring" ?
        <div
          ref={transcriptScrollRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-[14px]">
          
            {/* Bubbles render directly on the shiner card's slate-100
               surface — no inner wrapper. The white doctor bubble +
               violet patient bubble read crisply against it. */}
            <DictationTranscript raw={transcript} />
          </div> :

        <div
          className={cn("relative flex flex-col", styles.tabsBody)}>
          
            <Tabs active={activeTab} onChange={setActiveTab} />
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "tp_emr" ?
            tpEmrSlot ??
            <div className="flex h-full items-center justify-center text-[14px] text-tp-slate-400">
                    TP EMR view will land here.
                  </div> :

            null}
              {activeTab === "clinical_notes" ?
            clinicalNotesSlot ??
            <div className="flex h-full items-center justify-center text-[14px] text-tp-slate-400">
                    Clinical notes will land here.
                  </div> :

            null}
              {activeTab === "transcript" ?
            <div className="flex h-full flex-col">
                  <h3 className="mb-2 text-[13px] font-semibold text-tp-slate-700">
                    {isAmbient ? "Conversational Transcript" : "Dictated Transcript"}
                  </h3>
                  <div className="flex-1 overflow-y-auto rounded-[8px] bg-tp-slate-50/50 p-2">
                    <DictationTranscript raw={transcript} animate={false} />
                  </div>
                  <div className="mt-[8px] flex items-center gap-[6px] border-t border-tp-slate-100 pt-[8px]">
                    <div className="flex items-center gap-[4px]">
                      <button type="button" className="flex h-[20px] w-[20px] items-center justify-center rounded transition-all text-tp-slate-400 hover:text-tp-success-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m7.48 18.35 3.1 2.4c.4.4 1.3.6 1.9.6h3.8c1.2 0 2.5-.9 2.8-2.1l2.4-7.3c.5-1.4-.4-2.6-1.9-2.6h-4c-.6 0-1.1-.5-1-1.2l.5-3.2c.2-.9-.4-1.9-1.3-2.2-.8-.3-1.8.1-2.2.7l-4.1 6.1" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10"></path><path d="M2.38 18.35v-9.8c0-1.4.6-1.9 2-1.9h1c1.4 0 2 .5 2 1.9v9.8c0 1.4-.6 1.9-2 1.9h-1c-1.4 0-2-.5-2-1.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                      </button>
                      <button type="button" className="flex h-[20px] w-[20px] items-center justify-center rounded transition-all text-tp-slate-400 hover:text-tp-error-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m16.52 5.65-3.1-2.4c-.4-.4-1.3-.6-1.9-.6h-3.8c-1.2 0-2.5.9-2.8 2.1l-2.4 7.3c-.5 1.4.4 2.6 1.9 2.6h4c.6 0 1.1.5 1 1.2l-.5 3.2c-.2.9.4 1.9 1.3 2.2.8.3 1.8-.1 2.2-.7l4.1-6.1" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10"></path><path d="M21.62 5.65v9.8c0 1.4-.6 1.9-2 1.9h-1c-1.4 0-2-.5-2-1.9v-9.8c0-1.4.6-1.9 2-1.9h1c1.4 0 2 .5 2 1.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                      </button>
                    </div>
                    <div className={cn("h-[12px] w-[1px] flex-shrink-0", styles.transcriptDivider)}></div>
                    <span className="text-[12px] text-tp-slate-500">Audio Quality: <span className="font-medium text-tp-slate-700">Good</span></span>
                    <div className={cn("h-[12px] w-[1px] flex-shrink-0", styles.transcriptDivider)}></div>
                    <button type="button" className="flex items-center gap-[3px] rounded-[4px] px-[5px] py-[2px] transition-colors text-tp-slate-400 hover:text-tp-slate-500 hover:bg-tp-slate-50" aria-label="Download transcript" aria-expanded="false">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span className="text-[12px] font-medium leading-[1]">Download</span>
                    </button>
                  </div>
                </div> :
            null}
            </div>
          </div>
        }
      </div>

      {/* Caption carousel was moved out of this card and into the
           active agent's footer slot (where the action dock used to
           live), so the loader sits at the bottom of the panel rather
           than directly under the shiner card. */}

      {/* Inline keyframes — caption shimmer + chat-turn cascade + card
           entrance. Spin is built-in via Tailwind's `animate-spin`. */}
      {/* vrx-* styles live in app/globals.css */}
    </div>);

}