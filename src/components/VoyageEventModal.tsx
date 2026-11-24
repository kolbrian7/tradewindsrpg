import React, { useState } from 'react';
import type { SeaEventDef, SeaChoice, GameState } from '../game';
import { IconCompass } from './Icons';

interface VoyageEventModalProps {
  event: SeaEventDef;
  destId: string;
  g: GameState;
  onApply: (nextState: GameState) => void;
  onContinue: () => void;
}

export const VoyageEventModal: React.FC<VoyageEventModalProps> = ({
  event,
  destId,
  g,
  onApply,
  onContinue,
}) => {
  const [outcome, setOutcome] = useState<string | null>(null);

  const pickChoice = (choice: SeaChoice) => {
    const res = choice.resolve(g, destId);
    onApply(res.state);
    setOutcome(res.outcome);
  };

  return (
    <div className="absolute inset-0 bg-[#0b1822]/85 z-50 flex items-center justify-center p-5 anim-fade">
      <div className="parchment rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#c6a569] pb-2.5">
          <div className="w-10 h-10 rounded-full bg-[#2a1a10] border border-[#c8963e] flex items-center justify-center text-[#f8d77d] shrink-0">
            <IconCompass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7d521b] block">At Sea</span>
            <h2 className="font-display text-lg font-black text-[#2b1d12] leading-tight">{event.title}</h2>
          </div>
        </div>

        <p className="text-sm text-[#3f2b19] leading-relaxed">{outcome || event.story}</p>

        {outcome ? (
          <button
            onClick={onContinue}
            className="w-full btn-brass py-3.5 rounded-xl font-display font-black uppercase tracking-widest text-xs"
          >
            Continue Voyage
          </button>
        ) : (
          <div className="space-y-2">
            {event.choices.map((c, idx) => (
              <button
                key={idx}
                onClick={() => pickChoice(c)}
                className="w-full parchment-card hover:brightness-95 text-left px-3.5 py-3 rounded-xl transition-all active:scale-98"
              >
                <div className="text-xs font-black uppercase tracking-wide text-[#2b1d12]">{c.label}</div>
                <div className="text-[11px] font-medium text-[#654b32] mt-0.5">{c.hint}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
