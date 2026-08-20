import { useState } from "react";

export const emptyRange = () => ({ gender: "all", ageFrom: "", ageTo: "", min: "", max: "", unit: "" });

/**
 * Shared field state for "an investigation" (name/unit/resultType/dropdownOptions/
 * referenceRanges) — used by both the inline create-on-the-fly panel and the
 * groups/investigations management page, so validation and payload-building stay
 * in one place. Gender values are lowercase ('all'/'male'/'female') to match the
 * backend contract exactly (Pm-Patient-Docs custom-report-groups API).
 */
export function useInvestigationFieldsState(initial = {}) {
  const [name, setName] = useState(initial.name || "");
  const [unit, setUnit] = useState(initial.unit || "");
  const [resultType, setResultType] = useState(initial.resultType || "numeric");
  const [dropdownOptionsText, setDropdownOptionsText] = useState(
    (initial.dropdownOptions || []).join(", ")
  );
  const [ranges, setRanges] = useState(
    initial.referenceRanges?.length
      ? initial.referenceRanges.map((r) => ({
          gender: (r.gender || "all").toLowerCase(),
          ageFrom: r.ageFrom ?? "",
          ageTo: r.ageTo ?? "",
          min: r.min ?? "",
          max: r.max ?? "",
          unit: r.unit ?? "",
        }))
      : [emptyRange()]
  );

  const updateRange = (index, patch) => {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRange = () => setRanges((prev) => [...prev, emptyRange()]);
  const removeRange = (index) => setRanges((prev) => prev.filter((_, i) => i !== index));

  const reset = () => {
    setName("");
    setUnit("");
    setResultType("numeric");
    setDropdownOptionsText("");
    setRanges([emptyRange()]);
  };

  const isNameValid = name.trim().length > 0;
  const isRangesValid =
    resultType !== "numeric" || ranges.some((r) => r.min !== "" && r.max !== "");
  const isDropdownValid =
    resultType !== "dropdown" ||
    dropdownOptionsText.split(",").map((o) => o.trim()).filter(Boolean).length >= 2;
  const isValid = isNameValid && isRangesValid && isDropdownValid;

  const toPayload = (unit_ = unit) => {
    const referenceRanges =
      resultType === "numeric"
        ? ranges
            .filter((r) => r.min !== "" && r.max !== "")
            .map((r) => ({
              gender: r.gender,
              // Backend requires numeric ageFrom/ageTo (no "unbounded" option) —
              // default an empty age band to 0-120 ("applies to everyone").
              ageFrom: r.ageFrom !== "" ? Number(r.ageFrom) : 0,
              ageTo: r.ageTo !== "" ? Number(r.ageTo) : 120,
              min: Number(r.min),
              max: Number(r.max),
              unit: r.unit || unit_ || "",
            }))
        : [];
    const dropdownOptions =
      resultType === "dropdown"
        ? dropdownOptionsText.split(",").map((o) => o.trim()).filter(Boolean)
        : resultType === "positive_negative"
        ? ["Positive", "Negative"]
        : undefined;
    return {
      name: name.trim(),
      unit: unit_ || undefined,
      resultType,
      dropdownOptions,
      referenceRanges,
    };
  };

  return {
    name, setName,
    unit, setUnit,
    resultType, setResultType,
    dropdownOptionsText, setDropdownOptionsText,
    ranges, addRange, updateRange, removeRange,
    isValid,
    reset,
    toPayload,
  };
}
