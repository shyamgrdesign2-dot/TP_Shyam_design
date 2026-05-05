"use client";

/**
 * OTPInput — One-time password input atom wrapping the `input-otp` package.
 * Styling: TP token CSS. Slot size 42×42px, radius 8px, blue focus ring.
 */

import * as React from "react";
import { OTPInput as OTPInputPrimitive, OTPInputContext } from "input-otp";

export function InputOTP({ containerClassName, className, ...props }) {
  return (
    <OTPInputPrimitive
      containerClassName={[
        "flex items-center gap-2",
        containerClassName,
      ].filter(Boolean).join(" ")}
      className={className}
      {...props}
    />
  );
}

export function InputOTPGroup({ className, style, children, ...props }) {
  return (
    <div
      style={{ display: "flex", gap: 8, ...style }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function InputOTPSlot({ index, style, className, ...props }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];

  return (
    <div
      data-active={slot?.isActive}
      style={{
        position: "relative",
        display: "flex",
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 600,
        borderRadius: 8,
        border: `1px solid ${slot?.isActive ? "var(--tp-blue-500)" : "var(--tp-slate-300)"}`,
        boxShadow: slot?.isActive ? "0 0 0 3px rgba(var(--tp-blue-500-rgb, 59,130,246),0.15)" : "none",
        color: "var(--tp-slate-900)",
        background: "white",
        transition: "border-color 120ms, box-shadow 120ms",
        ...style,
      }}
      className={className}
      {...props}
    >
      {slot?.char ?? (slot?.hasFakeCaret ? <FakeCaret /> : null)}
    </div>
  );
}

export function InputOTPSeparator({ ...props }) {
  return (
    <span
      style={{ color: "var(--tp-slate-400)", fontSize: 18 }}
      role="separator"
      {...props}
    >
      –
    </span>
  );
}

function FakeCaret() {
  return (
    <span
      style={{
        display: "block",
        width: 1,
        height: "1em",
        background: "var(--tp-slate-800)",
        animation: "tp-caret-blink 1s step-end infinite",
      }}
    />
  );
}
