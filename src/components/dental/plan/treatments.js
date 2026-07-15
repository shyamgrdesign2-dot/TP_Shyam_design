/**
 * Treatment catalog + default rates (per tooth) based on the PRD.
 * Rates in ₹.
 */

export const TREATMENT_CATALOG = [
  // Endodontics
  { name: "Root Canal Treatment", defaultRate: 8000, category: "Endodontics" },
  { name: "Pulp Capping", defaultRate: 1500, category: "Endodontics" },
  { name: "Apicoectomy", defaultRate: 5000, category: "Endodontics" },

  // General
  { name: "Scaling & Polishing", defaultRate: 1500, category: "General" },
  { name: "Teeth Whitening", defaultRate: 8000, category: "General" },
  { name: "Fluoride Application", defaultRate: 1200, category: "General" },
  { name: "Cavity Filling (GIC)", defaultRate: 1500, category: "General" },
  {
    name: "Restoration (Composite Filling)",
    defaultRate: 2000,
    category: "General",
  },
  { name: "Restoration (Amalgam)", defaultRate: 1800, category: "General" },

  // Prosthodontics
  { name: "Crown (PFM)", defaultRate: 6000, category: "Prosthodontics" },
  { name: "Crown (Zirconia)", defaultRate: 12000, category: "Prosthodontics" },
  {
    name: "Crown (All-Ceramic)",
    defaultRate: 10000,
    category: "Prosthodontics",
  },
  { name: "Bridge (per unit)", defaultRate: 6000, category: "Prosthodontics" },
  { name: "Complete Denture", defaultRate: 15000, category: "Prosthodontics" },
  { name: "Partial Denture", defaultRate: 8000, category: "Prosthodontics" },
  { name: "Veneers", defaultRate: 9000, category: "Prosthodontics" },

  // Oral Surgery
  { name: "Extraction", defaultRate: 1500, category: "Oral Surgery" },
  { name: "Surgical Extraction", defaultRate: 3500, category: "Oral Surgery" },
  { name: "Wisdom Tooth Removal", defaultRate: 5000, category: "Oral Surgery" },
  { name: "Implant (Single)", defaultRate: 25000, category: "Oral Surgery" },
  { name: "Implant Crown", defaultRate: 9000, category: "Oral Surgery" },
  { name: "Bone Grafting", defaultRate: 12000, category: "Oral Surgery" },

  // Periodontics
  {
    name: "Deep Cleaning (per quadrant)",
    defaultRate: 2500,
    category: "Periodontics",
  },
  { name: "Flap Surgery", defaultRate: 8000, category: "Periodontics" },
  { name: "Gingival Grafting", defaultRate: 10000, category: "Periodontics" },

  // Orthodontics
  { name: "Metal Braces", defaultRate: 25000, category: "Orthodontics" },
  { name: "Ceramic Braces", defaultRate: 45000, category: "Orthodontics" },
  { name: "Clear Aligners", defaultRate: 80000, category: "Orthodontics" },
  { name: "Retainer", defaultRate: 3000, category: "Orthodontics" },
];

export const TREATMENT_NAMES = TREATMENT_CATALOG.map((t) => t.name);

export function getRate(treatmentName) {
  const found = TREATMENT_CATALOG.find((t) => t.name === treatmentName);
  return found?.defaultRate ?? 0;
}
