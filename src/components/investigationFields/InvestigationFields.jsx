import React from "react";
import { InputBox, Radio, RadioGroup, Button, Alert, SegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import styles from "./InvestigationFields.module.css";

const RESULT_TYPE_OPTIONS = [
  { value: "numeric", label: "Numeric" },
  { value: "text", label: "Text" },
  { value: "positive_negative", label: "Positive/Negative" },
  { value: "dropdown", label: "Dropdown" },
];

const GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/**
 * Name/unit/result-type/dropdown-options/reference-ranges fields for one
 * investigation. Reference ranges support gender AND age-band together
 * (e.g. Female 18-40 vs Female 41-60 vs Male 18-40 as separate rows) —
 * required so the abnormal-result calc can match on both dimensions.
 *
 * `duplicateCheck` (from useDuplicateCheck) drives the duplicate-name banner:
 * "blocked" (matches the standard catalog) is never dismissible — the caller
 * must disable submit while it's active; "warning" (matches another custom
 * investigation in this hospital) is a dismissible non-blocking heads-up.
 */
const InvestigationFields = ({ fields, duplicateCheck, namePlaceholder = "e.g. Free Testosterone" }) => {
  const {
    name, setName,
    unit, setUnit,
    resultType, setResultType,
    dropdownOptionsText, setDropdownOptionsText,
    ranges, addRange, updateRange, removeRange,
  } = fields;

  return (
    <div className={styles.form}>
      <InputBox
        label="Investigation name"
        required
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={namePlaceholder}
      />

      {duplicateCheck?.status === "blocked" && (
        <Alert status="error" title="This name is already in the standard investigation catalog">
          {duplicateCheck.existing?.reportName || duplicateCheck.existing?.testName || "Existing entry"} — choose a
          different name to continue.
        </Alert>
      )}

      {duplicateCheck?.status === "warning" && !duplicateCheck.acknowledged && (
        <Alert status="warning" title="A similar investigation already exists">
          {duplicateCheck.existing?.name || "Existing custom investigation"}
          {/* Tesseract's Alert lays the `action` slot out inline with the body
              in a non-shrinking flex row; in this drawer's narrow width that
              starves the body to 0px and wraps every word onto its own line.
              Stacking the button below the text avoids that collapse. */}
          <div className={styles.duplicateWarningAction}>
            <Button size="sm" variant="ghost" theme="warning" onClick={duplicateCheck.acknowledge}>
              Continue creating anyway
            </Button>
          </div>
        </Alert>
      )}

      <InputBox
        label="Unit"
        fullWidth
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="e.g. ng/dL"
      />

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Result type</span>
        <SegmentedControl options={RESULT_TYPE_OPTIONS} value={resultType} onValueChange={setResultType} />
      </div>

      {resultType === "dropdown" && (
        <InputBox
          label="Dropdown options"
          helperText="Comma separated, at least 2 (e.g. Reactive, Non-Reactive)"
          fullWidth
          value={dropdownOptionsText}
          onChange={(e) => setDropdownOptionsText(e.target.value)}
          placeholder="Reactive, Non-Reactive"
        />
      )}

      {resultType === "numeric" && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Reference ranges</span>
          <span className={styles.fieldHint}>
            Add one row per gender + age-band combination that needs its own range.
          </span>
          {ranges.map((range, index) => (
            <div key={index} className={styles.rangeRow}>
              <div className={styles.rangeRowHeader}>
                <RadioGroup
                  name={`range-gender-${index}`}
                  orientation="horizontal"
                  size="sm"
                  value={range.gender}
                  onChange={(e) => updateRange(index, { gender: e?.target?.value ?? e })}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <Radio key={opt.value} value={opt.value} label={opt.label} />
                  ))}
                </RadioGroup>
                {ranges.length > 1 && (
                  // Tesseract's CDN-resolved icons (leftIcon="...") aren't rendering
                  // glyphs in this app's setup — falls back to showing the icon
                  // name as literal text. Using a plain "×" here instead of
                  // fighting that; revisit once icon resolution is fixed app-wide.
                  <Button
                    size="sm"
                    variant="ghost"
                    theme="neutral"
                    aria-label="Remove range"
                    onClick={() => removeRange(index)}
                  >
                    ×
                  </Button>
                )}
              </div>
              <div className={styles.rangeInputs}>
                <InputBox
                  size="sm"
                  allow="numeric"
                  label="Age from"
                  placeholder="e.g. 18"
                  value={range.ageFrom}
                  onChange={(e) => updateRange(index, { ageFrom: e.target.value })}
                />
                <InputBox
                  size="sm"
                  allow="numeric"
                  label="Age to"
                  placeholder="e.g. 40"
                  value={range.ageTo}
                  onChange={(e) => updateRange(index, { ageTo: e.target.value })}
                />
                <InputBox
                  size="sm"
                  allow="numeric"
                  label="Min"
                  placeholder="e.g. 12"
                  value={range.min}
                  onChange={(e) => updateRange(index, { min: e.target.value })}
                />
                <InputBox
                  size="sm"
                  allow="numeric"
                  label="Max"
                  placeholder="e.g. 15"
                  value={range.max}
                  onChange={(e) => updateRange(index, { max: e.target.value })}
                />
              </div>
            </div>
          ))}
          <Button size="sm" variant="ghost" theme="primary" onClick={addRange}>
            + Add range
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvestigationFields;
