/**
 * RxPad table types, constants, and option generators.
 *
 * Extracted from RxPadFunctional.tsx during Phase 8 decomposition.
 */

/* ── Types ── */





































































/* ── Constants ── */

export const MEDICATION_WHEN_OPTIONS = [
"Before Breakfast",
"After Breakfast",
"Before Lunch",
"After Lunch",
"Before Dinner",
"After Dinner",
"Before Food",
"After Food",
"With Food"];


export const ADVICE_SUGGESTIONS = [
"Stay hydrated daily",
"Take steam inhalation",
"Avoid oily foods",
"Complete medication course",
"Monitor blood pressure",
"Regular morning walk",
"Salt restricted diet",
"Follow sleep hygiene"];


export const LAB_INVESTIGATION_BASE_OPTIONS = [
"Complete Blood Count",
"Liver Function Test",
"Renal Function Test",
"Lipid Profile",
"Thyroid Profile",
"HbA1c",
"Fasting Blood Sugar",
"Urine Routine",
"Chest X-Ray",
"ECG"];


export const SURGERY_SUGGESTIONS = [
"Thoracic Relief Procedure",
"Pulmonary Enhancement Surgery",
"Abdominal Reconstruction Surgery",
"Urological Restoration Procedure",
"Articular Repair Surgery",
"Laparoscopic Appendectomy",
"Sinus Endoscopy",
"Tonsillectomy"];


export const CUSTOM_OPTION_PREFIX = "__custom__:";

export const DRUG_ALLERGY_MAP = {
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "aspirin", "mefenamic", "piroxicam", "ketoprofen"],
  sulfa: ["sulfamethoxazole", "sulfasalazine", "dapsone", "cotrimoxazole"],
  aspirin: ["aspirin", "ecosprin", "disprin"],
  penicillin: ["amoxicillin", "ampicillin", "cloxacillin", "penicillin", "augmentin", "piperacillin"]
};