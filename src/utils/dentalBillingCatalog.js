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

export function buildInitialDentalBillingItems() {
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
    "ECG - resting",
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
    "RCT - anterior",
    "PFM crown",
    "Extraction - simple",
    "Composite restoration",
    "In-office bleaching",
    "Night guard",
    "Implant consult",
    "Bridge - per unit",
    "IOPA radiograph",
  ];

  const clinical = clinicalLabels.map((label, i) => ({
    id: `svc-${i + 1}`,
    name: `Clinical - ${label}`,
    type: "service",
    price: 280 + i * 72,
    priceUnit: "per_unit",
    discount: i % 4 === 0 ? 40 : 0,
    discountUnit: "inr",
    gstPct: i % 2 === 0 ? 5 : 0,
  }));

  const consumables = consumableLabels.map((label, i) => ({
    id: `cns-${i + 1}`,
    name: `Stock - ${label}`,
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
    20260415
  );
}
