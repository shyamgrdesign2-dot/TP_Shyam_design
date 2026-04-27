/**
 * Shared primitives for detailed section content panels.
 */
import React from "react";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { tpSectionCardStyle } from "./tokens";
import p from "./rxSidebarPrimitives.module.scss";
import d from "./detailShared.module.scss";

function getNearestScrollContainer(element) {
  let current = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function useStickyHeaderState(offset = 0) {
  const headerRef = React.useRef(null);
  const [isStuck, setIsStuck] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const node = headerRef.current;
    if (!node) return;
    const scrollRoot =
      node.closest('[data-sticky-scroll-root="true"]') ??
      getNearestScrollContainer(node);
    if (!scrollRoot) return;
    let frame = 0;
    const update = () => {
      const rootRect = scrollRoot.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const atStickyTop = nodeRect.top <= rootRect.top + offset + 0.5;
      setIsStuck(scrollRoot.scrollTop > 0 && atStickyTop);
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    scheduleUpdate();
    scrollRoot.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(scrollRoot);
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
    };
  }, [offset]);
  return { headerRef, isStuck };
}

export function ActionButton({
  label = "Add/Edit Details",
  icon = "plus",
  onClick,
}) {
  return (
    <div className={d.actionBar}>
      <div
        className={d.actionHit}
        role={onClick ? "button" : undefined}
        onClick={onClick}
      >
        <div className={d.actionOutline} aria-hidden />
        <div className={d.actionCenter}>
          <div className={d.actionInner}>
            {icon === "plus" ? (
              <div className={d.plusIcon}>
                <svg className={d.plusSvg} fill="none" viewBox="0 0 24 24">
                  <path
                    d="M6 12H18"
                    stroke="var(--tp-blue-500)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 18V6"
                    stroke="var(--tp-blue-500)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            ) : null}
            <p className={d.actionLabel}>{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCardHeader({
  title,
  titleAddon,
  expanded = true,
  onToggle,
  hideChevron = false,
}) {
  const { headerRef, isStuck } = useStickyHeaderState();
  const HeaderTag = onToggle ? "button" : "div";
  const radiusClass = expanded
    ? isStuck
      ? d.cardHeaderRoundedStuck
      : d.cardHeaderRoundedOpen
    : d.cardHeaderCollapsed;

  return (
    <HeaderTag
      ref={headerRef}
      type={onToggle ? "button" : undefined}
      onClick={onToggle}
      className={`${d.cardHeader} ${radiusClass} ${onToggle ? d.cardHeaderClickable : ""}`}
    >
      <div className={d.cardHeaderRow}>
        <div className={d.cardHeaderInner}>
          <div className={d.titleRow}>
            <div className={`${d.titleStrong} ${p.bodyStrong}`}>
              <p className={d.titleStrongP}>{title}</p>
            </div>
            {titleAddon}
          </div>
          {!hideChevron ? (
            <div className={d.chevronWrap}>
              <div className={d.chevronRot}>
                <div className={d.chevronBox}>
                  {expanded ? (
                    <ArrowSquareUp
                      color="var(--tp-slate-500)"
                      size={18}
                      strokeWidth={1.5}
                      variant="Linear"
                    />
                  ) : (
                    <ArrowSquareDown
                      color="var(--tp-slate-500)"
                      size={18}
                      strokeWidth={1.5}
                      variant="Linear"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </HeaderTag>
  );
}

export function SectionCard({
  title,
  titleAddon,
  expanded = true,
  onToggle,
  hideChevron = false,
  children,
}) {
  return (
    <div className={d.sectionCardRoot} style={tpSectionCardStyle}>
      <SectionCardHeader
        title={title}
        titleAddon={titleAddon}
        expanded={expanded}
        onToggle={onToggle}
        hideChevron={hideChevron}
      />
      {expanded ? <div className={d.sectionCardBody}>{children}</div> : null}
    </div>
  );
}

export function SectionScrollArea({ children }) {
  return (
    <div className={d.scrollArea} data-sticky-scroll-root="true">
      <div className={d.scrollInner}>{children}</div>
    </div>
  );
}

export function ContentRow({ children }) {
  return (
    <div className={d.contentRowOuter}>
      <div className={d.contentRowFlex}>
        <div className={d.contentRowPad}>
          <div className={d.contentGrow}>
            <div className={d.contentStack}>
              <div className={d.contentText}>{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Grey({ children }) {
  return <span className={d.grey}>{children}</span>;
}

export function Sep() {
  return <span className={d.sep}> | </span>;
}

export function Bold({ children }) {
  return <span className={p.bodyStrong}>{children}</span>;
}

export function Red({ children }) {
  return <span className={d.red}>{children}</span>;
}

export function CollapsedCard({ text }) {
  return (
    <div className={d.collapsedCard} style={tpSectionCardStyle}>
      <div className={d.collapsedInner}>
        <div className={d.collapsedRow}>
          <div className={d.collapsedPad}>
            <div className={d.collapsedTitle}>
              <p className={d.collapsedTitleP}>{text}</p>
            </div>
            <div className={d.chevronBox}>
              <ArrowSquareDown
                color="var(--tp-slate-500)"
                size={18}
                strokeWidth={1.5}
                variant="Linear"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
