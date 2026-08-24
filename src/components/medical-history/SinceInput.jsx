import React, { useState, useEffect, useRef } from "react";
import { isDecimalNumeric, onlyDecimalFormat } from "../../utils/utils";
import { SINCE_UNITS } from "./constants";
import styles from "./medicalHistory.module.css";

/**
 * Duration input for a tag's `since` field.
 *
 * The user types a number and picks a unit from the suggestion list, which
 * produces the same "<n> Unit(s)" strings MedicalHistoryBox has always stored
 * (e.g. "1 Day", "2 Day(s)"). Typing a number and blurring without picking a
 * unit falls back to days, matching onBlurSinceChid in the old implementation.
 *
 * Decimals up to two places are accepted ("3.4 Day(s)") via onlyDecimalFormat /
 * isDecimalNumeric — the same helpers PR #3820 added for the previous
 * AutoComplete-based field. Pluralisation compares the parsed float against 1,
 * so 0.5 stays singular and 3.4 goes plural.
 */
function SinceInput({ value, onChange }) {
    const [localValue, setLocalValue] = useState(value || "");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);

    const buildSuggestions = (numStr) => {
        const num = parseFloat(numStr);
        return SINCE_UNITS.map((u) => `${numStr} ${num <= 1 ? u.singular : u.plural}`);
    };

    const handleChange = (e) => {
        const numeric = onlyDecimalFormat(e.target.value);
        setLocalValue(numeric);
        if (numeric) {
            setSuggestions(buildSuggestions(numeric));
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            onChange("");
        }
    };

    const handleFocus = (e) => {
        e.target.select();
        const numMatch = String(value || "").match(/^(\d*\.?\d*)/);
        if (numMatch && numMatch[1]) {
            setSuggestions(buildSuggestions(numMatch[1]));
        } else {
            setSuggestions(SINCE_UNITS.map((u) => `1 ${u.singular}`));
        }
        setShowSuggestions(true);
    };

    const handleBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
            // Trailing dot is stripped first so "3." commits as "3 Day(s)".
            const bare = String(localValue || "").replace(/\.$/, "");
            if (bare && isDecimalNumeric(bare)) {
                const defaultVal = `${bare} ${parseFloat(bare) <= 1 ? "Day" : "Day(s)"}`;
                setLocalValue(defaultVal);
                onChange(defaultVal);
            }
        }, 150);
    };

    const handleSelect = (val) => {
        setLocalValue(val);
        onChange(val);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLocalValue("");
        onChange("");
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const hasClearable = !!localValue;

    return (
        <div className={styles.sinceWrap} ref={wrapRef}>
            <div className={styles.sinceInputRow}>
                <input
                    className={styles.sinceInput}
                    value={localValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Select duration"
                    type="text"
                    inputMode="decimal"
                />
            </div>
            {showSuggestions && (suggestions.length > 0 || hasClearable) && (
                <div className={styles.sinceSuggestions}>
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            className={styles.sinceSuggestionItem}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(s);
                            }}
                            type="button"
                        >
                            {s}
                        </button>
                    ))}
                    {hasClearable && (
                        <>
                            <div className={styles.sinceSuggestionDivider} />
                            <button
                                className={`${styles.sinceSuggestionItem} ${styles.sinceClearOption}`}
                                onMouseDown={handleClear}
                                type="button"
                            >
                                Clear
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default SinceInput;
