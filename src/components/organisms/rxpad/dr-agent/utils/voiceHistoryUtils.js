
import { SMART_SUMMARY_BY_CONTEXT } from "../mock-data";
import { CONTEXT_PATIENT_ID } from "../constants";









export function formatVoiceSidebarItem(item) {
  return item.detail ? `${item.name}: ${item.detail}` : item.name;
}

export function compactVoiceLines(lines, limit = 6) {
  return [...new Set(lines.map((line) => String(line ?? "").trim()).filter(Boolean))].slice(0, limit);
}

function expandHistoryDurationToken(token) {
  const trimmed = token.trim();
  const match = trimmed.match(/^(\d+)\s*(yr|yrs|y|year|years|mo|mos|month|months|wk|wks|week|weeks|day|days)\b/i);
  if (!match) return trimmed;

  const value = match[1];
  const unit = match[2].toLowerCase();
  const singular = value === "1";

  if (unit.startsWith("yr") || unit === "y") return `${value} ${singular ? "year" : "years"}`;
  if (unit.startsWith("mo")) return `${value} ${singular ? "month" : "months"}`;
  if (unit.startsWith("wk")) return `${value} ${singular ? "week" : "weeks"}`;
  return `${value} ${singular ? "day" : "days"}`;
}

function normalizeHistoryFacet(token) {
  const trimmed = token.trim().replace(/\.$/, "");
  if (!trimmed) return "";
  if (/^on\s+/i.test(trimmed)) return trimmed.replace(/^on\s+/i, "On ");
  if (/^(active|inactive|resolved|occasional|vegetarian|sedentary|non-smoker|no alcohol)$/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return expandHistoryDurationToken(trimmed);
}

function splitHistorySeed(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([^()]+?)(?:\(([^)]+)\))?$/);
  const subject = (match?.[1] ?? trimmed).trim();
  const facets = (match?.[2] ?? "").
  split(",").
  map((part) => normalizeHistoryFacet(part)).
  filter(Boolean);
  return { subject, facets };
}

function normalizeHistorySubject(subject, scope) {
  const lower = subject.trim().toLowerCase();

  if (scope === "condition") {
    if (/\b(type\s*2\s*)?diabetes|dm\b/.test(lower)) return "Type 2 Diabetes";
    if (/\bhypertension|high blood pressure|htn\b/.test(lower)) return "Hypertension";
    if (/\bdyslipidemia|dyslipidaemia|hyperlipidemia|cholesterol\b/.test(lower)) return "Dyslipidemia";
    if (/\bthyroid|hypothyroid|hyperthyroid\b/.test(lower)) return "Thyroid disorder";
  }
  if (scope === "allergy") {
    if (/\bdust\b/.test(lower)) return "Dust";
    if (/\bibuprofen\b/.test(lower)) return "Ibuprofen";
  }
  if (scope === "family") {
    if (/\bdiabetes\b/.test(lower)) return "Diabetes Mellitus";
    if (/\bhypertension\b/.test(lower)) return "Hypertension";
    if (/\bthyroid\b/.test(lower)) return "Thyroid disorder";
  }
  if (scope === "lifestyle") {
    if (/\bsmok/i.test(lower)) return "Smoking";
    if (/\balcohol|drink/i.test(lower)) return "Alcohol";
    if (/\bdiet|meal/i.test(lower)) return "Diet";
  }
  if (scope === "additional" && /\bdiet|meal/i.test(lower)) return "Diet";

  return subject.trim();
}

function normalizeFamilyFacet(detail) {
  return detail.
  replace(/\bmom\b/gi, "Mother").
  replace(/\bdad\b/gi, "Father").
  replace(/\baunt\b/gi, "Aunt").
  replace(/\buncle\b/gi, "Uncle");
}

function buildHistorySeedUpdate(raw, scope) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const { subject, facets } = splitHistorySeed(trimmed);
  const normalizedSubject = normalizeHistorySubject(subject, scope);
  let normalizedFacets = [...facets];

  if (scope === "family") normalizedFacets = normalizedFacets.map(normalizeFamilyFacet);

  if (scope === "allergy" && !normalizedFacets.length) {
    if (normalizedSubject === "Dust") normalizedFacets = ["3 years", "Active"];
    if (normalizedSubject === "Ibuprofen") normalizedFacets = ["5 years", "Active", "Gastric intolerance"];
  }
  if (scope === "lifestyle" && !normalizedFacets.length) {
    if (normalizedSubject === "Smoking") normalizedFacets = ["2 years", "Active"];
    if (normalizedSubject === "Alcohol") normalizedFacets = ["Occasional", "Active"];
  }
  if (scope === "additional" && normalizedSubject === "Diet" && !normalizedFacets.length) {
    normalizedFacets = ["Mixed diet", "Irregular meal timing during work shifts"];
  }

  const detail = scope === "family" ? normalizedFacets.join(", ") : normalizedFacets.join(" | ");
  return detail ? `${normalizedSubject}: ${detail}` : normalizedSubject;
}

