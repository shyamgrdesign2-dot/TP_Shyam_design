"use client";

import { forwardRef, useState } from "react";
import {
  getButtonTokens,
  BUTTON_SIZE_TOKENS } from
"./tokens";







import { TPButtonIcon } from "./TPButtonIcon";

// MUI-style token naming: color.primary, variant.contained


export const TPButton = forwardRef(
  function TPButton(
  {
    variant = "solid",
    theme = "primary",
    size = "md",
    disabled = false,
    loading = false,
    surface = "light",
    leftIcon,
    rightIcon,
    children,
    className = "",
    ...props
  },
  ref)
  {
    const [hover, setHover] = useState(false);
    const [focused, setFocused] = useState(false);
    const tokens = getButtonTokens(theme, surface);
    const dims = BUTTON_SIZE_TOKENS[size];
    const isDisabled = disabled || loading;

    const state = isDisabled ?
    "disabled" :
    focused ?
    "focused" :
    hover ?
    "hover" :
    "default";

    const bg =
    state === "disabled" ?
    tokens.disabledBg :
    state === "hover" ?
    tokens.hover :
    tokens.bg;
    const textColor =
    state === "disabled" ? tokens.disabledText : tokens.text;
    const borderColor =
    state === "disabled" ? tokens.disabledBorder : tokens.border;

    // Variant-specific overrides
    let finalBg = bg;
    let finalBorder = "none";
    let finalText = textColor;
    let finalBackdropFilter;

    if (variant === "outline") {
      if (surface === "dark") {
        finalBg =
        state === "disabled" ?
        "rgba(255,255,255,0.08)" :
        state === "hover" ?
        "rgba(255,255,255,0.14)" :
        "rgba(255,255,255,0.07)";
        finalBorder = `1.5px solid ${state === "disabled" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.34)"}`;
        finalText = state === "disabled" ? "rgba(255,255,255,0.45)" : "#FFFFFF";
        finalBackdropFilter = "blur(8px)";
      } else {
        finalBg =
        state === "disabled" ?
        "transparent" :
        state === "hover" ?
        theme === "primary" ?
        "#EEEEFF" :
        theme === "error" ?
        "#FFF1F2" :
        "#FAFAFB" :
        "transparent";
        finalBorder = `1.5px solid ${borderColor}`;
        finalText =
        state === "disabled" ?
        tokens.disabledText :
        theme === "neutral" ?
        tokens.text :
        tokens.border;
      }
    } else if (variant === "ghost") {
      finalBg =
      state === "disabled" ?
      "transparent" :
      state === "hover" ?
      theme === "primary" ?
      "#EEEEFF" :
      theme === "error" ?
      "#FFF1F2" :
      "#F1F1F5" :
      "transparent";
      finalBorder = "none";
      finalText =
      state === "disabled" ?
      tokens.disabledText :
      theme === "neutral" ?
      "#454551" :
      tokens.border;
    } else if (variant === "tonal") {
      finalBg =
      state === "disabled" ?
      tokens.disabledBg :
      theme === "primary" ?
      "#EEEEFF" :
      theme === "error" ?
      "#FFF1F2" :
      "#F1F1F5";
      finalBorder = "none";
      finalText =
      state === "disabled" ?
      tokens.disabledText :
      theme === "neutral" ?
      "#454551" :
      tokens.border;
    } else if (variant === "link") {
      finalBg = "transparent";
      finalBorder = "none";
      finalText =
      state === "disabled" ?
      tokens.disabledText :
      theme === "neutral" ?
      "#454551" :
      tokens.border;
    }

    const baseStyle = {
      height: variant === "link" ? "auto" : `${dims.height}px`,
      paddingLeft: variant === "link" ? 0 : dims.paddingX,
      paddingRight: variant === "link" ? 0 : dims.paddingX,
      borderRadius: variant === "link" ? 0 : 10,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "Inter, sans-serif",
      cursor: isDisabled ? "not-allowed" : "pointer",
      transition: "all 150ms ease",
      opacity: isDisabled ? 0.7 : 1,
      backgroundColor: finalBg,
      color: finalText,
      border: finalBorder,
      boxShadow:
      state === "focused" ? `0 0 0 3px ${tokens.focusRing}` : undefined,
      backdropFilter: finalBackdropFilter,
      textDecoration: variant === "link" ? "underline" : "none",
      textUnderlineOffset: variant === "link" ? 4 : undefined
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={`inline-flex items-center justify-center ${className}`}
        style={{ ...baseStyle, gap: dims.iconTextGap }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}>
        
        {loading ?
        <TPButtonIcon size={dims.iconSize}>
            <span
            className="animate-spin rounded-full border-2 border-current border-transparent"
            style={{ width: dims.iconSize, height: dims.iconSize }}
            aria-hidden />
          
          </TPButtonIcon> :

        <>
            {leftIcon &&
          <TPButtonIcon size={dims.iconSize}>{leftIcon}</TPButtonIcon>
          }
            <span className="truncate">{children}</span>
            {rightIcon &&
          <TPButtonIcon size={dims.iconSize}>{rightIcon}</TPButtonIcon>
          }
          </>
        }
      </button>);

  }
);