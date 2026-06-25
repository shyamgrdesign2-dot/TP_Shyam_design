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
 * Compute the effective discount amount for a row, capped at the row rate.
 *
 * @param {{ rate: number, discount: number }} row
 * @returns {number}
 */
export function computeDiscount(row) {
  const raw = Number(row.discount);
  const d = Number.isFinite(raw) && raw > 0 ? raw : 0;
  return Math.min(row.rate, d);
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
      const discAmt = computeDiscount(row);
      return {
        id: genId("svc"),
        planId,
        treatment: row.treatment,
        teeth: row.teeth.length > 0 ? row.teeth : ["full-mouth"],
        surfaces: [...row.surfaces],
        rate: row.rate,
        discount: discAmt,
        amount: Math.max(0, row.rate - discAmt),
        status: "planned",
        sittings: [],
        procedures: [],
        procedureDate: row.procedureDate?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
      };
    });
}

/**
 * Compute the total amount across all rows (rate minus discount, times teeth count).
 *
 * @param {object[]} rows
 * @returns {number}
 */
export function computeTotalAmount(rows) {
  return rows.reduce((sum, r) => {
    const teeth = r.teeth.length || 1;
    const discAmt = computeDiscount(r);
    return sum + Math.max(0, r.rate - discAmt) * teeth;
  }, 0);
}
