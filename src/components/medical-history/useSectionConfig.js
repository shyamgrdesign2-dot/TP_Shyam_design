import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { arrayMove } from "@dnd-kit/sortable";
import { getUserSectionOrder, setUserSectionOrder } from "../../redux/medicalhistorySlice";

/**
 * Per-doctor section order + visibility for the Medical History drawer, backed
 * by getUserSectionOrder / setUserSectionOrder.
 * Contract: docs/MEDICAL-HISTORY-SECTION-CONFIG-API.md
 *
 * Only the five real sections (tmmhs_id 1-5) are handled here, matching the API.
 * Additional History is a frontend-only pseudo-section (riding on
 * medical_history_remarks) with no server identity, so it is deliberately kept
 * out of the order entirely: MedicalHistoryPanel always renders it last, and
 * the customize panel never lists it. That way nothing in the panel is a
 * preference that would silently reset on reload.
 *
 * Writes are optimistic and fire per change — this is a UI preference and must
 * not ride on the patient's Save button. Failures fall back to defaults
 * silently; a missing config is not an error worth showing the doctor.
 */
export default function useSectionConfig({ sections, doctorId, enabled }) {
    const dispatch = useDispatch();
    const [config, setConfig] = useState({ order: null, hidden: [] });

    const defaultOrder = useMemo(() => sections.map((s) => s.tmmhs_id), [sections]);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        dispatch(getUserSectionOrder())
            .unwrap()
            .then((data) => {
                // Response is a flat array of {tmmhs_id, visible, order}.
                const rows = Array.isArray(data) ? data : data?.sections;
                if (cancelled || !rows?.length) return;
                const sorted = [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                setConfig({
                    order: sorted.map((r) => r.tmmhs_id),
                    hidden: sorted.filter((r) => r.visible === false).map((r) => r.tmmhs_id),
                });
            })
            .catch(() => {
                /* no config yet — defaults apply */
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, dispatch]);

    const persist = useCallback(
        (next) => {
            if (!doctorId) return;
            const order = next.order || defaultOrder;
            const hidden = new Set(next.hidden || []);
            const sections = order.map((tmmhs_id, index) => ({
                tmmhs_id,
                visible: !hidden.has(tmmhs_id),
                order: index,
            }));
            dispatch(setUserSectionOrder({ doctor_unique_id: doctorId, sections }));
        },
        [dispatch, doctorId, defaultOrder]
    );

    const update = useCallback(
        (updater) => {
            setConfig((prev) => {
                const next = updater(prev);
                persist(next);
                return next;
            });
        },
        [persist]
    );

    const order = useMemo(() => {
        if (!config.order) return defaultOrder;
        // Drop ids the backend no longer returns, append any new ones.
        const known = new Set(defaultOrder);
        const kept = config.order.filter((id) => known.has(id));
        const missing = defaultOrder.filter((id) => !kept.includes(id));
        return [...kept, ...missing];
    }, [config.order, defaultOrder]);

    const hiddenSet = useMemo(() => new Set(config.hidden || []), [config.hidden]);

    const onDragEnd = useCallback(
        ({ active, over }) => {
            if (!over || active.id === over.id) return;
            update((prev) => {
                const current = prev.order || defaultOrder;
                const oldIndex = current.indexOf(active.id);
                const newIndex = current.indexOf(over.id);
                if (oldIndex === -1 || newIndex === -1) return prev;
                return { ...prev, order: arrayMove(current, oldIndex, newIndex) };
            });
        },
        [update, defaultOrder]
    );

    const toggleVisibility = useCallback(
        (tmmhsId) => {
            update((prev) => {
                const hidden = new Set(prev.hidden || []);
                if (hidden.has(tmmhsId)) hidden.delete(tmmhsId);
                else hidden.add(tmmhsId);
                return { ...prev, order: prev.order || defaultOrder, hidden: Array.from(hidden) };
            });
        },
        [update, defaultOrder]
    );

    const reset = useCallback(() => {
        update(() => ({ order: null, hidden: [] }));
    }, [update]);

    return { order, hiddenSet, onDragEnd, toggleVisibility, reset };
}
