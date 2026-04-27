import React from "react";
import Lottie from "lottie-react";
import arrowLeft from "./lottie/arrow-left.json";
import arrowUp from "./lottie/arrow-up.json";
const ANIMATIONS = {
  "arrow-left": arrowLeft,
  "arrow-up": arrowUp
};
/**
 * Recursively walk a Lottie JSON and recolor all strokes (stroke type "st"
 * and fill type "fl") to the given RGB 0..1 array.
 */
function recolor(data, rgb) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((d) => recolor(d, rgb));
  if (typeof data !== "object") return data;
  const out = Array.isArray(data) ?
  [] :
  {
    ...data
  };
  if (data.ty === "st" || data.ty === "fl") {
    if (data.c?.k) {
      out.c = {
        ...data.c,
        k: rgb
      };
    }
  }
  for (const key of Object.keys(data)) {
    if (key === "c") continue;
    out[key] = recolor(data[key], rgb);
  }
  return out;
}
function hexToRgb01(hex) {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return [1, 1, 1, 1];
  return [
  parseInt(m[0], 16) / 255,
  parseInt(m[1], 16) / 255,
  parseInt(m[2], 16) / 255,
  1];

}
export function LottieIcon({
  name,
  size = 24,
  loop = true,
  autoplay = true,
  className,
  color
}) {
  const src = ANIMATIONS[name];
  const data = React.useMemo(
    () => color ? recolor(src, hexToRgb01(color)) : src,
    [src, color]
  );
  return (
    <div
      style={{
        width: size,
        height: size,
        pointerEvents: "none"
      }}
      className={className}>

      <Lottie
        animationData={data}
        loop={loop}
        autoplay={autoplay}
        style={{
          width: size,
          height: size
        }} />

    </div>);

}