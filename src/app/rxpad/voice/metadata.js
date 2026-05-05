// Metadata is split out of page.jsx because the page is "use client"
// (needed to use `dynamic(..., { ssr: false })` for the highly
// interactive consultation tree). Next.js doesn't read `metadata`
// exports from client components, so we hoist the export to the
// route's `layout.jsx` instead.
export const voiceRxMetadata = {
  title: "VoiceRx Consultation — TatvaPractice",
  description:
    "Voice-powered in-visit consultation with Dr.Agent, VoiceRx, and prescription sections.",
};
