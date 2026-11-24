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

const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

const DieFace: React.FC<{ value: number; tone?: 'ivory' | 'crimson'; rolling?: boolean }> = ({
  value,
  tone = 'ivory',
  rolling = false,
}) => {
  const pips = PIP_POSITIONS[value] || PIP_POSITIONS[1];
  const bg = tone === 'ivory' ? '#fdf6e4' : '#7b221b';
  const pipColor = tone === 'ivory' ? '#2b1d12' : '#fbe3a4';
  const border = tone === 'ivory' ? '#b89452' : '#d6a246';

  return (
    <div className={`w-14 h-14 ${rolling ? 'animate-dice-tumble' : ''}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]">
        <rect x="6" y="6" width="88" height="88" rx="18" fill={bg} stroke={border} strokeWidth="5" />
        {pips.map(([cx, cy], idx) => (
          <circle key={idx} cx={cx} cy={cy} r="8.5" fill={pipColor} />
        ))}
      </svg>
    </div>
  );
};

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

  // Dice state (2 dice + 1 optional tactical reroll of lower die)
  const [dicePhase, setDicePhase] = useState<'ready' | 'rolled' | 'done'>('ready');
  const [playerDice, setPlayerDice] = useState<[number, number]>([3, 4]);
  const [barkeepDice, setBarkeepDice] = useState<[number, number]>([3, 3]);
  const [diceRollKey, setDiceRollKey] = useState(0);
  const [rerolledOnce, setRerolledOnce] = useState(false);

  // Coin toss state
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState<'sun' | 'anchor'>('sun');

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

  // Arm wrestling bar sweep
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

  // Arm wrestling video rocking loop
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
    const a = d6();
    const b = d6();
    setPlayerDice([a, b]);
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
    const win = pSum > bSum;
    conclude(win, `You rolled ${pSum} vs the barkeep's ${bSum}.`);
  };

  // --- COIN TOSS LOGIC ---
  const flipCoin = (pickSide: 'sun' | 'anchor') => {
    if (coinFlipping) return;
    onPlaySfx('click');
    setCoinFlipping(true);
    const landed: 'sun' | 'anchor' = Math.random() < 0.5 ? 'sun' : 'anchor';
    setTimeout(() => {
      setCoinSide(landed);
      setCoinFlipping(false);
      conclude(pickSide === landed, `The doubloon lands on ${landed === 'sun' ? 'Sun' : 'Anchor'}.`);
    }, 950);
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
          <div className="space-y-4 py-1 text-center">
            <h2 className="font-display text-xl font-black uppercase tracking-wider text-[#3b2412]">
              {GAME_TITLES[activeGame]}
            </h2>

            {/* CAPTAIN'S DICE */}
            {activeGame === 'dice' && (
              <div className="space-y-4">
                <div className="bg-[#1b4032] border-2 border-[#8c6429] rounded-2xl p-4 shadow-inner space-y-3">
                  <div className="flex justify-around items-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#f5d583]">Your Hand</span>
                      <div key={`p-${diceRollKey}`} className="flex gap-2">
                        <DieFace value={playerDice[0]} tone="ivory" rolling={dicePhase !== 'ready'} />
                        <DieFace value={playerDice[1]} tone="ivory" rolling={dicePhase !== 'ready'} />
                      </div>
                      {dicePhase !== 'ready' && (
                        <span className="text-xs font-extrabold text-[#f7ecd4]">Total: {playerDice[0] + playerDice[1]}</span>
                      )}
                    </div>
                    {dicePhase === 'done' && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#f4b0a5]">Barkeep</span>
                        <div key={`b-${diceRollKey}`} className="flex gap-2">
                          <DieFace value={barkeepDice[0]} tone="crimson" rolling />
                          <DieFace value={barkeepDice[1]} tone="crimson" rolling />
                        </div>
                        <span className="text-xs font-extrabold text-[#f7ecd4]">Total: {barkeepDice[0] + barkeepDice[1]}</span>
                      </div>
                    )}
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

            {/* GOLD DOUBLOON TOSS */}
            {activeGame === 'coin' && (
              <div className="space-y-4">
                <div className="bg-[#2a1a10] border-2 border-[#a87e3b] rounded-2xl py-6 flex flex-col items-center justify-center shadow-inner">
                  <div className={coinFlipping ? 'animate-coin-flip' : ''}>
                    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]">
                      <circle cx="50" cy="50" r="44" fill="#d99a26" stroke="#7c4e0a" strokeWidth="4" />
                      <circle cx="50" cy="50" r="35" fill="#f7cf64" stroke="#b57614" strokeWidth="2.5" />
                      {coinSide === 'sun' ? (
                        <g fill="#7c4e0a">
                          <circle cx="50" cy="50" r="12" />
                          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                            <rect key={deg} x="48" y="21" width="4" height="10" rx="2" transform={`rotate(${deg} 50 50)`} />
                          ))}
                        </g>
                      ) : (
                        <g stroke="#7c4e0a" strokeWidth="4.5" strokeLinecap="round" fill="none">
                          <circle cx="50" cy="31" r="5" />
                          <path d="M50 36v32M39 45h22M35 58a15 15 0 0 0 30 0" />
                        </g>
                      )}
                    </svg>
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
              {/* Game Picker Tabs */}
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

              {/* Stakes & Reward Mode */}
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
