import React from "react"
import { tesseractIcon } from "../ui/tesseractIcon"

import { VELORA_BRIEF_OUTPUT } from "./velora-scenarios"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Flash = tesseractIcon("flash")
const Clock = tesseractIcon("clock")
const Stickynote = tesseractIcon("stickynote")
const InfoCircle = tesseractIcon("info-circle")
const Diagram = tesseractIcon("diagram")
const Activity = tesseractIcon("activity")
const Chart = tesseractIcon("chart")

 

export const VELORA_APPOINTMENTS = [
  {
    id: "velora-priya",
    serial: 1,
    name: "Priya Reddy",
    gender: "F",
    age: 63,
    contact: "+91-9845012345",
    visitType: "Follow-up",
    visitTags: [{ text: "Post-MRM day 54", tone: "warning" }],
    slotTime: "10:00 am",
    slotDate: "9 Mar'26",
    hasVideo: false,
    status: "queue",
    dateKey: "today",
    hasSymptoms: true,
  },
  {
    id: "velora-rajesh",
    serial: 2,
    name: "Rajesh Iyer",
    gender: "M",
    age: 58,
    contact: "+91-9900123456",
    visitType: "Follow-up",
    visitTags: [{ text: "CKD-5 on CAPD", tone: "info" }],
    slotTime: "10:20 am",
    slotDate: "9 Mar'26",
    hasVideo: true,
    status: "queue",
    dateKey: "today",
    hasSymptoms: true,
  },
]

const VELORA_USER_PROMPT = {
  "velora-priya": "Run clinical insight scan for Priya Reddy.",
  "velora-rajesh": "Run clinical insight scan for Rajesh Iyer.",
}

const VELORA_BRIEF_PREAMBLE = {
  "velora-priya": "Quick brief on Priya — one gap, three silos.",
  "velora-rajesh": "Quick brief on Rajesh — one chain, three specialists.",
}

const VELORA_BRIEF_SUGGESTIONS = {
  "velora-priya": [
    { label: "Show full clinical assessment", message: "Show full clinical assessment" },
    { label: "What's overdue right now?", message: "What's overdue right now?" },
    { label: "Pre-Letrozole checklist", message: "Pre-Letrozole checklist" },
    { label: "Why is the rad-onc window 8 weeks?", message: "Why is the rad-onc window 8 weeks?" },
  ],
  "velora-rajesh": [
    { label: "Show full correlation assessment", message: "Show full correlation assessment" },
    { label: "Show KT/V vs BNP correlation", message: "Show KT/V vs BNP correlation" },
    { label: "Predicted outcomes if untreated", message: "Predicted outcomes if untreated" },
    { label: "What would escalating PD do?", message: "What would escalating PD do?" },
  ],
}

/** Seeded Dr. Agent thread for a Velora patient:
 *  user "run insight scan" → AI preamble + compact brief card + inline suggestion pills.
 *  Further exploration (full assessment + drill-downs) is routed through velora-router's
 *  replyOverride and appended as new turns. */
export function buildVeloraThread(patientId) {
  const now = new Date().toISOString()
  return [
    {
      id: `velora-user-${patientId}`,
      role: "user",
      text: VELORA_USER_PROMPT[patientId],
      createdAt: now,
    },
    {
      id: `velora-assistant-${patientId}`,
      role: "assistant",
      text: VELORA_BRIEF_PREAMBLE[patientId],
      createdAt: now,
      rxOutput: VELORA_BRIEF_OUTPUT[patientId],
      suggestions: VELORA_BRIEF_SUGGESTIONS[patientId],
    },
  ]
}

export function isVeloraPatientId(id) {
  return id === "velora-priya" || id === "velora-rajesh"
}

/**
 * Scenario-specific canned cards shown on the WelcomeScreen for a Velora patient.
 * Uses React.createElement (this file is .ts, not .tsx) to instantiate iconsax icons
 * so the shape matches QuickAction in WelcomeScreen.
 */
const ICON_SIZE = 18
const icon = (Cmp) =>
  React.createElement(Cmp, { size: ICON_SIZE, variant: "Bulk" })

export function getVeloraWelcomeActions(patientId) {
  if (patientId === "velora-priya") {
    return [
      {
        icon: icon(Flash),
        title: "Run clinical insight scan",
        subtitle: "Start with Velora's quick brief for this patient",
        message: "Run clinical insight scan",
      },
      {
        icon: icon(Clock),
        title: "What's overdue right now?",
        subtitle: "Items past their expected window",
        message: "What's overdue right now?",
      },
      {
        icon: icon(Stickynote),
        title: "Pre-Letrozole checklist",
        subtitle: "Required steps before the Day 60 start",
        message: "Pre-Letrozole checklist",
      },
      {
        icon: icon(InfoCircle),
        title: "Why is the rad-onc window 8 weeks?",
        subtitle: "Guideline behind the critical deadline",
        message: "Why is the rad-onc window 8 weeks?",
      },
    ]
  }
  if (patientId === "velora-rajesh") {
    return [
      {
        icon: icon(Flash),
        title: "Run clinical insight scan",
        subtitle: "Start with Velora's quick brief for this patient",
        message: "Run clinical insight scan",
      },
      {
        icon: icon(Chart),
        title: "Show KT/V vs BNP trend",
        subtitle: "Dialysis adequacy vs cardiac stress overlay",
        message: "Show KT/V vs BNP trend",
      },
      {
        icon: icon(Activity),
        title: "Predicted outcomes if untreated",
        subtitle: "Three events that fit the current trajectory",
        message: "Predicted outcomes if untreated",
      },
      {
        icon: icon(Diagram),
        title: "What would escalating PD do?",
        subtitle: "Expected effect of a PD prescription step-up",
        message: "What would escalating PD do?",
      },
    ]
  }
  return undefined
}
