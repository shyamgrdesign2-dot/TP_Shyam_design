/** Geometry helpers for canvas stroke math. */

export const getMidPoint = (p1, p2) => ({
  x: p1.x + (p2.x - p1.x) / 2,
  y: p1.y + (p2.y - p1.y) / 2,
  pressure: (p1.pressure + p2.pressure) / 2,
});

export const distanceBetween = (p1, p2) =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

export const distanceToLineSegment = (p, v, w) => {
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 === 0) return distanceBetween(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distanceBetween(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y),
    pressure: 0,
  });
};

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

// Splits a stroke into multiple strokes where the eraser intersects it.
// Point-based approximation suitable for dense pointer input.
export const splitStroke = (stroke, eraserCenter, eraserRadius) => {
  const newStrokes = [];
  let currentPoints = [];

  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    const dist = Math.sqrt(
      Math.pow(p.x - eraserCenter.x, 2) + Math.pow(p.y - eraserCenter.y, 2)
    );

    if (dist > eraserRadius) {
      currentPoints.push(p);
    } else {
      if (currentPoints.length >= 2) {
        newStrokes.push({ ...stroke, id: generateId(), points: currentPoints });
      }
      currentPoints = [];
    }
  }

  if (currentPoints.length >= 2) {
    newStrokes.push({ ...stroke, id: generateId(), points: currentPoints });
  }

  return newStrokes;
};
