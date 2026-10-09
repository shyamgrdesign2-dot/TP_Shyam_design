/**
 * Correlation has no backend module, so to appear in the "Customize Your Pad"
 * drawer it needs a synthetic left-module row. This id is deliberately far above
 * any real tmdpm_id so it can never collide, and — by design — it is NEVER sent
 * to the backend: the save handler strips it out. Its position lives only in the
 * client for the session and resets to the default (above Private Notes) on
 * reload. See CustomizeSetting.onCustomizePadClick and SideNavbar's navItems.
 */
export const CORRELATION_PAD_ID = 99001;

/** The row shape the customize drawer and the rail both understand. */
export const buildCorrelationPadModule = () => ({
  tmdpm_id: CORRELATION_PAD_ID,
  tmdpm_type: "L",
  tmdpm_name: "Correlation",
  tmdpm_short_name: "Correlation",
  tmdpm_status: 0,
  /* Rendered by a component (AiScienceIcon), not this URL — kept only so the
     row shape matches its siblings. */
  tmdpm_icon_url: "",
});

export const isCorrelationPadModule = (record) =>
  record?.tmdpm_id === CORRELATION_PAD_ID ||
  String(record?.tmdpm_name || "").toLowerCase() === "correlation";
