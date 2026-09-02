/**
 * Geometry helpers for the letterhead header, shared by both PDF documents
 * (utils/server/viewpdf.js and components/print_settings/ViewPDF.js).
 *
 * Why this exists
 * ---------------
 * The footer and the header are not symmetric, and only one of them is accounted for
 * by page padding:
 *
 *   Footer - rendered `position: "absolute"`, so it consumes no flow height, and
 *            calculatePadding() already reserves it by folding
 *            `bottomMargin + measured footer height + FOOTER_CONTENT_GAP` into
 *            paddingBottom. Fully handled; nothing else has to subtract it.
 *
 *   Header - rendered `fixed` but NOT absolutely positioned, so react-pdf lays it out
 *            in normal flow on every page and it does eat content height. paddingTop
 *            only reserves the letterhead *margin*, never the header's rendered height.
 *
 * So the real height available to flowed content on a page is
 *
 *     pageHeight - paddingTop - paddingBottom - headerFlowHeight
 *
 * react-pdf's own image auto-height clamp (measureImage -> `pageArea`) knows only about
 * page padding, so it overestimates by exactly `headerFlowHeight`. Anything that sizes
 * itself against the usable page - the drawing-canvas cap below - has to subtract it.
 */

const PX_TO_PT = 0.75;

/** A4 portrait, in points. */
export const A4_HEIGHT_PTS = 842;
export const A4_WIDTH_PTS = 595;

// --- format 0 (text header) ------------------------------------------------------
// Two flex:1 columns side by side, each a `mainTitle` line plus an optional wrapped
// `subTitle`. The block's height is the taller column, so a single column is measured
// and the logo (which sits between the columns) is taken as a floor.
const MAIN_TITLE_HEIGHT_PTS = PX_TO_PT * 18 * 1.2;
const SUB_TITLE_LINE_HEIGHT_PTS = PX_TO_PT * 14 * 1.4;
const SUB_TITLE_MARGIN_TOP_PTS = PX_TO_PT * 4;
const HEADER_BLOCK_MARGIN_BOTTOM_PTS = PX_TO_PT * 15;

/** Tallest logo variant rendered inside the header row (130x90 for cross-consult, else 82x82). */
const LOGO_HEIGHT_PTS = 90;

/**
 * Characters that fit on one subtitle line within a single header column.
 * A column is roughly half the content width; at 10.5pt Roboto that is ~46 characters.
 * Only used to bound the *estimated* line count for the text header - the image header
 * below is computed exactly.
 */
const SUB_TITLE_CHARS_PER_LINE = 46;

/**
 * Slack left between the canvas block and the space actually available.
 *
 * react-pdf's own image measurement subtracts a SAFETY_HEIGHT of 10pt, and the block's
 * height is compared against the page with floating-point rounding on both sides. A
 * block that "exactly" fits can still be judged one hair too tall, and the penalty for
 * that is not a clipped drawing but an infinite pagination loop (see the note on the
 * canvas block in utils/server/viewpdf.js), so leave a margin.
 */
const CANVAS_FIT_SAFETY_PTS = 12;

const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const estimateWrappedLines = (text) => {
  const len = String(text || "").trim().length;
  if (!len) return 0;
  return Math.ceil(len / SUB_TITLE_CHARS_PER_LINE);
};

/**
 * Flow height of an uploaded letterhead header image.
 *
 * The header renders it as `<Image style={{ width: "100%", objectFit: "contain" }} />`
 * with no height bound, so its height is purely the aspect ratio applied to the
 * available content width. Exact - mirrors getFooterImageRenderHeightForWidth.
 */
export const getHeaderImageFlowHeightPts = (fileHeader, availableWidthPts) => {
  if (!fileHeader?.imageShow) return 0;

  const width = toPositiveNumber(fileHeader?.headerWidth);
  const height = toPositiveNumber(fileHeader?.headerHeight);
  const available = toPositiveNumber(availableWidthPts);

  if (width && height && available) return (height / width) * available;

  // Fall back to the height precomputed at upload time, if we have it.
  return toPositiveNumber(fileHeader?.renderedHeaderImageHeight);
};

