"use client";

import { useState, useCallback } from "react";
import { Copy, CheckCircle } from "lucide-react";














/**
 * Copy-to-RXPad button component.
 *
 * Usage:
 *   - In desktop: shown on hover (parent needs `group` class)
 *   - In iPad/touch: always visible as a subtle icon
 *
 * Design tokens:
 *   - Icon: TP Blue 500 (default), TP Success 500 (copied state)
 *   - Background: transparent → TP Blue 50 on hover
 *   - Border radius: 6px (radius-sm)
 *   - Size: 24x24 (touch target: 32x32 with padding)
 */
export function CopyButton({
  tooltip = "Copy to RxPad",
  onCopy,
  size = 14,
  showOnHover = true,
  className = ""
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [onCopy]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      className={`
        inline-flex items-center justify-center
        rounded-md p-1
        transition-all duration-150
        ${copied ?
      "bg-tp-success-50 text-tp-success-600" :
      "text-tp-blue-500 hover:bg-tp-blue-50 hover:text-tp-blue-600 active:bg-tp-blue-100"}
        ${
      showOnHover ?
      "opacity-0 group-hover:opacity-100 focus:opacity-100 touch-device:opacity-100" :
      "opacity-70 hover:opacity-100"}
        ${
      className}
      `}
      aria-label={tooltip}>
      
      {copied ?
      <CheckCircle size={size} /> :

      <Copy size={size} />
      }
    </button>);

}

/**
 * Copy button for section headers (e.g., "Copy all Symptoms to RxPad").
 * Larger, with text label.
 */
export function CopySectionButton({
  label = "Copy All",
  onCopy,
  className = ""




}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1
        text-xs font-medium transition-all duration-150
        ${copied ?
      "bg-tp-success-50 text-tp-success-600" :
      "text-tp-blue-500 hover:bg-tp-blue-50 hover:text-tp-blue-600 active:bg-tp-blue-100"}
        ${
      className}
      `}
      aria-label={label}>
      
      {copied ?
      <>
          <CheckCircle size={14} />
          <span>Copied</span>
        </> :

      <>
          <Copy size={14} />
          <span>{label}</span>
        </>
      }
    </button>);

}