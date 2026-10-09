import React, { useEffect, useRef } from "react";
import { Drawer, DrawerContent } from "@dhspl-tatvacare/tesseract-ui";
import { RxEvidenceSheet } from "../cards/clinical/RxEvidenceSheet";
import { CopilotIcon } from "../ui/CopilotIcon";
import { TPMedicalIcon } from "../compat/tp-ui";
import styles from "./EvidencePanel.module.css";

/**
 * The layer the drawer has to clear.
 *
 * The design system's Drawer portals to the body at z-index 1200, which is
 * plenty over an ordinary page and nowhere near enough here: the Copilot
 * popup is itself a body-level surface at 20050 (see CopilotDock.module.css),
 * so a citation opened the evidence *behind* the answer that cited it. The
 * drawer is a layer above Copilot, not a peer of it, so it sits above.
 *
 * Applied inline, and `!important`, because only the drawer's content element
 * takes a className from us - its scrim is a sibling the library owns - and
 * the library re-asserts its own stacking hard enough that a plain inline
 * value loses to it. Writing the two elements directly, rather than guessing
 * at hashed class names in a stylesheet, is what makes this survive a
 * library upgrade.
 */
const EVIDENCE_Z = 20060;

/**
 * The evidence drawer.
 *
 * Built on the design system's own Drawer rather than a bespoke aside, so it
 * behaves like every other slide-in surface in the product - focus trap,
 * scroll lock, Escape, focus restore - and looks like one too.
 *
 * It carries the *whole* cited set, not the one row that was clicked. A doctor
 * following a citation is about to ask "what else did this come from?", and
 * narrowing the drawer to a single record makes them go back for the answer.
 * The clicked record opens, scrolls into view and is marked; the rest stay
 * listed beneath it, one click away.
 */
