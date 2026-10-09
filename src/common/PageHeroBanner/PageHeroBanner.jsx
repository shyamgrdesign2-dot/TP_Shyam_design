import React from "react";
import {
  TesseractThemeProvider,
  HeroBanner,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- package exports map; webpack resolves
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import styles from "./PageHeroBanner.module.css";

/**
 * Violet page hero used across legacy shells (All Patients, Billing, Welcome,
 * Patient Details, Add Appointment, …). Same HeroBanner as the new
 * appointment listing; keeps the spacer so overlapping white cards still sit
 * correctly over the band.
 */
function PageHeroBanner({
  title,
  subtitle,
  eyebrow,
  actions,
  showBackButton = false,
  onBack,
  size = "lg",
  align = "center",
  tone = "violet",
  background,
  compact = false,
  className = "",
  titleSize = "md",
}) {
  const actionNode = actions ? (
    <div className={styles.actions}>{actions}</div>
  ) : undefined;

  return (
    <div
      className={`${styles.wrap} ${className}`.trim()}
      data-compact={compact ? "true" : undefined}
    >
      <TesseractThemeProvider colorScheme="light">
        <HeroBanner
          size={size}
          align={align}
          tone={tone}
          background={background}
          title={title}
          subtitle={subtitle}
          eyebrow={eyebrow}
          titleSize={titleSize}
          showBackButton={showBackButton}
          onBack={onBack}
          actions={actionNode}
        />
      </TesseractThemeProvider>
    </div>
  );
}

export { styles as pageHeroBannerStyles };
export default React.memo(PageHeroBanner);
