import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTatvaPendantData } from '../context/TatvaPendantContext';
import { NAV_ICONS, TpIcon, TP_COLORS } from './TpIcons';
import { ASSETS } from '../../../../assets';
import './BottomNavigation.scss';

const NAV_ITEMS = [
  { key: 'back', label: 'Home', iconSrc: ASSETS.mobile.arrowUp, path: '/' },
  { key: 'divider' },
  { key: 'home', label: 'Tatva Pendant', iconKey: 'home', path: '/tatva-pendant' },
  {
    key: 'captures',
    label: 'Captures',
    iconKey: 'captures',
    path: '/tatva-pendant/captures',
    showCount: true,
  },
];

function BottomNavigation({ activeTab = '' }) {
  const navigate = useNavigate();
  const { summary } = useTatvaPendantData();

  const navItems = NAV_ITEMS;

  return (
    <nav className="tp-bottom-navigation" aria-label="Tatva Pendant">
      <div className="tp-bottom-navigation__content">
        {navItems.map((item) => {
          if (item.key === 'divider') {
            return (
              <span
                key="divider"
                className="tp-bottom-navigation__divider"
                aria-hidden
              />
            );
          }

          const isActive = activeTab === item.key;
          const badge = item.key === 'captures' ? summary.needReview : null;
          const Icon = item.iconKey ? NAV_ICONS[item.iconKey] : null;

          return (
            <button
              key={item.key}
              type="button"
              className={`tp-bottom-navigation__item ${isActive ? 'tp-bottom-navigation__item--active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
            >
              <span className="tp-bottom-navigation__icon-wrap">
                {item.iconSrc ? (
                  <img
                    src={item.iconSrc}
                    alt=""
                    className="tp-bottom-navigation__icon tp-bottom-navigation__icon--img"
                  />
                ) : (
                  <TpIcon
                    icon={Icon}
                    size={24}
                    variant={isActive ? 'Bulk' : 'Linear'}
                    color={isActive ? TP_COLORS.primary : '#454551'}
                    className="tp-bottom-navigation__icon"
                  />
                )}
                {item.key === 'captures' && badge > 0 && (
                  <span className="tp-bottom-navigation__badge">{badge}</span>
                )}
              </span>
              <span className="tp-bottom-navigation__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
