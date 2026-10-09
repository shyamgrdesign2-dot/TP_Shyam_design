import { useCallback, useEffect, useRef, useState } from 'react';
import ApiAppointments from '../../../../api/services/ApiAppointments';
import ApiIpdService from '../../../../api/services/ApiIpd';
import { fetchAllPatients } from '../../../allPatients.js/service';
import {
  buildIpdDoctorIdsFilter,
  normalizeIpdPickerPatients,
  normalizePickerPatients,
} from '../utils/patientPickerUtils';

const PAGE_LIMIT = 25;
const IPD_PAGE_LIMIT = 50;

const IPD_PATIENT_QUERY = {
  page: 1,
  limit: IPD_PAGE_LIMIT,
  ward: '',
  patientId: '',
  startDate: '',
  endDate: '',
  sort: 'admittedOn:desc',
  isDischarged: false,
  sentForApproval: false,
  isIntimateDischarged: false,
};

async function fetchIpdPatients(searchValue, doctorIdsFilter, page = 1) {
  const response = await ApiIpdService.getPatients({
    ...IPD_PATIENT_QUERY,
    page,
    search: searchValue,
    doctorIdsFilter,
  });
  return {
    response,
    patients: normalizeIpdPickerPatients(response),
  };
}

function dedupePatientsById(patients = []) {
  const seen = new Set();
  return patients.filter((patient) => {
    const id = String(patient?.patient_unique_id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function usePatientPicker({ enabled = true, initialQuery = '', mode = 'opd' } = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageNo, setPageNo] = useState(1);
  const [loadError, setLoadError] = useState(null);

  const debounceRef = useRef(null);
  const isLoadingRef = useRef(false);
  const queryRef = useRef(query);
  const pageNoRef = useRef(pageNo);
  const hasMoreRef = useRef(hasMore);

  queryRef.current = query;
  pageNoRef.current = pageNo;
  hasMoreRef.current = hasMore;

  const loadPatients = useCallback(async (page = 1, searchValue = '') => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoadError(null);

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      if (mode === 'ipd') {
        const doctorIdsFilter = buildIpdDoctorIdsFilter();
        let { patients: list } = await fetchIpdPatients(searchValue, doctorIdsFilter, page);

        // Keep legacy doctor-filter fallback for page-1 empty results only.
        if (page === 1 && !list.length && doctorIdsFilter) {
          ({ patients: list } = await fetchIpdPatients(searchValue, '', page));
        }

        setPatients((prev) => (
          page === 1 ? list : dedupePatientsById([...prev, ...list])
        ));
        setPageNo(page);
        setHasMore(list.length === IPD_PAGE_LIMIT);
        if (page === 1 && !list.length && !searchValue) {
          setLoadError('No in-patients found for your hospital. Log in with an IPD-enabled account.');
        }
        return;
      }

      const response = await fetchAllPatients({
        page,
        limit: PAGE_LIMIT,
        search: searchValue,
      });

      let list = normalizePickerPatients(response);

      // Keep legacy appointment search fallback for page-1 empty results only.
      if (page === 1 && !list.length) {
        const fallback = await ApiAppointments.searchPatients(searchValue || '', '');
        list = normalizePickerPatients(fallback);
        setPatients(list);
        setPageNo(1);
        setHasMore(false);
        return;
      }

      setPatients((prev) => (
        page === 1 ? list : dedupePatientsById([...prev, ...list])
      ));
      setPageNo(page);
      setHasMore(list.length === PAGE_LIMIT);
    } catch {
      if (page === 1) {
        setPatients([]);
        setLoadError(
          mode === 'ipd'
            ? 'Could not load in-patients. Check IPD access for your account.'
            : 'Could not load patients.'
        );
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [mode]);

  const loadMore = useCallback(() => {
    if (
      !enabled
      || !hasMoreRef.current
      || isLoadingRef.current
      || loading
      || loadingMore
    ) {
      return;
    }
    loadPatients(pageNoRef.current + 1, queryRef.current.trim());
  }, [enabled, loadPatients, loading, loadingMore]);

  useEffect(() => {
    if (!enabled) return undefined;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPageNo(1);
      setHasMore(true);
      loadPatients(1, query.trim());
    }, query.trim() ? 350 : 0);

    return () => clearTimeout(debounceRef.current);
  }, [enabled, query, loadPatients]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return {
    query,
    setQuery,
    patients,
    loading,
    loadingMore,
    hasMore,
    loadError,
    loadMore,
    reload: (searchValue = queryRef.current.trim()) => loadPatients(1, searchValue),
  };
}
