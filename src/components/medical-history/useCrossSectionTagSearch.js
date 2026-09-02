import { useEffect, useRef, useState } from "react";
import ApiMedicalHistory from "../../api/services/ApiMedicalHistory";

const DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

/**
 * Cross-section server tag search for the drawer's single search box.
 *
 * The old Edit & Add popover searched one section at a time, so it could use
 * the shared `searchList` in redux. This box searches all sections at once, and
 * `searchTag` is section-scoped with no tmmhs_id on the results — so we fan out
 * one call per section and keep the results local, keyed by section. Going
 * through redux instead would let the five concurrent responses clobber each
 * other in the single `searchList` slot, which MedicalHistoryBoxMobile still
 * relies on for its own per-section flow.
 *
 * Returns { resultsBySection, searching }, where resultsBySection maps
 * tmmhs_id -> tags that are not already present in that section.
 */
export default function useCrossSectionTagSearch(sections, query) {
    const [resultsBySection, setResultsBySection] = useState({});
    const [searching, setSearching] = useState(false);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const keyword = String(query || "").trim();

        if (keyword.length < MIN_QUERY_LENGTH || !sections?.length) {
            setResultsBySection({});
            setSearching(false);
            return undefined;
        }

        const requestId = ++requestIdRef.current;
        setSearching(true);

        const timeoutId = setTimeout(async () => {
            try {
                const responses = await Promise.all(
                    sections.map((section) =>
                        ApiMedicalHistory.searchTag({
                            section_id: section.tmmhs_id,
                            keyword,
                        }).catch(() => null)
                    )
                );

                // A newer keystroke already superseded this request.
                if (requestId !== requestIdRef.current) return;

                const next = {};
                responses.forEach((res, index) => {
                    const section = sections[index];
                    const payload = res?.data ?? res;
                    const list = Array.isArray(payload)
                        ? payload
                        : Array.isArray(payload?.tags)
                          ? payload.tags
                          : [];

                    const existing = new Set(
                        (section.tags || []).map((t) => String(t.title || "").trim().toLowerCase())
                    );
                    const fresh = list.filter((t) => {
                        const title = String(t?.title || "").trim();
                        return title && !existing.has(title.toLowerCase());
                    });
                    if (fresh.length) next[section.tmmhs_id] = fresh;
                });

                setResultsBySection(next);
            } finally {
                if (requestId === requestIdRef.current) setSearching(false);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [query, sections]);

    return { resultsBySection, searching };
}
