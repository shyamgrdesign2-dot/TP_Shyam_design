/**
 * plan-mock-data.ts — Realistic demo data for treatment plans.
 *
 * apt-1 (Shyam GR): 3 plans covering draft, in-progress, completed
 * apt-6 (if needed): 1 plan
 */

// ─── apt-1: Shyam GR ───────────────────────────────────────

const PRIMARY_CARE_PLAN = {
  id: "plan-001",
  name: "Primary Care Plan",
  patientId: "apt-1",
  createdAt: "2026-03-15",
  updatedAt: "2026-04-03",
  status: "in-progress",
  notes: "Priority treatment — patient reports sensitivity and pain.",
  services: [
    {
      id: "svc-001",
      planId: "plan-001",
      treatment: "Root Canal Treatment",
      toothFdi: "36",
      toothLabel: "Lower Left First Molar",
      surfaces: ["occlusal", "root"],
      rate: 8000,
      discount: 0,
      amount: 8000,
      status: "in-progress",
      startedAt: "2026-04-03",
      sittings: [
        {
          id: "sit-001",
          date: "3 Apr 2026",
          doctor: "Dr. Sheela B R",
          notes: "Initial debridement, access opening, BMP placed",
        },
        {
          id: "sit-002",
          date: "10 Apr 2026",
          doctor: "Dr. Sheela B R",
          notes: "Canal shaping + obturation completed",
        },
        {
          id: "sit-cancel-demo",
          date: "1 Apr 2026, 2:00 PM",
          doctor: "Dr. Riya Kapoor",
          visitType: "Review",
          status: "cancelled",
          notes: "Patient rescheduled — no treatment performed.",
          createdAt: "2026-04-01T14:00:00.000Z",
        },
      ],

      procedures: [
        {
          id: "proc-001",
          name: "Access opening",
          date: "3 Apr 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-002",
          name: "BMP placement",
          date: "3 Apr 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-003",
          name: "Obturation",
          date: "10 Apr 2026",
          doctor: "Dr. Sheela B R",
          status: "in-progress",
        },
      ],
    },
    {
      id: "svc-002",
      planId: "plan-001",
      treatment: "Restoration (Composite Filling)",
      toothFdi: "16",
      toothLabel: "Upper Right First Molar",
      surfaces: ["buccal", "occlusal"],
      rate: 2000,
      discount: 0,
      amount: 2000,
      status: "planned",
      sittings: [
        {
          id: "sit-upcoming-demo",
          date: "24 Apr 2026, 10:30 AM",
          doctor: "Dr. Sheela B R",
          visitType: "Follow-up",
          status: "scheduled",
          createdAt: "2026-04-24T05:00:00.000Z",
        },
      ],

      procedures: [],
    },
    {
      id: "svc-003",
      planId: "plan-001",
      treatment: "Scaling & Polishing",
      toothFdi: "full-mouth",
      toothLabel: "Full Mouth",
      surfaces: [],
      rate: 1500,
      discount: 0,
      amount: 1500,
      status: "planned",
      sittings: [],
      procedures: [],
    },
  ],
};

const WISDOM_TOOTH_PLAN = {
  id: "plan-002",
  name: "Wisdom Tooth Removal",
  patientId: "apt-1",
  createdAt: "2026-04-05",
  updatedAt: "2026-04-05",
  status: "draft",
  notes: "All four wisdom teeth — patient wants elective removal.",
  services: [
    {
      id: "svc-004",
      planId: "plan-002",
      treatment: "Wisdom Tooth Removal",
      toothFdi: "18",
      toothLabel: "Upper Right Third Molar",
      surfaces: [],
      rate: 5000,
      discount: 0,
      amount: 5000,
      status: "planned",
      sittings: [],
      procedures: [],
    },
    {
      id: "svc-005",
      planId: "plan-002",
      treatment: "Wisdom Tooth Removal",
      toothFdi: "28",
      toothLabel: "Upper Left Third Molar",
      surfaces: [],
      rate: 5000,
      discount: 0,
      amount: 5000,
      status: "planned",
      sittings: [],
      procedures: [],
    },
    {
      id: "svc-006",
      planId: "plan-002",
      treatment: "Wisdom Tooth Removal",
      toothFdi: "38",
      toothLabel: "Lower Left Third Molar",
      surfaces: [],
      rate: 5000,
      discount: 0,
      amount: 5000,
      status: "planned",
      sittings: [],
      procedures: [],
    },
    {
      id: "svc-007",
      planId: "plan-002",
      treatment: "Wisdom Tooth Removal",
      toothFdi: "48",
      toothLabel: "Lower Right Third Molar",
      surfaces: [],
      rate: 5000,
      discount: 0,
      amount: 5000,
      status: "planned",
      sittings: [],
      procedures: [],
    },
  ],
};

