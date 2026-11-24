import React, { useState, useEffect, useRef } from 'react';
import type { Rumor } from '../game';
import { IconCoin, IconTankard, IconStar } from './Icons';

export type PubGameType = 'dice' | 'coin' | 'arm';

interface CantinaGamesProps {
  gold: number;
  rumors: Rumor[];
  defaultGame: PubGameType;
  onBribe: () => void;
  onSpendStake: (amount: number) => void;
  onFinishGame: (win: boolean, mode: 'gossip' | 'gold', stake: number) => void;
  onPlaySfx: (name: string) => void;
}

const GAME_TITLES: Record<PubGameType, string> = {
  dice: "Captain's Dice",
  coin: 'Doubloon Toss',
  arm: 'Arm Wrestling',
};

// Standard 3x3 grid pip positions for faces 1-6
const PIP_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Rotations that orient the CSS 3D cube so `value` faces forward
const FACE_TRANSFORMS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg)',
  3: 'rotateX(0deg) rotateY(-90deg)',
  4: 'rotateX(0deg) rotateY(90deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateX(180deg) rotateY(0deg)',
};

const CUBE_FACES: Array<{ val: number; transform: string }> = [
  { val: 1, transform: 'translateZ(26px)' },
  { val: 6, transform: 'rotateY(180deg) translateZ(26px)' },
  { val: 3, transform: 'rotateY(90deg) translateZ(26px)' },
  { val: 4, transform: 'rotateY(-90deg) translateZ(26px)' },
  { val: 2, transform: 'rotateX(90deg) translateZ(26px)' },
  { val: 5, transform: 'rotateX(-90deg) translateZ(26px)' },
];

