import React, { useEffect, useRef, useState } from "react";
import { Button, Dropdown, Progress, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { SidebarRight } from "iconsax-reactjs";
import { archivedRecordsStore, countsFor, statusOf, useArchivedRecords } from "./archivedRecordsStore";
import { KebabIcon } from "../../pages/appointment-listing/components/rowActions";
import { buildDigitization } from "./rxFormat";
import { buildMedicalHistory } from "./medicalHistory";
import { buildHospitalCourse } from "./hospitalCourse";
import { isCourseSummary } from "./noteGroups";
import AiDraftBadge, { InfoTag } from "./AiDraftBadge";
import PatientTag from "./PatientTag";
import ClinicalDataTab from "./ClinicalDataTab";
import DocumentsTab from "./DocumentsTab";
import RecordTab from "./RecordTab";
import SourcePageViewer from "./SourcePageViewer";
import { encounterMix } from "./encounterTypes";
import styles from "./ArchivedRecords.module.scss";

/**
 * The Case File workspace: the patient page tab and the review drawer.
 *
 *   Structured record   read it: the story of the file, medical history, and
 *                       an IPD or OPD summary for every encounter
 *   Clinical data       work it: verify, correct or remove each fact
 *   Documents           check it: the file paper by paper, with what was read
 *                       from each
 * One search box covers all three and the pages themselves. The source page
 * stays alongside; every [n] opens the exact line.
 */

const TEXT_SIZES = [
  { value: "sm", name: "Compact" },
  { value: "md", name: "Comfortable" },
  { value: "lg", name: "Large" },
];

// One line that says what this file is; shared with the patient-page banner.
// Beside the title: just how big the file is, in a bracket.
export const fileLine = (bundle) => `(${bundle.source.totalPages} pages, ${bundle.documents.length} documents)`;

// Everything else about the file, for the (i): where it is from, what kinds
// of visit it holds, its language, when and how it was read.
export const fileDetails = (bundle) =>
  `${bundle.source.facility} · ${encounterMix(bundle.encounters)} · ${bundle.source.language}${bundle.source.languagesNotRead ? ` (not read: ${bundle.source.languagesNotRead})` : ""} · ${bundle.source.trigger}. Read on ${bundle.source.processedOn} by ${bundle.source.engine}.`;

export default function ArchivedRecordsWorkspace({ reviewerName = "You", onApprove, initialTab = "data", variant = "drawer", header = "inline" }) {
  const { bundle, review, viewer, focusDomain } = useArchivedRecords();
  const [tab, setTab] = useState(initialTab);
  const [viewerOpen, setViewerOpen] = useState(true);

  // Reading size for the record side, kept between visits. Older eyes and
  // small laptops are part of the audience.
  const [textSize, setTextSize] = useState(() => {
    try {
      return window.localStorage.getItem("tp-case-file-text-size") || "md";
    } catch (error) {
      return "md";
    }
  });
  const chooseTextSize = (value) => {
    setTextSize(value);
    try {
      window.localStorage.setItem("tp-case-file-text-size", value);
    } catch (error) {
      // Private mode: the choice lasts for this visit only.
    }
  };
  const [focusId, setFocusId] = useState(null);
  // A correction being typed under Clinical data. It is kept here because a
  // tab's content unmounts when the reader leaves it (searching does that
  // too), and typed text must not vanish with it.
  const [editing, setEditing] = useState(null);
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const totals = countsFor(bundle.findings, review);

  // The rail panel can ask the workspace to open on one domain.
  useEffect(() => {
    if (!focusDomain) return;
    setTab("data");
    setDomainFilter(focusDomain);
    archivedRecordsStore.focusDomain(null);
  }, [focusDomain]);

  // A tab the reader chose starts at its top. (A row asked for by id is left
  // alone: it scrolls itself into view.)
  const scrollRef = useRef(null);
  const toTop = () =>
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });

  // Any citation click should bring the source pane back if it was hidden.
  useEffect(() => {
    setViewerOpen(true);
  }, [viewer]);

  const goToFinding = (finding) => {
    setTab("data");
    setDomainFilter(finding.domain);
    setStatusFilter("all");
    setFocusId(finding.id);
    archivedRecordsStore.openSource(finding.cite.page, finding.cite.rid);
  };
  const openDomain = (code) => {
    setTab("data");
    setDomainFilter(code);
    setStatusFilter("all");
    toTop();
  };
  const openReview = () => {
    setTab("data");
    setDomainFilter("all");
    setStatusFilter(totals.pending ? "draft" : "all");
    toTop();
  };
  const openAttention = () => {
    setTab("data");
    setDomainFilter("all");
    setStatusFilter("attention");
    toTop();
  };

  const onTab = (next) => {
    setTab(next);
    // Coming back to an open correction: Clinical data scrolls to it itself.
    if (!(next === "data" && editing)) toTop();
  };

  // Text size and how far the review has got: tools for the whole page, so
  // they sit in the header, not between the tabs and the rows.
  // The file as the product stores it, for a download: rows with their
  // source and review state, Medical History in its own table shape, and
  // the hospital course as written.
  const exportJson = () => {
    const facts = bundle.findings;
    const factOf = (id) => facts.find((item) => item.id === id) || (bundle.unlisted || []).find((item) => item.id === id) || null;
    const summaryOf = (encounterId) => facts.find((item) => isCourseSummary(item) && item.encounterId === encounterId) || null;
    const out = {
      patient: bundle.patient,
      medical_history: buildMedicalHistory(facts.filter((item) => statusOf(review, item.id) !== "rejected")),
      digitization: buildDigitization(facts.filter((item) => !isCourseSummary(item) && statusOf(review, item.id) !== "rejected"), { statusOf: (item) => statusOf(review, item.id) }),
      hospital_course: buildHospitalCourse(bundle, { factOf, summaryOf }),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `case-file-${(bundle.patient?.name || "patient").toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const moreActions = [
    { value: "review", label: totals.pending ? `Show only rows to review (${totals.pending})` : "Show all rows" },
    { value: "viewer", label: viewerOpen ? "Hide original pages" : "Show original pages" },
    { value: "json", label: "Download data (JSON)" },
    { value: "print", label: "Print" },
  ];
  const onMore = (value) => {
    if (value === "review") openReview();
    if (value === "viewer") setViewerOpen((open) => !open);
    if (value === "json") exportJson();
    if (value === "print") window.print();
  };
  const moreMenu = (
    <Dropdown
      className="tpKebabMenu"
      options={moreActions}
      value={null}
      onChange={onMore}
      chevron={false}
      variant="seamless"
      placeholder=""
      leadingIcon={<KebabIcon size={18} />}
      ariaLabel="More actions for this file"
    />
  );

  const pageTools = (
    <div className={styles.pageTools}>
      <Tooltip content={`Rows verified so far, out of every row read from this file.${totals.pending ? ` ${totals.pending} still to review.` : ""} Each row is checked against its page, then verified, edited or removed.`}>
        <span className={styles.progressTag} data-done={totals.pending === 0 ? "true" : undefined} tabIndex={0}>
          <Progress value={totals.total ? (totals.verified / totals.total) * 100 : 0} tone="success" size="sm" aria-hidden="true" />
          <span>{totals.verified} of {totals.total} verified</span>
        </span>
      </Tooltip>
      <div className={styles.textSize} role="group" aria-label="Text size">
        {TEXT_SIZES.map((size) => (
          <Tooltip key={size.value} content={`${size.name} text`}>
            <button type="button" aria-label={`${size.name} text`} aria-pressed={textSize === size.value} data-size={size.value} onClick={() => chooseTextSize(size.value)}>
              A
            </button>
          </Tooltip>
        ))}
      </div>
      {moreMenu}
    </div>
  );

  return (
    <div className={styles.workspace} data-variant={variant} data-text={textSize}>
      {/* On the patient page the violet banner carries the title and file line. */}
      {header === "inline" ? (
        <header className={styles.top}>
          <PatientTag />
          <div className={styles.topTags}>
            <AiDraftBadge />
          </div>
          {pageTools}
        </header>
      ) : null}

      <Tabs value={tab} onValueChange={onTab} className={styles.tabs}>
        <div className={styles.body} data-viewer={viewerOpen ? "open" : "closed"}>
          <div className={styles.main}>
            {/* Only the tabs here, across the full width. Each tab keeps its
                own filters and search under it. */}
            <div className={styles.toolbar}>
              <TabsList fullWidth>
                <TabsTrigger value="data" tag={totals.pending ? String(totals.pending) : undefined} tagTone="warning">Review data</TabsTrigger>
                <TabsTrigger value="record">Structured record</TabsTrigger>
                <TabsTrigger value="documents" tag={String(bundle.documents.length)}>Documents</TabsTrigger>
              </TabsList>
              {header === "inline" ? null : pageTools}
              {!viewerOpen ? (
                <Button variant="ghost" theme="neutral" size="sm" leftIcon={<SidebarRight size={16} />} onClick={() => setViewerOpen(true)}>
                  Show source page
                </Button>
              ) : null}
            </div>
            <div className={styles.scroll} ref={scrollRef}>
              <TabsContent value="record" className={styles.panel}>
                <RecordTab onOpenDomain={openDomain} onReview={openReview} />
              </TabsContent>
              <TabsContent value="data" className={styles.panel}>
                <ClinicalDataTab
                  bundle={bundle}
                  review={review}
                  reviewerName={reviewerName}
                  onApprove={onApprove}
                  focusId={focusId}
                  onFocused={() => setFocusId(null)}
                  editing={editing}
                  setEditing={setEditing}
                  domainFilter={domainFilter}
                  setDomainFilter={setDomainFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              </TabsContent>
              <TabsContent value="documents" className={styles.panel}>
                <DocumentsTab bundle={bundle} review={review} onOpenAttention={openAttention} />
              </TabsContent>
            </div>
          </div>
          {viewerOpen ? (
            <SourcePageViewer
              bundle={bundle}
              page={viewer.page}
              rid={viewer.rid}
              jump={viewer.n}
              onPageChange={(page, rid) => archivedRecordsStore.openSource(page, rid)}
              onHide={() => setViewerOpen(false)}
              onGoToFinding={goToFinding}
              headerEnd={<InfoTag tone="neutral" label={fileLine(bundle).replace(/^\(|\)$/g, "")} note={fileDetails(bundle)} ariaLabel="About this file" />}
            />
          ) : null}
        </div>
      </Tabs>
    </div>
  );
}
