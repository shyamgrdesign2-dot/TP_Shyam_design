































export function createAgentMessage(
role,
text,
output)
{
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
    output
  };
}

export function buildAgentWelcomeMessage(patient) {
  return `Hi Doctor. I am ready for ${patient.name}. Ask me to summarize, structure notes, or draft TypeRx sections for this visit.`;
}

export function buildAgentMockReply(
prompt,
patient)
{
  const normalized = prompt.toLowerCase();

  if (normalized.includes("trend") || normalized.includes("analytics") || normalized.includes("chart")) {
    return {
      reply: `Trend insights prepared for ${patient.name}. I mapped key vitals and symptom intensity for quick review.`,
      output: {
        type: "generic",
        title: "Clinical Trends",
        subtitle: "AI2UI insight card",
        bullets: [
        "Fever trend has reduced over the last 3 observations",
        "Fatigue score remains moderately elevated",
        "Follow-up adherence is above expected baseline"],

        actions: ["Open Full Chart", "Mark Improvement"],
        chart: {
          labels: ["D1", "D2", "D3", "D4"],
          values: [78, 62, 49, 42],
          suffix: "%"
        },
        clickableItems: ["Fever", "Fatigue", "Adherence"]
      }
    };
  }

  if (normalized.includes("summar")) {
    return {
      reply: `${patient.name}: ${patient.visitType ?? "consultation"} visit, ${patient.gender}, ${patient.age}y. I have structured the key points into a concise summary.`,
      output: {
        type: "summary",
        title: "Consultation Summary",
        subtitle: "Drafted from current notes",
        bullets: [
        "Primary complaint captured with duration and severity",
        "Exam findings normalized for clinical handoff",
        "Advice section aligned to follow-up timeline"],

        actions: ["Insert in Visit Summary", "Copy to Notes"]
      }
    };
  }

  if (normalized.includes("diagn")) {
    return {
      reply: `Provisional diagnosis drafted for ${patient.name}. Please confirm before adding to the final prescription.`,
      output: {
        type: "diagnosis",
        title: "Diagnosis Suggestions",
        subtitle: "Ranked by confidence",
        bullets: [
        "Viral upper respiratory tract infection",
        "Allergic conjunctival irritation",
        "Rule out bacterial superinfection if fever persists"],

        actions: ["Add to Diagnosis", "Request More Data"]
      }
    };
  }

  if (normalized.includes("invest") || normalized.includes("test")) {
    return {
      reply: `Investigation set prepared for ${patient.name}. I included baseline and escalation checks.`,
      output: {
        type: "investigations",
        title: "Suggested Investigations",
        subtitle: "Point-and-click bundle",
        bullets: [
        "CBC + ESR",
        "CRP and urine routine",
        "Repeat vitals in 48 hours"],

        actions: ["Add All", "Edit Bundle"]
      }
    };
  }

  if (normalized.includes("follow")) {
    return {
      reply: `Follow-up plan created for ${patient.name}. Timeline and warning signs are now structured.`,
      output: {
        type: "follow-up",
        title: "Follow-up Plan",
        subtitle: "Auto-structured care plan",
        bullets: [
        "Review in 3 to 5 days",
        "Hydration, rest, and symptom tracker",
        "Immediate revisit if persistent high fever"],

        actions: ["Add to Follow-up", "Share Instructions"]
      }
    };
  }

  if (normalized.includes("rx") || normalized.includes("type")) {
    return {
      reply: `TypeRx draft prepared for ${patient.name}. Medicines, dosage frequency, and advice sections are ready for review.`,
      output: {
        type: "typerx",
        title: "TypeRx Draft",
        subtitle: "Generated from visit context",
        bullets: [
        "Medicine list with frequency and duration",
        "Advice and diet section prefilled",
        "Follow-up slot suggested automatically"],

        actions: ["Open in TypeRx", "Refine Dosage"]
      }
    };
  }

  return {
    reply: `Instruction captured for ${patient.name}. I can convert this into structured TypeRx content with one click.`,
    output: {
      type: "generic",
      title: "Agent Workspace",
      subtitle: "Dynamic output block",
      bullets: [
      "Intent classified successfully",
      "Context linked to current patient",
      "Ready to publish to selected section"],

      actions: ["Apply", "Review"]
    }
  };
}

const PROMPT_REFRESH_RULES = [
{
  match: ["trend", "analytics", "chart", "insight"],
  suggestions: [
  "Break this trend by time slot",
  "Show top 3 contributing factors",
  "Compare with last week",
  "Convert into action checklist"]

},
{
  match: ["diagn", "differential", "suspect"],
  suggestions: [
  "Add likely differentials",
  "What should I rule out first?",
  "Suggest confirmatory checks",
  "Draft diagnosis note"]

},
{
  match: ["symptom", "history", "intake"],
  suggestions: [
  "Map symptoms to probable causes",
  "Flag missing clinical details",
  "Create symptom timeline",
  "Draft focused questions"]

},
{
  match: ["follow", "callback", "review"],
  suggestions: [
  "Draft follow-up advice",
  "Set review timeline",
  "Highlight red-flag signs",
  "Draft patient reminder"]

},
{
  match: ["rx", "medicine", "dosage", "prescription", "type"],
  suggestions: [
  "Suggest safer alternatives",
  "Check dosage completeness",
  "Draft counseling points",
  "Prepare final TypeRx"]

},
{
  match: ["bill", "payment", "invoice", "pending"],
  suggestions: [
  "List pending billing items",
  "Show aging by amount",
  "Highlight billing exceptions",
  "Draft payment reminders"]

}];


export function deriveAgentPromptSuggestions(
prompt,
fallbackPrompts,
limit = 4)
{
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) {
    return fallbackPrompts.slice(0, limit);
  }

  const matchedRule = PROMPT_REFRESH_RULES.find((rule) =>
  rule.match.some((token) => normalized.includes(token))
  );

  const dynamic = matchedRule?.suggestions ?? [
  "Summarize this in 3 bullets",
  "What should I do next?",
  "Draft a patient-safe response",
  "Convert this into checklist"];


  const unique = Array.from(new Set([...dynamic, ...fallbackPrompts]));
  return unique.slice(0, limit);
}