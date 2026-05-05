

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Map intent category + query keywords to a context-aware typing indicator hint */
export function getQueryHint(category, query) {
  const q = query.toLowerCase();
  if (q.includes("interaction") || q.includes("drug")) return "Checking drug interactions";
  if (q.includes("lab") || q.includes("vital") || q.includes("trend")) return "Fetching lab results";
  if (q.includes("summary") || q.includes("snapshot") || q.includes("patient")) return "Looking up patient records";
  if (q.includes("intake") || q.includes("pre-visit")) return "Loading intake data";
  if (q.includes("ddx") || q.includes("diagnos")) return "Reviewing clinical guidelines";
  if (q.includes("investigation") || q.includes("test")) return "Reviewing investigation protocols";
  if (q.includes("document") || q.includes("report") || q.includes("upload")) return "Analyzing document";
  switch (category) {
    case "data_retrieval":return "Looking up patient records";
    case "clinical_decision":return "Reviewing clinical guidelines";
    case "clinical_question":return "Reviewing clinical data";
    case "comparison":return "Comparing clinical data";
    case "operational":return "Fetching clinic data";
    case "document_analysis":return "Analyzing document";
    case "action":return "Preparing response";
    default:return "Reviewing clinical data";
  }
}

export function detectSpecialties(summary) {
  const tabs = ["gp"];
  if (summary.obstetricData) tabs.push("obstetric");
  if (summary.pediatricsData) tabs.push("pediatrics");
  if (summary.gynecData) tabs.push("gynec");
  if (summary.ophthalData) tabs.push("ophthal");
  return tabs;
}