export default function EvidencePanel({ cited, documents, activeNumber, onSelect, onClose }) {
  const rowRefs = useRef({});
  const surfaceRef = useRef(null);

  /* Lift the drawer and its scrim over the Copilot surface. The scrim is
     found by shape, not by class - fixed, full-bleed, and stacked directly
     under the content - so a renamed or rehashed library class cannot leave
     a dimmed sheet stranded below the popup. */
  useEffect(() => {
    const panel = drawerSurface(surfaceRef.current);
    if (!panel) return undefined;

    const restore = [];
    const raise = (el, z) => {
      if (!el) return;
      restore.push([el, el.style.zIndex, el.style.getPropertyPriority("z-index")]);
      el.style.setProperty("z-index", String(z), "important");
    };

    raise(drawerScrim(panel), EVIDENCE_Z);
    raise(panel, EVIDENCE_Z + 1);

    return () => {
      restore.forEach(([el, z, priority]) => {
        el.style.removeProperty("z-index");
        if (z) el.style.setProperty("z-index", z, priority);
      });
    };
  }, []);

  useEffect(() => {
    if (activeNumber == null) return undefined;
    const frame = requestAnimationFrame(() => {
      const el = rowRefs.current[activeNumber];
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeNumber]);

  return (
    <Drawer open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DrawerContent
        side="right"
        width="40%"
        showClose={false}
        /* The Drawer's own body wrapper carries padding via --drawer-body-pad.
           Zeroing it here is what makes the rows sit against the drawer edge;
           zeroing our own body was not enough, because theirs wraps it. */
        bodyPadding={0}
        className={styles.drawer}
      >
        <header className={styles.head}>
          <span className={styles.headIcon}>
            <CopilotIcon name="clipboard-tick" size={13} />
          </span>
          <span className={styles.title}>Evidence</span>
          <span className={styles.count}>
            {cited.length} record{cited.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close evidence"
          >
            <CopilotIcon name="close-square" variant="bold" size={18} />
          </button>
        </header>

        {/* The Drawer portals to document.body, which puts its contents
            outside the #dr-copilot-root the module's Tailwind is scoped to
            (see tailwind.copilot.config.js `important`). Without this the
            prescription sheet renders as unstyled text. A second element
            carrying the id is deliberate: the scoping selector matches by id,
            and re-scoping the whole build to a class would change its
            specificity and undo the preflight work that depends on it. */}
        <div
          id="dr-copilot-root"
          ref={surfaceRef}
          className={`dr-copilot-scope ${styles.body}`}
        >
          {cited.map((row) => {
            const doc = documents[row.number];
            if (!doc) return null;
            const active = row.number === activeNumber;
            return (
              <section
                key={row.number}
                ref={(el) => {
                  rowRefs.current[row.number] = el;
                }}
                className={[styles.entry, active ? styles.entryActive : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className={styles.entryHead}
                  onClick={() => onSelect(active ? null : row.number)}
                  aria-expanded={active}
                >
                  <span
                    className={[styles.caret, active ? styles.caretOpen : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                  >
                    <CopilotIcon name="arrow-right4" variant="linear" size={13} />
                  </span>
                  <span className={[styles.num, active ? styles.numActive : ""].join(" ")}>
                    {row.number}
                  </span>
                  <span className={styles.entryTitle}>{doc.title}</span>
                  <span className={styles.entryDate}>{doc.visit.date}</span>
                </button>

                {active && <div className={styles.entryBody}>{renderDocument(doc)}</div>}
              </section>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The drawer's own outermost box, walked up to from inside it.
 *
 * DrawerContent forwards its ref to something the library chooses, and what
 * that is has changed between versions. Climbing from a node we definitely
 * own to the first fixed ancestor lands on the sheet itself whatever the
 * internals look like.
 */
function drawerSurface(node) {
  let el = node;
  while (el && el !== document.body) {
    if (window.getComputedStyle(el).position === "fixed") return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * The dimmed sheet behind the drawer.
 *
 * Matched on shape rather than class name - fixed, full-bleed, sitting
 * directly under the drawer in the stack - because the library's class names
 * are hashed per build, and a miss here would leave the scrim stranded under
 * the Copilot popup while the drawer floated above it.
 */
function drawerScrim(panel) {
  const prev = panel.previousElementSibling;
  if (!prev) return null;
  const style = window.getComputedStyle(prev);
  if (style.position !== "fixed") return null;
  const box = prev.getBoundingClientRect();
  const covers =
    box.width >= window.innerWidth - 1 && box.height >= window.innerHeight - 1;
  return covers ? prev : null;
}

function renderDocument(doc) {
  if (doc.kind === "rx") return <RxEvidenceSheet document={doc} />;
  if (doc.kind === "vitals") return <VitalsRecord doc={doc} />;
  if (doc.kind === "condition") return <ConditionRecord doc={doc} />;
  return <RecordFallback doc={doc} />;
}

/**
 * A structured reading, shown with the vitals it was taken alongside.
 *
 * The cited reading is the headline; the rest of that visit's set sits under
 * it, with the cited row marked. A single number proves the answer, but the
 * set is what a doctor is actually checking - a blood pressure means something
 * different next to a temperature of 111 than it does on its own.
 *
 * Deliberately not dressed as a document. The archive stored a number, a unit
 * and a time; implying a source sheet that does not exist would be the one
 * dishonesty this drawer exists to avoid.
 */
function VitalsRecord({ doc }) {
  const citation = (doc.row && doc.row.citation) || {};
  const readings = doc.readings || [];

  return (
    <div className={styles.record}>
      <div className={styles.vitalHead}>
        <TPMedicalIcon
          name="Heart Rate"
          variant="bulk"
          size={15}
          color="var(--tp-blue-500, #4B4AD5)"
        />
        <span className={styles.recordTitle}>{doc.title}</span>
      </div>
      <p className={styles.recordValue}>{doc.value || "—"}</p>

      {readings.length > 1 && (
        <div className={styles.readings}>
          <div className={styles.readingsHead}>Recorded at this visit</div>
          {readings.map((reading) => {
            const cited = reading.sourcePath && reading.sourcePath === doc.citedPath;
            return (
              <div
                key={reading.sourcePath || reading.code}
                className={[styles.reading, cited ? styles.readingCited : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.readingLabel}>{reading.label}</span>
                <span className={styles.readingValue}>{reading.value || "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      <dl className={styles.grid}>
        <Item label="Status" value={doc.status} />
        <Item label="Recorded" value={doc.visit.recordedAt || citation.event_date} />
        <Item label="Visit" value={doc.visit.id} />
        <Item label="Provenance" value={citation.provenance} />
      </dl>

      <p className={styles.note}>
        Recorded as a structured reading. No consultation note came back with
        it, so there is no sheet to show alongside.
      </p>
    </div>
  );
}

/**
 * A diagnosis, with the problem list it was written into.
 *
 * The headline is the condition and what the source row carries about it -
 * ICD, since-when, remarks - fields the flat evidence object drops and a
 * doctor checks. Under it, everything else recorded at that visit, with the
 * cited one marked: one diagnosis says what was found, the list says what was
 * being carried alongside it.
 */
function ConditionRecord({ doc }) {
  const citation = (doc.row && doc.row.citation) || {};
  const details = doc.details || {};
  const others = doc.conditions || [];

  return (
    <div className={styles.record}>
      <div className={styles.vitalHead}>
        <TPMedicalIcon
          name="Diagnosis"
          variant="bulk"
          size={15}
          color="var(--tp-blue-500, #4B4AD5)"
        />
        <span className={styles.recordTitle}>{doc.title}</span>
      </div>

      <dl className={styles.grid}>
        <Item label="Status" value={doc.status} />
        <Item label="ICD" value={details.icd} />
        <Item label="Since" value={details.since} />
        <Item label="Type" value={details.type} />
        <Item label="Remarks" value={details.remarks} />
        <Item label="Recorded" value={doc.visit.recordedAt || citation.event_date} />
        <Item label="Visit" value={doc.visit.id} />
      </dl>

      {others.length > 1 && (
        <div className={styles.readings}>
          <div className={styles.readingsHead}>Recorded at this visit</div>
          {others.map((entry) => {
            const cited = entry.sourcePath && entry.sourcePath === doc.citedPath;
            return (
              <div
                key={entry.sourcePath || entry.name}
                className={[styles.reading, cited ? styles.readingCited : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.readingLabel}>{entry.name}</span>
                <span className={styles.readingValue}>{entry.status || "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecordFallback({ doc }) {
  const evidence = (doc.row && doc.row.evidence) || {};
  const citation = (doc.row && doc.row.citation) || {};
  const value =
    evidence.value_num != null
      ? `${evidence.value_num}${evidence.unit ? ` ${evidence.unit}` : ""}`
      : evidence.value_text || "";

  return (
    <div className={styles.record}>
      <h4 className={styles.recordTitle}>{doc.title}</h4>
      {value && <p className={styles.recordValue}>{value}</p>}

      <dl className={styles.grid}>
        <Item label="Recorded" value={citation.event_date} />
        <Item label="Visit" value={citation.visit_id} />
        <Item label="Status" value={evidence.status} />
        <Item label="System" value={evidence.source_system} />
        <Item label="Table" value={evidence.source_table} />
        <Item label="Record id" value={evidence.source_key} />
        <Item label="Path" value={citation.source_path} />
        <Item label="Provenance" value={citation.provenance} />
      </dl>
    </div>
  );
}

function Item({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{String(value)}</dd>
    </>
  );
}
