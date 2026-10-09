import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  TesseractThemeProvider,
  Drawer,
  DrawerContent,
  SectionCard,
  Badge,
  Button,
  Checkbox,
  InputBox,
  Filter,
  DateRangePicker,
  Empty,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  TPLibraryIcon,
  Toast,
} from "@dhspl-tatvacare/tesseract-ui";

import CorrelationSankey from "./CorrelationSankey";
import {
  REPORTS,
  FINDINGS,
  CORRELATIONS,
  HYPOTHESES,
  LINKS,
  RUN_META,
  reportTimestamp,
  byId,
  applyLiveRun,
} from "../data/demoRun";
import { markCorrelationOpen } from "../data/uploadAutoPick";
import AgentSpark from "./AgentSpark";
import { getSideNavMedicalIconUrl } from "../../../components/sideNavbar/sideNavbarMedicalIcons";
import { seedToPicked } from "../data/entryPoints";
import { isLive, analyze, adaptRun, buildRequest } from "../data/coraClient";
// eslint-disable-next-line import/no-unresolved -- exports-map alias, webpack resolves it
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import { setRun, notifyRun } from "../data/runStore";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import styles from "./CorrelationFlowDrawer.module.css";

/* The announced-versus-delivered gap, read off whatever run is current. Null
   before the first run, so callers guard on RUN_META. */
const hypothesisGap = () =>
  RUN_META ? (RUN_META.announcedHypotheses || 0) - (RUN_META.deliveredHypotheses || 0) : 0;

/* ------------------------------------------------------------------ bucket */

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shiftDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return startOfDay(out);
};
/* Anchored to the wall clock. A report older than the chosen window is simply
   not pre-selected; it can still be ticked by hand. */
const TODAY = startOfDay(new Date());
/* How far back from the newest report still counts as the same workup. */
const EPISODE_WINDOW = 7 * 24 * 60 * 60 * 1000;

const RANGE_PRESETS = [
  { id: "visit", label: "This visit", getRange: () => ({ start: TODAY, end: TODAY }) },
  { id: "last-7", label: "Past 7 days", getRange: () => ({ start: shiftDays(TODAY, -6), end: TODAY }) },
  { id: "last-30", label: "Past 30 days", getRange: () => ({ start: shiftDays(TODAY, -29), end: TODAY }) },
  { id: "last-6m", label: "Past 6 months", getRange: () => ({ start: shiftDays(TODAY, -182), end: TODAY }) },
  { id: "last-2y", label: "Past 2 years", getRange: () => ({ start: shiftDays(TODAY, -729), end: TODAY }) },
];

const WHAT_THIS_DOES =
  "Links findings across the reports you pick, argues against each link, keeps the ones that survive. It suggests, it does not diagnose.";

/* Beta, stated in the header and explained on the info popover: this is a
   prototype in front of a limited set of users, and the output is for review,
   not a diagnosis. */
const BETA_NOTE =
  "Beta: we are testing this with an exclusive set of doctors. Treat the output as decision support for review, not a diagnosis.";

function flagTone(flag) {
  return flag === "NORMAL" || flag === "" ? "success" : "error";
}

/* The record a doctor opened, docked to the right edge of the drawer, the same
   way the records rail opens a document beside its list rather than on top of
   it. A lab result opens as its parameter list, a document opens as its PDF. */
