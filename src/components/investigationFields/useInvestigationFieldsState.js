import { useMemo, useState } from "react";
import { findSimilarInvestigations } from "../../utils/labResultsUtils";

export const emptyRange = () => ({ gender: "ALL", ageFrom: "", ageTo: "", min: "", max: "", unit: "" });

/**
 * Shared field state for "an investigation" (name/unit/resultType/dropdownOptions/
 * referenceRanges) — used by both the inline create-on-the-fly drawer and the
 * groups/investigations management page, so validation and payload-building stay
 * in one place.
 */
export function useInvestigationFieldsState(initial = {}, masterList = []) {
  const [name, setName] = useState(initial.name || "");
  const [unit, setUnit] = useState(initial.unit || "");
  const [resultType, setResultType] = useState(initial.resultType || "numeric");
  const [dropdownOptionsText, setDropdownOptionsText] = useState(
    (initial.dropdownOptions || []).join(", ")
  );
  const [ranges, setRanges] = useState(
    initial.referenceRanges?.length
      ? initial.referenceRanges.map((r) => ({
          gender: r.gender || "ALL",
          ageFrom: r.ageFrom ?? "",
          ageTo: r.ageTo ?? "",
          min: r.min ?? "",
          max: r.max ?? "",
          unit: r.unit ?? "",
        }))
      : [emptyRange()]
  );
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

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
    setDuplicateAcknowledged(false);
  };

  const isNameValid = name.trim().length > 0;
  const isRangesValid =
    resultType !== "numeric" || ranges.some((r) => r.min.trim() !== "" && r.max.trim() !== "");
  const isDropdownValid =
    resultType !== "dropdown" ||
    dropdownOptionsText.split(",").map((o) => o.trim()).filter(Boolean).length >= 2;
  const isValid = isNameValid && isRangesValid && isDropdownValid;

  const duplicates = useMemo(
    () => (name.trim() ? findSimilarInvestigations(name, masterList) : []),
    [name, masterList]
  );

  const toPayload = (unit_ = unit) => {
    const referenceRanges =
      resultType === "numeric"
        ? ranges
            .filter((r) => r.min.trim() !== "" && r.max.trim() !== "")
            .map((r) => ({
              gender: r.gender,
              ageFrom: r.ageFrom || null,
              ageTo: r.ageTo || null,
              min: r.min,
              max: r.max,
              unit: r.unit || unit_,
            }))
        : [];
    const dropdownOptions =
      resultType === "dropdown"
        ? dropdownOptionsText.split(",").map((o) => o.trim()).filter(Boolean)
        : resultType === "positive_negative"
        ? ["Positive", "Negative"]
        : null;
    return {
      name: name.trim(),
      unit: unit_,
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
    duplicateAcknowledged, setDuplicateAcknowledged,
    duplicates,
    isValid,
    reset,
    toPayload,
  };
}
