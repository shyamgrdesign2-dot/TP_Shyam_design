"use client";

import { forwardRef } from "react";
import {
  getButtonTokens,
  BUTTON_SIZE_TOKENS } from
"./tokens";

import { TPButtonIcon } from "./TPButtonIcon";

export const TPIconButton = forwardRef(
  function TPIconButton(
  {
    icon,
    theme = "neutral",
    size = "md",
    disabled = false,
    loading = false,
    surface = "light",
    className = "",
    ...props
  },
  ref)
  {
    const tokens = getButtonTokens(theme, surface);
    const dims = BUTTON_SIZE_TOKENS[size];
    const isDisabled = disabled || loading;

    const bg = isDisabled ? tokens.disabledBg : tokens.bg;
    const color = isDisabled ? "#545460" : tokens.text;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={`inline-flex flex-shrink-0 items-center justify-center rounded-[10px] transition-all duration-150 active:opacity-90 hover:opacity-95 ${className}`}
        style={{
          width: dims.height,
          height: dims.height,
          backgroundColor: bg,
          color,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.7 : 1
        }}
        {...props}>
        
        {loading ?
        <TPButtonIcon size={dims.iconSize}>
            <span
            className="animate-spin rounded-full"
            style={{
              width: dims.iconSize,
              height: dims.iconSize,
              border: `2px solid ${color}`,
              borderTopColor: "transparent"
            }}
            aria-hidden />
          
          </TPButtonIcon> :

        <TPButtonIcon size={dims.iconSize}>{icon}</TPButtonIcon>
        }
      </button>);

  }
);