// ─────────────────────────────────────────────────────────────
// Intent Classification Engine
// Maps user input → intent category + response format
// ─────────────────────────────────────────────────────────────









const RULES = [
// ── Operational (Homepage) — checked first because multi-word phrases must win over single-word matches ──
{ keywords: ["today's schedule", "appointments today", "who's next", "queue status", "queue list"], intent: "operational", format: "card" },
{ keywords: ["follow-ups due", "overdue follow", "callback", "follow up due"], intent: "operational", format: "card" },
{ keywords: ["revenue", "billing", "collection", "payment", "income", "earnings", "refund", "deposit", "this week's billing", "this week's deposits"], intent: "operational", format: "card" },
{ keywords: ["send sms", "send reminder", "remind all", "bulk sms", "notify"], intent: "operational", format: "card" },
{ keywords: ["demographics", "age group", "gender split", "patient composition"], intent: "operational", format: "card" },
{ keywords: ["diagnosis distribution", "diagnosis breakdown", "top diagnos", "common conditions"], intent: "operational", format: "card" },
{ keywords: ["patient volume", "footfall", "monthly patients"], intent: "operational", format: "card" },
{ keywords: ["kpi", "performance", "weekly summary", "analytics", "dashboard"], intent: "operational", format: "card" },
{ keywords: ["chronic", "diabetic", "hypertensive", "condition breakdown"], intent: "operational", format: "card" },
{ keywords: ["busiest", "slot utilization", "peak hours", "appointment density"], intent: "operational", format: "card" },
{ keywords: ["how many patients", "patient count", "total patients"], intent: "operational", format: "hybrid" },
{ keywords: ["cancellation rate", "no show", "no-show"], intent: "operational", format: "card" },
{ keywords: ["referral summary", "specialist referral", "referral this week"], intent: "operational", format: "card" },
{ keywords: ["vaccination due", "vaccine overdue", "immunization due", "vaccination overdue"], intent: "operational", format: "card" },
{ keywords: ["anc schedule", "anc due", "antenatal", "anc overdue", "obstetric schedule"], intent: "operational", format: "card" },
{ keywords: ["details about", "search patient", "find patient", "show patient", "look up patient", "patient named", "who is"], intent: "operational", format: "card" },
{ keywords: ["vaccination schedule", "vaccine schedule", "immunization"], intent: "operational", format: "card" },
// Clinical guidelines pill removed from homepage
{ keywords: ["billing overview", "bill summary", "billing summary"], intent: "operational", format: "card" },
{ keywords: ["patient timeline", "visit timeline", "clinical timeline"], intent: "data_retrieval", format: "card" },
{ keywords: ["patient trend", "footfall trend", "daily patient count"], intent: "operational", format: "card" },
{ keywords: ["discharge status", "discharge summary"], intent: "operational", format: "card" },
{ keywords: ["pending draft", "pending digitisation"], intent: "operational", format: "card" },

// Data Retrieval
{ keywords: ["summary", "snapshot", "patient", "overview", "history", "last visit", "past visit", "intake", "reported"], intent: "data_retrieval", format: "card" },
{ keywords: ["gynec", "gynae", "gynaec", "ophthal", "eye", "vision", "obstetric", "anc", "pediatric", "pedia", "growth", "vaccine"], intent: "data_retrieval", format: "card" },
{ keywords: ["vitals", "bp", "spo2", "pulse", "temperature", "weight"], intent: "data_retrieval", format: "hybrid" },
{ keywords: ["lab", "report", "hba1c", "glucose", "creatinine", "cbc", "lipid", "tsh"], intent: "data_retrieval", format: "card" },
{ keywords: ["medication", "meds", "drug", "rx", "prescription"], intent: "data_retrieval", format: "card" },

// Clinical Decision Support
{ keywords: ["ddx", "differential", "diagnosis", "diagnose", "suggest dx"], intent: "clinical_decision", format: "card" },
{ keywords: ["protocol", "suggest med", "recommend", "guideline"], intent: "clinical_decision", format: "card" },
{ keywords: ["investigation", "test", "order", "screening", "workup"], intent: "clinical_decision", format: "card" },

// Action
{ keywords: ["copy", "add", "fill", "draft"], intent: "action", format: "hybrid" },
{ keywords: ["translate", "hindi", "telugu", "kannada", "tamil", "marathi"], intent: "action", format: "card" },
{ keywords: ["follow-up", "follow up", "f/u", "next visit", "schedule"], intent: "action", format: "card" },

// Comparison
{ keywords: ["compare", "trend", "change", "previous", "difference", "delta"], intent: "comparison", format: "card" },
{ keywords: ["graph", "chart", "line", "bar", "plot"], intent: "comparison", format: "card" },

// Document Analysis
{ keywords: ["upload", "document", "ocr", "scan", "report upload", "attach"], intent: "document_analysis", format: "card" },

// Clinical Question
{ keywords: ["what is", "how to", "why", "explain", "cause", "mechanism"], intent: "clinical_question", format: "text" },
{ keywords: ["check interaction", "drug interaction"], intent: "clinical_question", format: "card" },
{ keywords: ["dose", "dosage", "interaction", "contraindication", "side effect"], intent: "clinical_question", format: "hybrid" },
{ keywords: ["suggest lab", "initial investigation", "initial workup"], intent: "clinical_decision", format: "card" },
{ keywords: ["ask me anything", "ask anything", "pre-consult"], intent: "ambiguous", format: "text" },

// Rail-specific operational queries
{ keywords: ["follow-up dues this week", "follow-up dues today", "overdue follow-ups today", "this week follow-ups", "overdue follow-up", "send reminder", "this week's follow-up", "follow-up rate", "follow up rate"], intent: "operational", format: "card" },
{ keywords: ["patients with due", "due this week", "due till now", "dues till date", "total bill today", "today's billing", "today's deposit", "today's collection", "overall collection", "past 30 days collection", "generate invoice", "open billing", "open opd billing"], intent: "operational", format: "card" },
{ keywords: ["low stock", "pending prescription", "dispense history", "expiring medicine"], intent: "operational", format: "card" },
{ keywords: ["draft campaign", "delivery stat", "template library", "scheduled message"], intent: "operational", format: "card" },
{ keywords: ["excel", "xlsx", "word", "docx", "export format", "download file"], intent: "operational", format: "card" },
// Patient-context pills
{ keywords: ["patient snapshot", "patient's detailed summary", "detailed summary", "pre-consult prep", "abnormal lab"], intent: "operational", format: "card" },

// Operational (RxPad)
{ keywords: ["completeness", "checklist", "missing", "empty section", "documentation"], intent: "operational", format: "card" },

// Follow-up questions
{ keywords: ["which", "select", "choose", "pick one"], intent: "follow_up", format: "card" },

// Out-of-scope — non-medical topics
{ keywords: ["cricket", "football", "soccer", "tennis", "basketball", "baseball", "hockey", "ipl", "world cup score", "match score"], intent: "out_of_scope", format: "card" },
{ keywords: ["weather", "forecast", "temperature outside", "rain today", "sunny today"], intent: "out_of_scope", format: "card" },
{ keywords: ["movie", "netflix", "series", "tv show", "web series", "bollywood", "hollywood"], intent: "out_of_scope", format: "card" },
{ keywords: ["stock market", "share price", "nifty", "sensex", "crypto", "bitcoin", "trading"], intent: "out_of_scope", format: "card" },
{ keywords: ["recipe", "cooking", "how to cook", "food recipe", "restaurant"], intent: "out_of_scope", format: "card" },
{ keywords: ["politics", "election", "prime minister", "president", "government"], intent: "out_of_scope", format: "card" },
{ keywords: ["joke", "tell me a joke", "funny", "riddle", "poem", "story", "song"], intent: "out_of_scope", format: "card" },
{ keywords: ["book a flight", "hotel", "travel", "vacation", "holiday plan"], intent: "out_of_scope", format: "card" },
{ keywords: ["news today", "headline", "latest news", "trending"], intent: "out_of_scope", format: "card" }];


