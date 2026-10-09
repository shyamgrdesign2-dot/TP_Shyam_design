import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  askChartSearch,
  buildCitedEvidence,
  getChartSearchToken,
  setChartSearchToken,
} from "./api";
import styles from "./ChartSearchPanel.module.css";

/**
 * Chart Search: ask one patient's record a question and get an answer where
 * every claim links to the dated record it came from.
 *
 * The shape follows the concept prototype and the review that came with it: a
 * wide search box that is the first thing on the page rather than a chip the
 * doctor has to discover, starter prompts so they can see what it can be asked,
 * and results underneath. Evidence is the point, not a footnote - each cited
 * record carries a collapsible Source block naming the system, table and row
 * the value was read from.
 */

const STARTER_PROMPTS = [
  "What medications were recorded?",
  "What changed across this patient's recent records?",
  "What was the latest recorded blood pressure?",
  "What lab results are on file?",
];

/* Rotating hints, in the manner of a marketplace search box: they teach what
   can be asked without spending a row on instructions. */
const PLACEHOLDERS = [
  "Ask this chart anything — drugs, symptoms, labs, advice given...",
];

export default function ChartSearchPanel({ mrn, patientName }) {
  const [question, setQuestion] = useState("");
  const [stages, setStages] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);
  const [isBusy, setBusy] = useState(false);
  const [needsToken, setNeedsToken] = useState(!getChartSearchToken());
  const [tokenDraft, setTokenDraft] = useState("");
  const abortRef = useRef(null);

  const cited = useMemo(() => buildCitedEvidence(answer), [answer]);

  const run = useCallback(
    async (text) => {
      const q = String(text || "").trim();
      if (!q || !mrn) return;

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBusy(true);
      setError(null);
      setAnswer(null);
      setStages([]);

      try {
        const result = await askChartSearch(
          { question: q, mrn },
          {
            signal: controller.signal,
            onStage: (stage) =>
              setStages((prev) => [...prev.filter((s) => s.id !== stage.id), stage]),
          }
        );
        setAnswer(result);
      } catch (err) {
        if (err.name === "AbortError") return;
        if (err.code === "unauthorized") setNeedsToken(true);
        setError(err.message || "Chart Search failed.");
      } finally {
        setBusy(false);
      }
    },
    [mrn]
  );

  if (needsToken) {
    return (
      <div className={styles.tokenGate}>
        <div className={styles.tokenTitle}>Connect Chart Search</div>
        <p className={styles.tokenHint}>
          The clinical archive is a separate service with its own doctor session. Paste a
          JWT minted for that environment to continue.
        </p>
        <div className={styles.tokenRow}>
          <input
            type="password"
            className={styles.tokenInput}
            placeholder="eyJ… or Bearer eyJ…"
            value={tokenDraft}
            onChange={(e) => setTokenDraft(e.target.value)}
          />
          <button
            type="button"
            className={styles.tokenSave}
            disabled={!tokenDraft.trim()}
            onClick={() => {
              setChartSearchToken(tokenDraft.trim());
              setTokenDraft("");
              setNeedsToken(false);
            }}
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* ── The search box: wide, first, and obviously a place to type ── */}
      <form
        className={styles.searchWrap}
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
      >
        <span className={styles.searchIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.6-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <input
          className={styles.searchInput}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={PLACEHOLDERS[0]}
          aria-label="Ask this chart"
        />
        {patientName && <span className={styles.scopeChip}>{patientName}</span>}
        <button type="submit" className={styles.askBtn} disabled={isBusy || !question.trim()}>
          {isBusy ? "Searching…" : "Ask"}
        </button>
      </form>

      <div className={styles.prompts}>
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className={styles.promptChip}
            onClick={() => {
              setQuestion(p);
              run(p);
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Retrieval stages, so the wait is legible rather than a bare spinner. */}
      {isBusy && !!stages.length && (
        <div className={styles.stages}>
          {stages.map((s) => (
            <span key={s.id} className={styles.stage}>
              {s.id}
              {s.state === "done" ? " ✓" : "…"}
              {s.passages != null ? ` ${s.passages} passages` : ""}
            </span>
          ))}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {answer && <ChartSearchAnswer answer={answer} cited={cited} />}
    </div>
  );
}

function ChartSearchAnswer({ answer, cited }) {
  const retrieval = answer.retrieval || {};
  const noEvidence = !cited.length;

  return (
    <div className={styles.answerCard}>
      <div className={styles.scopeBar}>
        <span>
          Scope <strong>{(answer.context && answer.context.mrn) || "patient"}</strong>
        </span>
        <span>→</span>
        <span>{(retrieval.sections || []).join(", ") || "archive"}</span>
        <span>→</span>
        <span>{retrieval.units_matched ?? 0} matched</span>
        <span>→</span>
        <span>{cited.length} cited</span>
      </div>

      <div className={styles.answerLabel}>
        Answer · every claim below links to a dated record
      </div>

      <div className={styles.answerBody}>
        {(answer.segments && answer.segments.length
          ? answer.segments
          : [{ text: answer.text, citation_numbers: [] }]
        ).map((seg, i) => (
          <p key={i} className={styles.segment}>
            {seg.text}{" "}
            {(seg.citation_numbers || []).map((n) => (
              <a key={n} href={`#chart-evidence-${n}`} className={styles.cite}>
                {n}
              </a>
            ))}
          </p>
        ))}
      </div>

      {noEvidence ? (
        <div className={styles.noEvidence}>
          No matching records in the archive for this question.
        </div>
      ) : (
        <>
          <div className={styles.evidenceLabel}>Evidence — {cited.length} records</div>
          {cited.map((row) => (
            <EvidenceRow key={row.number} row={row} />
          ))}
        </>
      )}
    </div>
  );
}

function EvidenceRow({ row }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const { number, citation, evidence } = row;
  const value =
    evidence && evidence.value_num != null
      ? `${evidence.value_num}${evidence.unit ? ` ${evidence.unit}` : ""}`
      : (evidence && evidence.value_text) || "";

  return (
    <div className={styles.evidence} id={`chart-evidence-${number}`}>
      <div className={styles.evidenceHead}>
        <span className={styles.evidenceNum}>{number}</span>
        <span className={styles.evidenceTitle}>
          {(evidence && evidence.code) || citation.section || citation.resource_kind}
        </span>
        <span className={styles.evidenceMeta}>
          {citation.event_date} · {citation.resource_kind}
          {citation.visit_id ? ` · ${citation.visit_id}` : ""}
        </span>
      </div>

      {(value || (evidence && evidence.status)) && (
        <div className={styles.valueRow}>
          {value && (
            <span className={styles.valueCell}>
              <span className={styles.valueLabel}>Value</span>
              <span className={styles.valueNum}>{value}</span>
            </span>
          )}
          {evidence && evidence.status && (
            <span className={styles.valueCell}>
              <span className={styles.valueLabel}>Status</span>
              <span className={styles.valueNum}>{evidence.status}</span>
            </span>
          )}
          {/* Reference range deliberately absent: the archive does not return
              one on any resource today (verified across MedicationRequest and
              Observation payloads). Showing a guessed range next to a real
              value would undo the trust this whole panel exists to build. */}
        </div>
      )}

      <button
        type="button"
        className={styles.sourceToggle}
        onClick={() => setSourceOpen((v) => !v)}
        aria-expanded={sourceOpen}
      >
        {sourceOpen ? "Hide source" : "Source"}
        <span className={styles.sourceSystem}>
          {evidence ? `${evidence.source_system} · ${evidence.source_table}` : citation.source_path}
        </span>
      </button>

      {sourceOpen && (
        <div className={styles.sourceBody}>
          <dl className={styles.sourceGrid}>
            <SourceItem label="Source path" value={citation.source_path} />
            <SourceItem label="Record id" value={evidence && evidence.source_key} />
            <SourceItem label="System" value={evidence && evidence.source_system} />
            <SourceItem label="Table" value={evidence && evidence.source_table} />
            <SourceItem label="Visit" value={citation.visit_id} />
            <SourceItem label="Recorded" value={evidence && evidence.event_at} />
            <SourceItem label="Provenance" value={citation.provenance} />
            <SourceItem label="Lane" value={evidence && evidence.lane} />
          </dl>
          {evidence && evidence.fhir_source && (
            <pre className={styles.raw}>{JSON.stringify(evidence.fhir_source, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function SourceItem({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt className={styles.sourceKey}>{label}</dt>
      <dd className={styles.sourceVal}>{String(value)}</dd>
    </>
  );
}
