"use client";

/**
 * Command — Keyboard-first command palette molecule wrapping cmdk.
 * Styling: TP tokens via inline CSS. No Tailwind.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    background: "white",
    borderRadius: 12,
    border: "1px solid var(--tp-slate-200)",
    overflow: "hidden",
    fontSize: 14,
    color: "var(--tp-slate-700)",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "1px solid var(--tp-slate-100)",
    gap: 8,
  },
  input: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    fontSize: 14,
    color: "var(--tp-slate-800)",
  },
  list: {
    maxHeight: 320,
    overflowY: "auto",
    padding: 4,
  },
  empty: {
    padding: "24px 16px",
    textAlign: "center",
    fontSize: 13,
    color: "var(--tp-slate-400)",
  },
  group: {
    padding: "4px 0",
  },
  groupHeading: {
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--tp-slate-400)",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    color: "var(--tp-slate-700)",
    outline: "none",
  },
  separator: {
    height: 1,
    margin: "4px 0",
    background: "var(--tp-slate-100)",
  },
};

export function Command({ style, ...props }) {
  return <CommandPrimitive style={{ ...s.root, ...style }} {...props} />;
}

export function CommandDialog({ children, ...props }) {
  return (
    <CommandPrimitive.Dialog
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
      }}
      {...props}
    >
      <div style={{ ...s.root, width: 480, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        {children}
      </div>
    </CommandPrimitive.Dialog>
  );
}

export function CommandInput({ style, ...props }) {
  return (
    <div style={s.inputWrap}>
      <CommandPrimitive.Input style={{ ...s.input, ...style }} {...props} />
    </div>
  );
}

export function CommandList({ style, ...props }) {
  return <CommandPrimitive.List style={{ ...s.list, ...style }} {...props} />;
}

export function CommandEmpty({ style, ...props }) {
  return <CommandPrimitive.Empty style={{ ...s.empty, ...style }} {...props} />;
}

export function CommandGroup({ heading, style, ...props }) {
  return (
    <CommandPrimitive.Group
      heading={heading ? <span style={s.groupHeading}>{heading}</span> : undefined}
      style={{ ...s.group, ...style }}
      {...props}
    />
  );
}

export function CommandItem({ style, ...props }) {
  return (
    <CommandPrimitive.Item
      style={s.item}
      data-slot="command-item"
      {...props}
    />
  );
}

export function CommandSeparator({ style, ...props }) {
  return <CommandPrimitive.Separator style={{ ...s.separator, ...style }} {...props} />;
}

export function CommandShortcut({ children, style }) {
  return (
    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tp-slate-400)", ...style }}>
      {children}
    </span>
  );
}
