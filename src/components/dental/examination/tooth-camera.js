/**
 * Per-tooth FDI camera azimuths and polar angles for the single-tooth view.
 * From user-provided reference screenshots.
 */
const FRONT_VIEWS = {
  // Upper Right (Quadrant 1) — anterior pol=80°, posterior pol=90°
  11: { az: 0,   pol: 80 },
  12: { az: 0,   pol: 80 },
  13: { az: -45, pol: 80 },
  14: { az: -70, pol: 90 },
  15: { az: -70, pol: 90 },
  16: { az: -70, pol: 90 },
  17: { az: -80, pol: 90 },
  18: { az: -70, pol: 90 },
  // Upper Left (Quadrant 2)
  21: { az: 0,   pol: 80 },
  22: { az: 0,   pol: 80 },
  23: { az: 45,  pol: 80 },
  24: { az: 70,  pol: 90 },
  25: { az: 70,  pol: 90 },
  26: { az: 70,  pol: 90 },
  27: { az: 80,  pol: 90 },
  28: { az: 70,  pol: 90 },
  // Lower Left (Quadrant 3)
  31: { az: 20,  pol: 90 },
  32: { az: 0,   pol: 90 },
  33: { az: 30,  pol: 90 },
  34: { az: 50,  pol: 90 },
  35: { az: 50,  pol: 90 },
  36: { az: 65,  pol: 90 },
  37: { az: 90,  pol: 90 },
  38: { az: 90,  pol: 90 },
  // Lower Right (Quadrant 4)
  41: { az: -20, pol: 90 },
  42: { az: 0,   pol: 90 },
  43: { az: -30, pol: 90 },
  44: { az: -50, pol: 90 },
  45: { az: -50, pol: 90 },
  46: { az: -65, pol: 90 },
  47: { az: -90, pol: 90 },
  48: { az: -90, pol: 90 },
};

export function getFrontAzimuth(fdi) {
  const v = FRONT_VIEWS[fdi];
  return v ? (v.az * Math.PI) / 180 : undefined;
}

function getFrontPolar(fdi) {
  const v = FRONT_VIEWS[fdi];
  return v ? (v.pol * Math.PI) / 180 : Math.PI * 0.5;
}

const ZONE_ORBIT = {
  occlusal: { azimuth: 0,             polar: Math.PI * 0.88 },
  buccal:   { azimuth: Math.PI,       polar: Math.PI * 0.55 },
  lingual:  { azimuth: 0,             polar: Math.PI * 0.55 },
  mesial:   { azimuth: Math.PI * 0.5, polar: Math.PI * 0.55 },
  distal:   { azimuth: -Math.PI * 0.5,polar: Math.PI * 0.55 },
  cervical: { azimuth: Math.PI * 0.8, polar: Math.PI * 0.48 },
  root:     { azimuth: Math.PI * 0.15,polar: Math.PI * 0.28 },
  whole:    { azimuth: 0,             polar: Math.PI * 0.5  },
};

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
