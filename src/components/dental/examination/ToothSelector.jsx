import { TEETH, PEDIATRIC_TEETH } from "./types";
import { VISUAL_TYPE, getVisualType } from "../../../utils/dentalVisualTypes";

export function ToothSelector({
  selectedTooth,
  patientType = "adult",
  onSelectTooth,
  toothDiagnoses,
  viewMode,
  onBackToDentition,
  surfaceSelector,
  onSelectScope,
  selectionScope = null,
  getScopeFdis,
  findingsByTooth,
  implantTeeth,
  allEntries,
  toothNotes,
}) {
  const activeTeeth =
    patientType === "adult"
      ? TEETH
      : patientType === "pediatric"
        ? PEDIATRIC_TEETH
        : [...TEETH, ...PEDIATRIC_TEETH];
  const upperRight = activeTeeth
    .filter((t) => t.quadrant === "upper-right")
    .sort((a, b) => b.position - a.position);
  const upperLeft = activeTeeth
    .filter((t) => t.quadrant === "upper-left")
    .sort((a, b) => a.position - b.position);
  const lowerRight = activeTeeth
    .filter((t) => t.quadrant === "lower-right")
    .sort((a, b) => b.position - a.position);
  const lowerLeft = activeTeeth
    .filter((t) => t.quadrant === "lower-left")
    .sort((a, b) => a.position - b.position);

  // For mixed dentition, separate adult & pediatric within each quadrant
  const isMixed = patientType === "mixed";
  const quadrantCard = (teeth, scopeId) => {
    // Split into adult (Q1-4) and pediatric (Q5-8) for mixed mode
    let adultTeeth, pedTeeth;
    if (isMixed) {
      adultTeeth = teeth.filter((t) => ["1", "2", "3", "4"].includes(t.fdi[0]));
      pedTeeth = teeth.filter((t) => ["5", "6", "7", "8"].includes(t.fdi[0]));
    }
    const teethBlock = isMixed ? (
      <>
        {adultTeeth.length > 0 && (
          <div key="adult" className="tooth-chart-row-single">
            {adultTeeth.map((t) => renderToothBtn(t))}
          </div>
        )}

        {pedTeeth.length > 0 && (
          <div key="ped" className="tooth-chart-row-single">
            {pedTeeth.map((t) => renderToothBtn(t))}
          </div>
        )}
      </>
    ) : (
      <div className="tooth-chart-row-single">
        {teeth.map((t) => renderToothBtn(t))}
      </div>
    );

    return (
      <div key={scopeId} className="tooth-chart-quadrant-wrap">
        <div className="tooth-chart-quadrant-teeth">{teethBlock}</div>
      </div>
    );
  };
  const renderToothBtn = (t) => {
    const scopeIsToothLevel = selectionScope?.type === "tooth";
    const isSelected = scopeIsToothLevel && selectedTooth?.fdi === t.fdi;
    const diagSet = toothDiagnoses?.[t.fdi];
    const hasDiag = diagSet?.size > 0;
    const diagColor = hasDiag
      ? [...diagSet].some((d) => getVisualType(d) === VISUAL_TYPE.MISSING)
        ? "#ef4444"
        : "#8b5cf6"
      : null;
    return (
      <button
        type="button"
        className={`tooth-pick ${isSelected ? "active" : ""} ${hasDiag ? "has-diagnosis" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectTooth(t);
        }}
        title={`${t.name} (${t.fdi})`}
      >
        {t.fdi}
        {diagColor && (
          <span
            className="tooth-pick-dot"
            style={{
              background: isSelected ? "#fff" : diagColor,
            }}
          />
        )}
      </button>
    );
  };
  return (
    <div className="tooth-selector">
      {surfaceSelector && (
        <div className="tooth-selector-surface">{surfaceSelector}</div>
      )}

      <div className="tooth-chart">


        <div className="tooth-chart-stack">
          {quadrantCard(upperRight, "UR")}
          {quadrantCard(upperLeft, "UL")}
          {quadrantCard(lowerRight, "LR")}
          {quadrantCard(lowerLeft, "LL")}
        </div>
      </div>
    </div>
  );
}
