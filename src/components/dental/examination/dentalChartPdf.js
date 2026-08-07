/**
 * Dental odontogram for @react-pdf/renderer (View PDF / print payload).
 * Mirrors FlatDentitionChart layout: tooth image + FDI + surface selector per cell.
 * Images are prefetched in the browser and converted to PNG data URLs because
 * react-pdf does not reliably render remote WebP or width:auto images.
 */
import React from "react";
import { View, Text, Image, Svg, Path, Circle, G } from "@react-pdf/renderer";
import {
  ADULT_UPPER_ROW,
  ADULT_LOWER_ROW,
  PEDIATRIC_UPPER_ROW,
  PEDIATRIC_LOWER_ROW,
  CHART_TITLES,
  getFdiListForPrefetch,
  getFdiRowsForDentitionType,
  getImageSourceFdi,
  getMaxHalfAspectSum,
  PEDIATRIC_MIXED_BAND_WIDTH_RATIO,
  resolveChartsToRender,
  toothAspect,
} from "./dentalChartConstants";
import { getToothImageCandidates } from "../../../assets";
import {
  grayscaleToothPngDataUrl,
  outlineToothPngDataUrl,
} from "./toothImageOutline";

export {
  ADULT_UPPER_ROW as UPPER_ROW,
  ADULT_LOWER_ROW as LOWER_ROW,
  ADULT_FDI as ALL_FDI,
} from "./dentalChartConstants";

const PATH_ROOT =
  "M36.8867 202.706H77.1133C79.7678 202.706 81.0969 206.024 79.0986 207.876L58.9854 226.513C57.8617 227.554 56.1384 227.554 55.0146 226.513L34.9004 207.876C32.9023 206.024 34.2321 202.706 36.8867 202.706Z";
const PATH_CERVICAL =
  "M34.8379 160.384C36.4665 158.775 39.285 158.672 41.5801 160.13C42.9573 161.004 44.4076 161.765 45.916 162.402C49.3632 163.858 53.0481 164.638 56.7607 164.697C60.4735 164.756 64.143 164.093 67.5586 162.741C68.9925 162.174 70.3702 161.489 71.6777 160.696C74.0318 159.27 76.86 159.377 78.4863 160.983L91.1387 173.479C92.8862 175.206 92.7701 177.866 91.0498 179.215C87.1174 182.298 82.7373 184.812 78.0342 186.674C75.2355 187.782 72.3549 187.262 68.9375 186.234C65.6773 185.254 61.7959 183.738 57.8018 183.675C53.8259 183.612 49.6776 184.989 46.1475 185.863C42.4349 186.783 39.2572 187.215 36.3906 186.005C31.555 183.963 27.0269 181.261 22.9404 177.987C21.2187 176.608 21.1158 173.938 22.8594 172.216L34.8379 160.384Z";
const PATH_BL =
  "M28.333 93.7061C28.5285 96.7782 29.2489 99.801 30.4717 102.649C31.9201 106.023 34.0412 109.085 36.7109 111.661C39.3807 114.237 42.5471 116.278 46.0273 117.669C48.9808 118.849 52.1133 119.541 55.2939 119.724V145.267C48.6064 145.068 42.0077 143.702 35.8203 141.229C32.9322 140.074 30.9982 137.533 29.0322 134.262C27.1638 131.153 25.2141 127.243 22.3545 124.483C19.4819 121.712 15.6489 120.056 12.6436 118.46C9.49039 116.785 7.08943 115.128 5.90723 112.374C3.35942 106.439 1.94928 100.114 1.73633 93.7061H28.333Z";
const PATH_BR =
  "M112.264 93.7061C112.051 100.114 110.641 106.44 108.093 112.375C106.91 115.129 104.509 116.785 101.356 118.46C98.3511 120.056 94.5181 121.712 91.6455 124.483C88.7859 127.243 86.8362 131.153 84.9678 134.262C83.0018 137.533 81.0677 140.074 78.1797 141.229C71.9923 143.702 65.3936 145.068 58.7061 145.267V119.724C61.8867 119.541 65.0192 118.849 67.9727 117.669C71.4529 116.278 74.6194 114.238 77.2891 111.662C79.959 109.086 82.0799 106.024 83.5283 102.649C84.7511 99.801 85.4715 96.7783 85.667 93.7061H112.264Z";
