import React from 'react';

/** The painted brass medallions (hull, wine jug, scales, sail, lighthouse) used on the harbour and in the bottom bar. */
export const PaintedIcon: React.FC<{ type: 'ship' | 'bar' | 'mkt' | 'sail' | 'port'; className?: string }> = ({ type, className }) => (
  <img src={`/assets/icons/${type}.webp`} alt="" draggable={false} className={className} />
);

// Painted medallions floating over the harbour landmarks.
export const AnimatedMarker: React.FC<{ type: string }> = ({ type }) => {
  const icon = type === 'mkt' ? 'mkt' : type === 'ship' ? 'ship' : 'bar';
  return (
    <div className="relative flex flex-col items-center animate-marker-float group">
      <PaintedIcon
        type={icon}
        className="w-14 h-14 rounded-full transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_5px_8px_rgba(0,0,0,0.55)]"
      />
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#d8a74a] -mt-[2px]" />
    </div>
  );
};
