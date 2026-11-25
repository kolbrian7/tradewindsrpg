import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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

// Degrees of [rotateX, rotateY] that bring each face of the cube to the front
const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  2: [-90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [90, 0],
  6: [180, 0],
};

// The die rests slightly turned so its top and side show, like a real cube on the felt.
const diePose = (x: number, y: number, z: number) =>
  `rotateX(-24deg) rotateY(-26deg) rotateZ(${z}deg) rotateX(${x}deg) rotateY(${y}deg)`;

const ROLL_MS = 1150;
const COIN_MS = 1500;

const CUBE_FACES: Array<{ val: number; transform: string }> = [
  { val: 1, transform: 'translateZ(26px)' },
  { val: 6, transform: 'rotateY(180deg) translateZ(26px)' },
  { val: 3, transform: 'rotateY(90deg) translateZ(26px)' },
  { val: 4, transform: 'rotateY(-90deg) translateZ(26px)' },
  { val: 2, transform: 'rotateX(90deg) translateZ(26px)' },
  { val: 5, transform: 'rotateX(-90deg) translateZ(26px)' },
];

interface DieProps {
  value: number;
  tone?: 'ivory' | 'crimson';
  rollKey: number; // changes each time this die is thrown; 0 means it has not been thrown yet
  tilt?: number;
  delay?: number;
  from?: 1 | -1; // which side it is thrown in from
}

