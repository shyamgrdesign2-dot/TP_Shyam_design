import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTodayConsultations } from '../../../../api/services/ApiNeoSapien';
import {
  buildConsultationSummary,
  flattenConsultations,
} from '../utils/neoConsultationUtils';

const DEFAULT_PAGE_LIMIT = 20;

function mergeConsultations(existing, incoming) {
  if (!existing?.length) return incoming || [];
  if (!incoming?.length) return existing;

  const byId = new Map();
  existing.forEach((item) => {
    if (item?.id != null) byId.set(String(item.id), item);
  });
  incoming.forEach((item) => {
    if (item?.id != null) byId.set(String(item.id), item);
  });
  return Array.from(byId.values());
}

/**
 * @param {{ startDate?: string, endDate?: string, date?: string, limit?: number }} [options]
 */
export function useTodayConsultations(options = {}) {
  const { startDate, endDate, date, limit = DEFAULT_PAGE_LIMIT } = options;

  const [consultations, setConsultations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  pageRef.current = page;
  loadingMoreRef.current = loadingMore;

  const queryBase = useMemo(
    () => ({
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(!startDate && !endDate && date ? { date } : {}),
      limit,
    }),
    [startDate, endDate, date, limit]
  );

  const applyResponseMeta = useCallback((data, nextPage) => {
    setMeta({
      count: data?.count ?? 0,
      reviewedCount: data?.reviewedCount ?? 0,
      notReviewedCount: data?.notReviewedCount ?? 0,
      startDate: data?.startDate,
      endDate: data?.endDate,
      date: data?.date,
      page: data?.page ?? nextPage,
      limit: data?.limit ?? limit,
      totalPages: data?.totalPages ?? 0,
      doctorId: data?.doctorId,
    });
  }, [limit]);

  const fetchPage = useCallback(async (pageToLoad, { append } = { append: false }) => {
    const requestId = ++requestIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await getTodayConsultations({
        ...queryBase,
        page: pageToLoad,
      });

      if (requestId !== requestIdRef.current) return null;

      const pageConsultations = data?.consultations || [];
      setConsultations((prev) => (
        append ? mergeConsultations(prev, pageConsultations) : pageConsultations
      ));
      setPage(pageToLoad);
      applyResponseMeta(data, pageToLoad);
      setError(null);
      return data;
    } catch (err) {
      if (requestId !== requestIdRef.current) return null;
      setError(err?.message || 'Failed to load consultations');
      if (!append) {
        setConsultations([]);
        setMeta(null);
        setPage(1);
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [applyResponseMeta, queryBase]);

  const refetch = useCallback(async () => {
    await fetchPage(1, { append: false });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const totalPages = meta?.totalPages ?? 0;
    const nextPage = pageRef.current + 1;
    if (!totalPages || nextPage > totalPages) return;
    await fetchPage(nextPage, { append: true });
  }, [fetchPage, meta?.totalPages]);

  useEffect(() => {
    fetchPage(1, { append: false });
  }, [fetchPage]);

  const consultationsResponse = useMemo(() => {
    if (!meta && !consultations.length) return null;
    return {
      ...meta,
      consultations,
    };
  }, [meta, consultations]);

  const captures = useMemo(
    () => flattenConsultations(consultations),
    [consultations]
  );

  const summary = useMemo(
    () => buildConsultationSummary(consultationsResponse, captures),
    [consultationsResponse, captures]
  );

  const hasMore = Boolean(
    meta?.totalPages && page < meta.totalPages
  );

  return {
    consultationsResponse,
    captures,
    summary,
    loading,
    loadingMore,
    hasMore,
    page,
    totalPages: meta?.totalPages ?? 0,
    error,
    refetch,
    loadMore,
  };
}
