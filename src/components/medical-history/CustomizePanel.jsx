import React, { memo, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Toggle, Tooltip, TPIcon } from "@dhspl-tatvacare/tesseract-ui";
import { SECTION_ICONS, SECTION_TITLES } from "./constants";
import styles from "./medicalHistory.module.css";

function SortableCustomizeRow({ id, icon, name, isVisible, onToggleVisibility }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const rowStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined,
        opacity: isDragging ? 0.85 : 1,
    };

    return (
        <div ref={setNodeRef} style={rowStyle} className={styles.customizeRow} {...attributes}>
            <span ref={setActivatorNodeRef} className={styles.dragHandle} {...listeners}>
                <svg viewBox="64 64 896 896" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z" />
                </svg>
            </span>
            <span className={styles.customizeRowIcon}>
                <TPIcon name={icon} size={16} variant="bulk" />
            </span>
            <span className={styles.customizeRowName}>{name}</span>
            <Toggle
                size="sm"
                color="primary"
                checked={isVisible}
                onCheckedChange={onToggleVisibility}
                ariaLabel={`Toggle ${name} visibility`}
            />
        </div>
    );
}

/**
 * Contents of the gear popover: reorder sections by dragging, show/hide with a
 * toggle. Both are per-doctor preferences persisted via the section-config API
 * (see docs/MEDICAL-HISTORY-SECTION-CONFIG-API.md), not clinical data.
 */
function CustomizePanel({ order, hiddenSet, onDragEnd, onToggleVisibility, onReset }) {
    return (
        <div className={styles.customizePopover}>
            <div className={styles.customizePanelHeader}>
                <span className={styles.customizePanelTitle}>Customize Medical History</span>
                <Button
                    variant="link"
                    theme="warning"
                    size="sm"
                    onClick={onReset}
                    className={styles.customizePanelReset}
                >
                    Reset
                </Button>
            </div>
            <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                    {order.map((tmmhsId) => (
                        <SortableCustomizeRow
                            key={tmmhsId}
                            id={tmmhsId}
                            icon={SECTION_ICONS[tmmhsId] || "health"}
                            name={SECTION_TITLES[tmmhsId] || tmmhsId}
                            isVisible={!hiddenSet.has(tmmhsId)}
                            onToggleVisibility={() => onToggleVisibility(tmmhsId)}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
}

export default memo(CustomizePanel);

/**
 * Gear button + popover, rendered in MedicalHistoryBox's own header bar next to
 * Save. Kept here so the panel and its trigger stay together; the config state
 * itself lives in MedicalHistoryBox via useSectionConfig, because both the
 * header and the body need it.
 */
export function CustomizeButton({ order, hiddenSet, onDragEnd, onToggleVisibility, onReset }) {
    const [open, setOpen] = useState(false);

    return (
        <Tooltip
            trigger="click"
            variant="light"
            arrow
            side="bottom"
            align="end"
            sideOffset={8}
            maxWidth={380}
            open={open}
            onOpenChange={setOpen}
            interactive
            content={
                <CustomizePanel
                    order={order}
                    hiddenSet={hiddenSet}
                    onDragEnd={onDragEnd}
                    onToggleVisibility={onToggleVisibility}
                    onReset={onReset}
                />
            }
        >
            <Button
                variant="tonal"
                theme={open ? "primary" : "neutral"}
                size="md"
                className={styles.headerSettingsBtn}
                aria-label="Customize sections"
            >
                <TPIcon name="setting" size={18} variant="linear" />
            </Button>
        </Tooltip>
    );
}