function RecordSidebar({ report, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* The panel's rows are the report's OWN parameters, carried on the tile the
     doctor just clicked (buildCorrelationReports in SideNavbar puts them there,
     and the same array is what gets sent to CORA).

     This used to read the run's findings and match them by `f.report ===
     report.id`. Both halves were wrong. FINDINGS is empty until a correlation
     has been generated, so opening a report from the picker — before any run —
     had nothing to filter. And after a run the ids still never matched:
     adaptRun sets `report` from the service's own `source_report` slug ("cbc"),
     while the tile's id is the host's ("legacy-lab-2026-07-10-0"). The lab
     branch was therefore always empty, and because it was the only branch that
     could render for a lab report, the panel came up blank. */
  const rows = useMemo(() => {
    const own = report.rows || [];
    if (own.length) {
      return own.map((r, i) => ({
        id: `${report.id}-${i}`,
        name: r.label,
        value: [r.value, String(r.unit || "").replace(/[()]/g, "").trim()].filter(Boolean).join(" "),
        ref: r.ref || "",
        flag: r.abnormal ? (r.direction === "low" ? "LOW" : "HIGH") : "NORMAL",
      }));
    }
    /* An uploaded report has no rows of its own; once a run has read it, the
       service's findings are all there is. Matched on the source slug, which is
       what adaptRun actually stores. */
    return FINDINGS.filter((f) => f.report === report.id || f.report === report.slug);
  }, [report.id, report.rows, report.slug]);
  const isLab = report.source === "labResults";

  return (
    <aside className={styles.side} aria-label={report.name}>
      <div className={styles.sideHead}>
        <span className={styles.sideMain}>
          <span className={styles.sideName}>{report.name}</span>
          <span className={styles.sideMeta}>
            {report.date} &middot; {report.modality}
            {report.lab ? ` · ${report.lab}` : ""}
          </span>
        </span>
        <Button
          variant="ghost"
          theme="neutral"
          size="sm"
          leftIcon={<TPLibraryIcon name="close-square" size={18} />}
          aria-label="Close"
          onClick={onClose}
        />
      </div>

      <div className={styles.sideBody}>
        {isLab && rows.length > 0 ? (
          <>
            <div className={styles.paramHead}>
              <span>Parameter</span>
              <span>Value</span>
              <span>Reference</span>
            </div>
            {rows.map((f) => (
              <div key={f.id} className={styles.paramRow}>
                <span className={styles.paramName}>{f.name}</span>
                <span className={styles.paramValue}>
                  {f.value}
                  <Badge variant="soft" color={flagTone(f.flag)} size="xs" icons="none">
                    {f.flag === "NORMAL" ? "In range" : f.flag.toLowerCase()}
                  </Badge>
                </span>
                <span className={styles.paramRef}>{f.ref || "not applicable"}</span>
              </div>
            ))}
            {report.params > rows.length ? (
              <p className={styles.paramNote}>
                {rows.length} of {report.params} parameters carry signal. The rest are in range.
              </p>
            ) : null}
          </>
        ) : null}

        {!isLab && report.pdf ? (
          <iframe className={styles.pdf} src={report.pdf} title={report.name} />
        ) : null}

        {isLab && rows.length === 0 ? (
          <Empty
            size="sm"
            icon="document-text"
            title="No parameters on this report"
            description="Nothing was recorded against this date."
          />
        ) : null}

        {!isLab && !report.pdf ? (
          <Empty size="sm" icon="document-text" title="No document" description="Nothing to open." />
        ) : null}
      </div>
    </aside>
  );
}

/* One selectable tile, shaped the way a record already reads elsewhere in this
   product (see snv-record-thumb-card): a document thumbnail, then the name, the
   category and the date. The open action is a link on the title line, not a
   footer strip. `onOpen` is passed only where there is something to read, so an
   ineligible note never grows an affordance it cannot honour. */
/* One tile, three regions, the way a record already reads elsewhere in the
   product. HEADER names the thing and carries the date, because the date is
   what a doctor scans for when deciding whether a panel is still relevant, plus
   the checkbox on the far edge where the selection column lines up. BODY holds
   what the panel found. FOOTER holds the one link that opens it, below a rule,
   so opening a record can never be mistaken for selecting it. */
/* One glyph per KIND OF REPORT, not per section, because that is the
   distinction a doctor actually makes: a scan is not a panel is not a script.
   Masked from the CDN directly rather than through TPLibraryIcon, so the exact
   assets on record are the ones that render. */
const ICON_BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk";
const TUBE = `${ICON_BASE}/medical/test-tube-02.svg`;
const SCAN = `${ICON_BASE}/security/scanning.svg`;
const DOC = `${ICON_BASE}/content-edit/document-text.svg`;
const ARROW = "https://pmdoctorportal.tatvacare.in/tp-icons/straight/outline/arrow/arrow-right2.svg";
/* Going BACK to a result that already exists, so it points the other way
   from the forward arrows used on report rows. */
const ARROW_BACK = "https://pmdoctorportal.tatvacare.in/tp-icons/straight/outline/arrow/arrow-left2.svg";
/* On the gradient the spark needs no plate behind it: the CTA already is the
   agent surface, so the mark is just the spark, in white. */
/* The edit glyph lives in the content-edit family, not essential. */
const EDIT_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/content-edit/edit.svg";
const SPARK = "/new-assets/icons/dr-agent/agent-spark.svg";


/* Anything drawn and run in a lab is a tube, clinical pathology and haematology
   alike. Imaging is the scanner. Everything else is paper. */
function modalityIcon(report) {
  if (report.source === "labResults") return TUBE;
  const m = (report.modality || "").toLowerCase();
  if (m.includes("radiolog") || m.includes("imaging")) return SCAN;
  if (m.includes("patholog") || m.includes("haemat") || m.includes("hemat")) return TUBE;
  return DOC;
}

/* Every mask property rides in the style attribute rather than a class,
   because Button clones its rightIcon and drops the className, which left the
   arrow with a mask and no fill behind it. */
function Glyph({ src, size = 18, className, color = "currentColor" }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function PickCard({ report: r, on, onToggle, onOpen }) {
  const isLab = r.source === "labResults";
  const openLabel = isLab ? "View results" : "View report";

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={[styles.card, on ? styles.cardOn : "", r.eligible ? "" : styles.cardOff].join(" ")}
      onClick={() => r.eligible && onToggle(r.id)}
    >
      <div className={styles.cardHead}>
        <span className={styles.cardMain}>
          <span className={styles.cardTitle}>{r.name}</span>
          {/* The date is the only subtext: it is what decides whether a panel
              is still worth reading. What kind of report it is rides below as a
              tag, beside what it found. */}
          <span className={styles.cardDate}>{r.date}</span>
        </span>
        <Checkbox
          checked={on}
          size="sm"
          disabled={!r.eligible}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => r.eligible && onToggle(r.id)}
          aria-label={r.name}
        />
      </div>

      <div className={styles.cardBody}>
        <span className={styles.typeTag}>
          <Glyph src={modalityIcon(r)} size={13} />
          {r.modality}
        </span>
        {/* COUNTS ONLY WHERE THEY ARE KNOWN.
            A lab result arrives structured, so its parameters and flags are
            facts and the ratio can be stated. A medical record is a document:
            nothing inside it is known until extraction runs, which happens on
            upload or when the correlation starts. Showing a count here would be
            inventing one, so the card says what kind of document it is and
            nothing more until it has been read. */}
        {/* A date's lab card can hold several panels and many parameters, so
            the subtext counts rather than names them: how many parameters, and
            how many out of range. Naming every test would not fit and is not
            what a doctor scans for when choosing what to read. */}
        {isLab && r.eligible && r.params > 0 ? (
          <Badge variant="soft" color="neutral" size="sm" icons="none">
            {r.panelCount > 1 ? `${r.panelCount} panels · ` : ""}
            {r.params} {r.params === 1 ? "parameter" : "parameters"}
          </Badge>
        ) : null}
        {isLab && r.eligible && r.abnormal > 0 ? (
          <Badge variant="soft" color="error" size="sm" icons="none">
            {r.abnormal} abnormal
          </Badge>
        ) : null}
        {/* A record only says "read when correlated" while it genuinely has
            not been read. Once it carries parsed findings, claiming otherwise
            contradicted the footer, which was already counting them. */}
        {!isLab && r.eligible ? (
          <Badge variant="soft" color="neutral" size="sm" icons="none">
            {r.params > 0
              ? `${r.params} ${r.params === 1 ? "finding" : "findings"}`
              : "Read when correlated"}
          </Badge>
        ) : null}
        {!r.eligible && r.aside ? (
          <Badge variant="soft" color="neutral" size="sm" icons="none">
            {r.aside}
          </Badge>
        ) : null}
      </div>

      {onOpen ? (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className={styles.cardFoot} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="link"
            theme="primary"
            size="sm"
            rightIcon={<Glyph src={ARROW} size={14} />}
            onClick={() => onOpen(r)}
          >
            {openLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* Upload is its own source, so it gets its own section rather than hiding as
   the last tile of a grid a doctor may have filtered away. */
function UploadSection({ onClick }) {
  if (!onClick) return null;
  return (
    <SectionCard
      title={<span className={styles.secName}>Add a report</span>}
      icon="document-upload"
      iconColor="var(--vrx-ink)"
      tone="violet"
      className={styles.section}
      bordered
      divided={false}
    >
      <button type="button" className={styles.uploadTile} onClick={onClick}>
        <span className={styles.uploadGlyph} aria-hidden="true">
          <TPLibraryIcon name="document-upload" size={20} />
        </span>
        <span className={styles.uploadLabel}>Upload a report</span>
        <span className={styles.uploadHint}>
          Opens the medical records upload. Anything you add lands in the patient record too.
        </span>
      </button>
    </SectionCard>
  );
}

/* A source of reports, shaded violet because everything inside this drawer is
   the agent talking. The header is the section's whole control surface: the
   icon and name say what it holds, the count says how much, the tri-state
   checkbox selects the lot, and the chevron folds it away once the doctor has
   decided. Search and filtering are NOT here, they steer both sections at once
   and so live in the toolbar above. */
/* How many tiles the grid is actually fitting across right now.
   The grid is auto-fill, so the column count changes with the drawer width and
   a hard-coded slice would show three rows on a wide screen and one on a
   narrow one. Reading grid-template-columns back off the resolved style is the
   only way to know, so the two-row cap means two REAL rows at every width. */
const ROWS_BEFORE_MORE = 2;

function useGridColumns(ref) {
  const [cols, setCols] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      const t = window.getComputedStyle(el).gridTemplateColumns;
      const n = t && t !== "none" ? t.split(" ").filter(Boolean).length : 1;
      setCols(n > 0 ? n : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

function PickSection({ title, source, items, picked, onToggle, onOpen, setMany, emptyTitle }) {
  const eligible = items.filter((i) => i.eligible);
  const onCount = eligible.filter((i) => picked[i.id]).length;
  const allOn = eligible.length > 0 && onCount === eligible.length;
  const someOn = onCount > 0 && !allOn;

  /* Two rows, then ask. A long panel list pushed Generate correlation off the
     bottom of the drawer, so the doctor scrolled past the thing they came to
     press. */
  const gridRef = useRef(null);
  const cols = useGridColumns(gridRef);
  const [expanded, setExpanded] = useState(false);
  const cap = cols * ROWS_BEFORE_MORE;
  const overflowing = items.length > cap;
  const shown = expanded || !overflowing ? items : items.slice(0, cap);
  const hiddenCount = items.length - shown.length;

  return (
    <SectionCard
      title={
        <span className={styles.secHead}>
          <span className={styles.secName}>{title}</span>
          <Badge variant="soft" color="neutral" size="xs" icons="none">
            {items.length}
          </Badge>
          {onCount > 0 ? (
            <Badge variant="soft" color="primary" size="xs" icons="none">
              {onCount} selected
            </Badge>
          ) : null}
        </span>
      }
      icon={
        <Glyph
          src={getSideNavMedicalIconUrl(source === "labResults" ? "lab" : "health-file-03", true)}
          size={20}
          color="var(--vrx-ink)"
        />
      }
      tone="violet"
      className={styles.section}
      bordered
      divided={false}
      collapsible
      headerActions={
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className={styles.secActions} onClick={(e) => e.stopPropagation()}>
          <label className={styles.selectAll}>
            <Checkbox
              checked={allOn ? true : someOn ? "indeterminate" : false}
              size="sm"
              disabled={eligible.length === 0}
              onCheckedChange={() => setMany(eligible, !allOn)}
              aria-label={`Select all ${title}`}
            />
            <span>Select all</span>
          </label>
        </div>
      }
    >
      {items.length === 0 ? (
        <Empty
          size="sm"
          source="records"
          title={emptyTitle}
          description="Clear the search or widen the filters."
        />
      ) : (
        <>
          <div className={styles.secScroll} data-expanded={expanded || undefined}>
            <div className={styles.grid} ref={gridRef}>
              {shown.map((r) => (
                <PickCard
                  key={r.id}
                  report={r}
                  on={!!picked[r.id] && r.eligible}
                  onToggle={onToggle}
                  onOpen={r.pdf || r.source === "labResults" ? onOpen : undefined}
                />
              ))}
            </div>
          </div>
          {overflowing || expanded ? (
            <div className={styles.moreRow}>
              <Button
                variant="link"
                theme="primary"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : `Show ${hiddenCount} more`}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

function BucketStep({ picked, setPicked, onOpen, uploads, onUpload, reports }) {
  const toggle = useCallback((id) => setPicked((p) => ({ ...p, [id]: !p[id] })), [setPicked]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState(null);

  const pool = useMemo(
    () => [...uploads, ...reports].sort((a, b) => reportTimestamp(b) - reportTimestamp(a)),
    [uploads, reports]
  );

  /* Type is the only thing left in the Filter molecule: the date has its own
     picker, the way it does on the appointment listing. Categories are derived
     from the data, so the panel offers exactly what is on file. */
  const groups = useMemo(() => {
    const types = Array.from(new Set(pool.map((r) => r.modality))).sort();
    return [{ id: "type", label: "Type", options: types.map((t) => ({ value: t, label: t })) }];
  }, [pool]);

  const activeFilterCount = (filters.type || []).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const types = filters.type || [];
    const from = dateRange?.start ? new Date(dateRange.start).setHours(0, 0, 0, 0) : null;
    const to = dateRange?.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : null;

    return pool.filter((r) => {
      const t = reportTimestamp(r);
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      if (types.length > 0 && !types.includes(r.modality)) return false;
      if (q && !`${r.name} ${r.modality}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pool, query, filters, dateRange]);

  const setMany = useCallback(
    (items, on) =>
      setPicked((p) => {
        const next = { ...p };
        items.filter((i) => i.eligible).forEach((i) => { next[i.id] = on; });
        return next;
      }),
    [setPicked]
  );

  const hidden = pool.filter((r) => picked[r.id] && r.eligible && !visible.some((v) => v.id === r.id)).length;

  return (
    <div className={styles.bucketWrap}>
      {/* The appointment listing's toolbar, part for part: search on the left,
          then the date picker and the Filter molecule pinned right. Searching
          for "liver" means the whole record, not one half of it, so one row
          steers both sections. */}
      <div className={styles.toolbar}>
        <div className={styles.searchLabel}>
          <InputBox
            fullWidth
            showLabel={false}
            showHelper={false}
            clearable
            leftIcon={<TPLibraryIcon name="search-normal" size={20} />}
            placeholder="Search lab results and medical records"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.dateWrap}>
            <DateRangePicker
              mode="range"
              months={1}
              showPresets
              presets={RANGE_PRESETS}
              commitMode="outside-click"
              value={dateRange}
              onChange={setDateRange}
              /* Nothing picked means every report on file, so the trigger says
                 so, the way the digitisation worklist does. "Date range" named
                 the control rather than the window actually on screen. */
              placeholder="Till date"
              size="sm"
              fullWidth={false}
              maxDate={TODAY}
            />
          </div>
          <div className={styles.filterWrap} data-active={activeFilterCount > 0 || undefined}>
            <Filter
              groups={groups}
              value={filters}
              onChange={setFilters}
              mode="live"
              icon={<TPLibraryIcon name="sort" size={15} />}
            />
          </div>
        </div>
      </div>

      {hidden > 0 ? (
        <p className={styles.hiddenNote}>{hidden} selected but hidden by these filters</p>
      ) : null}

      <div className={styles.sections}>
        <PickSection
          title="Lab results"
          source="labResults"
          items={visible.filter((r) => r.source === "labResults")}
          picked={picked}
          onToggle={toggle}
          onOpen={onOpen}
          setMany={setMany}
          emptyTitle="No lab results here"
        />
        <PickSection
          title="Medical records"
          source="records"
          items={visible.filter((r) => r.source === "records")}
          picked={picked}
          onToggle={toggle}
          onOpen={onOpen}
          setMany={setMany}
          emptyTitle="No medical records here"
        />
        <UploadSection onClick={onUpload} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- running */


