/**
 * RxPad table utility functions.
 *
 * Pure functions + one hook extracted from RxPadFunctional.tsx during Phase 8.
 */

import { useEffect, useState } from "react";
import { CUSTOM_OPTION_PREFIX, DRUG_ALLERGY_MAP } from "./rxpad-table-types";

/* ── Row helpers ── */

export function getRowId(prefix) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeText(value) {
  return value.trim().toLowerCase();
}

export function rowHasValues(row) {
  return Object.entries(row).some(([key, value]) => key !== "id" && value.trim().length > 0);
}

export function getColumnMinWidth(column) {
  return column.minWidth ?? column.width;
}

export function hasFilledPrimaryValue(rows, primaryKey) {
  return rows.some((r) => r[primaryKey]?.trim().length > 0);
}

/* ── DOM helpers ── */

export function getScrollParent(node) {
  if (!node) return null;
  let current = node.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const scrollable = /(auto|scroll)/.test(style.overflowY);
    if (scrollable && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function snapFieldToViewportTop(element, offset = 96) {
  if (typeof window === "undefined") return;
  const scrollParent = getScrollParent(element);
  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const fieldRect = element.getBoundingClientRect();
    const delta = fieldRect.top - parentRect.top - offset;
    scrollParent.scrollTo({
      top: Math.max(0, scrollParent.scrollTop + delta),
      behavior: "smooth"
    });
    return;
  }
  const targetTop = window.scrollY + element.getBoundingClientRect().top - offset;
  window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

/* ── Number/string helpers ── */

export function firstPositiveInteger(value) {
  const match = value.match(/\d+/);
  if (!match) return 1;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function pluralize(base, count) {
  return `${count} ${base}${count > 1 ? "s" : ""}`;
}

/* ── Option generators ── */

export function getSinceOptions(query) {
  const n = firstPositiveInteger(query);
  return [
  pluralize("hour", n),
  pluralize("day", n),
  pluralize("month", n),
  pluralize("year", n)];

}

export function getMedicationUnitOptions(query) {
  const n = firstPositiveInteger(query);
  return [
  pluralize("tablet", n),
  pluralize("unit", n),
  pluralize("capsule", n)];

}

export function getFrequencyOptions(query) {
  const n = firstPositiveInteger(query);
  const options = [
  `${n}-0-${n}`,
  `${n}-0-0-${n}`,
  `${n}-${n}-${n}`,
  `${n}-0-${Math.max(1, n - 1)}`,
  `${n}-1-${n}`,
  "1-0-1",
  "1-0-0-1",
  "0-1-0",
  "SOS"];

  return Array.from(new Set(options));
}

export function getDurationOptions(query) {
  const n = firstPositiveInteger(query);
  const options = [
  "Stat",
  "To Be Continued",
  "Only If Required",
  pluralize("day", n),
  pluralize("week", n),
  pluralize("month", n),
  pluralize("year", n)];

  return Array.from(new Set(options));
}

/* ── Catalog / custom option helpers ── */

export function getSeedQuery(query, fallback) {
  const next = query.trim();
  if (next.length > 0) return next;
  return fallback;
}

export function filterByQuery(options, query) {
  const needle = normalizeText(query);
  if (!needle) return options;
  const filtered = options.filter((option) => normalizeText(option).includes(needle));
  return filtered.length > 0 ? filtered : options;
}

export function toCustomOption(value) {
  return `${CUSTOM_OPTION_PREFIX}${value.trim()}`;
}

export function isCustomOption(value) {
  return value.startsWith(CUSTOM_OPTION_PREFIX);
}

export function getOptionValue(value) {
  return isCustomOption(value) ? value.slice(CUSTOM_OPTION_PREFIX.length) : value;
}

export function getOptionLabel(value) {
  return isCustomOption(value) ? `Add custom: ${getOptionValue(value)}` : value;
}

export function withCustomOption(options, query) {
  const trimmed = query.trim();
  if (!trimmed) return options;
  const customOption = toCustomOption(trimmed);
  const hasCustomAlready = options.some(
    (option) =>
    isCustomOption(option) &&
    normalizeText(getOptionValue(option)) === normalizeText(trimmed)
  );
  if (hasCustomAlready) return options;
  return [...options, customOption];
}

export function getCatalogOptions(catalog, query, limit = 10) {
  const needle = normalizeText(query);
  const filtered = needle ?
  catalog.filter((option) => normalizeText(option).includes(needle)) :
  catalog;
  return withCustomOption(filtered.slice(0, limit), query);
}

export function moveSelectedOptionToTop(options, selectedValue) {
  const selected = normalizeText(selectedValue);
  if (!selected) return options;
  const selectedIndex = options.findIndex(
    (option) => !isCustomOption(option) && normalizeText(getOptionValue(option)) === selected
  );
  if (selectedIndex <= 0) return options;
  const next = [...options];
  const [picked] = next.splice(selectedIndex, 1);
  next.unshift(picked);
  return next;
}

/* ── Medication alert helpers ── */

export function checkMedicationAlerts(
rows,
allergens,
primaryKey)
{
  if (!allergens.length) return [];
  const alerts = [];
  for (const row of rows) {
    const medName = (row[primaryKey] ?? "").toLowerCase();
    if (!medName) continue;
    for (const allergen of allergens) {
      const keywords = DRUG_ALLERGY_MAP[allergen.toLowerCase()];
      if (!keywords) continue;
      if (keywords.some((keyword) => medName.includes(keyword))) {
        alerts.push({ rowId: row.id, medName: row[primaryKey], allergen });
      }
    }
  }
  return alerts;
}

export function tokenizeKeywords(text) {
  return text.
  toLowerCase().
  split(/[\s,;.]+/).
  filter((token) => token.length >= 3);
}

export function bestMatchPercent(option, candidates) {
  if (!candidates.length) return 0;
  const optionTokens = tokenizeKeywords(option);
  if (!optionTokens.length) return 0;
  let best = 0;
  for (const candidate of candidates) {
    const candidateTokens = tokenizeKeywords(candidate);
    if (!candidateTokens.length) continue;
    const matchCount = optionTokens.filter((token) =>
    candidateTokens.some((ct) => ct.includes(token) || token.includes(ct))
    ).length;
    const percent = Math.round(matchCount / optionTokens.length * 100);
    if (percent > best) best = percent;
  }
  return best;
}

/* ── LocalStorage persistence for custom module rows ── */

export function loadCustomRows(patientId, moduleId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`tp.custom-module-rows:${patientId}:${moduleId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.
    filter((r) => !!r && typeof r === "object" && typeof r.id === "string").
    map((r) => ({ ...r }));
  } catch {
    return [];
  }
}

export function saveCustomRows(patientId, moduleId, rows) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `tp.custom-module-rows:${patientId}:${moduleId}`,
      JSON.stringify(rows)
    );
  } catch {

    /* quota — drop silently */}
  // Notify subscribers (e.g. RxPadFunctional snapshot publisher) that
  // custom-module rows changed so the Rx preview can recompose.
  try {
    window.dispatchEvent(
      new CustomEvent("rxpad:custom-rows-changed", {
        detail: { patientId, moduleId }
      })
    );
  } catch {}
}

/* ── Hooks ── */

export function useTabletMode() {
  const [tabletMode, setTabletMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const widthQuery = window.matchMedia("(max-width: 1180px)");
    const touchQuery = window.matchMedia("(hover: none), (pointer: coarse)");

    function check() {
      setTabletMode(widthQuery.matches || touchQuery.matches);
    }
    check();
    widthQuery.addEventListener("change", check);
    touchQuery.addEventListener("change", check);
    return () => {
      widthQuery.removeEventListener("change", check);
      touchQuery.removeEventListener("change", check);
    };
  }, []);

  return tabletMode;
}

/* ── Row builder ── */

export function buildDefaultRow(
moduleId,
columns,
primaryKey,
seedText = "")
{
  const row = { id: getRowId(moduleId) };
  for (const column of columns) {
    if (column.key === primaryKey && seedText.trim()) {
      row[column.key] = seedText.trim();
      continue;
    }
    row[column.key] = "";
  }
  return row;
}