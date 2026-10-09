import React, { useEffect, useRef, useState } from "react";
import { Drawer } from "antd";
import {
  LoadingIndicator,
  Sidebar,
  TesseractThemeProvider,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias ("./styles.css" → dist css); webpack resolves it, eslint-plugin-import cannot
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import ExpiredSubModal from "../monetization/components/ExpiredSubModal";
import PharmacySetupDetailsModal from "../monetization/components/PharmacySetupDetailsModal";
import IPDKnowMore from "../monetization/components/IPDKnowMore";
import PharmacyKnowMore from "../monetization/components/PharmacyKnowMore";
import AskTatvaKnowMore from "../monetization/components/AskTatvaKnowMore";
import useMainSidebarNav from "./useMainSidebarNav";
import styles from "./MainSidebarV1.module.css";

/**
 * Main Sidebar V1 — the Tesseract `Sidebar` molecule as the homepage rail.
 *
 * `SidebarDoctor` is untouched; this is a parallel shell carrying the same
 * click / SSO / trial / lock behaviour. Nav data comes from `useMainSidebarNav`,
 * look comes from the design system, and this file is only the join between them.
 *
 * Defaults match the collapsed-rail story: collapsed, no search, no toggle.
 * Every Sidebar prop is forwarded, so a caller can drive any variant without
 * editing this file.
 */
export default function MainSidebarV1({
  defaultCollapsed = true,
  search = false,
  showCollapseToggle = false,
  // Left undefined on purpose: the fade then follows whether the list actually
  // overflows. Pass true/false to force it either way.
  bottomFade,
  accent,
  density,
  expandedWidth,
  // The DS rail is 80px; 85 gives the labels a little more room to fit on one
  // line before the two-line rule has to kick in.
  collapsedWidth = 85,
  header,
  footer,
  logo,
  collapsed,
  onCollapsedChange,
  loading: loadingProp,
  ...rest
}) {
  const nav = useMainSidebarNav();
  const rootRef = useRef(null);
  const [scrollState, setScrollState] = useState({ overflows: false, atEnd: false });
  const { overflows, atEnd } = scrollState;

  /**
   * The rail hides its scrollbar, so the fade is the only thing telling a
   * doctor there are more modules below. Show it exactly when the list has
   * somewhere to scroll: entitlements, viewport height and the collapsed state
   * all change that, so it is measured rather than assumed.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const measure = () => {
      const list = root.querySelector('[class*="_list_"]');
      if (!list) {
        setScrollState({ overflows: false, atEnd: false });
        return;
      }
      const overflowing = list.scrollHeight > list.clientHeight + 1;
      // 2px of slack: fractional scroll offsets never land exactly on the end.
      const ended = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
      setScrollState((prev) =>
        prev.overflows === overflowing && prev.atEnd === ended
          ? prev
          : { overflows: overflowing, atEnd: ended }
      );
    };

    // First paint can land before the rows have laid out, so measure again on
    // the next frame rather than trusting the mount-time numbers.
    measure();
    const frame = requestAnimationFrame(measure);

    window.addEventListener("resize", measure);

    const list = root.querySelector('[class*="_list_"]');
    // Scrolling changes only scrollTop, which no observer reports, so the fade
    // needs the scroll event to know when it has reached the end.
    if (list) list.addEventListener("scroll", measure, { passive: true });

    let observer;
    if (typeof ResizeObserver !== "undefined" && list) {
      observer = new ResizeObserver(measure);
      // The list itself is flex:1 so its own box never changes and would never
      // fire. What grows is the content inside it, so watch that too.
      observer.observe(list);
      Array.from(list.children).forEach((child) => observer.observe(child));
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      if (list) list.removeEventListener("scroll", measure);
      if (observer) observer.disconnect();
    };
  }, [nav.items, collapsed, defaultCollapsed]);

  // A fade at the end of the list hides the last row for no reason, so it is
  // shown only while something remains below.
  const showBottomFade = bottomFade === undefined ? overflows && !atEnd : bottomFade;

  return (
    <TesseractThemeProvider colorScheme="light">
      <div
        className={styles.root}
        data-sidebar="main-v1"
        data-overflows={overflows ? "1" : "0"}
        ref={rootRef}
      >
        <Sidebar
          className={styles.rail}
          items={nav.items}
          activeId={nav.activeId}
          onSelect={nav.onSelect}
          defaultCollapsed={defaultCollapsed}
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          search={search}
          showCollapseToggle={showCollapseToggle}
          bottomFade={showBottomFade}
          accent={accent}
          density={density}
          expandedWidth={expandedWidth}
          collapsedWidth={collapsedWidth}
          header={header}
          footer={footer}
          logo={logo}
          loading={loadingProp}
          {...rest}
        />

        {/*
          The DS paints its own fade only when expanded (`bottomFade && !collapsed`),
          so a collapsed rail never gets one. This is that same gradient, drawn for
          the collapsed rail, and only while the list has somewhere left to scroll.
        */}
        {showBottomFade && <div className={styles.bottomFade} aria-hidden="true" />}
      </div>

      {nav.loading && (
        <div className={styles.loadingOverlay} role="status" aria-live="polite">
          <LoadingIndicator type="line-simple" size="lg" label="Loading" />
        </div>
      )}

      <Drawer
        closeIcon={false}
        placement="right"
        open={nav.askTatvaKnowMoreDrawer}
        onClose={nav.handleAskTatvaKnowMore}
        className=".modalWidth-800"
        width={600}
      >
        <AskTatvaKnowMore
          handleAskTatvaKnowMore={nav.handleAskTatvaKnowMore}
          onRedirect={nav.checkTatvaAiPurchased}
        />
      </Drawer>

      <Drawer
        closeIcon={false}
        placement="right"
        open={nav.iPDKnowMoreDrawer}
        onClose={nav.handleIPDKnowMore}
        className=".modalWidth-800"
        width={600}
      >
        <IPDKnowMore
          handleIPDKnowMore={nav.handleIPDKnowMore}
          onRedirect={() => nav.check_SSO(nav.subModalData?.service_name)}
        />
      </Drawer>

      <Drawer
        closeIcon={false}
        placement="right"
        open={nav.pharmacyKnowMoreDrawer}
        onClose={nav.handlePharmacyKnowMore}
        className=".modalWidth-800"
        width={600}
      >
        <PharmacyKnowMore
          handlePharmacyKnowMore={nav.handlePharmacyKnowMore}
          onRedirect={() => nav.check_SSO(nav.subModalData?.service_name)}
        />
      </Drawer>

      <PharmacySetupDetailsModal
        open={nav.pharmacySetupOpen}
        onClose={nav.closePharmacySetup}
        onSubmit={nav.handlePharmacyLaunch}
        submitting={nav.loading}
        missingFields={nav.pharmacyMissingFields}
        defaultName={nav.pharmacyDefaultName}
      />

      <ExpiredSubModal
        title={
          nav.subModalData &&
          nav.subModalData?.hasOwnProperty("service_name") &&
          nav.subModalData?.service_name
        }
        isSubModalOpen={nav.isSubModalOpen}
        showHideSubModal={nav.showHideSubModal}
      />
    </TesseractThemeProvider>
  );
}
