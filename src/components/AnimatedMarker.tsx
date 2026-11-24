import React from 'react';

// The gold coin markers that float over the port picture.
export const AnimatedMarker: React.FC<{ type: string }> = ({ type }) => {
  const getIcon = () => {
    switch (type) {
      case 'mkt':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <defs>
              <linearGradient id="gold-mkt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="35%" stopColor="#FFA751" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gold-light-mkt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="64">
                <stop offset="0%" stopColor="#FFF2A3" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            {/* Scale Body */}
            {/* Base & Column */}
            <path d="M20 54h24M24 50h16M32 15v35" stroke="url(#gold-mkt)" strokeWidth="3" strokeLinecap="round" />
            {/* Top Ring/Cap */}
            <circle cx="32" cy="11" r="3" stroke="url(#gold-mkt)" strokeWidth="2.5" fill="none" />
            {/* Beam */}
            <path d="M12 21c10-3 30-3 40 0" stroke="url(#gold-mkt)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M32 21v-5" stroke="url(#gold-mkt)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left Plate and Chains */}
            <path d="M12 21L6 39M12 21L18 39" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 39h16c0 5-16 5-16 0Z" fill="url(#gold-light-mkt)" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Right Plate and Chains */}
            <path d="M52 21L46 39M52 21L58 39" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M44 39h16c0 5-16 5-16 0Z" fill="url(#gold-light-mkt)" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        );
      case 'ship':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <defs>
              <linearGradient id="gold-ship" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="35%" stopColor="#FFA751" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            {/* Shackle (Top Ring) - cleanly hollow, centered at Y=11 */}
            <circle cx="32" cy="11" r="5" stroke="url(#gold-ship)" strokeWidth="3.2" fill="none" />
            {/* Shank (Vertical Shaft) - starts at the bottom edge of the ring (Y=16) and runs down to the bottom arc (Y=48) */}
            <path d="M 32 16 L 32 48" stroke="url(#gold-ship)" strokeWidth="5.5" strokeLinecap="round" />
            {/* Stock (Horizontal Crossbar) - flat caps, positioned at Y=22 */}
            <path d="M 18 22 L 46 22" stroke="url(#gold-ship)" strokeWidth="4.5" strokeLinecap="square" />
            {/* Crown (Bottom Curved Arm) */}
            <path d="M 14 36 C 14 53, 50 53, 50 36" stroke="url(#gold-ship)" strokeWidth="5.2" strokeLinecap="round" fill="none" />
            {/* Left Fluke (Sharper and pointing straight up) */}
            <path d="M 14 37 L 7 34 L 16 28 Z" fill="url(#gold-ship)" stroke="url(#gold-ship)" strokeWidth="1" strokeLinejoin="round" />
            {/* Right Fluke (Sharper and pointing straight up) */}
            <path d="M 50 37 L 57 34 L 48 28 Z" fill="url(#gold-ship)" stroke="url(#gold-ship)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        );
      case 'bar':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <defs>
              <linearGradient id="gold-bar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="35%" stopColor="#FFA751" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gold-light-bar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="64">
                <stop offset="0%" stopColor="#FFF2A3" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            {/* Handle */}
            <path d="M42 24h6c4 0 6 3 6 7v10c0 4-2 7-6 7h-6" stroke="url(#gold-bar)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Mug Body */}
            <path d="M20 22h24l-3 28H23Z" fill="url(#gold-light-bar)" stroke="url(#gold-bar)" strokeWidth="3" strokeLinejoin="round" />
            {/* Vertical Panels inside the mug */}
            <path d="M26 22l-1.5 28M32 22v28M38 22l1.5 28" stroke="url(#gold-bar)" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
            {/* Bottom Base rim */}
            <path d="M21 50h22" stroke="url(#gold-bar)" strokeWidth="4" strokeLinecap="round" />
            {/* Overflowing Foam */}
            <path d="M 18 22 C 16 20, 16 16, 19 15 C 18 12, 22 10, 25 11 C 27 8, 33 8, 35 11 C 38 9, 42 11, 42 14 C 45 15, 46 19, 44 22 Z" fill="#FFF8E7" stroke="url(#gold-bar)" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Bubble details */}
            <circle cx="25" cy="12" r="1.5" fill="url(#gold-bar)" opacity="0.8" />
            <circle cx="34" cy="9" r="1" fill="url(#gold-bar)" opacity="0.6" />
            <circle cx="38" cy="14" r="1.5" fill="url(#gold-bar)" opacity="0.8" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="url(#gold-default)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
            <defs>
              <linearGradient id="gold-default" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="100%" stopColor="#FFA751" />
              </linearGradient>
            </defs>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        );
    }
  };
  return (
    <div 
      className="relative flex flex-col items-center animate-marker-float group"
      style={{
        filter: `drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))`
      }}
    >
      {/* Medallion Badge (Gold coin look with beaded border and sweeping shine on hover) */}
      <div 
        className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 border border-amber-500/40 flex items-center justify-center transition-all duration-300 relative group-hover:scale-110 group-hover:border-amber-400 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer"
        style={{
          boxShadow: `0 4px 10px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(251,191,36,0.15)`
        }}
      >
        {/* Outer Embossed Ridge Rim */}
        <div className="absolute inset-[1.5px] rounded-full border-2 border-amber-600/50 pointer-events-none" />
        {/* Coin Beaded Inner Circle with slow rotational movement */}
        <div className="absolute inset-[5px] rounded-full border border-dashed border-amber-500/25 pointer-events-none animate-slow-spin" />
        {/* Sweeping Hover Shine Effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className="w-1/2 h-full bg-white/10 skew-x-[-20deg] translate-x-[-120%] group-hover:translate-x-[240%] transition-transform duration-1000 ease-out" />
        </div>
        {/* Central Gold Vector Icon */}
        <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          {getIcon()}
        </div>
      </div>
      {/* Pointer triangle to anchor the marker (Gold) */}
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500/80 -mt-[1px] transition-colors duration-300 group-hover:border-t-amber-400" />
      {/* Center glowing dot at the tip of the pointer for grounding */}
      <div className="w-2 h-2 rounded-full bg-amber-400 absolute -bottom-[12px] shadow-[0_0_10px_#f59e0b] opacity-80" />
    </div>
  );
};
