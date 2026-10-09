import React, { useMemo } from 'react';

let pendantPhoto = null;
try {
  const ctx = require.context('../assets', false, /pendant\.(png|jpg|jpeg|webp)$/);
  const keys = ctx.keys();
  if (keys.length) {
    const mod = ctx(keys[0]);
    pendantPhoto = mod?.default || mod;
  }
} catch (e) {
  pendantPhoto = null;
}

const GLOW_PRESETS = {
  red: { core: '#fecaca', halo: '#ef4444', shadow: 'rgba(239, 68, 68, 0.55)' },
  orange: { core: '#fed7aa', halo: '#f97316', shadow: 'rgba(249, 115, 22, 0.55)' },
  green: { core: '#bbf7d0', halo: '#22c55e', shadow: 'rgba(34, 197, 94, 0.55)' },
  white: { core: '#ffffff', halo: '#e9d5ff', shadow: 'rgba(167, 139, 250, 0.55)' },
  violet: { core: '#ddd6fe', halo: '#a78bfa', shadow: 'rgba(167, 139, 250, 0.6)' },
};

function PendantArtwork({ glow = 'white', className = '' }) {
  const palette = GLOW_PRESETS[glow] || GLOW_PRESETS.white;
  const idSuffix = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  const ids = {
    body: `tp-body-${idSuffix}`,
    edge: `tp-edge-${idSuffix}`,
    glow: `tp-glow-${idSuffix}`,
    bevelTop: `tp-bevtop-${idSuffix}`,
    bevelBottom: `tp-bevbot-${idSuffix}`,
    sym: `tp-sym-${idSuffix}`,
    aura: `tp-aura-${idSuffix}`,
    tint: `tp-tint-${idSuffix}`,
    lanyard: `tp-lan-${idSuffix}`,
    lanyardHl: `tp-lanh-${idSuffix}`,
  };

  if (pendantPhoto) {
    return (
      <img
        src={pendantPhoto}
        alt=""
        className={`tp-pendant-art tp-pendant-art--img ${className}`}
        style={{ filter: `drop-shadow(0 18px 28px ${palette.shadow})` }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 160 300"
      xmlns="http://www.w3.org/2000/svg"
      className={`tp-pendant-art ${className}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id={ids.body} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#34344a" />
          <stop offset="22%" stopColor="#1c1c2e" />
          <stop offset="55%" stopColor="#0d0d18" />
          <stop offset="80%" stopColor="#08081a" />
          <stop offset="100%" stopColor="#02020a" />
        </linearGradient>
        <linearGradient id={ids.edge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="20%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>
        <linearGradient id={ids.bevelTop} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={ids.bevelBottom} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.16)" />
        </linearGradient>
        <radialGradient id={ids.glow} cx="0.5" cy="0.55" r="0.55">
          <stop offset="0%" stopColor={palette.core} stopOpacity="0.95" />
          <stop offset="30%" stopColor={palette.halo} stopOpacity="0.7" />
          <stop offset="70%" stopColor={palette.halo} stopOpacity="0.18" />
          <stop offset="100%" stopColor={palette.halo} stopOpacity="0" />
        </radialGradient>
        <filter id={ids.sym} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <linearGradient id={ids.lanyard} x1="80" y1="0" x2="80" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
        </linearGradient>
        <linearGradient id={ids.lanyardHl} x1="80" y1="0" x2="80" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.95)" />
        </linearGradient>
      </defs>

      <line
        x1="80"
        y1="0"
        x2="80"
        y2="70"
        stroke={`url(#${ids.lanyard})`}
        strokeWidth="3"
      />
      <line
        x1="80"
        y1="0"
        x2="80"
        y2="70"
        stroke={`url(#${ids.lanyardHl})`}
        strokeWidth="1.1"
      />

      <path
        d="M 70 70 Q 70 62 80 62 Q 90 62 90 70 L 90 86 L 70 86 Z"
        fill={`url(#${ids.body})`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
      <ellipse cx="80" cy="70" rx="7" ry="3.5" fill="rgba(0,0,0,0.55)" />
      <ellipse cx="80" cy="70" rx="4.5" ry="2" fill="rgba(255,255,255,0.06)" />

      <rect x="32" y="80" width="96" height="208" rx="18" fill={`url(#${ids.body})`} />

      <rect x="32" y="80" width="96" height="208" rx="18" fill={`url(#${ids.edge})`} />

      <rect x="36" y="84" width="88" height="26" rx="14" fill={`url(#${ids.bevelTop})`} opacity="0.75" />

      <rect x="36" y="254" width="88" height="32" rx="14" fill={`url(#${ids.bevelBottom})`} opacity="0.6" />

      <rect
        x="32"
        y="80"
        width="96"
        height="208"
        rx="18"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1"
      />

      <rect x="34.5" y="90" width="1.5" height="188" rx="0.75" fill="rgba(255,255,255,0.22)" opacity="0.6" />

      <rect x="124" y="94" width="1" height="180" rx="0.5" fill="rgba(0,0,0,0.55)" opacity="0.7" />

      <line x1="36" y1="248" x2="124" y2="248" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />
      <line x1="36" y1="249" x2="124" y2="249" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />

      <g filter={`url(#${ids.sym})`} opacity="0.95" className="tp-pendant-art__glow-outer">
        <path
          d="M 64 204 L 64 180 Q 64 164 80 164 Q 96 164 96 180 L 96 204"
          stroke={palette.halo}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <g filter={`url(#${ids.sym})`} opacity="0.85" className="tp-pendant-art__glow-inner">
        <path
          d="M 64 204 L 64 180 Q 64 164 80 164 Q 96 164 96 180 L 96 204"
          stroke={palette.core}
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M 64 204 L 64 180 Q 64 164 80 164 Q 96 164 96 180 L 96 204"
        stroke="#ffffff"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default PendantArtwork;
