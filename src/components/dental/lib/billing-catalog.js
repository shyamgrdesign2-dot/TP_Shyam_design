export const BILLING_CATALOG_STORAGE_KEY = "tp.billing.catalog.v1";

export function getDentalServiceItems(items) {
  return items.filter((i) => i.type === "dental");
}

/** Map billing API bill item → local dental catalog shape after ServiceItemPopup save. */
export function mapApiBillItemToDentalCatalog(apiItem) {
  if (!apiItem?.name) return null;
  const price = Number(apiItem.price ?? apiItem.amount) || 0;
  const discountType =
    apiItem.discountType === "percentage" ? "percent" : "inr";
  return {
    id: String(apiItem.id ?? apiItem.masterId ?? `dent-api-${Date.now()}`),
    name: String(apiItem.name).trim(),
    type: "dental",
    price,
    priceUnit: "per_unit",
    discount: Number(apiItem.discount) || 0,
    discountUnit: discountType,
    gstPct: Number(apiItem.gst) || 0,
  };
}

/** First occurrence wins; stable; trims names for dedupe key. */
export function getUniqueDentalBillItems(items) {
  const seen = new Set();
  const out = [];
  for (const i of items) {
    if (i.type !== "dental") continue;
    const k = i.name.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

/**
 * Sort for search dropdowns: exact → prefix → word-boundary substring → other substring;
 * then earlier match index, then locale name order. Empty query = A–Z by name.
 */
export function sortStringsForTypeahead(list, queryRaw) {
  const q = queryRaw.trim().toLowerCase();
  const arr = [...list];
  if (!q) {
    arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return arr;
  }
  const rank = (s) => {
    const sl = s.toLowerCase();
    if (sl === q) return [0, 0];
    if (sl.startsWith(q)) return [1, 0];
    const idx = sl.indexOf(q);
    if (idx < 0) return [999, 999];
    const wb = idx === 0 || /[\s/(-]/.test(sl[idx - 1] ?? "");
    return [wb ? 2 : 3, idx];
  };
  arr.sort((a, b) => {
    const [ra, ia] = rank(a);
    const [rb, ib] = rank(b);
    if (ra !== rb) return ra - rb;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
  return arr;
}

export function sortDentalBillItemsForSearch(items, queryRaw) {
  const q = queryRaw.trim().toLowerCase();
  const arr = [...items];
  if (!q) {
    arr.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return arr;
  }
  const rank = (name) => {
    const sl = name.toLowerCase();
    if (sl === q) return [0, 0];
    if (sl.startsWith(q)) return [1, 0];
    const idx = sl.indexOf(q);
    if (idx < 0) return [999, 999];
    const wb = idx === 0 || /[\s/(-]/.test(sl[idx - 1] ?? "");
    return [wb ? 2 : 3, idx];
  };
  arr.sort((a, b) => {
    const [ra, ia] = rank(a.name);
    const [rb, ib] = rank(b.name);
    if (ra !== rb) return ra - rb;
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return arr;
}

export function findDentalBillItemByName(items, name) {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return getDentalServiceItems(items).find((i) => i.name.toLowerCase() === q);
}

export function formatBillingInr(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function billingDiscountAmount(price, discount, unit) {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  if (unit === "percent") return Math.min(p, p * (d / 100));
  return Math.min(p, d);
}

/** Payable total for one line — discount applied first, then GST on remainder (floored), same as billing settings grid. */
export function computeBillingLineTotal(price, discount, gstPct, discountUnit) {
  const unit = Number(price) || 0;
  const g = Number(gstPct) || 0;
  const afterDisc = Math.max(
    0,
    unit - billingDiscountAmount(unit, discount, discountUnit),
  );
  return Math.floor(afterDisc * (1 + g / 100));
}