/**
 * Flow height of the built-in text header (doctor / clinic info plus optional logo).
 *
 * Estimated, not exact: the subtitle wraps and react-pdf gives us no way to measure
 * text from here. Line count is derived from the real strings, and the logo height is
 * a floor, so the result tracks the actual header rather than being a fixed guess.
 */
export const getHeaderTextFlowHeightPts = ({ header, logoEnabled } = {}) => {
  const doctorInfo = header?.doctor_info;
  const clinicInfo = header?.clinic_info;

  const columnHeight = (info) => {
    if (info?.enable !== "Y") return 0;
    const lines = estimateWrappedLines(info?.subheader);
    return (
      MAIN_TITLE_HEIGHT_PTS +
      (lines
        ? SUB_TITLE_MARGIN_TOP_PTS + lines * SUB_TITLE_LINE_HEIGHT_PTS
        : 0)
    );
  };

  const tallestColumn = Math.max(columnHeight(doctorInfo), columnHeight(clinicInfo));
  if (!tallestColumn && !logoEnabled) return 0;

  return (
    Math.max(tallestColumn, logoEnabled ? LOGO_HEIGHT_PTS : 0) +
    HEADER_BLOCK_MARGIN_BOTTOM_PTS
  );
};

/**
 * Height the letterhead header consumes in page flow, for the active letterhead format.
 *
 *   0 - built-in text header (estimated, see above)
 *   1 - uploaded header image (exact, from its aspect ratio)
 *   2 - doctor's own pre-printed letterhead: nothing is drawn, the space is reserved
 *       by paddingTop, so no additional flow height
 */
export const getHeaderFlowHeightPts = ({
  letterheadFormat,
  header,
  fileHeader,
  logoEnabled,
  availableWidthPts,
} = {}) => {
  if (letterheadFormat === 1) {
    return getHeaderImageFlowHeightPts(fileHeader, availableWidthPts);
  }
  if (letterheadFormat === 0) {
    return getHeaderTextFlowHeightPts({ header, logoEnabled });
  }
  return 0;
};

/**
 * Largest height a drawing-canvas image may take and still leave its
 * `<View wrap={false}>` block able to fit on a page.
 *
 * Derived, not a fraction of the page: the block has to fit inside the content area
 * once the in-flow header and the block's own chrome (section margin, canvas name,
 * per-canvas margin) are taken out. Because the block is wrap={false}, react-pdf moves
 * it whole to a fresh page when the remaining space is too small - so it only has to
 * fit a *full* content area, not whatever is left on the current page. But it must
 * genuinely fit that, because a wrap={false} block which fits nowhere is moved to a
 * fresh page forever: an unbounded `while (nextPage !== null)` in react-pdf's paginate,
 * which hard-freezes the tab.
 *
 * Deliberately has no minimum. A floor is what makes this unsafe: clamping the image
 * *up* to stay legible can push the block past the space left under a tall letterhead,
 * which is precisely the freeze. Reproduced with a 320pt header: capping at a fixed
 * fraction hung react-pdf, the derived value laid out on one page. When the return
 * value is 0 there is no room for a canvas at all and the section must be skipped -
 * see canRenderCanvasSection.
 */
export const getMaxCanvasImageHeightPts = ({
  pageHeightPts = A4_HEIGHT_PTS,
  paddingTop = 0,
  paddingBottom = 0,
  headerFlowHeightPts = 0,
  blockChromePts = 0,
} = {}) => {
  const contentArea =
    pageHeightPts - (Number(paddingTop) || 0) - (Number(paddingBottom) || 0);
  const available =
    contentArea -
    (Number(headerFlowHeightPts) || 0) -
    (Number(blockChromePts) || 0) -
    CANVAS_FIT_SAFETY_PTS;

  return Math.max(0, available);
};

/**
 * Whether there is room to draw a canvas at all under this letterhead.
 *
 * False means the header plus the block's own chrome already fill the page. Rendering
 * anyway would freeze the tab, so the section is skipped: a missing drawing is
 * recoverable by fixing the print settings, a frozen prescription page is not.
 */
export const canRenderCanvasSection = (maxCanvasImageHeightPts) =>
  Number(maxCanvasImageHeightPts) > 0;
