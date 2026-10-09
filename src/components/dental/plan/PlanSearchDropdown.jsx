/**
 * PlanSearchDropdown — Portal-rendered search dropdown for AddEditPlanDrawer.
 * Renders exam suggestions and catalog items inside a fixed-position portal.
 */
import { forwardRef, useRef, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { SURFACE_COLORS, SURFACE_ABBR } from "./plan-types";
import { formatINR } from "./plan-shared";
import styles from "./AddEditPlanDrawer.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");

/**
 * @param {object} props
 * @param {{ top?: number, left: number, width: number, maxHeight?: number, placement?: string, bottom?: number }} props.dropdownPos
 * @param {object[]} props.filteredExamSuggestions
 * @param {object[]} props.filteredTreatments
 * @param {object[]} props.rows - Current service rows (used for already-added checks)
 * @param {number} props.highlightedIndex
 * @param {boolean} props.showChartDropdownSection
 * @param {boolean} props.showDentalServiceDropdownSection
 * @param {boolean} props.showSearchEmptyHint
 * @param {boolean} props.showAddCustomDental
 * @param {string} props.searchQuery
 * @param {boolean} [props.catalogLoading]
 * @param {function} props.onAddExamSuggestion - (treatment, [toothFdi], surfaces) => void
 * @param {function} props.onAddCatalogItem - (name, [], [], item) => void
 * @param {function} props.onOpenCustomDentalDrawer - () => void
 */