const CROWN_REPLACEMENT_PLAN = {
  id: "plan-003",
  name: "Crown Replacement",
  patientId: "apt-1",
  createdAt: "2026-02-10",
  updatedAt: "2026-03-20",
  status: "completed",
  services: [
    {
      id: "svc-008",
      planId: "plan-003",
      treatment: "Crown (PFM)",
      toothFdi: "26",
      toothLabel: "Upper Left First Molar",
      surfaces: ["occlusal", "buccal"],
      rate: 6000,
      discount: 500,
      amount: 5500,
      status: "completed",
      startedAt: "2026-02-15",
      completedAt: "2026-03-20",
      sittings: [
        {
          id: "sit-003",
          date: "15 Feb 2026",
          doctor: "Dr. Sheela B R",
          notes: "Tooth preparation, impression taken",
        },
        {
          id: "sit-004",
          date: "20 Mar 2026",
          doctor: "Dr. Sheela B R",
          notes: "PFM crown cemented, occlusion checked",
        },
      ],

      procedures: [
        {
          id: "proc-004",
          name: "Tooth preparation",
          date: "15 Feb 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-005",
          name: "Impression & temporary crown",
          date: "15 Feb 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-006",
          name: "PFM crown cementation",
          date: "20 Mar 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
      ],
    },
  ],
};

// ─── apt-6: Anjali Patel — active / scheduled plans (demo) ─────────────────

const ANJALI_ESTIMATE_PLAN_1 = {
  id: "plan-anjali-001",
  name: "Smile Rehabilitation Plan",
  patientId: "apt-6",
  createdAt: "2026-04-08",
  updatedAt: "2026-04-10",
  status: "draft",
  notes: "Prioritize aesthetic + sensitivity concerns for upper anteriors.",
  services: [
    {
      id: "svc-new-001",
      planId: "plan-anjali-001",
      treatment: "Veneers",
      toothFdi: "11",
      toothLabel: "Upper Right Central Incisor",
      surfaces: ["buccal", "mesial"],
      rate: 7500,
      discount: 500,
      amount: 7000,
      status: "planned",
      sittings: [],
      procedures: [],
    },
    {
      id: "svc-new-002",
      planId: "plan-anjali-001",
      treatment: "Veneers",
      toothFdi: "21",
      toothLabel: "Upper Left Central Incisor",
      surfaces: ["buccal", "distal"],
      rate: 7500,
      discount: 500,
      amount: 7000,
      status: "planned",
      sittings: [],
      procedures: [],
    },
    {
      id: "svc-new-003",
      planId: "plan-anjali-001",
      treatment: "Scaling & Polishing",
      toothFdi: "full-mouth",
      toothLabel: "Full Mouth",
      surfaces: [],
      rate: 1800,
      discount: 0,
      amount: 1800,
      status: "planned",
      sittings: [],
      procedures: [],
    },
  ],
};

const ANJALI_ESTIMATE_PLAN_2 = {
  id: "plan-anjali-002",
  name: "Quadrant Stabilization",
  patientId: "apt-6",
  createdAt: "2026-04-06",
  updatedAt: "2026-04-11",
  status: "active",
  notes: "Address caries/restorations in lower left quadrant first.",
  services: [
    {
      id: "svc-new-004",
      planId: "plan-anjali-002",
      treatment: "Restoration (Composite Filling)",
      toothFdi: "36",
      toothLabel: "Lower Left First Molar",
      surfaces: ["occlusal", "distal"],
      rate: 2400,
      discount: 200,
      amount: 2200,
      status: "planned",
      sittings: [],
      procedures: [],
    },
    {
      id: "svc-new-005",
      planId: "plan-anjali-002",
      treatment: "Root Canal Treatment",
      toothFdi: "37",
      toothLabel: "Lower Left Second Molar",
      surfaces: ["occlusal", "root"],
      rate: 8200,
      discount: 700,
      amount: 7500,
      status: "planned",
      sittings: [],
      procedures: [],
    },
  ],
};

const ANJALI_IN_PROGRESS_PLAN = {
  id: "plan-anjali-003",
  name: "Pain Relief and Core Build-up",
  patientId: "apt-6",
  createdAt: "2026-03-30",
  updatedAt: "2026-04-14",
  status: "in-progress",
  notes: "Pain reduced after first two sittings; proceed with core build-up.",
  services: [
    {
      id: "svc-new-006",
      planId: "plan-anjali-003",
      treatment: "Root Canal Treatment",
      toothFdi: "46",
      toothLabel: "Lower Right First Molar",
      surfaces: ["occlusal", "root"],
      rate: 8500,
      discount: 500,
      amount: 8000,
      status: "in-progress",
      startedAt: "2026-04-01",
      sittings: [],
      appointments: [
        {
          id: "appt-new-001",
          date: "14 Apr 2026",
          time: "11:15 AM",
          doctor: "Dr. Sheela B R",
          notes: "Review and obturation planning",
        },
        {
          id: "appt-new-003",
          date: "18 Apr 2026",
          time: "10:30 AM",
          doctor: "Dr. Sheela B R",
          notes: "Master cone trial and final obturation",
        },
      ],

      consultations: [
        {
          id: "cons-appt-new-001",
          endedAt: "2026-04-15T08:16:00",
          source: "appointment",
          appointmentId: "appt-new-001",
          summaryText: [
            "Symptoms: Lingering cold and soreness on biting localized to the lower right first molar (46).",
            "Examination: Access reopened under rubber dam; temporary restoration removed; percussion ++; palpation WNL; canals patent.",
            "Tooth: Lower Right First Molar (T46) · MB, ML, and D canals negotiated to working length; glide path with #15 K-file; copious 2.5% NaOCl irrigation; calcium hydroxide intracanal medicament; Cavit temporary seal.",
            "Diagnosis: Previously treated root canal with asymptomatic apical periodontitis (46).",
            "Lab investigation: Periapical radiograph — periapical radiolucency at 46; no vertical fracture line.",
            "Medication: Ibuprofen 400mg SOS for post-visit soreness.",
            "Advice: Soft diet on the right side; return for master cone trial, obturation, and core build-up planning.",
          ].join("\n"),
        },
      ],

      procedures: [
        {
          id: "proc-new-001",
          name: "Access opening",
          date: "1 Apr 2026",
          doctor: "Dr. Sheela B R",
          notes: "Pulp chamber opened",
          status: "completed",
        },
        {
          id: "proc-new-002",
          name: "Working length determination",
          date: "5 Apr 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-new-003",
          name: "Temporary restoration",
          date: "12 Apr 2026",
          doctor: "Dr. Sheela B R",
          status: "in-progress",
        },
      ],
    },
    {
      id: "svc-new-007",
      planId: "plan-anjali-003",
      treatment: "Restoration (Composite Filling)",
      toothFdi: "45",
      toothLabel: "Lower Right Second Premolar",
      surfaces: ["buccal", "occlusal"],
      rate: 2600,
      discount: 100,
      amount: 2500,
      status: "in-progress",
      startedAt: "2026-04-09",
      sittings: [
        {
          id: "sit-new-004",
          date: "9 Apr 2026",
          doctor: "Dr. Sheela B R",
          notes: "Caries excavation and base placement",
        },
      ],

      appointments: [
        {
          id: "appt-new-002",
          date: "16 Apr 2026",
          time: "03:45 PM",
          doctor: "Dr. Sheela B R",
          notes: "Composite finishing",
        },
      ],

      procedures: [
        {
          id: "proc-new-004",
          name: "Shade selection",
          date: "9 Apr 2026",
          doctor: "Dr. Sheela B R",
          status: "in-progress",
        },
      ],
    },
  ],
};

const ANJALI_COMPLETED_PLAN = {
  id: "plan-anjali-004",
  name: "Posterior Crown Completion",
  patientId: "apt-6",
  createdAt: "2026-02-18",
  updatedAt: "2026-03-28",
  status: "completed",
  notes: "Patient comfortable with final bite. Review after 3 months.",
  services: [
    {
      id: "svc-new-008",
      planId: "plan-anjali-004",
      treatment: "Crown (Zirconia)",
      toothFdi: "26",
      toothLabel: "Upper Left First Molar",
      surfaces: ["occlusal", "buccal", "lingual"],
      rate: 9200,
      discount: 1200,
      amount: 8000,
      status: "completed",
      startedAt: "2026-02-20",
      completedAt: "2026-03-18",
      notes: "Final zirconia crown seated with proper proximal contact.",
      sittings: [
        {
          id: "sit-new-005",
          date: "20 Feb 2026",
          doctor: "Dr. Sheela B R",
          notes: "Preparation + digital scan",
        },
        {
          id: "sit-new-006",
          date: "5 Mar 2026",
          doctor: "Dr. Sheela B R",
          notes: "Try-in and occlusal adjustments",
        },
        {
          id: "sit-new-007",
          date: "18 Mar 2026",
          doctor: "Dr. Sheela B R",
          notes: "Final cementation and polishing",
        },
      ],

      procedures: [
        {
          id: "proc-new-005",
          name: "Tooth preparation",
          date: "20 Feb 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-new-006",
          name: "Digital impression",
          date: "20 Feb 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-new-007",
          name: "Zirconia try-in",
          date: "5 Mar 2026",
          doctor: "Dr. Sheela B R",
          status: "completed",
        },
        {
          id: "proc-new-008",
          name: "Final crown cementation",
          date: "18 Mar 2026",
          doctor: "Dr. Sheela B R",
          notes: "Occlusion verified",
          status: "completed",
        },
      ],
    },
  ],
};

// ─── Export ──────────────────────────────────────────────────

export function getMockPlans(patientId) {
  if (patientId === "apt-1") {
    return [PRIMARY_CARE_PLAN, WISDOM_TOOTH_PLAN, CROWN_REPLACEMENT_PLAN];
  }
  if (patientId === "apt-6") {
    return [
      ANJALI_ESTIMATE_PLAN_1,
      ANJALI_ESTIMATE_PLAN_2,
      ANJALI_IN_PROGRESS_PLAN,
      ANJALI_COMPLETED_PLAN,
    ];
  }
  // First-visit patients (e.g. Ria Kapoor) and others — no plans until created
  return [];
}
