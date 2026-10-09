import React from "react";
import Lottie from "lottie-react";
import { ASSETS } from "../../assets";

const ANIMATIONS = {
  "arrow-left": ASSETS.lotties.arrowLeft,
  "arrow-up": ASSETS.lotties.arrowUp,
};

function recolor(data, rgb) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((d) => recolor(d, rgb));
  if (typeof data !== "object") return data;
  const out = { ...data };
  if (data.ty === "st" || data.ty === "fl") {
    if (data.c?.k) {
      out.c = { ...data.c, k: rgb };
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
    1,
  ];
}

export function LottieIcon({
  name,
  size = 24,
  loop = true,
  autoplay = true,
  className,
  color,
}) {
  const src = ANIMATIONS[name];
  const [fetchedData, setFetchedData] = React.useState(null);

  React.useEffect(() => {
    if (!src || typeof src !== "string") return;
    let cancelled = false;
    fetch(src)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setFetchedData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [src]);

  const resolvedData = typeof src === "object" ? src : fetchedData;

  const data = React.useMemo(
    () => (resolvedData && color ? recolor(resolvedData, hexToRgb01(color)) : resolvedData),
    [resolvedData, color]
  );

  if (!data) return null;

  return (
    <div
      style={{ width: size, height: size, pointerEvents: "none" }}
      className={className}>
      <Lottie
        animationData={data}
        loop={loop}
        autoplay={autoplay}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
