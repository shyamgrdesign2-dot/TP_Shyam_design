"use client";

/**
 * SecondaryNavPanel — vertical icon+label navigation rail.
 *
 * Used by the appointment screen and any page that needs a thin (80px)
 * left-side navigation panel with icon containers, labels, an active
 * highlight bar, and optional gradient badges. Two variants:
 *
 *   - "rx"      — dark TP-blue gradient background (default)
 *   - "primary" — light surface, slate or blue icon tones
 *
 * The component is purely presentational. State (active id, navigation)
 * is owned by the caller. Caller can override icon rendering via the
 * `renderIcon` slot to inject custom icon components per item.
 */

const SECONDARY_NAV_TOKENS = {
  panelWidth: 80,
  panelHeight: 740,
  itemPaddingX: 6,
  itemPaddingY: 12,
  iconLabelGap: 6,
  iconContainerSize: 32,
  iconContainerRadius: 10,
  iconSize: 20,
  highlightBarWidth: 3,
  highlightBarRadius: 12,
  arrowWidth: 8,
  arrowHeight: 16,
  labelWidth: 68,
  labelSize: 12,
  labelLineHeight: 18,
  labelTracking: 0.1,
  badgeSize: 10,
  badgePaddingLeft: 4,
  badgePaddingRight: 2,
  badgePaddingY: 4,
  badgeRadius: 30,
  bottomFadeHeight: 120,
};

const ICON_CLICKABLE_DARK_BG = "var(--tp-icon-clickable-dark-bg)";
const ICON_CLICKABLE_DARK_BG_HOVER = "var(--tp-icon-clickable-dark-bg-hover)";
const ICON_CLICKABLE_LIGHT_BG = "var(--tp-icon-clickable-light-bg)";
const ICON_CLICKABLE_LIGHT_BG_HOVER = "var(--tp-icon-clickable-light-bg-hover)";

