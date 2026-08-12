import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, SectionCard, Tooltip, TPIcon } from "@dhspl-tatvacare/tesseract-ui";
import { SelectedChip, UnselectedChip } from "./HistoryChips";
import { ADD_CUSTOM_LABELS, isTagSelected } from "./constants";
import styles from "./medicalHistory.module.css";

/** Suggested chips are clamped to roughly two rows before "+N more" kicks in. */
const CHIP_ROWS_MAX_HEIGHT = 86;

function SectionPanel({
    section,
    sectionIndex,
    icon,
    selectedTag,
    crossSearchQuery,
    searchResultTags,
    onTagClick,
    onAddSearchResult,
    onNoKnownHistory,
    onSectionExpand,
    onAddCustom,
    onDeleteTag,
}) {
    const allTags = (section.tags || []).filter((t) => !t.delete);
    const selectedTags = allTags.filter(isTagSelected);
    const unselectedTags = allTags.filter((t) => !isTagSelected(t));

    /**
     * `isExpand` is inherited from the old box, where a truthy value meant
     * COLLAPSED (its render did `!isExpand && tags.map(...)`) and the initial
     * value is undefined. Treating it as "expanded" made the first click a
     * no-op — undefined -> true left the card still open — so it took two
     * clicks to collapse.
     */
    const isCollapsed = !!section.isExpand;

    const [showAllChips, setShowAllChips] = useState(false);
    const [overflowCount, setOverflowCount] = useState(0);
    const [sortMode, setSortMode] = useState(null);
    const chipsRef = useRef(null);

    const query = (crossSearchQuery || "").trim().toLowerCase();

    const filteredUnselected = useMemo(() => {
        const list = query
            ? unselectedTags.filter((t) => (t.title || "").toLowerCase().includes(query))
            : [...unselectedTags];

        if (sortMode === "az") {
            list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        } else if (sortMode === "za") {
            list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unselectedTags, query, sortMode]);

    const serverResults = searchResultTags || [];

    /**
     * "Add as custom" is only offered when neither the section's own tags nor
     * the server's tag library already has an exact match — otherwise the
     * doctor would create a duplicate of a tag they could have just clicked.
     */
    const hasNoExactMatch =
        query &&
        !allTags.some((t) => (t.title || "").toLowerCase() === query) &&
        !serverResults.some((t) => String(t.title || "").trim().toLowerCase() === query);

    useEffect(() => {
        if (!chipsRef.current || showAllChips) return;
        const container = chipsRef.current;
        if (container.scrollHeight > CHIP_ROWS_MAX_HEIGHT + 10) {
            const hidden = Array.from(container.children).filter(
                (child) => child.offsetTop + child.offsetHeight > CHIP_ROWS_MAX_HEIGHT
            ).length;
            setOverflowCount(hidden);
        } else {
            setOverflowCount(0);
        }
    }, [filteredUnselected, showAllChips, crossSearchQuery]);

    const getRealIndex = (tag) => section.tags.indexOf(tag);

    const isChipSelected = (realIndex) =>
        selectedTag?.section_index === sectionIndex && selectedTag?.tag_index === realIndex;

    const buildSubtext = (tag) => {
        const parts = [tag.enable === "Y" ? "Yes" : "No"];
        if (tag.enable === "N") return parts;
        if (tag.since) parts.push(tag.since);
        if (tag.status) parts.push(tag.status);
        if (tag.relationship) parts.push(tag.relationship);
        if (tag.medication === "Yes") parts.push("On Medication");
        if (tag.note) parts.push(tag.note);
        return parts;
    };

    const buildTooltipContent = (tag) => {
        const rows = [{ label: "Enabled", value: tag.enable === "Y" ? "Yes" : "No" }];
        if (tag.enable === "Y") {
            if (tag.status) rows.push({ label: "Status", value: tag.status });
            if (tag.since) rows.push({ label: "Since", value: tag.since });
            if (tag.relationship) rows.push({ label: "Relation", value: tag.relationship });
            if (tag.medication) rows.push({ label: "Medication", value: tag.medication });
            if (tag.date) rows.push({ label: "Date of Surgery", value: tag.date });
            if (tag.note) rows.push({ label: "Note", value: tag.note });
        }
        return (
            <div className={styles.chipTooltip}>
                <div className={styles.chipTooltipTitle}>
                    {section.title && <>{section.title}: </>}
                    {tag.title}
                </div>
                <div className={styles.chipTooltipRows}>
                    {rows.map((r, i) => (
                        <div key={i} className={styles.chipTooltipRow}>
                            <span className={styles.chipTooltipBullet} />
                            <span className={styles.chipTooltipLabel}>{r.label}:</span>
                            <span className={styles.chipTooltipValue}>{r.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const addCustomLabel = ADD_CUSTOM_LABELS[section.tmmhs_id] || "+ Add as Custom";

    const sectionTitle = (
        <>
            {section.title}
            {selectedTags.length > 0 && !section.no_know_history && (
                <span className={styles.sectionCount}>{selectedTags.length}</span>
            )}
        </>
    );

    const sortTooltip =
        sortMode === "az"
            ? "Sort applied: A to Z (click to switch to Z-A)"
            : sortMode === "za"
              ? "Sort applied: Z to A (click to remove sort)"
              : "Sort alphabetically (A to Z)";

    return (
        <div className={styles.sectionCardWrap}>
            <SectionCard
                title={sectionTitle}
                icon={icon || "health"}
                collapsible={!section.no_know_history}
                collapsed={section.no_know_history ? true : isCollapsed}
                onCollapsedChange={() => onSectionExpand(sectionIndex)}
                tone="violet"
                iconColor="var(--tesseract-violet-500)"
                divided
                headerActions={
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            size="sm"
                            label="No known history"
                            checked={section.no_know_history || false}
                            onCheckedChange={(checked) => onNoKnownHistory(sectionIndex, checked)}
                        />
                    </div>
                }
            >
                {!section.no_know_history && (
                    <>
                        {selectedTags.length > 0 ? (
                            <div className={styles.tagGrid}>
                                {selectedTags.map((tag) => {
                                    const realIdx = getRealIndex(tag);
                                    return (
                                        <SelectedChip
                                            key={tag.unique_id || tag.tmmhst_id || realIdx}
                                            tag={tag}
                                            enable={tag.enable}
                                            selected={isChipSelected(realIdx)}
                                            subtextParts={buildSubtext(tag)}
                                            tooltipContent={buildTooltipContent(tag)}
                                            onTagClick={() =>
                                                onTagClick(section.tmmhs_id, tag.tmmhst_id, sectionIndex, realIdx)
                                            }
                                            onDelete={() => onDeleteTag(sectionIndex, realIdx)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.selectedTagsEmpty}>
                                Select the chips below to add them here
                            </div>
                        )}

                        {filteredUnselected.length > 0 && (
                            <>
                                <div className={styles.frequentlyUsedDivider}>
                                    <span className={styles.frequentlyUsedLabel}>
                                        {selectedTags.length > 0 ? "Frequently Used" : "Suggested"}
                                    </span>
                                    <Tooltip content={sortTooltip} side="top" variant="dark" arrow>
                                        <button
                                            className={styles.sortFilterBtn}
                                            type="button"
                                            data-active={String(!!sortMode)}
                                            data-sort={sortMode || ""}
                                            onClick={() =>
                                                setSortMode((prev) =>
                                                    prev === null ? "az" : prev === "az" ? "za" : null
                                                )
                                            }
                                        >
                                            <span className={styles.sortIcon} data-sort={sortMode || ""} />
                                        </button>
                                    </Tooltip>
                                </div>
                                <div className={styles.frequentlyUsedWrap}>
                                    <div
                                        ref={chipsRef}
                                        className={`${styles.tagGrid} ${showAllChips ? "" : styles.frequentlyUsedChips}`}
                                    >
                                        {filteredUnselected.map((tag) => {
                                            const realIdx = getRealIndex(tag);
                                            return (
                                                <UnselectedChip
                                                    key={tag.unique_id || tag.tmmhst_id || realIdx}
                                                    tag={tag}
                                                    onClick={() =>
                                                        onTagClick(
                                                            section.tmmhs_id,
                                                            tag.tmmhst_id,
                                                            sectionIndex,
                                                            realIdx
                                                        )
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                    {overflowCount > 0 && !showAllChips && (
                                        <button
                                            className={styles.showMoreOverlay}
                                            onClick={() => setShowAllChips(true)}
                                            type="button"
                                        >
                                            +{overflowCount} more
                                        </button>
                                    )}
                                </div>
                                {showAllChips && overflowCount > 0 && (
                                    <button
                                        className={styles.showMoreBtn}
                                        onClick={() => setShowAllChips(false)}
                                        type="button"
                                    >
                                        Show less
                                        <span className={styles.showMoreArrow} data-expanded="true" />
                                    </button>
                                )}
                            </>
                        )}

                        {serverResults.length > 0 && (
                            <>
                                <div className={styles.frequentlyUsedDivider}>
                                    <span className={styles.frequentlyUsedLabel}>
                                        From tag library
                                    </span>
                                </div>
                                <div className={styles.tagGrid}>
                                    {serverResults.map((tag) => (
                                        <UnselectedChip
                                            key={`server-${tag.tmmhst_id}-${tag.title}`}
                                            tag={tag}
                                            onClick={() => onAddSearchResult(sectionIndex, tag)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {hasNoExactMatch && (
                            <button
                                className={styles.addCustomBtn}
                                onClick={() => onAddCustom(sectionIndex)}
                                type="button"
                            >
                                <TPIcon name="add" size={16} variant="linear" family="arrow2" />
                                <span className={styles.addCustomLabel}>
                                    Add &ldquo;<strong>{crossSearchQuery}</strong>&rdquo; as {addCustomLabel}
                                </span>
                            </button>
                        )}
                    </>
                )}
            </SectionCard>
        </div>
    );
}

export default memo(SectionPanel);
