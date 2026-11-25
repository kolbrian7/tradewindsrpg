import React, { useState, useEffect, useRef } from 'react';
import type { Ship, Loot, Port, AimAccuracy, ShotMode, EnemyIntent, RivalDef, Player } from '../game';
import { totalFirepower, fleeChance, boardChance, tributeCost } from '../game';
import { ShipArt } from './ShipArt';
import { IconCannon, IconChain, IconShield, IconSwords, IconSpyglass, IconCoin, IconSkull, IconWind } from './Icons';

export interface BattleData {
  enemy: Ship;
  loot: Loot;
  log: string;
  tone: 'bad' | 'good' | 'info';
  phase: 'player' | 'busy' | 'won' | 'lost' | 'escaped';
  originId: string;
  destId: string;
  days: number;
  intent: EnemyIntent;
  enemyCrippledTurns: number;
  playerBracing: boolean;
  rival?: RivalDef;
}

interface BattleStageProps {
  player: Player;
  flagship: Ship;
  battle: BattleData;
  ports: Port[];
  cannonball: { from: 'player' | 'enemy' } | null;
  shake: 'player' | 'enemy' | null;
  hitEffect: 'player' | 'enemy' | 'splash-enemy' | 'splash-player' | null;
  onAimedShot: (mode: ShotMode, accuracy: AimAccuracy) => void;
  onBrace: () => void;
  onBoard: () => void;
  onFlee: () => void;
  onTribute: () => void;
  onArrive: () => void;
}

const INTENT_LABELS: Record<EnemyIntent, string> = {
  heavy: 'Loading heavy iron!',
  volley: 'Aiming deck swivel!',
  maneuver: 'Closing to broadside range!',
};

