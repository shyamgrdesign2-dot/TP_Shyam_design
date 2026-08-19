import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, SectionCard, Tooltip, TPIcon } from "@dhspl-tatvacare/tesseract-ui";
import { SelectedChip, UnselectedChip } from "./HistoryChips";
import { ADD_CUSTOM_LABELS, isTagSelected } from "./constants";
import styles from "./medicalHistory.module.css";

/** Suggested chips are clamped to roughly two rows before "+N more" kicks in. */
const CHIP_ROWS_MAX_HEIGHT = 86;

/**
 * Tag titles in the library are not clean: plenty carry leading/among-words
 * whitespace, and case and punctuation vary. Comparing them raw sorted every
 * space-prefixed title ahead of the whole alphabet — which is why the Allergies
 * list looked like the A-Z toggle did nothing for its first few rows. Sorting on
 * a normalised key keeps the visible text as-is while ordering it the way the
 * doctor reads it.
 */
const sortKey = (title) => String(title || "").replace(/\s+/g, " ").trim();

const compareTitles = (a, b) =>
    sortKey(a.title).localeCompare(sortKey(b.title), undefined, {
        sensitivity: "base",
        numeric: true,
        ignorePunctuation: true,
    });

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
    /**
     * Tags are carried around as { tag, index } pairs, where `index` is the
     * position in section.tags. Looking the index up later with indexOf() is
     * not safe here: the tag library can hand back several rows with the same
     * title and tmmhst_id, and those collided React keys made the sorted chip
     * list render half unsorted (the A-Z toggle looked like it did nothing for
     * Allergies). The real index is unique, so it is both the key and the
     * value handed to onTagClick / onDeleteTag.
     */
    // Deliberately not memoised on section.tags: the parent updates a tag by
    // mutating that array in place and cloning only the outer list, so a
    // dependency on its identity would never see a newly selected chip.
    const visibleTags = (section.tags || [])
        .map((tag, index) => ({ tag, index }))
        .filter((entry) => !entry.tag.delete);
    const selectedTags = visibleTags.filter((entry) => isTagSelected(entry.tag));
    const unselectedTags = visibleTags.filter((entry) => !isTagSelected(entry.tag));

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

    const serverResults = searchResultTags || [];

    /**
     * The section's own suggestions and the hits coming back from the tag
     * library are shown as one list: splitting them under a "From tag library"
     * heading made the doctor scan two places for the same search. Library hits
     * that duplicate a chip already in the section are dropped, and they carry a
     * negative index so their key never collides with a real tag position.
     */
    const filteredUnselected = useMemo(() => {
        const list = query
            ? unselectedTags.filter((entry) =>
                  (entry.tag.title || "").toLowerCase().includes(query)
              )
            : [...unselectedTags];

        const seen = new Set(list.map((entry) => sortKey(entry.tag.title).toLowerCase()));
        serverResults.forEach((tag, i) => {
            const key = sortKey(tag.title).toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            list.push({ tag, index: -1 - i, fromLibrary: true });
        });

        // Ties fall back to the original order so the sort stays deterministic
        // when the same title appears more than once.
        if (sortMode === "az") {
            list.sort((a, b) => compareTitles(a.tag, b.tag) || a.index - b.index);
        } else if (sortMode === "za") {
            list.sort((a, b) => compareTitles(b.tag, a.tag) || a.index - b.index);
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unselectedTags, searchResultTags, query, sortMode]);

    /**
     * "Add as custom" is only offered when neither the section's own tags nor
     * the server's tag library already has an exact match — otherwise the
     * doctor would create a duplicate of a tag they could have just clicked.
     */
    const hasNoExactMatch =
        query &&
        !visibleTags.some((entry) => (entry.tag.title || "").toLowerCase() === query) &&
        !serverResults.some((t) => String(t.title || "").trim().toLowerCase() === query);

    // While a search is running every match is shown — clamping the results to
    // two rows behind a "+N more" hides the very chip the doctor searched for.
    const clampChips = !showAllChips && !query;

    useEffect(() => {
        if (!chipsRef.current || !clampChips) return;
        const container = chipsRef.current;
        if (container.scrollHeight > CHIP_ROWS_MAX_HEIGHT + 10) {
            const hidden = Array.from(container.children).filter(
                (child) => child.offsetTop + child.offsetHeight > CHIP_ROWS_MAX_HEIGHT
            ).length;
            setOverflowCount(hidden);
        } else {
            setOverflowCount(0);
        }
    }, [filteredUnselected, clampChips, crossSearchQuery]);

    const isChipSelected = (realIndex) =>
        selectedTag?.section_index === sectionIndex && selectedTag?.tag_index === realIndex;

    const buildSubtext = (tag) => {
        const parts = [tag.enable === "Y" ? "Yes" : "No"];
        if (tag.enable === "N") return parts;
        if (tag.since) parts.push(tag.since);
        // Surgical History carries its date here instead of a "since" value.
        if (tag.date) parts.push(tag.date);
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
                                {selectedTags.map(({ tag, index }) => (
                                    <SelectedChip
                                        key={index}
                                        tag={tag}
                                        enable={tag.enable}
                                        selected={isChipSelected(index)}
                                        subtextParts={buildSubtext(tag)}
                                        tooltipContent={buildTooltipContent(tag)}
                                        onTagClick={() =>
                                            onTagClick(section.tmmhs_id, tag.tmmhst_id, sectionIndex, index)
                                        }
                                        onDelete={() => onDeleteTag(sectionIndex, index)}
                                    />
                                ))}
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
                                        className={`${styles.tagGrid} ${clampChips ? styles.frequentlyUsedChips : ""}`}
                                    >
                                        {filteredUnselected.map(({ tag, index, fromLibrary }) => (
                                            <UnselectedChip
                                                key={index}
                                                tag={tag}
                                                onClick={() =>
                                                    fromLibrary
                                                        ? onAddSearchResult(sectionIndex, tag)
                                                        : onTagClick(
                                                              section.tmmhs_id,
                                                              tag.tmmhst_id,
                                                              sectionIndex,
                                                              index
                                                          )
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                                {/* "+N more" sits under the clamped rows rather
                                    than floating over them: as an overlay it
                                    covered the last chip of the second row, so
                                    that chip could never be read in full. */}
                                {overflowCount > 0 && !query && (
                                    <button
                                        className={styles.showMoreBtn}
                                        onClick={() => setShowAllChips((prev) => !prev)}
                                        type="button"
                                    >
                                        {showAllChips ? "Show less" : `+${overflowCount} more`}
                                        <span
                                            className={styles.showMoreArrow}
                                            data-expanded={String(showAllChips)}
                                        />
                                    </button>
                                )}
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
