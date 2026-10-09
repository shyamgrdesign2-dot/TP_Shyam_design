/**
 * planFormHelpers.js — Pure helper functions for AddEditPlanDrawer.
 * No React, no axios, no Redux — safe to import anywhere.
 */
import { genId } from "../plan-types";
import { getDefaultPlanSurfaces } from "../plan-types";
import { getRate } from "../treatments";
import { findDentalBillItemByName } from "../../lib/billing-catalog";
import { fdiToLabel } from "../exam-suggestions";

/**
 * Create a new service row for the plan form.
 *
 * @param {string} treatment - Treatment/procedure name
 * @param {Array<string|number>} teeth - Array of tooth FDI codes
 * @param {string[]} surfaces - Array of surface identifiers
 * @param {object[]} billingItems - Full billing catalog items
 * @param {object|null} billItemFromCatalog - Pre-resolved catalog item (optional)
 * @returns {object} New row object
 */
export function createRow(
  treatment,
  teeth = [],
  surfaces = [],
  billingItems,
  billItemFromCatalog = null
) {
  const billItem =
    billItemFromCatalog ?? findDentalBillItemByName(billingItems, treatment);
  const rate = billItem ? billItem.price : getRate(treatment);
  let discount = 0;
  if (billItem && billItem.discount > 0) {
    if (billItem.discountUnit === "percent")
      discount = Math.min(rate, Math.round((rate * billItem.discount) / 100));
    else discount = Math.min(rate, billItem.discount);
  }
  return {
    id: genId("row"),
    treatment,
    teeth,
    surfaces:
      surfaces.length > 0 ? surfaces : getDefaultPlanSurfaces(treatment),
    rate,
    discount,
    discountType: "flat",
    procedureDate: "",
    notes: "",
  };
}

/**
 * Compute the effective discount amount for a row.
 * For "percent" type: derives flat amount from baseRate × pct / 100.
 * For "flat" type: uses value directly, capped at baseRate.
 *
 * @param {{ rate: number, discount: number, discountType?: string }} row
 * @param {number} [totalRate] - Optional pre-computed total rate for the row (rate * teeth)
 * @returns {number}
 */
export function computeDiscount(row, totalRate) {
  const raw = Number(row.discount);
  const d = Number.isFinite(raw) && raw > 0 ? raw : 0;
  const baseRate = totalRate !== undefined ? totalRate : row.rate;
  if (row.discountType === "percentage") {
    return Math.round((baseRate * Math.min(d, 100)) / 100);
  }
  return Math.min(baseRate, d);
}

/**
 * Fan-out rows into individual per-tooth service objects ready for the plan.
 *
 * @param {object[]} rows - Service rows from the form
 * @param {string|null} editPlanId - Existing plan ID when editing, or null when creating
 * @returns {object[]} Flat list of service objects
 */
export function fanOutServices(rows, editPlanId) {
  const planId = editPlanId ?? genId("plan");
  return rows
    .filter((row) => row.treatment)
    .map((row) => {
      const teethCount = Math.max(1, row.teeth.length);
      const totalRate = row.rate * teethCount;
      const discAmt = computeDiscount(row, totalRate);
      return {
        id: genId("svc"),
        planId,
        treatment: row.treatment,
        teeth: row.teeth.length > 0 ? row.teeth : ["full-mouth"],
        surfaces: [...row.surfaces],
        rate: row.rate,
        discount: row.discount,
        discountType: row.discountType || "flat",
        amount: Math.max(0, totalRate - discAmt),
        status: "planned",
        sittings: [],
        procedures: [],
        procedureDate: row.procedureDate?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
      };
    });
}

/**
 * Convert form rows to a template payload (strips ephemeral row ids).
 *
 * @param {object[]} rows
 * @returns {{ services: object[] }}
 */
export function rowsToTemplatePayload(rows, additionalDiscount = 0, notes = "") {
  return {
    additionalDiscount,
    notes,
    services: rows
      .filter((r) => r.treatment)
      .map(({ treatment, teeth, surfaces, rate, discount, discountType, procedureDate, notes }) => ({
        treatment,
        teeth,
        surfaces,
        rate,
        discount,
        discountType: discountType || "flat",
        procedureDate: procedureDate || undefined,
        notes: notes || undefined,
      })),
  };
}

/**
 * Convert form rows to a flat service template payload (single service).
 *
 * @param {object[]} rows
 * @returns {object} Flat service payload
 */
export function rowsToServiceTemplatePayload(rows) {
  const row = rows.find((r) => r.treatment) || {};
  return {
    treatment: row.treatment,
    teeth: row.teeth || [],
    surfaces: row.surfaces || [],
    rate: row.rate || 0,
    discount: row.discount || 0,
    discountType: row.discountType || "flat",
    notes: row.notes || "",
  };
}

/**
 * Convert template payload services back to form rows, merging with existing rows.
 * Appends new treatments; for existing ones, merges teeth arrays.
 *
 * @param {{ services?: object[] }} payload
 * @param {object[]} existingRows
 * @returns {object[]}
 */
export function mergeTemplateRows(payload, existingRows) {
  let services = payload?.services;
  const singleService = payload?.service || (payload?.treatment ? payload : null);
  if (!services && singleService?.treatment) {
    const teeth = singleService.teeth?.length > 0 
      ? singleService.teeth 
      : (singleService.tooth_fdi ? String(singleService.tooth_fdi).split(",") : ["full-mouth"]);
    services = [{
      treatment: singleService.treatment,
      teeth: teeth,
      surfaces: singleService.surfaces || ["whole"],
      rate: singleService.rate,
      discount: singleService.discount,
      discountType: singleService.discountType || "flat",
      notes: singleService.notes
    }];
  } else {
    services = services ?? [];
  }
  const next = [...existingRows];
  for (const svc of services) {
    const teeth = Array.isArray(svc.teeth) && svc.teeth.length > 0 
      ? svc.teeth.map(String) 
      : ["full-mouth"];
    
    next.push({
      id: genId("row"),
      treatment: svc.treatment,
      teeth,
      surfaces: svc.surfaces?.length > 0 ? svc.surfaces : ["whole"],
      rate: svc.rate ?? 0,
      discount: svc.discount ?? 0,
      discountType: svc.discountType || "flat",
      procedureDate: svc.procedureDate || "",
      notes: svc.notes || "",
    });
  }
  return next;
}

/**
 * Compute the total amount across all rows (rate minus discount, times teeth count).
 *
 * @param {object[]} rows
 * @returns {number}
 */
export function computeTotalAmount(rows) {
  return rows.reduce((sum, r) => {
    const teethCount = Math.max(1, r.teeth.length);
    const totalRate = r.rate * teethCount;
    const discAmt = computeDiscount(r, totalRate);
    return sum + Math.max(0, totalRate - discAmt);
  }, 0);
}