export function classifyIntent(input) {
  const normalized = input.toLowerCase().replace(/[\u2080-\u2089]/g, (ch) => String(ch.charCodeAt(0) - 0x2080)).trim();

  // Check each rule
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return {
        category: rule.intent,
        format: rule.format,
        confidence: 0.85
      };
    }
  }

  // Ambiguous fallback
  return {
    category: "ambiguous",
    format: "text",
    confidence: 0.3
  };
}

// Canned pill labels → pre-mapped intents (bypass NLU)
export const PILL_INTENT_MAP = {
  "Summary": "data_retrieval",
  "Gynec summary": "data_retrieval",
  "Ophthal summary": "data_retrieval",
  "Obstetric summary": "data_retrieval",
  "Pediatric summary": "data_retrieval",
  "Patient summary": "data_retrieval",
  "Patient's detailed summary": "data_retrieval",
  "Vision summary": "data_retrieval",
  "Growth summary": "data_retrieval",
  "Lab trends": "comparison",
  "Ask anything": "ambiguous",
  "Ask me anything": "ambiguous",
  "Check interactions": "clinical_question",
  "Suggest lab tests": "clinical_decision",
  "Pre-consult prep": "data_retrieval",
  "Suggest DDX": "clinical_decision",
  "Compare with last visit": "comparison",
  "Protocol meds": "clinical_decision",
  "Investigations": "clinical_decision",
  "Advice": "action",
  "F/U": "action",
  "Translate": "action",
  "Follow-up": "action",
  "Completeness check": "operational",
  "Translate advice": "action",
  "Compare visits": "comparison",
  "Vital trends": "comparison",
  "Graph view": "comparison",
  "Line graph": "comparison",
  "Bar view": "comparison",
  "All 11 params": "comparison",
  "Med history search": "data_retrieval",
  "Chronic timeline": "data_retrieval",
  "Lab comparison": "comparison",
  "Compare prev": "comparison",
  "HbA1c trend": "comparison",
  "Annual panel": "data_retrieval",
  "OB summary": "data_retrieval",
  "OCR analysis": "document_analysis",
  "Report extract": "document_analysis",
  "Review SpO2": "data_retrieval",
  "Review SpO\u2082": "data_retrieval",
  "Allergy Alert": "data_retrieval",
  "Other drug classes": "data_retrieval",
  "Compare with previous": "comparison",
  "Hindi": "action",
  "Tamil": "action",
  "Telugu": "action",
  "Suggest inv": "clinical_decision",
  // Homepage operational pills
  "Today's schedule": "operational",
  "Follow-ups due": "operational",
  "Revenue today": "operational",
  "Revenue this week": "operational",
  "This week's billing": "operational",
  "This week's deposits": "operational",
  "Compare with another date": "comparison",
  "Weekly KPIs": "operational",
  "Upload document": "document_analysis",
  "Patient demographics": "operational",
  "Diagnosis breakdown": "operational",
  "Busiest hours": "operational",
  "Chronic conditions": "operational",
  "Cancellation rate": "operational",
  "Pending drafts": "operational",
  "Discharge status": "operational",
  "Show cancelled patients": "operational",
  "Reduce cancellations": "operational",
  "Send reminder to all": "operational",
  "Follow-up analytics": "operational",
  "Compare with last week": "comparison",
  "Compare with yesterday": "operational",
  "Gender split": "operational",
  "Condition breakdown": "operational",
  "Show all fever patients": "operational",
  "Monthly trend": "comparison",
  "Show all DM patients": "operational",
  "HbA1c distribution": "operational",
  "Show patients": "operational",
  "Compare months": "comparison",
  "Payment reminders": "operational",
  // Rail-specific pill labels
  "Overdue follow-ups": "operational",
  "Overdue follow-ups today": "operational",
  "This week's follow-ups": "operational",
  "This week follow-ups": "operational",
  "Follow-up dues this week": "operational",
  "Follow-up dues today": "operational",
  "Follow-up rate": "operational",
  "Patients with due this week": "operational",
  "Patients with due till now": "operational",
  "Today's collection": "operational",
  "Today's billing": "operational",
  "Today's deposits": "operational",
  "Past 30 days collection": "operational",
  "Generate invoice": "operational",
  "Open Excel file": "operational",
  "Open Word document": "operational",
  "Low stock alerts": "operational",
  "Pending prescriptions": "operational",
  "Dispense history": "operational",
  "Expiring medicines": "operational",
  "Draft campaign": "operational",
  "Delivery stats": "operational",
  "Template library": "operational",
  "Scheduled messages": "operational",
  // New homepage pill labels (tab-specific)
  "Referral summary": "operational",
  "Vaccination schedule": "operational",
  // Clinical guidelines removed from homepage pills
  "Billing overview": "operational",
  "Patient timeline": "data_retrieval", // patient-specific → redirected in homepage
  "Patient trends": "operational",
  "Peak hours": "operational",
  "Vaccination due list": "operational",
  "ANC schedule": "operational",
  // Patient-context pill labels (data-aware)
  "Patient snapshot": "data_retrieval",
  "Patient detail summary": "data_retrieval",
  "Last visit": "data_retrieval",
  "Last visit details": "data_retrieval",
  "Past visit summaries": "data_retrieval",
  "Abnormal labs": "operational",
  "Reported by patient": "data_retrieval",
  "Show reported intake": "data_retrieval",
  "Chronic conditions": "data_retrieval",
  "Allergies": "data_retrieval",
  "Family history": "data_retrieval",
  "Lifestyle": "data_retrieval",
  "Initial investigations": "clinical_decision",
  "Initial workup": "clinical_decision",
  "Lab overview": "data_retrieval",
  "Growth & vaccines": "data_retrieval",
  "Growth check": "data_retrieval",
  "Vision check": "data_retrieval",
  "Today's vitals": "data_retrieval",
  "Medical history": "data_retrieval",
  // Doctor-type-aware pills (treating physician + emergency)
  "eGFR trend": "comparison",
  "Medication timeline": "data_retrieval",
  "Plan follow-up": "action",
  "Recent ER history": "data_retrieval",
  "Key labs": "data_retrieval",
  "Active medications": "data_retrieval"
};