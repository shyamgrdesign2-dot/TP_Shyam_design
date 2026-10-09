import { forwardRef, useState } from "react";
import {
  getButtonTokens,
  getButtonStyle,
  BUTTON_SIZE_TOKENS,
} from "../../lib/button-system/tokens";
import { TPButtonIcon } from "./TPButtonIcon";
import styles from "./TPButton.module.scss";

export const TPButton = forwardRef(function TPButton(
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
  ref
) {
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);

  const tokens = getButtonTokens(theme, surface);
  const dims = BUTTON_SIZE_TOKENS[size];
  const isDisabled = disabled || loading;

  const state = isDisabled ? "disabled" : focused ? "focused" : hover ? "hover" : "default";

  const baseStyle = getButtonStyle(variant, theme, surface, state, tokens, dims);

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      className={`${styles.root} ${className}`}
      style={{
        ...baseStyle,
        gap: dims.iconTextGap,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    >
      {loading ? (
        <TPButtonIcon size={dims.iconSize}>
          <span
            className={styles.spinner}
            style={{
              width: dims.iconSize,
              height: dims.iconSize,
            }}
            aria-hidden={true}
          />
        </TPButtonIcon>
      ) : (
        <>
          {leftIcon && (
            <TPButtonIcon size={dims.iconSize}>{leftIcon}</TPButtonIcon>
          )}

          <span className="truncate">{children}</span>
          {rightIcon && (
            <TPButtonIcon size={dims.iconSize}>{rightIcon}</TPButtonIcon>
          )}
        </>
      )}
    </button>
  );
});