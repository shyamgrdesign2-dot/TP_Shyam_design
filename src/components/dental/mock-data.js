/**
 * Mock dental history data keyed by patientId.
 * Used by both the RxPad Dental empty-state sidebar panel AND the full
 * Dental Module page to simulate real clinic records for the demo story.
 */

/**
 * Prefilled tooth-level diagnoses per patient — applied to the 3D canvas when
 * the dental module is first opened for that patient. Demonstrates the full
 * range of primary diagnoses (Crown, RCT, Bridge, Implant, Missing, Denture).
 */

/**
 * No pre-seeded tooth records. Every patient's dental exam starts empty —
 * findings, diagnoses, implants and notes are charted live in the session.
 */
export const INITIAL_TOOTH_STATE = {
  "apt-new": {},
  "apt-1": {},
  "apt-2": {},
  // Anjali Patel — returning patient with an active restoration on 26, a
  // completed RCT + crown on 36, and an early caries lesion on 16 that's
  // been monitored since last visit.
  "apt-6": {
    toothDiagnoses: {
      26: ["Filling"],
      36: ["RCT", "Crown"],
    },
    findingsByTooth: {
      26: [{ zoneId: "occlusal", type: "Filling" }],
      16: [
        { zoneId: "occlusal", type: "Caries" },
        { zoneId: "buccal", type: "Caries" },
      ],

      47: [{ zoneId: "cervical", type: "Staining" }],
    },
  },
};

/** Dental history entries keyed by patientId (apt-* from appointment screen) */
export const DENTAL_HISTORY = {
  "apt-new": [], // Ria Kapoor — first visit, no prior dental history
  "apt-1": [
    // Shyam GR — historical entries from past visits (matches current tooth state)
    {
      id: "dh-s01",
      condition: "RCT — 36 (in progress)",
      since: "Feb 2025",
      status: "Active",
      medication: true,
      notes: "2 sittings completed, crown pending.",
    },
    {
      id: "dh-s02",
      condition: "Crown — 26 (PFM)",
      since: "Nov 2024",
      status: "Resolved",
      medication: false,
      notes: "Placed after RCT, bite aligned.",
    },
    {
      id: "dh-s03",
      condition: "Caries — 16 (Buccal/Occlusal)",
      since: "Jan 2025",
      status: "Monitoring",
      medication: false,
      notes: "Staining + early cavity, restoration planned.",
    },
    {
      id: "dh-s04",
      condition: "Scaling & Polishing",
      since: "Jul 2024",
      status: "Resolved",
      medication: false,
    },
  ],

  "apt-2": [
    // Sita Menon — basic historical data
    {
      id: "dh-st01",
      condition: "Extraction — 18, 28 (Wisdom teeth)",
      since: "Jun 2024",
      status: "Resolved",
      medication: true,
      notes: "Impacted molars, no complications.",
    },
    {
      id: "dh-st02",
      condition: "Fluoride Treatment",
      since: "Mar 2025",
      status: "Resolved",
      medication: false,
    },
  ],

  "apt-3": [
    // Vikram Singh — basic historical data
    {
      id: "dh-v01",
      condition: "Deep Cleaning (Scaling & Root Planing)",
      since: "Sep 2024",
      status: "Resolved",
      medication: false,
      notes: "Mild gingivitis, improved at 6-month follow-up.",
    },
  ],

  "apt-4": [], // Nisha Rao — no history yet
  "apt-5": [], // Rahul Verma — no history yet
  "apt-6": [
    {
      id: "dh-101",
      condition: "Scaling & Polishing",
      since: "Dec 2024",
      status: "Resolved",
      medication: false,
    },
    {
      id: "dh-102",
      condition: "Restoration — 26 (Occlusal)",
      since: "Jan 2025",
      status: "Active",
      medication: false,
      notes: "Composite filling, monitor for sensitivity.",
    },
  ],

  "PAT-001": [], // first patient has no history → triggers empty state
  "PAT-002": [
    {
      id: "dh-001",
      condition: "Root Canal Treatment — 36",
      since: "Mar 2025",
      status: "Resolved",
      medication: false,
      notes: "Completed over 3 sittings. Follow-up at 6 months.",
    },
    {
      id: "dh-002",
      condition: "Restoration — 16 (Occlusal)",
      since: "Jan 2025",
      status: "Active",
      medication: false,
      notes: "Composite filling, monitor for sensitivity.",
    },
    {
      id: "dh-003",
      condition: "Scaling & Polishing",
      since: "Dec 2024",
      status: "Resolved",
      medication: false,
    },
  ],

  "PAT-003": [
    {
      id: "dh-004",
      condition: "Orthodontic Treatment",
      since: "Sep 2024",
      status: "Active",
      medication: false,
      notes: "Metal braces, planned 18 months. Current month: 7.",
    },
    {
      id: "dh-005",
      condition: "Extraction — 18, 28, 38, 48",
      since: "Aug 2024",
      status: "Resolved",
      medication: true,
      notes: "Wisdom tooth removal prior to ortho treatment.",
    },
  ],

  "PAT-004": [
    {
      id: "dh-006",
      condition: "Implant — 46",
      since: "Nov 2024",
      status: "Monitoring",
      medication: false,
      notes: "Healing phase, crown placement pending.",
    },
  ],
};

