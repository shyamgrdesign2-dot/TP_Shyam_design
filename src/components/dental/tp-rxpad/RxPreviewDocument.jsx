import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Calendar2, Notepad2 } from "iconsax-reactjs";
import { Building2 } from "lucide-react";
import { ToothIcon } from "../ToothIcon";
import { TPMedicalIcon } from "../tp-ui";
import rx from "./RxPreviewDocument.module.scss";
import { getAppointmentPatient } from "../lib/appointment-patients";
import { FlatDentitionChart, OralExamReport } from "../examination/FlatDentitionChart";

function formatDate(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function renderMeta(metaParts) {
  if (metaParts.length === 0) return null;
  return (
    <span className={rx.metaMuted}>
      {" "}
      (
      {metaParts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 ? <span className={rx.metaSep}> | </span> : null}
          {part}
        </span>
      ))}
      )
    </span>
  );
}

function SectionRows({ rows, view, kp }) {
  if (view === "inline") {
    return (
      <p style={{ margin: 0, fontSize: 11.5, color: "#475569", lineHeight: 1.5 }}>
        {rows.map((row, index) => (
          <span key={`${kp}-${index}`}>
            {index > 0 ? ", " : ""}
            <span style={{ fontWeight: 600, color: "#334155" }}>{row.title}</span>
            {renderMeta(row.metaParts)}
          </span>
        ))}
      </p>
    );
  }
  if (view === "table") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontFamily: "Inter, sans-serif" }}>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${kp}-${index}`} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={{ padding: "4px 10px 4px 0", fontWeight: 600, color: "#334155", verticalAlign: "top", width: "42%" }}>
                {row.title}
              </td>
              <td style={{ padding: "4px 0", color: "#475569", verticalAlign: "top" }}>
                {row.metaParts.length ? row.metaParts.join(" | ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <ul className={rx.list}>
      {rows.map((row, index) => (
        <li key={`${kp}-${index}`} className={rx.listLi}>
          <span className={rx.rowTitle}>{row.title}</span>
          {renderMeta(row.metaParts)}
        </li>
      ))}
    </ul>
  );
}

function SectionList({ title, rows, icon, view = "list" }) {
  if (!rows.length) return null;
  return (
    <section className={rx.section}>
      <div className={rx.sectionHead}>
        {icon ? <span className={rx.icon14}>{icon}</span> : null}
        <h3 className={rx.sectionTitle}>{title}</h3>
      </div>
      <SectionRows rows={rows} view={view} kp={title} />
    </section>
  );
}

function RxMedicalSectionIcon({ name }) {
  return (
    <TPMedicalIcon
      name={name}
      variant="bulk"
      size={14}
      color="var(--tp-slate-500)"
      className={rx.medIcon14}
    />
  );
}

const DENTAL_DL = { margin: 0, fontSize: 11.5, color: "#475569", display: "flex", gap: 5, alignItems: "baseline", lineHeight: 1.4 };

function dentalSub(label, items, kp) {
  return (
    <div>
      <p style={DENTAL_DL}>
        <span style={{ color: "#cbd5e1" }}>•</span>
        <span style={{ fontWeight: 600, color: "#334155" }}>{label}</span>
      </p>
      <div style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
        {items.map((item, i) => (
          <p key={`${kp}-${i}`} style={DENTAL_DL}>
            <span style={{ color: "#94a3b8" }}>•</span>
            <span>
              <span style={{ fontWeight: 600, color: "#334155" }}>{item.title}</span>
              {renderMeta(item.metaParts)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function toothDateNode(block, showToothDate) {
  if (!showToothDate || !block?.toothUpdatedAt) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 6, whiteSpace: "nowrap" }}>
      · {formatDate(block.toothUpdatedAt)}
    </span>
  );
}

function dentalToothListNode(block, showToothDate) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1e293b", display: "flex", gap: 6, alignItems: "baseline" }}>
        <span style={{ color: "#1e293b" }}>•</span>
        {block.toothLabel}
        {toothDateNode(block, showToothDate)}
      </p>
      <div style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
        {block.treatmentHistory.length ? dentalSub("Past Procedures", block.treatmentHistory, "th") : null}
        {block.findings.length ? dentalSub("Findings", block.findings, "fd") : null}
        {block.procedures.length ? dentalSub("Procedures", block.procedures, "pr") : null}
        {block.overallToothNote ? (
          <div>
            <p style={DENTAL_DL}>
              <span style={{ color: "#cbd5e1" }}>•</span>
              <span style={{ fontWeight: 600, color: "#334155" }}>Overall Tooth Notes</span>
            </p>
            <div style={{ paddingLeft: 14, marginTop: 1 }}>
              <p style={DENTAL_DL}>
                <span style={{ color: "#94a3b8" }}>•</span>
                <span>{block.overallToothNote}</span>
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function dentalToothInlineNode(block, showToothDate) {
  const fmtItems = (items) => items.map((it) => it.title + (it.metaParts.length ? ` (${it.metaParts.join(" | ")})` : "")).join(", ");
  const segs = [
    { label: "Past Procedures", text: block.treatmentHistory.length ? fmtItems(block.treatmentHistory) : null },
    { label: "Findings",        text: block.findings.length          ? fmtItems(block.findings)          : null },
    { label: "Procedures",      text: block.procedures.length        ? fmtItems(block.procedures)        : null },
    { label: "Notes",           text: block.overallToothNote || null },
  ].filter((s) => s.text);
  return (
    <p style={{ margin: 0, fontSize: 11.5, color: "#334155", lineHeight: 1.45 }}>
      <span style={{ fontWeight: 700, color: "#0f172a" }}>{`${block.toothLabel}:`}</span>
      {toothDateNode(block, showToothDate)}
      {" "}
      {segs.flatMap((s, i) => [
        i > 0 ? <span key={`sep-${i}`} style={{ color: "#94a3b8" }}>; </span> : null,
        <span key={`seg-${i}`}>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{s.label}:</span>
          {" "}
          {s.text}
        </span>
      ].filter(Boolean))}
    </p>
  );
}

function lineCols(row) {
  if (row.cols) return { surfaces: row.cols.surfaces || "", since: row.cols.since || "", note: row.cols.note || "" };
  const m = row.metaParts || [];
  return { surfaces: m[0] || "", since: m[1] || "", note: m.slice(2).join(" · ") };
}

function dentalToothTableNode(block, showToothDate) {
  const wrap = { border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", fontFamily: "Inter, sans-serif", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  const toothHead = { background: "#eef2f7", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#1e293b", borderBottom: "1px solid #e2e8f0" };
  const catSection = { borderTop: "1px solid #dde3ec" };
  const catLabel = { padding: "5px 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", background: "#eef1f5", borderBottom: "1px solid #e2e8f0" };
  const tbl = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
  const th = { textAlign: "left", padding: "3px 8px", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "#94a3b8", background: "#f7f9fb", borderBottom: "1px solid #e6ebf1" };
  const td = { padding: "4px 8px", fontSize: 10, color: "#475569", verticalAlign: "top", borderTop: "1px solid #e6ebf1", wordBreak: "break-word" };
  const tdName = { ...td, fontWeight: 600, color: "#334155" };
  const colW = ["30%", "22%", "18%", "30%"];

  const catTable = (label, rows) => rows.length ? (
    <div style={catSection}>
      <div style={catLabel}>{label}</div>
      <table style={tbl}>
        <thead>
          <tr>
            {["Name", "Surfaces", "Since", "Notes"].map((t, ci) => (
              <th key={t} style={{ ...th, width: colW[ci] }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const c = lineCols(r);
            return (
              <tr key={ri}>
                <td style={tdName}>{r.title}</td>
                <td style={td}>{c.surfaces || "—"}</td>
                <td style={td}>{c.since || "—"}</td>
                <td style={td}>{c.note || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : null;

  return (
    <div style={wrap}>
      <div style={toothHead}>
        {block.toothLabel}
        {toothDateNode(block, showToothDate)}
      </div>
      {catTable("Past Procedures", block.treatmentHistory)}
      {catTable("Findings", block.findings)}
      {catTable("Procedures", block.procedures)}
      {block.overallToothNote ? (
        <div style={catSection}>
          <div style={catLabel}>Overall Tooth Notes</div>
          <div style={{ padding: "5px 10px", fontSize: 10, color: "#475569" }}>
            {block.overallToothNote}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function dentalHeaderNode(snapshot, titleSuffix, hideDate) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: "0 0 6px", fontFamily: "Inter, sans-serif" }}>
      Dental Examination
      {titleSuffix ? ` ${titleSuffix}` : ""}
      {hideDate ? null : (
        <span style={{ fontWeight: 500, color: "#94a3b8" }}>
          {" "}
          ({formatDate(snapshot?.dentalUpdatedAt ?? snapshot?.updatedAt ?? new Date().toISOString())})
        </span>
      )}
    </h3>
  );
}

function packBlocks(heights, capacity, gap) {
  const pages = [];
  let cur = [];
  let h = 0;
  for (let i = 0; i < heights.length; i++) {
    const bh = heights[i];
    const add = (cur.length ? gap : 0) + bh;
    if (cur.length && h + add > capacity) {
      pages.push(cur);
      cur = [];
      h = 0;
    }
    cur.push(i);
    h += (cur.length > 1 ? gap : 0) + bh;
  }
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  return pages;
}

function PaginatedRx({ blocks, renderHead, renderPatient, renderFoot }) {
  const measureRef = useRef(null);
  const bodyRef = useRef(null);
  const [pages, setPages] = useState(() => [blocks.map((_, i) => i)]);

  const sig = blocks.map((b) => b.key).join("|");
  const lastSigRef = useRef(sig);
  let effectivePages = pages;
  if (lastSigRef.current !== sig) {
    lastSigRef.current = sig;
    effectivePages = [blocks.map((_, i) => i)];
    setPages(effectivePages);
  }

  useLayoutEffect(() => {
    const mc = measureRef.current;
    const body = bodyRef.current;
    if (!mc || !body) return;

    const recompute = () => {
      const cs = getComputedStyle(body);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const capacity = body.clientHeight - padTop - padBottom;
      if (capacity <= 0) return;

      const heights = Array.from(mc.children).map((el) => el.getBoundingClientRect().height);
      if (!heights.length) return;

      const next = packBlocks(heights, capacity, 10);
      setPages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    recompute();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(recompute);
      ro.observe(mc);
      ro.observe(body);
    }
    window.addEventListener("resize", recompute);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [sig]);

  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", visibility: "hidden", pointerEvents: "none", zIndex: -1 }}>
        <article className={rx.sheet}>
          {renderHead()}
          {renderPatient()}
          <div ref={bodyRef} className={rx.sheetBody}>
            <div ref={measureRef} className={rx.contentStack}>
              {blocks.map((b) => (
                <div key={b.key}>{b.node}</div>
              ))}
            </div>
          </div>
          {renderFoot()}
        </article>
      </div>
      {effectivePages.map((idxs, p) => (
        <article key={`pg-${p}`} className={rx.sheet}>
          {renderHead()}
          {renderPatient()}
          <div className={rx.sheetBody}>
            <div className={rx.contentStack}>
              {idxs.filter((i) => blocks[i]).map((i) => (
                <div key={blocks[i].key}>{blocks[i].node}</div>
              ))}
            </div>
          </div>
          {renderFoot()}
        </article>
      ))}
    </>
  );
}

export function RxPreviewDocument({ snapshot, extraNotes, settings }) {
  const view = settings?.view || "list";
  const showDentalChart = settings?.showDentalChart !== false;
  const chartOverride = settings?.chartOverride;
  const hideOral = settings?.hideOral === true;
  const hidePatient = settings?.hidePatient === true;
  void settings?.includeHistorical;

  const mergedAdditionalNotes = (() => {
    const fromSnapshot = String(snapshot?.additionalNotes ?? "").trim();
    const fromExtra = String(extraNotes ?? "").trim();
    if (fromSnapshot && fromExtra) return `${fromExtra}\n\n${fromSnapshot}`;
    return fromSnapshot || fromExtra || "";
  })();

  const dentalBlocks = snapshot?.dentalExamination ?? [];

  const renderLetterhead = () => (
    <>
      <header className={rx.letterhead}>
        <div className={rx.letterRow}>
          <div className={rx.letterLeft}>
            <div className={rx.logoBox}>
              <Building2 size={32} className={rx.buildingIcon} strokeWidth={1.8} />
            </div>
            <div>
              <p className={rx.clinicName}>TP Dental Care</p>
              <p className={rx.docLine}>Dr. Umesh Aggarwal, BDS, MDS</p>
              <p className={rx.metaLine}>Reg. ID: DCI-2342342 | +91 78945 61230</p>
              <p className={rx.metaLine}>K9 Sardar Bungalow, Prahladnagar, Ahmedabad</p>
            </div>
          </div>
        </div>
      </header>
      <div className={rx.rule} />
    </>
  );

  const renderPatientDetails = () => {
    const pid = snapshot?.patientId ?? "apt-1";
    const ap = getAppointmentPatient(pid);
    return (
      <>
        <section className={rx.patientSection}>
          <div className={rx.patientRow}>
            <div className={rx.patientCol}>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Patient Name:</span> {ap.name}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Age/Gender:</span> {ap.age} Years, {ap.genderLabel}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Height/Weight:</span> —
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Address:</span> Prahladnagar, Ahmedabad
              </p>
            </div>
            <div className={rx.patientRight}>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Patient ID:</span> {ap.patientCode}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Mobile:</span> {ap.mobile.replace(/^\+91-/, "")}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Blood Group:</span> {ap.bloodGroup}
              </p>
            </div>
          </div>
        </section>
        <div className={rx.rule} />
      </>
    );
  };

  const renderFooter = () => (
    <>
      <div className={rx.rule} />
      <footer className={rx.footer}>
        <p className={rx.footerText}>support@tpdentalcare.com | www.tpdentalcare.com</p>
      </footer>
    </>
  );

  const blocks = [];
  const pushBlock = (key, node, h) => {
    if (node) blocks.push({ key, node, h });
  };

  const rowsH = (n) => (view === "inline" ? 30 : view === "table" ? n * 26 + 12 : n * 22 + 6);
  const secH = (rows) => 30 + rowsH((rows || []).length);

  if (snapshot) {
    pushBlock(
      "symptoms",
      snapshot.symptoms && snapshot.symptoms.length ? (
        <SectionList title="Chief Complaints" rows={snapshot.symptoms} view={view} icon={<RxMedicalSectionIcon name="Virus" />} />
      ) : null,
      secH(snapshot.symptoms)
    );
    pushBlock(
      "examinations",
      snapshot.examinations && snapshot.examinations.length ? (
        <SectionList title="Examination" rows={snapshot.examinations} view={view} icon={<RxMedicalSectionIcon name="medical service" />} />
      ) : null,
      secH(snapshot.examinations)
    );
    pushBlock(
      "diagnoses",
      snapshot.diagnoses && snapshot.diagnoses.length ? (
        <SectionList title="Diagnosis" rows={snapshot.diagnoses} view={view} icon={<RxMedicalSectionIcon name="Diagnosis" />} />
      ) : null,
      secH(snapshot.diagnoses)
    );
    pushBlock(
      "investigations",
      snapshot.labInvestigations && snapshot.labInvestigations.length ? (
        <SectionList title="Investigations" rows={snapshot.labInvestigations} view={view} icon={<RxMedicalSectionIcon name="Test Tube" />} />
      ) : null,
      secH(snapshot.labInvestigations)
    );
    pushBlock(
      "medications",
      snapshot.medications && snapshot.medications.length ? (
        <SectionList title="Medication (Rx)" rows={snapshot.medications} view={view} icon={<RxMedicalSectionIcon name="Tablets" />} />
      ) : null,
      secH(snapshot.medications)
    );
    pushBlock(
      "advice",
      snapshot.advice && snapshot.advice.length ? (
        <SectionList title="Advice" rows={snapshot.advice} view={view} icon={<RxMedicalSectionIcon name="health care" />} />
      ) : null,
      secH(snapshot.advice)
    );

    if (dentalBlocks.length) {
      const showToothDate = !!settings?.includeHistorical;
      const toothNode = (b) =>
        view === "table"
          ? dentalToothTableNode(b, showToothDate)
          : view === "inline"
            ? dentalToothInlineNode(b, showToothDate)
            : dentalToothListNode(b, showToothDate);

      dentalBlocks.forEach((b, i) => {
        const tooth = toothNode(b);
        const node =
          i === 0 ? (
            <section style={{ marginTop: 12, breakInside: "avoid", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
              {dentalHeaderNode(snapshot, undefined, showToothDate)}
              <div style={{ marginTop: 4 }}>{tooth}</div>
            </section>
          ) : (
            <section style={{ breakInside: "avoid", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{tooth}</section>
          );
        pushBlock(`dental-${i}`, node, 0);
      });
    }

    pushBlock(
      "followUp",
      snapshot.followUp ? (
        <section className={rx.miniSection}>
          <h3 className={rx.dentalTitle}>
            <Calendar2 size={14} color="var(--tp-slate-500)" variant="Bulk" />
            Follow Up
          </h3>
          <p className={rx.miniBody}>{snapshot.followUp}</p>
        </section>
      ) : null,
      56
    );

    pushBlock(
      "additionalNotes",
      mergedAdditionalNotes ? (
        <section className={rx.miniSection}>
          <h3 className={rx.dentalTitle}>
            <Notepad2 size={14} color="var(--tp-slate-500)" variant="Bulk" />
            Additional Notes
          </h3>
          <p className={rx.miniBody}>{mergedAdditionalNotes}</p>
        </section>
      ) : null,
      72
    );

    pushBlock(
      "oral",
      hideOral ? null : (
        <OralExamReport patientId={snapshot.patientId} view={view} chart={chartOverride} showDates={!!settings?.includeHistorical} />
      ),
      view === "list" ? 200 : 120
    );

    pushBlock("chart", showDentalChart ? <FlatDentitionChart patientId={snapshot.patientId} chart={chartOverride} alwaysRender={true} /> : null, 380);
  }

  return (
    <div className={rx.page} style={{ position: "relative" }}>
      {!snapshot ? (
        <article className={rx.sheet}>
          {renderLetterhead()}
          {!hidePatient && renderPatientDetails()}
          <div className={rx.sheetBody}>
            <div className={rx.emptyPad}>
              <p className={rx.emptyText}>
                No Rx data available yet. Add details in Clinical or Dental Examination to preview here.
              </p>
            </div>
          </div>
          {renderFooter()}
        </article>
      ) : (
        <PaginatedRx blocks={blocks} renderHead={renderLetterhead} renderPatient={hidePatient ? () => null : renderPatientDetails} renderFoot={renderFooter} />
      )}
    </div>
  );
}