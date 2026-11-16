// A column's choices as { value, label } pairs. A column may list them, as
// words or as pairs, or work them out from the row being edited:
// `options({ value, section, row })`.
export function optionsOf(column, context = {}) {
  const list = typeof column.options === "function" ? column.options(context) : column.options;
  return (list || []).map((item) => (item && typeof item === "object" ? item : { value: item, label: String(item) }));
}

// The label of a value, for saying a choice in words.
export const optionLabel = (options, value) => options.find((option) => option.value === (value ?? ""))?.label;
