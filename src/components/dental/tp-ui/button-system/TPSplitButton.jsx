import { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  getButtonTokens,
  getSplitButtonSeparator,
  BUTTON_SIZE_TOKENS,
} from "../../lib/button-system/tokens";
import { TPButtonIcon } from "./TPButtonIcon";
import styles from "./TPSplitButton.module.scss";

/**
 * Split CTA — Material UI-style divider between primary action and dropdown.
 * Menu is rendered in a portal so it is never clipped by table/scroll containers.
 */
export const TPSplitButton = forwardRef(function TPSplitButton(
  {
    primaryAction,
    secondaryActions,
    variant = "solid",
    theme = "primary",
    size = "md",
    disabled = false,
    loading = false,
    surface = "light",
    open: controlledOpen,
    onOpenChange,
    className = "",
    trackClassName = "",
  },
  ref
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    minWidth: 0,
  });

  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (value) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updateMenuPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: rect.width,
      });
    };
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const tokens = getButtonTokens(theme, surface);
  const dims = BUTTON_SIZE_TOKENS[size];
  const isDisabled = disabled || loading;

  const bg = isDisabled ? tokens.disabledBg : tokens.bg;
  const textColor = isDisabled ? tokens.disabledText : tokens.text;
  const borderColor = isDisabled ? tokens.disabledBorder : tokens.border;

  const { color: separatorColor, opacity: separatorOpacity } =
    getSplitButtonSeparator(variant, theme, surface, borderColor);

  const buttonBg =
    variant === "solid"
      ? bg
      : variant === "tonal"
      ? theme === "primary"
        ? "#EEEEFF"
        : theme === "error"
        ? "#FFF1F2"
        : "#F1F1F5"
      : "transparent";

  const buttonText =
    variant === "ghost" && theme === "neutral"
      ? "#454551"
      : variant === "ghost"
      ? tokens.border
      : variant === "tonal" && theme === "neutral"
      ? "#454551"
      : variant === "tonal"
      ? tokens.border
      : variant === "outline" && theme === "neutral"
      ? "#454551"
      : variant === "outline"
      ? tokens.border
      : textColor;

  const baseButtonStyle = {
    height: dims.height,
    fontSize: dims.fontSize,
    fontWeight: 600,
    fontFamily: "Inter, sans-serif",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
    opacity: isDisabled ? 0.7 : 1,
    color: buttonText,
    backgroundColor: buttonBg,
    border: "none",
  };

  const dropdownTriggerColor =
    loading && variant === "solid"
      ? "#FFFFFF"
      : loading && variant === "outline"
      ? "#454551"
      : buttonText;

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={`${styles.root} ${className}`}
    >
      <div
        className={`${styles.track} ${trackClassName}`}
        style={{
          border: variant === "outline" ? `1.5px solid ${borderColor}` : "none",
          backgroundColor:
            variant === "solid" || variant === "tonal"
              ? buttonBg
              : "transparent",
          boxShadow:
            variant === "solid"
              ? "0 1px 3px rgba(23,23,37,0.08)"
              : variant === "tonal"
              ? "0 1px 2px rgba(23,23,37,0.06)"
              : "none",
        }}
      >
        <button
          type="button"
          disabled={isDisabled}
          onClick={primaryAction.onClick}
          className={styles.primaryBtn}
          style={{
            ...baseButtonStyle,
            borderRadius: 0,
            borderRight: "none",
            minWidth: 0,
          }}
        >
          {loading ? (
            <TPButtonIcon size={dims.iconSize}>
              <span
                className={styles.spinner}
                style={{
                  width: dims.iconSize,
                  height: dims.iconSize,
                  border: `2px solid ${
                    variant === "solid" ? "#FFFFFF" : "#454551"
                  }`,
                  borderTopColor: "transparent",
                }}
                aria-hidden={true}
              />
            </TPButtonIcon>
          ) : (
            <>
              {primaryAction.icon && (
                <TPButtonIcon size={dims.iconSize}>
                  {primaryAction.icon}
                </TPButtonIcon>
              )}
              <span className="truncate">{primaryAction.label}</span>
            </>
          )}
        </button>

        <div
          className={styles.separator}
          style={{
            margin: `${Math.round(dims.height * 0.2)}px 1px`,
            height: Math.round(dims.height * 0.6),
            backgroundColor: separatorColor,
            opacity: separatorOpacity,
          }}
          aria-hidden={true}
        />

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More actions"
          className={styles.dropdownBtn}
          style={{
            ...baseButtonStyle,
            color: dropdownTriggerColor,
            borderRadius: 0,
            width: dims.height,
            minWidth: dims.height,
            borderLeft: "none",
          }}
        >
          <TPButtonIcon size={dims.iconSize}>
            <ChevronDown
              size={dims.iconSize}
              strokeWidth={1.5}
              className={`${styles.chevron} ${open ? styles.open : ""}`}
            />
          </TPButtonIcon>
        </button>
      </div>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
            }}
          >
            {secondaryActions.map((action, idx) => {
              if (action.separator) {
                return <div key={`sep-${idx}`} className={styles.menuSeparator} />;
              }
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  onClick={() => {
                    action.onClick?.();
                    setOpen(false);
                  }}
                  className={styles.optionBtn}
                >
                  {action.icon && (
                    <TPButtonIcon size={16}>{action.icon}</TPButtonIcon>
                  )}
                  <span className={styles.optionLabel}>{action.label}</span>
                  {action.shortcut ? (
                    <span className={styles.shortcut}>{action.shortcut}</span>
                  ) : (
                    <ChevronRight
                      size={14}
                      strokeWidth={1.5}
                      className={styles.nextIcon}
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
});