import { getCommonBounds } from "@excalidraw/excalidraw";

export const VIEWPORT_PADDING = 24;

export function getViewportSize(wrapperEl) {
  if (!wrapperEl) {
    return { width: 800, height: 600 };
  }
  const rect = wrapperEl.getBoundingClientRect();
  return {
    width: Math.max(rect.width, 320),
    height: Math.max(rect.height, 240),
  };
}

export function fitDimensionsToViewport(
  naturalWidth,
  naturalHeight,
  viewportWidth,
  viewportHeight,
  padding = VIEWPORT_PADDING
) {
  const safeW = Math.max(naturalWidth, 1);
  const safeH = Math.max(naturalHeight, 1);
  const maxW = Math.max(viewportWidth - padding * 2, 100);
  const maxH = Math.max(viewportHeight - padding * 2, 100);
  const scale = Math.min(maxW / safeW, maxH / safeH, 1);
  const width = safeW * scale;
  const height = safeH * scale;
  const x = padding + (maxW - width) / 2;
  const y = padding + (maxH - height) / 2;
  return { x, y, width, height, scale };
}

export function clampElementsToViewport(
  elements,
  viewportWidth,
  viewportHeight,
  padding = VIEWPORT_PADDING
) {
  const active = (elements || []).filter((el) => !el?.isDeleted);
  if (active.length === 0) return elements;

  const maxW = Math.max(viewportWidth - padding * 2, 100);
  const maxH = Math.max(viewportHeight - padding * 2, 100);
  const [minX, minY, maxX, maxY] = getCommonBounds(active);
  const boundsW = Math.max(maxX - minX, 1);
  const boundsH = Math.max(maxY - minY, 1);

  if (boundsW > maxW || boundsH > maxH) {
    return fitElementsToViewport(elements, viewportWidth, viewportHeight, padding);
  }

  let dx = 0;
  let dy = 0;

  if (minX < padding) dx = padding - minX;
  if (minY < padding) dy = padding - minY;

  const adjMaxX = maxX + dx;
  const adjMaxY = maxY + dy;

  if (adjMaxX > viewportWidth - padding) {
    dx -= adjMaxX - (viewportWidth - padding);
  }
  if (adjMaxY > viewportHeight - padding) {
    dy -= adjMaxY - (viewportHeight - padding);
  }

  if (dx === 0 && dy === 0) return elements;

  return elements.map((el) => {
    if (el.isDeleted) return el;
    return { ...el, x: el.x + dx, y: el.y + dy };
  });
}

export function fitElementsToViewport(
  elements,
  viewportWidth,
  viewportHeight,
  padding = VIEWPORT_PADDING
) {
  const active = (elements || []).filter((el) => !el?.isDeleted);
  if (active.length === 0) return elements;

  const [minX, minY, maxX, maxY] = getCommonBounds(active);
  const boundsW = Math.max(maxX - minX, 1);
  const boundsH = Math.max(maxY - minY, 1);
  const maxW = Math.max(viewportWidth - padding * 2, 100);
  const maxH = Math.max(viewportHeight - padding * 2, 100);
  const scale = Math.min(maxW / boundsW, maxH / boundsH, 1);
  const offsetX = padding + (maxW - boundsW * scale) / 2;
  const offsetY = padding + (maxH - boundsH * scale) / 2;

  return elements.map((el) => {
    if (el.isDeleted) return el;

    const next = {
      ...el,
      x: (el.x - minX) * scale + offsetX,
      y: (el.y - minY) * scale + offsetY,
    };

    if (typeof el.width === "number") next.width = el.width * scale;
    if (typeof el.height === "number") next.height = el.height * scale;

    if (Array.isArray(el.points)) {
      next.points = el.points.map(([px, py]) => [px * scale, py * scale]);
    }

    if (typeof el.fontSize === "number") {
      next.fontSize = Math.max(1, el.fontSize * scale);
    }

    return next;
  });
}

export function elementsSceneChanged(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) {
    return true;
  }
  return after.some((el, index) => {
    const prev = before[index];
    if (!prev || prev.id !== el.id) return true;
    return (
      prev.x !== el.x ||
      prev.y !== el.y ||
      prev.width !== el.width ||
      prev.height !== el.height
    );
  });
}

export const FIXED_APP_STATE = {
  scrollX: 0,
  scrollY: 0,
  zoom: { value: 1 },
};
