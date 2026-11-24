import React from 'react';
import { IconAnchor, IconScales, IconTankard } from './Icons';

// Warm Mediterranean brass medallions floating over the painted harbor landmarks.
export const AnimatedMarker: React.FC<{ type: string }> = ({ type }) => {
  const icon =
    type === 'mkt' ? <IconScales className="w-6 h-6 text-[#f8d77d]" /> :
    type === 'ship' ? <IconAnchor className="w-6 h-6 text-[#f8d77d]" /> :
    <IconTankard className="w-6 h-6 text-[#f8d77d]" />;

  return (
    <div className="relative flex flex-col items-center animate-marker-float group">
      <div
        className="w-12 h-12 rounded-full bg-gradient-to-b from-[#4a2b17] via-[#2b180d] to-[#1a0e07] border-2 border-[#d8a74a] flex items-center justify-center relative transition-transform duration-200 group-hover:scale-110 shadow-[0_5px_12px_rgba(0,0,0,0.55)]"
      >
        <div className="absolute inset-[2px] rounded-full border border-dashed border-[#e8be63]/45 pointer-events-none animate-slow-spin" />
        <div className="relative z-10">{icon}</div>
      </div>
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#d8a74a] -mt-[1px]" />
    </div>
  );
};
