import React, { useState, useRef } from 'react';
import { audioManager } from '../engine/AudioManager';

interface PrologueStoryboardProps {
  onComplete: () => void;
}

const textStages = [
  "OUR LEGENDARY FLEET",
  "BETRAYED AND STRIPPED OF ALL",
  "WILL RECLAIM OUR HONOR AS",
  "MERCHANTS\nOF THE\nMEDITERRANEAN"
];

export const PrologueStoryboard: React.FC<PrologueStoryboardProps> = ({ onComplete }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch((err) => {
        console.warn("Video play failed:", err);
      });
    }
    audioManager.playSfx('click');
  };

  // Preload game background images in the background while the prologue video is playing
  React.useEffect(() => {
    const imagesToPreload = [
      '/assets/World Map.webp',
      '/assets/Market Transparent.webp',
      '/assets/Transparent Shipyard.webp',
      '/assets/proper cantina.webp',
      '/assets/easy remove boat.webp',
      '/assets/New Lands/Athens.webp',
      '/assets/New Lands/Rome.webp',
      '/assets/New Lands/Venice.webp',
      '/assets/New Lands/Crete.webp',
      '/assets/New Lands/Barcellona.webp',
      '/assets/New Lands/Tunisia.webp',
      '/assets/New Lands/Egypt.webp',
      '/assets/New Lands/Nice.webp',
      '/assets/New Lands/Sardinia.webp',
      '/assets/Boat/Boat 1.webp',
      '/assets/Boat/Boat 2.webp',
      '/assets/Boat/Boat 3.webp',
      '/assets/Boat/Boat 4.webp',
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const time = video.currentTime;
    const dur = video.duration;
    if (!dur || isNaN(dur)) return;

    const pct = time / dur;
    const numStages = textStages.length;
    const stageIndex = Math.min(numStages - 1, Math.floor(pct * numStages));

    if (stageIndex >= 0 && stageIndex < numStages) {
      const stagePct = (pct * numStages) % 1; // 0 to 1 progress within this quadrant
      
      // Fade text in during 15% to 85% of the stage duration for clean spacing
      const visible = stagePct > 0.15 && stagePct < 0.85;

      setCurrentTextIndex(stageIndex);
      setTextVisible(visible);
    } else {
      setTextVisible(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black z-50 overflow-hidden flex flex-col justify-center items-center font-sans select-none">
      <video
        ref={videoRef}
        src="/assets/prologue.mp4"
        playsInline
        preload="auto"
        onEnded={onComplete}
        onError={onComplete}
        onTimeUpdate={handleTimeUpdate}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!isPlaying && (
        <div 
          onClick={handlePlay}
          className="absolute inset-0 bg-slate-950/95 flex flex-col justify-center items-center z-50 cursor-pointer p-6 text-center animate-in fade-in duration-300"
        >
          <div className="w-20 h-20 rounded-full border border-amber-500/30 mb-8 flex items-center justify-center bg-amber-500/5 shadow-2xl shadow-amber-500/5 relative animate-pulse">
            <span className="text-3xl text-amber-400">🧭</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-serif text-amber-400 font-black tracking-widest uppercase italic mb-2">
            Merchants of the Mediterranean
          </h1>

          <div className="w-16 h-16 rounded-full border-2 border-amber-500/60 flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] mt-6 relative">
            <svg className="w-6 h-6 text-amber-400 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-3">Click to Play Intro</span>
        </div>
      )}

      {/* Cinematic Text Overlay Layer - Centered and Symmetrical */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 p-4">
        <div
          className={`transition-all duration-1000 transform text-center max-w-xs sm:max-w-lg md:max-w-2xl w-full flex items-center justify-center mx-auto ${
            textVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          {/* whitespace-pre-line respects the \n newlines to force specific line breaks, with smaller font scaling */}
          <h2 
            className="text-[4vw] sm:text-xl md:text-3xl lg:text-4xl font-black tracking-wide sm:tracking-widest uppercase text-amber-400 font-serif italic py-2 whitespace-pre-line break-normal" 
            style={{
              textShadow: '0 4px 16px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.95), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              lineHeight: '1.35'
            }}
          >
            {textStages[currentTextIndex]}
          </h2>
        </div>
      </div>

      <button
        onClick={() => {
          audioManager.playSfx('click');
          onComplete();
        }}
        className="absolute top-6 right-6 z-30 text-slate-400 hover:text-amber-400 active:scale-95 transition-all font-black uppercase text-[10px] tracking-[0.25em] bg-black/40 hover:bg-black/80 px-4 py-2 rounded-full border border-amber-500/20 backdrop-blur-md shadow-lg pointer-events-auto cursor-pointer"
      >
        Skip Intro
      </button>

      {/* Subtle Gold Corner Accents */}
      <div className="absolute inset-4 border border-amber-500/5 pointer-events-none z-10">
        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-amber-500/20" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-amber-500/20" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-amber-500/20" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-amber-500/20" />
      </div>
    </div>
  );
};
