import React, { useEffect, useRef, useState } from "react";
import { Button as AntButton, Checkbox, Drawer, Modal, Popover, Dropdown as AntDropdown, Spin, Tooltip } from "antd";
import { QRCodeSVG } from "qrcode.react";
import Slider from "react-slick";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  Dropdown,
  Header,
  Logo,
  TPIcon,
  TPLibraryIcon,
  TesseractThemeProvider,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias ("./styles.css" → dist css); webpack resolves it, eslint-plugin-import cannot
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import QrPrintDownloadModal from "../../common/QrPrintDownloadModal";
import VideoModal from "../../common/VideoModal";
import AiSuite from "../monetization/components/AiSuite";
import MedEcoAppKnowMore from "../monetization/components/MedEcoAppKnowMore";
import PremiumUser from "../../common/PremiumUser";
import { getClinicName } from "../../utils/utils";
import { APP_VERSION_LABEL, APP_RELEASE } from "../../utils/appVersion";
import { ASSETS } from "../../assets";

import useMainHeaderV1 from "./useMainHeaderV1";
import styles from "./MainHeaderV1.module.css";
import CopilotSearch from "../../components/dr-copilot/surfaces/CopilotSearch";

const {
  logoSm,
  textLogo: logoIcom,
  alerticon: alertIcon,
  aiSuite: AISuite,
  tubeIcon: playIcons,
  playIcon: playIconutube,
  defaultProfile,
  upgrade: upgradeIcon,
  crown: crownIcon,
  abhaMain: abhaMainIcon,
  abhaSvg: abhaCenterLogo,
  qrOuterFrame,
  poweredBy: poweredByLogo,
  tatvapracticeLog_2: tatvaPracticeLogo,
} = ASSETS.images;

// Beamer attaches its panel and its unread counter to this id (public/index.html).
const BEAMER_BUTTON_ID = "beamerButton";

/**
 * Initials for the avatar: strip common honorifics (Dr, Mr, Mrs, Ms, Miss,
 * Prof) so "Dr Sheela BR" reads as "SB", not "DB". With two or more words
 * take first + last initial; with one word take the first two letters so a
 * solo "Sheela" reads "SH" instead of a bare "S".
 */
function personInitials(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  const cleaned = rawName
    .replace(/^\s*(dr|mr|mrs|ms|miss|prof)\.?\s+/i, "")
    .trim();
  const parts = (cleaned || rawName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Beamer's own unread signal. Beamer owns `#beamerButton` (see `beamer_config`
 * in `public/index.html`) and, when there are unread posts, injects a
 * `.beamer_icon.active` node into that button. There is no callback to await;
 * the only signal is that DOM node appearing, so this watches for it. The
 * counter itself is hidden in the module's CSS; what a doctor sees is our own
 * dot, driven by this flag.
 */
function useBeamerUnread(elementId = BEAMER_BUTTON_ID) {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
      return undefined;
    }
    const read = () => {
      const host = document.getElementById(elementId);
      setUnread(!!host?.querySelector(".beamer_icon.active"));
    };
    read();
    // Beamer arrives after first paint and mutates the button entirely outside
    // React, so watch the whole document for its counter class toggling.
    const observer = new MutationObserver(read);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [elementId]);

  return unread;
}

const TUTORIAL_SLIDER_SETTINGS = {
  className: "center",
  dots: true,
  arrows: false,
  centerMode: true,
  infinite: false,
  centerPadding: "5px",
  slidesToShow: 1,
  slidesToScroll: 1,
  adaptiveHeight: true,
};

/**
 * Tutorial popover, shown from the tutorial button on every route that does
 * not open the full drawer. One category at a time, as today.
 */