export const DENTAL_TOOTH_HISTORY = {
  "apt-new": [],
  "apt-1": [
    {
      id: "dth-apt1-36",
      toothCode: "36",
      toothLabel: "Lower Left First Molar",
      treatmentHistory: [
        {
          id: "th-36-1",
          name: "Root Canal Treatment",
          surface: "Occlusal, Root",
          since: "2025-02-12",
          notes: "Working length verified. Irrigation and medicament placed.",
        },
      ],

      findings: [
        {
          id: "fnd-36-1",
          name: "Deep caries with pulpal involvement",
          surface: "Occlusal",
          since: "2025-02-06",
          notes: "Associated with intermittent pain on chewing.",
        },
        {
          id: "fnd-36-2",
          name: "Percussion sensitivity",
          surface: "Root",
          since: "2025-03-10",
          notes: "Reduced after second sitting.",
        },
      ],

      procedures: [
        {
          id: "proc-36-1",
          name: "Biomechanical preparation",
          surface: "Mesial, Distal canals",
          date: "2025-03-10",
          status: "Completed",
          notes: "Mesial and distal canals prepared to final taper.",
        },
      ],

      overallNotes: "Needs crown placement after obturation completion.",
    },
    {
      id: "dth-apt1-16",
      toothCode: "16",
      toothLabel: "Upper Right First Molar",
      treatmentHistory: [
        {
          id: "th-16-1",
          name: "Composite Restoration",
          surface: "Buccal, Occlusal",
          since: "2025-01-19",
          notes: "Shade A2 selected. Margins finished and polished.",
        },
      ],

      findings: [
        {
          id: "fnd-16-1",
          name: "Early enamel demineralization",
          surface: "Buccal",
          since: "2025-01-08",
        },
        {
          id: "fnd-16-2",
          name: "Food impaction",
          surface: "Occlusal",
          since: "2025-02-05",
          notes: "Reported during follow-up visit.",
        },
      ],

      procedures: [
        {
          id: "proc-16-1",
          name: "Caries excavation and etch-bond protocol",
          surface: "Buccal, Occlusal",
          date: "2025-01-19",
          status: "Completed",
        },
      ],

      overallNotes: "Review at 3 months for marginal integrity.",
    },
  ],

  "apt-2": [
    {
      id: "dth-apt2-18",
      toothCode: "18",
      toothLabel: "Upper Right Third Molar",
      treatmentHistory: [
        {
          id: "th-18-1",
          name: "Surgical Extraction",
          surface: "Whole Tooth",
          since: "2024-06-14",
          notes: "Impacted tooth removed atraumatically.",
        },
      ],

      findings: [
        {
          id: "fnd-18-1",
          name: "Mesioangular impaction",
          surface: "Whole Tooth",
          since: "2024-06-02",
          notes: "Confirmed in OPG.",
        },
        {
          id: "fnd-18-2",
          name: "Pericoronal inflammation",
          surface: "Distal gingival margin",
          since: "2024-06-07",
        },
      ],

      procedures: [
        {
          id: "proc-18-1",
          name: "Flap elevation and sectioning",
          surface: "Whole Tooth",
          date: "2024-06-14",
          status: "Completed",
        },
      ],

      overallNotes: "Socket healed well without postoperative infection.",
    },
  ],

  "apt-3": [],
  "apt-4": [],
  "apt-5": [],
  "apt-6": [
    {
      id: "dth-apt6-46",
      toothCode: "46",
      toothLabel: "Lower Right First Molar",
      treatmentHistory: [
        {
          id: "th-46-1",
          name: "Implant Assessment",
          surface: "Whole Tooth",
          since: "2024-11-22",
          notes: "Healing abutment stable, soft tissue healthy.",
        },
      ],

      findings: [
        {
          id: "fnd-46-1",
          name: "Osseointegration satisfactory",
          surface: "Implant site",
          since: "2024-12-11",
          notes: "Stable on clinical mobility assessment.",
        },
      ],

      procedures: [
        {
          id: "proc-46-1",
          name: "Implant review and occlusal evaluation",
          surface: "Whole Tooth",
          date: "2025-02-02",
          status: "In Progress",
        },
      ],

      overallNotes: "Proceed with definitive crown after next review.",
    },
  ],

  "PAT-001": [],
  "PAT-002": [
    {
      id: "dth-p2-36",
      toothCode: "36",
      toothLabel: "Lower Left First Molar",
      treatmentHistory: [
        {
          id: "th-p2-36-1",
          name: "Root Canal Treatment",
          surface: "Root",
          since: "2025-03-18",
        },
      ],

      findings: [
        {
          id: "fnd-p2-36-1",
          name: "Post-endodontic tenderness",
          surface: "Periapical region",
          since: "2025-04-01",
          notes: "Resolved at review.",
        },
      ],

      procedures: [],
      overallNotes: "Crown advised within 4 weeks.",
    },
  ],

  "PAT-003": [],
  "PAT-004": [
    {
      id: "dth-p4-46",
      toothCode: "46",
      toothLabel: "Lower Right First Molar",
      treatmentHistory: [
        {
          id: "th-p4-46-1",
          name: "Implant Placement",
          surface: "Whole Tooth",
          since: "2024-11-08",
        },
      ],

      findings: [
        {
          id: "fnd-p4-46-1",
          name: "Soft tissue contour satisfactory",
          surface: "Peri-implant mucosa",
          since: "2025-01-08",
        },
      ],

      procedures: [
        {
          id: "proc-p4-46-1",
          name: "Follow-up implant stability check",
          surface: "Whole Tooth",
          date: "2025-01-08",
          status: "Completed",
        },
      ],

      overallNotes:
        "Crown loading planned after final radiographic confirmation.",
    },
  ],
};