/* The run moves through three visible stages, each with its own Lottie and its
   own rotating captions. The service reports events in this order — files are
   fetched and OCR'd, findings are assembled, then the agent correlates — so the
   stage is derived from the latest event and only ever advances. */
const STAGE_RANK = { ocr: 0, reading: 1, correlating: 2 };
/* Two animations only: the document-checking loader carries the first two
   stages (digitising, then reading), and the correlating loader carries the
   last. The plain OCR-scan file is intentionally dropped. */
const STAGES = {
  ocr: {
    src: "/new-assets/lottie/stage-reading.lottie",
    lines: [
      "Digitising the uploaded reports",
      "Extracting text from scans and PDFs",
      "Turning documents into readable data",
    ],
  },
  reading: {
    src: "/new-assets/lottie/stage-reading.lottie",
    lines: [
      "Reading the findings",
      "Lining up values across the reports",
      "Noting what sits outside its range",
    ],
  },
  correlating: {
    src: "/new-assets/lottie/stage-correlating.lottie",
    lines: [
      "Reading the reports against each other",
      "Testing every link it proposes",
      "Keeping only what survives the challenge",
    ],
  },
};

/**
 * The Reading step.
 *
 * Opens the SSE stream to the v2 endpoint, names each stage as it lands, and on
 * `final_result` adapts the response into the chart's shapes and publishes it.
 * There is no fixture fallback: if the service is unreachable or the call fails
 * the doctor is told plainly, rather than shown an invented run.
 */
