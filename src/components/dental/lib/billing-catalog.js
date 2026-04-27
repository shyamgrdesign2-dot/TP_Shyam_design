export const BILLING_CATALOG_STORAGE_KEY = "tp.billing.catalog.v1";

function deterministicShuffle(items, seed) {
  const arr = [...items];
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildInitialBillingItems() {
  const clinicalLabels = [
    "OPD consultation",
    "Specialist review",
    "Counselling session",
    "Minor procedure assist",
    "Wound dressing",
    "Stitch removal",
    "Adult vaccination",
    "IM injection",
    "Nebulisation",
    "ECG — resting",
  ];

  const consumableLabels = [
    "Sterile gloves (box)",
    "Syringe 5 ml (pack)",
    "Cotton roll bundle",
    "Crepe bandage 5 cm",
    "Antiseptic 100 ml",
    "Surgical mask (box)",
    "IV infusion set",
    "Micropore tape",
    "Gauze pads (pack)",
    "Absorbable suture",
  ];

  const dentalTemplates = [
    "Scaling & polishing",
    "RCT — anterior",
    "PFM crown",
    "Extraction — simple",
    "Composite restoration",
    "In-office bleaching",
    "Night guard",
    "Implant consult",
    "Bridge — per unit",
    "IOPA radiograph",
  ];

  const clinical = clinicalLabels.map((label, i) => ({
    id: `svc-${i + 1}`,
    name: `Clinical — ${label}`,
    type: "service",
    price: 280 + i * 72,
    priceUnit: "per_unit",
    discount: i % 4 === 0 ? 40 : 0,
    discountUnit: "inr",
    gstPct: i % 2 === 0 ? 5 : 0,
  }));

  const consumables = consumableLabels.map((label, i) => ({
    id: `cns-${i + 1}`,
    name: `Stock — ${label}`,
    type: "consumable",
    price: 55 + i * 15,
    priceUnit: "per_unit",
    discount: 0,
    discountUnit: "inr",
    gstPct: 5,
  }));

  const dental = [];
  for (let i = 0; i < 40; i++) {
    const tmpl = dentalTemplates[i % dentalTemplates.length];
    dental.push({
      id: `dent-${i + 1}`,
      name: tmpl,
      type: "dental",
      price: 920 + i * 35,
      priceUnit: "per_unit",
      discount: i % 5 === 0 ? 8 : 0,
      discountUnit: i % 5 === 0 ? "percent" : "inr",
      gstPct: 5,
    });
  }

  return deterministicShuffle(
    [...clinical, ...consumables, ...dental],
    20260415,
  );
}

export function getDentalServiceItems(items) {
  return items.filter((i) => i.type === "dental");
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
