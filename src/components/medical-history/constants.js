/**
 * Shared constants for the Medical History drawer UI.
 *
 * IMPORTANT: the option *values* here are part of the persisted data contract.
 * They intentionally match what MedicalHistoryBox has always written, not the
 * values used by the medical-history-v2 prototype:
 *
 *   - medication is "Yes"/"No"  (the prototype used "Y"/"N")
 *   - relationship uses the existing 10-value list (the prototype invented a
 *     different 12-value list, which would orphan already-saved values)
 *   - status starts at "Active" for a newly selected tag in the sections that
 *     show the Status control (see SECTIONS_WITH_STATUS_AND_SINCE); tags loaded
 *     from the server keep whatever status they were saved with, including ""
 *
 * Changing any of these silently rewrites patient data on the next save.
 */

export const SECTION_TITLES = {
    1: "Lifestyle",
    2: "Medical Condition",
    3: "Family History",
    4: "Allergies",
    5: "Surgical History",
    6: "Additional History",
};

export const SECTION_ICONS = {
    1: "health-care",
    2: "clipboard-activity",
    3: "profile-2user",
    4: "mask",
    5: "surgical-scissors-02",
    6: "note-2",
};

/**
 * Additional History is not a real backend section — it rides on
 * `medical_history_remarks` of section[0]. It gets a section id purely so the
 * customize panel can order and hide it alongside the real sections. 6 matches
 * the id already used in MobileMedicalHistorySectionsList.
 */
export const ADDITIONAL_HISTORY_SECTION_ID = 6;

export const ADD_CUSTOM_LABELS = {
    1: "a custom lifestyle",
    2: "a custom medical condition",
    3: "a custom family history",
    4: "a custom allergy",
    5: "a custom surgical history",
};

export const SINCE_UNITS = [
    { singular: "Hour", plural: "Hour(s)" },
    { singular: "Day", plural: "Day(s)" },
    { singular: "Week", plural: "Week(s)" },
    { singular: "Month", plural: "Month(s)" },
    { singular: "Year", plural: "Year(s)" },
];

export const STATUS_OPTIONS = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
];

export const MEDICATION_OPTIONS = [
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
];

export const ENABLE_OPTIONS = [
    { value: "Y", label: "Yes" },
    { value: "N", label: "No" },
];

export const DATE_TYPE_OPTIONS = [
    { value: "year", label: "Year Only" },
    { value: "full", label: "Full Date" },
];

export const RELATIONSHIP_LIST = [
    "Father",
    "Mother",
    "Maternity Grandfather",
    "Maternity Grandmother",
    "Paternity Grandfather",
    "Paternity Grandmother",
    "Uncle",
    "Aunty",
    "Sibling",
    "Relatives",
];

export const RELATIONSHIP_OPTIONS = RELATIONSHIP_LIST.map((r) => ({ value: r, label: r }));

/** Sections whose tags carry Status + Since. */
export const SECTIONS_WITH_STATUS_AND_SINCE = [1, 2, 4];

/** Tag is "selected" (will be persisted) only in these enable states. */
export function isTagSelected(tag) {
    return tag?.enable === "Y" || tag?.enable === "N";
}

/**
 * Deselected tags use "-" rather than a delete flag, matching the existing
 * onSaveClicked filter (`enable == 'Y' || enable == 'N'`).
 */
export const ENABLE_DESELECTED = "-";
