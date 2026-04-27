/**
 * SecondaryNavPanel — 80px left sidebar (Rx Pad).
 */
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowDown2, DocumentText, Note1 } from "iconsax-reactjs";
import { ToothIcon } from "../../ToothIcon";
import { TPMedicalIcon } from "../../tp-ui";
import { rxSidebarTokens } from "./tokens";
import p from "./rxSidebarPrimitives.module.scss";
import styles from "./NavPanel.module.scss";

const NAV_BG = {
  backgroundImage:
  "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 80 1133\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(64.518 65.21 -19.503 89.302 -155.96 413.08)\\'><stop stop-color=\\'rgba(22,21,88,1)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(35,34,119,1)\\' offset=\\'0.25\\'/><stop stop-color=\\'rgba(49,48,151,1)\\' offset=\\'0.5\\'/><stop stop-color=\\'rgba(75,74,213,1)\\' offset=\\'1\\'/></radialGradient></defs></svg>'), linear-gradient(90deg,rgb(255,255,255) 0%,rgb(255,255,255) 100%)"
};

function IconPill({ active, children }) {
  return (
    <div
      className={`${p.iconPill} ${active ? p.iconPillActiveBg : p.iconPillBg}`}>

      <div className={p.iconInner}>{children}</div>
    </div>);

}

function MedicalNavIcon({ active, name }) {
  return (
    <IconPill active={active}>
      <TPMedicalIcon
        name={name}
        variant={active ? "bulk" : "line"}
        size={20}
        color={active ? "var(--tp-blue-500)" : "#FFFFFF"}
        className={p.iconGlyph} />

    </IconPill>);

}

function IconsaxNavIcon({ active, Icon }) {
  return (
    <IconPill active={active}>
      <Icon
        size={20}
        variant={active ? "Bulk" : "Linear"}
        color={active ? "var(--tp-blue-500)" : "#FFFFFF"}
        strokeWidth={1.5} />

    </IconPill>);

}

function SelectionArrow() {
  return <div className={styles.selectionArrow} aria-hidden />;
}

const NAV_ITEMS = [
{
  id: "pastVisits",
  label: "Past Visits",
  icon: { kind: "iconsax", Icon: Note1 }
},
{
  id: "vitals",
  label: "Vitals",
  icon: { kind: "medical", name: "Heart Rate" }
},
{
  id: "history",
  label: "Medical History",
  icon: { kind: "medical", name: "clipboard-activity" }
},
{
  id: "dentalPlan",
  label: "Dental Plan",
  icon: { kind: "medical", name: "surgical-scissors-02" },
  navigateTo: "/treatment-plan"
},
{
  id: "medicalRecords",
  label: "Records",
  icon: { kind: "medical", name: "health-file-03" }
},
{
  id: "labResults",
  label: "Lab Results",
  icon: { kind: "medical", name: "Lab" }
},
{
  id: "personalNotes",
  label: "Personal Notes",
  icon: { kind: "iconsax", Icon: DocumentText }
}];


function NavItem({ id, label, icon, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const rowBg = active ?
  rxSidebarTokens.navItemSelectedBg :
  hovered ?
  rxSidebarTokens.navItemHoverBg :
  "transparent";

  return (
    <div
      className={styles.navItemRoot}
      style={{ width: rxSidebarTokens.railWidth, backgroundColor: rowBg }}
      onClick={() => onClick(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      <div className={styles.navRow}>
        <div
          className={styles.navCol}
          style={{
            gap: rxSidebarTokens.itemGap,
            paddingInline: rxSidebarTokens.itemPaddingX,
            paddingBlock: rxSidebarTokens.itemPaddingY,
            width: rxSidebarTokens.railWidth
          }}>

          {icon.kind === "medical" ?
          <MedicalNavIcon active={active} name={icon.name} /> :
          icon.kind === "tooth" ?
          <IconPill active={active}>
              <ToothIcon
              size={20}
              variant={active ? "Bulk" : "Linear"}
              color={active ? "var(--tp-blue-500)" : "#FFFFFF"}
              strokeWidth={1.5}
              className={p.iconGlyph} />

            </IconPill> :

          <IconsaxNavIcon active={active} Icon={icon.Icon} />}


          <p className={`${p.navLabel} ${styles.navLabel}`}>{label}</p>
        </div>
        {active ? <div className={styles.activeBar} /> : null}
      </div>
      {active ? <SelectionArrow /> : null}
    </div>);

}

export function NavPanel({ active, onSelect }) {
  const [searchParams] = useSearchParams();
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const updateHint = () => {
      const hasOverflow = node.scrollHeight > node.clientHeight + 2;
      const atTop = node.scrollTop <= 2;
      setShowScrollHint(hasOverflow && atTop);
    };
    updateHint();
    node.addEventListener("scroll", updateHint, { passive: true });
    window.addEventListener("resize", updateHint);
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHint);
      observer.observe(node);
    }
    return () => {
      node.removeEventListener("scroll", updateHint);
      window.removeEventListener("resize", updateHint);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className={styles.root} style={{ width: rxSidebarTokens.railWidth }}>
      <div
        ref={scrollRef}
        className={styles.scrollArea}
        style={{
          ...NAV_BG,
          width: rxSidebarTokens.railWidth,
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch"
        }}>

        {NAV_ITEMS.map(({ id, label, icon, navigateTo }) => {
          const item =
          <NavItem
            id={id}
            label={label}
            icon={icon}
            active={active === id}
            onClick={(nid) => {
              if (!navigateTo) onSelect(nid);
            }} />;



          if (navigateTo) {
            const patientId = searchParams?.get("patientId") ?? "apt-1";
            const fromParam =
            navigateTo === "/treatment-plan" ? `&from=rxpad` : "";
            return (
              <Link
                key={id}
                to={`${navigateTo}?patientId=${encodeURIComponent(patientId)}${fromParam}`}
                className={styles.linkFull}>

                {item}
              </Link>);

          }
          return <React.Fragment key={id}>{item}</React.Fragment>;
        })}
      </div>
      {showScrollHint ?
      <div className={styles.scrollHint}>
          <div className={styles.scrollHintBtn}>
            <ArrowDown2
            color="#FFFFFF"
            size={16}
            strokeWidth={1.5}
            variant="Linear" />

          </div>
        </div> :
      null}
    </div>);

}