const PATH_TR =
  "M58.7061 38.7324C65.3936 38.9314 71.9923 40.2985 78.1797 42.7715C81.0678 43.9259 83.0018 46.4673 84.9678 49.7383C86.8362 52.8469 88.7859 56.7572 91.6455 59.5166C94.5181 62.2884 98.3511 63.9436 101.356 65.54C104.51 67.215 106.911 68.872 108.093 71.626C110.641 77.5611 112.051 83.8857 112.264 90.2939H85.667C85.4715 87.2218 84.751 84.1989 83.5283 81.3506C82.0799 77.9766 79.9588 74.915 77.2891 72.3389C74.6193 69.7628 71.4529 67.7221 67.9727 66.3311C65.0192 65.1506 61.8867 64.4584 58.7061 64.2754V38.7324Z";
const PATH_TL =
  "M55.2939 64.2754C52.1133 64.4584 48.9808 65.1506 46.0273 66.3311C42.5471 67.7221 39.3807 69.7628 36.7109 72.3389C34.0412 74.915 31.9201 77.9766 30.4717 81.3506C29.249 84.1989 28.5285 87.2218 28.333 90.2939H1.73633C1.94929 83.8857 3.35944 77.5611 5.90723 71.626C7.08943 68.872 9.49039 67.215 12.6436 65.54C15.6489 63.9436 19.4819 62.2884 22.3545 59.5166C25.2141 56.7572 27.1638 52.8469 29.0322 49.7383C30.9982 46.4673 32.9322 43.9259 35.8203 42.7715C42.0078 40.2985 48.6064 38.9314 55.2939 38.7324V64.2754Z";
const PATH_WHOLE =
  "M40.3711 1.70605H73.627C78.3391 1.70605 82.1599 5.52624 82.1602 10.2383V15.7617C82.1599 20.4738 78.3391 24.2939 73.627 24.2939H40.3711C35.6592 24.2937 31.8391 20.4736 31.8389 15.7617V10.2383C31.8391 5.52639 35.6592 1.7063 40.3711 1.70605Z";

const ZONE_COLORS = {
  occlusal: "#8a9098",
  buccal: "#8a9098",
  lingual: "#8a9098",
  mesial: "#8a9098",
  distal: "#8a9098",
  cervical: "#8a9098",
  root: "#8a9098",
  whole: "#8a9098",
};

/** Tooth image height for odontogram rows (A4 content width ~ 520pt). */
export function pdfToothHeight(pageContentWidth = 520, dentitionType = "adult") {
  const CENTRE_RESERVE = 9;
  const half = (pageContentWidth - CENTRE_RESERVE) / 2;
  const maxHalfAspectSum = getMaxHalfAspectSum(dentitionType === "mixed" ? "adult" : dentitionType);
  if (dentitionType === "mixed") {
    return pdfMixedChartDimensions(pageContentWidth).toothH;
  }
  return Math.max(40, Math.min(80, (half / maxHalfAspectSum) * 0.65));
}

const MIXED_SURFACE_ASPECT = 58 / 30;
const MIXED_SURFACE_TO_TOOTH_RATIO = 1.35;

/**
 * Compact dimensions so the 8-band mixed chart fits on one PDF page without splitting.
 * Scales tooth images and surface selectors proportionally.
 */
export function pdfMixedChartDimensions(pageContentWidth = 520) {
  const TARGET_BODY_HEIGHT = 300;
  const FIXED_OVERHEAD = 88;
  const BAND_DIVIDER = 3;
  const IMAGE_BAND_EXTRA = 14;
  const SURFACE_BAND_EXTRA = 4;
  const DIVIDER_COUNT = 7;

  const available = TARGET_BODY_HEIGHT - FIXED_OVERHEAD - DIVIDER_COUNT * BAND_DIVIDER;
  const heightBasedToothH = available / (4 + 4 * MIXED_SURFACE_TO_TOOTH_RATIO);

  const CENTRE_RESERVE = 9;
  const half = (pageContentWidth - CENTRE_RESERVE) / 2;
  const maxHalfAspectSum = getMaxHalfAspectSum("mixed");
  const widthBasedToothH = (half / maxHalfAspectSum) * 0.52;

  const toothH = Math.max(18, Math.min(28, Math.min(heightBasedToothH, widthBasedToothH)));
  const surfaceH = Math.round(toothH * MIXED_SURFACE_TO_TOOTH_RATIO);
  const surfaceW = Math.round(surfaceH / MIXED_SURFACE_ASPECT);

  return {
    toothH,
    surfaceSize: { width: surfaceW, height: surfaceH },
    bandMargin: 2,
    dividerMargin: 3,
    jawMargin: 5,
  };
}

