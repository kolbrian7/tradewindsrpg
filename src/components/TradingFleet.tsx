import React, { useState } from 'react';
import type { GameState, TradeShip, CommodityType } from '../game';
import {
  TRADER_CLASSES, TRADER_UPGRADES, traderClass, traderHold, traderUpgradeCost, traderTripDays, traderBlocked, bestGoods, portTakenBy,
} from '../game';
import { ShipArt } from './ShipArt';
import { CommodityIcon } from './Icons';

/** A row in the Shipyard's fleet list: tap the header to open it. */
export const FleetCard: React.FC<{
  open: boolean; onToggle: () => void; art: React.ReactNode; title: string; sub: string; right?: React.ReactNode; children: React.ReactNode;
}> = ({ open, onToggle, art, title, sub, right, children }) => (
  <div className="parchment rounded-3xl overflow-hidden">
    <button onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
      <div className="w-16 h-12 shrink-0 flex items-center justify-center">{art}</div>
      <div className="min-w-0 flex-1">
        <div className="font-display font-black text-base uppercase text-[#2b1d12] leading-tight truncate">{title}</div>
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7a4b15] truncate">{sub}</div>
      </div>
      {right}
      <span className={`text-[#7a4b15] text-sm transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
    </button>
    {open && <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-[#c9ad77]/60 pt-3">{children}</div>}
  </div>
);

/** One upgrade row, used for the flagship and for trading ships alike. */
export const UpgradeRow: React.FC<{ label: string; description: string; cost: number; owned: boolean; canAfford: boolean; onBuy: () => void; ownedLabel?: string }> =
  ({ label, description, cost, owned, canAfford, onBuy, ownedLabel = 'Fitted' }) => (
    <div className={`parchment-card px-3 py-2.5 rounded-2xl flex justify-between items-center gap-3 ${owned ? 'opacity-65' : ''}`}>
      <div className="min-w-0">
        <h4 className="font-display font-black text-[13px] uppercase text-[#2b1d12]">{label}</h4>
        <p className="text-[11px] text-[#5d4229]">{description}</p>
      </div>
      <button onClick={onBuy} disabled={owned || !canAfford}
        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase ${owned ? 'bg-[#12695b] text-white' : canAfford ? 'btn-brass' : 'bg-[#c9b795] text-[#6d5c43]'}`}>
        {owned ? ownedLabel : cost.toLocaleString()}
      </button>
    </div>
  );

const dailyOf = (g: GameState, t: TradeShip) => {
  const trip = traderTripDays(g, t);
  if (!trip || !t.fromId || !t.toId || traderBlocked(g.player, t)) return 0;
  return Math.max(0, Math.round(bestGoods(g, t, t.fromId, t.toId)[0].profit / trip));
};

