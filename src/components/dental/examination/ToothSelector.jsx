import { TEETH, PEDIATRIC_TEETH } from "./types";
const ARCH_SCOPE_IDS = new Set([
  "RIGHT_ARCH",
  "LEFT_ARCH",
  "UPPER_ARCH",
  "LOWER_ARCH",
]);

/** Matches DentalCanvas dentitionScopeIsActive — highlights the scope chip that drives the preview. */
function scopeChipIsActive(btnId, selectionScope) {
  if (!selectionScope) return false;
  if (btnId === "FULL") return selectionScope.type === "full-mouth";
  if (ARCH_SCOPE_IDS.has(btnId))
    return selectionScope.type === "arch" && selectionScope.id === btnId;
  return selectionScope.type === "quadrant" && selectionScope.id === btnId;
}
function toothHasChartMark(
  fdi,
  { toothDiagnoses, implantTeeth, findingsByTooth, allEntries, toothNotes },
) {
  if (toothDiagnoses?.[fdi]?.size > 0) return true;
  if (implantTeeth?.has?.(fdi)) return true;
  if ((findingsByTooth?.[fdi] ?? []).length > 0) return true;
  if (allEntries?.some((e) => e.toothFdi === fdi)) return true;
  if (toothNotes?.[fdi]?.trim?.()) return true;
  return false;
}
function scopeMarkDotColor(fdis, toothDiagnoses) {
  for (const fdi of fdis) {
    if (toothDiagnoses?.[fdi]?.has?.("Missing")) return "#ef4444";
  }
  return "#8b5cf6";
}
function scopeHasChartMark(scopeId, getScopeFdis, ctx) {
  if (!getScopeFdis) return false;
  const fdis = getScopeFdis(scopeId);
  return fdis.some((fdi) => toothHasChartMark(fdi, ctx));
}
const SCOPE_BUTTONS = [
  {
    id: "UR",
    label: "UR",
  },
  {
    id: "UL",
    label: "UL",
  },
  {
    id: "LR",
    label: "LR",
  },
  {
    id: "LL",
    label: "LL",
  },
  {
    id: "RIGHT_ARCH",
    label: "R",
  },
  {
    id: "LEFT_ARCH",
    label: "L",
  },
  {
    id: "UPPER_ARCH",
    label: "Max",
  },
  {
    id: "LOWER_ARCH",
    label: "Man",
  },
  {
    id: "FULL",
    label: "Full",
  },
];

/** UR / Full / … chips — lives at the top of `.tooth-chart` (same host as FDI rows). */
export function ExamScopeChipBar({
  selectionScope = null,
  onSelectScope,
  getScopeFdis,
  toothDiagnoses,
  implantTeeth,
  findingsByTooth,
  allEntries,
  toothNotes,
}) {
  const markCtx = {
    toothDiagnoses,
    implantTeeth,
    findingsByTooth,
    allEntries,
    toothNotes,
  };
  return (
    <div
      className="tooth-chart-scope-bar"
      role="toolbar"
      aria-label="Choose dentition scope"
    >
      {SCOPE_BUTTONS.map((btn) => {
        const active = scopeChipIsActive(btn.id, selectionScope);
        const fdis = getScopeFdis ? getScopeFdis(btn.id) : [];
        const hasDataInScope = Boolean(
          getScopeFdis && scopeHasChartMark(btn.id, getScopeFdis, markCtx),
        );
        const showLavender = hasDataInScope && !active;
        const dotColor = scopeMarkDotColor(fdis, toothDiagnoses);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectScope(btn.id);
            }}
            title={btn.label}
            aria-pressed={active}
            className={`scope-chip${active ? " active" : ""}${showLavender ? " has-mark" : ""}`}
          >
            {btn.label}
            {hasDataInScope && (
              <span
                className="tooth-pick-dot"
                style={{
                  background: active ? "#fff" : dotColor,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
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
      ? diagSet.has("Missing")
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
        {onSelectScope && (
          <ExamScopeChipBar
            selectionScope={selectionScope}
            onSelectScope={onSelectScope}
            getScopeFdis={getScopeFdis}
            toothDiagnoses={toothDiagnoses}
            implantTeeth={implantTeeth}
            findingsByTooth={findingsByTooth}
            allEntries={allEntries}
            toothNotes={toothNotes}
          />
        )}

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