export const PDF_MIXED_SURFACE_SIZE = pdfMixedChartDimensions(520).surfaceSize;

async function blobToPngDataUrl(blob) {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

const TOOTH_OUTLINE_STROKE_PX = 4;

/** In-memory cache keyed by dentition type so PDF rebuilds do not re-fetch teeth. */
const TOOTH_IMAGE_CACHE_VERSION = 2;
const cachedToothImageMaps = {};
const cachedToothImageMapPromises = {};

export function clearDentalToothImageMapCache() {
  Object.keys(cachedToothImageMaps).forEach((k) => delete cachedToothImageMaps[k]);
  Object.keys(cachedToothImageMapPromises).forEach((k) => delete cachedToothImageMapPromises[k]);
}

async function loadImageEntry(imageFdi) {
  for (const url of getToothImageCandidates(imageFdi)) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) continue;
      const plainGray = await grayscaleToothPngDataUrl(
        await blobToPngDataUrl(await res.blob()),
      );
      if (!plainGray) continue;
      const outlined = await outlineToothPngDataUrl(plainGray, {
        strokeColor: "#1f2937",
        strokePx: TOOTH_OUTLINE_STROKE_PX,
        grayscale: true,
      });
      return { plain: plainGray, outlined: outlined || plainGray };
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function loadDentalToothImageMap(fdiList) {
  if (typeof window === "undefined") return {};
  const imageFdiByDisplayFdi = {};
  fdiList.forEach((fdi) => {
    imageFdiByDisplayFdi[fdi] = getImageSourceFdi(fdi);
  });
  const uniqueSources = [...new Set(Object.values(imageFdiByDisplayFdi))];
  const sourceCache = {};
  await Promise.all(
    uniqueSources.map(async (imageFdi) => {
      const entry = await loadImageEntry(imageFdi);
      if (entry) sourceCache[imageFdi] = entry;
    }),
  );
  const map = {};
  fdiList.forEach((fdi) => {
    const source = imageFdiByDisplayFdi[fdi];
    if (sourceCache[source]) map[fdi] = sourceCache[source];
  });
  return map;
}

/** Prefetch odontogram images as PNG data URLs for react-pdf (cached per dentition type). */
export async function prefetchDentalToothImageMap({ dentitionType = "adult", force = false } = {}) {
  const type = dentitionType;
  const cacheKey = `${type}_v${TOOTH_IMAGE_CACHE_VERSION}`;

  if (
    !force &&
    cachedToothImageMaps[cacheKey] &&
    Object.values(cachedToothImageMaps[cacheKey]).some((entry) => typeof entry === "string")
  ) {
    clearDentalToothImageMapCache();
  }
  if (!force && cachedToothImageMaps[cacheKey]) {
    return cachedToothImageMaps[cacheKey];
  }
  if (!force && cachedToothImageMapPromises[cacheKey]) {
    return cachedToothImageMapPromises[cacheKey];
  }

  const fdiList = getFdiListForPrefetch(type);
  cachedToothImageMapPromises[cacheKey] = loadDentalToothImageMap(fdiList)
    .then((map) => {
      cachedToothImageMaps[cacheKey] = map;
      return map;
    })
    .catch((err) => {
      delete cachedToothImageMapPromises[cacheKey];
      throw err;
    });
  return cachedToothImageMapPromises[cacheKey];
}

const VALID_ZONE_IDS = new Set(["whole", "buccal", "lingual", "mesial", "distal", "occlusal", "cervical", "root"]);

const normalizeZoneId = (zone) => {
  const value = String(zone || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "labial") return "buccal";
  if (value === "palatal") return "lingual";
  if (value === "incisal") return "occlusal";
  return VALID_ZONE_IDS.has(value) ? value : null;
};

const PdfQuickSurfaceSelector = ({ selectedZones, arch = "mandibular", width = 36, height = 72 }) => {
  const NEUTRAL_STROKE = "#c4c9d1";
  const zoneProps = (id) => {
    const isSel = selectedZones.has(id);
    const color = ZONE_COLORS[id] || NEUTRAL_STROKE;
    return {
      fill: isSel ? color : "#ffffff",
      fillOpacity: 1,
      stroke: isSel ? color : NEUTRAL_STROKE,
      strokeWidth: isSel ? 2 : 1.2,
      strokeOpacity: isSel ? 1 : 0.85,
    };
  };

  const crown = (
    <>
      <Path d={PATH_TL} {...zoneProps("buccal")} />
      <Path d={PATH_TR} {...zoneProps("lingual")} />
      <Path d={PATH_BL} {...zoneProps("mesial")} />
      <Path d={PATH_BR} {...zoneProps("distal")} />
      <Circle cx={57} cy={92} r={20} {...zoneProps("occlusal")} />
      <Path d={PATH_CERVICAL} {...zoneProps("cervical")} />
      <Path d={PATH_ROOT} {...zoneProps("root")} />
    </>
  );

  return (
    <Svg width={width} height={height} viewBox="0 0 114 229">
      <Path d={PATH_WHOLE} {...zoneProps("whole")} />
      {arch === "maxillary" ? (
        <G transform="matrix(1 0 0 -1 0 265)">{crown}</G>
      ) : (
        crown
      )}
    </Svg>
  );
};

const PdfToothCell = ({
  fdi,
  arch,
  toothState,
  toothH,
  toothImageMap,
  printSettings,
  PX_TO_PT,
  variant = "full",
  surfaceSize,
}) => {
  const selectedZones = new Set();
  const toothDiagnoses = [];
  const findings = [];

  if (toothState) {
    (toothState.treatment_history || []).forEach((h) => {
      const name = h.name || h.type || "";
      if (name) toothDiagnoses.push(name);
      (h.surface_codes || []).forEach((s) => {
        const zone = normalizeZoneId(s);
        if (zone) selectedZones.add(zone);
      });
    });
    (toothState.findings || []).forEach((f) => {
      const name = f.name || f.type || "";
      if (name) findings.push(name);
      (f.surface_codes || []).forEach((s) => {
        const zone = normalizeZoneId(s);
        if (zone) selectedZones.add(zone);
      });
    });
    (toothState.procedures || []).forEach((p) => {
      const name = p.name || p.type || "";
      if (name) toothDiagnoses.push(name);
      (p.surface_codes || []).forEach((s) => {
        const zone = normalizeZoneId(s);
        if (zone) selectedZones.add(zone);
      });
    });
  }

  const isMissing = toothDiagnoses.some((d) => ["missing", "extraction"].includes(String(d).toLowerCase()));
  const hasData = toothDiagnoses.length > 0 || findings.length > 0;
  const aspect = toothAspect(fdi);
  const imgH = toothH;
  const imgW = imgH * aspect;
  const toothEntry = toothImageMap?.[fdi];
  const toothSrc = typeof toothEntry === "string"
    ? toothEntry
    : hasData
      ? toothEntry?.outlined || toothEntry?.plain
      : toothEntry?.plain;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";

  const imgNode = toothSrc ? (
    <View
      style={{
        height: imgH + 4,
        minWidth: imgW + 4,
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: hasData ? "rgba(124,58,237,0.10)" : "transparent",
        borderRadius: 3,
        padding: 1,
      }}
    >
      <Image
        src={toothSrc}
        style={{
          height: imgH,
          width: imgW,
          opacity: isMissing ? 0.4 : 1,
        }}
      />
    </View>
  ) : (
    <View style={{ height: imgH + 4, width: imgW + 4 }} />
  );

  const fdiNode = (
    <Text
      style={{
        fontSize: PX_TO_PT * 8.5,
        fontWeight: hasData ? "bold" : "normal",
        color: hasData ? "#1e293b" : "#94a3b8",
        fontFamily,
        marginTop: 2,
        marginBottom: 2,
        textAlign: "center",
      }}
    >
      {fdi}
    </Text>
  );

  const surfW = surfaceSize?.width ?? 36;
  const surfH = surfaceSize?.height ?? 72;

  const selectorNode = (
    <View style={{ width: surfW, height: surfH, alignItems: "center", justifyContent: "center" }}>
      <PdfQuickSurfaceSelector selectedZones={selectedZones} arch={arch} width={surfW} height={surfH} />
    </View>
  );

  const showImage = variant === "full" || variant === "images";
  const showLabel = variant === "full" || variant === "images";
  const showSurfaces = variant === "full" || variant === "surfaces";

  const cellW = showImage ? Math.max(34, imgW + 6) : Math.max(34, surfW + 4);

  const nodes = [];
  if (showImage) nodes.push({ key: "img", node: imgNode });
  if (showLabel) nodes.push({ key: "fdi", node: fdiNode });
  if (showSurfaces) nodes.push({ key: "sel", node: selectorNode });

  const ordered =
    arch === "maxillary"
      ? nodes
      : [...nodes].sort((a, b) => {
          const order = { sel: 0, fdi: 1, img: 2 };
          return (order[a.key] ?? 1) - (order[b.key] ?? 1);
        });

  return (
    <View style={{ alignItems: "center", width: cellW }}>
      {ordered.map(({ key, node }) => (
        <View key={key}>{node}</View>
      ))}
    </View>
  );
};

const chartDividerStyle = { width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 4 };
const jawDividerStyle = (PX_TO_PT) => ({
  height: 1,
  backgroundColor: "#e2e8f0",
  marginVertical: PX_TO_PT * 6,
});

const renderToothBand = ({
  fdiList,
  teethPerQuadrant,
  arch,
  variant,
  toothStateMap,
  toothH,
  toothImageMap,
  printSettings,
  PX_TO_PT,
  surfaceSize,
  bandMargin,
  bandWidthRatio = 1,
}) => {
  const leftPart = fdiList.slice(0, teethPerQuadrant);
  const rightPart = fdiList.slice(teethPerQuadrant);
  const cell = (fdi) => (
    <PdfToothCell
      key={fdi}
      fdi={fdi}
      arch={arch}
      variant={variant}
      surfaceSize={surfaceSize}
      toothState={toothStateMap[fdi]}
      toothH={toothH}
      toothImageMap={toothImageMap}
      PX_TO_PT={PX_TO_PT}
      printSettings={printSettings}
    />
  );
  const marginBottom = bandMargin ?? PX_TO_PT * 2;
  const bandRow = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-around", flex: 1 }}>
        {leftPart.map(cell)}
      </View>
      <View style={chartDividerStyle} />
      <View style={{ flexDirection: "row", justifyContent: "space-around", flex: 1 }}>
        {rightPart.map(cell)}
      </View>
    </View>
  );

  if (bandWidthRatio < 1) {
    return (
      <View style={{ width: `${bandWidthRatio * 100}%`, alignSelf: "center", marginBottom }}>
        {bandRow}
      </View>
    );
  }

  return (
    <View style={{ marginBottom }}>
      {bandRow}
    </View>
  );
};

