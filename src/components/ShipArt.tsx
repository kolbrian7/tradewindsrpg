import React from 'react';

export interface ShipArtProps {
  tier: number;
  variant?: 'player' | 'pirate' | 'syndicate' | 'league';
  upgrades?: string[];
  size?: 'port' | 'map' | 'shipyard' | 'battle';
  facing?: 'left' | 'right';
  damaged?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ShipArtProps['size']>, Record<number, string>> = {
  port:     { 1: 'w-[74px]',  2: 'w-[84px]',  3: 'w-[96px]',  4: 'w-[108px]' },
  map:      { 1: 'w-[46px]',  2: 'w-[52px]',  3: 'w-[58px]',  4: 'w-[64px]' },
  shipyard: { 1: 'w-36',      2: 'w-40',      3: 'w-44',      4: 'w-48' },
  battle:   { 1: 'w-[122px]', 2: 'w-[136px]', 3: 'w-[148px]', 4: 'w-[162px]' },
};

const SHIP_SPRITE = (tier: number, variant: NonNullable<ShipArtProps['variant']>) => {
  if (variant === 'league') return '/assets/ships/ship_league.webp';
  if (variant === 'syndicate') return '/assets/ships/ship_syndicate.webp';
  if (variant === 'pirate') return '/assets/ships/ship_pirate.webp';
  return `/assets/ships/ship_t${Math.max(1, Math.min(4, tier))}.webp`;
};

/**
 * Hand-illustrated Mediterranean storybook vessels sitting naturally at the waterline.
 */
export const ShipArt: React.FC<ShipArtProps> = ({
  tier,
  variant = 'player',
  size = 'shipyard',
  facing = 'right',
  damaged = false,
  className = '',
}) => {
  const clampedTier = Math.max(1, Math.min(4, tier));
  const widthClass = SIZE_CLASSES[size][clampedTier];
  const src = SHIP_SPRITE(clampedTier, variant);

  return (
    <div className={`relative inline-flex flex-col items-center select-none pointer-events-none origin-bottom ${widthClass} ${className}`}>
      {/* Water under the keel: a soft shadow, rings that spread out and fade, and a line of foam lapping the hull */}
      <svg className="absolute left-1/2 -translate-x-1/2 -bottom-[14%] w-[170%] pointer-events-none overflow-visible" viewBox="0 0 200 44" aria-hidden="true">
        <ellipse cx="100" cy="22" rx="52" ry="5.5" fill="#0a2c40" opacity="0.32" />
        {[0, 1, 2].map(i => (
          <ellipse
            key={i}
            className="ship-ring"
            cx="100" cy="22" rx="46" ry="6"
            fill="none" stroke="#e8fbff" strokeWidth="1.1" vectorEffect="non-scaling-stroke" strokeDasharray="26 9 14 12"
            style={{ animationDelay: `${-i * 1.5}s` }}
          />
        ))}
        <path className="ship-foam" d="M56 21 q7 -3 14 0 t14 0 t14 0 t14 0 t14 0 t14 0" fill="none" stroke="#f4feff" strokeWidth="1.3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="w-full" style={{ transform: facing === 'left' ? 'scaleX(-1)' : undefined }}>
        <div className="w-full animate-ship-bob origin-bottom">
          <img
            src={src}
            alt=""
            draggable="false"
            className="w-full h-auto block drop-shadow-[0_6px_8px_rgba(10,18,26,0.45)]"
          />
        </div>
      </div>

      {/* Subtle smoke wisps when hull is damaged in battle */}
      {damaged && (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 pointer-events-none opacity-75">
          <div className="w-5 h-5 rounded-full bg-stone-700/70 blur-[2px] animate-ping" style={{ animationDuration: '2.4s' }} />
        </div>
      )}
    </div>
  );
};