function normalizeLabSeedLabel(label) {
  const lower = label.trim().toLowerCase();
  if (lower === "fasting glucose" || lower === "blood sugar") return "Glucose";
  if (lower === "cholesterol total") return "Cholesterol, Total";
  return label.trim();
}

function buildLabSeedLine(lab) {
  const normalizedLabel = normalizeLabSeedLabel(lab.name);
  const value = String(lab.value ?? "").trim();
  if (!normalizedLabel || !value) return undefined;
  const unit = String(lab.unit ?? "").trim();
  const flag = "flag" in lab ? String(lab.flag ?? "").trim().toLowerCase() : "";
  const unitPart = unit ? ` (${unit})` : "";
  const flagPart = flag && flag !== "normal" ? ` [${flag}]` : "";
  return `${normalizedLabel}${unitPart}${flagPart}: ${value}`;
}

export function buildVoiceConsultSidebarBatch(
patientId,
transcript,
structured)
{
  const batch = {};
  const stamp = Date.now();
  const summary = SMART_SUMMARY_BY_CONTEXT[patientId] ?? SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID];
  const corpus = [
  transcript,
  ...structured.sections.flatMap((section) =>
  section.items.map((item) => [item.name, item.detail].filter(Boolean).join(" "))
  ),
  structured.copyAllPayload.additionalNotes ?? "",
  structured.copyAllPayload.followUpNotes ?? structured.copyAllPayload.followUp ?? ""].

  filter(Boolean).
  join(" . ");

  const add = (sectionId, bullets) => {
    const cleaned = [...new Set(bullets.map((line) => String(line ?? "").trim()).filter(Boolean))];
    if (!cleaned.length) return;
    batch[sectionId] = [{ id: `voice-${sectionId}-${stamp}`, bullets: cleaned }];
  };

  const takeSectionItems = (matcher) =>
  structured.sections.
  filter((section) => matcher.test(section.sectionId) || matcher.test(section.title)).
  flatMap((section) => section.items.map(formatVoiceSidebarItem));

  const symptomLines = takeSectionItems(/symptom/i);
  const examinationLines = takeSectionItems(/exam/i);
  const diagnosisLines = takeSectionItems(/diagnos/i);
  const adviceLines = takeSectionItems(/advice/i);
  const historyLines = compactVoiceLines([
  ...(structured.copyAllPayload.historyChangeSummaries ?? []),
  ...(summary.chronicConditions ?? []).slice(0, 2).map((line) => buildHistorySeedUpdate(line, "condition")),
  ...(summary.allergies ?? []).slice(0, 1).map((line) => buildHistorySeedUpdate(line, "allergy")),
  ...(summary.familyHistory ?? []).slice(0, 2).map((line) => buildHistorySeedUpdate(line, "family")),
  ...(summary.surgicalHistory ?? []).slice(0, 1).map((line) => buildHistorySeedUpdate(line, "surgical")),
  ...(summary.lifestyleNotes ?? []).slice(0, 2).map((line) => buildHistorySeedUpdate(line, "lifestyle")),
  ...(summary.additionalHistory ?? []).slice(0, 1).map((line) => buildHistorySeedUpdate(line, "additional"))],
  8);

  const vitals = [];
  const bpMatch = corpus.match(/\b(?:bp|blood pressure)\s*(?:is|was|of)?\s*(\d{2,3})\s*(?:\/|by)\s*(\d{2,3})/i);
  if (bpMatch) vitals.push(`BP ${bpMatch[1]}/${bpMatch[2]}`);
  const pulseMatch = corpus.match(/\b(?:pulse|heart rate|hr)\s*(?:is|was|of)?\s*(\d{2,3})\b/i);
  if (pulseMatch) vitals.push(`Pulse ${pulseMatch[1]}/min`);
  const spo2Match = corpus.match(/\b(?:spo2|o2 sat(?:uration)?|oxygen saturation)\s*(?:is|was|of)?\s*(\d{2,3})\s*%?/i);
  if (spo2Match) vitals.push(`SpO2 ${spo2Match[1]}%`);
  const rrMatch = corpus.match(/\b(?:rr|resp(?:iratory)?(?:\s+rate)?)\s*(?:is|was|of)?\s*(\d{1,2})\b/i);
  if (rrMatch) vitals.push(`Resp. rate ${rrMatch[1]}/min`);
  const weightMatch = corpus.match(/\bweight\s*(?:is|was|of)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs?)\b/i);
  if (weightMatch) vitals.push(`Weight ${weightMatch[1]} kg`);
  const tempMatch = corpus.match(/\b(?:temp|temperature)\s*(?:is|was|of)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:°?\s*[fc])?/i);
  if (tempMatch) vitals.push(`Temperature ${tempMatch[1]}`);
  if (!vitals.length && summary.todayVitals) {
    if (summary.todayVitals.bp) vitals.push(`BP ${summary.todayVitals.bp}`);
    if (summary.todayVitals.pulse) vitals.push(`Pulse ${summary.todayVitals.pulse}/min`);
    if (summary.todayVitals.spo2) vitals.push(`SpO2 ${summary.todayVitals.spo2}%`);
    if (summary.todayVitals.temp) vitals.push(`Temperature ${summary.todayVitals.temp}`);
    if (summary.todayVitals.rr) vitals.push(`Resp. rate ${summary.todayVitals.rr}/min`);
    if (summary.todayVitals.weight) vitals.push(`Weight ${summary.todayVitals.weight} kg`);
  }
  add("vitals", ["Voice consultation", ...vitals]);
  add("history", ["Voice consultation", ...historyLines]);
  add("labResults", [
  "Voice consultation",
  ...(summary.keyLabs ?? []).slice(0, 5).map((lab) => buildLabSeedLine(lab))]
  );

  const lowerCorpus = corpus.toLowerCase();
  const isGynec =
  patientId === "apt-lakshmi" ||
  /(lmp|menstrual|menses|bleeding|cycle|pcos|pap smear|flow|pads\/day|gynec)/i.test(lowerCorpus);
  const gynecLines = compactVoiceLines([
  ...symptomLines.slice(0, 2),
  ...diagnosisLines.slice(0, 1),
  adviceLines[0],
  summary.gynecData?.lmp ? `LMP: ${summary.gynecData.lmp}` : undefined,
  summary.gynecData?.menarche ? `Age at: ${summary.gynecData.menarche}` : undefined,
  summary.gynecData?.cycleRegularity || summary.gynecData?.cycleLength ?
  `Cycle: ${[summary.gynecData.cycleRegularity, summary.gynecData.cycleLength].filter(Boolean).join(" | ")}` :
  undefined,
  summary.gynecData?.flowIntensity || summary.gynecData?.flowDuration || summary.gynecData?.padsPerDay ?
  `Flow: ${[
  summary.gynecData.flowIntensity,
  summary.gynecData.flowDuration,
  summary.gynecData.padsPerDay ? `Pads/day ${summary.gynecData.padsPerDay}` : undefined].

  filter(Boolean).
  join(" | ")}` :
  undefined,
  summary.gynecData?.painScore ? `Pain: ${summary.gynecData.painScore}` : undefined,
  summary.gynecData?.alerts?.[0],
  structured.copyAllPayload.followUpNotes ? `Follow-up: ${structured.copyAllPayload.followUpNotes}` : undefined,
  structured.copyAllPayload.additionalNotes]
  );
  if (isGynec) add("gynec", ["Voice consultation", ...gynecLines]);

  const isObstetric =
  patientId === "apt-priya" ||
  /(pregnan|gestation|anc|fetal|gravida|edd|kick count|cephalic|fundus height|obstetric)/i.test(lowerCorpus);
  const obstetricLines = compactVoiceLines([
  ...symptomLines.slice(0, 2),
  ...examinationLines.slice(0, 2),
  ...diagnosisLines.slice(0, 1),
  adviceLines[0],
  summary.obstetricData?.lmp ? `LMP: ${summary.obstetricData.lmp}` : undefined,
  summary.obstetricData?.edd ? `EDD: ${summary.obstetricData.edd}` : undefined,
  summary.obstetricData?.gestationalWeeks ? `Gestation: ${summary.obstetricData.gestationalWeeks}` : undefined,
  summary.obstetricData?.bpLatest ? `BP: ${summary.obstetricData.bpLatest}` : undefined,
  summary.obstetricData?.fundusHeight ? `Fundus Height: ${summary.obstetricData.fundusHeight}` : undefined,
  summary.obstetricData?.presentation ? `Presentation: ${summary.obstetricData.presentation}` : undefined,
  summary.obstetricData?.ancDue?.[0],
  structured.copyAllPayload.followUpNotes ? `Follow-up: ${structured.copyAllPayload.followUpNotes}` : undefined,
  structured.copyAllPayload.additionalNotes]
  );
  if (isObstetric) add("obstetric", ["Voice consultation", ...obstetricLines]);

  if (structured.copyAllPayload.additionalNotes?.trim()) {
    add("personalNotes", [structured.copyAllPayload.additionalNotes.trim()]);
  }

  return batch;
}