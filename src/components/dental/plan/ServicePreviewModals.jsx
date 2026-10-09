/**
 * ServicePreviewModals — Rx preview drawer wrappers for consultation and
 * quick-visit (sitting) entries in the treatment plan timeline.
 *
 * Exports: ConsultationPreviewCard, QuickVisitRxPreview
 */
import { useEffect, useState, Children } from "react";
import { DocumentDownload, Edit2, Printer } from "iconsax-reactjs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { RxPreviewDocument } from "../tp-rxpad/RxPreviewDocument";
import { getComposedRxPreviewSnapshot } from "../tp-rxpad/rx-preview-composer";
import {
  buildConsultationRxUrl,
  CloseSquareIcon,
  PLAN_DRAWER_PANEL_CLASS,
} from "./plan-shared";
import dui from "../dental-ui.module.scss";
import styles from "./InProgressTab.module.scss";

// ─── Local helpers ──────────────────────────────────────────

const cx = (...classes) => classes.filter(Boolean).join(" ");

/** View Rx — icon-text button without outer border (matches preview). */
const VIEW_RX_SECONDARY_CLASS = styles.viewRxBtn;
/** Preview drawer icon buttons. */
const PREVIEW_RX_ICON_BTN_CLASS = styles.previewRxIconBtn;

function downloadSnapshotTxt(snapshot) {
  const lines = [];
  lines.push("Digital Rx");
  lines.push("");
  if (snapshot) {
    const pushSection = (title, rows) => {
      if (!rows?.length) return;
      lines.push(title);
      rows.forEach((row) => {
        const suffix = row.metaParts?.length
          ? ` (${row.metaParts.join(" | ")})`
          : "";
        lines.push(`- ${row.title}${suffix}`);
      });
      lines.push("");
    };
    pushSection("Symptoms", snapshot.symptoms);
    pushSection("Examination", snapshot.examinations);
    pushSection("Diagnosis", snapshot.diagnoses);
    pushSection("Lab Investigation", snapshot.labInvestigations);
    pushSection("Medication (Rx)", snapshot.medications);
    pushSection("Advice", snapshot.advice);
  } else {
    lines.push("No Rx data available yet.");
  }
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digital-rx.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Consultation summary rendering helpers ─────────────────

/** Inline consultation summary surface. */
function ConsultationSummarySurface({ children, className = "" }) {
  const parts = Children.toArray(children);
  const summary = parts[0];
  const actions = parts.slice(1);
  return (
    <div className={`${styles.consultationSummary} ${className}`}>
      <span className={styles.label}>Consultation summary:</span>{" "}
      <span className={styles.text}>{summary}</span>
      {actions.length ? (
        <div className={styles.actions}>{actions}</div>
      ) : null}
    </div>
  );
}

function segmentConsultSummaryLines(raw) {
  if (!raw?.trim()) return [];
  const rows = [];
  const pushRow = (badge, tone, text) => {
    const t = text?.trim();
    if (t) rows.push({ badge, tone, text: t });
  };
  const lines = raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const p of lines) {
    if (!p) continue;
    const sx = /^symptoms?:\s*(.+)$/i.exec(p);
    if (sx) { pushRow("Sx", "emerald", sx[1]); continue; }
    const dx = /^diagnosis:\s*(.+)$/i.exec(p);
    if (dx) { pushRow("Dx", "violet", dx[1]); continue; }
    const ex = /^examination:\s*(.+)$/i.exec(p);
    if (ex) { pushRow("Ex", "cyan", ex[1]); continue; }
    const lab = /^lab\s*investigation:\s*(.+)$/i.exec(p);
    if (lab) { pushRow("Lab", "amber", lab[1]); continue; }
    const med = /^medication:\s*(.+)$/i.exec(p);
    if (med) { pushRow("Rx", "rose", med[1]); continue; }
    const adv = /^(?:advice|adv)\s*:\s*(.+)$/i.exec(p);
    if (adv) { pushRow("Adv", "slate", adv[1]); continue; }
    if (
      /^tooth\s*:\s*/i.test(p) ||
      /^tooth\s+/i.test(p) ||
      /^T\d+/i.test(p)
    ) {
      pushRow("Tooth", "blue", p.replace(/^tooth\s*:?\s*/i, ""));
      continue;
    }
    const proc = /^(?:procedure|Tx\s*history)\s*:?\s*(.+)$/i.exec(p);
    if (proc) { pushRow("Proc", "indigo", proc[1]); continue; }
    pushRow(null, "neutral", p);
  }
  return rows;
}

