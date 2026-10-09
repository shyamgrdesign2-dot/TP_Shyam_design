import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CONTEXT_FILTERS,
  FILTER_CHIPS,
  filterCaptures,
} from './utils/neoConsultationUtils';
import { useTatvaPendantData } from './context/TatvaPendantContext';
import CaptureCard from './components/CaptureCard';
import { SearchNormal, TpIcon } from './components/TpIcons';
import './Captures.scss';

function Captures() {
  const navigate = useNavigate();
  const {
    captures,
    summary,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
  } = useTatvaPendantData();
  const [activeFilter, setActiveFilter] = useState('all');
  const [contextFilter, setContextFilter] = useState('both');
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef(null);

  const filteredCaptures = useMemo(
    () => filterCaptures(captures, { activeFilter, contextFilter, searchQuery }),
    [captures, activeFilter, contextFilter, searchQuery]
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || loading || loadingMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root: null, rootMargin: '160px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, loadingMore, filteredCaptures.length]);

  return (
    <div className="tp-page tp-captures-page">
      <div className="tp-captures__sticky">
        <header className="tp-captures__header">
          <div>
            <h1 className="tp-captures__title">Captures</h1>
            <p className="tp-captures__subtitle">
              {summary.needReview} of {summary.total} need review
            </p>
          </div>
          <div className="tp-captures__context-toggle" role="group" aria-label="Encounter type">
            {CONTEXT_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`tp-captures__context-btn ${
                  contextFilter === item.key ? 'tp-captures__context-btn--active' : ''
                }`}
                onClick={() => setContextFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <label className="tp-captures__search">
          <TpIcon icon={SearchNormal} size={16} color="#94a3b8" />
          <input
            type="search"
            placeholder="Search by name, bed, MRN…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>

        <div className="tp-captures__chips">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`tp-captures__chip ${
                activeFilter === chip.key ? 'tp-captures__chip--active' : ''
              }`}
              onClick={() => setActiveFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-captures__list">
        {loading && (
          <div className="tp-captures__loading">
            <Spin />
          </div>
        )}

        {!loading && error && <p className="tp-captures__empty">{error}</p>}

        {!loading && !error && filteredCaptures.map((capture) => (
          <CaptureCard
            key={capture.id}
            capture={capture}
            showReviewFooter
            onClick={() => navigate(`/tatva-pendant/captures/${capture.id}`)}
          />
        ))}

        {!loading && !error && filteredCaptures.length === 0 && (
          <p className="tp-captures__empty">No captures match your filters.</p>
        )}

        {!loading && !error && hasMore && (
          <div ref={loadMoreRef} className="tp-captures__load-more" aria-hidden={!loadingMore}>
            {loadingMore ? <Spin size="small" /> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default Captures;
