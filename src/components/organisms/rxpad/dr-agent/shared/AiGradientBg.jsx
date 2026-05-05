"use client";

import React from "react";
import { AI_GRADIENT_SOFT_ANIMATED } from "../constants";

// -----------------------------------------------------------------
// AiGradientBg — Reusable animated gradient background for AI icons
//
// A subtle flowing gradient (6s cycle) applied to the spark icon
// backgrounds on canned/AI messages. The gradient smoothly shifts
// position to create a "living" AI feel without being distracting.
// -----------------------------------------------------------------








export function AiGradientBg({
  size = 20,
  borderRadius = 6,
  className,
  children
}) {
  return (
    <>
      <style jsx global>{`
        @keyframes aiGradientFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: AI_GRADIENT_SOFT_ANIMATED,
          backgroundSize: "200% 200%",
          animation: "aiGradientFlow 6s ease-in-out infinite"
        }}>
        
        {children}
      </div>
    </>);

}