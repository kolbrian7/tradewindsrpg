import React from 'react';
import type { CommodityType } from '../game';

interface IconProps {
  className?: string;
}

export const IconCoin: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} inline-block shrink-0`} fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#d99b26" stroke="#7c4f0c" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="7.2" fill="#f7cf63" stroke="#b97a16" strokeWidth="1" />
    <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" stroke="#7c4f0c" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconAnchor: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2.2" />
    <path d="M12 7.2V21M7 11h10M5 14a7 7 0 0 0 14 0" />
    <path d="M4 14l1.8-1.5M20 14l-1.8-1.5" />
  </svg>
);

export const IconScales: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v16M7 20h10M4 7h16" />
    <path d="M6 7l-2.5 6h5L6 7ZM18 7l-2.5 6h5L18 7Z" />
  </svg>
);

export const IconHammer: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 6.5l3 3-9.5 9.5-3-3 9.5-9.5Z" />
    <path d="M12 4l4-1 5 5-3 3-6-7Z" />
  </svg>
);

export const IconTankard: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h10v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z" />
    <path d="M16 10h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H16" />
    <path d="M5.5 8c0-2 1.8-3.2 3.5-2.8C9.8 3.6 12.6 3.5 13.8 5c1.6-.4 3.2.8 2.8 3" />
  </svg>
);

export const IconCompass: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5" />
    <polygon points="15.5 8.5 13.2 13.2 8.5 15.5 10.8 10.8" fill="currentColor" fillOpacity="0.25" />
  </svg>
);

export const IconLedger: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4Z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

export const IconMenu: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconSkull: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.3 4.3 3 5.3V18h8v-2.7c1.7-1 3-2.8 3-5.3a7 7 0 0 0-7-7Z" />
    <circle cx="9.3" cy="10.5" r="1.3" fill="currentColor" />
    <circle cx="14.7" cy="10.5" r="1.3" fill="currentColor" />
    <path d="M10 18v3M14 18v3" />
  </svg>
);

export const IconCannon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11l13-5 2 5-13 4-2-4Z" fill="currentColor" fillOpacity="0.2" />
    <circle cx="9" cy="16" r="3.5" />
    <path d="M19 6l2-1.5" />
  </svg>
);

export const IconChain: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="9" width="8" height="6" rx="3" />
    <rect x="13" y="9" width="8" height="6" rx="3" />
    <path d="M9 12h6" />
  </svg>
);

export const IconShield: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3.5v5.5c0 4.6-3.3 8.2-8 9.5-4.7-1.3-8-4.9-8-9.5V6.5L12 3Z" />
  </svg>
);

export const IconSwords: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 19L19 5M15 5h4v4M5 5l14 14M9 5H5v4" />
  </svg>
);

export const IconSpyglass: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17l3 3 13-12-3-3L4 17Z" />
    <path d="M10 11l3 3M14 7l3 3" />
  </svg>
);

export const IconWind: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 8h12a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 18h8" />
  </svg>
);

export const IconStar: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2.5l2.9 6.1 6.7.9-4.9 4.7 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6-4.9-4.7 6.7-.9L12 2.5Z" />
  </svg>
);

export const IconChevronLeft: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const IconChevronRight: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconSound: React.FC<{ muted: boolean; className?: string }> = ({ muted, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9h4l5-4v14l-5-4H4V9Z" />
    {muted ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
  </svg>
);

export const IconScroll: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4h11a2 2 0 0 1 2 2v2h-3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h11" />
    <path d="M7 4a2 2 0 0 0-2 2v11M9 9h6M9 13h5" />
  </svg>
);

/** Bespoke warm storybook SVG artwork for every Mediterranean trade good. */
export const CommodityIcon: React.FC<{ good: CommodityType; className?: string }> = ({ good, className = 'w-9 h-9' }) => {
  const wrap = (inner: React.ReactNode, bg = '#efe0be') => (
    <svg viewBox="0 0 40 40" className={`${className} shrink-0`} fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill={bg} stroke="#b69150" strokeWidth="1.6" />
      {inner}
    </svg>
  );

  switch (good) {
    case 'Grain':
      return wrap(<>
        <path d="M14 31c2-7 5-14 9-20M18 31c1-6 4-11 8-17" stroke="#8a5a19" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="20" cy="14" rx="2.6" ry="4" transform="rotate(-20 20 14)" fill="#dca332" stroke="#784b10" strokeWidth="1.2" />
        <ellipse cx="24" cy="17" rx="2.5" ry="3.8" transform="rotate(20 24 17)" fill="#eab849" stroke="#784b10" strokeWidth="1.2" />
        <ellipse cx="18" cy="20" rx="2.4" ry="3.6" transform="rotate(-25 18 20)" fill="#eab849" stroke="#784b10" strokeWidth="1.2" />
        <ellipse cx="22" cy="23" rx="2.4" ry="3.4" transform="rotate(20 22 23)" fill="#dca332" stroke="#784b10" strokeWidth="1.2" />
      </>);
    case 'Salt':
      return wrap(<>
        <polygon points="20,9 29,25 11,25" fill="#fffdf9" stroke="#6d8190" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="20,9 25,25 15,25" fill="#e8f3f7" />
        <path d="M9 28h22" stroke="#8b6233" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="15" cy="15" r="1.1" fill="#ffffff" />
        <circle cx="25" cy="16" r="1.1" fill="#ffffff" />
      </>, '#e0eef2');
    case 'Hemp':
      return wrap(<>
        <ellipse cx="20" cy="21" rx="8" ry="6.5" fill="#b79557" stroke="#5d461d" strokeWidth="1.5" />
        <path d="M13 18c4 2 10 2 14 0M12 22c5 2 11 2 16 0M16 14v13M24 14v13" stroke="#755a27" strokeWidth="1.3" />
      </>);
    case 'Timber':
      return wrap(<>
        <ellipse cx="15" cy="22" rx="4" ry="4" fill="#d9a566" stroke="#5c3615" strokeWidth="1.5" />
        <path d="M15 18h14a4 4 0 0 1 0 8H15" fill="#9c622b" stroke="#5c3615" strokeWidth="1.5" />
        <ellipse cx="23" cy="14" rx="3.8" ry="3.8" fill="#d9a566" stroke="#5c3615" strokeWidth="1.5" />
        <path d="M23 10.2h6a3.8 3.8 0 0 1 0 7.6h-6" fill="#8b5523" stroke="#5c3615" strokeWidth="1.5" />
        <circle cx="15" cy="22" r="1.4" fill="#8b5523" />
      </>);
    case 'Wool':
      return wrap(<>
        <path d="M13 25a5 5 0 0 1-.5-9.5 6 6 0 0 1 11-2 5.5 5.5 0 0 1 6.5 5 5 5 0 0 1-3 6.5H13Z" fill="#fffaf0" stroke="#7b6850" strokeWidth="1.5" />
        <path d="M16 18c1.5 1.5 3.5 1.5 5 0M21 22c1.5 1 3 1 4 0" stroke="#b9a58b" strokeWidth="1.3" strokeLinecap="round" />
      </>);
    case 'Cotton':
      return wrap(<>
        <path d="M20 27v5" stroke="#5d4522" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="19" r="5" fill="#ffffff" stroke="#7e7567" strokeWidth="1.4" />
        <circle cx="24" cy="19" r="5" fill="#ffffff" stroke="#7e7567" strokeWidth="1.4" />
        <circle cx="20" cy="14" r="5" fill="#fffdf7" stroke="#7e7567" strokeWidth="1.4" />
        <path d="M13 25l7 3 7-3" stroke="#648341" strokeWidth="2.2" strokeLinecap="round" />
      </>);
    case 'Wine':
      return wrap(<>
        <path d="M17 9h6v4l3.5 5v11h-13V18L17 13V9Z" fill="#701c22" stroke="#3b0d12" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="15.5" y="19" width="9" height="6" rx="1" fill="#f3e1b9" stroke="#784b10" strokeWidth="1" />
        <rect x="18" y="7" width="4" height="2.5" rx="0.6" fill="#c78b3a" />
      </>);
    case 'Paper':
      return wrap(<>
        <path d="M11 12h15a3 3 0 0 1 3 3v12H14a3 3 0 0 1-3-3V12Z" fill="#fffaf0" stroke="#7d5f34" strokeWidth="1.5" />
        <path d="M15 17h9M15 21h9M15 25h6" stroke="#a6895a" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M29 14l2-4-4 2" stroke="#8a2c24" strokeWidth="1.6" strokeLinecap="round" />
      </>);
    case 'Iron':
      return wrap(<>
        <polygon points="10,25 14,15 26,15 30,25" fill="#6b7785" stroke="#2d3640" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="14,15 17,12 29,12 26,15" fill="#99a5b3" stroke="#2d3640" strokeWidth="1.3" strokeLinejoin="round" />
      </>, '#e4e8ec');
    case 'Oil':
      return wrap(<>
        <path d="M17 10h6l-1 4c4 2 6 6 5 11-1 3-3.5 5-7 5s-6-2-7-5c-1-5 1-9 5-11l-1-4Z" fill="#c9862c" stroke="#5b3910" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13 15c-2.5 0-3 4-1 5M27 15c2.5 0 3 4 1 5" stroke="#5b3910" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="18" cy="21" r="2" fill="#f5ca5c" />
      </>);
    case 'Dye':
      return wrap(<>
        <path d="M12 16h16l-2 13H14l-2-13Z" fill="#6b2778" stroke="#3b1244" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="20" cy="16" rx="8" ry="2.6" fill="#9d44ad" stroke="#3b1244" strokeWidth="1.4" />
        <circle cx="25" cy="11" r="2.2" fill="#c43866" />
      </>, '#efe2f3');
    case 'Spice':
      return wrap(<>
        <path d="M10 21h20c-1 6-5 9-10 9s-9-3-10-9Z" fill="#8b4d23" stroke="#47230c" strokeWidth="1.5" />
        <path d="M12 21c2-5 6-8 8-8s6 3 8 8Z" fill="#d95b26" stroke="#6e290c" strokeWidth="1.3" />
        <circle cx="18" cy="17" r="1" fill="#f6c453" />
        <circle cx="22" cy="18" r="1" fill="#f6c453" />
      </>);
    case 'Tobacco':
      return wrap(<>
        <path d="M12 27c2-9 8-15 16-16-1 8-7 14-16 16Z" fill="#7c5624" stroke="#3d280d" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13 26c5-5 10-9 14-13" stroke="#c89e5a" strokeWidth="1.3" strokeLinecap="round" />
      </>);
    case 'Tea':
      return wrap(<>
        <path d="M13 25c1-8 6-14 14-14-1 8-6 14-14 14Z" fill="#468344" stroke="#234722" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M11 21c0-5 3-9 8-10" stroke="#62a85f" strokeWidth="1.8" strokeLinecap="round" />
      </>, '#e3efe0');
    case 'Silk':
      return wrap(<>
        <rect x="11" y="13" width="18" height="14" rx="2.5" fill="#ba3240" stroke="#5d141c" strokeWidth="1.5" />
        <path d="M15 13v14M25 13v14" stroke="#f0c060" strokeWidth="1.8" />
        <path d="M11 19c4 2 14 2 18 0" stroke="#e47b84" strokeWidth="1.4" />
      </>, '#f6e1e4');
    case 'Tools':
      return wrap(<>
        <path d="M12 27l12-12" stroke="#5d3818" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M21 10l6 6-2.5 2.5-6-6L21 10Z" fill="#6f7b87" stroke="#2d343b" strokeWidth="1.4" />
        <path d="M12 12l16 16" stroke="#7d8a96" strokeWidth="2.2" strokeLinecap="round" />
      </>);
    case 'Porcelain':
      return wrap(<>
        <path d="M16 10h8l-1 4c3 2 4 6 3 10-1 3-3 5-6 5s-5-2-6-5c-1-4 0-8 3-10l-1-4Z" fill="#ffffff" stroke="#255d8f" strokeWidth="1.5" />
        <path d="M15 21c3 2 7 2 10 0M16 16h8" stroke="#3175b3" strokeWidth="1.4" strokeLinecap="round" />
      </>, '#e3eef7');
    case 'Weapons':
      return wrap(<>
        <path d="M12 28l14-14M14 22l4 4" stroke="#5d3818" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M17 23l11-11 1-3-3 1-11 11" fill="#b4c0cc" stroke="#2d3640" strokeWidth="1.4" strokeLinejoin="round" />
      </>, '#e9ecef');
    case 'Silver':
      return wrap(<>
        <polygon points="10,24 14,15 26,15 30,24" fill="#d9e2ea" stroke="#475569" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="14,15 17,12 29,12 26,15" fill="#f8fafc" stroke="#475569" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M15 18l3 4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </>, '#e8eef5');
    case 'Jewelry':
      return wrap(<>
        <circle cx="20" cy="23" r="6.5" fill="none" stroke="#d49523" strokeWidth="3.2" />
        <polygon points="20,10 24,15 20,19 16,15" fill="#d93848" stroke="#6e1620" strokeWidth="1.3" />
      </>);
    case 'Gems':
      return wrap(<>
        <polygon points="14,12 26,12 31,19 20,30 9,19" fill="#1aa3b8" stroke="#0c4d59" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 19h22M14 12l3 7 3 11 3-11 3-7" stroke="#b6f3fc" strokeWidth="1.2" strokeLinejoin="round" />
      </>, '#dff4f7');
    case 'Statues':
      return wrap(<>
        <rect x="13" y="26" width="14" height="4" rx="1" fill="#d6cbb5" stroke="#5c513e" strokeWidth="1.4" />
        <path d="M16 26c0-4 1-6 1-8a4 4 0 1 1 6 0c0 2 1 4 1 8H16Z" fill="#f6f1e6" stroke="#5c513e" strokeWidth="1.4" />
        <circle cx="20" cy="13" r="3.5" fill="#f6f1e6" stroke="#5c513e" strokeWidth="1.4" />
      </>);
  }
};