function extractToothFdiToken(text) {
  const m =
    /\bT\s*(\d{2})\b/i.exec(text) ??
    /\((T?\d{2})\)/.exec(text) ??
    /\b(\d{2})\s*(?:\)|$|,|\s)/.exec(text);
  if (!m) return null;
  const d = (m[1] ?? m[0]).replace(/^T/i, "");
  return /^\d{2}$/.test(d) ? `T${d}` : null;
}

function compactToothSummaryText(text) {
  let t = text
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  t = t.replace(/^tooth\s*:?\s*/i, "").trim();
  return t;
}

function buildProseConsultSummary(raw, maxLen = 400) {
  const rows = segmentConsultSummaryLines(raw);
  const pushUnique = (arr, s) => {
    const x = s?.trim();
    if (x && !arr.includes(x)) arr.push(x);
  };
  if (!rows.length) {
    const t = raw?.trim();
    if (!t) return "";
    const softened = t
      .replace(
        /\b(?:symptoms?|diagnosis|examination|lab\s*investigation|medication|adv(?:ice)?|procedure|Tx\s*history)\s*:\s*/gi,
        ""
      )
      .split(/\s*·\s*/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join(". ")
      .replace(/\s+/g, " ")
      .trim();
    let out = softened || t;
    if (out.length > maxLen) out = `${out.slice(0, maxLen - 1).trimEnd()}…`;
    return out;
  }
  const sx = [], ex = [], dx = [], lab = [], rx = [], adv = [],
    tooth = [], proc = [], other = [];
  for (const r of rows) {
    const txt = r.text?.trim();
    if (!txt) continue;
    switch (r.badge) {
      case "Sx": pushUnique(sx, txt); break;
      case "Ex": pushUnique(ex, txt); break;
      case "Dx": pushUnique(dx, txt); break;
      case "Lab": pushUnique(lab, txt); break;
      case "Rx": pushUnique(rx, txt); break;
      case "Adv": pushUnique(adv, txt); break;
      case "Tooth": {
        const fdi = extractToothFdiToken(txt);
        const afterParen = txt
          .replace(/^[\s\S]*?\)\s*(?:·|,|\s)*\s*/m, "")
          .trim();
        if (fdi && afterParen) pushUnique(tooth, `${fdi} — ${afterParen}`);
        else if (fdi) pushUnique(tooth, fdi);
        else pushUnique(tooth, compactToothSummaryText(txt));
        break;
      }
      case "Proc": pushUnique(proc, txt); break;
      default: pushUnique(other, txt);
    }
  }
  const chunks = [];
  if (sx.length) chunks.push(sx.join("; "));
  if (ex.length) chunks.push(ex.join("; "));
  if (dx.length) chunks.push(`Diagnosis ${dx.join("; ")}`);
  if (tooth.length) chunks.push(tooth.join("; "));
  if (proc.length) chunks.push(proc.join("; "));
  if (lab.length) chunks.push(`Labs ${lab.join("; ")}`);
  if (rx.length) chunks.push(`Rx ${rx.join("; ")}`);
  if (adv.length) chunks.push(`Advice ${adv.join("; ")}`);
  if (other.length) chunks.push(other.join("; "));
  let out = chunks.join(". ").replace(/\s+/g, " ").trim();
  if (out) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
    if (!/[.!?]$/.test(out)) out += ".";
  }
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 1).trimEnd()}…`;
  return out;
}

function splitToothSnippetRow(text) {
  const trimmed = text.trim();
  const sep = trimmed.match(/^(.+?)\s*[·—]\s+([\s\S]+)$/);
  if (sep) return { title: sep[1].trim(), body: sep[2].trim() };
  return { title: trimmed, body: "" };
}

function formatInlineSnippetPart(row) {
  if (row.badge === "Tooth") {
    const { title, body } = splitToothSnippetRow(row.text);
    return body ? `${title}: ${body}` : title;
  }
  if (row.badge === "Proc") return `Procedure: ${row.text}`;
  return row.text;
}

/**
 * Renders the consultation summary body as prose or structured snippets.
 * Exported so ServiceTimeline can use it for sitting notes.
 *
 * @param {string} raw
 * @param {{ inSurface?: boolean }} opts
 */
export function renderConsultSummarySnippetBody(raw, { inSurface = false } = {}) {
  const pad = inSurface ? "pl-[0px]" : "pl-[4px]";
  const rows = segmentConsultSummaryLines(raw);
  if (inSurface) {
    if (!rows.length) {
      const prose = buildProseConsultSummary(raw);
      return prose ? (
        <span className={`${styles.proseSummary} ${styles.hasText} ${pad}`}>
          {prose}
        </span>
      ) : (
        <span className={`${styles.proseSummary} ${styles.noText} ${pad}`}>
          No summary text.
        </span>
      );
    }
    const inlineText = rows
      .map((r) => formatInlineSnippetPart(r))
      .filter(Boolean)
      .join(" | ");
    return inlineText ? (
      <span className={`${styles.proseSummary} ${styles.hasText} ${pad}`}>
        {inlineText}
      </span>
    ) : (
      <span className={`${styles.proseSummary} ${styles.noText} ${pad}`}>
        No summary text.
      </span>
    );
  }
  if (!rows.length) {
    const t = raw?.trim();
    return t ? (
      <p className={`${styles.proseSummary} ${styles.hasText} ${pad}`}>{t}</p>
    ) : (
      <p className={`${styles.proseSummary} ${styles.noText} ${pad}`}>
        No summary text.
      </p>
    );
  }
  return (
    <p className={`${styles.proseSummary} ${styles.structured} ${pad}`}>
      {rows.map((r, i) => (
        <span key={i}>
          {i > 0 && <span className={styles.separator}> · </span>}
          {r.badge && <span className={styles.badge}>{r.badge}: </span>}
          <span className={styles.content}>{r.text}</span>
        </span>
      ))}
    </p>
  );
}

// ─── ConsultationPreviewCard ────────────────────────────────

/**
 * Renders a single consultation entry — either as an inline snippet surface
 * (variant="snippet") or as a standalone summary card (variant="card").
 * Includes the "View Rx" drawer trigger.
 *
 * @param {{ c: object, appointmentItems: object[], patientId: string|number,
 *   plan: object, service: object, embedInPatientShell: boolean,
 *   underAppointment?: boolean, variant?: string,
 *   previewOpen?: boolean, onPreviewOpenChange?: Function,
 *   hideViewRxButton?: boolean }} props
 */
export function ConsultationPreviewCard({
  c,
  appointmentItems,
  patientId,
  plan,
  service,
  embedInPatientShell,
  underAppointment = false,
  variant = "card",
  previewOpen: previewOpenControlled,
  onPreviewOpenChange: setPreviewOpenControlled,
  hideViewRxButton = false,
}) {
  const [previewOpenInternal, setPreviewOpenInternal] = useState(false);
  const isPreviewControlled =
    previewOpenControlled !== undefined &&
    setPreviewOpenControlled !== undefined;
  const previewOpen = isPreviewControlled
    ? Boolean(previewOpenControlled)
    : previewOpenInternal;
  const setPreviewOpen = (v) => {
    if (isPreviewControlled) setPreviewOpenControlled(v);
    else setPreviewOpenInternal(v);
  };

  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!previewOpen) return;
    setSnapshot(getComposedRxPreviewSnapshot(patientId));
  }, [previewOpen, patientId]);

  const fromAppt = c.source === "appointment" && c.appointmentId;
  const appt = fromAppt
    ? appointmentItems.find((a) => a.id === c.appointmentId)
    : null;
  const tag =
    fromAppt && appt
      ? `Linked · ${appt.date} · ${appt.time}`
      : "Treatment visit (no appointment)";
  const ended = c.endedAt?.includes("T")
    ? c.endedAt.slice(0, 16).replace("T", " · ")
    : c.endedAt ?? "";
  const metaLine =
    underAppointment && fromAppt
      ? ended
        ? `Ended · ${ended}`
        : "Saved from this visit's Rx"
      : ended
      ? `${tag} · ${ended}`
      : tag;

  const rxHref = buildConsultationRxUrl(
    patientId,
    plan.id,
    service.id,
    c.appointmentId,
    embedInPatientShell,
    service.treatment
  );

  const snippet = (
    <>
      {renderConsultSummarySnippetBody(c.summaryText ?? "", {
        inSurface: variant === "snippet",
      })}
      {!hideViewRxButton && (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={
            variant === "snippet"
              ? `${VIEW_RX_SECONDARY_CLASS}`
              : `mt-[10px] ${VIEW_RX_SECONDARY_CLASS}`
          }
        >
          View Rx
        </button>
      )}
    </>
  );

  return (
    <>
      {variant === "snippet" ? (
        <ConsultationSummarySurface>{snippet}</ConsultationSummarySurface>
      ) : (
        <div className={styles.previewSummaryCard}>
          <div className={styles.previewSummaryHeader}>
            <p className={styles.previewSummaryTitle}>Rx summary</p>
            <span className={styles.previewSummaryMeta}>{metaLine}</span>
          </div>
          <div className={styles.previewSummaryBody}>{snippet}</div>
        </div>
      )}

      <TPDrawer open={previewOpen} onOpenChange={setPreviewOpen}>
        <TPDrawerContent
          side="right"
          size="xl"
          className={`${styles.previewDrawerPanel} ${PLAN_DRAWER_PANEL_CLASS}`}
        >
          <div className={dui.drawerHeader}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className={dui.drawerCloseBtn}
                  aria-label="Close preview"
                >
                  <CloseSquareIcon size={24} color="var(--tp-slate-700)" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Close
              </TooltipContent>
            </Tooltip>
            <div className={dui.drawerDivider} aria-hidden={true} />
            <h2 className={dui.drawerTitle}>Preview Rx</h2>
            <div className={cx(dui.drawerAction, styles.drawerActionRow)}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={() => downloadSnapshotTxt(snapshot)}
                    className={PREVIEW_RX_ICON_BTN_CLASS}
                    aria-label="Download Rx"
                  >
                    <DocumentDownload size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Download Rx
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={PREVIEW_RX_ICON_BTN_CLASS}
                    aria-label="Print Rx"
                  >
                    <Printer size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Print Rx
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewOpen(false);
                      window.location.assign(rxHref);
                    }}
                    className={PREVIEW_RX_ICON_BTN_CLASS}
                    aria-label="Edit RX"
                  >
                    <Edit2 size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Edit RX
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className={styles.previewDrawerBody}>
            <RxPreviewDocument snapshot={snapshot} />
          </div>
        </TPDrawerContent>
      </TPDrawer>
    </>
  );
}

// ─── QuickVisitRxPreview ────────────────────────────────────

/**
 * Preview Rx drawer for a quick-visit (sitting) entry — shows consultation
 * notes + composed digital Rx.
 *
 * @param {{ sit: object, patientId: string|number, plan: object,
 *   service: object, embedInPatientShell: boolean,
 *   previewOpen: boolean, onOpenChange: Function }} props
 */
export function QuickVisitRxPreview({
  sit,
  patientId,
  plan,
  service,
  embedInPatientShell,
  previewOpen,
  onOpenChange,
}) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!previewOpen) return;
    setSnapshot(getComposedRxPreviewSnapshot(patientId));
  }, [previewOpen, patientId]);

  const rxHref = buildConsultationRxUrl(
    patientId,
    plan.id,
    service.id,
    undefined,
    embedInPatientShell,
    service.treatment
  );
  const notesRaw = String(sit.notes ?? "").trim();

  return (
    <TPDrawer open={previewOpen} onOpenChange={onOpenChange}>
      <TPDrawerContent
        side="right"
        size="xl"
        className={`${styles.previewDrawerPanel} ${PLAN_DRAWER_PANEL_CLASS}`}
      >
        <div className={dui.drawerHeader}>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild={true}>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={dui.drawerCloseBtn}
                aria-label="Close preview"
              >
                <CloseSquareIcon size={24} color="var(--tp-slate-700)" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Close
            </TooltipContent>
          </Tooltip>
          <div className={dui.drawerDivider} aria-hidden={true} />
          <h2 className={dui.drawerTitle}>Preview Rx</h2>
          <div className={cx(dui.drawerAction, styles.drawerActionRow)}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => downloadSnapshotTxt(snapshot)}
                  className={PREVIEW_RX_ICON_BTN_CLASS}
                  aria-label="Download Rx"
                >
                  <DocumentDownload size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Download Rx
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={PREVIEW_RX_ICON_BTN_CLASS}
                  aria-label="Print Rx"
                >
                  <Printer size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Print Rx
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.assign(rxHref);
                  }}
                  className={PREVIEW_RX_ICON_BTN_CLASS}
                  aria-label="Edit RX"
                >
                  <Edit2 size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Edit RX
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className={styles.previewDrawerBody}>
          <div className={styles.previewDrawerBodyInner}>
            <RxPreviewDocument
              snapshot={snapshot}
              extraNotes={notesRaw || undefined}
            />
          </div>
        </div>
      </TPDrawerContent>
    </TPDrawer>
  );
}
