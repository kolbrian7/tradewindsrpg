import React, { useState } from 'react';
import type { GameState, RivalDef } from '../game';
import { SYNDICATE_RIVALS, PORT_TRADE, reputationTier, netWorth, voyageDays, ownsPort, portPrice, portDailyIncome, portIncomeDue } from '../game';
import { CommodityIcon, IconCoin, IconLedger, IconScroll, IconSkull, IconStar } from './Icons';

interface LedgerModalProps {
  g: GameState;
  onClose: () => void;
  onAcceptContract: (id: string) => void;
  onClaimContract: (id: string) => void;
  onHuntRival: (rival: RivalDef) => void;
}

export const LedgerModal: React.FC<LedgerModalProps> = ({
  g,
  onClose,
  onAcceptContract,
  onClaimContract,
  onHuntRival,
}) => {
  const [sub, setSub] = useState<'contracts' | 'syndicate' | 'ports'>('contracts');
  const { player, ports, events, portContracts } = g;
  const worth = netWorth(player);
  const localOffers = portContracts[player.currentPortId] || [];
  const portName = (id: string) => ports.find(p => p.id === id)?.name || id;
  // Days you get once you sign: the sailing time plus eight to spare (the clock starts on signing).
  const offerDays = (c: { fromPortId: string; toPortId: string }) => {
    const from = ports.find(p => p.id === c.fromPortId), to = ports.find(p => p.id === c.toPortId);
    return (from && to ? voyageDays(from, to, false) : 6) + 8;
  };

  return (
    <div className="absolute inset-0 bg-[#0c161f]/85 z-50 flex items-center justify-center p-4 anim-fade" onClick={onClose}>
      <div
        className="parchment rounded-3xl w-full max-w-sm max-h-[84dvh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="wood-bar px-4 py-3 flex items-center justify-between border-b border-[#c8963e]/60 shrink-0">
          <div className="flex items-center gap-2 text-[#f8d77d]">
            <IconLedger className="w-5 h-5" />
            <h2 className="font-display text-base font-black uppercase tracking-wider">Captain's Ledger</h2>
          </div>
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-[#f3dfb8] px-2.5 py-1 rounded-lg bg-[#3c2415]">
            Close
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-2.5 border-b border-[#c6a569] shrink-0 bg-[#ead5ad]">
          {(['contracts', 'syndicate', 'ports'] as const).map(k => (
            <button
              key={k}
              onClick={() => setSub(k)}
              className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border ${
                sub === k ? 'bg-[#2a1a10] text-[#f8d77d] border-[#c8963e]' : 'bg-[#f6ead0] text-[#4b3520] border-[#bfa065]'
              }`}
            >
              {k === 'contracts' ? `Contracts (${player.contracts.length})` : k === 'syndicate' ? 'Syndicate' : 'Ports'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
          {/* CONTRACTS TAB */}
          {sub === 'contracts' && (
            <>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#6d4918] mb-2">
                  Active Charters ({player.contracts.length}/2)
                </h3>
                {player.contracts.length === 0 ? (
                  <p className="text-xs italic text-[#654b32]">No active charters. Accept one below to earn bonus gold & port favor.</p>
                ) : (
                  <div className="space-y-2">
                    {player.contracts.map(c => {
                      const ready = c.toPortId === player.currentPortId && (player.cargo[c.good] || 0) >= c.amount;
                      const have = player.cargo[c.good] || 0;
                      return (
                        <div key={c.id} className="parchment-card rounded-2xl p-3 space-y-2">
                          <div className="flex items-center gap-2.5">
                            <CommodityIcon good={c.good} className="w-9 h-9" />
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-sm text-[#2b1d12]">
                                Deliver {c.amount} {c.good} → {portName(c.toPortId)}
                              </div>
                              <div className="text-[11px] font-semibold text-[#654b32]">
                                In hold: {have}/{c.amount} · Due Day {c.deadlineDay} · +{c.repGain} rep
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#7d4f0a] flex items-center gap-1">
                              <IconCoin className="w-4 h-4" /> {c.rewardGold.toLocaleString()}
                            </span>
                            {ready ? (
                              <button onClick={() => onClaimContract(c.id)} className="btn-brass px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase">
                                Deliver & Claim
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-[#7a5f3b]">
                                {c.toPortId === player.currentPortId ? 'Need cargo' : `Sail to ${portName(c.toPortId)}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-[#c6a569] pt-3">
                <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#6d4918] mb-2">
                  Harbor Offers in {portName(player.currentPortId)}
                </h3>
                {localOffers.length === 0 ? (
                  <p className="text-xs italic text-[#654b32]">No more charters posted today. Sail to refresh offers.</p>
                ) : (
                  <div className="space-y-2">
                    {localOffers.map(c => (
                      <div key={c.id} className="parchment-card rounded-2xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CommodityIcon good={c.good} className="w-9 h-9" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs text-[#2b1d12]">
                              {c.amount} {c.good} to {portName(c.toPortId)}
                            </div>
                            <div className="text-[11px] font-bold text-[#7d4f0a] flex items-center gap-1 mt-0.5">
                              <IconCoin className="w-3.5 h-3.5" /> {c.rewardGold.toLocaleString()} · +{c.repGain} rep · {offerDays(c)} days to deliver
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onAcceptContract(c.id)}
                          disabled={player.contracts.length >= 2}
                          className="btn-teal disabled:opacity-40 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase shrink-0"
                        >
                          <IconScroll className="w-3.5 h-3.5 inline mr-1" />Accept
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* SYNDICATE TAB */}
          {sub === 'syndicate' && (
            <div className="space-y-2.5">
              <p className="text-xs text-[#5d4229]">
                Defeat all four Syndicate captains and amass 50,000 gold to reclaim your family honor. You need both.
              </p>
              {SYNDICATE_RIVALS.map(r => {
                const defeated = player.defeatedRivals.includes(r.id);
                const unlocked = worth >= r.minWorth;
                return (
                  <div key={r.id} className={`parchment-card rounded-2xl p-3 space-y-1.5 ${defeated ? 'opacity-65' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-display font-black text-sm text-[#2b1d12] flex items-center gap-1.5">
                          <IconSkull className="w-4 h-4 text-[#9b251c]" /> {r.name}
                        </div>
                        <div className="text-[11px] font-bold text-[#654b32]">
                          {r.shipName} ({r.shipClass} · {r.hull} HP)
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#7d4f0a] flex items-center gap-1">
                        <IconCoin className="w-3.5 h-3.5" /> {r.bounty.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] italic text-[#5d4229]">"{r.taunt}"</p>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-bold uppercase text-[#6d4918]">
                        {defeated ? 'Defeated' : unlocked ? 'Ready to Engage' : `Unlocks at ${r.minWorth.toLocaleString()} worth`}
                      </span>
                      {!defeated && unlocked && (
                        <button onClick={() => onHuntRival(r)} className="btn-crimson px-3 py-1.5 rounded-xl text-[11px] font-black uppercase">
                          Hunt Rival
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PORTS DIRECTORY TAB */}
          {sub === 'ports' && (
            <div className="space-y-2">
              {ports.map(p => {
                const t = PORT_TRADE[p.id];
                const rep = reputationTier(player.reputation?.[p.id] || 0);
                const activeRumors = events.filter(e => e.known && e.portId === p.id);
                return (
                  <div key={p.id} className="parchment-card rounded-2xl p-3 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-display font-black text-sm text-[#2b1d12]">{p.name}</span>
                      <span className="text-[10px] font-extrabold uppercase text-[#146572]">
                        {rep.label} ({player.reputation?.[p.id] || 0})
                      </span>
                    </div>
                    {player.hasWonGame && (
                      <div className="text-[11px] font-bold text-[#7d4f0a]">
                        {ownsPort(player, p.id)
                          ? `⚑ Yours · ${portDailyIncome(p.id).toLocaleString()} gold a day · ${portIncomeDue(player, p.id).toLocaleString()} waiting`
                          : `For sale: ${portPrice(p.id).toLocaleString()} gold, Patron standing needed`}
                      </div>
                    )}
                    {t && (
                      <div className="text-[11px] leading-snug text-[#4d3722]">
                        <div><strong className="text-[#146c54]">Cheap:</strong> {t.makes.join(', ')}</div>
                        <div><strong className="text-[#96590f]">Pays well:</strong> {t.wants.join(', ')}</div>
                      </div>
                    )}
                    {activeRumors.map(e => (
                      <div key={e.id} className="text-[11px] font-bold text-[#146572] flex items-center gap-1">
                        <IconStar className="w-3 h-3 shrink-0" />
                        {e.mult > 1 ? `Short of ${e.good} (${e.daysLeft}d)` : `Glut of ${e.good} (${e.daysLeft}d)`}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