export function SecondaryNavPanel({
  items,
  activeId,
  onSelect,
  variant = "rx",
  primaryIconTone = "slate",
  height = SECONDARY_NAV_TOKENS.panelHeight,
  bottomSpacerPx = 0,
  renderIcon,
}) {
  const isRx = variant === "rx";
  const panelBackground = isRx
    ? "radial-gradient(256.21% 808.53% at -194.95% 36.46%, var(--core-primary-900, #161558) 0%, #232277 25%, #313097 50%, #4B4AD5 100%), #FFF"
    : "var(--tp-slate-0)";

  const bottomFade = isRx
    ? "linear-gradient(180deg, rgba(22, 21, 88, 0.00) 0%, #161558 100%)"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.00) 0%, #FFF 80.62%)";

  return (
    <nav
      className="relative flex flex-col overflow-x-clip"
      style={{
        width: SECONDARY_NAV_TOKENS.panelWidth,
        height: typeof height === "number" ? `${height}px` : height,
        alignItems: "center",
        alignSelf: "stretch",
        borderRadius: 0,
        background: panelBackground,
      }}>
      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          const isPrimarySlate = !isRx && primaryIconTone === "slate";
          const itemTextColor = isRx ? "var(--tp-slate-0)" : "var(--tp-slate-700)";
          const iconDefaultBg = isRx
            ? ICON_CLICKABLE_DARK_BG
            : isPrimarySlate
            ? "var(--tp-slate-100)"
            : ICON_CLICKABLE_LIGHT_BG;
          const iconHoverBg = isRx
            ? ICON_CLICKABLE_DARK_BG_HOVER
            : isPrimarySlate
            ? "var(--tp-slate-200)"
            : ICON_CLICKABLE_LIGHT_BG_HOVER;
          const iconDefaultColor = isRx
            ? "var(--tp-slate-0)"
            : isPrimarySlate
            ? "var(--tp-slate-700)"
            : "var(--tp-blue-500)";
          const iconActiveBg = isRx ? "var(--tp-slate-0)" : "var(--tp-blue-500)";
          const iconActiveColor = isRx ? "var(--tp-blue-500)" : "var(--tp-slate-0)";
          const itemHoverBg = isRx
            ? "rgba(255,255,255,0.12)"
            : isPrimarySlate
            ? "rgba(69,69,81,0.08)"
            : "rgba(75,74,213,0.08)";
          const activeItemBackground = isRx
            ? "rgba(255,255,255,0.2)"
            : "rgba(75,74,213,0.12)";

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="group relative isolate flex shrink-0 items-center transition-colors"
              style={{
                width: SECONDARY_NAV_TOKENS.panelWidth,
                backgroundColor: isActive ? activeItemBackground : "transparent",
              }}>
              <div
                className="relative z-10 flex flex-1 flex-col items-center"
                style={{
                  gap: SECONDARY_NAV_TOKENS.iconLabelGap,
                  paddingInline: SECONDARY_NAV_TOKENS.itemPaddingX,
                  paddingBlock: SECONDARY_NAV_TOKENS.itemPaddingY,
                }}>
                <span
                  className="relative flex shrink-0 items-center justify-center transition-colors group-hover:scale-[1.02]"
                  style={{
                    width: SECONDARY_NAV_TOKENS.iconContainerSize,
                    height: SECONDARY_NAV_TOKENS.iconContainerSize,
                    borderRadius: SECONDARY_NAV_TOKENS.iconContainerRadius,
                    backgroundColor: isActive ? iconActiveBg : iconDefaultBg,
                  }}>
                  {!isActive && (
                    <span
                      className="pointer-events-none absolute inset-0 z-0 rounded-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: iconHoverBg }}
                    />
                  )}
                  <span className="relative z-10 inline-flex">
                    {renderIcon ? (
                      renderIcon({
                        item,
                        isActive,
                        isRx,
                        iconSize: SECONDARY_NAV_TOKENS.iconSize,
                      })
                    ) : (
                      <Icon
                        size={SECONDARY_NAV_TOKENS.iconSize}
                        color={isActive ? iconActiveColor : iconDefaultColor}
                      />
                    )}
                  </span>
                </span>

                <span
                  className="overflow-hidden text-center font-medium leading-[18px]"
                  style={{
                    width: SECONDARY_NAV_TOKENS.labelWidth,
                    minWidth: SECONDARY_NAV_TOKENS.labelWidth,
                    maxWidth: SECONDARY_NAV_TOKENS.labelWidth,
                    fontFamily: "var(--font-sans)",
                    fontSize: SECONDARY_NAV_TOKENS.labelSize,
                    lineHeight: `${SECONDARY_NAV_TOKENS.labelLineHeight}px`,
                    letterSpacing: `${SECONDARY_NAV_TOKENS.labelTracking}px`,
                    color: itemTextColor,
                    ...(item.label.trim().split(/\s+/).length === 1
                      ? {
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          wordBreak: "break-word",
                        }),
                  }}>
                  {item.label}
                </span>
              </div>

              {isActive && (
                <span
                  className="absolute left-0 top-0 bottom-0 z-20"
                  style={{
                    width: SECONDARY_NAV_TOKENS.highlightBarWidth,
                    backgroundColor: isRx ? "var(--tp-slate-0)" : "var(--tp-blue-500)",
                    borderTopRightRadius: SECONDARY_NAV_TOKENS.highlightBarRadius,
                    borderBottomRightRadius: SECONDARY_NAV_TOKENS.highlightBarRadius,
                  }}
                />
              )}

              {isActive && isRx && (
                <span
                  className="absolute z-20"
                  style={{
                    right: 0,
                    top: item.badge ? 40 : "50%",
                    transform: item.badge ? "none" : "translateY(-50%)",
                  }}>
                  <svg
                    width={SECONDARY_NAV_TOKENS.arrowWidth}
                    height={SECONDARY_NAV_TOKENS.arrowHeight}
                    viewBox="0 0 8 16"
                    fill="var(--tp-slate-0)"
                    style={{ display: "block" }}>
                    <path d="M8 0L0 8L8 16V0Z" />
                  </svg>
                </span>
              )}

              {item.badge && (
                <span
                  className="absolute z-30 flex items-center justify-center font-medium"
                  style={{
                    top: 20.5,
                    right: 0,
                    fontSize: SECONDARY_NAV_TOKENS.badgeSize,
                    lineHeight: "normal",
                    color: "var(--tp-slate-0)",
                    backgroundImage: item.badge.gradient,
                    borderTopLeftRadius: SECONDARY_NAV_TOKENS.badgeRadius,
                    borderBottomLeftRadius: SECONDARY_NAV_TOKENS.badgeRadius,
                    paddingLeft: SECONDARY_NAV_TOKENS.badgePaddingLeft,
                    paddingRight: SECONDARY_NAV_TOKENS.badgePaddingRight,
                    paddingBlock: SECONDARY_NAV_TOKENS.badgePaddingY,
                    fontFamily: "var(--font-sans)",
                  }}>
                  {item.badge.text}
                </span>
              )}

              {!isActive && (
                <span
                  className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: itemHoverBg }}
                />
              )}
            </button>
          );
        })}
        {bottomSpacerPx > 0 ? (
          <div aria-hidden="true" style={{ height: `${bottomSpacerPx}px` }} />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute left-0 z-10"
        style={{
          width: SECONDARY_NAV_TOKENS.panelWidth,
          height: SECONDARY_NAV_TOKENS.bottomFadeHeight,
          bottom: 0,
          background: bottomFade,
        }}
      />
    </nav>
  );
}
