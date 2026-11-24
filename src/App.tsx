import React, { useState, useEffect, useRef } from 'react';
import { PrologueStoryboard } from './components/PrologueStoryboard';
import { AnimatedMarker } from './components/AnimatedMarker';
import { ShipArt } from './components/ShipArt';
import { BattleStage } from './components/BattleStage';
import type { BattleData } from './components/BattleStage';
import { CantinaGames } from './components/CantinaGames';
import type { PubGameType } from './components/CantinaGames';
import { LedgerModal } from './components/LedgerModal';
import { VoyageEventModal } from './components/VoyageEventModal';
import {
  CommodityIcon, IconAnchor, IconScales, IconHammer, IconTankard, IconCompass,
  IconLedger, IconCoin, IconMenu, IconSound, IconScroll, IconStar, IconSkull,
  IconChevronLeft, IconChevronRight, IconWind,
} from './components/Icons';
import { audioManager } from './engine/AudioManager';
import {
  GOAL, COMMODITIES, BASE_PRICES, PORT_TRADE, SHIP_CLASSES, REPAIR_COST_PER_POINT,
  OFFICERS, ESCORTS, SYNDICATE_RIVALS,
  loadGame, saveGame, clearSave, buyGoods, sellGoods, buyPrice, sellPrice, cargoCount, netWorth, rankFor,
  advanceDays, learnRumor, voyageDays, rollAmbush, rollWeather, routeTip, tradeRole, emptyCargo, pickMinigame,
  computeSeaRoute, pointAlongRoute, routeToSmoothPath, totalCargoCapacity, totalFirepower, effectiveSpeed, reputationTier,
  acceptContract, claimContract, rollSeaEvent,
  getUpgradesForTier, applyUpgrade, generateEnemy, generateLoot, generateRivalEnemy,
  rollAimedShot, rollShot, rollFlee, rollBoard, tributeCost, pickEnemyIntent,
} from './game';
import type {
  GameState, Port, Building, Ship, CommodityType, OfficerId, EscortDef,
  RivalDef, SeaEventDef, WeatherType, AimAccuracy, ShotMode, Point,
} from './game';

type Tab = 'port' | 'market' | 'ship' | 'cantina' | 'map' | 'battle';

const NAV: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  { tab: 'port',    label: 'Port',     icon: <IconAnchor className="w-5 h-5" /> },
  { tab: 'market',  label: 'Market',   icon: <IconScales className="w-5 h-5" /> },
  { tab: 'ship',    label: 'Shipyard', icon: <IconHammer className="w-5 h-5" /> },
  { tab: 'cantina', label: 'Cantina',  icon: <IconTankard className="w-5 h-5" /> },
  { tab: 'map',     label: 'Set Sail', icon: <IconCompass className="w-5 h-5" /> },
];

const DANGER_TEXT = ['Calm waters', 'Calm waters', 'Pirate waters', 'Dangerous waters'];
const PORT_ASPECT = 2760 / 1504;
const MAP_ASPECT = 2752 / 1536;

