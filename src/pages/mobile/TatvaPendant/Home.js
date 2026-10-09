import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import moment from 'moment';
import { useTatvaPendantData } from './context/TatvaPendantContext';
import { useTatvaPendantDoctorProfile } from './hooks/useTatvaPendantDoctorProfile';
import CaptureCard from './components/CaptureCard';
import TatvaPendantHero from './components/TatvaPendantHero';
import { ArrowRight2, STAT_ICONS } from './components/TpIcons';

const STAT_LABELS = {
  conversations: 'Conversations',
  review: 'Need review',
  assigned: 'Assigned',
};

function getGreeting() {
  const hour = moment().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Home() {
  const navigate = useNavigate();
  const { doctorName, initials, loading: profileLoading } = useTatvaPendantDoctorProfile();
  const { captures, summary, loading, error } = useTatvaPendantData();
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setStickyVisible(window.scrollY > 220);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const reviewCaptures = useMemo(
    () => captures.filter((c) => c.review).slice(0, 3),
    [captures]
  );

  const stats = useMemo(
    () => [
      { key: 'conversations', value: summary.total },
      { key: 'review', value: summary.needReview },
      { key: 'assigned', value: summary.assigned },
    ],
    [summary]
  );

  return (
    <div className="tp-page tp-home">
      <header
        className={`tp-sticky-header ${stickyVisible ? 'tp-sticky-header--visible' : ''}`}
        aria-hidden={!stickyVisible}
      >
        <span
          className="tp-sticky-header__logo"
          role="img"
          aria-label="Tatva Pendant"
        />
        <span className="tp-sticky-header__avatar" aria-hidden={!stickyVisible}>
          <img
            className="tp-sticky-header__avatar-img"
            src="https://i.pravatar.cc/120?img=49"
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="tp-sticky-header__avatar-fallback">{initials || 'DR'}</span>
        </span>
      </header>

      <TatvaPendantHero
        greetingPrimary={getGreeting()}
        greetingName={profileLoading && !doctorName ? '…' : (doctorName || 'Doctor')}
        initials={initials}
      />

      <div className="tp-stats-row">
        {stats.map((stat) => {
          const { Icon, color, bg } = STAT_ICONS[stat.key];
          return (
            <div key={stat.key} className="tp-stat-card">
              <span className="tp-stat-card__border" aria-hidden />
              <span
                className="tp-stat-card__icon"
                style={{ backgroundColor: bg }}
              >
                <Icon size={16} color={color} />
              </span>
              <p className="tp-stat-card__value">{stat.value}</p>
              <p className="tp-stat-card__label">{STAT_LABELS[stat.key]}</p>
            </div>
          );
        })}
      </div>

      <div className="tp-section-header">
        <h2 className="tp-section-title">Needs your review</h2>
        <button
          type="button"
          className="tp-link"
          onClick={() => navigate('/tatva-pendant/captures')}
        >
          View all
          <ArrowRight2 size={13} color="#4b4ad5" variant="Linear" />
        </button>
      </div>

      {loading && (
        <div className="tp-home__loading">
          <Spin />
        </div>
      )}

      {!loading && error && <p className="tp-captures__empty">{error}</p>}

      {!loading && !error && reviewCaptures.length > 0 && (
        <div className="tp-capture-list">
          {reviewCaptures.map((capture) => (
            <CaptureCard
              key={capture.id}
              capture={capture}
              showReviewFooter
              onClick={() => navigate(`/tatva-pendant/captures/${capture.id}`)}
            />
          ))}
        </div>
      )}

      {!loading && !error && reviewCaptures.length === 0 && captures.length > 0 && (
        <div className="tp-capture-list">
          <CaptureCard
            capture={captures[0]}
            onClick={() => navigate(`/tatva-pendant/captures/${captures[0].id}`)}
          />
        </div>
      )}
    </div>
  );
}

export default Home;
