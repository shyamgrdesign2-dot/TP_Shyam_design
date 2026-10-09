// Shared value formatters. Money is pre-rounded server-side (contract rule) —
// we only present it, never re-round.
export const formatINR = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
export const formatNum = (v) => Number(v || 0).toLocaleString("en-IN");
export const formatPct = (v) => `${Number(v || 0).toFixed(1)}%`;
