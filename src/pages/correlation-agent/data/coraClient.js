/**
 * CORA v2 client — POST /api/v2/patient-analysis.
 *
 * One call does everything: hand it the patient and their reports (hosted file
 * URLs, raw text, or both) and it fetches, OCRs, extracts Findings, then runs
 * the three stage reasoning core, streaming the whole thing back over one SSE
 * connection. There is no separate extract-then-analyze dance any more, and no
 * client-side extraction: medical records finally contribute real findings
 * because the service reads the PDFs itself.
 *
 * CALLED DIRECTLY FROM THE BROWSER, which needs CORS on the service. Measured
 * on 8 Sep 2026, before the backend was asked to enable it:
 *
 *   OPTIONS /api/v2/patient-analysis            -> 405 Method Not Allowed
 *   POST    /api/v2/patient-analysis (200 SSE)  -> no access-control-allow-origin
 *
 * A JSON body plus the custom X-API-Key header forces a preflight, so until
 * that preflight answers 204 with our origin allowed, every call fails at the
 * browser and the drawer reports the service as unreachable. The dev proxy that
 * used to stand in for this is gone; restore it from git history if the backend
 * change slips and local testing is needed before then.
 *
 * SECURITY, READ BEFORE PROD.
 * The key below is a single shared secret with full access to the UAT service,
 * and it is PUBLIC: calling CORA from the browser ships it in the JS bundle,
 * where any visitor can read it from devtools. Writing it here rather than in
 * an env var changes nothing about that — REACT_APP_* is compiled in exactly
 * the same way — it only means the UAT deploy needs no new build-arg wiring
 * (the workflow passes each REACT_APP_* explicitly, so a new one would need
 * both the workflow and the Dockerfile changed).
 *
 * Accepted for UAT ONLY, deliberately, so the branch can be tried on a
 * deployed environment. Before prod:
 *   - this constant must go, replaced by a backend route that holds the key
 *     server-side, which is what CORA's own integration guide asks for;
 *   - this UAT key should be rotated, since it is in git history from here on.
 * The env var still wins where it is set, so a deployment can override it
 * without touching this file.
 */

const BASE = (process.env.REACT_APP_CORA_ORIGIN || "https://zy-cora-agent-uat.zyvelorlabs.ai") + "/api";
const CORA_UAT_API_KEY = process.env.REACT_APP_CORA_KEY || ""; // removed from the hosted preview; never commit credentials
const API_KEY = process.env.REACT_APP_CORA_API_KEY || CORA_UAT_API_KEY;

/** Every call carries the key and, for the POST, asks for the stream. */
function headers(extra) {
  return { ...(API_KEY ? { "x-api-key": API_KEY } : {}), ...extra };
}

/* Vocabulary from the v2 contract. Note "Moderate", not "Medium": the chart
   speaks the API's language rather than translating it, so a value that
   appears on screen can be grepped for in the response. */
export const EVIDENCE = ["Strong", "Moderate", "Low", "Speculative"];

/** Can we actually reach CORA from this browser?
 *
 *  Three ways to fail and they look different: no key configured at all, a
 *  cross-origin block (fetch rejects, so the catch), or the service answering
 *  something that is not JSON. All of them mean "do not offer to run". */
export async function isLive() {
  if (!API_KEY) return false;
  try {
    const res = await fetch(`${BASE}/session`, {
      headers: headers({ accept: "application/json" }),
    });
    if (!res.ok) return false;
    return (res.headers.get("content-type") || "").includes("json");
  } catch {
    return false;
  }
}

/**
 * Build the request body from what the EMR already holds.
 *
 * Two kinds of report go up, because we hold two kinds:
 *
 *   file_urls  medical records. Real hosted PDFs and images. The service
 *              fetches and OCRs them, which is why records now yield findings
 *              instead of the "read when correlated" placeholder they showed
 *              while extraction did not exist on our side.
 *
 *   raw_text   lab results. These never were files: they arrive from the lab
 *              params API already structured, so rendering them back into a
 *              PDF just to have something to OCR would be a round trip through
 *              a lossy format. They go up as text, one block per panel, in the
 *              layout a lab report uses so the extractor sees what it expects.
 */