const chartShellStyle = (PX_TO_PT, { compact = false } = {}) => ({
  marginTop: PX_TO_PT * (compact ? 6 : 10),
  marginBottom: PX_TO_PT * (compact ? 6 : 10),
  padding: PX_TO_PT * (compact ? 4 : 8),
  breakInside: "avoid",
});

const chartTitleStyle = (printSettings, PX_TO_PT) => ({
  fontSize: PX_TO_PT * 10,
  fontWeight: "bold",
  color: "#334155",
  marginBottom: PX_TO_PT * 8,
  fontFamily: printSettings?.page_format?.font_family || "Roboto",
});

const PdfDentitionChart = ({
  PX_TO_PT,
  printSettings,
  toothStateMap,
  toothImageMap,
  upperRow,
  lowerRow,
  teethPerQuadrant,
  title,
  dentitionType = "adult",
}) => {
  const toothH = pdfToothHeight(520, dentitionType);
  const bandProps = {
    toothStateMap,
    toothH,
    toothImageMap,
    printSettings,
    PX_TO_PT,
  };

  return (
    <View style={chartShellStyle(PX_TO_PT)} wrap={false}>
      <Text style={chartTitleStyle(printSettings, PX_TO_PT)}>{title}</Text>
      <View style={{ flexDirection: "column" }}>
        {renderToothBand({ ...bandProps, fdiList: upperRow, teethPerQuadrant, arch: "maxillary", variant: "full" })}
        <View style={jawDividerStyle(PX_TO_PT)} />
        {renderToothBand({ ...bandProps, fdiList: lowerRow, teethPerQuadrant, arch: "mandibular", variant: "full" })}
      </View>
    </View>
  );
};

