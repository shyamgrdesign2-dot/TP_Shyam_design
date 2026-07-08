import * as THREE from "three";
import { ZONE_INFO, ALL_ZONES } from "./types";
import { getDirsForTooth } from "./tooth-geometry-utils";

// Pre-compute zone color vectors once (avoids allocating 7 Vector3s per material per frame)
const _cachedColorVecs = ALL_ZONES.map(
  (z) => new THREE.Vector3(...ZONE_INFO[z].colorVec),
);
const WHOLE_TOOTH_COLOR = new THREE.Vector3(...ZONE_INFO.whole.colorVec);
const _warmedShaderVariants = new Set();

/**
 * Lightweight material tint used by the mini thumbnails (MiniToothCanvas).
 * Mirrors the color-tint blocks from the main shader but is
 * self-contained — no per-tooth geometry uniforms required.
 */
export function tintShader(material, flags = {}) {
  const mat = material;
  // Only Crown/Bridge actually need transparency (to show stump/ghost underneath).
  // RCT, Missing, and Denture should remain opaque — their visual distinction
  // is conveyed through color tints, not alpha reduction.
  if (flags.isCrown || flags.isBridge) {
    mat.transparent = true;
    mat.depthWrite = false;
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uIsCrown = { value: flags.isCrown ? 1.0 : 0.0 };
    shader.uniforms.uIsRCT = { value: flags.isRCT ? 1.0 : 0.0 };
    shader.uniforms.uIsMissing = { value: flags.isMissing ? 1.0 : 0.0 };
    shader.uniforms.uIsImplant = { value: flags.isImplant ? 1.0 : 0.0 };
    shader.uniforms.uIsBridge = { value: flags.isBridge ? 1.0 : 0.0 };
    shader.uniforms.uIsDenture = { value: flags.isDenture ? 1.0 : 0.0 };
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       uniform float uIsCrown;
       uniform float uIsRCT;
       uniform float uIsMissing;
       uniform float uIsImplant;
       uniform float uIsBridge;
       uniform float uIsDenture;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
       // Missing: red tint — NO alpha reduction; tooth stays opaque
       if (uIsMissing > 0.5) {
         float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 redTint = vec3(lum * 0.95 + 0.15, lum * 0.75 + 0.05, lum * 0.72 + 0.03);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, redTint, 0.45);
       }
       // Crown: semi-transparent grayish porcelain
       if (uIsCrown > 0.5) {
         gl_FragColor.a = min(gl_FragColor.a, 0.72);
         vec3 crownGrayTint = vec3(0.85, 0.85, 0.87);
         float lumC = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 crownTinted = crownGrayTint * (lumC * 0.55 + 0.45);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, crownTinted, 0.55);
       }
       // RCT: desaturated warm tint — NO alpha reduction; tooth stays opaque
       if (uIsRCT > 0.5) {
         float lumR = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 rctTint = vec3(0.92, 0.90, 0.87) * (lumR * 0.7 + 0.3);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, rctTint, 0.45);
       }
       // Bridge: grayish prosthetic
       if (uIsBridge > 0.5) {
         vec3 bridgeTint = vec3(0.82, 0.83, 0.85);
         float lumB = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, bridgeTint * (lumB * 0.6 + 0.5), 0.5);
       }
       // Denture: pink-hued tint — NO alpha reduction; tooth stays opaque
       if (uIsDenture > 0.5) {
         vec3 dentureTint = vec3(0.96, 0.78, 0.80);
         float lumD = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, dentureTint * (lumD * 0.6 + 0.5), 0.45);
       }
       // Implant: cool desaturated (preview-only; real implant uses separate mesh)
       if (uIsImplant > 0.5) {
         float lumI = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 greyTint = vec3(lumI * 0.85 + 0.18);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, greyTint, 0.4);
       }`,
    );
  };
  mat.needsUpdate = true;
}

export function getDentalShaderVariantKey(flags) {
  return [
    flags.isImplant ? "i1" : "i0",
    flags.isMissing ? "m1" : "m0",
    flags.isCrown  ? "c1" : "c0",
    flags.isRCT    ? "r1" : "r0",
    flags.isBridge ? "b1" : "b0",
    flags.isDenture? "d1" : "d0",
  ].join("|");
}

export function prewarmDentalShaderProgram({ gl, camera, source, variantKey }) {
  if (_warmedShaderVariants.has(variantKey)) return;
  try {
    const warmupScene = new THREE.Scene();
    const warmupRoot = source.clone(true);
    warmupScene.add(warmupRoot);
    gl.compile(warmupScene, camera);
    warmupScene.remove(warmupRoot);
    _warmedShaderVariants.add(variantKey);
  } catch {
    // Best-effort optimization only; normal render path remains valid.
  }
}

export function injectShader(
  material,
  cervicalY,
  cejY,
  crownBottomY,
  centerX,
  centerZ,
  arch,
  quadrant,
  zoneYawRad,
  toothFdi = "16",
  isImplant = false,
  isMissing = false,
  isCrown = false,
  isRCT = false,
  isBridge = false,
  isDenture = false,
  zonesWithFindings = [false, false, false, false, false, false, false],
) {
  const ref = { shader: null };
  const mat = material;
  const colorVecs = _cachedColorVecs;
  const dirs = getDirsForTooth(toothFdi, quadrant, zoneYawRad);
  // Critical: ensure Three.js does not reuse a stale non-dental shader program
  // across tab/type switches. Without a dedicated key, onBeforeCompile can be
  // bypassed by program cache hits, causing missing dentition colors until remount.
  const variantKey = getDentalShaderVariantKey({ isImplant, isMissing, isCrown, isRCT, isBridge, isDenture });
  mat.customProgramCacheKey = () => `tp-dental-zone-shader-v1-${variantKey}`;
  mat.onBeforeCompile = (shader) => {
    ref.shader = shader;
    shader.uniforms.selectedZone = { value: -1 };
    shader.uniforms.hoveredZone = { value: -1 };
    shader.uniforms.zoneColors = { value: colorVecs };
    shader.uniforms.uCejY = { value: cejY };
    shader.uniforms.uCervicalY = { value: cervicalY };
    const crownH = Math.abs(cervicalY - crownBottomY);
    const occlusalTop =
      arch === "maxillary"
        ? crownBottomY + crownH * 0.45
        : crownBottomY - crownH * 0.45;
    shader.uniforms.uOcclusalTop = { value: occlusalTop };
    shader.uniforms.uCenterX = { value: centerX };
    shader.uniforms.uCenterZ = { value: centerZ };
    shader.uniforms.uYDir = { value: arch === "maxillary" ? 1.0 : -1.0 };
    shader.uniforms.uMesialDir = { value: dirs.mesial };
    shader.uniforms.uDistalDir = { value: dirs.distal };
    shader.uniforms.uBuccalDir = { value: dirs.buccal };
    shader.uniforms.uLingualDir = { value: dirs.lingual };
    shader.uniforms.uIsImplant = { value: isImplant ? 1.0 : 0.0 };
    shader.uniforms.uIsMissing = { value: isMissing ? 1.0 : 0.0 };
    shader.uniforms.uIsCrown   = { value: isCrown   ? 1.0 : 0.0 };
    shader.uniforms.uIsRCT     = { value: isRCT     ? 1.0 : 0.0 };
    shader.uniforms.uIsBridge  = { value: isBridge  ? 1.0 : 0.0 };
    shader.uniforms.uIsDenture = { value: isDenture ? 1.0 : 0.0 };
    shader.uniforms.uWholeToothSelected = { value: 0.0 };
    shader.uniforms.uWholeToothMarked   = { value: 0.0 };
    shader.uniforms.uWholeToothColor    = { value: WHOLE_TOOTH_COLOR };
    const zf = new Array(7).fill(0);
    for (let i = 0; i < Math.min(zonesWithFindings.length, 7); i++)
      zf[i] = zonesWithFindings[i] ? 1 : 0;
    shader.uniforms.uZoneHasFinding = { value: zf };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vWorldPos;
       varying vec3 vWorldNorm;
       uniform int selectedZone;
       uniform int hoveredZone;
       uniform float uCejY;
       uniform float uCervicalY;
       uniform float uOcclusalTop;
       uniform float uCenterX;
       uniform float uCenterZ;
       uniform float uYDir;
       uniform vec3 uMesialDir;
       uniform vec3 uDistalDir;
       uniform vec3 uBuccalDir;
       uniform vec3 uLingualDir;
       uniform float uIsImplant;
       uniform float uIsMissing;
       uniform float uIsCrown;
       uniform float uIsRCT;
       uniform float uIsBridge;
       uniform float uIsDenture;
       uniform float uWholeToothSelected;
       uniform float uWholeToothMarked;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
       vWorldNorm = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

       // ── Compute zone in vertex shader for displacement ──
       float vy = vWorldPos.y;
       vec3 vwn = vWorldNorm;
       int vZone = -1;
       bool vIsRoot = (uYDir > 0.0) ? (vy >= uCejY) : (vy <= uCejY);
       bool vIsCervical = (uYDir > 0.0) ? (vy >= uCervicalY && vy < uCejY) : (vy <= uCervicalY && vy > uCejY);
       bool vIsOccY = (uYDir > 0.0) ? (vy < uOcclusalTop) : (vy > uOcclusalTop);
       bool vIsCrown = (uYDir > 0.0) ? (vy < uCervicalY) : (vy > uCervicalY);
       bool vIsOccN = (uYDir > 0.0) ? (vwn.y < -0.45) : (vwn.y > 0.45);

       if (vIsRoot) vZone = 6;
       else if (vIsCervical) vZone = 5;
       else if (vIsOccY || (vIsOccN && vIsCrown)) vZone = 0;
       else {
         vec3 vnH = vec3(vwn.x, 0.0, vwn.z);
         vec3 vFromC = vec3(vWorldPos.x - uCenterX, 0.0, vWorldPos.z - uCenterZ);
         float vLenH = length(vnH);
         float vLenC = length(vFromC);
         vec3 vGuide = vLenH > 0.18 ? normalize(vnH) : (vLenC > 1e-5 ? normalize(vFromC) : uLingualDir);
         float vdm = dot(vGuide, uMesialDir);
         float vdd = dot(vGuide, uDistalDir);
         float vdb = dot(vGuide, uBuccalDir);
         float vdl = dot(vGuide, uLingualDir);
         float vBest = vdm;
         vZone = 3;
         if (vdd > vBest) { vBest = vdd; vZone = 4; }
         if (vdb > vBest) { vBest = vdb; vZone = 1; }
         if (vdl > vBest) { vBest = vdl; vZone = 2; }
       }

       // ── Displacement: push outward along normal when zone is active ──
       float bulge = 0.0;
       if (uIsImplant > 0.5 && (vZone == 5 || vZone == 6)) bulge = 0.0;
       else if (uWholeToothSelected > 0.5) bulge = 0.008;
       else if (selectedZone == vZone) bulge = 0.012;
       else if (hoveredZone == vZone) bulge = 0.006;

       // Crown cap: extends past cervical into root, smooth bulge, no rim lip
       if (uIsCrown > 0.5) {
         float capEdge = (uYDir > 0.0) ? uCervicalY + 0.06 : uCervicalY - 0.06;
         bool inCapZone = (uYDir > 0.0) ? (vy <= capEdge) : (vy >= capEdge);
         if (inCapZone) {
           float crownDist;
           if (uYDir > 0.0) {
             crownDist = smoothstep(capEdge, capEdge - 0.03, vy);
           } else {
             crownDist = smoothstep(capEdge, capEdge + 0.03, vy);
           }
           bulge += 0.09 * crownDist;
         }
       }
       // Bridge: thick porcelain shell with sharp bottom edge
       if (uIsBridge > 0.5 && vIsCrown) {
         float bridgeDist;
         if (uYDir > 0.0) {
           bridgeDist = smoothstep(uCervicalY, uCervicalY - 0.015, vy);
         } else {
           bridgeDist = smoothstep(uCervicalY, uCervicalY + 0.015, vy);
         }
         float rimProx;
         if (uYDir > 0.0) {
           rimProx = smoothstep(uCervicalY - 0.15, uCervicalY - 0.015, vy);
         } else {
           rimProx = smoothstep(uCervicalY + 0.15, uCervicalY + 0.015, vy);
         }
         bulge += (0.05 + 0.03 * rimProx) * bridgeDist;
       }

       transformed += normal * bulge;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vWorldPos;
       varying vec3 vWorldNorm;
       uniform int selectedZone;
       uniform int hoveredZone;
       uniform vec3 zoneColors[7];
       uniform float uCejY;
       uniform float uCervicalY;
       uniform float uOcclusalTop;
       uniform float uCenterX;
       uniform float uCenterZ;
       uniform float uYDir;
       uniform vec3 uMesialDir;
       uniform vec3 uDistalDir;
       uniform vec3 uBuccalDir;
       uniform vec3 uLingualDir;
       uniform float uIsImplant;
       uniform float uIsMissing;
       uniform float uIsCrown;
       uniform float uIsRCT;
       uniform float uIsBridge;
       uniform float uIsDenture;
       uniform float uWholeToothSelected;
       uniform float uWholeToothMarked;
       uniform vec3 uWholeToothColor;
       uniform int uZoneHasFinding[7];`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>

       // ── Implant mode: discard cervical + root fragments ──
       if (uIsImplant > 0.5) {
         if (uYDir > 0.0) {
           if (vWorldPos.y >= uCervicalY) discard;
         } else {
           if (vWorldPos.y <= uCervicalY) discard;
         }
       }

       // ══ TOOTH RENDERING — depth & shadow, no gloss ══
       vec3 N = normalize(vWorldNorm);
       vec3 V = normalize(cameraPosition - vWorldPos);

       float cejBlend;
       if (uYDir > 0.0) {
         cejBlend = smoothstep(uCervicalY - 0.02, uCejY + 0.01, vWorldPos.y);
       } else {
         cejBlend = 1.0 - smoothstep(uCejY - 0.01, uCervicalY + 0.02, vWorldPos.y);
       }

       vec3 crownColor = vec3(0.95, 0.93, 0.90);
       vec3 rootLight = vec3(0.85, 0.78, 0.67);
       vec3 rootDark = vec3(0.76, 0.66, 0.52);
       vec3 rootColor = mix(rootLight, rootDark, cejBlend * 0.4);
       vec3 baseColor = mix(crownColor, rootColor, cejBlend);

       float cervicalMask;
       {
         float mid = (uCervicalY + uCejY) * 0.5;
         float spread = abs(uCejY - uCervicalY) * 1.2;
         cervicalMask = exp(-pow((vWorldPos.y - mid) / spread, 2.0) * 3.0);
       }
       vec3 cervicalTint = vec3(0.88, 0.80, 0.68);
       baseColor = mix(baseColor, cervicalTint, cervicalMask * 0.35);

       vec3 L = normalize(vec3(2.0, 4.0, 3.0));
       float NdotL = max(0.0, dot(N, L));
       {
         gl_FragColor.rgb = gl_FragColor.rgb * baseColor * 1.5;
         gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.0));
       }
       float y = vWorldPos.y;
       vec3 wn = normalize(vWorldNorm);
       int zone = -1;

       bool isRoot = (uYDir > 0.0) ? (y >= uCejY) : (y <= uCejY);
       bool isCervical = (uYDir > 0.0) ? (y >= uCervicalY && y < uCejY) : (y <= uCervicalY && y > uCejY);
       bool isOcclusalY = (uYDir > 0.0) ? (y < uOcclusalTop) : (y > uOcclusalTop);

       if (isRoot) {
         zone = 6;
       } else if (isCervical) {
         zone = 5;
       } else {
         bool isOcclusal = isOcclusalY;
         if (isOcclusal) {
           zone = 0;
         } else {
           vec3 nH = vec3(wn.x, 0.0, wn.z);
           vec3 fromC = vec3(vWorldPos.x - uCenterX, 0.0, vWorldPos.z - uCenterZ);
           float lenH = length(nH);
           float lenC = length(fromC);
           vec3 guide = lenH > 0.18 ? normalize(nH) : (lenC > 1e-5 ? normalize(fromC) : uLingualDir);
           float dm = dot(guide, uMesialDir);
           float dd = dot(guide, uDistalDir);
           float db = dot(guide, uBuccalDir);
           float dl = dot(guide, uLingualDir);
           float best = dm;
           zone = 3;
           if (dd > best) { best = dd; zone = 4; }
           if (db > best) { best = db; zone = 1; }
           if (dl > best) { best = dl; zone = 2; }
         }
       }

       if (zone >= 0 && zone < 7) {
         vec3 zc = zoneColors[zone];
         float lumZ = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         float tintIntensity = clamp(lumZ * 0.45 + 0.55, 0.55, 1.0);
         vec3 tinted = zc * tintIntensity;
         float tBoost = (uIsCrown > 0.5 || uIsRCT > 0.5 || uIsBridge > 0.5) ? 0.22 : 0.0;
         if (selectedZone == zone) {
           gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, min(0.75 + tBoost, 0.95));
         } else if (hoveredZone == zone) {
           gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, min(0.45 + tBoost, 0.75));
         } else if (uZoneHasFinding[zone] > 0) {
           gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, min(0.28 + tBoost * 0.6, 0.55));
         }
       }

       if (uWholeToothSelected > 0.5 || uWholeToothMarked > 0.5) {
         float wholeMix = uWholeToothSelected > 0.5 ? 0.24 : 0.10;
         float wholeLum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 wholeTint = uWholeToothColor * clamp(wholeLum * 0.45 + 0.55, 0.55, 1.0);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, wholeTint, wholeMix);
       }

       // ══ TOOTH-LEVEL DIAGNOSIS VISUAL EFFECTS ══

       // Missing/Extraction: red tint + hatch pattern — tooth stays opaque so
       // the ghost silhouette is clearly visible (not invisible against background).
       if (uIsMissing > 0.5) {
         float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 redTint = vec3(lum * 0.95 + 0.15, lum * 0.75 + 0.05, lum * 0.72 + 0.03);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, redTint, 0.45);
         vec2 uv2 = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 3.0;
         float line1 = abs(fract(uv2.x + uv2.y) - 0.5);
         float line2 = abs(fract(uv2.x - uv2.y) - 0.5);
         float crossPattern = min(line1, line2);
         if (crossPattern < 0.018) {
           gl_FragColor.rgb *= 0.92;
         }
       }

       if (uIsCrown > 0.5) {
         float crownEdge = (uYDir > 0.0) ? uCervicalY + 0.06 : uCervicalY - 0.06;
         bool crownCapArea = (uYDir > 0.0) ? (vWorldPos.y <= crownEdge) : (vWorldPos.y >= crownEdge);
         if (crownCapArea) {
           gl_FragColor.a = 0.46;
           vec3 crownGrayTint = vec3(0.85, 0.85, 0.87);
           float lumCrown = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 crownTinted = crownGrayTint * (lumCrown * 0.55 + 0.45);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, crownTinted, 0.55);
           vec2 crownUV = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 8.0;
           float gridX = abs(fract(crownUV.x) - 0.5);
           float gridY = abs(fract(crownUV.y) - 0.5);
           float gridLine = min(gridX, gridY);
           if (gridLine < 0.025) {
             gl_FragColor.rgb *= 0.975;
           }
           float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.5);
           gl_FragColor.a += fresnel * 0.15;
           gl_FragColor.a = min(gl_FragColor.a, 0.72);
           float edgeDist = (uYDir > 0.0)
             ? smoothstep(crownEdge - 0.006, crownEdge, vWorldPos.y)
             : smoothstep(crownEdge + 0.006, crownEdge, vWorldPos.y);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.40, 0.38, 0.35), edgeDist * 0.8);
           gl_FragColor.a = mix(gl_FragColor.a, 0.95, edgeDist);
           if (!gl_FrontFacing) {
             float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
             gl_FragColor.rgb = vec3(0.85, 0.85, 0.87) * (lum * 0.3 + 0.7);
             gl_FragColor.a = 0.92;
           }
         }
       }

       // RCT: warm desaturated tint — keep mostly opaque (0.88 alpha) so root canals
       // (rendered by the RootCanals component inside the tooth) remain faintly visible
       // through the tooth surface, without making the tooth look nearly invisible.
       if (uIsRCT > 0.5) {
         gl_FragColor.a *= 0.88;
         float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 rctTint = vec3(0.92, 0.90, 0.87) * (lum * 0.7 + 0.3);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, rctTint, 0.35);
       }

       if (uIsBridge > 0.5) {
         bool isRootArea = (uYDir > 0.0) ? (vWorldPos.y >= uCervicalY) : (vWorldPos.y <= uCervicalY);
         if (isRootArea) {
           discard;
         }
         if (gl_FrontFacing) {
           float lumBridge = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 bridgeTint = vec3(0.82, 0.83, 0.85) * (lumBridge * 0.55 + 0.45);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, bridgeTint, 0.55);
         }
         if (!gl_FrontFacing) {
           gl_FragColor.rgb *= 0.65;
         }
       }

       if (uIsDenture > 0.5) {
         bool isRootArea = (uYDir > 0.0) ? (vWorldPos.y >= uCervicalY) : (vWorldPos.y <= uCervicalY);
         if (isRootArea) {
           float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 acrylicPink = vec3(0.85, 0.55, 0.58) * (lum * 0.45 + 0.55);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, acrylicPink, 0.5);
         } else {
           float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 artificialTint = vec3(0.96, 0.95, 0.93) * (lum * 0.4 + 0.6);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, artificialTint, 0.3);
         }
       }`,
    );
  };
  // Always reset material state before enabling diagnosis-specific flags.
  // Without this reset, tab/type switches can leave stale transparent/double-sided
  // settings on materials and cause incorrect full-tooth tinting.
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.side = THREE.FrontSide;
  // Crown: transparent so the prepared stump underneath is visible.
  // RCT: slightly transparent (0.88 alpha via shader) so root canal geometry
  //      inside the tooth remains faintly visible through the surface.
  // Missing/Denture must remain OPAQUE — their identity is conveyed through
  // color tinting only, not alpha reduction.
  if (isCrown || isRCT) {
    mat.transparent = true;
  }
  if (isCrown || isBridge || isDenture) {
    mat.side = THREE.DoubleSide;
  }
  mat.needsUpdate = true;
  return ref;
}
