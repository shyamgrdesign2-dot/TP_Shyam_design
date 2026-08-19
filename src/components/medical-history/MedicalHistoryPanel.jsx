import React, { useMemo } from "react";
import {
    InputBox,
    SectionCard,
    Skeleton,
    TesseractThemeProvider,
    TPIcon,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import SectionPanel from "./SectionPanel";
import DetailPanel from "./DetailPanel";
import {
    ADDITIONAL_HISTORY_SECTION_ID,
    SECTION_ICONS,
    isTagSelected,
} from "./constants";
import styles from "./medicalHistory.module.css";

/**
 * Body of the Medical History tab: section cards on the left, a detail editor
 * for the selected tag on the right.
 *
 * This is presentation only. All state and every save path still belong to
 * MedicalHistoryBox — that is deliberate, so the existing onSaveClicked
 * contract (medical_history_remarks, onlyYear/fullDate, clear-all,
 * handleCollapsed, Moengage) is untouched by the redesign.
 *
 * It renders inside the antd <Drawer> each call site already provides, so there
 * is no drawer shell here.
 */
function MedicalHistoryPanel({
    loading,
    sections,
    selectData,
    order,
    hiddenSet,
    crossSearchQuery,
    onCrossSearchChange,
    searchResultsBySection,
    onAddSearchResult,
    remarks,
    onRemarksChange,
    onTagClick,
    onDeleteTag,
    onNoKnownHistory,
    onSectionExpand,
    onAddCustom,
    onEnableChange,
    onStatusChange,
    onMedicationChange,
    onSinceChange,
    onRelationshipChange,
    onNoteChange,
    surgicalDateType,
    surgicalDate,
    onSurgicalDateTypeChange,
    onSurgicalDateChange,
    onSurgicalYearChange,
    heightOffset = 60,
    moduleCaptureSlot,
    additionalHistoryVoiceButton,
    additionalHistoryVoiceCaptureSlot,
    noteVoiceButton,
    noteVoiceCaptureSlot,
}) {
    /**
     * Space consumed above the panel inside the drawer: the 60px in-box header,
     * plus the antd tab strip when it is shown. Feeds the .drawerBody height
     * calc so the two columns fill exactly the remaining viewport instead of
     * overflowing by the height of the tab strip.
     */
    const rootStyle = { "--mh-header-height": `${heightOffset}px` };
    const selectedTagData = useMemo(() => {
        if (!selectData) return null;
        const section = sections?.[selectData.section_index];
        if (!section) return null;
        const tag = section.tags?.[selectData.tag_index];
        if (!tag || tag.delete) return null;
        return { tag, tmmhs_id: section.tmmhs_id, sectionTitle: section.title };
    }, [selectData, sections]);

    const showDetail = selectedTagData && isTagSelected(selectedTagData.tag);

    /**
     * A hidden section is still rendered when the patient already has data in
     * it — hiding a section must never conceal recorded clinical history.
     */
    const isSectionRenderable = (section) => {
        if (!hiddenSet.has(section.tmmhs_id)) return true;
        return (section.tags || []).some((t) => !t.delete && isTagSelected(t));
    };

    /**
     * Always rendered last and never listed in the customize panel: Additional
     * History has no server-side identity (it rides on medical_history_remarks),
     * so its position could not be persisted like the real sections'.
     */
    const renderAdditionalHistory = () => {
        return (
            <div key="additional" className={styles.sectionCardWrap}>
                <SectionCard
                    title="Additional History"
                    icon={SECTION_ICONS[ADDITIONAL_HISTORY_SECTION_ID]}
                    tone="violet"
                    iconColor="var(--tesseract-violet-500)"
                    divided
                    headerActions={additionalHistoryVoiceButton}
                >
                    {/* dictation target id must match the VoiceRxModuleButton above */}
                    <div
                        data-voice-rx-dictation-target="medical-history-additional"
                        style={{ position: "relative", width: "100%" }}
                    >
                        {additionalHistoryVoiceCaptureSlot}
                        <textarea
                            className={styles.additionalHistoryField}
                            value={remarks || ""}
                            onChange={onRemarksChange}
                            placeholder="Type any additional medical history notes here..."
                            rows={4}
                            maxLength={5000}
                        />
                        <div className={styles.additionalHistoryCount}>
                            {remarks?.length || 0}/5000
                        </div>
                    </div>
                </SectionCard>
            </div>
        );
    };

    if (loading) {
        return (
            <TesseractThemeProvider colorScheme="light">
                <div className={styles.panelRoot} style={rootStyle}>
                    <div style={{ padding: "var(--tesseract-space-6)" }}>
                        <Skeleton variant="rectangular" width="100%" height={120} radius="8" />
                        <div style={{ height: "var(--tesseract-space-4)" }} />
                        <Skeleton variant="rectangular" width="100%" height={120} radius="8" />
                        <div style={{ height: "var(--tesseract-space-4)" }} />
                        <Skeleton variant="rectangular" width="100%" height={120} radius="8" />
                    </div>
                </div>
            </TesseractThemeProvider>
        );
    }

    return (
        <TesseractThemeProvider colorScheme="light">
            <div className={styles.panelRoot} style={rootStyle}>
                {moduleCaptureSlot}
                <div className={styles.drawerBody}>
                    <div className={styles.leftPanel}>
                        <div className={styles.searchBar}>
                            <InputBox
                                placeholder="Search across all sections..."
                                leftIcon={<TPIcon name="search" size={16} variant="linear" />}
                                size="md"
                                surface="muted"
                                value={crossSearchQuery}
                                onChange={onCrossSearchChange}
                                clearable={!!crossSearchQuery}
                                fullWidth
                            />
                        </div>

                        <div className={styles.sectionsScroll}>
                            {order.map((entryId) => {
                                const sectionIndex = sections.findIndex(
                                    (s) => s.tmmhs_id === entryId
                                );
                                const section = sections[sectionIndex];
                                if (!section || !isSectionRenderable(section)) return null;
                                return (
                                    <SectionPanel
                                        key={section.tmmhs_id}
                                        section={section}
                                        sectionIndex={sectionIndex}
                                        icon={SECTION_ICONS[section.tmmhs_id]}
                                        selectedTag={selectData}
                                        crossSearchQuery={crossSearchQuery}
                                        searchResultTags={
                                            searchResultsBySection?.[section.tmmhs_id]
                                        }
                                        onTagClick={onTagClick}
                                        onAddSearchResult={onAddSearchResult}
                                        onNoKnownHistory={onNoKnownHistory}
                                        onSectionExpand={onSectionExpand}
                                        onAddCustom={onAddCustom}
                                        onDeleteTag={onDeleteTag}
                                    />
                                );
                            })}

                            {renderAdditionalHistory()}
                        </div>
                    </div>

                    <div className={styles.rightPanel}>
                        {showDetail ? (
                            <DetailPanel
                                tag={selectedTagData.tag}
                                tmmhs_id={selectedTagData.tmmhs_id}
                                sectionTitle={selectedTagData.sectionTitle}
                                surgicalDateType={surgicalDateType}
                                surgicalDate={surgicalDate}
                                onEnableChange={onEnableChange}
                                onStatusChange={onStatusChange}
                                onMedicationChange={onMedicationChange}
                                onSinceChange={onSinceChange}
                                onRelationshipChange={onRelationshipChange}
                                onNoteChange={onNoteChange}
                                onSurgicalDateTypeChange={onSurgicalDateTypeChange}
                                onSurgicalDateChange={onSurgicalDateChange}
                                onSurgicalYearChange={onSurgicalYearChange}
                                noteVoiceButton={noteVoiceButton}
                                noteVoiceCaptureSlot={noteVoiceCaptureSlot}
                            />
                        ) : (
                            <div className={styles.rightPanelEmpty}>
                                <span className={styles.emptyIcon}>
                                    <TPIcon name="health" size={48} variant="bulk" />
                                </span>
                                <div className={styles.emptyHeading}>No medical history selected</div>
                                <div className={styles.emptySubtext}>
                                    Pick a condition, allergy, or lifestyle chip from the left to view
                                    and edit its details here.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TesseractThemeProvider>
    );
}

export default MedicalHistoryPanel;