const PdfMixedDentitionChart = ({
  PX_TO_PT,
  printSettings,
  toothStateMap,
  toothImageMap,
}) => {
  const mixedDims = pdfMixedChartDimensions(520);
  const bandProps = {
    toothStateMap,
    toothH: mixedDims.toothH,
    toothImageMap,
    printSettings,
    PX_TO_PT,
    surfaceSize: mixedDims.surfaceSize,
    bandMargin: mixedDims.bandMargin,
  };
  const band = (props) => renderToothBand({ ...bandProps, ...props });
  const bandDivider = { height: 1, backgroundColor: "#e2e8f0", marginVertical: mixedDims.dividerMargin };
  const jawDivider = { height: 1, backgroundColor: "#e2e8f0", marginVertical: mixedDims.jawMargin };

  return (
    <View style={chartShellStyle(PX_TO_PT, { compact: true })} wrap={false}>
      <Text style={chartTitleStyle(printSettings, PX_TO_PT)}>{CHART_TITLES.mixed}</Text>
      <View style={{ flexDirection: "column" }}>
        {band({ fdiList: ADULT_UPPER_ROW, teethPerQuadrant: 8, arch: "maxillary", variant: "images" })}
        <View style={bandDivider} />
        {band({ fdiList: ADULT_UPPER_ROW, teethPerQuadrant: 8, arch: "maxillary", variant: "surfaces" })}
        <View style={bandDivider} />
        {band({
          fdiList: PEDIATRIC_UPPER_ROW,
          teethPerQuadrant: 5,
          arch: "maxillary",
          variant: "images",
          bandWidthRatio: PEDIATRIC_MIXED_BAND_WIDTH_RATIO,
        })}
        <View style={bandDivider} />
        {band({
          fdiList: PEDIATRIC_UPPER_ROW,
          teethPerQuadrant: 5,
          arch: "maxillary",
          variant: "surfaces",
          bandWidthRatio: PEDIATRIC_MIXED_BAND_WIDTH_RATIO,
        })}
        <View style={jawDivider} />
        {band({
          fdiList: PEDIATRIC_LOWER_ROW,
          teethPerQuadrant: 5,
          arch: "mandibular",
          variant: "surfaces",
          bandWidthRatio: PEDIATRIC_MIXED_BAND_WIDTH_RATIO,
        })}
        <View style={bandDivider} />
        {band({
          fdiList: PEDIATRIC_LOWER_ROW,
          teethPerQuadrant: 5,
          arch: "mandibular",
          variant: "images",
          bandWidthRatio: PEDIATRIC_MIXED_BAND_WIDTH_RATIO,
        })}
        <View style={bandDivider} />
        {band({ fdiList: ADULT_LOWER_ROW, teethPerQuadrant: 8, arch: "mandibular", variant: "surfaces" })}
        <View style={bandDivider} />
        {band({ fdiList: ADULT_LOWER_ROW, teethPerQuadrant: 8, arch: "mandibular", variant: "images" })}
      </View>
    </View>
  );
};

export const PdfDentalChart = ({ PX_TO_PT, printSettings, dentalExaminationData, toothImageMap = {} }) => {
  const toothStates = Array.isArray(dentalExaminationData?.tooth_states) ? dentalExaminationData.tooth_states : [];
  const toothStateMap = {};
  toothStates.forEach((ts) => {
    if (ts.tooth_code) toothStateMap[String(ts.tooth_code)] = ts;
  });

  const { isMixed, showAdult, showPediatric } = resolveChartsToRender(dentalExaminationData);

  if (isMixed) {
    return (
      <PdfMixedDentitionChart
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        toothStateMap={toothStateMap}
        toothImageMap={toothImageMap}
      />
    );
  }

  const rows = getFdiRowsForDentitionType(showPediatric ? "pediatric" : "adult");
  return (
    <PdfDentitionChart
      PX_TO_PT={PX_TO_PT}
      printSettings={printSettings}
      toothStateMap={toothStateMap}
      toothImageMap={toothImageMap}
      upperRow={rows.upperRow}
      lowerRow={rows.lowerRow}
      teethPerQuadrant={rows.teethPerQuadrant}
      title={rows.title}
      dentitionType={showPediatric ? "pediatric" : "adult"}
    />
  );
};
