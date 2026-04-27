import React, { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useRxPadChrome } from "../tp-rxpad/rxpad-chrome-context";
import styles from "./TPRxPadShell.module.scss";

function RxPadDrAgentFab() {
  const { drAgentOpen } = useRxPadChrome();
  if (drAgentOpen) return null;
  return <></>;
}

function RxPadDrAgentAside() {
  const { drAgentOpen } = useRxPadChrome();
  const [searchParams] = useSearchParams();
  // eslint-disable-next-line no-unused-vars
  const patientId = searchParams.get("patientId")?.trim() || "apt-1";

  if (!drAgentOpen) return null;

  return (
    <aside
      className={styles.drAgentAside}
      aria-label="Dr. Agent"
    >
      <></>
    </aside>
  );
}

export function TPRxPadShell({ topNav, sidebar, children }) {
  return (
    <div className={styles.root}>
      {topNav}
      <div className={styles.bodyRow}>
        <aside className={styles.aside}>{sidebar}</aside>
        <main className={styles.main}>
          {children}
          <Suspense fallback={null}>
            <RxPadDrAgentFab />
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <RxPadDrAgentAside />
        </Suspense>
      </div>
    </div>
  );
}