const Die3D: React.FC<{ value: number; tone?: 'ivory' | 'crimson'; rolling?: boolean; tilt?: number }> = ({
  value,
  tone = 'ivory',
  rolling = false,
  tilt = 0,
}) => (
  <div className="flex flex-col items-center">
    <div className={`dice-scene ${rolling ? 'animate-dice-throw' : ''}`}>
      <div
        className={`dice-cube ${tone === 'ivory' ? 'dice-ivory' : 'dice-crimson'}`}
        style={{ transform: `rotateZ(${tilt}deg) ${FACE_TRANSFORMS[value] || FACE_TRANSFORMS[1]}` }}
      >
        {CUBE_FACES.map(f => {
          const pips = PIP_CELLS[f.val];
          return (
            <div key={f.val} className="dice-face" style={{ transform: f.transform }}>
              {Array.from({ length: 9 }, (_, cell) => (
                <div key={cell} className={pips.includes(cell) ? 'dice-pip' : ''} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
    <div className="w-12 h-2.5 -mt-0.5 rounded-full bg-black/55 blur-[3px] pointer-events-none" />
  </div>
);

export const CantinaGames: React.FC<CantinaGamesProps> = ({
  gold,
  rumors,
  defaultGame,
  onBribe,
  onSpendStake,
  onFinishGame,
  onPlaySfx,
}) => {
  const [selectedGame, setSelectedGame] = useState<PubGameType>(defaultGame);
  const [activeGame, setActiveGame] = useState<PubGameType | null>(null);
  const [mode, setMode] = useState<'gossip' | 'gold'>('gossip');
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<{ win: boolean; note: string } | null>(null);

  // Dice state
  const [dicePhase, setDicePhase] = useState<'ready' | 'rolled' | 'done'>('ready');
  const [playerDice, setPlayerDice] = useState<[number, number]>([3, 4]);
  const [barkeepDice, setBarkeepDice] = useState<[number, number]>([3, 3]);
  const [diceRollKey, setDiceRollKey] = useState(0);
  const [rerolledOnce, setRerolledOnce] = useState(false);

  // Coin toss state (cumulative Y rotation so every flip spins cleanly to Sun=0deg mod 360 or Anchor=180deg mod 360)
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinRotationY, setCoinRotationY] = useState(0);
  const [coinFlipKey, setCoinFlipKey] = useState(0);

  // Arm wrestling state
  const [armPos, setArmPos] = useState(50);
  const [armResolving, setArmResolving] = useState(false);
  const [playDir, setPlayDir] = useState<'forward' | 'reverse'>('forward');
  const armDirRef = useRef(1);
  const armOutcomeRef = useRef<boolean | null>(null);
  const armResolvedRef = useRef(false);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeGame !== 'arm' || result || armResolving) return;
    const id = setInterval(() => {
      setArmPos(prev => {
        const next = prev + 4.8 * armDirRef.current;
        if (next >= 90) { armDirRef.current = -1; return 90; }
        if (next <= 10) { armDirRef.current = 1; return 10; }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [activeGame, result, armResolving]);

  useEffect(() => {
    const video = armVideoRef.current;
    if (activeGame !== 'arm' || result || armResolving || !video) return;
    let rafId = 0;
    let alive = true;
    if (playDir === 'forward') {
      const check = () => {
        if (!alive) return;
        if (video.currentTime >= 1.95) {
          video.pause();
          video.currentTime = 1.95;
          setPlayDir('reverse');
          return;
        }
        rafId = requestAnimationFrame(check);
      };
      video.play().catch(() => {});
      rafId = requestAnimationFrame(check);
    } else {
      video.pause();
      let last = performance.now();
      const rev = () => {
        if (!alive) return;
        const now = performance.now();
        const next = video.currentTime - (now - last) / 1000;
        last = now;
        if (next <= 0.05) {
          video.currentTime = 0;
          setPlayDir('forward');
        } else {
          video.currentTime = next;
          rafId = requestAnimationFrame(rev);
        }
      };
      rafId = requestAnimationFrame(rev);
    }
    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
    };
  }, [activeGame, result, armResolving, playDir]);

  const startRound = () => {
    if (gold < bet) return;
    onPlaySfx('coin');
    onSpendStake(bet);
    setResult(null);
    setDicePhase('ready');
    setRerolledOnce(false);
    setCoinFlipping(false);
    setCoinRotationY(0);
    armDirRef.current = 1;
    armResolvedRef.current = false;
    armOutcomeRef.current = null;
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    setArmPos(50);
    setArmResolving(false);
    setPlayDir('forward');
    setActiveGame(selectedGame);
  };

  const conclude = (win: boolean, note: string) => {
    onPlaySfx(win ? 'victory' : 'defeat');
    setResult({ win, note });
    onFinishGame(win, mode, bet);
  };

  // --- DICE LOGIC ---
  const d6 = () => 1 + Math.floor(Math.random() * 6);

  const rollMyDice = () => {
    onPlaySfx('click');
    setPlayerDice([d6(), d6()]);
    setDiceRollKey(k => k + 1);
    setDicePhase('rolled');
  };

  const rerollLowDie = () => {
    if (rerolledOnce) return;
    onPlaySfx('click');
    setRerolledOnce(true);
    setPlayerDice(([a, b]) => (a <= b ? [d6(), b] : [a, d6()]));
    setDiceRollKey(k => k + 1);
  };

  const challengeBarkeep = () => {
    onPlaySfx('click');
    const ba = d6();
    const bb = d6();
    setBarkeepDice([ba, bb]);
    setDiceRollKey(k => k + 1);
    setDicePhase('done');
    const pSum = playerDice[0] + playerDice[1];
    const bSum = ba + bb;
    conclude(pSum > bSum, `You rolled ${pSum} vs the barkeep's ${bSum}.`);
  };

  // --- COIN TOSS LOGIC ---
  const flipCoin = (pickSide: 'sun' | 'anchor') => {
    if (coinFlipping) return;
    onPlaySfx('coin');
    setCoinFlipping(true);
    setCoinFlipKey(k => k + 1);
    const landed: 'sun' | 'anchor' = Math.random() < 0.5 ? 'sun' : 'anchor';
    // Spin 4 full turns + 180deg if landing on Anchor
    setCoinRotationY(prev => {
      const base = Math.ceil(prev / 360) * 360 + 1440;
      return landed === 'anchor' ? base + 180 : base;
    });
    setTimeout(() => {
      setCoinFlipping(false);
      conclude(pickSide === landed, `The doubloon lands on ${landed === 'sun' ? 'Sun' : 'Anchor'}.`);
    }, 980);
  };

  // --- ARM WRESTLE LOGIC ---
  const resolveArm = (win: boolean) => {
    if (armResolvedRef.current) return;
    armResolvedRef.current = true;
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    setArmResolving(false);
    conclude(win, win ? 'You slam the sea dog’s knuckles onto the oak table!' : 'He pins your wrist to the scarred oak.');
  };

  const slamArm = () => {
    const win = armPos >= 38 && armPos <= 62;
    armResolvedRef.current = false;
    armOutcomeRef.current = win;
    setArmResolving(true);
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    armTimerRef.current = setTimeout(() => resolveArm(win), 5000);
    const video = armVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => resolveArm(win));
    } else {
      resolveArm(win);
    }
  };

  return (
    <div className="space-y-3">
      <div className="parchment rounded-3xl p-4 shadow-xl">
        {activeGame ? (
          <div className="space-y-3.5 py-0.5 text-center">
            <h2 className="font-display text-xl font-black uppercase tracking-wider text-[#3b2412]">
              {GAME_TITLES[activeGame]}
            </h2>

            {/* CAPTAIN'S DICE ON ILLUSTRATED TAVERN TABLE */}
            {activeGame === 'dice' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#a87e3b] shadow-xl aspect-[4/3]">
                  <img
                    src="/assets/cantina/dice_table.webp"
                    alt="Tavern dice tray"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/30" />

                  <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="px-2.5 py-1 rounded-full bg-[#1d120b]/85 border border-[#c8963e]/70 text-[#f8d77d]">
                        {dicePhase === 'ready' ? 'Ready to Roll' : `Your Hand: ${playerDice[0] + playerDice[1]}`}
                      </span>
                      {dicePhase === 'done' && (
                        <span className="px-2.5 py-1 rounded-full bg-[#6e1a13]/90 border border-[#f5c768]/70 text-[#fde6c4]">
                          Barkeep: {barkeepDice[0] + barkeepDice[1]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-6 my-auto">
                      {/* Player 3D Ivory Dice */}
                      <div key={`p-${diceRollKey}`} className="flex gap-3">
                        <Die3D value={playerDice[0]} tone="ivory" rolling={dicePhase !== 'ready'} tilt={-7} />
                        <Die3D value={playerDice[1]} tone="ivory" rolling={dicePhase !== 'ready'} tilt={8} />
                      </div>

                      {/* Barkeep 3D Crimson Dice */}
                      {dicePhase === 'done' && (
                        <div key={`b-${diceRollKey}`} className="flex gap-3">
                          <Die3D value={barkeepDice[0]} tone="crimson" rolling tilt={-5} />
                          <Die3D value={barkeepDice[1]} tone="crimson" rolling tilt={9} />
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] font-bold text-[#f7ecd4]/90 drop-shadow">
                      {dicePhase === 'ready'
                        ? 'Cast the ivory dice onto the felt.'
                        : dicePhase === 'rolled'
                          ? 'You may reroll your lower die once before standing.'
                          : ''}
                    </div>
                  </div>
                </div>

                {dicePhase === 'ready' && (
                  <button onClick={rollMyDice} className="w-full btn-brass py-3.5 rounded-xl font-display font-black uppercase tracking-widest text-sm">
                    Roll Ivory Dice
                  </button>
                )}
                {dicePhase === 'rolled' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={rerollLowDie}
                      disabled={rerolledOnce}
                      className="btn-teal disabled:opacity-40 py-3 rounded-xl font-bold text-xs uppercase tracking-wider"
                    >
                      {rerolledOnce ? 'Reroll Used' : 'Reroll Low Die'}
                    </button>
                    <button
                      onClick={challengeBarkeep}
                      className="btn-brass py-3 rounded-xl font-bold text-xs uppercase tracking-wider"
                    >
                      Hold & Stand
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GOLD DOUBLOON TOSS ON ILLUSTRATED BAR COUNTER */}
            {activeGame === 'coin' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#a87e3b] shadow-xl aspect-[4/3]">
                  <img
                    src="/assets/cantina/coin_table.webp"
                    alt="Candlelit tavern counter"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />

                  <div className="relative z-10 h-full flex flex-col items-center justify-end pb-6 coin-stage">
                    <div key={`toss-${coinFlipKey}`} className={coinFlipping ? 'animate-coin-toss' : ''}>
                      <div
                        className="coin-3d"
                        style={{ transform: `rotateY(${coinRotationY}deg)` }}
                      >
                        <div className="coin-face">
                          <img
                            src="/assets/cantina/coin_sun.webp"
                            alt="Sun Doubloon"
                            className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]"
                            draggable="false"
                          />
                        </div>
                        <div className="coin-face coin-face-back">
                          <img
                            src="/assets/cantina/coin_anchor.webp"
                            alt="Anchor Doubloon"
                            className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]"
                            draggable="false"
                          />
                        </div>
                      </div>
                    </div>
                    <div className={`w-24 h-3.5 mt-1 rounded-full bg-black/65 blur-[4px] ${coinFlipping ? 'animate-coin-shadow' : ''}`} />
                  </div>
                </div>

                {!result && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={() => flipCoin('sun')} disabled={coinFlipping} className="btn-brass disabled:opacity-50 py-3.5 rounded-xl font-display font-black uppercase tracking-wider text-xs">
                      Call Sun
                    </button>
                    <button onClick={() => flipCoin('anchor')} disabled={coinFlipping} className="btn-teal disabled:opacity-50 py-3.5 rounded-xl font-display font-black uppercase tracking-wider text-xs">
                      Call Anchor
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ARM WRESTLING */}
            {activeGame === 'arm' && (
              <div className="space-y-3">
                <div className="w-full relative overflow-hidden rounded-2xl border-2 border-[#a87e3b] shadow-lg bg-[#140d08]">
                  <video
                    ref={armVideoRef}
                    src="/assets/Awrestle.mp4"
                    muted
                    playsInline
                    onEnded={() => { if (armResolving) resolveArm(armOutcomeRef.current === true); }}
                    onError={() => { if (armResolving) resolveArm(armOutcomeRef.current === true); }}
                    className="w-full h-44 object-cover"
                  />
                </div>
                {!result && !armResolving && (
                  <>
                    <p className="text-xs font-bold text-[#5d4229]">Tap SLAM while the brass marker crosses the green zone.</p>
                    <div className="w-full h-7 bg-[#24160e] rounded-full border-2 border-[#9f7637] relative overflow-hidden shadow-inner">
                      <div className="absolute inset-y-0 left-[38%] right-[38%] bg-[#1d909e]/55 border-x border-[#7ee8f5]" />
                      <div className="absolute top-0 bottom-0 w-2 -ml-1 bg-[#fff7dc] shadow-[0_0_12px_white]" style={{ left: `${armPos}%` }} />
                    </div>
                    <button onClick={slamArm} className="w-full btn-crimson py-4 rounded-xl font-display font-black uppercase tracking-[0.25em] text-sm">
                      SLAM!
                    </button>
                  </>
                )}
              </div>
            )}

            {result && (
              <div className="space-y-3 pt-1 anim-rise">
                <p className="text-xs font-semibold text-[#5b4128]">{result.note}</p>
                <p className={`text-base font-black uppercase tracking-wide ${result.win ? 'text-[#12695b]' : 'text-[#9b251c]'}`}>
                  {result.win
                    ? mode === 'gold'
                      ? `You win ${bet} gold!`
                      : 'You win! He leans in with a market tip.'
                    : `You lose your ${bet} gold stake.`}
                </p>
                <button
                  onClick={() => {
                    if (armTimerRef.current) clearTimeout(armTimerRef.current);
                    onPlaySfx('click');
                    setActiveGame(null);
                    setResult(null);
                  }}
                  className="btn-teal px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest"
                >
                  Back to the bar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-[#4b2d15]">
                <IconTankard className="w-6 h-6 text-[#b3741e]" />
                <h2 className="font-display text-xl font-black uppercase tracking-wide">The Salty Spitter</h2>
              </div>
              <p className="text-xs italic text-[#654b32] mt-0.5">"Gold buys the truth, captain. Luck buys it cheaper."</p>
            </div>

            <button
              onClick={onBribe}
              disabled={gold < 50}
              className="w-full btn-brass disabled:opacity-40 py-3.5 rounded-2xl font-display font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2"
            >
              Buy a Trade Tip · <IconCoin className="w-4 h-4" /> 50
            </button>

            <div className="parchment-card rounded-2xl p-3 space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {(['dice', 'coin', 'arm'] as PubGameType[]).map(gId => (
                  <button
                    key={gId}
                    onClick={() => { onPlaySfx('click'); setSelectedGame(gId); }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-colors ${
                      selectedGame === gId
                        ? 'bg-[#2a1a10] text-[#f8d77d] border-[#c8963e]'
                        : 'bg-[#e9d5b0] text-[#4b3520] border-[#bfa065]'
                    }`}
                  >
                    {GAME_TITLES[gId]}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center text-[11px] font-extrabold uppercase text-[#4b3520]">
                <span>Play for</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { onPlaySfx('click'); setMode('gossip'); setBet(10); }}
                    className={`px-3 py-1 rounded-lg border ${mode === 'gossip' ? 'btn-teal' : 'bg-[#e9d5b0] text-[#4b3520] border-[#bfa065]'}`}
                  >
                    Trade Tip
                  </button>
                  <button
                    onClick={() => { onPlaySfx('click'); setMode('gold'); }}
                    className={`px-3 py-1 rounded-lg border ${mode === 'gold' ? 'btn-brass' : 'bg-[#e9d5b0] text-[#4b3520] border-[#bfa065]'}`}
                  >
                    Gold
                  </button>
                </div>
              </div>

              {mode === 'gold' && (
                <div className="flex justify-between items-center text-[11px] font-extrabold uppercase text-[#4b3520] border-t border-[#c8ab73] pt-2.5">
                  <span>Wager</span>
                  <div className="flex gap-1">
                    {[10, 50, 100, 500].map(amt => (
                      <button
                        key={amt}
                        onClick={() => { onPlaySfx('click'); setBet(amt); }}
                        className={`px-2.5 py-1 rounded-lg border ${bet === amt ? 'btn-brass' : 'bg-[#e9d5b0] text-[#4b3520] border-[#bfa065]'}`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={startRound}
                disabled={gold < bet}
                className="w-full btn-teal disabled:opacity-40 py-3 rounded-xl font-display font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                Play {GAME_TITLES[selectedGame]} · <IconCoin className="w-4 h-4" /> {bet}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RUMORS SCROLL */}
      <div className="parchment rounded-3xl p-4 shadow-lg">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#6d4918] border-b border-[#c6a569] pb-2 mb-2.5">
          <IconStar className="w-3.5 h-3.5 text-[#b57414]" /> What You Have Heard
        </div>
        {rumors.length === 0 ? (
          <p className="text-xs italic text-[#654b32]">No rumors yet. Buy a trade tip or win one at the table.</p>
        ) : (
          <div className="space-y-2">
            {rumors.map(r => (
              <div key={r.id} className="parchment-card px-3.5 py-2.5 rounded-xl text-xs text-[#2b1d12] leading-snug anim-rise">
                <span className="italic">"{r.text}"</span>
                <span className="ml-1.5 text-[10px] font-black uppercase text-[#7a5a33]">Day {r.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
