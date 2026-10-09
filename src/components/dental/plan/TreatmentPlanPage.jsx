/**
 * TreatmentPlanPage — Standalone full-page layout for dental treatment planning.
 * Has its own header with back button and title. No RxPad shell dependency.
 */
import { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { TreatmentPlanTab } from "./TreatmentPlanTab";
import styles from "./TreatmentPlanPage.module.scss";

function TreatmentPlanEmbedInner({ patientId }) {
  const pid = patientId ?? "apt-1";
  const [searchParams] = useSearchParams();
  const tabParam = searchParams?.get("planTab") || searchParams?.get("tab");
  const initialTab =
    tabParam === "progress" ||
    tabParam === "completed" ||
    tabParam === "estimates"
      ? tabParam
      : "estimates";

  return (
    <div className={styles.embedRoot}>
      {/* Banner */}
      <div className={styles.embedBanner}>
        <svg aria-hidden="true" className={styles.embedBannerNoise}>
          <filter id="embed-banner-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.80" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#embed-banner-noise)" />
        </svg>
        <div className={styles.embedBannerInner}>
          <div className={styles.embedBannerRow}>
            <h1 className={styles.embedBannerTitle}>Dental treatment plan</h1>
          </div>
        </div>
      </div>

      {/* Content card overlapping banner */}
      <div className={styles.embedCard}>
        <TreatmentPlanTab
          patientId={pid}
          initialTab={initialTab}
          initialDrawer={{ type: "closed" }}
          embedInPatientShell={true}
        />
      </div>
    </div>
  );
}

/** Inline dental plan for patient detail — no standalone page chrome. */
export function TreatmentPlanEmbed({ patientId }) {
  return (
    <Suspense
      fallback={
        <div className={styles.fallback}>
          Loading…
        </div>
      }
    >
      <TreatmentPlanEmbedInner patientId={patientId} />
    </Suspense>
  );
}
