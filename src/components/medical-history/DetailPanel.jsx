import React, { memo, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import {
    DatePicker,
    Divider,
    Dropdown,
    SegmentedControl,
    Tooltip,
    TPIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import SinceInput from "./SinceInput";
import {
    DATE_TYPE_OPTIONS,
    ENABLE_OPTIONS,
    MEDICATION_OPTIONS,
    RELATIONSHIP_OPTIONS,
    SECTION_ICONS,
    SECTIONS_WITH_STATUS_AND_SINCE,
    STATUS_OPTIONS,
} from "./constants";
import styles from "./medicalHistory.module.css";

/**
 * Right-hand editor for the currently selected tag.
 *
 * Surgical date deliberately stays in the parent's `surgicalDateType` /
 * `surgicalDate` state rather than on the tag: onSaveClicked is what writes it
 * onto the tag (as 'onlyYear'/'fullDate' + DD-MM-YYYY), and that conversion is
 * left untouched. This component only translates between that state and the
 * Date object the Tesseract DatePicker expects.
 */
function DetailPanel({
    tag,
    tmmhs_id,
    sectionTitle,
    surgicalDateType,
    surgicalDate,
    onEnableChange,
    onStatusChange,
    onMedicationChange,
    onSinceChange,
    onRelationshipChange,
    onNoteChange,
    onSurgicalDateTypeChange,
    onSurgicalDateChange,
    onSurgicalYearChange,
    noteVoiceButton,
    noteVoiceCaptureSlot,
}) {
    const isEnabled = tag.enable === "Y";
    const sectionIcon = SECTION_ICONS[tmmhs_id] || "health";
    const showStatusAndSince = SECTIONS_WITH_STATUS_AND_SINCE.includes(tmmhs_id);

    const relationships = useMemo(
        () => (tag.relationship ? tag.relationship.split(", ").filter(Boolean) : []),
        [tag.relationship]
    );

    const handleRelationshipChange = useCallback(
        (selected) => {
            onRelationshipChange(Array.isArray(selected) ? selected.join(", ") : selected || "");
        },
        [onRelationshipChange]
    );

    const dateValue = useMemo(() => {
        if (!surgicalDate) return null;
        if (surgicalDateType === "year") {
            const year = parseInt(surgicalDate, 10);
            return Number.isNaN(year) ? null : new Date(year, 0, 1);
        }
        const parsed = dayjs.isDayjs(surgicalDate) ? surgicalDate : dayjs(surgicalDate, "DD-MM-YYYY");
        return parsed.isValid() ? parsed.toDate() : null;
    }, [surgicalDate, surgicalDateType]);

    const handleDateChange = useCallback(
        (date) => {
            if (!date) {
                if (surgicalDateType === "year") onSurgicalYearChange(null);
                else onSurgicalDateChange(null);
                return;
            }
            if (surgicalDateType === "year") {
                onSurgicalYearChange(String(date.getFullYear()));
            } else {
                onSurgicalDateChange(dayjs(date));
            }
        },
        [surgicalDateType, onSurgicalDateChange, onSurgicalYearChange]
    );

    return (
        <div>
            <div className={styles.detailHeader}>
                <span className={styles.detailHeaderIcon}>
                    <TPIcon name={sectionIcon} size={20} variant="bulk" />
                </span>
                <div className={styles.detailHeaderText}>
                    <div className={styles.detailSection}>{sectionTitle}</div>
                    <Tooltip content={tag.title} side="bottom">
                        <div className={styles.detailTagName}>{tag.title}</div>
                    </Tooltip>
                </div>
            </div>

            <div className={styles.detailBody}>
                <div className={styles.detailFields}>
                    <div className={styles.fieldGroup} data-enable-value={tag.enable || "Y"}>
                        <SegmentedControl
                            options={ENABLE_OPTIONS}
                            value={tag.enable || "Y"}
                            onValueChange={onEnableChange}
                            size="md"
                            variant="block"
                            theme="primary"
                            fullWidth
                        />
                    </div>

                    <Divider spacing={8} />

                    {isEnabled && (
                        <>
                            {showStatusAndSince && (
                                <div className={styles.fieldGroup}>
                                    <span className={styles.fieldLabel}>Status</span>
                                    <SegmentedControl
                                        options={STATUS_OPTIONS}
                                        value={tag.status || ""}
                                        onValueChange={onStatusChange}
                                        size="md"
                                        variant="block"
                                        fullWidth
                                    />
                                </div>
                            )}

                            {showStatusAndSince && (
                                <div className={styles.fieldGroup}>
                                    <span className={styles.fieldLabel}>Since</span>
                                    <SinceInput value={tag.since || ""} onChange={onSinceChange} />
                                </div>
                            )}

                            {tmmhs_id === 2 && (tag.status || "Active") === "Active" && (
                                <div className={styles.fieldGroup}>
                                    <span className={styles.fieldLabel}>Medication</span>
                                    <SegmentedControl
                                        options={MEDICATION_OPTIONS}
                                        value={tag.medication || ""}
                                        onValueChange={onMedicationChange}
                                        size="md"
                                        variant="block"
                                        fullWidth
                                    />
                                </div>
                            )}

                            {tmmhs_id === 3 && (
                                <div className={styles.fieldGroup}>
                                    <span className={styles.fieldLabel}>Relationship</span>
                                    <Dropdown
                                        mode="multi"
                                        chips
                                        searchable
                                        clearable
                                        options={RELATIONSHIP_OPTIONS}
                                        value={relationships}
                                        onChange={handleRelationshipChange}
                                        placeholder="Select relationship"
                                        label=""
                                        searchPlaceholder="Search..."
                                        size="md"
                                    />
                                </div>
                            )}

                            {tmmhs_id === 5 && (
                                <>
                                    <div className={styles.fieldGroup}>
                                        <span className={styles.fieldLabel}>Date of Surgery</span>
                                        <SegmentedControl
                                            options={DATE_TYPE_OPTIONS}
                                            value={surgicalDateType || "year"}
                                            onValueChange={onSurgicalDateTypeChange}
                                            size="sm"
                                            variant="block"
                                            fullWidth
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <DatePicker
                                            mode={surgicalDateType === "year" ? "year" : "single"}
                                            value={dateValue}
                                            onChange={handleDateChange}
                                            placeholder={
                                                surgicalDateType === "year" ? "Select year" : "Select date"
                                            }
                                            size="md"
                                            fullWidth
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <span className={styles.fieldLabel}>Since</span>
                                        <SinceInput value={tag.since || ""} onChange={onSinceChange} />
                                    </div>
                                </>
                            )}

                            {/* dictation target id must match the note VoiceRxModuleButton */}
                            <div
                                className={styles.fieldGroup}
                                data-voice-rx-dictation-target="medical-history-note"
                            >
                                <span className={styles.fieldLabel}>
                                    {tmmhs_id === 5 ? "Surgical History Remarks" : "Note"}
                                    {noteVoiceButton}
                                </span>
                                {noteVoiceCaptureSlot}
                                <textarea
                                    className={styles.noteField}
                                    value={tag.note || ""}
                                    onChange={onNoteChange}
                                    placeholder={
                                        tmmhs_id === 5
                                            ? "Enter surgical history remarks here"
                                            : "Enter any specific notes here"
                                    }
                                    rows={3}
                                />
                            </div>
                        </>
                    )}

                    {!isEnabled && (
                        <div className={styles.detailEmpty}>
                            <span className={styles.detailEmptyIcon}>
                                <TPIcon name={sectionIcon} size={40} variant="bulk" />
                            </span>
                            <div className={styles.detailEmptyHeading}>Marked as No</div>
                            <div className={styles.detailEmptySubtext}>
                                This {String(sectionTitle || "").toLowerCase()} item is not applicable.
                                Toggle to Yes above to add details.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(DetailPanel);
