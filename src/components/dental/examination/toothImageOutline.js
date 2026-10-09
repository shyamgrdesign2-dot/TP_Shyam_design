/**
 * Canvas helpers for odontogram tooth PNGs — silhouette stroke + grayscale
 * for PDF print where CSS drop-shadow is unavailable.
 */

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function strokeOffsets(strokePx) {
  const offsets = [];
  for (let x = -strokePx; x <= strokePx; x += 1) {
    for (let y = -strokePx; y <= strokePx; y += 1) {
      if (x * x + y * y <= strokePx * strokePx + strokePx) {
        offsets.push([x, y]);
      }
    }
  }
  return offsets;
}

/** Bake a dark outline that follows the tooth PNG alpha channel. */
export async function outlineToothPngDataUrl(
  dataUrl,
  { strokeColor = "#1f2937", strokePx = 2, grayscale = false } = {},
) {
  if (!dataUrl || typeof document === "undefined") return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    const pad = strokePx + 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.width + pad * 2;
    canvas.height = img.height + pad * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.translate(pad, pad);

    const offsets = strokeOffsets(strokePx);
    offsets.forEach(([dx, dy]) => {
      ctx.drawImage(img, dx, dy);
    });
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = strokeColor;
    ctx.fillRect(-pad, -pad, img.width + pad * 2, img.height + pad * 2);

    ctx.globalCompositeOperation = "source-over";
    if (grayscale) {
      ctx.filter = "grayscale(1)";
    }
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";

    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

export async function grayscaleToothPngDataUrl(dataUrl) {
  if (!dataUrl || typeof document === "undefined") return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.filter = "grayscale(1)";
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}