export const PlanSearchDropdown = forwardRef(function PlanSearchDropdown(
  {
    dropdownPos,
    filteredExamSuggestions,
    filteredTreatments,
    rows,
    highlightedIndex,
    showChartDropdownSection,
    showDentalServiceDropdownSection,
    showSearchEmptyHint,
    showAddCustomDental,
    searchQuery,
    catalogLoading = false,
    onAddExamSuggestion,
    onAddCatalogItem,
    onOpenCustomDentalDrawer,
  },
  ref
) {
  const catalogListRef = useRef(null);

  const handleCatalogWheel = useCallback((e) => {
    const el = catalogListRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const { scrollTop, scrollHeight, clientHeight } = el;
    const delta = e.deltaY;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
    const canScroll = scrollHeight > clientHeight;
    if (canScroll && !(atTop && delta < 0) && !(atBottom && delta > 0)) {
      el.scrollTop += delta;
    }
  }, []);

  useEffect(() => {
    const el = catalogListRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleCatalogWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleCatalogWheel);
  }, [handleCatalogWheel, filteredTreatments.length, catalogLoading]);

  const listMaxHeight = dropdownPos.maxHeight ?? 260;
  const placement = dropdownPos.placement ?? "below";

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        ...(placement === "above"
          ? { bottom: dropdownPos.bottom, top: "auto" }
          : { top: dropdownPos.top }),
        left: dropdownPos.left,
        width: Math.max(dropdownPos.width, 400),
        zIndex: 10001,
        pointerEvents: "auto",
      }}
      className={styles.searchDropdown}
      data-tp-portal="true"
    >
      {showChartDropdownSection && (
        <>
          <div className={styles.dropdownExamHeader}>
            <div className={styles.dropdownExamHeaderInner}>
              <p className={styles.dropdownExamTitle}>
                From today's examination
              </p>
              <span className={styles.dropdownExamBadge}>Dental tab</span>
            </div>
          </div>
          <div className={styles.dropdownExamList}>
            {filteredExamSuggestions.map((sug, i) => {
              const alreadyHasTooth = rows.some(
                (r) =>
                  r.treatment === sug.treatment &&
                  r.teeth.includes(sug.toothFdi)
              );
              return (
                <button
                  key={`${sug.treatment}-${sug.toothFdi}`}
                  type="button"
                  disabled={alreadyHasTooth}
                  title={sug.hint}
                  onClick={() =>
                    onAddExamSuggestion(
                      sug.treatment,
                      [sug.toothFdi],
                      sug.surfaces
                    )
                  }
                  className={cx(
                    styles.dropdownExamItem,
                    i === highlightedIndex
                      ? styles.dropdownExamItemActive
                      : styles.dropdownExamItemHover,
                    alreadyHasTooth ? styles.dropdownExamItemDisabled : ""
                  )}
                >
                  <span className={styles.dropdownToothTag}>
                    T{sug.toothFdi}
                  </span>
                  <div className={styles.dropdownItemMain}>
                    <p className={styles.dropdownItemTitle}>{sug.treatment}</p>
                    <p className={styles.dropdownItemMeta}>
                      <span className={styles.dropdownItemMetaLabel}>
                        {sug.toothLabel}
                      </span>
                      {sug.surfaces.length > 0 && (
                        <span className={styles.dropdownSurfaceList}>
                          <span>·</span>
                          {sug.surfaces.map((s, si) => (
                            <span
                              key={`${s}-${si}`}
                              className={styles.dropdownSurfaceItem}
                            >
                              <span
                                className={styles.dropdownSurfaceDot}
                                style={{
                                  backgroundColor:
                                    SURFACE_COLORS[s] || "#94a3b8",
                                }}
                              />
                              <span className={styles.dropdownSurfaceText}>
                                {SURFACE_ABBR[s] || s}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {showDentalServiceDropdownSection && (
        <>
          <div className={styles.dropdownCatalogHeader}>
            <p className={styles.dropdownCatalogTitle}>Dental service</p>
          </div>
          <div
            ref={catalogListRef}
            className={styles.dropdownCatalogList}
            style={{ maxHeight: listMaxHeight }}
          >
            <>
              {catalogLoading && filteredTreatments.length === 0 && (
                <div className={styles.searchEmptyWrap}>
                  <p className={styles.searchEmptyText}>Loading dental services…</p>
                </div>
              )}
              {!catalogLoading && filteredTreatments.length === 0 && searchQuery.trim() !== "" && (
                <div className={styles.searchEmptyWrap}>
                  <p className={styles.searchEmptyText}>No dental services found.</p>
                </div>
              )}
              {filteredTreatments.map((t, i) => {
                const globalIdx = filteredExamSuggestions.length + i;
                const alreadyAdded = rows.some((r) => r.treatment === t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => onAddCatalogItem(t.name, [], [], t)}
                    className={cx(
                      styles.dropdownCatalogItem,
                      globalIdx === highlightedIndex
                        ? styles.dropdownCatalogItemActive
                        : styles.dropdownCatalogItemHover,
                      alreadyAdded ? styles.dropdownCatalogItemDisabled : ""
                    )}
                  >
                    <div className={styles.dropdownCatalogItemMain}>
                      <p className={styles.dropdownCatalogItemTitle}>{t.name}</p>
                    </div>
                    <span className={styles.dropdownCatalogItemPrice}>
                      {formatINR(t.price)}
                    </span>
                  </button>
                );
              })}
              {showAddCustomDental && (
                <button
                  type="button"
                  onClick={onOpenCustomDentalDrawer}
                  className={cx(
                    styles.dropdownCustomAdd,
                    highlightedIndex ===
                      filteredExamSuggestions.length + filteredTreatments.length
                      ? styles.dropdownCustomAddActive
                      : styles.dropdownCustomAddHover
                  )}
                >
                  <Plus
                    size={18}
                    strokeWidth={2}
                    className={styles.dropdownCustomAddIcon}
                  />
                  <span className={styles.dropdownCustomAddText}>
                    Add "{searchQuery.trim()}" as custom dental service
                  </span>
                </button>
              )}
            </>
          </div>
        </>
      )}

      {showSearchEmptyHint && (
        <div className={styles.searchEmptyWrap}>
          <p className={styles.searchEmptyText}>
            Type above to search dental services.
          </p>
        </div>
      )}
    </div>
  );
});