function RunningStep({ onDone, patient, reports, onFail }) {
  const [lines, setLines] = useState([]);
  /* Which of the three stages the run is in, and a ticking counter that rotates
     the stage's captions. The stage only advances; the tick resets when it does. */
  const [stage, setStage] = useState("ocr");
  const [tick, setTick] = useState(0);
  const doneRef = useRef(false);
  /* The run must fire exactly once for the reports the doctor picked. patient
     and reports are new objects on every render, and onDone/onFail are new
     closures, so listing them as deps restarted the stream on each parent
     re-render, aborting the SSE before it reached final_result. They are read
     through refs and the effect runs on mount only. */
  const argsRef = useRef({ patient, reports, onDone, onFail });
  argsRef.current = { patient, reports, onDone, onFail };

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;
    const { patient, reports, onDone, onFail } = argsRef.current;

    const say = (text, tone = "run") =>
      setLines((prev) => (cancelled ? prev : [...prev, { text, tone }]));
    /* Advance the loader's stage, never regressing, so a late file event after
       findings have started does not throw the animation back to OCR. */
    const bump = (s) =>
      setStage((prev) => (!cancelled && STAGE_RANK[s] > STAGE_RANK[prev] ? s : prev));

    (async () => {
      const live = await isLive();
      if (cancelled) return;
      if (!live) {
        say("Correlation service is unreachable. Check the connection and try again.", "flag");
        if (onFail) onFail("unreachable");
        return;
      }

      const body = buildRequest({ patient, reports });
      const fileCount = body.reports.file_urls.length;
      const textCount = body.reports.raw_text.length;
      say(
        `Sending ${textCount} lab ${textCount === 1 ? "panel" : "panels"}` +
          (fileCount ? ` and ${fileCount} ${fileCount === 1 ? "record" : "records"}` : ""),
        "ok"
      );

      try {
        const result = await analyze({
          body,
          signal: abort.signal,
          onEvent: (event, data) => {
            if (cancelled) return;
            if (event === "file_fetch_progress" && data?.filename) {
              bump("ocr");
              say(`Reading ${data.filename}`);
            } else if (event === "file_extracted" && data?.filename) {
              bump("ocr");
              say(`Read ${data.items} from ${data.filename}`, "ok");
            } else if (event === "file_error" && data?.filename) {
              say(`Could not read ${data.filename}`, "flag");
            } else if (event === "findings_ready" && data) {
              bump("reading");
              say(`${data.total_findings} findings assembled`, "ok");
            } else if (event === "agent_event" && data?.content) {
              bump("correlating");
              say(data.content);
            }
          },
        });
        if (cancelled) return;
        applyLiveRun({ ...adaptRun(result), reports });
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      } catch (err) {
        if (cancelled) return;
        say(`The correlation could not be completed: ${err.message}`, "flag");
        if (onFail) onFail(err.message);
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Rotate the current stage's captions on a gentle beat, and start the rotation
     over whenever the stage itself changes so the first line of a new stage is
     always the one that shows. */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setTick(0);
  }, [stage]);

  const events = lines;

  /* ONE LINE AT A TIME.
     This used to accumulate every stage into a growing bulleted list with a
     coloured dot per row, plus a title and a footnote. Four kinds of text on a
     screen whose only job is to say "still working". A run is a wait, not a
     document: the doctor needs the mark moving and the current step named, and
     nothing else. The list is gone; the newest line rises into place and the
     one before it leaves upward. */
  const current = events.length ? events[events.length - 1] : null;
  const caption = current ? current.text : "Reading across the reports you picked";

  const failed = Boolean(current && current.tone === "flag");
  const stageInfo = STAGES[stage] || STAGES.ocr;
  const carouselLine = stageInfo.lines[tick % stageInfo.lines.length];

  return (
    <div className={styles.runWrap} aria-busy="true">
      <div className={styles.loaderCard}>
        {/* The stage's own animation. Keyed on the stage so the player swaps the
            file cleanly when the run moves on. */}
        <div className={styles.lottieWrap} aria-hidden="true">
          <DotLottieReact key={stage} src={stageInfo.src} loop autoplay className={styles.lottie} />
        </div>

        {/* One rotating caption per stage: a soft shimmer sweeps the text and
            three dots keep working, so the wait reads as a loader. On failure it
            holds the error line instead of rotating. */}
        <div className={styles.carousel} aria-live="polite" data-failed={failed || undefined}>
          <span key={failed ? "err" : `${stage}-${tick}`} className={styles.carouselText}>
            {failed ? caption : carouselLine}
            {!failed ? (
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            ) : null}
          </span>
        </div>

        {/* A slim indeterminate bar under the text: a soft segment glides across
            a neutral track, so the wait always reads as active even between
            stage changes. */}
        <div className={styles.progressTrack} data-failed={failed || undefined} aria-hidden="true">
          <span className={styles.progressBar} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------- the docked detail panels */

/* The groups ARE the confidence bands now. They used to be a second axis
   ("Most likely / Worth excluding / Incidental") sitting beside confidence,
   which is what made "Worth excluding, Strong" read as a contradiction. One
   axis, three bands, same traffic light as the chart. */
const TIER_LABEL = { strong: "Strong", medium: "Medium", low: "Low" };

const UP = "https://pmdoctorportal.tatvacare.in/tp-icons/straight/bold/arrow/arrow-up3.svg";
const DOWN = "https://pmdoctorportal.tatvacare.in/tp-icons/straight/bold/arrow/arrow-down.svg";
const FLAG_ARROW = { HIGH: UP, LOW: DOWN };

/* The prose quotes the same numbers the rows below it carry, so those numbers
   are set in bold: a doctor skimming the argument should be able to find the
   value without reading the sentence. A titre, or any figure with an optional
   unit. The unit is optional because the prose names the analyte and then the
   bare number ("ALT 169"), which is the token worth finding. */
const NUM = /(1:\d+|\b\d+(?:\.\d+)?(?:\s?(?:U\/L|mg\/dL|g\/dL|%))?\b)/g;

function withValues(text) {
  if (!text) return null;
  /* split() with one capturing group puts every match at an odd index, which is
     the whole test. Calling NUM.test() here would advance lastIndex on a /g/
     regex and flip its answer on alternate calls. */
  return String(text)
    .split(NUM)
    .map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));
}

/* THE EVIDENCE SCALE, defined once. Everything that reports strength reads from
   this table: the meter, its label, and the tags beside it, so a doctor learns
   one colour language instead of three. Violet is not on it, because violet
   marks the agent's own voice and would say nothing about strength.

     Strong       four steps, success green      the claim is well supported
     Moderate     three steps, primary blue      supported, with a caveat
     Low          two steps, warning amber       thin
     Speculative  one step, warning amber        barely more than a guess

   A weakened link is forced to the bottom tone whatever it claimed, because a
   link that failed its challenge cannot report its own strength. */
const EVIDENCE = {
  Strong: { steps: 3, tone: "strong", badge: "success" },
  /* "Moderate" is what the service returns; "Medium" is the adapted tier the
     chart uses. Both rank the same, and keying only on "Medium" sent every
     Moderate correlation to the Speculative fallback below. */
  Moderate: { steps: 2, tone: "medium", badge: "warning" },
  Medium: { steps: 2, tone: "medium", badge: "warning" },
  Low: { steps: 1, tone: "low", badge: "error" },
  Speculative: { steps: 1, tone: "low", badge: "error" },
};
const WEAKENED = { tone: "low", badge: "error" };

/* What the two scales mean, in one place, behind one info icon. They are easy
   to confuse because both look like rankings: the TIER says what to do with a
   claim, the EVIDENCE says how sure the agent is of it. That is why "Worth
   excluding" can sit at Strong evidence, which reads as a contradiction until
   somebody says it out loud. */
const SCALE_LEGEND = [
  { head: "Evidence: how sure the agent is", rows: [
    ["Strong", "Several findings agree and the link survived its challenge."],
    ["Moderate", "Supported, but with a caveat the agent could not rule out."],
    ["Low", "Thin. One finding, or a link that barely held."],
    ["Speculative", "Little more than a guess. Shown so it is not hidden."],
  ] },
  { head: "Tier: what to do with it", rows: [
    ["Most likely", "Pursue this."],
    ["Worth excluding", "Rule this out before moving on."],
    ["Incidental", "Note it, do not act on it."],
  ] },
];

/**
 * The info affordance, in one place.
 *
 * There were three of these and they behaved differently. The header's was a
 * click toggle that nothing dismissed — it stayed open while you worked and
 * only closed by pressing the icon again. The other two were hover Tooltips on
 * a <button>: the pointer opened them, but a CLICK closed them again on
 * pointerdown, so a doctor who clicked the icon (the obvious thing to do with a
 * button) saw a flicker and nothing else.
 *
 * One behaviour now: click to open, click outside or press Escape to close, and
 * only one open at a time because each instance owns its own state and the
 * outside-click handler closes it.
 */
function InfoPop({ label, children, align = "start", width }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popRef = useRef(null);

  /* Keep the card inside the window.
     It is anchored to its trigger, and the triggers that carry the widest
     content sit in the detail dock against the right edge of the screen — so
     opening at `left: 0` ran the card off-screen and clipped the text. Measured
     after it renders and nudged back, which also handles the drawer being
     resized or the panel scrolled, since the card is remeasured every time it
     opens. */
  useLayoutEffect(() => {
    if (!open) return;
    const el = popRef.current;
    if (!el) return;
    const EDGE = 8;
    el.style.transform = "";
    const rect = el.getBoundingClientRect();
    let shift = 0;
    if (rect.right > window.innerWidth - EDGE) {
      shift = window.innerWidth - EDGE - rect.right;
    }
    if (rect.left + shift < EDGE) {
      shift = EDGE - rect.left;
    }
    if (shift) el.style.transform = `translateX(${Math.round(shift)}px)`;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    /* pointerdown, not click: the popover must be gone before whatever was
       underneath it reacts, otherwise clicking a chart node behind the panel
       both closes this and selects that. */
    document.addEventListener("pointerdown", onDocDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={styles.infoWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.infoBtn}
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <TPLibraryIcon name="info-circle" family="essential" variant="bulk" size={15} className={styles.hintDot} />
      </button>
      {open ? (
        <span
          ref={popRef}
          className={styles.hintPop}
          data-align={align}
          role="note"
          style={width ? { width } : undefined}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}

function ScaleLegend() {
  return (
    <InfoPop label="What these levels mean" width={360}>
      <span className={styles.legendPop}>
        {SCALE_LEGEND.map((g) => (
          <span key={g.head} className={styles.legendGroup}>
            <span className={styles.legendHead}>{g.head}</span>
            {g.rows.map(([k, v]) => (
              <span key={k} className={styles.legendRow}>
                <b>{k}</b>
                {v}
              </span>
            ))}
          </span>
        ))}
      </span>
    </InfoPop>
  );
}

function evidenceOf(level, verdict) {
  const base = EVIDENCE[level] || EVIDENCE.Speculative;
  return verdict === "weakened" ? { ...base, ...WEAKENED } : base;
}

/* Filled steps only. Ghost segments behind them drew a scale the reader has to
   decode before they can read the answer. */
function EvidenceMeter({ level, verdict }) {
  const ev = evidenceOf(level, verdict);
  return (
    <span className={styles.meter} data-tone={ev.tone}>
      <span className={styles.meterBars} aria-hidden="true">
        {Array.from({ length: ev.steps }, (_, i) => (
          <span key={i} className={styles.meterBar} />
        ))}
      </span>
      <span className={styles.meterLabel}>{level} evidence</span>
      <ScaleLegend />
    </span>
  );
}

/** A section heading. Violet, because the heading is the agent naming its own
 *  reasoning; the content underneath stays in reading ink. */
function DLabel({ children, count }) {
  return (
    <h4 className={styles.dLabel}>
      {children}
      {count != null && (
        <Badge variant="soft" color="neutral" size="xs" icons="none">{count}</Badge>
      )}
    </h4>
  );
}

/** One reading as it was actually measured: name, range, value, direction. */
function FindingRow({ finding: f, onClick }) {
  return (
    <button type="button" className={styles.dFinding} onClick={onClick}>
      <span className={styles.dFindingName}>{f.name}</span>
      <span className={styles.dFindingVal} data-flag={f.flag}>
        {f.value}
        {/* The arrow says which way it moved; the colour says whether that
            matters. Out of range is red either way, because a low value is not
            good news, it is a different abnormality. */}
        {/* The colour is stated, never inherited. This relied on currentcolor,
            and the app ships a global `body span { color: ... !important }`
            that repaints every span on the page, so the arrow rendered dark
            beside a red value and said the opposite of what the value said. */}
        {FLAG_ARROW[f.flag] ? (
          <Glyph src={FLAG_ARROW[f.flag]} size={12} color="var(--tesseract-error-600)" />
        ) : null}
      </span>
      <span className={styles.dFindingRef}>{f.ref ? `Range ${f.ref}` : "No reference range"}</span>
    </button>
  );
}

/* A correlation is the unit a doctor actually has to judge, so clicking one
   opens it in full rather than leaving the argument inside a tooltip that
   disappears the moment the pointer moves. */
function CorrelationDetail({ correlation: c, onClose, onJump, onOpenReport }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Read straight off LINKS so the panel can never disagree with the chart. */
  const builtFrom = useMemo(
    () => LINKS.filter(([, to]) => to === c.id).map(([from]) => byId[from]).filter(Boolean),
    [c.id]
  );
  /* The actual documents behind the argument, deduped. byId indexes findings,
     correlations and hypotheses, not reports, so the document is looked up in
     REPORTS. This is the only real link there is, so it is the only one
     offered: nothing is invented. */
  const sourceReports = useMemo(() => {
    const seen = new Set();
    return builtFrom
      .map((f) => REPORTS.find((r) => r.id === f.report))
      .filter((r) => r && !seen.has(r.id) && seen.add(r.id));
  }, [builtFrom]);
  const fed = useMemo(
    () => LINKS.filter(([from]) => from === c.id).map(([, to]) => byId[to]).filter(Boolean),
    [c.id]
  );

  return (
    <aside className={styles.side} aria-label={c.name}>
      <div className={styles.sideHead}>
        <span className={styles.sideMain}>
          <span className={styles.sideKind}>Correlation</span>
          <span className={styles.sideName}>{c.name}</span>
        </span>
        <Button
          variant="ghost"
          theme="neutral"
          size="sm"
          leftIcon={<TPLibraryIcon name="close-square" size={18} />}
          aria-label="Close"
          onClick={onClose}
        />
      </div>

      <div className={styles.sideBody}>
        <div className={styles.verdictRow}>
          <EvidenceMeter level={c.evidence} verdict={c.verdict} />
          <div className={styles.verdictTags}>
            <Badge variant="soft" color={evidenceOf(c.evidence, c.verdict).badge} size="sm" icons="none">
              {c.verdict === "survived" ? "Survived the challenge" : "Weakened by the challenge"}
            </Badge>
            <Badge variant="soft" color="neutral" size="sm" icons="none">{c.support}</Badge>
          </div>
        </div>

        {c.verdict === "weakened" ? (
          <p className={styles.warnNote}>
            This link did not hold up. Treat anything built on it as provisional.
          </p>
        ) : null}

        <section className={styles.dSec}>
          <DLabel>Why these go together</DLabel>
          <p className={styles.dBody}>{withValues(c.mechanism)}</p>
        </section>

        <section className={styles.dSec}>
          <DLabel>Tested against</DLabel>
          {/* Quoted rather than paraphrased: the point is that the agent made
              this argument, not that we are reporting it. */}
          <blockquote className={styles.dQuote}>{withValues(c.attack)}</blockquote>
        </section>

        {c.citation ? (
          <section className={styles.dSec}>
            <DLabel>Guide rule</DLabel>
            <blockquote className={styles.dQuote}>{withValues(c.citation)}</blockquote>
          </section>
        ) : null}

        <section className={styles.dSec}>
          <DLabel count={builtFrom.length}>Built from</DLabel>
          <div className={styles.dList}>
            {builtFrom.map((f) => (
              <FindingRow key={f.id} finding={f} onClick={() => onJump && onJump(f.id)} />
            ))}
          </div>
        </section>

        {sourceReports.length > 0 && onOpenReport ? (
          <section className={styles.dSec}>
            <DLabel>Read from</DLabel>
            <div className={styles.dList}>
              {sourceReports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.dSource}
                  onClick={() => onOpenReport(r)}
                >
                  <span className={styles.dSourceName}>{r.name}</span>
                  <span className={styles.dSourceMeta}>{r.date}</span>
                  <Glyph src={ARROW} size={12} />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {fed.length > 0 ? (
          <section className={styles.dSec}>
            <DLabel>What it supports</DLabel>
            <div className={styles.dList}>
              {fed.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={styles.dHyp}
                  onClick={() => onJump && onJump(h.id)}
                >
                  <span className={styles.dHypName}>{h.name}</span>
                  <span className={styles.dHypMeta}>{TIER_LABEL[h.tier] || h.tier}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <p className={styles.warnNote}>
            Nothing was built from this link. It survived, then led nowhere.
          </p>
        )}
      </div>
    </aside>
  );
}

/* The hypothesis, opened in the same dock. Everything the tier cards below the
   chart carry is here, plus the action, so a doctor who clicks a node never has
   to scroll past the chart to finish the thought. */
function HypothesisDetail({ hypothesis: h, onClose, onAddTest, onAddDiagnosis, added, diagnosed, onJump }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* The correlations it rests on, and whether any was weakened: a hypothesis is
     never stronger than the links underneath it. */
  const from = useMemo(
    () => LINKS.filter(([, to]) => to === h.id).map(([f]) => byId[f]).filter((c) => c && c.evidence),
    [h.id]
  );
  const weak = from.filter((c) => c.verdict === "weakened");
  const isAdded = Boolean(added && added[h.id]);
  const isDiagnosed = Boolean(diagnosed && diagnosed[h.id]);
  /* Every entry in this column is a candidate diagnosis now, so every one can
     be recorded. What differs is how confident the agent is, which the meter
     and the tone already say. */
  const canDiagnose = true;
  /* One test confirms less than a panel does, so the shape is a list. The
     fixture carries a single nextTest today; anything that later returns
     nextTests renders without a change here. */
  /* The service returns no suggested investigations, so this card offers none.
     Anything it listed would be our invention wearing the agent's voice. What
     the agent is unsure about appears as Open questions under the chart. */

  return (
    <aside className={styles.side} aria-label={h.name}>
      <div className={styles.sideHead}>
        <span className={styles.sideMain}>
          <span className={styles.sideKind}>{TIER_LABEL[h.tier] || h.tier}</span>
          <span className={styles.sideName}>{h.name}</span>
        </span>
        <Button
          variant="ghost"
          theme="neutral"
          size="sm"
          leftIcon={<TPLibraryIcon name="close-square" size={18} />}
          aria-label="Close"
          onClick={onClose}
        />
      </div>

      <div className={styles.sideBody}>
        <div className={styles.verdictRow}>
          <EvidenceMeter level={h.confidence} verdict={weak.length ? "weakened" : "survived"} />
          <div className={styles.verdictTags}>
            <Badge
              variant="soft"
              color={evidenceOf(h.confidence, weak.length ? "weakened" : "survived").badge}
              size="sm"
              icons="none"
            >
              Built from {from.length} {from.length === 1 ? "correlation" : "correlations"}
            </Badge>
          </div>
        </div>

        {weak.length > 0 ? (
          <p className={styles.warnNote}>
            {weak.length === 1 ? "One link" : `${weak.length} links`} underneath this did not survive
            the challenge, so it cannot be read as settled.
          </p>
        ) : null}

        <section className={styles.dSec}>
          <DLabel>Why the agent thinks so</DLabel>
          <p className={styles.dBody}>{withValues(h.rationale)}</p>
        </section>

        <section className={styles.dSec}>
          <DLabel>What would change this</DLabel>
          <blockquote className={styles.dQuote}>{withValues(h.alternatives)}</blockquote>
        </section>

        <section className={styles.dSec}>
          <DLabel count={from.length}>Built from</DLabel>
          <div className={styles.dList}>
            {from.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.dCorr}
                data-weak={c.verdict === "weakened" || undefined}
                onClick={() => onJump && onJump(c.id)}
              >
                <span className={styles.dCorrName}>{c.name}</span>
                <span className={styles.dCorrMeta}>
                  {c.evidence} evidence · {c.verdict === "weakened" ? "weakened" : "survived"}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Two different things a doctor can do with a hypothesis, and they are
          not alternatives. A claim in Most likely is something you can WRITE
          DOWN as a diagnosis; a suggested test is something you ORDER to find
          out. A hypothesis can offer both, one, or neither, so each action is
          rendered only when the data supports it. Worth excluding and
          Incidental never offer the diagnosis, because you do not record a
          diagnosis you are trying to rule out. */}
      {canDiagnose ? (
        <div className={styles.sideFoot}>
          {canDiagnose ? (
            <div className={styles.actionRow}>
              <span className={styles.sideFootLabel}>
                {isDiagnosed ? "Added to diagnosis" : "Add to diagnosis"}
                <b>{h.name}</b>
              </span>
              <Button
                variant="solid"
                theme="primary"
                size="md"
                disabled={isDiagnosed}
                className={styles.addCta}
                leftIcon={<TPLibraryIcon name="add" family="essential" size={18} />}
                onClick={() => onAddDiagnosis && onAddDiagnosis(h.id, h.name)}
              >
                {isDiagnosed ? "Added to Rx" : "Add to Rx"}
              </Button>
            </div>
          ) : null}

          {/* Below the divider: what would raise the confidence. The diagnosis
              is the answer, these are how to be surer of it, so they never
              compete with it for the primary button. */}
        </div>
      ) : null}
    </aside>
  );
}

/* ------------------------------------------------------------------ result */

/* Tier and confidence answer different questions, and a doctor reading "Worth
   Excluding, Strong" without that distinction reads a contradiction. The tier
   is the instruction, the confidence is how sure the agent is of the claim, so
   each tier heading carries the pair in its own words. */
const TIER_HINT = {
  Strong: "The reports support this well. Confirm it if you want, but you can act on it.",
  Medium: "Supported, with a gap the reports cannot close. The suggested tests are what would close it.",
  Low: "Open rather than likely. Shown so it is not silently dropped, not because the agent is recommending it.",
};

function Tier({ name, count, children }) {
  return (
    <div className={styles.tier}>
      {/* Name and count are one label, so they stay adjacent and the rule runs
          out to the right of both. */}
      <div className={styles.tierHead}>
        <span className={styles.tierBtn}>
          <span className={styles.tierName}>{name}</span>
          <InfoPop label={`What ${name} means`} width={320}>{TIER_HINT[name]}</InfoPop>
        </span>
        <span className={styles.tierCount}>{count}</span>
        <span className={styles.tierRule} />
      </div>
      {/* Two or more hypotheses sit side by side rather than stack down a
          drawer that is already 80% of the screen wide. */}
      <div className={styles.tierBody}>{children}</div>
    </div>
  );
}

/** Colour and word both carry the rank, so colour is never the only signal. */
const CONFIDENCE_COLOR = { Strong: "success", Moderate: "warning", Low: "neutral", Speculative: "neutral" };

function ConfidenceChip({ level }) {
  return (
    <Badge variant="soft" color={CONFIDENCE_COLOR[level] || "neutral"} size="xs" icons="none">
      {level} confidence
    </Badge>
  );
}

/* The challenge result is a property of the correlations a hypothesis was
   built on, never a fixture sentence. One weakened correlation underneath and
   the card may not claim it survived. */
function challengeBadge(hypothesisId) {
  const sources = LINKS.filter(([, target]) => target === hypothesisId)
    .map(([source]) => CORRELATIONS.find((c) => c.id === source))
    .filter(Boolean);
  if (sources.length === 0) return null;
  const weakened = sources.filter((c) => c.verdict === "weakened").length;
  if (weakened === 0) return { color: "success", label: "Survived challenge" };
  return { color: "warning", label: `${weakened} of ${sources.length} links weakened` };
}

/* The card face carries one line, so the rationale is cut at its first clause.
   The full sentence stays a click away under Details. */
function firstClause(text) {
  const cut = text.split(/,\s(?:which|providing|suggest)|\.\s/)[0];
  return cut.length < text.length ? `${cut}.` : text;
}

function HypothesisCard({ hypothesis: h, selected, onSelect, onAddTest }) {
  const challenge = challengeBadge(h.id);

  return (
    <div
      className={selected ? `${styles.hypShell} ${styles.hypOn}` : styles.hypShell}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      title="Click to trace it in the chart"
      onClick={() => onSelect(selected ? null : h.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(selected ? null : h.id);
        }
      }}
    >
      <SectionCard
        title={h.name}
        bordered
        divided={false}
        className={styles.hypCard}
        headerActions={<ConfidenceChip level={h.confidence} />}
      >
        <div className={styles.chips}>
          {challenge ? (
            <Badge variant="soft" color={challenge.color} size="xs" icons="none">
              {challenge.label}
            </Badge>
          ) : null}
          {selected ? (
            <Badge variant="soft" color="violet" size="xs" icons="none">
              Traced above
            </Badge>
          ) : null}
        </div>

        <p className={styles.hypWhy}>{firstClause(h.rationale)}</p>

        {/* The order is the point of the card, so it sits on the face beside
            the test it orders, not buried under Details. */}
        {(h.investigations || [])[0] ? (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div className={styles.hypAct} onClick={(e) => e.stopPropagation()}>
            <span className={styles.hypNext}>{h.investigations[0]}</span>
            <Button
              variant="solid"
              theme="primary"
              size="sm"
              rightIcon={<Glyph src={ARROW} size={14} />}
              onClick={() => onAddTest && onAddTest(h.id, h.investigations)}
            >
              Add to Rx
            </Button>
          </div>
        ) : null}

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className={styles.hypMore} onClick={(e) => e.stopPropagation()}>
          <Accordion type="single" collapsible density="compact">
            <AccordionItem value="detail">
              <AccordionTrigger>Details</AccordionTrigger>
              <AccordionContent>
                <dl className={styles.detail}>
                  <dt>Not ruled out</dt>
                  <dd>{h.alternatives}</dd>
                  <dt>Built from</dt>
                  <dd>{LINKS.filter(([, to]) => to === h.id).length} correlations</dd>
                  <dt>Why</dt>
                  <dd>{h.rationale}</dd>
                </dl>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SectionCard>
    </div>
  );
}

function ResultStep({ findingCount, reportCount, onAddTest, onDetail }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const chartRef = useRef(null);

  /* Selecting a correlation opens it in the dock. Findings and hypotheses just
     trace on the chart, because each already reads in full somewhere on this
     page and a panel would only repeat it. */
  const selectAndReveal = useCallback((id) => {
    setSelected(id);
    /* Correlations and hypotheses open in the dock; findings only trace. The
       v2 API returns UPPERCASE ids (C1, H1, F-...), so this match is
       case-insensitive. It was lowercase-only, which meant the detail panel
       never opened on a live run. Findings start with F and are excluded. */
    const opensDock = Boolean(id) && /^[ch]/i.test(String(id)) && !/^f/i.test(String(id));
    setDetail(opensDock ? id : null);
    /* Told on every click, not derived from `detail` changing. The dock is
       closed by the host, which leaves `detail` still holding that id here, so
       clicking the SAME card again was a no-op state write and the panel never
       reopened — while a different card, then back, worked fine. */
    if (onDetail) onDetail(opensDock ? byId[id] : null);
    if (id && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [onDetail]);

  const tiers = useMemo(() => ({
    strong: HYPOTHESES.filter((h) => h.tier === "strong"),
    medium: HYPOTHESES.filter((h) => h.tier === "medium"),
    low: HYPOTHESES.filter((h) => h.tier === "low"),
  }), []);

  const spread = RUN_META.cardinality === "two_timepoints" ? "Two time points" : "Single time point";

  return (
    <div className={styles.resultWrap}>
      {/* The chart IS the page, so it gets no card around it. The bordered
          shell and its heading were furniture wrapped around the only thing a
          doctor came here to look at. The run's own counts ride quietly above
          it instead. */}
      <div className={styles.chartWrap} ref={chartRef}>
        <div className={styles.chartMeta}>
          <span>{reportCount} reports · {findingCount} findings</span>
          <span aria-hidden="true">·</span>
          <span>{spread}</span>
        </div>

        <CorrelationSankey
          selected={selected}
          onSelect={selectAndReveal}
          onAddTest={onAddTest}
          fit={Boolean(detail)}
        />

        <div className={styles.legend}>
          {/* Names the one scale the chart uses. It used to read "Associated
              with / Contradicts", describing a colouring that no longer
              exists. */}
          {/* Evidence is a property of the DIAGNOSIS column only. The middle
              column is the reasoning that got there, so it is neutral. */}
          <span className={styles.lg}><span className={`${styles.sw} ${styles.swStrong}`} /> Strong</span>
          <span className={styles.lg}><span className={`${styles.sw} ${styles.swModerate}`} /> Medium</span>
          <span className={styles.lg}><span className={`${styles.sw} ${styles.swLow}`} /> Low</span>
          <span className={styles.lg}><span className={`${styles.sw} ${styles.swReason}`} /> Reasoning step</span>
          <span className={styles.lg}>Thicker ribbon means stronger evidence</span>
          <span className={styles.lgMuted}>Hover any node or ribbon. Click a correlation to open it.</span>
        </div>
      </div>

      {/* Only a run that announced more than it delivered gets to raise an
          alarm. Every number in it comes from the run, not from a sentence. */}
      {hypothesisGap() !== 0 ? (
        <div className={styles.alarm}>
          <Accordion type="single" collapsible density="compact">
            <AccordionItem value="gap">
              <AccordionTrigger>
                <span className={styles.alarmLine}>
                  <Badge variant="soft" color="error" size="xs" icons="none">
                    Gap
                  </Badge>
                  {RUN_META.announcedHypotheses} hypotheses reported,{" "}
                  {RUN_META.deliveredHypotheses} delivered
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className={styles.alarmDetail}>
                  The completion event announces {RUN_META.announcedHypotheses}. The payload carries{" "}
                  {RUN_META.deliveredHypotheses}, so {Math.abs(hypothesisGap())}{" "}
                  {Math.abs(hypothesisGap()) === 1 ? "is" : "are"} unaccounted for
                  {RUN_META.corrections > 0
                    ? `, after ${RUN_META.corrections} automated corrections`
                    : ""}
                  . Correlations that built nothing end in red stubs in the chart above.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : null}

      {/* Everything actionable, folded into one section under the chart. The
          chart is where a doctor reads; this is where they decide, and keeping
          the two apart means the reading surface is not half buried under
          buttons. Open by default, because the decision is the point. */}
      <SectionCard
        title={<span className={styles.actionsHead}>What you can do</span>}
        icon="task-square"
        iconColor="var(--vrx-ink)"
        tone="violet"
        className={styles.actionsCard}
        bordered
        divided={false}
        collapsible
        defaultCollapsed
        headerActions={
          <span className={styles.actionsCount}>
            {HYPOTHESES.length} {HYPOTHESES.length === 1 ? "hypothesis" : "hypotheses"}
          </span>
        }
      >
          {/* The three tiers are separate verdicts, not one list. Without a
              spaced container they butted together and the next tier's
              heading sat directly on the previous tier's last card. */}
          <div className={styles.tiers}>
            <Tier name="Strong" count={tiers.strong.length}>
              {tiers.strong.length > 0 ? (
                tiers.strong.map((h) => (
                  <HypothesisCard
                    key={h.id}
                    hypothesis={h}
                    selected={selected === h.id}
                    onSelect={selectAndReveal}
                    onAddTest={onAddTest}
                  />
                ))
              ) : (
                <div className={styles.emptyTier}>
                  <b>Nothing qualified.</b> No correlation cleared this bar, so the tier stays empty
                  rather than promote a lesser one.
                </div>
              )}
            </Tier>

            <Tier name="Medium" count={tiers.medium.length}>
              {tiers.medium.map((h) => (
                <HypothesisCard
                  key={h.id}
                  hypothesis={h}
                  selected={selected === h.id}
                  onSelect={selectAndReveal}
                  onAddTest={onAddTest}
                />
              ))}
            </Tier>

            <Tier name="Low" count={tiers.low.length}>
              {tiers.low.map((h) => (
                <HypothesisCard
                  key={h.id}
                  hypothesis={h}
                  selected={selected === h.id}
                  onSelect={selectAndReveal}
                  onAddTest={onAddTest}
                />
              ))}
            </Tier>
          </div>

      </SectionCard>

      {/* What the agent could NOT settle. It returns these itself, and they are
          the honest version of "what would raise confidence": a question it
          wants answered, rather than a test we invented on its behalf. */}
      {RUN_META.openQuestions && RUN_META.openQuestions.length > 0 ? (
        <section className={styles.openQ}>
          <h4 className={styles.openQHead}>
            Open questions
            <Badge variant="soft" color="neutral" size="xs" icons="none">
              {RUN_META.openQuestions.length}
            </Badge>
          </h4>
          <ul className={styles.openQList}>
            {RUN_META.openQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* The run's own provenance. These two lines used to float loose under
          the chart, reading as leftover text rather than as a statement about
          the result. Kept together in one quiet band, they read as a footnote
          to the whole thing, which is what they are. */}
      <footer className={styles.runFoot}>
        <p className={styles.runState}>
          <span className={styles.runDot} data-ok={RUN_META.converged || undefined} aria-hidden="true" />
          {RUN_META.converged ? "Converged" : "Did not converge"} after{" "}
          {RUN_META.iterations} {RUN_META.iterations === 1 ? "pass" : "passes"}
          {RUN_META.cardinality === "two_timepoints" ? " · two time points" : " · single time point"}
        </p>
        <p className={styles.disclaimer}>{RUN_META.disclaimer}</p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------- shell */

export default function CorrelationFlowDrawer({
  open,
  onOpenChange,
  entry,
  onClose,
  onComplete,
  onAddTest,
  onAddDiagnosis,
  onPublish,
  onUploadReport,
  /* The patient the reports belong to: id, and optionally age/sex/history. Sent
     to the service as the reasoning context. */
  patient = null,
  /* The patient's real lab results and medical records, built by the host from
     the same data the side rail renders. */
  reports = [],
  initialStep = "bucket",
  /* The host's answer to "does this consultation already have a result?".
     Not read from the run store: that module keeps the last run for the whole
     browser session, including after the doctor moves to another patient, so
     trusting it would offer a doorway into someone else's correlation. */
  hasRun = false,
}) {
  const [step, setStep] = useState(initialStep);
  /* Opening with nothing ticked makes a doctor do setup before they can ask a
     question. The most recent day of the record is what they almost always
     mean, so it starts selected: the latest lab results AND the latest medical
     records, by date, both eligible. Everything stays unticked-able. */
  const defaultPicked = useCallback(() => {
    /* The seed says which section the doctor came FROM, so it is merged on top
       rather than used instead: arriving from Lab Results should not mean the
       latest imaging is left out of the question. */
    const next = { ...seedToPicked(entry?.seed || []) };
    ["labResults", "records"].forEach((source) => {
      const pool = reports.filter((r) => r.eligible && r.source === source);
      if (!pool.length) return;
      /* The most recent EPISODE, not the most recent day. A workup is
         routinely spread over two or three days: bloods on one, imaging and
         the follow-up panel on the next. Selecting only the latest date split
         those apart and quietly left the earlier half out of the question,
         which is exactly the half a correlation needs. Anything older than a
         week is a different episode and stays unticked. */
      const latest = Math.max(...pool.map((r) => reportTimestamp(r)));
      pool
        .filter((r) => latest - reportTimestamp(r) <= EPISODE_WINDOW)
        .forEach((r) => { next[r.id] = true; });
    });
    return next;
  }, [entry, reports]);

  const [picked, setPicked] = useState(defaultPicked);
  /* Reports added from inside the drawer. They live here, not in the fixture,
     so the picker can show them the moment they arrive. */
  const [uploads, setUploads] = useState([]);
  /* Whether a run produced a result during THIS opening of the drawer.
     Deliberately not "is there anything in demoRun": that module keeps the last
     run for the whole session, including after the doctor moves to another
     patient, so trusting it would offer a way back into someone else's
     correlation. Set when a run lands, cleared every time the drawer opens. */
  const [hasResult, setHasResult] = useState(() => initialStep === "result" || hasRun);
  /* The selection the current result was actually generated from. The picker
     re-seeds itself on open, so without this a reopened drawer showed the
     default selection rather than the one behind the result on screen — and the
     result header, which counts the live selection, claimed a different number
     of reports than the run had used. */
  const [ranPicked, setRanPicked] = useState(null);
  /* The gate is a toast on click now, not a dead button: pressing Generate with
     fewer than two reports says what to do rather than sitting greyed out. */
  const [gateToast, setGateToast] = useState(false);
  /* The opened record is a sibling of the scroller, not a child of it, so it
     docks to the drawer's right edge for its full height. */
  const [viewing, setViewing] = useState(null);
  const closeViewer = useCallback(() => setViewing(null), []);
  /* The open correlation, docked in the same slot a lab report uses. Only one
     of the two can be open, because there is only one dock. */
  const [openNode, setOpenNode] = useState(null);
  const closeNode = useCallback(() => setOpenNode(null), []);
  /* What has already been added, so the panel and the chart agree about it. */
  const [added, setAdded] = useState({});
  const [diagnosed, setDiagnosed] = useState({});

  /* The stylesheet lifts Tesseract's body-portalled overlays (the date picker's
     calendar, the Select listbox) over this drawer, and it keys off this
     attribute. Set for exactly as long as the drawer is on screen, and cleared
     on unmount so a drawer that closes never leaves the app restacked. */
  useEffect(() => {
    markCorrelationOpen(open);
    return () => markCorrelationOpen(false);
  }, [open]);

  /* Re-seed whenever the drawer is opened from a different surface, so
     "Correlate lab results" and "Correlate records" genuinely start
     differently rather than sharing one global bucket. */
  const seedKey = (entry?.seed || []).join(",");
  useEffect(() => {
    if (open) {
      /* Reopening on an existing result restores what that result was built
         from; only a fresh drawer starts from the default episode. */
      setPicked(hasRun && ranPicked ? ranPicked : defaultPicked());
      setStep(initialStep);
      setViewing(null);
      setOpenNode(null);
      /* The pad's card is NOT torn down here any more. Opening the picker is
         not the same as starting a run — the doctor may be reopening to look
         again, or on their way back to a result via the header — and clearing
         it here is what made "Done" then reopen come back empty. It now stands
         down when Generate is actually pressed, and returns with the result. */
      setAdded({});
      setDiagnosed({});
      setUploads([]);
      /* Reopening after a run in this consultation still has somewhere to go
         back to; only a genuinely fresh drawer has not. */
      setHasResult(initialStep === "result" || hasRun);
      /* No result to belong to means no selection to remember — so a snapshot
         cannot survive into another patient's drawer. */
      if (!hasRun) setRanPicked(null);
    }
  /* hasRun is deliberately NOT a dependency. This effect RESETS the drawer, and
     hasRun flips false->true at the exact moment a run lands — so listing it
     here re-ran the reset on completion and threw the doctor back to the picker
     the instant their result arrived. The one-way effect below carries that
     signal instead. */
  }, [open, seedKey, initialStep]); // eslint-disable-line react-hooks/exhaustive-deps

  /* One-way: a run landing means there is now something to go back to. It never
     clears here — only reopening the drawer does that, above. */
  useEffect(() => {
    if (hasRun) setHasResult(true);
  }, [hasRun]);

  /* The host owns the real "Upload Medical Records" panel. Where it hands one
     down we defer to it; otherwise the drawer opens its own stand-in. */
  /* Upload belongs to the product's own "Upload Medical Records" drawer, which
     posts to the live API. The correlation drawer never reimplements it: where
     the host passes onUploadReport we hand off, and where it does not (the
     standalone harness) the affordance is simply not offered. */
  const openUpload = useCallback(() => {
    if (onUploadReport) onUploadReport();
  }, [onUploadReport]);

  const pool = useMemo(() => [...uploads, ...reports], [uploads, reports]);
  const chosen = pool.filter((r) => picked[r.id] && r.eligible);
  /* What the result on screen was built from. Falls back to the live selection
     for a run started before this drawer was opened. */
  const ranCount = ranPicked
    ? pool.filter((r) => ranPicked[r.id] && r.eligible).length
    : chosen.length;
  const findingCount = chosen.reduce((n, r) => n + (r.params || 0), 0);
  /* Two or more REPORTS, whatever their modality. Several lab panels read
     against each other is a legitimate correlation, so the old two-modality
     gate is gone. entryPoints.js draws the same line. */
  const ready = chosen.length >= 2;

  const goResult = useCallback(() => {
    setStep("result");
    setHasResult(true);
    /* The pad reads this to decide whether to show the correlation card. It is
       published the moment the run lands, not when the drawer closes, so a
       doctor who leaves mid-read still finds the result waiting in the Rx. */
    if (onPublish) onPublish({ at: Date.now(), diagnosed: {}, ordered: {} });
    if (onComplete) {
      onComplete({
        reports: chosen.length,
        findings: FINDINGS.length,
        correlations: CORRELATIONS.length,
        excluding: HYPOTHESES.filter((h) => h.tier === "medium").length,
        incidental: HYPOTHESES.filter((h) => h.tier === "low").length,
        incomplete: hypothesisGap() !== 0,
      });
    }
  }, [onComplete, onPublish, chosen.length, findingCount]);

  const close = useCallback(() => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  }, [onOpenChange, onClose]);

  /* THE STEPPER IS GONE.
     Three numbered dots that name a linear flow the doctor is already being
     walked through, sitting in a header that also has to hold the title and
     the way out. It was chrome describing chrome: the current step is named by
     the content filling the screen underneath it, and the only step you can
     return to has its own control. Removing it also removes the width fight
     that made the header collide with itself.

     "Change reports" was a text link next to a solid button, which reads as an
     afterthought rather than the other half of a choice. It is a real action
     with a real destination, so it is a secondary button carrying an edit
     icon, and Done keeps the emphasis. */
  /* Going back to the picker is not "start over". The result stays in memory,
     so the detail dock is closed (it describes a card that is no longer on
     screen) and the way back is offered instead of being lost. Re-running is
     a ~40s round trip, so losing it to a mis-click was expensive. */
  const editReports = useCallback(() => {
    setOpenNode(null);
    setViewing(null);
    setStep("bucket");
  }, []);

  const headerAction = (
    <div className={styles.headBar}>
      {step === "bucket" && hasResult ? (
        <div className={styles.headActions}>
          <Button
            variant="outline"
            theme="neutral"
            size="sm"
            className={styles.changeCta}
            leftIcon={<Glyph src={ARROW_BACK} size={16} />}
            onClick={() => setStep("result")}
          >
            Back to result
          </Button>
        </div>
      ) : null}
      {step === "result" ? (
        <div className={styles.headActions}>
          {/* leftIcon takes a React element in this vendored build, the same
              way the Generate button renders its spark. */}
          <Button
            variant="outline"
            theme="neutral"
            size="sm"
            className={styles.changeCta}
            leftIcon={<Glyph src={EDIT_ICON} size={16} />}
            onClick={editReports}
          >
            Change reports
          </Button>
          {/* Done closes the run. That is the doctor's action, so it takes the
              product's primary blue rather than the agent gradient. */}
          <Button variant="solid" theme="primary" size="sm" className={styles.doneCta} onClick={close}>
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );

  /* The drawer's own footer band, so Generate is pinned to the bottom edge of
     the surface rather than to the bottom of a list that scrolls. */
  const footer =
    step === "bucket" ? (
      <div className={styles.foot}>
        {/* The count carries as tags now, not a faint caption: at a glance the
            doctor can see how many reports are in the run and how much signal
            they hold. The "selected" tag turns primary once anything is ticked,
            so the footer reflects the state it is gating. */}
        <span className={styles.tally}>
          <Badge
            variant="soft"
            color={chosen.length ? "primary" : "neutral"}
            size="sm"
            icons="none"
          >
            {chosen.length} selected
          </Badge>
          <Badge variant="soft" color="neutral" size="sm" icons="none">
            {findingCount} {findingCount === 1 ? "finding" : "findings"}
          </Badge>
        </span>

        {/* Always pressable, gated by a toast rather than a dead state. A greyed
            button with an orange sentence beside it made the doctor hunt for why
            nothing happened; pressing it now says exactly what to do. The
            gradient is the agent's identity, kept on throughout. */}
        <Button
          variant="solid"
          size="lg"
          className={`${styles.gradientCta} ${styles.genCta}`}
          leftIcon={<Glyph src={SPARK} size={18} color="var(--tesseract-fg-inverse)" />}
          onClick={() => {
            if (!ready) {
              setGateToast(true);
              return;
            }
            setViewing(null);
            /* A new run is starting, so the pad's card stands down until this
               one lands. It reappears the moment the result does. */
            if (typeof window !== "undefined") setRun(null);
            setRanPicked(picked);
            setStep("running");
          }}
        >
          Generate correlation
        </Button>
      </div>
    ) : null;

  return (
    <TesseractThemeProvider colorScheme="light">
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          side="right"
          width="90%"
          /* What the agent does belongs beside its name, revealed on demand,
             rather than eating a row of the step the doctor is working in. */
          title={
            <span className={styles.headTitle}>
              Correlation Agent
              {/* Persistent across every step. The feature is Beta, and the
                  header says so wherever a doctor is inside it. */}
              <span className={styles.headBeta}>Beta</span>
              <InfoPop label="What this does">
                {WHAT_THIS_DOES}
                <span className={styles.hintBeta}>{BETA_NOTE}</span>
              </InfoPop>
            </span>
          }
          action={headerAction}
          footer={footer}
          bodyPadding={0}
        >
          <div className={styles.drawer}>
            <div className={styles.scroll}>
              {step === "bucket" && (
                <BucketStep
                  picked={picked}
                  setPicked={setPicked}
                  onOpen={(r) => setViewing(r)}
                  uploads={uploads}
                  onUpload={openUpload}
                  reports={reports}
                />
              )}
              {step === "running" && (
                <RunningStep
                  onDone={goResult}
                  patient={patient}
                  reports={chosen}
                  onFail={() => setStep("bucket")}
                />
              )}
              {step === "result" && (
                <ResultStep
                  findingCount={findingCount}
                  reportCount={ranCount}
                  onAddTest={(hypothesisId, test) => onAddTest && onAddTest(hypothesisId, test)}
                  onDetail={setOpenNode}
                />
              )}
            </div>

            {viewing ? <RecordSidebar report={viewing} onClose={closeViewer} /> : null}
            {!viewing && openNode && openNode.tier ? (
              <HypothesisDetail
                hypothesis={openNode}
                added={added}
                diagnosed={diagnosed}
                onClose={closeNode}
                onAddTest={(id, test) => {
                  setAdded((a) => ({ ...a, [id]: true }));
                  const tests = Array.isArray(test) ? test : [test];
                  if (typeof window !== "undefined" && window.__correlationRun) {
                    tests.forEach((t) => { window.__correlationRun.ordered[`${id}:${t}`] = true; });
                    notifyRun();
                  }
                  if (onAddTest) onAddTest(id, test);
                }}
                onAddDiagnosis={(id, name) => {
                  setDiagnosed((d) => ({ ...d, [id]: true }));
                  if (typeof window !== "undefined" && window.__correlationRun) {
                    window.__correlationRun.diagnosed[id] = true;
                    notifyRun();
                  }
                  if (onAddDiagnosis) onAddDiagnosis(id, name);
                }}
              />
            ) : null}
            {!viewing && openNode && !openNode.tier ? (
              <CorrelationDetail
                correlation={openNode}
                onClose={closeNode}
                onOpenReport={(r) => setViewing(r)}
              />
            ) : null}

            {/* The gate, as a toast. Rendered inside the drawer so it stacks over
                the drawer's own content, docked above the footer where the CTA
                that raised it lives. Auto-dismisses; also closeable by hand. */}
            {gateToast ? (
              <div className={styles.toastWrap}>
                <Toast
                  status="warning"
                  title="Select at least two reports to correlate"
                  withSubtext={false}
                  withCTA={false}
                  dismissible
                  duration={2800}
                  onDismiss={() => setGateToast(false)}
                />
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </TesseractThemeProvider>
  );
}
