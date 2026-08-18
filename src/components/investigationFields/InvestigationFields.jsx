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
  { value: "ALL", label: "All" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

/**
 * Name/unit/result-type/dropdown-options/reference-ranges fields for one
 * investigation. Reference ranges support gender AND age-band together
 * (e.g. Female 18-40 vs Female 41-60 vs Male 18-40 as separate rows) —
 * required so the abnormal-result calc can match on both dimensions.
 */
const InvestigationFields = ({ fields, namePlaceholder = "e.g. Free Testosterone" }) => {
  const {
    name, setName,
    unit, setUnit,
    resultType, setResultType,
    dropdownOptionsText, setDropdownOptionsText,
    ranges, addRange, updateRange, removeRange,
    duplicateAcknowledged, setDuplicateAcknowledged,
    duplicates,
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

      {duplicates.length > 0 && !duplicateAcknowledged && (
        <Alert
          status="warning"
          title="A similar investigation already exists"
          action={
            <Button size="sm" variant="ghost" theme="warning" onClick={() => setDuplicateAcknowledged(true)}>
              Continue creating anyway
            </Button>
          }
        >
          {duplicates.slice(0, 3).map((d) => `${d.reportName} → ${d.testName}`).join(", ")}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    theme="neutral"
                    icon="close-circle"
                    aria-label="Remove range"
                    onClick={() => removeRange(index)}
                  />
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
          <Button size="sm" variant="ghost" onClick={addRange}>
            + Add range
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvestigationFields;
