import React, { useState, useEffect, useCallback, useRef } from "react";
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import styles from "./medicalHistory.module.css";

/**
 * Chips are tooltipped only when their text is actually clipped, so a short
 * label doesn't get a redundant hover card. Truncation is measured on mount and
 * re-measured on hover, since the chip grid reflows with the panel.
 */
function useTruncationCheck(refs) {
    const [isTruncated, setIsTruncated] = useState(false);

    const checkTruncation = useCallback(() => {
        const truncated = refs.some(
            (ref) => ref.current && ref.current.scrollWidth > ref.current.clientWidth
        );
        setIsTruncated(truncated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, refs);

    return { isTruncated, checkTruncation };
}

export function SelectedChip({
    tag,
    enable,
    selected,
    subtextParts,
    tooltipContent,
    onTagClick,
    onDelete,
}) {
    const titleRef = useRef(null);
    const subtextRef = useRef(null);
    const { isTruncated, checkTruncation } = useTruncationCheck([titleRef, subtextRef]);

    useEffect(() => {
        checkTruncation();
    }, [tag.title, subtextParts, checkTruncation]);

    const chip = (
        <div
            className={`${styles.selectedChip} ${styles.chipSlideIn}`}
            data-enable={enable || ""}
            data-selected={String(selected)}
            onClick={onTagClick}
            onMouseEnter={checkTruncation}
        >
            <div className={styles.selectedChipBody}>
                <div ref={titleRef} className={styles.selectedChipTitle}>
                    {tag.title}
                </div>
                {subtextParts.length > 0 && (
                    <div ref={subtextRef} className={styles.selectedChipSubtext}>
                        {subtextParts.map((part, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span className={styles.chipDot}> | </span>}
                                {part}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            <button
                className={styles.selectedChipClose}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                aria-label={`Remove ${tag.title}`}
            >
                &times;
            </button>
        </div>
    );

    return (
        <Tooltip
            content={tooltipContent}
            side="top"
            variant="dark"
            arrow
            maxWidth={360}
            disabled={!isTruncated}
        >
            {chip}
        </Tooltip>
    );
}

export function UnselectedChip({ tag, onClick }) {
    const titleRef = useRef(null);
    const { isTruncated, checkTruncation } = useTruncationCheck([titleRef]);

    useEffect(() => {
        checkTruncation();
    }, [checkTruncation]);

    return (
        <Tooltip content={tag.title} side="top" variant="dark" arrow disabled={!isTruncated}>
            <div
                className={styles.tagBadge}
                data-enable=""
                data-selected="false"
                onClick={onClick}
                onMouseEnter={checkTruncation}
            >
                <div ref={titleRef} className={styles.tagTitle}>
                    {tag.title}
                </div>
            </div>
        </Tooltip>
    );
}