export function buildRequest({ patient, reports }) {
  const files = [];
  const texts = [];

  (reports || []).forEach((r) => {
    if (r.source === "records" && r.pdf) {
      files.push({
        url: r.pdf,
        filename: r.name ? `${r.name}.pdf` : "record.pdf",
        report_type_hint: hintFor(r.modality),
      });
      return;
    }
    const text = panelAsText(r);
    if (text) {
      texts.push({
        filename: `${slug(r.name)}.txt`,
        report_type_hint: hintFor(r.modality),
        text,
      });
    }
  });

  return {
    patient: {
      patient_id: String(patient?.id || "unknown"),
      ...(patient?.age != null ? { age: Number(patient.age) } : {}),
      ...(patient?.sex ? { sex: String(patient.sex).toLowerCase() } : {}),
      ...(patient?.history?.length ? { past_medical_history: patient.history } : {}),
    },
    reports: { file_urls: files, raw_text: texts },
    options: { use_knowledge_base: true, include_diagnosis_in_context: false },
  };
}

const slug = (s) => String(s || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function hintFor(modality) {
  const m = String(modality || "").toLowerCase();
  if (m.includes("radiolog") || m.includes("imaging")) return "radiology";
  if (m.includes("haemat") || m.includes("hemat")) return "haematology";
  return "clinical_pathology";
}

/** A lab panel rendered the way a lab prints one, so the extractor reads it. */
function panelAsText(r) {
  const rows = r.rows || [];
  if (!rows.length) return "";
  const head = `${(r.name || "REPORT").toUpperCase()}${r.date ? `\nReport date: ${r.date}` : ""}`;
  const cols = "Investigation\tResult\tReference Range\tUnit\tFlag";
  const body = rows
    .map((row) => {
      const unit = String(row.unit || "").replace(/[()]/g, "").trim();
      const flag = row.abnormal ? (row.direction === "low" ? "LOW" : "HIGH") : "NORMAL";
      return [row.label, row.value, row.ref || "", unit, flag].join("\t");
    })
    .join("\n");
  return `${head}\n${cols}\n${body}`;
}

/**
 * Run an analysis, reporting every SSE event as it lands.
 *
 * EventSource cannot POST, so the stream is read off the response body and
 * framed by hand. Blocks are separated by a blank line; the trailing partial
 * block stays in the buffer until the next chunk completes it.
 */
export async function analyze({ body, onEvent, signal }) {
  const res = await fetch(`${BASE}/v2/patient-analysis`, {
    method: "POST",
    headers: headers({ "content-type": "application/json", accept: "text/event-stream" }),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`patient-analysis ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) {
      const lines = block.split("\n");
      const evLine = lines.find((l) => l.startsWith("event:"));
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (!evLine || !dataLine) continue;
      const event = evLine.slice(6).trim();
      let data = null;
      try {
        data = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (onEvent) onEvent(event, data);
      if (event === "final_result") final = data;
      if (event === "error") throw new Error(data?.detail || "correlation failed");
    }
  }
  if (!final) throw new Error("stream ended without a result");
  return final;
}

/* ------------------------------------------------------ response → our shapes */

const TIER_OF = { Strong: "strong", Moderate: "medium", Low: "low", Speculative: "low" };
const BAND = { Strong: 3, Moderate: 2, Low: 1, Speculative: 1 };

/** A finding's value as one readable string: "10.2 g/dL". */
function reading(f) {
  const raw = f?.value?.raw;
  const unit = f?.value?.unit;
  if (raw == null || raw === "") return "";
  return [String(raw), unit].filter(Boolean).join(" ");
}

/**
 * A knowledge citation as one readable line.
 *
 * The field is typed loosely: some runs return a plain string, others an object
 * describing the rule. Rendering it straight put a literal "[object Object]"
 * under "Guide rule" in the detail panel. Only real text is shown — an object
 * we cannot read a sentence out of is dropped, because a citation nobody can
 * read is worse than no citation.
 */
function citationText(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (typeof raw !== "object") return String(raw);
  /* Most specific first: the rule's own words, then a title, then a source. */
  const text = ["text", "rule", "statement", "content", "summary", "title", "label", "name", "citation", "source"]
    .map((k) => raw[k])
    .find((v) => typeof v === "string" && v.trim());
  if (!text) return null;
  const where = ["source", "reference", "guideline"]
    .map((k) => raw[k])
    .find((v) => typeof v === "string" && v.trim() && v.trim() !== text.trim());
  return where ? `${text.trim()} — ${where.trim()}` : text.trim();
}

/**
 * Adapt a final_result into what the chart renders.
 *
 * The shapes stay ours, so the chart did not have to be rewritten around the
 * API. What changed is where they come from: every one of these was invented
 * in a fixture before, and every one is now the service's own output.
 */
export function adaptRun(result) {
  const findings = (result.findings || []).map((f) => ({
    id: f.finding_id,
    report: f.source_report || "report",
    name: f?.concept?.display || "Finding",
    value: reading(f),
    ref: f.reference_range || "",
    flag: f.flag || "NORMAL",
    modality: f.modality || "clinical pathology",
    loinc: f?.concept?.code && f.concept.code !== "N/A" ? f.concept.code : "not coded",
    confidence: f?.provenance?.extraction_confidence != null
      ? `${Math.round(f.provenance.extraction_confidence * 100)}%`
      : "",
  }));

  const byFindingId = new Set(findings.map((f) => f.id));

  const correlations = (result.correlations || []).map((c) => ({
    id: c.correlation_id,
    name: c.label,
    relationship: c.relationship_type,
    evidence: c.evidence_strength,
    verdict: c.challenger_verdict,
    support: c.support_type,
    mechanism: c.mechanism,
    attack: c.challenger_attack,
    citation: citationText((c.knowledge_citations || [])[0]),
  }));

  const byCorrId = new Set(correlations.map((c) => c.id));

  /* "Hypothesis" in the API, and deliberately NOT called a diagnosis in the
     UI: a backend guardrail guarantees these labels carry no disease name, so
     presenting one as a diagnosis would overstate what the service returned. */
  const patterns = (result.hypotheses || []).map((h) => ({
    id: h.hypothesis_id,
    name: h.label,
    confidence: h.confidence_tier,
    tier: TIER_OF[h.confidence_tier] || "low",
    status: h.status,
    leading: h.status === "leading",
    rationale: h.rationale,
    alternatives: (h.alternatives_not_ruled_out || []).join(" "),
    investigations: [],
  }));

  const links = [];
  (result.correlations || []).forEach((c) => {
    (c.finding_ids || []).forEach((fid) => {
      if (byFindingId.has(fid)) links.push([fid, c.correlation_id, BAND[c.evidence_strength] || 1]);
    });
  });
  (result.hypotheses || []).forEach((h) => {
    (h.correlation_ids || []).forEach((cid) => {
      if (!byCorrId.has(cid)) return;
      const c = (result.correlations || []).find((x) => x.correlation_id === cid);
      links.push([cid, h.hypothesis_id, BAND[c?.evidence_strength] || 1]);
    });
  });

  /* A finding no correlation cites has nothing to flow into. It is still real
     data, so it is kept and marked rather than dropped: the chart says "not
     used" beside it, which is a statement about the reasoning, not the value. */
  const used = new Set(links.map(([from]) => from));
  findings.forEach((f) => {
    if (!used.has(f.id)) f.orphan = true;
  });

  return {
    findings,
    correlations,
    hypotheses: patterns,
    links,
    meta: {
      patientId: result.patient_id,
      iterations: result.iterations_run,
      converged: result.converged,
      cardinality: result.cardinality,
      openQuestions: result.open_questions || [],
      missingOrderedTests: result.missing_ordered_tests || [],
      disclaimer: result.disclaimer,
      announcedHypotheses: (result.hypotheses || []).length,
      deliveredHypotheses: (result.hypotheses || []).length,
      weakened: (result.correlations || []).filter((c) => c.challenger_verdict === "weakened").length,
      corrections: 0,
    },
  };
}