/** A trading ship's card: what she earns, her route, and the same four upgrades as the flagship. */
export const TraderCard: React.FC<{
  g: GameState; ship: TradeShip; open: boolean; onToggle: () => void;
  onRoute: (id: string, fromId: string, toId: string, good: CommodityType) => void;
  onUpgrade: (id: string, upgradeId: string) => void;
}> = ({ g, ship: t, open, onToggle, onRoute, onUpgrade }) => {
  const { player, ports } = g;
  const [routing, setRouting] = useState(false);
  const freeHome = (id: string) => !portTakenBy(player, id, t.id);
  const firstFree = () => t.fromId || (freeHome(player.currentPortId) ? player.currentPortId : ports.find(p => freeHome(p.id))?.id || player.currentPortId);
  const [fromId, setFromId] = useState<string>(firstFree);
  const [toId, setToId] = useState<string | null>(t.toId);
  const name = (id: string | null) => ports.find(p => p.id === id)?.name || '—';
  const daily = dailyOf(g, t);
  const blocked = traderBlocked(player, t);
  const cls = traderClass(t);
  const next = TRADER_CLASSES.find(c => c.tier === t.tier + 1);
  return (
    <FleetCard
      open={open} onToggle={onToggle}
      art={<div style={{ zoom: 0.8 }}><ShipArt tier={t.tier} variant="player" size="map" facing="right" /></div>}
      title={t.name}
      sub={blocked ? 'Blockaded by the League' : !t.toId ? 'No route' : `${name(t.fromId)} → ${name(t.toId)}`}
      right={<span className={`text-xs font-black ${daily > 0 ? 'text-[#146c54]' : 'text-[#9b251c]'}`}>{daily > 0 ? `+${daily.toLocaleString()}/day` : 'idle'}</span>}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#2b1d12] flex items-center gap-1.5 min-w-0">
          {t.good && <CommodityIcon good={t.good} className="w-5 h-5 shrink-0" />}
          <span className="truncate">{cls.shipClass} · hold {traderHold(t)}{t.good ? ` · carrying ${t.good}` : ''}</span>
        </span>
        <button onClick={() => { setFromId(firstFree()); setToId(t.toId); setRouting(true); }} className="btn-teal px-3 py-2 rounded-xl text-[10px] font-black uppercase shrink-0">Change Route</button>
      </div>
      <p className="text-[11px] text-[#5d4229]">{next ? `Fit all four to rebuild her as a ${next.shipClass}.` : 'A Galleon: the finest class there is.'}</p>
      {TRADER_UPGRADES.map(u => (
        <UpgradeRow key={u.id} label={u.label} description={u.description} cost={traderUpgradeCost(t)}
          owned={(t.upgrades || []).includes(u.id)} canAfford={player.gold >= traderUpgradeCost(t)} onBuy={() => onUpgrade(t.id, u.id)} />
      ))}

      {routing && (
        <div className="fixed inset-0 bg-[#0c161f]/85 z-50 flex items-center justify-center p-4" onClick={() => setRouting(false)}>
          <div className="parchment p-4 rounded-3xl w-full max-w-sm space-y-3 max-h-[92%] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-black uppercase text-[#8a4d09] text-center">Route for {t.name}</h2>
            {(['Buys in', 'Sells in'] as const).map((label, k) => (
              <div key={label}>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#7d4f0a] mb-1">{label}</div>
                <div className="grid grid-cols-3 gap-1">
                  {ports.map(p => {
                    const on = (k === 0 ? fromId : toId) === p.id;
                    const taken = k === 0 ? portTakenBy(player, p.id, t.id) : null;      // another of your ships already loads here
                    const off = (k === 1 && p.id === fromId) || !!taken;
                    return (
                      <button key={p.id} disabled={off} onClick={() => { if (k === 0) { setFromId(p.id); if (toId === p.id) setToId(null); } else setToId(p.id); }}
                        className={`rounded-lg py-1.5 text-[10px] font-black uppercase border ${on ? 'bg-[#16626d] text-white border-[#16626d]' : 'bg-white/50 text-[#2b1d12] border-[#b9975a]'} disabled:opacity-30`}>
                        {p.name}
                        {taken && <span className="block text-[7px] normal-case font-bold leading-none">{taken}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {toId && (() => {
              const top = bestGoods(g, t, fromId, toId)[0];
              const trip = traderTripDays(g, { ...t, fromId, toId });
              return (
                <button disabled={top.profit <= 0} onClick={() => { onRoute(t.id, fromId, toId, top.good); setRouting(false); }}
                  className="w-full btn-brass py-3 rounded-xl font-display font-black uppercase tracking-wider text-xs disabled:opacity-40">
                  {top.profit > 0 ? `Sail it: +${Math.round(top.profit / trip).toLocaleString()} gold a day` : 'Nothing pays on this route'}
                </button>
              );
            })()}
            <button onClick={() => setRouting(false)} className="w-full btn-teal py-2.5 rounded-xl font-display font-black uppercase tracking-wider text-xs">Close</button>
          </div>
        </div>
      )}
    </FleetCard>
  );
};
