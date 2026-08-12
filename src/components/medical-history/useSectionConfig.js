import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { arrayMove } from "@dnd-kit/sortable";
import { getSectionConfig, saveSectionConfig } from "../../redux/medicalhistorySlice";
import { ADDITIONAL_HISTORY_SECTION_ID } from "./constants";

/**
 * Per-doctor section order + visibility for the Medical History drawer.
 *
 * Persistence goes through the section-config endpoints
 * (docs/MEDICAL-HISTORY-SECTION-CONFIG-API.md), which are NOT deployed yet.
 * Until they are, the GET resolves to null and every save is a no-op, so
 * customisation applies for the current session and resets on reload. That is
 * intentional: it keeps the seam clean so the feature starts persisting the day
 * backend ships, with no frontend change and no localStorage to migrate off.
 *
 * Writes are optimistic and fire per change — this is a UI preference and must
 * not ride on the patient's Save button.
 */
export default function useSectionConfig({ sections, doctorId, enabled }) {
    const dispatch = useDispatch();
    const [config, setConfig] = useState({ order: null, hidden: [] });

    const defaultOrder = useMemo(
        () => [...sections.map((s) => s.tmmhs_id), ADDITIONAL_HISTORY_SECTION_ID],
        [sections]
    );

    useEffect(() => {
        if (!enabled || !doctorId) return;
        let cancelled = false;
        dispatch(getSectionConfig({ doctor_unique_id: doctorId }))
            .unwrap()
            .then((data) => {
                if (cancelled || !data?.sections?.length) return;
                const rows = [...data.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                setConfig({
                    order: rows.map((r) => r.tmmhs_id),
                    hidden: rows.filter((r) => r.visible === false).map((r) => r.tmmhs_id),
                });
            })
            .catch(() => {
                /* no config yet — defaults apply */
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, doctorId, dispatch]);

    const persist = useCallback(
        (next) => {
            if (!doctorId) return;
            const order = next.order || defaultOrder;
            const hidden = new Set(next.hidden || []);
            dispatch(
                saveSectionConfig({
                    doctor_unique_id: doctorId,
                    sections: order.map((tmmhs_id, index) => ({
                        tmmhs_id,
                        visible: !hidden.has(tmmhs_id),
                        order: index,
                    })),
                })
            );
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