const Gold: React.FC<{ n: number; className?: string }> = ({ n, className }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className || ''}`}>
    <IconCoin className="w-4 h-4" />
    {n.toLocaleString()}
  </span>
);

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onTrigger: () => void;
}

const HoldButton: React.FC<HoldButtonProps> = ({ onTrigger, children, disabled, ...props }) => {
  const trigger = useRef(onTrigger);
  useEffect(() => { trigger.current = onTrigger; }, [onTrigger]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const holding = useRef(false);
  const stop = () => {
    holding.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (repeat.current) clearInterval(repeat.current);
  };
  const start = () => {
    if (disabled || holding.current) return;
    holding.current = true;
    trigger.current();
    timer.current = setTimeout(() => {
      repeat.current = setInterval(() => trigger.current(), 80);
    }, 350);
  };
  useEffect(() => stop, []);
  useEffect(() => { if (disabled) stop(); }, [disabled]);
  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); start(); }}
      onTouchEnd={stop}
      onTouchCancel={stop}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/** Computes exact pixel width matching the image's natural aspect ratio inside a scrollable viewport. */
function useAspectWidth(ref: React.RefObject<HTMLDivElement | null>, aspect: number, active: boolean) {
  const [width, setWidth] = useState<number>(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setWidth(Math.max(el.clientWidth, Math.round(h * aspect)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, aspect, active]);
  return width;
}

const App: React.FC = () => {
  const [g, setG] = useState<GameState>(loadGame);
  const gRef = useRef(g);
  useEffect(() => {
    gRef.current = g;
    saveGame(g);
  }, [g]);

  const [tab, setTab] = useState<Tab>('port');
  const [battle, setBattle] = useState<BattleData | null>(null);
  const battleRef = useRef(battle);
  useEffect(() => { battleRef.current = battle; }, [battle]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(audioManager.getMuted());
  const [evolved, setEvolved] = useState<{ oldClass: string; ship: Ship } | null>(null);

  // Market & Shipyard sub-controls
  const [marketFilter, setMarketFilter] = useState<'featured' | 'all'>('featured');
  const [shipSubTab, setShipSubTab] = useState<'upgrades' | 'fleet'>('upgrades');
  const [defaultPubGame, setDefaultPubGame] = useState<PubGameType>('dice');

  // Layout editor
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingBuildingId, setDraggingBuildingId] = useState<string | null>(null);
  const [resizingBuildingId, setResizingBuildingId] = useState<string | null>(null);
  const [draggingPortId, setDraggingPortId] = useState<string | null>(null);

  // Sailing & Sea Events
  const [isTraveling, setIsTraveling] = useState(false);
  const [targetPortId, setTargetPortId] = useState<string | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [voyageWeather, setVoyageWeather] = useState<WeatherType>('Fair Seas');
  const [sailingShipPos, setSailingShipPos] = useState<Point | null>(null);
  const [sailingFacing, setSailingFacing] = useState<'left' | 'right'>('right');
  const [showAmbushIndicator, setShowAmbushIndicator] = useState(false);
  const [wakeParticles, setWakeParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [pendingSeaEvent, setPendingSeaEvent] = useState<{ event: SeaEventDef; destId: string; days: number } | null>(null);
  const voyageTimerRef = useRef<number>(0);

  // Battle effects
  const [cannonball, setCannonball] = useState<{ from: 'player' | 'enemy' } | null>(null);
  const [shake, setShake] = useState<'player' | 'enemy' | null>(null);
  const [hitEffect, setHitEffect] = useState<'player' | 'enemy' | 'splash-enemy' | 'splash-player' | null>(null);

  // Panning containers & aspect widths
  const portScrollRef = useRef<HTMLDivElement | null>(null);
  const mapScrollRef = useRef<HTMLDivElement | null>(null);
  const portWidth = useAspectWidth(portScrollRef, PORT_ASPECT, tab === 'port');
  const mapWidth = useAspectWidth(mapScrollRef, MAP_ASPECT, tab === 'map');

  const isMouseDownRef = useRef(false);
  const dragMovedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const { player, ports, events, rumors } = g;
  const currentPort = ports.find(p => p.id === player.currentPortId) || ports[0];
  const flagship = player.fleet[0];
  const maxCargo = totalCargoCapacity(player);
  const currentCargo = cargoCount(player);
  const freeSpace = maxCargo - currentCargo;
  const hullPct = Math.round((flagship.hullHealth.current / flagship.hullHealth.max) * 100);
  const hullLow = hullPct <= 35;
  const worth = netWorth(player);
  const rank = rankFor(worth);
  const trade = PORT_TRADE[currentPort.id];
  const hasNavigator = player.officers?.includes('navigator');
  const locked = isTraveling || tab === 'battle' || Boolean(pendingSeaEvent);

  const readyContract = player.contracts.find(
    c => c.toPortId === currentPort.id && (player.cargo[c.good] || 0) >= c.amount,
  );
  const readyRival = SYNDICATE_RIVALS.find(
    r => !player.defeatedRivals.includes(r.id) && worth >= r.minWorth,
  );
  const ledgerAlert = Boolean(readyContract || readyRival);
  const allRivalsDefeated = SYNDICATE_RIVALS.every(r => player.defeatedRivals.includes(r.id));
  const victoryReached = (player.gold >= GOAL || allRivalsDefeated) && !player.hasWonGame && tab !== 'battle';

  const say = (text: string) => setToast(text);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const guideOpen = showGuide || (player.hasReadPrologue && !player.seenGuide);
  const closeGuide = () => {
    audioManager.playSfx('click');
    setShowGuide(false);
    setG(prev => ({ ...prev, player: { ...prev.player, seenGuide: true } }));
  };

  const changeTab = (next: Tab) => {
    if (locked) return;
    audioManager.playSfx('click');
    setSelectedPortId(null);
    if (next === 'cantina') setDefaultPubGame(pickMinigame());
    setTab(next);
  };

  // --- MARKET ---

  const buy = (good: CommodityType, count: number) => {
    const before = gRef.current;
    const after = buyGoods(before, good, count);
    if (after === before) return;
    audioManager.playSfx('coin');
    setG(prev => buyGoods(prev, good, count));
  };

  const sell = (good: CommodityType, count: number) => {
    const before = gRef.current;
    const after = sellGoods(before, good, count);
    if (after === before) return;
    audioManager.playSfx('coin');
    setG(prev => sellGoods(prev, good, count));
  };

  const sellAllCargo = () => {
    let cur = gRef.current;
    let soldAny = false;
    for (const good of COMMODITIES) {
      if (cur.player.cargo[good] > 0) {
        cur = sellGoods(cur, good, 999);
        soldAny = true;
      }
    }
    if (!soldAny) return;
    audioManager.playSfx('coin');
    setG(cur);
    say('Sold all cargo in the hold.');
  };

  // --- CONTRACTS & RIVALS ---

  const handleAcceptContract = (id: string) => {
    audioManager.playSfx('click');
    setG(prev => acceptContract(prev, id));
    say('Charter accepted. Check your Ledger for delivery.');
  };

  const handleClaimContract = (id: string) => {
    const c = player.contracts.find(x => x.id === id);
    if (!c) return;
    audioManager.playSfx('victory');
    setG(prev => claimContract(prev, id));
    say(`Delivered ${c.amount} ${c.good}! Earned ${c.rewardGold.toLocaleString()} gold & +${c.repGain} rep.`);
  };

  const handleHuntRival = (rival: RivalDef) => {
    if (locked) return;
    audioManager.playSfx('cannon');
    setLedgerOpen(false);
    const { enemy, loot } = generateRivalEnemy(rival);
    setBattle({
      enemy,
      loot,
      log: `${rival.name}: "${rival.taunt}"`,
      tone: 'bad',
      phase: 'player',
      originId: currentPort.id,
      destId: currentPort.id,
      days: 1,
      intent: pickEnemyIntent(1),
      enemyCrippledTurns: 0,
      playerBracing: false,
      rival,
    });
    setTab('battle');
  };

  // --- SHIPYARD & FLEET ---

  const hullDamage = flagship.hullHealth.max - flagship.hullHealth.current;
  const repairPoints = Math.min(hullDamage, Math.floor(player.gold / REPAIR_COST_PER_POINT));
  const repairCost = repairPoints * REPAIR_COST_PER_POINT;

  const repair = () => {
    if (repairPoints <= 0) return;
    audioManager.playSfx('coin');
    setG(prev => {
      const ship = prev.player.fleet[0];
      const points = Math.min(ship.hullHealth.max - ship.hullHealth.current, Math.floor(prev.player.gold / REPAIR_COST_PER_POINT));
      if (points <= 0) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - points * REPAIR_COST_PER_POINT,
          fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: ship.hullHealth.current + points } }],
        },
      };
    });
  };

  const buyUpgrade = (upgradeId: string) => {
    const upgrade = getUpgradesForTier(flagship.tier).find(u => u.id === upgradeId);
    if (!upgrade || player.gold < upgrade.cost || flagship.upgrades.includes(upgradeId)) return;
    audioManager.playSfx('coin');
    const result = applyUpgrade(flagship, upgradeId);
    setG(prev => ({ ...prev, player: { ...prev.player, gold: prev.player.gold - upgrade.cost, fleet: [result.ship] } }));
    if (result.evolved) {
      setTimeout(() => {
        audioManager.playSfx('victory');
        setEvolved({ oldClass: flagship.shipClass, ship: result.ship });
      }, 400);
    }
  };

  const hireOfficer = (id: OfficerId) => {
    const off = OFFICERS.find(o => o.id === id);
    if (!off || player.officers.includes(id) || player.gold < off.cost) return;
    audioManager.playSfx('victory');
    setG(prev => ({
      ...prev,
      player: { ...prev.player, gold: prev.player.gold - off.cost, officers: [...prev.player.officers, id] },
    }));
    say(`${off.name} joined your crew.`);
  };

  const buyEscort = (def: EscortDef) => {
    if (player.escorts.length >= 2 || player.gold < def.cost) return;
    audioManager.playSfx('victory');
    setG(prev => ({
      ...prev,
      player: {
        ...prev.player,
        gold: prev.player.gold - def.cost,
        escorts: [
          ...prev.player.escorts,
          {
            id: Math.random().toString(36).slice(2, 9),
            defId: def.id,
            name: `${def.name} ${prev.player.escorts.length + 1}`,
            shipClass: def.shipClass,
            tier: def.tier,
            cargoBonus: def.cargoBonus,
            firepowerBonus: def.firepowerBonus,
          },
        ],
      },
    }));
    say(`${def.shipClass} added to your merchant convoy!`);
  };

  // --- LAYOUT EDITOR ---

  const updateBuilding = (portId: string, buildingId: string, updates: Partial<Building>) => {
    setG(prev => ({
      ...prev,
      ports: prev.ports.map(p => (p.id !== portId ? p : { ...p, buildings: p.buildings.map(b => (b.id === buildingId ? { ...b, ...updates } : b)) })),
    }));
  };

  const updatePort = (id: string, x: number, y: number) => {
    setG(prev => ({ ...prev, ports: prev.ports.map(p => (p.id === id ? { ...p, x, y } : p)) }));
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditMode) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;
    const xPx = point.clientX - rect.left + container.scrollLeft;
    const yPx = point.clientY - rect.top + container.scrollTop;
    const x = Math.round((xPx / container.scrollWidth) * 100);
    const y = Math.round((yPx / container.scrollHeight) * 100);
    if (draggingBuildingId) {
      updateBuilding(player.currentPortId, draggingBuildingId, { x, y });
    } else if (resizingBuildingId) {
      const building = currentPort.buildings.find(b => b.id === resizingBuildingId);
      if (building) {
        const scale = Math.max(0.2, Math.min(3, (Math.abs(x - building.x) + Math.abs(y - building.y)) / 10));
        updateBuilding(player.currentPortId, resizingBuildingId, { scale });
      }
    } else if (draggingPortId) {
      updatePort(draggingPortId, x, y);
    }
  };

  const handleDragEnd = () => {
    setDraggingBuildingId(null);
    setResizingBuildingId(null);
    setDraggingPortId(null);
  };

  const handleExport = () => {
    const data = JSON.stringify({ ports, player });
    navigator.clipboard.writeText(data).then(() => {
      say('Save data copied to clipboard.');
    }).catch(() => {
      prompt('Copy this layout and progress data:', data);
    });
  };

  const handleImport = () => {
    const data = prompt('Paste your exported layout and progress data here:');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.ports) localStorage.setItem('med_merchants_ports', JSON.stringify(parsed.ports));
      if (parsed.player) localStorage.setItem('med_merchants_player', JSON.stringify(parsed.player));
      window.location.reload();
    } catch {
      say('That text is not a saved game.');
    }
  };

  const restartGame = () => {
    if (!window.confirm('Start over from day 1? Your gold, ship and cargo will be lost.')) return;
    const layout = gRef.current.ports.map(p => ({ id: p.id, x: p.x, y: p.y, buildings: p.buildings }));
    clearSave();
    localStorage.setItem('med_merchants_ports', JSON.stringify(layout));
    window.location.reload();
  };

  // --- PANNING & SCROLL CENTERING ---

  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    const container = e.currentTarget;
    isMouseDownRef.current = true;
    dragMovedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
    container.style.cursor = 'grabbing';
  };

  const handlePanMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) { handleDragMove(e); return; }
    if (!isMouseDownRef.current) return;
    e.preventDefault();
    const container = e.currentTarget;
    const dx = e.pageX - container.offsetLeft - startXRef.current;
    if (Math.abs(dx) > 6) dragMovedRef.current = true;
    container.scrollLeft = scrollLeftRef.current - dx * 1.4;
  };

  const handlePanMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) { handleDragEnd(); return; }
    isMouseDownRef.current = false;
    e.currentTarget.style.cursor = '';
  };

  const panBy = (ref: React.RefObject<HTMLDivElement | null>, delta: number) => {
    ref.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const centerScroll = (container: HTMLDivElement | null, xPercent: number) => {
    if (!container || container.clientWidth === 0 || container.scrollWidth === 0) return;
    container.scrollTo({ left: (xPercent / 100) * container.scrollWidth - container.clientWidth / 2, behavior: 'auto' });
  };

  useEffect(() => {
    if (tab !== 'port' || isEditMode || !portWidth) return;
    const shipX = currentPort.buildings.find(b => b.id === 'sail')?.x ?? 50;
    centerScroll(portScrollRef.current, shipX);
  }, [tab, player.currentPortId, isEditMode, portWidth, currentPort.buildings]);

  useEffect(() => {
    if (tab !== 'map' || isEditMode || !mapWidth || isTraveling) return;
    centerScroll(mapScrollRef.current, currentPort.x);
  }, [tab, player.currentPortId, isEditMode, mapWidth, isTraveling, currentPort.x]);

  // --- SEA-LANE VOYAGE ENGINE ---

  const arrive = (destId: string, days: number, message?: string) => {
    cancelAnimationFrame(voyageTimerRef.current);
    const dest = gRef.current.ports.find(p => p.id === destId);
    setG(prev => advanceDays({
      ...prev,
      player: { ...prev.player, currentPortId: destId, gameDay: prev.player.gameDay + days, voyages: prev.player.voyages + 1 },
    }, days));
    setIsTraveling(false);
    setTargetPortId(null);
    setSelectedPortId(null);
    setSailingShipPos(null);
    setWakeParticles([]);
    setPendingSeaEvent(null);
    setBattle(null);
    setTab('port');
    say(message || `Arrived in ${dest?.name || 'port'} after ${days} day${days === 1 ? '' : 's'} at sea.`);
  };

  const triggerAmbushAtSea = (originId: string, dest: Port, days: number, rival?: RivalDef) => {
    setShowAmbushIndicator(true);
    setTimeout(() => setShowAmbushIndicator(false), 550);
    setTimeout(() => {
      if (rival) {
        const { enemy, loot } = generateRivalEnemy(rival);
        setBattle({
          enemy,
          loot,
          log: `${rival.name}: "${rival.taunt}"`,
          tone: 'bad',
          phase: 'player',
          originId,
          destId: dest.id,
          days,
          intent: pickEnemyIntent(1),
          enemyCrippledTurns: 0,
          playerBracing: false,
          rival,
        });
      } else {
        const enemy = generateEnemy(dest.dangerLevel, gRef.current.player.fleet[0].tier);
        setBattle({
          enemy,
          loot: generateLoot(enemy),
          log: `Ambush! ${enemy.name}, a pirate ${enemy.shipClass.toLowerCase()}, cuts across your bow!`,
          tone: 'bad',
          phase: 'player',
          originId,
          destId: dest.id,
          days,
          intent: pickEnemyIntent(1),
          enemyCrippledTurns: 0,
          playerBracing: false,
        });
      }
      setIsTraveling(false);
      setSailingShipPos(null);
      setWakeParticles([]);
      setTab('battle');
    }, 550);
  };

  const animateVoyageLeg = (
    routePts: Point[],
    startProgress: number,
    endProgress: number,
    durationMs: number,
    onDone: () => void,
  ) => {
    let startTime = 0;
    let lastWake = 0;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / durationMs);
      const prog = startProgress + (endProgress - startProgress) * t;
      const pt = pointAlongRoute(routePts, prog);
      const nextPt = pointAlongRoute(routePts, Math.min(1, prog + 0.02));
      setSailingFacing(nextPt.x < pt.x ? 'left' : 'right');
      setSailingShipPos(pt);

      // Keep map centered smoothly on sailing ship
      const el = mapScrollRef.current;
      if (el && el.scrollWidth > 0) {
        const targetScroll = (pt.x / 100) * el.scrollWidth - el.clientWidth / 2;
        el.scrollLeft += (targetScroll - el.scrollLeft) * 0.14;
      }

      if (now - lastWake > 110) {
        lastWake = now;
        setWakeParticles(prev => [...prev, { id: Math.random(), x: pt.x, y: pt.y }].slice(-20));
      }

      if (t < 1) {
        voyageTimerRef.current = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    };
    voyageTimerRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(voyageTimerRef.current), []);

  const handleTravel = (destId: string) => {
    if (isTraveling) return;
    const start = currentPort;
    const dest = ports.find(p => p.id === destId);
    if (!dest || dest.id === start.id) return;

    const days = voyageDays(start, dest, hasNavigator);
    const weather = rollWeather();
    const routePts = computeSeaRoute(start, dest);

    audioManager.playSfx('sail');
    setSelectedPortId(null);
    setTargetPortId(destId);
    setVoyageWeather(weather);
    setIsTraveling(true);
    setWakeParticles([]);
    setSailingShipPos(routePts[0]);

    const ambushed = rollAmbush(dest, days, player.voyages, weather);
    const seaEvent = !ambushed ? rollSeaEvent(player.voyages) : null;

    if (ambushed) {
      animateVoyageLeg(routePts, 0, 0.58, 1750, () => {
        triggerAmbushAtSea(start.id, dest, days);
      });
    } else if (seaEvent) {
      animateVoyageLeg(routePts, 0, 0.52, 1550, () => {
        setPendingSeaEvent({ event: seaEvent, destId, days });
      });
    } else {
      animateVoyageLeg(routePts, 0, 1, 2400, () => {
        arrive(destId, days);
      });
    }
  };

  const continueAfterSeaEvent = () => {
    if (!pendingSeaEvent) return;
    const { destId, days } = pendingSeaEvent;
    const dest = ports.find(p => p.id === destId);
    setPendingSeaEvent(null);
    if (!dest) { arrive(destId, days); return; }
    const routePts = computeSeaRoute(currentPort, dest);
    animateVoyageLeg(routePts, 0.52, 1, 1300, () => {
      arrive(destId, days);
    });
  };

  // --- TACTICAL BATTLE ---

  const updateBattle = (changes: Partial<BattleData>) =>
    setBattle(prev => (prev ? { ...prev, ...changes } : prev));

  const impact = (side: 'player' | 'enemy' | 'splash-enemy' | 'splash-player') => {
    if (side === 'player' || side === 'enemy') setShake(side);
    setHitEffect(side);
    setTimeout(() => setShake(null), 360);
    setTimeout(() => setHitEffect(null), 650);
  };

  const winBattle = (b: BattleData, doubleLoot = false, verb = 'Victory!') => {
    const goldWon = doubleLoot ? Math.round(b.loot.gold * 1.4) : b.loot.gold;
    const amtWanted = doubleLoot ? b.loot.amount * 2 : b.loot.amount;
    const p = gRef.current.player;
    const space = totalCargoCapacity(p) - cargoCount(p);
    const taken = Math.max(0, Math.min(amtWanted, space));
    audioManager.playSfx('victory');

    setG(prev => ({
      ...prev,
      player: {
        ...prev.player,
        gold: prev.player.gold + goldWon,
        cargo: { ...prev.player.cargo, [b.loot.good]: prev.player.cargo[b.loot.good] + taken },
        defeatedRivals: b.rival && !prev.player.defeatedRivals.includes(b.rival.id)
          ? [...prev.player.defeatedRivals, b.rival.id]
          : prev.player.defeatedRivals,
      },
    }));

    const cargoLine = taken > 0
      ? ` and ${taken} ${b.loot.good}${taken < amtWanted ? ' (hold full)' : ''}`
      : '. No room in hold for their cargo';
    updateBattle({
      enemy: { ...b.enemy, hullHealth: { ...b.enemy.hullHealth, current: 0 } },
      phase: 'won',
      tone: 'good',
      log: `${verb} Took ${goldWon.toLocaleString()} gold${cargoLine}.`,
    });
  };

  const loseBattle = () => {
    const b = battleRef.current;
    if (!b) return;
    audioManager.playSfx('defeat');
    updateBattle({ phase: 'lost', tone: 'bad', log: 'Your hull breaks under their broadside. Pirates swarm the deck.' });
    setTimeout(() => {
      const before = gRef.current.player;
      const goldTaken = Math.floor(before.gold * 0.28);
      const goldLeft = Math.max(100, before.gold - goldTaken);
      const origin = gRef.current.ports.find(p => p.id === b.originId);
      setG(prev => {
        const ship = prev.player.fleet[0];
        return advanceDays({
          ...prev,
          player: {
            ...prev.player,
            gold: goldLeft,
            cargo: emptyCargo(),
            paid: emptyCargo(),
            currentPortId: b.originId,
            gameDay: prev.player.gameDay + 1,
            voyages: prev.player.voyages + 1,
            fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: Math.max(1, Math.round(ship.hullHealth.max * 0.3)) } }],
          },
        }, 1);
      });
      setBattle(null);
      setTargetPortId(null);
      setTab('port');
      setNotice({
        title: 'Towed back to port',
        body: `Fishermen towed your battered hull back to ${origin?.name || 'port'}. Raiders seized your cargo${before.gold - goldLeft > 0 ? ` and ${(before.gold - goldLeft).toLocaleString()} gold` : ''}.`,
      });
    }, 2200);
  };

  const enemyTurn = (prefix = '') => {
    const b = battleRef.current;
    if (!b) return;
    audioManager.playSfx('cannon');
    setCannonball({ from: 'enemy' });
    setTimeout(() => {
      setCannonball(null);
      const now = battleRef.current;
      if (!now) return;

      const intentMult = now.intent === 'heavy' ? 1.25 : now.intent === 'maneuver' ? 0.7 : 1;
      const crippledMult = now.enemyCrippledTurns > 0 ? 0.65 : 1;
      const rawFp = Math.max(1, Math.round(now.enemy.firepower * intentMult * crippledMult));
      const shot = rollShot(rawFp);
      const nextCrippled = Math.max(0, now.enemyCrippledTurns - 1);
      const nextIntent = pickEnemyIntent(Math.floor(Math.random() * 10));

      if (shot.kind === 'miss') {
        impact('splash-player');
        updateBattle({
          phase: 'player',
          tone: 'info',
          playerBracing: false,
          enemyCrippledTurns: nextCrippled,
          intent: nextIntent,
          log: `${prefix}${now.enemy.name} fires wide — water erupts harmlessly off your beam!`,
        });
        return;
      }

      const dmg = Math.max(1, now.playerBracing ? Math.ceil(shot.damage * 0.5) : shot.damage);
      audioManager.playSfx('hit');
      impact('player');
      const hull = Math.max(0, gRef.current.player.fleet[0].hullHealth.current - dmg);
      setG(prev => {
        const ship = prev.player.fleet[0];
        return { ...prev, player: { ...prev.player, fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: hull } }] } };
      });
      if (hull <= 0) {
        loseBattle();
      } else {
        updateBattle({
          phase: 'player',
          tone: 'bad',
          playerBracing: false,
          enemyCrippledTurns: nextCrippled,
          intent: nextIntent,
          log: `${prefix}${now.enemy.name} hits for ${dmg}${now.playerBracing ? ' (halved by brace)' : ''}. Your move!`,
        });
      }
    }, 550);
  };

  const handleAimedShot = (mode: ShotMode, accuracy: AimAccuracy) => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    updateBattle({ phase: 'busy' });
    audioManager.playSfx('cannon');
    setCannonball({ from: 'player' });
    setTimeout(() => {
      setCannonball(null);
      const now = battleRef.current;
      if (!now) return;
      const fp = totalFirepower(gRef.current.player);
      const res = rollAimedShot(fp, accuracy, mode);
      audioManager.playSfx('hit');
      impact('enemy');

      const enemyHull = Math.max(0, now.enemy.hullHealth.current - res.damage);
      const enemy = { ...now.enemy, hullHealth: { ...now.enemy.hullHealth, current: enemyHull } };
      const crippled = res.cripples ? 2 : now.enemyCrippledTurns;

      if (enemyHull <= 0) {
        winBattle({ ...now, enemy }, false);
        return;
      }
      const label = accuracy === 'crit' ? 'Direct broadside!' : accuracy === 'good' ? 'Solid hit!' : 'Grazing shot!';
      const extra = res.cripples ? ' Their rigging is shredded!' : '';
      updateBattle({
        enemy,
        enemyCrippledTurns: crippled,
        tone: 'good',
        log: `${label} ${res.damage} damage.${extra}`,
      });
      setTimeout(() => enemyTurn(), 650);
    }, 550);
  };

  const handleBrace = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    audioManager.playSfx('click');
    setG(prev => {
      const ship = prev.player.fleet[0];
      const hp = Math.min(ship.hullHealth.max, ship.hullHealth.current + 3);
      return { ...prev, player: { ...prev.player, fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: hp } }] } };
    });
    updateBattle({
      phase: 'busy',
      playerBracing: true,
      tone: 'info',
      log: 'Crew mans the pumps and braces the timbers (+3 hull, incoming shot halved).',
    });
    setTimeout(() => enemyTurn(), 700);
  };

  const handleBoard = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    audioManager.playSfx('sail');
    updateBattle({ phase: 'busy' });
    const ok = rollBoard(gRef.current.player, b.enemy, b.enemyCrippledTurns > 0);
    if (ok) {
      winBattle(b, true, 'Boarding succeeded!');
    } else {
      updateBattle({ tone: 'bad', log: 'Boarding repulsed! They fire at point-blank range.' });
      setTimeout(() => enemyTurn(''), 700);
    }
  };

  const handleFlee = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    audioManager.playSfx('sail');
    if (rollFlee(gRef.current.player, b.enemy, b.enemyCrippledTurns > 0)) {
      updateBattle({ phase: 'escaped', tone: 'good', log: 'You catch a clean Mediterranean gust and leave them astern!' });
      setTimeout(() => arrive(b.destId, b.days), 1200);
    } else {
      updateBattle({ phase: 'busy', tone: 'bad', log: 'They match your tack! You cannot shake them.' });
      setTimeout(() => enemyTurn('No escape. '), 750);
    }
  };

  const handleTribute = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player' || b.rival) return;
    const cost = tributeCost(player.gold, b.enemy);
    if (player.gold < cost) return;
    audioManager.playSfx('coin');
    setG(prev => ({ ...prev, player: { ...prev.player, gold: Math.max(0, prev.player.gold - cost) } }));
    updateBattle({ phase: 'escaped', tone: 'info', log: `You toss ${cost.toLocaleString()} gold across. They haul off.` });
    setTimeout(() => arrive(b.destId, b.days), 1200);
  };

  // --- MARKET SORT & FILTER ---

  const marketOrder = [...COMMODITIES]
    .filter(t => {
      if (marketFilter === 'all') return true;
      if (player.cargo[t] > 0) return true;
      if (tradeRole(currentPort.id, t)) return true;
      if (events.some(e => e.known && e.portId === currentPort.id && e.good === t)) return true;
      return player.contracts.some(c => c.good === t);
    })
    .sort((a, b) => {
      const score = (t: CommodityType) => (player.cargo[t] > 0 ? 0 : tradeRole(currentPort.id, t) === 'makes' ? 1 : tradeRole(currentPort.id, t) === 'wants' ? 2 : 3);
      return score(a) - score(b) || BASE_PRICES[a] - BASE_PRICES[b];
    });

  const endPort = ports.find(p => p.id === targetPortId);
  const selectedPort = ports.find(p => p.id === selectedPortId);
  const selectedTrade = selectedPort ? PORT_TRADE[selectedPort.id] : undefined;
  const selectedDays = selectedPort ? voyageDays(currentPort, selectedPort, hasNavigator) : 0;
  const selectedWanted = selectedTrade ? selectedTrade.wants.filter(w => player.cargo[w] > 0) : [];
  const selectedRoute = selectedPort && selectedPort.id !== currentPort.id
    ? computeSeaRoute(currentPort, selectedPort)
    : isTraveling && endPort
      ? computeSeaRoute(currentPort, endPort)
      : null;

  const knownEventsAt = (portId: string) => events.filter(e => e.known && e.portId === portId);
  const upgrades = getUpgradesForTier(flagship.tier);
  const nextClass = flagship.tier < 4 ? SHIP_CLASSES[flagship.tier] : null;
  const currentRep = reputationTier(player.reputation?.[currentPort.id] || 0);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0d1d29] text-[#f6ecd6] w-full max-w-[440px] mx-auto overflow-hidden border-x border-[#a87e3b]/50 shadow-2xl relative select-none">
      {/* TOP WOOD HUD */}
      <header className="wood-bar px-3.5 pt-2.5 pb-2.5 border-b z-40 relative shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-xl font-black text-[#f8d77d] tracking-tight leading-none flex items-center gap-1">
              <Gold n={player.gold} />
              <span className="text-[#bda57a] text-[11px] font-bold">/ {GOAL.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-[#d6c29f] font-bold uppercase tracking-widest mt-1 truncate">
              {rank} · Day {player.gameDay}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end text-[10px] font-extrabold uppercase tracking-wider leading-tight">
              <span className={freeSpace === 0 ? 'text-[#f8c456]' : 'text-[#78e0b7]'}>
                Hold {currentCargo}/{maxCargo}
              </span>
              <span className={hullLow ? 'text-[#f27c72] animate-pulse' : 'text-[#7cd6e6]'}>
                Hull {hullPct}%
              </span>
            </div>

            <button
              onClick={() => { audioManager.playSfx('click'); setLedgerOpen(true); }}
              disabled={locked}
              aria-label="Captain's Ledger"
              className="relative w-9 h-9 rounded-full bg-[#3a2315] border border-[#c8963e]/60 hover:brightness-110 text-[#f8d77d] flex items-center justify-center active:scale-95 disabled:opacity-40"
            >
              <IconLedger className="w-4 h-4" />
              {ledgerAlert && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#f5c749] border border-[#1d120b] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => { audioManager.playSfx('click'); setMenuOpen(true); }}
              aria-label="Menu"
              className="w-9 h-9 rounded-full bg-[#3a2315] border border-[#c8963e]/60 hover:brightness-110 text-[#f2e2c2] flex items-center justify-center active:scale-95"
            >
              <IconMenu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gold goal hairline */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#140c07]">
          <div
            className="h-full bg-gradient-to-r from-[#b87b1e] via-[#f2c65a] to-[#ffe699] transition-all duration-500"
            style={{ width: `${Math.min(100, (player.gold / GOAL) * 100)}%` }}
          />
        </div>
      </header>

      {/* MAIN STAGE */}
      <main className="flex-1 relative min-h-0 flex flex-col">
        {/* PORT VIEW (Native Aspect Ratio — Zero Stretching) */}
        {tab === 'port' && (
          <div className="flex-1 relative overflow-hidden anim-fade bg-[#0d1d29]">
            <div
              ref={portScrollRef}
              className="relative h-full overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab"
              onMouseDown={handlePanMouseDown}
              onMouseMove={handlePanMouseMove}
              onTouchMove={handleDragMove}
              onMouseUp={handlePanMouseUpOrLeave}
              onTouchEnd={handleDragEnd}
              onMouseLeave={handlePanMouseUpOrLeave}
            >
              <div className="relative h-full" style={{ width: portWidth ? `${portWidth}px` : '200%' }}>
                <img
                  src={currentPort.image}
                  className="w-full h-full object-cover pointer-events-none"
                  alt={currentPort.name}
                  draggable="false"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#130c08]/65 via-transparent to-[#130c08]/35 pointer-events-none" />

                {/* Calibrated Buildings & Docked Ship */}
                <div className="absolute inset-0 z-20">
                  {currentPort.buildings.map((b: Building) => (
                    <button
                      key={b.id}
                      onMouseDown={(e) => { if (isEditMode) { e.preventDefault(); setDraggingBuildingId(b.id); } }}
                      onTouchStart={() => { if (isEditMode) setDraggingBuildingId(b.id); }}
                      onClick={() => {
                        if (dragMovedRef.current) { dragMovedRef.current = false; return; }
                        if (!isEditMode) changeTab(b.tab as Tab);
                      }}
                      className={`absolute group flex flex-col items-center ${isEditMode ? 'cursor-move' : ''}`}
                      style={{ left: `${b.x}%`, top: `${b.y}%`, transform: `translate(-50%, -50%) scale(${b.scale || 1})` }}
                    >
                      {b.id === 'sail' ? (
                        <div className="flex flex-col items-center">
                          <ShipArt
                            tier={flagship.tier}
                            variant="player"
                            upgrades={flagship.upgrades}
                            size="port"
                            facing="right"
                          />
                          <span className="-mt-1 text-[10px] font-display font-black uppercase tracking-[0.14em] bg-[#1d120b]/92 text-[#f8d77d] px-3 py-1 rounded-full border border-[#c8963e] shadow-lg whitespace-nowrap">
                            {b.label}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <AnimatedMarker type={b.id} />
                          <span className="mt-1.5 text-[10px] font-display font-black uppercase tracking-[0.14em] bg-[#1d120b]/90 text-[#f8e6c1] px-2.5 py-0.5 rounded-full border border-[#c8963e]/75 shadow-lg whitespace-nowrap">
                            {b.label}
                          </span>
                        </div>
                      )}
                      {isEditMode && (
                        <div
                          onMouseDown={(e) => { e.stopPropagation(); setResizingBuildingId(b.id); }}
                          onTouchStart={(e) => { e.stopPropagation(); setResizingBuildingId(b.id); }}
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#f2c65a] rounded-full border-2 border-white shadow cursor-nwse-resize z-50"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtle Pan Arrows */}
            {!isEditMode && (
              <>
                <button
                  onClick={() => panBy(portScrollRef, -180)}
                  aria-label="Pan port left"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#1d120b]/70 border border-[#c8963e]/50 text-[#f8d77d] flex items-center justify-center active:scale-95"
                >
                  <IconChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => panBy(portScrollRef, 180)}
                  aria-label="Pan port right"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#1d120b]/70 border border-[#c8963e]/50 text-[#f8d77d] flex items-center justify-center active:scale-95"
                >
                  <IconChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Top Port Crest */}
            <div className="absolute top-2.5 left-0 right-0 flex flex-col items-center pointer-events-none z-30 px-4">
              <div className="bg-[#1d120b]/85 backdrop-blur-sm border border-[#c8963e]/70 rounded-full px-4 py-1 shadow-xl flex items-center gap-2">
                <h1 className="font-display text-lg font-black uppercase tracking-widest text-[#f8d77d]">
                  {currentPort.name}
                </h1>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#16626d] text-[#e6fbff]">
                  {currentRep.label}
                </span>
              </div>
              {isEditMode && (
                <span className="mt-1 text-[10px] font-black uppercase tracking-widest bg-[#a72d22] text-white px-3 py-0.5 rounded-full">
                  Layout Editor: Drag to Move
                </span>
              )}
            </div>

            {/* Bottom Harbor Master Parchment Strip */}
            {!isEditMode && (
              <div className="absolute bottom-2.5 left-3 right-3 z-30">
                <div className="parchment rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#7d4f0a] block">
                      Harbor Master
                    </span>
                    <p className="text-xs font-semibold text-[#2b1d12] leading-snug">
                      {readyContract
                        ? `Deliver ${readyContract.amount} ${readyContract.good} for ${readyContract.rewardGold.toLocaleString()} gold!`
                        : hullLow
                          ? 'Your hull is dangerously low. Repair at the Shipyard before sailing.'
                          : routeTip(currentPort, ports, events)}
                    </p>
                  </div>
                  {readyContract ? (
                    <button
                      onClick={() => handleClaimContract(readyContract.id)}
                      className="btn-brass px-3 py-2 rounded-xl text-[10px] font-black uppercase shrink-0"
                    >
                      Claim
                    </button>
                  ) : (
                    <button
                      onClick={() => { audioManager.playSfx('click'); setLedgerOpen(true); }}
                      className="btn-teal px-3 py-2 rounded-xl text-[10px] font-black uppercase shrink-0"
                    >
                      Charters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORLD MAP VIEW (Native Aspect Ratio + Water-Only SVG Route) */}
        {tab === 'map' && (
          <div className="flex-1 relative bg-[#0c2330] flex flex-col min-h-0 anim-fade">
            <div
              ref={mapScrollRef}
              className="flex-1 relative overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab"
              onMouseDown={handlePanMouseDown}
              onMouseMove={handlePanMouseMove}
              onTouchMove={handleDragMove}
              onMouseUp={handlePanMouseUpOrLeave}
              onTouchEnd={handleDragEnd}
              onMouseLeave={handlePanMouseUpOrLeave}
            >
              <div className="relative h-full" style={{ width: mapWidth ? `${mapWidth}px` : '200%' }}>
                <img
                  src="/assets/World Map.webp"
                  className="w-full h-full object-cover pointer-events-none"
                  alt="Mediterranean Map"
                  draggable="false"
                />

                {/* Delicate Cartographic Dotted Sea-Lane Trail */}
                {selectedRoute && selectedRoute.length > 1 && (
                  <svg
                    viewBox="0 0 1000 558"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  >
                    <path
                      d={routeToSmoothPath(selectedRoute, 1000, 558)}
                      fill="none"
                      stroke="#1a1109"
                      strokeOpacity="0.45"
                      strokeWidth="4.4"
                      strokeDasharray="1 10"
                      strokeLinecap="round"
                    />
                    <path
                      d={routeToSmoothPath(selectedRoute, 1000, 558)}
                      fill="none"
                      stroke="#fff3cf"
                      strokeWidth="2.5"
                      strokeDasharray="1 10"
                      strokeLinecap="round"
                      className="animate-route-dash"
                    />
                  </svg>
                )}

                {/* Port Pins */}
                {ports.map((p: Port) => {
                  const isCurrent = p.id === player.currentPortId;
                  const isSelected = p.id === selectedPortId;
                  const hasContractHere = player.contracts.some(c => c.toPortId === p.id);
                  const hasRumorHere = knownEventsAt(p.id).length > 0;
                  const hasRivalHere = SYNDICATE_RIVALS.some(
                    r => !player.defeatedRivals.includes(r.id) && worth >= r.minWorth && r.watersPortId === p.id,
                  );

                  return (
                    <div
                      key={p.id}
                      className="absolute z-20"
                      style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <button
                        onMouseDown={(e) => { if (isEditMode) { e.preventDefault(); setDraggingPortId(p.id); } }}
                        onTouchStart={() => { if (isEditMode) setDraggingPortId(p.id); }}
                        disabled={!isEditMode && isTraveling}
                        onClick={() => {
                          if (dragMovedRef.current) { dragMovedRef.current = false; return; }
                          if (!isEditMode) { audioManager.playSfx('click'); setSelectedPortId(p.id); }
                        }}
                        className={`px-1.5 py-1 flex flex-col items-center transition-transform ${isCurrent || isSelected ? 'scale-115' : 'hover:scale-110'}`}
                      >
                        <div className="relative">
                          <img
                            src="/assets/map pin.webp"
                            className={`w-8 h-8 object-contain ${isCurrent ? 'drop-shadow-[0_0_8px_#f5c749] brightness-125' : isSelected ? 'drop-shadow-[0_0_8px_#ffffff] brightness-125' : 'drop-shadow-md'}`}
                            alt=""
                            draggable="false"
                          />
                          {(hasContractHere || hasRumorHere || hasRivalHere) && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1d120b] border border-[#e8be63] flex items-center justify-center text-[#f8d77d]">
                              {hasContractHere ? <IconScroll className="w-2.5 h-2.5" /> : hasRivalHere ? <IconSkull className="w-2.5 h-2.5 text-[#f06458]" /> : <IconStar className="w-2.5 h-2.5" />}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-display font-black uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded border shadow ${
                            isCurrent
                              ? 'bg-[#2a1a10] text-[#f8d77d] border-[#e8be63]'
                              : isSelected
                                ? 'bg-[#145e69] text-white border-[#78e0ee]'
                                : 'bg-[#1d120b]/85 text-[#f6ecd6] border-[#a87e3b]/60'
                          }`}
                        >
                          {p.name}
                        </span>
                      </button>
                    </div>
                  );
                })}

                {/* Wake Foam */}
                {isTraveling && wakeParticles.map(p => (
                  <div
                    key={p.id}
                    className="absolute w-3.5 h-3.5 rounded-full bg-[#d8f8ff]/65 blur-[1px] pointer-events-none animate-wake-fade z-20"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  />
                ))}

                {/* Sailing Ship Following Water Route */}
                {isTraveling && sailingShipPos && endPort && (
                  <div
                    id="sailing-ship"
                    className="absolute z-30 pointer-events-none flex flex-col items-center"
                    style={{ left: `${sailingShipPos.x}%`, top: `${sailingShipPos.y}%`, transform: 'translate(-50%, -62%)' }}
                  >
                    <div className="mb-0.5 bg-[#1d120b]/92 border border-[#c8963e] text-[9px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-[#f8d77d] shadow whitespace-nowrap flex items-center gap-1">
                      <IconWind className="w-3 h-3" /> {voyageWeather} → {endPort.name}
                    </div>
                    <ShipArt
                      tier={flagship.tier}
                      variant="player"
                      upgrades={flagship.upgrades}
                      size="map"
                      facing={sailingFacing}
                    />
                  </div>
                )}
              </div>

              {!isTraveling && !isEditMode && (
                <>
                  <button
                    onClick={() => panBy(mapScrollRef, -180)}
                    aria-label="Pan map left"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#1d120b]/75 border border-[#c8963e]/50 text-[#f8d77d] flex items-center justify-center active:scale-95"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => panBy(mapScrollRef, 180)}
                    aria-label="Pan map right"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#1d120b]/75 border border-[#c8963e]/50 text-[#f8d77d] flex items-center justify-center active:scale-95"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Docked Destination Card (Never Obscures Tunisia/Egypt) */}
            {!isTraveling && !isEditMode && (
              <div className="shrink-0 parchment rounded-t-2xl border-b-0 border-x-0 px-4 py-3 z-30">
                {!selectedPort ? (
                  <p className="text-xs font-semibold text-[#4f3823] text-center py-1">
                    Tap any port pin to chart a sea route and compare prices.
                  </p>
                ) : selectedPort.id === currentPort.id ? (
                  <p className="text-xs font-semibold text-[#4f3823] text-center py-1">
                    Docked in <strong className="text-[#8a5512]">{currentPort.name}</strong>. Select another port to set sail.
                  </p>
                ) : (
                  <div className="anim-rise space-y-1.5" key={selectedPort.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <h2 className="font-display text-lg font-black uppercase text-[#2b1d12]">{selectedPort.name}</h2>
                        <span className="text-[10px] font-bold uppercase text-[#156975]">
                          {reputationTier(player.reputation?.[selectedPort.id] || 0).label}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${selectedPort.dangerLevel >= 2 ? 'text-[#9b251c]' : 'text-[#12695b]'}`}>
                        {selectedDays} day{selectedDays === 1 ? '' : 's'} · {DANGER_TEXT[Math.min(3, selectedPort.dangerLevel)]}
                      </span>
                    </div>
                    {selectedTrade && (
                      <div className="text-xs leading-snug space-y-0.5 text-[#3f2b19]">
                        <p><strong className="text-[#96590f]">Pays well for:</strong> {selectedTrade.wants.join(', ')}</p>
                        <p><strong className="text-[#12695b]">Sells cheap:</strong> {selectedTrade.makes.join(', ')}</p>
                        {selectedWanted.length > 0 && (
                          <p className="font-extrabold text-[#8a4d09]">Hold match: they want your {selectedWanted.join(' & ')}!</p>
                        )}
                        {knownEventsAt(selectedPort.id).map(e => (
                          <p key={e.id} className="font-bold text-[#146572] italic">
                            Rumor: {e.mult > 1 ? `short of ${e.good}` : `cheap ${e.good}`} ({e.daysLeft}d left).
                          </p>
                        ))}
                      </div>
                    )}
                    {hullLow && (
                      <p className="text-[11px] text-[#9b251c] font-extrabold">
                        Warning: hull is at {hullPct}% — repair at Shipyard first!
                      </p>
                    )}
                    <button
                      onClick={() => handleTravel(selectedPort.id)}
                      className="w-full btn-brass py-3 rounded-xl font-display font-black uppercase tracking-[0.14em] text-xs"
                    >
                      Sail to {selectedPort.name}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MARKET VIEW (Warm Parchment Ledger) */}
        {tab === 'market' && (
          <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 bg-[#1c110a] anim-fade">
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
              {/* Port Market Banner */}
              <div className="parchment rounded-none border-x-0 border-t-0 px-3.5 py-2.5 shrink-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-black uppercase text-[#2b1d12] leading-tight">
                      {currentPort.name} Market
                    </h2>
                    {trade && (
                      <p className="text-[11px] text-[#4f3823] leading-snug mt-0.5">
                        <strong className="text-[#12695b]">Cheap:</strong> {trade.makes.join(', ')} ·{' '}
                        <strong className="text-[#96590f]">Wanted:</strong> {trade.wants.join(', ')}
                      </p>
                    )}
                  </div>
                  {currentCargo > 0 && (
                    <button
                      onClick={sellAllCargo}
                      className="btn-crimson px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase shrink-0"
                    >
                      Sell All
                    </button>
                  )}
                </div>

                {/* Filter Toggle */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setMarketFilter('featured')}
                    className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                      marketFilter === 'featured' ? 'bg-[#2a1a10] text-[#f8d77d] border-[#c8963e]' : 'bg-[#f4e6c7] text-[#5b4128] border-[#bfa065]'
                    }`}
                  >
                    Port Specials & Hold
                  </button>
                  <button
                    onClick={() => setMarketFilter('all')}
                    className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                      marketFilter === 'all' ? 'bg-[#2a1a10] text-[#f8d77d] border-[#c8963e]' : 'bg-[#f4e6c7] text-[#5b4128] border-[#bfa065]'
                    }`}
                  >
                    All 22 Goods
                  </button>
                </div>
              </div>

              {/* Goods Ledger */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0 bg-[#170f0a]">
                {marketOrder.map(t => {
                  const bp = buyPrice(currentPort, t, events, player);
                  const sp = sellPrice(currentPort, t, events, player);
                  const held = player.cargo[t];
                  const avgPaid = held > 0 && player.paid[t] > 0 ? Math.round(player.paid[t] / held) : null;
                  const role = tradeRole(currentPort.id, t);
                  const vsUsual = Math.round((bp / BASE_PRICES[t] - 1) * 100);
                  const canBuy = player.gold >= bp && freeSpace > 0;
                  const profit = avgPaid !== null ? sp - avgPaid : null;
                  const hasContract = player.contracts.some(c => c.good === t);
                  const hasRumor = events.some(e => e.known && e.portId === currentPort.id && e.good === t);

                  return (
                    <div
                      key={t}
                      className={`parchment-card px-3 py-2.5 rounded-2xl ${held > 0 ? 'ring-2 ring-[#e8be63]' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CommodityIcon good={t} className="w-10 h-10" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-display font-black text-sm uppercase text-[#2b1d12]">{t}</h3>
                              {role === 'makes' && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#146c54]/15 text-[#12695b]">Cheap</span>
                              )}
                              {role === 'wants' && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#b86e14]/15 text-[#8a4d09]">In Demand</span>
                              )}
                              {hasContract && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#166c78]/15 text-[#135a64]">Charter</span>
                              )}
                              {hasRumor && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#9b251c]/15 text-[#9b251c]">Rumor</span>
                              )}
                            </div>
                            <span className={`text-[10px] font-extrabold whitespace-nowrap ${vsUsual <= -10 ? 'text-[#12695b]' : vsUsual >= 10 ? 'text-[#96590f]' : 'text-[#654b32]'}`}>
                              {vsUsual <= -3 ? `${-vsUsual}% low` : vsUsual >= 3 ? `${vsUsual}% high` : 'usual'}
                            </span>
                          </div>

                          {held > 0 && (
                            <p className="text-[11px] font-bold text-[#4b331b] mt-0.5">
                              {held} in hold{avgPaid !== null ? `, paid ${avgPaid}` : ''}
                              {profit !== null && (
                                <span className={profit > 0 ? 'text-[#12695b]' : profit < 0 ? 'text-[#9b251c]' : 'text-[#654b32]'}>
                                  {' · '}{profit > 0 ? `+${profit} each if sold here` : profit < 0 ? `${profit} each if sold here` : 'break even here'}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex gap-1">
                          <HoldButton
                            onTrigger={() => buy(t, 1)}
                            disabled={!canBuy}
                            className="flex-1 btn-teal disabled:opacity-30 py-2 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-1"
                          >
                            Buy <Gold n={bp} />
                          </HoldButton>
                          <button
                            onClick={() => buy(t, 999)}
                            disabled={!canBuy}
                            className="px-2.5 bg-[#0e4952] text-[#f2f0e6] disabled:opacity-30 rounded-xl text-[10px] font-black uppercase active:scale-95"
                          >
                            Max
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <HoldButton
                            onTrigger={() => sell(t, 1)}
                            disabled={held <= 0}
                            className="flex-1 btn-crimson disabled:opacity-30 py-2 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-1"
                          >
                            Sell <Gold n={sp} />
                          </HoldButton>
                          <button
                            onClick={() => sell(t, 999)}
                            disabled={held <= 0}
                            className="px-2.5 bg-[#6e1a13] text-[#fdf6e9] disabled:opacity-30 rounded-xl text-[10px] font-black uppercase active:scale-95"
                          >
                            All
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-[#bda57a] text-center px-4 py-1">
                  Port favor and your Guild Factor reduce buy prices and boost sale profits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SHIPYARD VIEW (Ship Overhaul Showcase + Fleet & Crew) */}
        {tab === 'ship' && (
          <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 bg-[#170f0a] anim-fade">
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
              {/* Flagship Showcase */}
              <div className="parchment rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-black uppercase text-[#2b1d12] leading-tight">
                      {flagship.name}
                    </h2>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#7a4b15]">
                      {flagship.shipClass} · Tier {flagship.tier}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-b from-[#347c90] to-[#134252] border border-[#b69150] px-3 py-1.5 flex items-center justify-center shadow-inner">
                    <ShipArt
                      tier={flagship.tier}
                      variant="player"
                      upgrades={flagship.upgrades}
                      size="shipyard"
                      facing="right"
                    />
                  </div>
                </div>

                {/* Fleet Stats */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    ['Hull', `${flagship.hullHealth.current}/${flagship.hullHealth.max}`],
                    ['Hold', maxCargo],
                    ['Guns', totalFirepower(player)],
                    ['Speed', effectiveSpeed(player)],
                  ].map(([label, val]) => (
                    <div key={label} className="parchment-card rounded-xl py-1.5">
                      <div className="text-sm font-black text-[#2b1d12]">{val}</div>
                      <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#6d4918]">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="w-full bg-[#24160e] h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${hullLow ? 'bg-[#c93e32]' : 'bg-[#1f98a6]'}`}
                    style={{ width: `${hullPct}%` }}
                  />
                </div>

                <button
                  onClick={repair}
                  disabled={repairPoints <= 0}
                  className="w-full btn-teal disabled:opacity-40 py-3 rounded-xl font-display font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                >
                  {hullDamage <= 0 ? 'Hull Is Sound' : repairPoints <= 0 ? 'Not Enough Gold to Repair' : (<>Repair Hull <Gold n={repairCost} /></>)}
                </button>
              </div>

              {/* Sub-tabs: Upgrades vs Fleet & Crew */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShipSubTab('upgrades')}
                  className={`py-2.5 rounded-xl font-display text-xs font-black uppercase tracking-wider border ${
                    shipSubTab === 'upgrades' ? 'btn-brass' : 'bg-[#2a1a10] text-[#d6c29f] border-[#a87e3b]/50'
                  }`}
                >
                  Ship Upgrades ({flagship.upgrades.length}/4)
                </button>
                <button
                  onClick={() => setShipSubTab('fleet')}
                  className={`py-2.5 rounded-xl font-display text-xs font-black uppercase tracking-wider border ${
                    shipSubTab === 'fleet' ? 'btn-brass' : 'bg-[#2a1a10] text-[#d6c29f] border-[#a87e3b]/50'
                  }`}
                >
                  Fleet & Crew ({player.escorts.length + player.officers.length})
                </button>
              </div>

              {shipSubTab === 'upgrades' ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#d6c29f] px-1">
                    {nextClass
                      ? `Fit all four upgrades to rebuild her as a ${nextClass}.`
                      : 'She is a Galleon — the finest class on the Mediterranean.'}
                  </p>
                  {upgrades.map(u => {
                    const isOwned = flagship.upgrades.includes(u.id);
                    const canAfford = player.gold >= u.cost;
                    return (
                      <div key={u.id} className={`parchment-card p-3.5 rounded-2xl flex justify-between items-center gap-3 ${isOwned ? 'opacity-65' : ''}`}>
                        <div className="min-w-0">
                          <h4 className="font-display font-black text-sm uppercase text-[#2b1d12]">{u.label}</h4>
                          <p className="text-xs text-[#5d4229]">{u.description}</p>
                        </div>
                        <button
                          onClick={() => buyUpgrade(u.id)}
                          disabled={isOwned || !canAfford}
                          className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase ${
                            isOwned ? 'bg-[#12695b] text-white' : canAfford ? 'btn-brass' : 'bg-[#c9b795] text-[#6d5c43]'
                          }`}
                        >
                          {isOwned ? 'Fitted' : <Gold n={u.cost} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e8be63] px-1">
                      Hire Officers
                    </h3>
                    {OFFICERS.map(off => {
                      const hired = player.officers.includes(off.id);
                      const canAfford = player.gold >= off.cost;
                      return (
                        <div key={off.id} className={`parchment-card p-3.5 rounded-2xl flex justify-between items-center gap-3 ${hired ? 'opacity-70' : ''}`}>
                          <div className="min-w-0">
                            <div className="font-display font-black text-sm text-[#2b1d12]">{off.name}</div>
                            <div className="text-[10px] font-extrabold uppercase text-[#7d4f0a]">{off.role}</div>
                            <p className="text-xs text-[#5d4229] mt-0.5">{off.perk}</p>
                          </div>
                          <button
                            onClick={() => hireOfficer(off.id)}
                            disabled={hired || !canAfford}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase ${
                              hired ? 'bg-[#12695b] text-white' : canAfford ? 'btn-teal' : 'bg-[#c9b795] text-[#6d5c43]'
                            }`}
                          >
                            {hired ? 'Hired' : <Gold n={off.cost} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e8be63] px-1">
                      Escort Ships ({player.escorts.length}/2)
                    </h3>
                    {ESCORTS.map(esc => {
                      const full = player.escorts.length >= 2;
                      const canAfford = player.gold >= esc.cost;
                      return (
                        <div key={esc.id} className="parchment-card p-3.5 rounded-2xl flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <div className="font-display font-black text-sm text-[#2b1d12]">{esc.shipClass}</div>
                            <p className="text-xs text-[#5d4229] mt-0.5">{esc.description}</p>
                          </div>
                          <button
                            onClick={() => buyEscort(esc)}
                            disabled={full || !canAfford}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase ${
                              !full && canAfford ? 'btn-brass' : 'bg-[#c9b795] text-[#6d5c43]'
                            }`}
                          >
                            {full ? 'Max 2' : <Gold n={esc.cost} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CANTINA VIEW */}
        {tab === 'cantina' && (
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0 bg-[#170f0a] anim-fade">
            <CantinaGames
              gold={player.gold}
              rumors={rumors}
              defaultGame={defaultPubGame}
              onBribe={() => {
                if (player.gold < 50) return;
                audioManager.playSfx('coin');
                setG(prev => learnRumor({ ...prev, player: { ...prev.player, gold: prev.player.gold - 50 } }));
              }}
              onSpendStake={(amt) => setG(prev => ({ ...prev, player: { ...prev.player, gold: prev.player.gold - amt } }))}
              onFinishGame={(win, mode, stake) => {
                if (!win) return;
                if (mode === 'gold') {
                  setG(prev => ({ ...prev, player: { ...prev.player, gold: prev.player.gold + stake * 2 } }));
                } else {
                  setG(prev => learnRumor({ ...prev, player: { ...prev.player, gold: prev.player.gold + stake } }));
                }
              }}
              onPlaySfx={(name) => audioManager.playSfx(name)}
            />
          </div>
        )}

        {/* TACTICAL BATTLE STAGE */}
        {tab === 'battle' && battle && (
          <BattleStage
            player={player}
            flagship={flagship}
            battle={battle}
            ports={ports}
            cannonball={cannonball}
            shake={shake}
            hitEffect={hitEffect}
            onAimedShot={handleAimedShot}
            onBrace={handleBrace}
            onBoard={handleBoard}
            onFlee={handleFlee}
            onTribute={handleTribute}
            onArrive={() => arrive(battle.destId, battle.days)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`absolute ${tab === 'port' ? 'top-14' : 'bottom-3'} left-4 right-4 z-40 flex justify-center pointer-events-none`}>
            <div className="parchment px-4 py-2 rounded-2xl text-xs font-extrabold text-[#2b1d12] shadow-2xl text-center anim-rise">
              {toast}
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM WOOD NAVIGATION */}
      <nav className="wood-bar border-t z-40 shrink-0 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV.map(item => {
          const active = tab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => changeTab(item.tab)}
              disabled={locked}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active ? 'text-[#f8d77d] bg-[#3b2415]' : 'text-[#c2ab84]'
              } ${locked ? 'opacity-35' : 'active:bg-[#331f12]'}`}
            >
              {item.icon}
              <span className="text-[9px] font-display font-black uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* CAPTAIN'S LEDGER MODAL */}
      {ledgerOpen && (
        <LedgerModal
          g={g}
          onClose={() => setLedgerOpen(false)}
          onAcceptContract={handleAcceptContract}
          onClaimContract={handleClaimContract}
          onHuntRival={handleHuntRival}
        />
      )}

      {/* MID-VOYAGE SEA ENCOUNTER */}
      {pendingSeaEvent && (
        <VoyageEventModal
          event={pendingSeaEvent.event}
          destId={pendingSeaEvent.destId}
          g={g}
          onApply={(nextState) => setG(nextState)}
          onContinue={continueAfterSeaEvent}
        />
      )}

      {/* CAPTAIN'S MENU */}
      {menuOpen && (
        <div className="absolute inset-0 bg-[#0c161f]/85 z-50 flex items-center justify-center p-5 anim-fade" onClick={() => setMenuOpen(false)}>
          <div className="wood-panel p-5 rounded-3xl w-full max-w-xs space-y-2.5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-black uppercase tracking-wider text-[#f8d77d] text-center">
              Captain's Menu
            </h2>
            <button
              onClick={() => {
                const muted = audioManager.toggleMute();
                setIsMuted(muted);
                if (!muted) audioManager.playSfx('click');
              }}
              className="menu-btn flex items-center gap-2"
            >
              <IconSound muted={isMuted} className="w-4 h-4" />
              {isMuted ? 'Sound Is Off' : 'Sound Is On'}
            </button>
            <button onClick={() => { setMenuOpen(false); setShowGuide(true); }} className="menu-btn">
              How to Play
            </button>
            <button onClick={() => { setMenuOpen(false); setLedgerOpen(true); }} className="menu-btn">
              Open Captain's Ledger
            </button>
            <button onClick={restartGame} className="menu-btn">
              Start a New Voyage
            </button>
            <details className="pt-1">
              <summary className="text-[10px] font-bold uppercase tracking-widest text-[#bda57a] cursor-pointer text-center">
                Builder Tools
              </summary>
              <div className="space-y-2 mt-2">
                <button
                  onClick={() => { setIsEditMode(v => !v); setMenuOpen(false); if (tab !== 'port' && tab !== 'map') setTab('port'); }}
                  className="menu-btn"
                >
                  {isEditMode ? 'Leave Layout Editor' : 'Move Buildings & Pins'}
                </button>
                <button onClick={handleExport} className="menu-btn">Copy Save Data</button>
                <button onClick={handleImport} className="menu-btn">Paste Save Data</button>
              </div>
            </details>
            <button onClick={() => setMenuOpen(false)} className="w-full btn-brass py-3 rounded-xl font-display font-black uppercase tracking-wider text-xs mt-1">
              Close
            </button>
          </div>
        </div>
      )}

      {/* HOW TO PLAY */}
      {guideOpen && player.hasReadPrologue && (
        <div className="absolute inset-0 bg-[#0c161f]/85 z-50 flex items-center justify-center p-5 anim-fade">
          <div className="parchment p-5 rounded-3xl w-full max-w-sm space-y-3.5">
            <h2 className="font-display text-xl font-black uppercase text-[#2b1d12] text-center">
              Win Back the Family Name
            </h2>
            <p className="text-xs font-semibold text-[#5d4229] text-center">
              Turn 500 gold into {GOAL.toLocaleString()} or defeat all four Syndicate captains.
            </p>
            <ol className="space-y-2.5 text-xs text-[#2b1d12] leading-snug">
              <li className="flex gap-2.5 items-start">
                <IconScales className="w-4 h-4 text-[#12695b] shrink-0 mt-0.5" />
                <span><strong>Buy cheap, sell dear.</strong> Each port sells three local goods cheap and pays top gold for three imports.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <IconCompass className="w-4 h-4 text-[#8a4d09] shrink-0 mt-0.5" />
                <span><strong>Chart real sea lanes.</strong> Pick ports on the map, take harbor charters from the Ledger, and earn port favor.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <IconHammer className="w-4 h-4 text-[#2b1d12] shrink-0 mt-0.5" />
                <span><strong>Upgrade & recruit.</strong> Evolve your Tartane up to a Galleon, hire officers, and add escort ships.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <IconSkull className="w-4 h-4 text-[#9b251c] shrink-0 mt-0.5" />
                <span><strong>Outmaneuver pirates.</strong> Time your broadside bar, use Chain Shot to cripple foes, or board crippled ships.</span>
              </li>
            </ol>
            <button onClick={closeGuide} className="w-full btn-brass py-3.5 rounded-xl font-display font-black uppercase tracking-[0.14em] text-xs">
              Set to Work
            </button>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {notice && (
        <div className="absolute inset-0 bg-[#0c161f]/85 z-50 flex items-center justify-center p-5 anim-fade">
          <div className="parchment p-5 rounded-3xl w-full max-w-sm text-center space-y-3">
            <h2 className="font-display text-lg font-black uppercase text-[#9b251c]">{notice.title}</h2>
            <p className="text-xs text-[#2b1d12] leading-relaxed">{notice.body}</p>
            <button
              onClick={() => { audioManager.playSfx('click'); setNotice(null); }}
              className="w-full btn-brass py-3 rounded-xl font-display font-black uppercase tracking-wider text-xs"
            >
              Carry On
            </button>
          </div>
        </div>
      )}

      {/* INTRO */}
      {!player.hasReadPrologue && (
        <PrologueStoryboard onComplete={() => setG(prev => ({ ...prev, player: { ...prev.player, hasReadPrologue: true } }))} />
      )}

      {/* VICTORY */}
      {victoryReached && (
        <div className="absolute inset-0 bg-[#0c161f]/90 z-50 flex items-center justify-center p-5 anim-fade">
          <div className="parchment p-6 rounded-3xl max-w-sm w-full text-center space-y-3 max-h-full overflow-y-auto">
            <h2 className="font-display text-2xl font-black uppercase text-[#8a4d09]">Merchant Prince!</h2>
            <p className="text-xs text-[#2b1d12] leading-relaxed">
              {allRivalsDefeated
                ? 'With Lord Valerio defeated and the Syndicate shattered, every port on the Mediterranean salutes your flagship.'
                : `With ${player.gold.toLocaleString()} gold you buy out the Syndicate and reclaim your family's honor from Venice to Egypt.`}
            </p>
            <div className="parchment-card rounded-xl p-3 flex justify-between text-xs font-bold text-[#2b1d12]">
              <span>Days at Sea</span>
              <span>{player.gameDay}</span>
            </div>
            <button
              onClick={() => setG(prev => ({ ...prev, player: { ...prev.player, hasWonGame: true } }))}
              className="w-full btn-teal py-3 rounded-xl font-display font-black uppercase tracking-wider text-xs"
            >
              Keep Sailing
            </button>
            <button onClick={restartGame} className="w-full btn-brass py-3.5 rounded-xl font-display font-black uppercase tracking-wider text-xs">
              Start a New Voyage
            </button>
          </div>
        </div>
      )}

      {/* SHIP CLASS EVOLUTION */}
      {evolved && (
        <div className="absolute inset-0 bg-[#0c161f]/90 z-[55] flex items-center justify-center p-5 anim-fade">
          <div className="parchment p-6 rounded-3xl max-w-sm w-full text-center space-y-3 max-h-full overflow-y-auto">
            <h2 className="font-display text-2xl font-black uppercase text-[#146572]">A New Ship!</h2>
            <div className="rounded-2xl bg-gradient-to-b from-[#347c90] to-[#134252] border border-[#b69150] py-4 flex justify-center">
              <ShipArt tier={evolved.ship.tier} variant="player" upgrades={evolved.ship.upgrades} size="shipyard" facing="right" />
            </div>
            <p className="font-display text-base font-black text-[#2b1d12]">
              <span className="line-through text-[#7a6448] text-xs mr-2">{evolved.oldClass}</span>
              {evolved.ship.shipClass}
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                ['Hull', evolved.ship.hullHealth.max],
                ['Hold', evolved.ship.cargoCapacity],
                ['Guns', evolved.ship.firepower],
                ['Speed', evolved.ship.speed],
              ].map(([label, val]) => (
                <div key={label} className="parchment-card rounded-xl py-1.5">
                  <div className="text-sm font-black text-[#146572]">{val}</div>
                  <div className="text-[9px] font-extrabold uppercase text-[#6d4918]">{label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setEvolved(null)} className="w-full btn-brass py-3.5 rounded-xl font-display font-black uppercase tracking-wider text-xs">
              Take the Helm
            </button>
          </div>
        </div>
      )}

      {showAmbushIndicator && <div className="absolute inset-0 bg-[#b83227]/45 z-[60] pointer-events-none animate-flash-shake" />}
    </div>
  );
};

export default App;