export const BattleStage: React.FC<BattleStageProps> = ({
  player,
  flagship,
  battle,
  ports,
  cannonball,
  shake,
  hitEffect,
  onAimedShot,
  onBrace,
  onBoard,
  onFlee,
  onTribute,
  onArrive,
}) => {
  const [aimMode, setAimMode] = useState<ShotMode | null>(null);
  const [aimPos, setAimPos] = useState(50);
  const [showEnemyCargo, setShowEnemyCargo] = useState(false);
  const aimDirRef = useRef(1);

  const hasGunner = player.officers?.includes('gunner');
  const critHalfWidth = hasGunner ? 13 : 9;
  const goodHalfWidth = hasGunner ? 28 : 24;

  // Sweep the brass aiming needle while player is lining up a broadside
  useEffect(() => {
    if (!aimMode || battle.phase !== 'player') return;
    const id = setInterval(() => {
      setAimPos(prev => {
        const next = prev + 4.4 * aimDirRef.current;
        if (next >= 96) { aimDirRef.current = -1; return 96; }
        if (next <= 4) { aimDirRef.current = 1; return 4; }
        return next;
      });
    }, 24);
    return () => clearInterval(id);
  }, [aimMode, battle.phase]);

  const startAim = (mode: ShotMode) => {
    if (battle.phase !== 'player') return;
    aimDirRef.current = 1;
    setAimPos(20);
    setShowEnemyCargo(false);
    setAimMode(mode);
  };

  const triggerFire = () => {
    if (!aimMode || battle.phase !== 'player') return;
    const dist = Math.abs(aimPos - 50);
    const acc: AimAccuracy = dist <= critHalfWidth ? 'crit' : dist <= goodHalfWidth ? 'good' : 'graze';
    const mode = aimMode;
    setAimMode(null);
    onAimedShot(mode, acc);
  };

  const playerHpPct = Math.round((flagship.hullHealth.current / flagship.hullHealth.max) * 100);
  const enemyHpPct = Math.round((battle.enemy.hullHealth.current / battle.enemy.hullHealth.max) * 100);
  const canBoard = enemyHpPct <= 50;
  const tribute = tributeCost(player.gold, battle.enemy);
  const fp = totalFirepower(player);
  const escorts = player.escorts || [];
  const destName = ports.find(p => p.id === battle.destId)?.name || 'port';

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0e202c] anim-fade">
      {/* ILLUSTRATED OCEAN STAGE */}
      <div className="relative h-[53%] min-h-[250px] overflow-hidden shrink-0 border-b-2 border-[#c8963e]/70">
        {/* Golden sunset Mediterranean sky */}
        <div
          className="absolute inset-0"
          style={{
            background: battle.rival
              ? 'linear-gradient(180deg, #2d1b2e 0%, #7d3534 45%, #d68545 80%, #164f63 100%)'
              : 'linear-gradient(180deg, #1b425c 0%, #4b7d94 45%, #e3b978 78%, #155c6e 100%)',
          }}
        />
        {/* Sun & drifting clouds */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-[#ffe39c]/35 blur-md pointer-events-none" />
        <div className="absolute top-4 left-6 opacity-35 animate-cloud-drift pointer-events-none">
          <svg width="110" height="32" viewBox="0 0 110 32" fill="#fff3d6">
            <path d="M12 26h84c5 0 8-4 7-8-1-4-5-6-9-5-3-7-11-11-20-9-5-5-16-4-20 3-6-2-13 1-15 7-7 0-12 5-10 10 1 2 4 2 7 2Z" />
          </svg>
        </div>
        <div className="absolute top-9 right-8 opacity-30 animate-cloud-drift pointer-events-none" style={{ animationDelay: '-9s' }}>
          <svg width="92" height="26" viewBox="0 0 92 26" fill="#fff3d6">
            <path d="M10 22h70c5 0 7-4 5-7-2-3-5-5-9-4-4-6-12-9-19-6-5-4-14-3-17 3-6-1-12 2-13 7-5 0-9 4-7 7Z" />
          </svg>
        </div>

        {/* Distant Mediterranean headland silhouette */}
        <svg viewBox="0 0 440 70" className="absolute bottom-[34%] inset-x-0 w-full h-16 opacity-35 pointer-events-none" preserveAspectRatio="none">
          <path d="M0 70L0 48Q45 28 95 44T210 40Q280 20 345 45T440 42L440 70Z" fill="#183847" />
        </svg>

        {/* Enemy Intent Banner */}
        <div className="absolute top-2.5 inset-x-3 z-20 flex justify-between items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-[#1d120b]/85 border border-[#c8963e]/60 text-[10px] font-bold uppercase tracking-wider text-[#f8d77d] flex items-center gap-1.5">
            {battle.rival ? <><IconSkull className="w-3.5 h-3.5 text-[#f06458]" /> {battle.rival?.id.startsWith('league:') ? 'Corsair League' : 'Syndicate Rival'}</> : 'Pirate Ambush'}
          </span>
          {battle.phase === 'player' && (
            <span className="px-2.5 py-1 rounded-full bg-[#731c17]/90 border border-[#f29b7e]/50 text-[10px] font-bold text-[#fde8d7] shadow">
              {INTENT_LABELS[battle.intent]}
            </span>
          )}
        </div>

        {/* Ocean bands (behind ships) */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-[#176475] to-[#0b3342]" />
        <div className="absolute inset-x-[-24px] bottom-[26%] h-7 rounded-[100%] bg-[#248294]/60 animate-wave-1 pointer-events-none" />

        {/* SHIPS STAGE */}
        <div className="relative z-10 h-full flex items-end justify-between px-3 pb-11">
          {/* Player Side */}
          <div className="flex flex-col items-start relative">
            {/* Escorts rendered slightly behind flagship */}
            {escorts.length > 0 && (
              <div className="absolute -left-2 bottom-7 opacity-85 scale-[0.55] origin-bottom-left">
                <ShipArt tier={escorts[0].tier} variant="player" size="map" facing="right" />
              </div>
            )}
            <div className={`relative ${shake === 'player' ? 'animate-shake' : ''}`}>
              <ShipArt
                tier={flagship.tier}
                variant="player"
                upgrades={flagship.upgrades}
                size="battle"
                facing="right"
                damaged={playerHpPct <= 50}
              />
              {hitEffect === 'player' && <HitBurst />}
              {hitEffect === 'splash-player' && <WaterSplash />}
            </div>
          </div>

          {/* Enemy Side */}
          <div className="flex flex-col items-end relative">
            <div className={`relative ${shake === 'enemy' ? 'animate-shake' : ''}`}>
              <ShipArt
                tier={battle.enemy.tier}
                variant={battle.rival ? (battle.rival.id.startsWith('league:') ? 'league' : 'syndicate') : 'pirate'}
                size="battle"
                facing="left"
                damaged={enemyHpPct <= 50}
              />
              {hitEffect === 'enemy' && <HitBurst />}
              {hitEffect === 'splash-enemy' && <WaterSplash />}
            </div>
          </div>
        </div>

        {/* Foreground ocean swells */}
        <div className="absolute inset-x-[-24px] bottom-2 h-8 rounded-[100%] bg-[#145566]/85 animate-wave-2 pointer-events-none z-20" />
        <div className="absolute inset-x-[-20px] -bottom-3 h-7 rounded-[100%] bg-[#0b3442] pointer-events-none z-20" />

        {/* Flying Cannonball */}
        {cannonball && (
          <div
            className={`absolute w-4 h-4 rounded-full bg-[#241c18] border border-[#f5c156] shadow-[0_0_12px_rgba(245,193,86,0.9)] z-30 ${
              cannonball.from === 'player' ? 'animate-cannonball-right' : 'animate-cannonball-left'
            }`}
          />
        )}

        {/* Ship HUD bars anchored neatly at stage bottom */}
        <div className="absolute bottom-1.5 inset-x-2.5 z-30 grid grid-cols-2 gap-2.5">
          {/* Player Bar */}
          <div className="bg-[#1b110b]/90 border border-[#c8963e]/55 rounded-xl px-2.5 py-1.5 shadow-lg">
            <div className="flex justify-between items-baseline text-[10px] font-extrabold uppercase tracking-wide text-[#f8d77d]">
              <span className="truncate">{flagship.name}</span>
              <span>{flagship.hullHealth.current}/{flagship.hullHealth.max}</span>
            </div>
            <div className="h-1.5 bg-[#0e0906] rounded-full overflow-hidden mt-1">
              <div className="h-full bg-[#26a4b5] transition-all duration-300" style={{ width: `${playerHpPct}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-[#d6c29f] font-semibold mt-0.5">
              <span>{flagship.shipClass} · {fp} guns</span>
              {battle.playerBracing && <span className="text-[#78e0ee] font-bold">Braced</span>}
            </div>
          </div>

          {/* Enemy Bar */}
          <div className="bg-[#1b110b]/90 border border-[#b84a3d]/65 rounded-xl px-2.5 py-1.5 shadow-lg">
            <div className="flex justify-between items-baseline text-[10px] font-extrabold uppercase tracking-wide text-[#f7a89e]">
              <span className="truncate">{battle.rival ? battle.rival.name : battle.enemy.name}</span>
              <span>{battle.enemy.hullHealth.current}/{battle.enemy.hullHealth.max}</span>
            </div>
            <div className="h-1.5 bg-[#0e0906] rounded-full overflow-hidden mt-1">
              <div className="h-full bg-[#c93e32] transition-all duration-300" style={{ width: `${enemyHpPct}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-[#d6c29f] font-semibold mt-0.5">
              <span>{battle.enemy.shipClass} · {battle.enemy.firepower} guns</span>
              {battle.enemyCrippledTurns > 0 && <span className="text-[#f5c768] font-bold">Crippled</span>}
            </div>
          </div>
        </div>
      </div>

      {/* LOWER PARCHMENT COMMAND DECK */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col justify-start gap-2.5 custom-scrollbar bg-[#170f0a]">
        {/* Status Log or Spyglass Hold */}
        <div className="parchment-card rounded-2xl px-4 py-3 text-center">
          {showEnemyCargo ? (
            <div className="space-y-1 anim-rise">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a4b15] block">Through the Spyglass</span>
              <div className="text-lg font-black text-[#2b1d12] flex items-center justify-center gap-1.5">
                <IconCoin className="w-5 h-5" /> {battle.loot.gold.toLocaleString()} Gold
              </div>
              <p className="text-xs font-bold text-[#4f3823]">
                {battle.loot.amount} × {battle.loot.good} in their hold
              </p>
            </div>
          ) : (
            <p key={battle.log} className="text-sm font-bold leading-snug text-[#2b1d12] anim-rise">
              {battle.log}
            </p>
          )}
        </div>

        {/* Victory / Aiming / Tactical Actions */}
        {battle.phase === 'won' ? (
          <button
            onClick={onArrive}
            className="w-full btn-brass py-4 rounded-2xl font-display font-black uppercase tracking-[0.12em] text-sm shadow-xl"
          >
            Sail on to {destName}
          </button>
        ) : aimMode ? (
          <div className="parchment rounded-2xl p-3.5 space-y-3 anim-rise">
            <div className="flex justify-between items-center text-xs font-extrabold uppercase tracking-wider text-[#4b331b]">
              <span>{aimMode === 'heavy' ? 'Aiming Heavy Broadside' : 'Aiming Chain Shot'}</span>
              <button onClick={() => setAimMode(null)} className="text-[11px] underline text-[#7a3122]">Cancel</button>
            </div>
            {/* Brass aiming bar */}
            <div className="relative h-9 rounded-full bg-[#24160e] border-2 border-[#a87e3b] overflow-hidden shadow-inner">
              <div
                className="absolute inset-y-0 bg-[#1c7c88]/45"
                style={{ left: `${50 - goodHalfWidth}%`, width: `${goodHalfWidth * 2}%` }}
              />
              <div
                className="absolute inset-y-0 bg-[#eab64d]/75 border-x border-[#fff0b3]"
                style={{ left: `${50 - critHalfWidth}%`, width: `${critHalfWidth * 2}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-2 -ml-1 bg-[#fff9e2] shadow-[0_0_12px_#fff5c0] rounded-full"
                style={{ left: `${aimPos}%` }}
              />
            </div>
            <button
              onClick={triggerFire}
              className="w-full btn-crimson py-3.5 rounded-xl font-display font-black uppercase tracking-[0.18em] text-sm shadow-lg"
            >
              Fire Broadside!
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => startAim('heavy')}
                disabled={battle.phase !== 'player'}
                className="btn-crimson disabled:opacity-40 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <IconCannon className="w-4 h-4" /> Heavy Shot
              </button>
              <button
                onClick={() => startAim('chain')}
                disabled={battle.phase !== 'player'}
                className="btn-teal disabled:opacity-40 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <IconChain className="w-4 h-4" /> Chain Shot
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onBrace}
                disabled={battle.phase !== 'player'}
                className="parchment-card disabled:opacity-40 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
              >
                <IconShield className="w-4 h-4 text-[#166c78]" /> Brace (+3 Hull)
              </button>
              <button
                onClick={onBoard}
                disabled={battle.phase !== 'player' || !canBoard}
                className="btn-brass disabled:opacity-35 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <IconSwords className="w-4 h-4" />
                {canBoard ? `Board (${Math.round(boardChance(player, battle.enemy, battle.enemyCrippledTurns > 0) * 100)}%)` : 'Board (≤50% HP)'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onFlee}
                disabled={battle.phase !== 'player'}
                className="bg-[#2c1c12] border border-[#967038]/50 text-[#f2e2c2] disabled:opacity-40 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95"
              >
                <IconWind className="w-3.5 h-3.5" /> Flee {Math.round(fleeChance(player, battle.enemy, battle.enemyCrippledTurns > 0) * 100)}%
              </button>
              <button
                onClick={onTribute}
                disabled={battle.phase !== 'player' || player.gold < tribute || Boolean(battle.rival)}
                className="bg-[#2c1c12] border border-[#967038]/50 text-[#f5ca6b] disabled:opacity-35 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95"
              >
                <IconCoin className="w-3.5 h-3.5" /> {battle.rival ? 'No Mercy' : `${tribute}`}
              </button>
              <button
                onClick={() => setShowEnemyCargo(v => !v)}
                className={`py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border active:scale-95 ${
                  showEnemyCargo ? 'btn-brass' : 'bg-[#2c1c12] border-[#967038]/50 text-[#f2e2c2]'
                }`}
              >
                <IconSpyglass className="w-3.5 h-3.5" /> Spyglass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HitBurst: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
    <div className="absolute w-14 h-14 rounded-full bg-orange-600/90 animate-explosion" />
    <div className="absolute w-9 h-9 rounded-full bg-amber-300/95 animate-explosion" style={{ animationDelay: '0.06s' }} />
    <div className="absolute w-2 h-2 rounded-full bg-amber-200 animate-spark" style={{ '--tx': '18px', '--ty': '-16px' } as React.CSSProperties} />
    <div className="absolute w-2 h-2 rounded-full bg-orange-400 animate-spark" style={{ '--tx': '-18px', '--ty': '-10px' } as React.CSSProperties} />
    <div className="absolute w-2 h-2 rounded-full bg-amber-300 animate-spark" style={{ '--tx': '10px', '--ty': '18px' } as React.CSSProperties} />
  </div>
);

const WaterSplash: React.FC = () => (
  <div className="absolute bottom-0 inset-x-0 flex justify-center pointer-events-none z-40">
    <div className="w-10 h-10 rounded-full bg-cyan-100/85 animate-splash" />
  </div>
);
