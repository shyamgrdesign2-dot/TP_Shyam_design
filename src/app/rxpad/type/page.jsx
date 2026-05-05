"use client";

import dynamic from "next/dynamic";

// Same SSR-skip strategy as /rxpad/voice — see the comment there.
// Highly interactive Radix-heavy tree; render entirely on the client to
// dodge `useId` hydration drift.
const TypeRxFlow = dynamic(
  () =>
    import("@/src/components/organisms/typerx/TypeRxFlow").then(
      (m) => m.TypeRxFlow
    ),
  { ssr: false }
);

export default function Page() {
  return <TypeRxFlow />;
}
