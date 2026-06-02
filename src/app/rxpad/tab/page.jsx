"use client";

import dynamic from "next/dynamic";

// Same SSR-skip strategy as /rxpad/voice and /rxpad/type — the tree is
// highly interactive (canvas + Radix) and uses browser-only APIs, so render
// it entirely on the client to avoid hydration drift.
const TabRxFlow = dynamic(
  () =>
    import("@/src/components/organisms/tabrx/TabRxFlow").then((m) => m.TabRxFlow),
  { ssr: false }
);

export default function Page() {
  return <TabRxFlow />;
}
