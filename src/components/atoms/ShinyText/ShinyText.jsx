"use client";

/**
 * ShinyText (React Bits / motion variant) — animated bg-clip-text shine
 * that sweeps across a text node. Used in the historical sidebar to flag
 * freshly-arrived data with a soft TP-violet highlight that drifts
 * across the text every few seconds.
 *
 * The animation is driven by `useAnimationFrame` from `motion/react`
 * (formerly framer-motion), so the shine moves in sync with the
 * browser's render loop instead of via CSS keyframes — that lets it
 * pause cleanly on hover and supports yoyo / direction tweaks at
 * runtime.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue, useTransform } from "motion/react";



























export default function ShinyText({
  text,
  disabled = false,
  speed = 2,
  className = "",
  color = "#b5b5b5",
  shineColor = "#ffffff",
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = "left",
  delay = 0
}) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef(null);
  const directionRef = useRef(direction === "left" ? 1 : -1);

  const animationDuration = speed * 1000;
  const delayDuration = delay * 1000;

  useAnimationFrame((time) => {
    if (disabled || isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    if (yoyo) {
      const cycleDuration = animationDuration + delayDuration;
      const fullCycle = cycleDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;

      if (cycleTime < animationDuration) {
        const p = cycleTime / animationDuration * 100;
        progress.set(directionRef.current === 1 ? p : 100 - p);
      } else if (cycleTime < cycleDuration) {
        progress.set(directionRef.current === 1 ? 100 : 0);
      } else if (cycleTime < cycleDuration + animationDuration) {
        const reverseTime = cycleTime - cycleDuration;
        const p = 100 - reverseTime / animationDuration * 100;
        progress.set(directionRef.current === 1 ? p : 100 - p);
      } else {
        progress.set(directionRef.current === 1 ? 0 : 100);
      }
    } else {
      const cycleDuration = animationDuration + delayDuration;
      const cycleTime = elapsedRef.current % cycleDuration;
      if (cycleTime < animationDuration) {
        const p = cycleTime / animationDuration * 100;
        progress.set(directionRef.current === 1 ? p : 100 - p);
      } else {
        progress.set(directionRef.current === 1 ? 100 : 0);
      }
    }
  });

  useEffect(() => {
    directionRef.current = direction === "left" ? 1 : -1;
    elapsedRef.current = 0;
    progress.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  // Transform: p=0 → 150% (shine off right), p=100 → -50% (shine off left)
  const backgroundPosition = useTransform(progress, (p) => `${150 - p * 2}% center`);

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  // Build the highlight band. For a single colour we keep the simple
  // base→shine→base sweep. For an array of stops the band spans
  // 38-62% (≈25% wide) so the multi-stop gradient is visibly moving
  // — too narrow and the colours blur into a single hue at distance.
  const highlightStops = Array.isArray(shineColor) ?
  shineColor.
  map((c, i, arr) => {
    const start = 38;
    const end = 62;
    const pct = arr.length === 1 ? 50 : start + (end - start) / (arr.length - 1) * i;
    return `${c} ${pct.toFixed(2)}%`;
  }).
  join(", ") :
  `${shineColor} 50%`;
  const baseEdgeIn = Array.isArray(shineColor) ? "32%" : "35%";
  const baseEdgeOut = Array.isArray(shineColor) ? "68%" : "65%";
  const gradientStyle = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} ${baseEdgeIn}, ${highlightStops}, ${color} ${baseEdgeOut}, ${color} 100%)`,
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent"
  };

  return (
    <motion.span
      className={`shiny-text ${className}`}
      style={{ ...gradientStyle, backgroundPosition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      
      {text}
    </motion.span>);

}