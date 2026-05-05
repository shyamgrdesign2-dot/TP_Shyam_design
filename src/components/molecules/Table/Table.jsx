"use client";

/**
 * Table — Accessible data table molecule.
 * Pure HTML <table> with TP token styling. No external deps.
 */

export function Table({ children, className, style: styleProp }) {
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table
        className={className}
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
          color: "var(--tp-slate-700)",
          ...styleProp,
        }}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, ...props }) {
  return <thead {...props}>{children}</thead>;
}

export function TableBody({ children, ...props }) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableRow({ children, hover, selected, ...props }) {
  return (
    <tr
      style={{
        borderBottom: "1px solid var(--tp-slate-200)",
        backgroundColor: selected ? "var(--tp-blue-50)" : undefined,
        transition: "background-color 160ms ease",
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, align = "left", padding, component, ...props }) {
  const Tag = component === "th" ? "th" : "td";
  return (
    <Tag
      style={{
        padding: padding === "none" ? 0 : "10px 12px",
        textAlign: align,
        fontSize: 14,
        color: "var(--tp-slate-700)",
        verticalAlign: "middle",
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

Table.displayName = "Table";
