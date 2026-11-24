import React from 'react';

export interface ShipArtProps {
  tier: number;
  variant?: 'player' | 'pirate' | 'syndicate';
  upgrades?: string[];
  size?: 'port' | 'map' | 'shipyard' | 'battle';
  facing?: 'left' | 'right';
  damaged?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ShipArtProps['size']>, Record<number, string>> = {
  port:     { 1: 'w-[68px]',  2: 'w-[78px]',  3: 'w-[88px]',  4: 'w-[98px]' },
  map:      { 1: 'w-12',      2: 'w-[54px]',  3: 'w-[60px]',  4: 'w-[66px]' },
  shipyard: { 1: 'w-36',      2: 'w-40',      3: 'w-44',      4: 'w-48' },
  battle:   { 1: 'w-[114px]', 2: 'w-[126px]', 3: 'w-[138px]', 4: 'w-[150px]' },
};

/**
 * Hand-crafted Mediterranean ship SVG illustrations matching the warm storybook style.
 * Tier 1 = Tartane (lateen skiff), Tier 2 = Brigantine, Tier 3 = Frigate, Tier 4 = Galleon.
 */
export const ShipArt: React.FC<ShipArtProps> = ({
  tier,
  variant = 'player',
  upgrades = [],
  size = 'shipyard',
  facing = 'right',
  damaged = false,
  className = '',
}) => {
  const clampedTier = Math.max(1, Math.min(4, tier));
  const widthClass = SIZE_CLASSES[size][clampedTier];

  const isPirate = variant === 'pirate';
  const isBoss = variant === 'syndicate';

  const hullDark = isBoss ? '#381519' : isPirate ? '#2f201a' : '#5e361c';
  const hullMid = isBoss ? '#5b2229' : isPirate ? '#483129' : '#854e27';
  const hullTrim = isBoss ? '#e0a43b' : isPirate ? '#a84232' : '#d6a44e';
  const sailLight = isBoss ? '#d84539' : isPirate ? '#dfd0bd' : '#fbf2de';
  const sailShade = isBoss ? '#94221a' : isPirate ? '#b6a18b' : '#dfca9f';
  const sailAccent = isBoss ? '#f4c552' : isPirate ? '#9b2c23' : '#1b7f8c';
  const strokeInk = '#25170e';

  const hasCannons = upgrades.includes('cannons') || clampedTier >= 2;
  const hasArmor = upgrades.includes('supports');
  const hasStormSails = upgrades.includes('sails');
  const hasExtraHold = upgrades.includes('hull');

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none pointer-events-none ${widthClass} ${className}`}
      style={{ transform: facing === 'left' ? 'scaleX(-1)' : undefined }}
    >
      <svg viewBox="0 0 180 140" className="w-full h-auto drop-shadow-[0_6px_8px_rgba(12,18,26,0.45)]" fill="none">
        {/* Waterline ripples */}
        <g className="animate-water-ripple">
          <path d="M22 121c18 5 40 5 64 2 22 3 48 3 68-2" stroke="#7dd3de" strokeWidth="3.2" strokeLinecap="round" opacity="0.65" />
          <path d="M36 127c24 4 76 4 108 0" stroke="#d9f7fa" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </g>

        <g className="animate-ship-bob">
          {/* TIER 1: MEDITERRANEAN LATEEN TARTANE */}
          {clampedTier === 1 && (
            <>
              {/* Mast & angled lateen yard */}
              <path d="M88 106V36" stroke="#4a2c14" strokeWidth="4" strokeLinecap="round" />
              <path d="M40 74L130 24" stroke="#5b371b" strokeWidth="3.5" strokeLinecap="round" />
              {/* Pennant */}
              <path d="M88 36l16 3-16 4Z" fill={sailAccent} className="animate-pennant" />
              {/* Lateen triangular sail */}
              <path
                d="M46 72L127 26C124 58 118 82 104 94L46 72Z"
                fill={sailLight}
                stroke={strokeInk}
                strokeWidth="2"
                strokeLinejoin="round"
                className="animate-sail-billow"
              />
              <path d="M104 94C116 82 122 58 125 32L88 64Z" fill={sailShade} opacity="0.55" />
              {hasStormSails && <path d="M74 61l39-14" stroke="#1b7f8c" strokeWidth="3.2" strokeLinecap="round" />}
              {isPirate && <circle cx="96" cy="58" r="7" fill="#231610" opacity="0.75" />}

              {/* Cargo barrels on deck if upgraded */}
              {hasExtraHold && (
                <>
                  <rect x="64" y="95" width="11" height="9" rx="2" fill="#a86832" stroke={strokeInk} strokeWidth="1.4" />
                  <rect x="76" y="96" width="10" height="8" rx="2" fill="#c07d3e" stroke={strokeInk} strokeWidth="1.4" />
                </>
              )}

              {/* Curved hull */}
              <path
                d="M32 98C52 103 116 104 146 95L135 117C112 122 66 122 44 116L32 98Z"
                fill={hullMid}
                stroke={strokeInk}
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path d="M41 112C68 117 110 117 137 112L135 117C112 122 66 122 44 116Z" fill={hullDark} />
              <path d="M34 102C60 107 114 108 144 99" stroke={hullTrim} strokeWidth="2.4" strokeLinecap="round" />
              {/* Bowsprit & oars */}
              <path d="M144 98l20-8" stroke="#4a2c14" strokeWidth="3" strokeLinecap="round" />
              {hasCannons && <circle cx="110" cy="106" r="2.6" fill="#26201c" stroke={hullTrim} strokeWidth="1.2" />}
              {hasArmor && <path d="M52 108h68" stroke="#9aa6b2" strokeWidth="2.2" strokeDasharray="6 5" />}
            </>
          )}

          {/* TIER 2: BRIGANTINE */}
          {clampedTier === 2 && (
            <>
              {/* Rear & Fore masts */}
              <path d="M72 102V26M116 102V22" stroke="#4a2c14" strokeWidth="3.8" strokeLinecap="round" />
              <path d="M116 22l18 3.5-18 4.5Z" fill={sailAccent} className="animate-pennant" />
              {/* Aft gaff sail */}
              <path d="M44 86L72 40v48H44Z" fill={sailShade} stroke={strokeInk} strokeWidth="1.8" strokeLinejoin="round" />
              {/* Square fore sails */}
              <path d="M90 36h48c4 14 4 28 0 42H90c4-14 4-28 0-42Z" fill={sailLight} stroke={strokeInk} strokeWidth="2" className="animate-sail-billow" />
              <path d="M97 56h36" stroke={hasStormSails ? '#1b7f8c' : hullTrim} strokeWidth="2.4" />
              <path d="M138 78L160 88L136 92Z" fill={sailLight} stroke={strokeInk} strokeWidth="1.8" strokeLinejoin="round" />
              {isPirate && <circle cx="114" cy="57" r="8" fill="#231610" opacity="0.82" />}
              {isBoss && <circle cx="114" cy="57" r="9" fill="#f4c552" stroke="#5b2229" strokeWidth="2" />}

              {/* Hull */}
              <path
                d="M28 92L42 117C70 123 118 122 142 115L156 91C124 98 66 99 28 92Z"
                fill={hullMid}
                stroke={strokeInk}
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path d="M38 110C68 116 116 116 144 109L142 115C118 122 70 123 42 117Z" fill={hullDark} />
              <path d="M31 96C68 103 122 102 153 95" stroke={hullTrim} strokeWidth="2.6" />
              <path d="M152 94l22-10" stroke="#4a2c14" strokeWidth="3.2" strokeLinecap="round" />
              {/* Cabin & cannon ports */}
              <rect x="36" y="84" width="22" height="10" rx="2" fill={hullDark} stroke={strokeInk} strokeWidth="1.6" />
              <circle cx="80" cy="105" r="2.8" fill="#1e1b18" stroke={hullTrim} strokeWidth="1.2" />
              <circle cx="98" cy="106" r="2.8" fill="#1e1b18" stroke={hullTrim} strokeWidth="1.2" />
              <circle cx="116" cy="105" r="2.8" fill="#1e1b18" stroke={hullTrim} strokeWidth="1.2" />
              {hasArmor && <path d="M52 101h84" stroke="#9aa6b2" strokeWidth="2.3" strokeDasharray="7 5" />}
            </>
          )}

          {/* TIER 3 & 4: FRIGATE & GRAND GALLEON */}
          {clampedTier >= 3 && (
            <>
              {/* Three masts */}
              <path d="M56 98V26M96 98V14M130 98V22" stroke="#422611" strokeWidth="3.8" strokeLinecap="round" />
              <path d="M96 14l20 4-20 4.5Z" fill={sailAccent} className="animate-pennant" />

              {/* Mizzen sail */}
              <path d="M36 82L56 42v42H36Z" fill={sailShade} stroke={strokeInk} strokeWidth="1.8" strokeLinejoin="round" />
              {/* Main sails (double tier) */}
              <path d="M74 22h42c3 9 3 18 0 26H74c3-9 3-18 0-26Z" fill={sailLight} stroke={strokeInk} strokeWidth="1.8" />
              <path d="M70 51h50c4 12 4 24 0 35H70c4-12 4-24 0-35Z" fill={sailLight} stroke={strokeInk} strokeWidth="2" className="animate-sail-billow" />
              {/* Fore sails */}
              <path d="M114 30h32c3 10 3 20 0 28h-32c3-10 3-20 0-28Z" fill={sailShade} stroke={strokeInk} strokeWidth="1.8" />
              <path d="M112 61h36c3 9 3 17 0 25h-36c3-9 3-17 0-25Z" fill={sailLight} stroke={strokeInk} strokeWidth="1.8" />
              {/* Jib */}
              <path d="M148 56L172 86L144 88Z" fill={sailLight} stroke={strokeInk} strokeWidth="1.7" strokeLinejoin="round" />

              {hasStormSails && (
                <>
                  <path d="M76 68h44" stroke="#1b7f8c" strokeWidth="3" />
                  <path d="M116 74h30" stroke="#1b7f8c" strokeWidth="2.5" />
                </>
              )}
              {isPirate && <circle cx="95" cy="68" r="9" fill="#231610" opacity="0.85" />}
              {isBoss && (
                <g>
                  <circle cx="95" cy="68" r="10" fill="#f4c552" stroke="#5b2229" strokeWidth="2" />
                  <circle cx="95" cy="68" r="4" fill="#5b2229" />
                </g>
              )}

              {/* Raised stern castle & grand hull */}
              <path
                d="M24 78L48 84L156 89L144 116C114 124 62 124 34 116L24 78Z"
                fill={hullMid}
                stroke={strokeInk}
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path d="M32 108C66 116 112 116 147 108L144 116C114 124 62 124 34 116Z" fill={hullDark} />
              <path d="M26 85L52 91L153 95" stroke={hullTrim} strokeWidth="2.8" />
              {/* Bowsprit & golden figurehead */}
              <path d="M153 91l23-12" stroke="#422611" strokeWidth="3.4" strokeLinecap="round" />
              {clampedTier === 4 && (
                <>
                  <rect x="26" y="70" width="20" height="10" rx="2" fill={hullDark} stroke={hullTrim} strokeWidth="1.6" />
                  <circle cx="29" cy="75" r="2.3" fill="#ffd970" />
                  <circle cx="37" cy="75" r="2.3" fill="#ffd970" />
                </>
              )}
              {/* Broadside gun ports */}
              {[64, 82, 100, 118, 134].slice(0, clampedTier === 4 ? 5 : 4).map(cx => (
                <circle key={cx} cx={cx} cy="102" r="3" fill="#1b1815" stroke={hullTrim} strokeWidth="1.2" />
              ))}
              {hasArmor && <path d="M46 97h96" stroke="#9aa6b2" strokeWidth="2.5" strokeDasharray="7 5" />}
            </>
          )}

          {/* Damage smoke wisps when below 50% HP */}
          {damaged && (
            <g opacity="0.72">
              <circle cx="88" cy="84" r="6" fill="#44403c" />
              <circle cx="82" cy="74" r="8" fill="#57534e" />
              <circle cx="92" cy="66" r="5" fill="#78716c" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