/** Prefilled Treatment Plan mock data per patient */
export const TREATMENT_PLANS = {
  "apt-1": [
    {
      id: "tp-101",
      treatment: "Root Canal Treatment",
      teeth: ["36"],
      rate: 8000,
    },
    {
      id: "tp-102",
      treatment: "Restoration (Composite Filling)",
      teeth: ["16", "26"],
      rate: 2000,
    },
    {
      id: "tp-103",
      treatment: "Scaling & Polishing",
      teeth: ["full-mouth"],
      rate: 1500,
    },
  ],

  "apt-6": [
    { id: "tp-201", treatment: "Crown (PFM)", teeth: ["26"], rate: 6000 },
  ],

  "PAT-001": [
    {
      id: "tp-001",
      treatment: "Root Canal Treatment",
      teeth: ["36"],
      rate: 8000,
    },
    {
      id: "tp-002",
      treatment: "Restoration (Composite Filling)",
      teeth: ["16", "26"],
      rate: 2000,
    },
    {
      id: "tp-003",
      treatment: "Scaling & Polishing",
      teeth: ["full-mouth"],
      rate: 1500,
    },
  ],

  "PAT-002": [
    { id: "tp-004", treatment: "Crown (PFM)", teeth: ["36"], rate: 6000 },
  ],

  "PAT-003": [],
  "PAT-004": [
    { id: "tp-005", treatment: "Implant Crown", teeth: ["46"], rate: 9000 },
  ],
};

/** Prefilled examination findings (for demo — when user opens dental module) */
export const INITIAL_FINDINGS = {
  "PAT-001": [],
  "PAT-002": [
    {
      toothFdi: "36",
      diagnoses: ["RCT"],
      zoneFindings: { root: ["Sensitivity"] },
    },
    {
      toothFdi: "16",
      diagnoses: [],
      zoneFindings: { occlusal: ["Cavity/Caries"] },
    },
  ],

  "PAT-003": [],
  "PAT-004": [
    {
      toothFdi: "46",
      diagnoses: ["Implant"],
    },
  ],
};