function TutorialPopoverContent({ videoList, categoryId, onClose, onPlay }) {
  const videos = videoList?.filter((e) => e.category_id === categoryId)[0]?.video;
  const category = videoList?.[0]?.category;
  return (
    <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
      <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
        <div className="title-common lh-base">Video Tutorial</div>
        <AntButton className="btn btn-delete-prescription p-0" onClick={onClose}>
          <i className="icon-Cross" />
        </AntButton>
      </div>
      {videos?.map((item, index) => (
        <div
          key={index}
          className={`d-flex ${index !== videos.length - 1 && "pb-3 mb-15 border-bottom"}`}
        >
          <div className="tutorial-play me-14">
            <button type="button" onClick={() => onPlay(item, category)}>
              <img src={playIcons} alt="" />
            </button>
            <span className="tutorial-thumb">
              <img src={item.thumbnail} alt="" />
            </span>
          </div>
          <div>
            <h3 className="title-common text-welcome">{item?.tmv_title}</h3>
            <div className="fs-12 fontroboto fw-normal text-main">{item?.tmv_description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full tutorial library, opened from the homepage and bulk messages: every
 * category as its own carousel.
 */
function TutorialDrawer({ open, onClose, videoList, onPlay }) {
  return (
    <Drawer
      title="Video Tutorial"
      placement="right"
      onClose={onClose}
      open={open}
      className="modalWidth-400 tab345 playdrawer"
      width="auto"
    >
      <div className="mt-20">
        {videoList?.map(
          (item, i) =>
            item?.video?.length > 0 && (
              <div key={i} className=" ms-4 video-bottom-spacing">
                <div className="title-common text-welcome">{item?.category}</div>
                <div className="fs-12 fontroboto fw-normal text-main">{item?.description}</div>
                <div className="videodrawer-left mt-3">
                  <Slider {...TUTORIAL_SLIDER_SETTINGS}>
                    {item?.video?.map((video, i1) => (
                      <div key={i1} className="drawer-slider">
                        <button type="button" onClick={() => onPlay(video, item?.category)}>
                          <img src={playIconutube} alt="" />
                        </button>
                        <img src={video?.thumbnail} alt="" />
                      </div>
                    ))}
                  </Slider>
                </div>
              </div>
            )
        )}
      </div>
    </Drawer>
  );
}

/**
 * Clinic switcher — the DS `Dropdown` molecule, not a hand-built popover.
 *
 * The DS handles trigger + menu + keyboard nav + adaptive placement + live
 * search, all against the same theme tokens the rest of the top bar uses.
 * Search only turns on above the "long list" threshold, matching what the
 * bespoke version did.
 */
function ClinicSwitcher({ options, selected, onChange }) {
  const CLINIC_SEARCH_THRESHOLD = 5;
  const rootRef = useRef(null);

  /*
   * DS Dropdown has no `align` prop; its portal opens with the menu's LEFT
   * edge under the trigger's left edge. Near the right edge of the header
   * that pushes the menu off-screen. We nudge it to right-align by shifting
   * the portal so its right edge sits under the trigger's right edge. Runs
   * only while the menu is open (aria-expanded=true), and re-measures on
   * scroll/resize so the offset never goes stale.
   */
  useEffect(() => {
    const trigger = rootRef.current?.querySelector("button[aria-expanded]");
    if (!trigger) return undefined;
    let menu;
    const align = () => {
      const menuId = trigger.getAttribute("aria-controls");
      if (!menuId) return;
      menu = document.getElementById(menuId);
      if (!menu) return;
      const t = trigger.getBoundingClientRect();
      const m = menu.getBoundingClientRect();
      const delta = t.right - m.right;
      menu.style.transform = delta ? `translateX(${delta}px)` : "";
    };
    const onOpen = () => {
      if (trigger.getAttribute("aria-expanded") !== "true") return;
      // Two frames: first paint, then measure once positioning settles.
      requestAnimationFrame(() => requestAnimationFrame(align));
    };
    const observer = new MutationObserver(onOpen);
    observer.observe(trigger, { attributes: true, attributeFilter: ["aria-expanded"] });
    window.addEventListener("resize", align);
    window.addEventListener("scroll", align, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
      window.removeEventListener("scroll", align, true);
    };
  }, []);

  return (
    <div ref={rootRef} style={{ display: "inline-flex" }}>
    <Dropdown
      className={styles.clinicDropdown}
      options={options}
      value={selected}
      onChange={onChange}
      placeholder="Select Clinic"
      leadingIcon={<TPIcon name="medical:hospital-building-4" variant="linear" size={20} />}
      searchable={options.length > CLINIC_SEARCH_THRESHOLD}
      searchPlaceholder="Search clinic…"
      /*
       * Cap the menu at 280px so a long clinic name truncates to ellipsis
       * instead of expanding the popover past the actions cluster. The
       * trigger keeps its own auto width; only the open menu is bounded.
       */
      width={280}
      ariaLabel="Clinic"
      withIcons={false}
      twoLine={false}
    />
    </div>
  );
}

/* ── Profile menu items ─────────────────────────────────────────────────
 * Builds the antd Dropdown menu array for the avatar. Every row shape is
 * the same: leading TPIcon, label, trailing chevron. Entitlement gates
 * (Billing Setting, ABHA QR, AI Suite, Subscription banner, OPD Plans QR)
 * live in-place instead of one flat branch, so a doctor with a minimal
 * plan sees exactly the rows that apply to them.
 */
const MenuRow = ({ icon, label, onClick, iconVariant = "library" }) => {
  const Icon = iconVariant === "tp"
    ? <TPIcon name={icon} variant="linear" size={18} />
    : <TPLibraryIcon name={icon} size={18} />;
  return (
    <a onClick={onClick}>
      <div className="title-common me-4 d-flex align-items-center">
        <span className="me-3 d-inline-flex">{Icon}</span>{label}
      </div>
      <TPLibraryIcon name="chevron-right" size={14} />
    </a>
  );
};

function buildProfileMenuItems({
  profile, planDetails, tokenData, logoutOnly = false,
  isPremium, isTrialPlan, remainingTrialDays, canShowTrialBanner,
  tp_monetization_enable, isOpdPlansAccessableFromGB, isAbhaQRAccessableFromGB, isOpdBillingAccessable,
  canShowAiReceptionist, aiReceptionistLabel, openAiReceptionist,
  navigate, setUpWebsiteUrl, myAvailability, accountSettings,
  handleShowAbhaQRCode, handleShowQRCode, handleAiSuite, handleUpgradeClick, clickBuyNow, handleLogout,
}) {
  const logoutItem = {
    label: (
      <div className="title-common d-flex align-items-center" style={{ color: "var(--destructive, #c8102e)" }}>
        <span className="me-3 d-inline-flex"><TPLibraryIcon name="logout2" size={18} /></span>
        <span>Log Out</span>
      </div>
    ),
    key: "logout",
    onClick: handleLogout,
    className: "logout-menu-item",
  };
  if (logoutOnly) return [logoutItem];

  const profileHeader = {
    key: "0",
    label: (
      <>
        <div className="mx-3">
          {profile?.um_image && !isPremium ? (
            <img
              src={profile.um_image ?? defaultProfile}
              alt="Profile"
              className="rounded-circle"
              style={{ width: 42, height: 42 }}
            />
          ) : isPremium ? (
            <PremiumUser />
          ) : (
            /* Matches the header avatar: same 42px tonal disc, same initials rule. */
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 42, height: 42, borderRadius: "50%",
                background: "var(--tesseract-slate-100, #f1f1f5)",
                color: "var(--tesseract-slate-600, #545460)",
                fontFamily: "var(--tesseract-font-body)",
                fontWeight: 700, fontSize: 15, lineHeight: 1, letterSpacing: "0.01em",
              }}
            >
              {personInitials(profile?.um_name) || "HG"}
            </span>
          )}
        </div>
        <div>
          <div className="text-black titleprint">{profile?.um_name}</div>
          <div className="title-common">{profile?.um_contact}</div>
        </div>
      </>
    ),
  };

  const rows = [
    profileHeader,
    { type: "divider" },
    { key: "1", label: <MenuRow icon="users:user" iconVariant="tp" label="My Profile" onClick={() => setUpWebsiteUrl(1)} /> },
    ...(canShowAiReceptionist ? [{
      key: "ai-receptionist",
      label: <MenuRow icon="ai:ai-enhance" iconVariant="tp" label={aiReceptionistLabel} onClick={openAiReceptionist} />,
    }] : []),
    ...(tp_monetization_enable ? [{
      key: "2",
      label: <MenuRow icon="ai:ai-sparkle" iconVariant="tp" label="AI Suite" onClick={handleAiSuite} />,
    }] : []),
    { key: "4", label: <MenuRow icon="global-edit" label={`${profile?.website_publish && profile?.publish_url ? "Visit" : "Setup"} My Website`} onClick={() => setUpWebsiteUrl(2)} /> },
    { key: "5", label: <MenuRow icon="calendar" label="My Availability" onClick={myAvailability} /> },
    ...(tokenData?.admin ? [{
      key: "6",
      label: <MenuRow icon="setting-gear" label="Account Setting" onClick={accountSettings} />,
    }] : []),
    ...(tokenData?.admin && isOpdBillingAccessable ? [{
      key: "billing-settings",
      label: <MenuRow icon="receipt-text" label="Billing Setting" onClick={() => navigate("/billing-settings")} />,
    }] : []),
    ...(profile?.abhaEnable && isAbhaQRAccessableFromGB ? [{
      key: "abha-qr",
      label: <MenuRow icon="scan-barcode" label="Download ABHA QR Code" onClick={handleShowAbhaQRCode} />,
    }] : []),
  ];

  if (tp_monetization_enable && isTrialPlan) {
    const isUnpaid = ["TRIAL", "EXPIRED"].includes(planDetails?.currentPlanStatus);
    rows.push({
      key: "7",
      label: (
        <a onClick={() => (isUnpaid ? handleUpgradeClick() : setUpWebsiteUrl(1))}>
          <div className="title-common me-4 d-flex align-items-center">
            {isUnpaid && <img loading="lazy" src={upgradeIcon} className="me-3" alt="" />}
            {isPremium && <img loading="lazy" src={crownIcon} className="me-3" style={{ filter: "brightness(0%)" }} alt="" />}
            {isUnpaid ? "Upgrade Plan" : "Subscription"}
            {isUnpaid && (
              <div className="gradientBackground d-flex">
                <div className="demoModeIndicatorSmall bg-danger" />
                <span className="demoModeLabel">Demo mode</span>
              </div>
            )}
          </div>
          <TPLibraryIcon name="chevron-right" size={14} />
        </a>
      ),
    });
    if (canShowTrialBanner) {
      rows.push(
        { type: "divider" },
        {
          key: "8",
          className: "freeTrialMenu text-center rounded-12px p-3 m-3",
          label: (
            <>
              {remainingTrialDays > 0
                ? "You're on a trial plan!"
                : remainingTrialDays < 0 ? "Your trial plan expired!" : "Your trial plan will expire today!"}
              <div
                className="title-common text-white border p-2 rounded-12px w-100 mt-2 cursor-pointer"
                style={{ backgroundColor: "#FFFFFF1A" }}
                onClick={clickBuyNow}
              >
                <img loading="lazy" src={crownIcon} className="text-white me-2" alt="" />
                Get Unlimited Access
              </div>
            </>
          ),
        }
      );
    }
  }

  if (isOpdPlansAccessableFromGB) {
    rows.push({
      key: "9",
      label: <MenuRow icon="scan-barcode" label="OPD Plan QR" onClick={handleShowQRCode} />,
    });
  }

  return [...rows, { type: "divider" }, logoutItem];
}

/* ── ABHA QR modal ──────────────────────────────────────────────────────
 * The ABHA QR sheet that opens from "Download ABHA QR Code" in the profile
 * menu. Prints and downloads read the same DOM this renders, so inline
 * sizes stay verbatim from the original component.
 */
const ABHA_QR_SIZE = 180;

function AbhaQrModal({ open, loading, data, contentRef, onClose, onPrint, onDownload, profile }) {
  if (loading) {
    return (
      <Modal open centered closeIcon={false} footer={null} title={null} maskClosable={false}>
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
          <Spin size="large" />
        </div>
      </Modal>
    );
  }
  const clinicName = getClinicName(profile?.hospital_data) || "Clinic";
  const frameSize = ABHA_QR_SIZE + 50;
  const printText = { fontSize: "1rem", color: "#454551 !important", textAlign: "center" };

  return (
    <Modal
      open={open && !!data?.qrValue}
      centered
      closeIcon={false}
      onCancel={onClose}
      footer={null}
      title={null}
      destroyOnClose
      className="abha-qr-modal"
    >
      <div className="opd-qr">
        <button className="qr-close-btn" onClick={onClose}>
          <i style={{ fontSize: "2rem" }} className="icon-Cross" />
        </button>

        <div ref={contentRef} className="opd-plans-inner-contianer">
          {abhaMainIcon && (
            <div className="abha-main-icon-download" style={{ display: "flex", justifyContent: "center", marginTop: "-0.5rem", marginBottom: "0.25rem" }}>
              <img src={abhaMainIcon} alt="ABHA Icon" draggable="false" style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
            </div>
          )}

          <div
            className="opd-title abha-clinic-name"
            title={clinicName}
            style={{
              fontWeight: 700, color: "#1F2933", textAlign: "center",
              marginBottom: "0.5rem", marginTop: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
              fontSize: clinicName.length > 30 ? "1.1rem" : "1.5rem",
            }}
          >
            {clinicName}
          </div>

          {data?.qrValue && (
            <div
              className="abha-qr-container"
              style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: frameSize, height: frameSize }}
            >
              {qrOuterFrame && (
                <img
                  src={qrOuterFrame} alt="QR Frame" draggable="false"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}
                />
              )}
              <div className="abha-qr-code-wrapper" style={{ position: "relative", zIndex: 1 }}>
                <QRCodeSVG
                  className="opd-qr-image abha-qr-image"
                  value={data.qrValue}
                  size={ABHA_QR_SIZE}
                  imageSettings={abhaCenterLogo ? { src: abhaCenterLogo, height: ABHA_QR_SIZE * 0.15, width: ABHA_QR_SIZE * 0.15, excavate: true } : undefined}
                />
              </div>
            </div>
          )}

          <div className="opd-scan-text abha-scan-text-screen" style={printText}>
            Scan the above QR to create or link your ABHA account
          </div>

          {/* Print-only copy, revealed by the print stylesheet. */}
          <div className="abha-print-text" style={{ display: "none" }}>
            <div className="opd-scan-text" style={{ ...printText, marginTop: "0.75rem" }}>
              Scan the above QR to create or link your ABHA account in three easy steps
            </div>
            <div className="opd-scan-text abha-go-digital-text" style={{ ...printText, marginTop: "0.5rem" }}>
              Get Your ABHA. Go Digital.
            </div>
          </div>

          {poweredByLogo && tatvaPracticeLogo && (
            <div className="abha-powered-by" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              <img src={poweredByLogo} alt="Powered by" draggable="false" style={{ height: 10, objectFit: "contain" }} />
              <img src={tatvaPracticeLogo} alt="TatvaPractice" draggable="false" style={{ height: 20, objectFit: "contain" }} />
            </div>
          )}
        </div>

        <div className="d-flex align-items-center justify-content-between gap-2 mt-4">
          <AntButton onClick={onPrint} className="btn btn-primary1 btn-41 align-items-center d-flex justify-content-center" style={{ width: "12rem", height: "3rem" }}>
            <span className="fs-18 align-items-center d-flex"><i className="icon-Print me-2" />Print</span>
          </AntButton>
          <AntButton onClick={onDownload} className="btn btn-primary1 btn-41 align-items-center d-flex justify-content-center" style={{ width: "12rem", height: "3rem" }}>
            <span className="fs-18 align-items-center d-flex"><i className="icon-download me-2" />Download</span>
          </AntButton>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Main Header V1 — the Tesseract `Header` molecule as the app's top bar.
 *
 * `src/common/Header.js` is untouched; this is the parallel shell, the same move
 * `MainSidebarV1` made for the rail. Behaviour lives in `useMainHeaderV1`, look
 * comes from the design system, and this file is only the join between them.
 *
 * What the bar carries, left to right:
 *   logo            — brand mark, opens the TatvaPedia switch prompt
 *   clinic select   — the DS Dropdown; changing it re-mints the token
 *   tutorial        — the DS tutorial slot; drawer or popover, by route
 *   AI Suite        — monetisation entry point
 *   switch to old   — tonal icon CTA, only for doctors the flag still offers it to
 *   notifications   — tonal icon CTA, red dot while Beamer has something unread
 *   avatar          — profile menu; gold ring on a paid plan, bare otherwise
 */
export default function MainHeaderV1({ locationPath }) {
  const header = useMainHeaderV1({ locationPath });
  const hasNotification = useBeamerUnread(BEAMER_BUTTON_ID);
  const rootRef = useRef(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  /*
   * The rail sizes itself against the bar (`height: calc(100vh - …)`), so the bar
   * publishes its own measured height rather than both sides hard-coding a number
   * that only one of them can change.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--main-sidebar-v1-header-h",
        `${Math.round(root.getBoundingClientRect().height)}px`
      );
    };

    publish();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(publish);
      observer.observe(root);
    }
    window.addEventListener("resize", publish);

    return () => {
      window.removeEventListener("resize", publish);
      if (observer) observer.disconnect();
      document.documentElement.style.removeProperty("--main-sidebar-v1-header-h");
    };
  }, []);

  const profileMenuItems = buildProfileMenuItems({
    profile: header.profile,
    planDetails: header.planDetails,
    tokenData: header.tokenData,
    logoutOnly: header.isCvtExtHosAccessableFromGB,
    isPremium: header.isPremium,
    isTrialPlan: header.isTrialPlan,
    remainingTrialDays: header.remainingTrialDays,
    canShowTrialBanner: header.canShowTrialBanner,
    tp_monetization_enable: header.tp_monetization_enable,
    isOpdPlansAccessableFromGB: header.isOpdPlansAccessableFromGB,
    isAbhaQRAccessableFromGB: header.isAbhaQRAccessableFromGB,
    isOpdBillingAccessable: header.isOpdBillingAccessable,
    canShowAiReceptionist: header.canShowAiReceptionist,
    aiReceptionistLabel: header.aiReceptionistLabel,
    openAiReceptionist: header.openAiReceptionist,
    navigate: header.navigate,
    setUpWebsiteUrl: header.setUpWebsiteUrl,
    myAvailability: header.myAvailability,
    accountSettings: header.accountSettings,
    handleShowAbhaQRCode: header.handleShowAbhaQRCode,
    handleShowQRCode: header.handleShowQRCode,
    handleAiSuite: header.handleAiSuite,
    handleUpgradeClick: header.handleUpgradeClick,
    clickBuyNow: header.clickBuyNow,
    // Route logout through a confirmation modal instead of firing it on the
    // first click. The real handler still runs from the modal's confirm CTA.
    handleLogout: () => setLogoutConfirmOpen(true),
  });

  /*
   * The tutorial glyph.
   *
   * On routes that open the popover, the antd Popover wraps the glyph rather than
   * the DS button, because `actions` renders that button itself and there is no
   * element for the popover to anchor to otherwise. The glyph fills the button, so
   * the whole control is still the click target.
   */
  const tutorialSvg = (
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ color: "var(--tesseract-violet-600)" }}>
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="3.5" fill="none" />
      <circle cx="24" cy="24" r="15" fill="currentColor" />
      <path d="M20.5 15L33 24L20.5 33V15Z" style={{ fill: "var(--tesseract-slate-0)" }} />
    </svg>
  );

  const tutorialAction = header.tutorial.mode === "drawer"
    ? {
        type: "node",
        node: (
          <Tooltip title="Tutorial videos" placement="bottom">
            <button
              type="button"
              className={styles.tutorialButton}
              onClick={header.handleDrawervideo}
              aria-label="Tutorial videos"
            >
              {tutorialSvg}
            </button>
          </Tooltip>
        ),
      }
    : {
        type: "node",
        node: (
          <Popover
            open={header.popOverVideo}
            onOpenChange={header.showHideVideoListPopover}
            content={
              <TutorialPopoverContent
                videoList={header.videoList}
                categoryId={header.tutorial.categoryId}
                onClose={header.showHideVideoListPopover}
                onPlay={(video, category) => {
                  header.setVideoLink(video);
                  header.trackTutorialViewed(category);
                }}
              />
            }
            trigger="click"
            overlayClassName="pop-430 pp-0 videoTutorial"
            placement="bottom"
          >
            <Tooltip title="Tutorial videos" placement="bottom" open={header.popOverVideo ? false : undefined}>
              <button
                type="button"
                className={styles.tutorialButton}
                aria-label="Tutorial videos"
              >
                {tutorialSvg}
              </button>
            </Tooltip>
          </Popover>
        ),
      };

  /*
   * The right cluster, built fresh each render. Memoising it would mean listing
   * every handler and flag it closes over, and a stale entry here is a control
   * that silently does the wrong thing — the array is a handful of objects, so
   * rebuilding it costs nothing worth that risk.
   */
  const actions = (() => {
    const items = [];

    // Dr. Copilot's primary entry point. First in the actions group so it sits
    // at the leading edge of the right-hand cluster, where a search belongs.
    items.push({ type: "node", node: <CopilotSearch /> });
    items.push({ type: "divider" });

    if (!header.isCvtExtHosAccessableFromGB) {
      items.push(tutorialAction);
    }

    items.push({ type: "divider" });

    if (header.tp_monetization_enable && !header.isCvtExtHosAccessableFromGB) {
      items.push({
        type: "node",
        node: (
          <button
            type="button"
            className={styles.aiSuiteButton}
            onClick={header.handleAiSuite}
            aria-label="AI Suite"
          >
            <span className={styles.aiSuiteBrand} aria-hidden="true">
              <img
                className={styles.aiSuiteBg}
                src="/new-assets/icons/dr-agent/agent-bg.svg"
                alt=""
                draggable={false}
              />
              <img
                className={styles.aiSuiteSpark}
                src="/new-assets/icons/dr-agent/agent-spark.svg"
                alt=""
                draggable={false}
              />
            </span>
          </button>
        ),
      });
    }

    if (header.showSwitchToOld) {
      items.push({
        type: "node",
        node: (
          <Tooltip title="Switch to older design" placement="bottom">
            <Button
              variant="tonal"
              theme="neutral"
              aria-label="Switch to old view"
              icon={<TPLibraryIcon name="swap-horizontal3" corner="straight" size={20} />}
              onClick={header.checkModalOpenOrClose}
              style={{
                width: "var(--tesseract-header-control)",
                height: "var(--tesseract-header-control)",
              }}
            />
          </Tooltip>
        ),
      });
    }

    items.push({
      type: "node",
      node: (
        <span className={styles.notification}>
          <Tooltip title="Notifications" placement="bottom">
            <Button
              id={BEAMER_BUTTON_ID}
              variant="tonal"
              theme="neutral"
              aria-label="Notifications"
              icon={<TPLibraryIcon name="bell" size={20} />}
              onClick={header.handleNotificationClick}
              style={{
                width: "var(--tesseract-header-control)",
                height: "var(--tesseract-header-control)",
              }}
            />
          </Tooltip>
          {hasNotification && (
            <span className={styles.notificationDot} aria-hidden="true" />
          )}
        </span>
      ),
    });

    if (header.clinicOptions?.length) {
      items.push({
        type: "node",
        node: (
          <ClinicSwitcher
            options={header.clinicOptions}
            selected={header.selectedHospital}
            onChange={header.onClinicChange}
          />
        ),
      });
    }

    items.push({
      type: "node",
      node: (
        <AntDropdown
          menu={{ items: profileMenuItems }}
          trigger={["click"]}
          className="cursor-pointer"
          overlayClassName={`prfile-dropdown ${styles.profileDropdown} ${
            header.isCvtExtHosAccessableFromGB ? "logout-only-dropdown" : ""
          }`}
          dropdownRender={(menu) => (
            <div className="prfile-dropdown-inner">
              {menu}
              {APP_VERSION_LABEL && (
                <span className="app-version-badge" title={APP_RELEASE}>
                  {APP_VERSION_LABEL}
                </span>
              )}
            </div>
          )}
        >
          <a onClick={header.handeProfileDD} className={styles.avatarTrigger}>
            {header.isPremium ? (
              <PremiumUser />
            ) : (
              (() => {
                /*
                 * DS Avatar derives initials as one letter per space-separated
                 * word. Pre-strip honorifics and hand it a synthesised name
                 * whose split resolves to the initials we actually want, so a
                 * one-word name gets two letters ("Sheela" → "SH") and a
                 * multi-word name gets first+last ("Sheela BR" → "SB").
                 */
                const initials = personInitials(header.profile?.um_name);
                const nameForAvatar = initials
                  ? initials.split("").join(" ")
                  : header.profile?.um_name;
                return (
                  <Avatar
                    size={42}
                    src={header.profile?.um_image}
                    name={nameForAvatar}
                    alt={header.profile?.um_name || "Profile"}
                  />
                );
              })()
            )}
          </a>
        </AntDropdown>
      ),
    });

    return items;
  })();

  return (
    <TesseractThemeProvider colorScheme="light">
      <div className={styles.root} data-header="main-v1" ref={rootRef}>
        {header.isLoading && (
          <div className="spinner-overlay">
            <Spin size="large" />
          </div>
        )}

        <Header
          className={styles.bar}
          logo={
            <span className={styles.brand} onClick={header.onBrandClick}>
              <Logo brand="practice" height={28} />
              <Popover
                open={header.popOver}
                onOpenChange={header.showHideNavigateToTatvaPedia}
                trigger="click"
                overlayClassName="pop-370 pp-0"
                placement="bottomRight"
                content={
                  <div className="pop-header">
                    <div className="align-items-center d-flex">
                      <img
                        src={logoSm}
                        className="d-inline-block align-top me-3"
                        style={{ height: "40px" }}
                        alt=""
                      />
                      <div className="title-common title">
                        You can navigate to TatvaPedia <br /> platform from here
                      </div>
                    </div>
                    <div className="mt-4 fontroboto">
                      Where you can uplift your medical practice with premium evidence-based and
                      practice related content.
                    </div>
                    <div className="my-3 align-items-center d-flex justify-content-between">
                      <Checkbox
                        className="switch-name-check fontroboto fw-medium"
                        checked={header.logoCheckbox}
                        onChange={header.onLogoChange}
                      >
                        Don't show this again
                      </Checkbox>
                      <AntButton
                        onClick={() =>
                          header.logoCheckbox
                            ? header.onLogoClick()
                            : header.showHideNavigateToTatvaPedia()
                        }
                        className="lh-lg btn btn-primary3 btn-41 px-4"
                        loading={header.loading}
                      >
                        <span>Close</span>
                      </AntButton>
                    </div>
                  </div>
                }
              >
                <span />
              </Popover>
            </span>
          }
          title={null}
          actions={actions}
          height={62}
          bordered
        />
      </div>

      {/* Brand prompt: leaving TatvaPractice for the wider Tatvacare platform. */}
      <ConfirmDialog
        open={header.isLogoModalOpen}
        onOpenChange={(next) => {
          if (!next) header.showHideLogoModal();
        }}
        title="Tatvacare?"
        description="Tatvacare is the wider practice platform that hosts TatvaPractice, TatvaPedia and the other Tatva apps under one login."
        callout="You'll leave TatvaPractice and land on the Tatvacare platform. Continue?"
        calloutTone="warning"
        calloutCustomIcon={<TPIcon name="essential:danger" variant="bulk" size={24} />}
        withCheckbox
        checkboxLabel="Don't show this again"
        checkboxChecked={header.logoConfirmCheckbox}
        onCheckboxChange={header.onLogoConfirmChange}
        primaryLabel="Yes, Switch"
        primaryVariant="solid"
        primaryTheme="primary"
        onPrimary={() => {
          if (header.logoConfirmCheckbox) {
            try { localStorage.setItem("tp_logo_confirm_skip", "1"); } catch (_) {}
          }
          header.handleRedirectToOffering();
        }}
        secondaryLabel="No, Stay"
        secondaryVariant="outline"
        secondaryTheme="neutral"
        onSecondary={() => {
          window.Moengage.track_event("TP_Tatvapedia_Switch_cancelled");
          header.showHideLogoModal();
        }}
      />

      <ConfirmDialog
        open={header.isSwitchModalOpen}
        onOpenChange={(next) => {
          if (!next) header.showHideSwitchModal();
        }}
        title="Switch to old view"
        withDescription={false}
        callout="Are you sure you want to revert to the old version?"
        calloutTone="warning"
        calloutCustomIcon={<TPIcon name="essential:danger" variant="bulk" size={24} />}
        withCheckbox
        checkboxLabel="Don't show this again"
        checkboxChecked={header.switchCheckbox}
        onCheckboxChange={(next) =>
          header.onSwitchChange({ target: { checked: next } })
        }
        primaryLabel="Switch to Old"
        primaryVariant="solid"
        primaryTheme="primary"
        primaryLoading={header.loading}
        onPrimary={() =>
          header.switchCheckbox
            ? header.onSwitchLayoutClick(1)
            : header.onSwitchLayoutClick(0)
        }
        secondaryLabel="No, Stay"
        secondaryVariant="outline"
        secondaryTheme="neutral"
        onSecondary={header.showHideSwitchModal}
      />

      {/*
        Log-out confirmation — the DS `ConfirmDialog` molecule, not a
        hand-built modal. Args match the DS Storybook link the design
        team shared: title "Log out", danger bulk callout icon, no
        supporting description. Convention: PRIMARY CTA is the safe
        action ("No, Stay"); SECONDARY carries the destructive verb
        themed error.
      */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Log out"
        withDescription={false}
        callout="Are you sure you want to log out?"
        calloutTone="warning"
        calloutCustomIcon={<TPIcon name="essential:danger" variant="bulk" size={24} />}
        primaryLabel="No, Stay"
        primaryVariant="solid"
        primaryTheme="primary"
        onPrimary={() => setLogoutConfirmOpen(false)}
        secondaryLabel="Yes, Log Out"
        secondaryVariant="outline"
        secondaryTheme="error"
        onSecondary={header.handleLogout}
      />

      <QrPrintDownloadModal
        open={!!header.isQRCodeVisible && !!header.opdPlansUrl}
        onClose={header.showHideBackModal}
        contentRef={header.printRef}
        title="OPD Plans"
        byName={header.profile?.um_name}
        logoSrc={logoIcom}
        qrValue={header.opdPlansUrl}
        qrSize={180}
        scanText="Scan the QR to view & buy OPD plans"
        onPrint={header.handlePrint}
        onDownload={header.handleDownload}
        className="opd-plan-qr"
      />

      <AbhaQrModal
        open={header.isAbhaQRCodeVisible}
        loading={header.isLoadingAbhaQR}
        data={header.abhaQRCodeData}
        contentRef={header.abhaQRCodeRef}
        onClose={header.handleCloseAbhaQRCode}
        onPrint={header.handlePrintAbhaQRCode}
        onDownload={header.handleDownloadAbhaQRCode}
        profile={header.profile}
      />

      <TutorialDrawer
        open={header.videoDrawer}
        onClose={header.handleDrawervideo}
        videoList={header.videoList}
        onPlay={(video, category) => {
          header.setVideoLink(video);
          header.trackTutorialViewed(category);
        }}
      />

      {header.videoLink && (
        <VideoModal videoLink={header.videoLink} onCancel={() => header.setVideoLink(null)} />
      )}

      <AiSuite aiModal={header.aiModal} handleAiSuite={header.handleAiSuite} />

      <Drawer
        closeIcon={false}
        placement="right"
        onClose={header.handleMedEcoKnowMore}
        open={header.medEcoKnowMoreDrawer}
        width={600}
      >
        <MedEcoAppKnowMore handleMedEcoKnowMore={header.handleMedEcoKnowMore} />
      </Drawer>
    </TesseractThemeProvider>
  );
}
