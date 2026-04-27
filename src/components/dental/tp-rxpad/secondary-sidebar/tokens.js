/**
 * TP RxPad Secondary Sidebar component contract.
 * Keep all reusable dimensions/typography/surface references here so
 * section implementations stay aligned with design-system primitives.
 */
export const rxSidebarTokens = {
  railWidth: 80,
  panelMinWidth: 250,
  panelMaxWidth: 350,
  panelPreferredWidth: "clamp(250px, 28vw, 350px)",
  itemGap: 6,
  itemPaddingX: 6,
  itemPaddingY: 12,
  iconContainerSize: 32,
  iconGlyphSize: 20,
  iconRadius: 10,
  contentRadius: 10,
  navItemSelectedBg: "var(--tp-icon-clickable-dark-bg)",
  navItemHoverBg: "rgba(255,255,255,0.12)",
};

export const tpSectionCardStyle = {
  border: "0.8px solid var(--tp-slate-100)",
  borderRadius: `${rxSidebarTokens.contentRadius}px`,
};
