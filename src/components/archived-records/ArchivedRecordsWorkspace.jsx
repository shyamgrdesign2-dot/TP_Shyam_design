import React, { useEffect, useRef, useState } from "react";
import { Button, InputBox, Progress, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { InfoCircle, SearchNormal1, SidebarRight } from "iconsax-reactjs";
import { archivedRecordsStore, countsFor, useArchivedRecords } from "./archivedRecordsStore";
import AiDraftBadge from "./AiDraftBadge";
import ClinicalDataTab from "./ClinicalDataTab";
import DocumentsTab from "./DocumentsTab";
import RecordTab from "./RecordTab";
import SearchResults from "./SearchResults";
import SourcePageViewer from "./SourcePageViewer";
import { FEATURE_NAME } from "./archivedRecordsName";
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

export default function ArchivedRecordsWorkspace({ reviewerName = "You", onApprove, initialTab = "record", variant = "drawer", header = "inline" }) {
  const { bundle, review, viewer, focusDomain } = useArchivedRecords();
  const [tab, setTab] = useState(initialTab);
  const [lastTab, setLastTab] = useState(initialTab);
  const [query, setQuery] = useState("");
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

  // Search lives in the toolbar, not in a tab of its own: typing shows the
  // results in place, clearing the box returns to the tab the reader was on.
  const onSearch = (value) => {
    setQuery(value);
    if (value && tab !== "search") {
      setLastTab(tab);
      setTab("search");
      toTop();
    }
    if (!value && tab === "search") setTab(lastTab);
  };
  const onTab = (next) => {
    setQuery("");
    setTab(next);
    // Coming back to an open correction: Clinical data scrolls to it itself.
    if (!(next === "data" && editing)) toTop();
  };

  const aboutFile = (
    <Tooltip content={fileDetails(bundle)}>
      <button type="button" className={styles.infoBtn} aria-label="About this file"><InfoCircle size={14} /></button>
    </Tooltip>
  );

  return (
    <div className={styles.workspace} data-variant={variant} data-text={textSize}>
      {/* On the patient page the violet banner carries the title and file line. */}
      {header === "inline" ? (
        <header className={styles.top}>
          <div className={styles.topTitle}>
            <h2>
              {variant === "drawer" ? null : FEATURE_NAME}
              <AiDraftBadge />
            </h2>
            <p>
              {fileLine(bundle)}
              {aboutFile}
            </p>
          </div>
        </header>
      ) : null}

      <Tabs value={tab} onValueChange={onTab} className={styles.tabs}>
        <div className={styles.body} data-viewer={viewerOpen ? "open" : "closed"}>
          <div className={styles.main}>
            {/* Tabs, search and progress belong to the digitised record only;
                the original document beside it has its own header. */}
            <div className={styles.toolbar}>
              <TabsList>
                <TabsTrigger value="record">Structured record</TabsTrigger>
                <TabsTrigger value="data" tag={totals.pending ? String(totals.pending) : undefined} tagTone="warning">Clinical data</TabsTrigger>
                <TabsTrigger value="documents" tag={String(bundle.documents.length)}>Documents</TabsTrigger>
              </TabsList>
              <div className={styles.toolbarEnd}>
                <div className={styles.toolbarSearch}>
                  <InputBox
                    fullWidth
                    clearable
                    size="sm"
                    placeholder="Search this file"
                    aria-label="Search this file"
                    leftIcon={<SearchNormal1 size={16} />}
                    value={query}
                    onChange={(event) => onSearch(event.target.value)}
                    // Back to the results for what is already typed: on a click or
                    // Enter, not on focus, so tabbing past the box changes nothing.
                    onClick={() => { if (query) onSearch(query); }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && query) onSearch(query);
                      // Escape clears the search; it must not also close the drawer.
                      if (event.key === "Escape" && query) {
                        event.stopPropagation();
                        onSearch("");
                      }
                    }}
                  />
                </div>
                <div className={styles.textSize} role="group" aria-label="Text size">
                  {TEXT_SIZES.map((size) => (
                    <Tooltip key={size.value} content={`${size.name} text`}>
                      <button type="button" aria-label={`${size.name} text`} aria-pressed={textSize === size.value} data-size={size.value} onClick={() => chooseTextSize(size.value)}>
                        A
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <div className={styles.toolbarProgress}>
                  <span><strong>{totals.verified}</strong> of {totals.total} verified</span>
                  <Progress value={totals.total ? (totals.verified / totals.total) * 100 : 0} tone="success" size="sm" aria-label="Share of items verified" />
                </div>
                {header === "inline" ? null : aboutFile}
                {!viewerOpen ? (
                  <Button variant="ghost" theme="neutral" size="sm" leftIcon={<SidebarRight size={16} />} onClick={() => setViewerOpen(true)}>
                    Show source page
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={styles.scroll} ref={scrollRef}>
              <TabsContent value="record" className={styles.panel}>
                <RecordTab bundle={bundle} review={review} onOpenDomain={openDomain} onOpenAttention={openAttention} onReview={openReview} />
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
              <TabsContent value="search" className={styles.panel}>
                <SearchResults bundle={bundle} review={review} query={query} setQuery={onSearch} onGoTo={goToFinding} />
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
            />
          ) : null}
        </div>
      </Tabs>
    </div>
  );
}