/** One die. When rollKey changes it is thrown in, tumbles, bounces twice and settles on `value`. */
const Die3D: React.FC<DieProps> = ({ value, tone = 'ivory', rollKey, tilt = 0, delay = 0, from = -1 }) => {
  const moverRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const [fx, fy] = FACE_ROT[value] || FACE_ROT[1];

  useLayoutEffect(() => {
    const mover = moverRef.current;
    const cube = cubeRef.current;
    const shadow = shadowRef.current;
    if (!rollKey || !mover || !cube || !shadow || !cube.animate) return;
    const turns = (n: number) => 360 * n * (Math.random() < 0.5 ? 1 : -1);
    const timing = { duration: ROLL_MS, delay, fill: 'backwards' as const };
    const running = [
      // The tumble: several full turns on two axes, slowing into the final face.
      cube.animate(
        [
          { transform: diePose(fx + turns(2), fy + turns(2), tilt + turns(1)) },
          { transform: diePose(fx, fy, tilt) },
        ],
        { ...timing, easing: 'cubic-bezier(0.15, 0.6, 0.25, 1)' },
      ),
      // The throw: falls in from the side, then two smaller bounces.
      mover.animate(
        [
          { transform: `translate(${from * 95}px, -120px) scale(1.25)`, opacity: 0, easing: 'ease-in' },
          { opacity: 1, offset: 0.1 },
          { transform: `translate(${from * 16}px, 0px) scale(1)`, offset: 0.4, easing: 'ease-out' },
          { transform: `translate(${from * 7}px, -30px) scale(1.06)`, offset: 0.56, easing: 'ease-in' },
          { transform: `translate(${from * 2}px, 0px) scale(1)`, offset: 0.72, easing: 'ease-out' },
          { transform: 'translate(0px, -9px) scale(1.02)', offset: 0.83, easing: 'ease-in' },
          { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        ],
        timing,
      ),
      shadow.animate(
        [
          { transform: `translateX(${from * 95}px) scale(0.3)`, opacity: 0 },
          { transform: `translateX(${from * 16}px) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: `translateX(${from * 7}px) scale(0.7)`, opacity: 0.6, offset: 0.56 },
          { transform: `translateX(${from * 2}px) scale(1)`, opacity: 1, offset: 0.72 },
          { transform: 'translateX(0px) scale(0.9)', opacity: 0.85, offset: 0.83 },
          { transform: 'translateX(0px) scale(1)', opacity: 1 },
        ],
        timing,
      ),
    ];
    return () => running.forEach(a => a.cancel());
  }, [rollKey]);

  return (
    <div className="flex flex-col items-center" style={{ zoom: 0.74 }}>
      <div ref={moverRef} className="dice-scene">
        <div
          ref={cubeRef}
          className={`dice-cube ${tone === 'ivory' ? 'dice-ivory' : 'dice-crimson'}`}
          style={{ transform: diePose(fx, fy, tilt) }}
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
      <div ref={shadowRef} className="w-14 h-3 mt-1.5 rounded-full bg-black/60 blur-[4px] pointer-events-none" />
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

  // Dice state
  const [dicePhase, setDicePhase] = useState<'ready' | 'rolling' | 'rolled' | 'barkeep' | 'done'>('ready');
  const [playerDice, setPlayerDice] = useState<[number, number]>([3, 4]);
  const [barkeepDice, setBarkeepDice] = useState<[number, number]>([3, 3]);
  const [dieKeys, setDieKeys] = useState<[number, number]>([0, 0]);
  const [rerolledOnce, setRerolledOnce] = useState(false);
  const rollCount = useRef(0);

  // Coin toss state
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState<'sun' | 'anchor'>('sun');
  const coinRef = useRef<HTMLDivElement | null>(null);
  const coinMoverRef = useRef<HTMLDivElement | null>(null);
  const coinShadowRef = useRef<HTMLDivElement | null>(null);

  // Timers that wait for a throw to finish before showing the outcome
  const waits = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = (ms: number, fn: () => void) => { waits.current.push(setTimeout(fn, ms)); };
  const clearWaits = () => { waits.current.forEach(clearTimeout); waits.current = []; };
  useEffect(() => clearWaits, []);

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
    setDieKeys([0, 0]);
    clearWaits();
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
    setPlayerDice([d6(), d6()]);
    setDieKeys([++rollCount.current, ++rollCount.current]);
    setDicePhase('rolling');
    after(ROLL_MS + 200, () => setDicePhase('rolled'));
  };

  const rerollLowDie = () => {
    if (rerolledOnce || dicePhase !== 'rolled') return;
    onPlaySfx('click');
    setRerolledOnce(true);
    const low = playerDice[0] <= playerDice[1] ? 0 : 1;
    const next: [number, number] = [playerDice[0], playerDice[1]];
    next[low] = d6();
    setPlayerDice(next);
    setDieKeys(keys => (low === 0 ? [++rollCount.current, keys[1]] : [keys[0], ++rollCount.current]));
    setDicePhase('rolling');
    after(ROLL_MS + 100, () => setDicePhase('rolled'));
  };

  const challengeBarkeep = () => {
    if (dicePhase !== 'rolled') return;
    onPlaySfx('click');
    const ba = d6();
    const bb = d6();
    setBarkeepDice([ba, bb]);
    setDicePhase('barkeep');
    const pSum = playerDice[0] + playerDice[1];
    const bSum = ba + bb;
    // Wait for his dice to settle before calling the result.
    after(ROLL_MS + 350, () => {
      setDicePhase('done');
      conclude(pSum > bSum, `You rolled ${pSum} vs the barkeep's ${bSum}.`);
    });
  };

  // --- COIN TOSS LOGIC ---
  const flipCoin = (pickSide: 'sun' | 'anchor') => {
    if (coinFlipping) return;
    onPlaySfx('coin');
    setCoinFlipping(true);
    const landed: 'sun' | 'anchor' = Math.random() < 0.5 ? 'sun' : 'anchor';
    const from = coinSide === 'sun' ? 0 : 180;
    const to = 360 * 6 + (landed === 'sun' ? 0 : 180);
    // End over end: spins fast on the way up, slows as it drops back to the counter.
    coinRef.current?.animate?.(
      [{ transform: `rotateX(${from}deg)` }, { transform: `rotateX(${to}deg)` }],
      { duration: COIN_MS, easing: 'cubic-bezier(0.2, 0.3, 0.3, 1)' },
    );
    coinMoverRef.current?.animate?.(
      [
        { transform: 'translateY(0px) scale(1)', easing: 'cubic-bezier(0.15, 0.6, 0.4, 1)' },
        { transform: 'translateY(-84px) scale(1.14)', offset: 0.45, easing: 'cubic-bezier(0.6, 0, 0.85, 0.45)' },
        { transform: 'translateY(0px) scale(1)', offset: 0.8, easing: 'ease-out' },
        { transform: 'translateY(-13px) scale(1.03)', offset: 0.9, easing: 'ease-in' },
        { transform: 'translateY(0px) scale(1)' },
      ],
      { duration: COIN_MS },
    );
    coinShadowRef.current?.animate?.(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.4)', opacity: 0.3, offset: 0.45 },
        { transform: 'scale(1)', opacity: 1, offset: 0.8 },
        { transform: 'scale(0.9)', opacity: 0.85, offset: 0.9 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: COIN_MS },
    );
    setCoinSide(landed);
    after(COIN_MS + 150, () => {
      setCoinFlipping(false);
      conclude(pickSide === landed, `The doubloon lands on ${landed === 'sun' ? 'Sun' : 'Anchor'}.`);
    });
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
                <p className="text-[12px] font-semibold leading-snug text-center text-[#4d3722] px-2">
                  Roll two dice and beat the barkeep's total. You may reroll your lower die once. A tie goes to the house.
                </p>
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#a87e3b] shadow-xl aspect-[5/6] -mx-2">
                  {/* the tray is zoomed in so the felt is big enough to hold all four dice */}
                  <img
                    src="/assets/cantina/dice_table.webp"
                    alt="Tavern dice tray"
                    className="absolute inset-0 w-full h-full object-cover scale-[1.5] origin-[48%_47%]"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/30" />

                  <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="px-2.5 py-1 rounded-full bg-[#1d120b]/85 border border-[#c8963e]/70 text-[#f8d77d]">
                        {dicePhase === 'ready' ? 'Ready to Roll' : dicePhase === 'rolling' ? 'Rolling…' : `Your Hand: ${playerDice[0] + playerDice[1]}`}
                      </span>
                      {dicePhase === 'done' && (
                        <span className="px-2.5 py-1 rounded-full bg-[#6e1a13]/90 border border-[#f5c768]/70 text-[#fde6c4]">
                          Barkeep: {barkeepDice[0] + barkeepDice[1]}
                        </span>
                      )}
                    </div>

                    {/* Dice sit dead centre of the felt. When the barkeep throws, his pair lands above yours and
                        yours slides down, so the four together stay centred. */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative">
                        {(dicePhase === 'barkeep' || dicePhase === 'done') && (
                          <div className="absolute left-1/2 bottom-full mb-5 flex gap-3" style={{ transform: 'translate(-50%, 34px)' }}>
                            <Die3D value={barkeepDice[0]} tone="crimson" rollKey={1} tilt={-5} from={1} />
                            <Die3D value={barkeepDice[1]} tone="crimson" rollKey={1} tilt={9} from={1} delay={90} />
                          </div>
                        )}
                        <div
                          className="flex gap-3 transition-transform duration-300"
                          style={{ transform: dicePhase === 'barkeep' || dicePhase === 'done' ? 'translateY(34px)' : 'none' }}
                        >
                          <Die3D value={playerDice[0]} tone="ivory" rollKey={dieKeys[0]} tilt={-7} from={-1} />
                          <Die3D value={playerDice[1]} tone="ivory" rollKey={dieKeys[1]} tilt={8} from={-1} delay={90} />
                        </div>
                      </div>
                    </div>
                    <div className="my-auto" />

                    <div className="text-[10px] font-bold text-[#f7ecd4]/90 drop-shadow">
                      {dicePhase === 'ready'
                        ? 'Cast the ivory dice onto the felt.'
                        : dicePhase === 'rolled'
                          ? rerolledOnce ? 'Stand on this hand.' : 'You may reroll your lower die once before standing.'
                          : dicePhase === 'barkeep' ? 'The barkeep throws…' : ''}
                    </div>
                  </div>
                </div>

                {dicePhase === 'ready' && (
                  <button onClick={rollMyDice} className="w-full btn-brass py-3.5 rounded-xl font-display font-black uppercase tracking-widest text-sm">
                    Roll Ivory Dice
                  </button>
                )}
                {(dicePhase === 'rolled' || dicePhase === 'rolling') && (
                  <div className={`grid grid-cols-2 gap-2 ${dicePhase === 'rolling' ? 'opacity-40 pointer-events-none' : ''}`}>
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
                    <div ref={coinMoverRef}>
                      <div ref={coinRef} className="coin-3d" style={{ transform: `rotateX(${coinSide === 'sun' ? 0 : 180}deg)` }}>
                        {[-3, -1.5, 0, 1.5, 3].map(z => (
                          <div key={z} className="coin-rim" style={{ transform: `translateZ(${z}px)` }} />
                        ))}
                        <div className="coin-face coin-face-front">
                          <img src="/assets/cantina/coin_sun.webp" alt="Sun" className="w-full h-full object-contain" draggable="false" />
                        </div>
                        <div className="coin-face coin-face-back">
                          <img src="/assets/cantina/coin_anchor.webp" alt="Anchor" className="w-full h-full object-contain" draggable="false" />
                        </div>
                      </div>
                    </div>
                    <div ref={coinShadowRef} className="w-24 h-3.5 mt-1 rounded-full bg-black/65 blur-[4px]" />
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
