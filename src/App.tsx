import React, { useState, useEffect, useRef } from 'react';
import { PrologueStoryboard } from './components/PrologueStoryboard';
import { AnimatedMarker } from './components/AnimatedMarker';
import { audioManager } from './engine/AudioManager';
import {
  GOAL, COMMODITIES, BASE_PRICES, PORT_TRADE, SHIP_CLASSES, REPAIR_COST_PER_POINT,
  loadGame, saveGame, clearSave, buyGoods, sellGoods, buyPrice, sellPrice, cargoCount, netWorth, rankFor,
  advanceDays, learnRumor, voyageDays, rollAmbush, routeTip, tradeRole, emptyCargo, pickMinigame,
  getUpgradesForTier, applyUpgrade, getShipImageByClass, generateEnemy, generateLoot, rollShot, fleeChance, rollFlee, tributeCost,
} from './game';
import type { GameState, Port, Building, Ship, CommodityType, Loot } from './game';

type Tab = 'port' | 'market' | 'ship' | 'cantina' | 'map' | 'battle';

type MinigameResult = {
  win: boolean;
  playerRoll?: number;
  barkeepRoll?: number;
  flip?: string;
  choice?: string;
};

interface BattleState {
  enemy: Ship;
  loot: Loot;
  log: string;
  tone: 'bad' | 'good' | 'info';
  phase: 'player' | 'busy' | 'won' | 'lost' | 'escaped';
  originId: string;
  destId: string;
  days: number;
}

const NAV: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'port', label: 'Port', icon: '⚓' },
  { tab: 'market', label: 'Market', icon: '⚖️' },
  { tab: 'ship', label: 'Shipyard', icon: '🔨' },
  { tab: 'cantina', label: 'Cantina', icon: '🍺' },
  { tab: 'map', label: 'Set Sail', icon: '🧭' },
];

const MINIGAME_NAMES: Record<string, string> = { dice: "Captain's Dice", coin: 'Heads or Tails', arm: 'Arm Wrestling' };

const DANGER_TEXT = ['Calm waters', 'Calm waters', 'Pirate waters', 'Dangerous waters'];

const getShipSizeStyle = (shipClass: string): React.CSSProperties => {
  if (shipClass === 'Schooner' || shipClass === 'Sloop') return { width: '55px', height: '55px' };
  if (shipClass === 'Brigantine') return { width: '75px', height: '75px' };
  if (shipClass === 'Frigate') return { width: '95px', height: '95px' };
  return { width: '120px', height: '120px' };
};

/** A gold amount with a small coin in front of it. */
const Gold: React.FC<{ n: number; className?: string }> = ({ n, className }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className || ''}`}>
    <span className="coin" aria-hidden="true" />
    {n.toLocaleString()}
  </span>
);

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onTrigger: () => void;
}

/** Tap once, or hold down to keep going. */
const HoldButton: React.FC<HoldButtonProps> = ({ onTrigger, children, disabled, ...props }) => {
  const trigger = useRef(onTrigger);
  useEffect(() => {
    trigger.current = onTrigger;
  }, [onTrigger]);
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
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
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

const BackdropImage: React.FC<{ src: string }> = ({ src }) => (
  <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
    <img src={src} className="w-full h-full object-cover blur-md" alt="" />
    <div className="absolute inset-0 bg-slate-950/60" />
  </div>
);

const App: React.FC = () => {
  const [g, setG] = useState<GameState>(loadGame);
  const gRef = useRef(g);
  useEffect(() => {
    gRef.current = g;
    saveGame(g);
  }, [g]);

  const [tab, setTab] = useState<Tab>('port');
  const [battle, setBattle] = useState<BattleState | null>(null);
  const battleRef = useRef(battle);
  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(audioManager.getMuted());
  const [evolved, setEvolved] = useState<{ oldClass: string; ship: Ship } | null>(null);

  // Layout editor (for placing the buildings and map pins)
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingBuildingId, setDraggingBuildingId] = useState<string | null>(null);
  const [resizingBuildingId, setResizingBuildingId] = useState<string | null>(null);
  const [draggingPortId, setDraggingPortId] = useState<string | null>(null);

  // Sailing
  const [isTraveling, setIsTraveling] = useState(false);
  const [targetPortId, setTargetPortId] = useState<string | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [sailingShipPos, setSailingShipPos] = useState<{ x: number; y: number } | null>(null);
  const [enemySailingShipPos, setEnemySailingShipPos] = useState<{ x: number; y: number } | null>(null);
  const [showAmbushIndicator, setShowAmbushIndicator] = useState(false);
  const [wakeParticles, setWakeParticles] = useState<Array<{ id: number; x: number; y: number; scale: number }>>([]);

  // Battle effects
  const [cannonball, setCannonball] = useState<{ from: 'player' | 'enemy' } | null>(null);
  const [shake, setShake] = useState<'player' | 'enemy' | null>(null);
  const [hitEffect, setHitEffect] = useState<'player' | 'enemy' | null>(null);
  const [showEnemyCargo, setShowEnemyCargo] = useState(false);

  // Cantina games
  const [currentMinigameType, setCurrentMinigameType] = useState<string>('dice');
  const [activeMinigame, setActiveMinigame] = useState<string | null>(null);
  const [minigameResult, setMinigameResult] = useState<MinigameResult | null>(null);
  const [minigameMode, setMinigameMode] = useState<'gossip' | 'gold'>('gossip');
  const [minigameBet, setMinigameBet] = useState<number>(10);
  const [armWrestlePos, setArmWrestlePos] = useState(50);
  const armDirRef = useRef(1);
  const armResolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armResolvedRef = useRef(false);
  const armVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isArmWrestleResolving, setIsArmWrestleResolving] = useState(false);
  const [armWrestleOutcome, setArmWrestleOutcome] = useState<boolean | null>(null);
  const [playDirection, setPlayDirection] = useState<'forward' | 'reverse'>('forward');

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const portScrollRef = useRef<HTMLDivElement | null>(null);
  const mapScrollRef = useRef<HTMLDivElement | null>(null);
  const isMouseDownRef = useRef(false);
  const dragMovedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const { player, ports, events, rumors } = g;
  const currentPort = ports.find(p => p.id === player.currentPortId) || ports[0];
  const flagship = player.fleet[0];
  const flagshipImage = getShipImageByClass(flagship.shipClass);
  const currentCargo = cargoCount(player);
  const freeSpace = flagship.cargoCapacity - currentCargo;
  const hullPct = Math.round((flagship.hullHealth.current / flagship.hullHealth.max) * 100);
  const hullLow = hullPct <= 35;
  const rank = rankFor(netWorth(player));
  const trade = PORT_TRADE[currentPort.id];
  const locked = isTraveling || tab === 'battle';

  const changeTab = (next: Tab) => {
    if (locked) return;
    audioManager.playSfx('click');
    setSelectedPortId(null);
    if (next === 'cantina') {
      setCurrentMinigameType(pickMinigame());
    } else {
      setActiveMinigame(null);
      setMinigameResult(null);
    }
    setTab(next);
  };

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

  // --- SHIPYARD ---

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
      }, 500);
    }
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
      say('Layout and progress copied. Paste it into Import on your other device.');
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
      say('That text is not a saved game. Copy it again from Export.');
    }
  };

  const restartGame = () => {
    if (!window.confirm('Start over from day 1? Your gold, ship and cargo will be lost.')) return;
    // The building and pin positions are part of the game board, so they are kept.
    const layout = gRef.current.ports.map(p => ({ id: p.id, x: p.x, y: p.y, buildings: p.buildings }));
    clearSave();
    localStorage.setItem('med_merchants_ports', JSON.stringify(layout));
    window.location.reload();
  };

  // --- PORT VIEW ---

  const handlePortMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: (e.clientX - rect.left) / rect.width - 0.5, y: (e.clientY - rect.top) / rect.height - 0.5 });
  };

  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    const container = e.currentTarget;
    isMouseDownRef.current = true;
    dragMovedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
    container.style.cursor = 'grabbing';
  };

  const handlePanMouseMove = (e: React.MouseEvent<HTMLDivElement>, isPort: boolean) => {
    if (isEditMode) {
      handleDragMove(e);
      return;
    }
    if (isPort) handlePortMouseMove(e);
    if (!isMouseDownRef.current) return;
    e.preventDefault();
    const container = e.currentTarget;
    const dx = e.pageX - container.offsetLeft - startXRef.current;
    if (Math.abs(dx) > 6) dragMovedRef.current = true;
    container.scrollLeft = scrollLeftRef.current - dx * 1.5;
  };

  const handlePanMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) {
      handleDragEnd();
      return;
    }
    isMouseDownRef.current = false;
    e.currentTarget.style.cursor = '';
  };

  const centerScroll = (container: HTMLDivElement | null, xPercent: number, smooth: boolean) => {
    if (!container || container.clientWidth === 0) return;
    container.scrollTo({ left: (xPercent / 100) * container.scrollWidth - container.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Open the port view centred on your ship.
  useEffect(() => {
    if (tab !== 'port' || isEditMode) return;
    const shipX = currentPort.buildings.find(b => b.id === 'sail')?.x ?? 50;
    const center = () => centerScroll(portScrollRef.current, shipX, false);
    center();
    const timer = setTimeout(center, 200);
    window.addEventListener('resize', center);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', center);
    };
  }, [tab, player.currentPortId, isEditMode]);

  // Open the map centred on the port you are in.
  useEffect(() => {
    if (tab !== 'map' || isEditMode) return;
    const center = () => centerScroll(mapScrollRef.current, currentPort.x, false);
    center();
    const timer = setTimeout(center, 200);
    window.addEventListener('resize', center);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', center);
    };
  }, [tab, player.currentPortId, isEditMode]);

  // While dragging a building or pin in the layout editor, stop the picture from scrolling.
  useEffect(() => {
    const containers = [portScrollRef.current, mapScrollRef.current].filter(Boolean) as HTMLDivElement[];
    const block = (e: TouchEvent) => {
      if (isEditMode && (draggingBuildingId || resizingBuildingId || draggingPortId) && e.cancelable) e.preventDefault();
    };
    containers.forEach(c => c.addEventListener('touchmove', block, { passive: false }));
    return () => containers.forEach(c => c.removeEventListener('touchmove', block));
  }, [tab, isEditMode, draggingBuildingId, resizingBuildingId, draggingPortId]);

  // The map follows the ship while it sails.
  useEffect(() => {
    if (!isTraveling || !mapScrollRef.current) return;
    let active = true;
    const follow = () => {
      if (!active) return;
      const shipEl = document.getElementById('sailing-ship');
      const container = mapScrollRef.current;
      if (shipEl && container) {
        const rect = shipEl.getBoundingClientRect();
        const box = container.getBoundingClientRect();
        const target = container.scrollLeft + rect.left - box.left + rect.width / 2 - container.clientWidth / 2;
        container.scrollLeft += (target - container.scrollLeft) * 0.08;
      }
      requestAnimationFrame(follow);
    };
    follow();
    return () => { active = false; };
  }, [isTraveling]);

  // Foam behind the sailing ship.
  useEffect(() => {
    if (!isTraveling || !mapScrollRef.current) return;
    const interval = setInterval(() => {
      const shipEl = document.getElementById('sailing-ship');
      const container = mapScrollRef.current;
      if (!shipEl || !container || !container.scrollWidth || !container.clientHeight) return;
      const rect = shipEl.getBoundingClientRect();
      const box = container.getBoundingClientRect();
      const x = ((container.scrollLeft + rect.left - box.left + rect.width / 2) / container.scrollWidth) * 100;
      const y = ((rect.top - box.top + rect.height / 2) / container.clientHeight) * 100;
      setWakeParticles(prev => [...prev, { id: Math.random(), x, y, scale: 0.5 + Math.random() * 0.6 }].slice(-25));
    }, 100);
    return () => {
      clearInterval(interval);
      setWakeParticles([]);
    };
  }, [isTraveling]);

  // --- SAILING ---

  const arrive = (destId: string, days: number, message?: string) => {
    const dest = gRef.current.ports.find(p => p.id === destId);
    setG(prev => advanceDays({
      ...prev,
      player: { ...prev.player, currentPortId: destId, gameDay: prev.player.gameDay + days, voyages: prev.player.voyages + 1 },
    }, days));
    setIsTraveling(false);
    setTargetPortId(null);
    setSelectedPortId(null);
    setSailingShipPos(null);
    setEnemySailingShipPos(null);
    setBattle(null);
    setTab('port');
    say(message || `Arrived in ${dest?.name || 'port'} after ${days} day${days === 1 ? '' : 's'} at sea.`);
  };

  const handleTravel = (destId: string) => {
    if (isTraveling) return;
    const start = currentPort;
    const dest = ports.find(p => p.id === destId);
    if (!dest || dest.id === start.id) return;
    const days = voyageDays(start, dest);
    audioManager.playSfx('sail');
    setSelectedPortId(null);
    setTargetPortId(destId);
    setIsTraveling(true);
    setWakeParticles([]);
    setShowAmbushIndicator(false);
    setEnemySailingShipPos(null);
    setSailingShipPos({ x: start.x, y: start.y });
    const ambushed = rollAmbush(dest, days, player.voyages);
    setTimeout(() => {
      if (!ambushed) {
        setSailingShipPos({ x: dest.x, y: dest.y });
        setTimeout(() => arrive(destId, days), 3000);
        return;
      }
      // Pirates cut you off 60% of the way there.
      const meetX = start.x + (dest.x - start.x) * 0.6;
      const meetY = start.y + (dest.y - start.y) * 0.6;
      setEnemySailingShipPos({ x: meetX + (dest.x > start.x ? 15 : -15), y: meetY + (dest.y > start.y ? -12 : 12) });
      setSailingShipPos({ x: meetX, y: meetY });
      setTimeout(() => setEnemySailingShipPos({ x: meetX, y: meetY }), 100);
      setTimeout(() => {
        setShowAmbushIndicator(true);
        setShake('player');
        setTimeout(() => setShake(null), 500);
        setTimeout(() => {
          const enemy = generateEnemy(dest.dangerLevel, gRef.current.player.fleet[0].tier);
          setBattle({
            enemy,
            loot: generateLoot(enemy),
            log: `Ambush! ${enemy.name}, a pirate ${enemy.shipClass.toLowerCase()}, cuts you off.`,
            tone: 'bad',
            phase: 'player',
            originId: start.id,
            destId,
            days,
          });
          setIsTraveling(false);
          setEnemySailingShipPos(null);
          setSailingShipPos(null);
          setShowAmbushIndicator(false);
          setShowEnemyCargo(false);
          setTab('battle');
        }, 600);
      }, 2000);
    }, 50);
  };

  // --- BATTLE ---

  const updateBattle = (changes: Partial<BattleState>) => setBattle(prev => (prev ? { ...prev, ...changes } : prev));

  const impact = (side: 'player' | 'enemy') => {
    setShake(side);
    setHitEffect(side);
    setTimeout(() => setShake(null), 350);
    setTimeout(() => setHitEffect(null), 600);
  };

  const loseBattle = () => {
    const b = battleRef.current;
    if (!b) return;
    audioManager.playSfx('defeat');
    updateBattle({ phase: 'lost', tone: 'bad', log: 'Your ship is beaten. The pirates swarm aboard and empty the hold.' });
    setTimeout(() => {
      const before = gRef.current.player;
      const goldTaken = Math.floor(before.gold * 0.3);
      // Nobody is left with nothing: other merchants stake a beaten captain enough to trade again.
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
            fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: Math.max(1, Math.round(ship.hullHealth.max * 0.25)) } }],
          },
        }, 1);
      });
      setBattle(null);
      setTargetPortId(null);
      setTab('port');
      setNotice({
        title: 'Towed back to port',
        body: `Fishermen towed your ship back to ${origin?.name || 'port'}. The pirates took your cargo${before.gold - goldLeft > 0 ? ` and ${(before.gold - goldLeft).toLocaleString()} gold` : ''}. Patch the hull at the Shipyard before you sail again.`,
      });
    }, 2600);
  };

  const enemyFires = (prefix = '') => {
    const b = battleRef.current;
    if (!b) return;
    audioManager.playSfx('cannon');
    setCannonball({ from: 'enemy' });
    setTimeout(() => {
      setCannonball(null);
      const now = battleRef.current;
      if (!now) return;
      const shot = rollShot(now.enemy.firepower - 1);
      if (shot.kind === 'miss') {
        updateBattle({ phase: 'player', tone: 'info', log: `${prefix}${now.enemy.name} fires and misses. Your move.` });
        return;
      }
      audioManager.playSfx('hit');
      impact('player');
      const hull = Math.max(0, gRef.current.player.fleet[0].hullHealth.current - shot.damage);
      setG(prev => {
        const ship = prev.player.fleet[0];
        return { ...prev, player: { ...prev.player, fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: Math.max(0, ship.hullHealth.current - shot.damage) } }] } };
      });
      if (hull <= 0) {
        loseBattle();
      } else {
        updateBattle({ phase: 'player', tone: 'bad', log: `${prefix}${now.enemy.name} ${shot.kind === 'crit' ? 'lands a crushing broadside' : 'hits you'} for ${shot.damage}. Your move.` });
      }
    }, 600);
  };

  const handleFire = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    updateBattle({ phase: 'busy' });
    audioManager.playSfx('cannon');
    setCannonball({ from: 'player' });
    setTimeout(() => {
      setCannonball(null);
      const now = battleRef.current;
      if (!now) return;
      const shot = rollShot(gRef.current.player.fleet[0].firepower);
      if (shot.kind === 'miss') {
        updateBattle({ tone: 'info', log: 'Your shot splashes short.' });
        setTimeout(() => enemyFires(), 700);
        return;
      }
      audioManager.playSfx('hit');
      impact('enemy');
      const enemyHull = Math.max(0, now.enemy.hullHealth.current - shot.damage);
      const enemy = { ...now.enemy, hullHealth: { ...now.enemy.hullHealth, current: enemyHull } };
      if (enemyHull > 0) {
        updateBattle({ enemy, tone: 'good', log: `${shot.kind === 'crit' ? 'A perfect broadside!' : 'A hit!'} ${shot.damage} damage to ${now.enemy.name}.` });
        setTimeout(() => enemyFires(), 700);
        return;
      }
      // Victory: take their gold and as much of their cargo as the hold has room for.
      const space = gRef.current.player.fleet[0].cargoCapacity - cargoCount(gRef.current.player);
      const taken = Math.max(0, Math.min(now.loot.amount, space));
      audioManager.playSfx('victory');
      setG(prev => ({
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold + now.loot.gold,
          cargo: { ...prev.player.cargo, [now.loot.good]: prev.player.cargo[now.loot.good] + taken },
        },
      }));
      const cargoLine = taken > 0
        ? ` and ${taken} ${now.loot.good}${taken < now.loot.amount ? ' (the hold is full)' : ''}`
        : now.loot.amount > 0 ? '. No room in the hold for their cargo' : '';
      updateBattle({ enemy, phase: 'won', tone: 'good', log: `Victory! You take ${now.loot.gold.toLocaleString()} gold${cargoLine}.` });
    }, 600);
  };

  const handleFlee = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    audioManager.playSfx('sail');
    if (rollFlee(flagship, b.enemy)) {
      updateBattle({ phase: 'escaped', tone: 'good', log: 'You catch the wind and leave them behind.' });
      setTimeout(() => arrive(b.destId, b.days), 1400);
    } else {
      updateBattle({ phase: 'busy', tone: 'bad', log: 'They are too fast. You cannot shake them.' });
      setTimeout(() => enemyFires('No escape. '), 900);
    }
  };

  const handleTribute = () => {
    const b = battleRef.current;
    if (!b || b.phase !== 'player') return;
    const cost = tributeCost(player.gold, b.enemy);
    if (player.gold < cost) return;
    audioManager.playSfx('coin');
    setG(prev => ({ ...prev, player: { ...prev.player, gold: Math.max(0, prev.player.gold - cost) } }));
    updateBattle({ phase: 'escaped', tone: 'info', log: `You toss over ${cost.toLocaleString()} gold. The pirates wave you through.` });
    setTimeout(() => arrive(b.destId, b.days), 1400);
  };

  // --- CANTINA ---

  const bribe = () => {
    if (player.gold < 50) return;
    audioManager.playSfx('coin');
    setG(prev => learnRumor({ ...prev, player: { ...prev.player, gold: prev.player.gold - 50 } }));
  };

  // The arm wrestling marker sweeps back and forth.
  useEffect(() => {
    if (activeMinigame !== 'arm' || minigameResult || isArmWrestleResolving) return;
    const interval = setInterval(() => {
      setArmWrestlePos(prev => {
        const next = prev + 5 * armDirRef.current;
        if (next >= 90) { armDirRef.current = -1; return 90; }
        if (next <= 10) { armDirRef.current = 1; return 10; }
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [activeMinigame, minigameResult, isArmWrestleResolving]);

  useEffect(() => {
    return () => {
      if (armResolveTimerRef.current) clearTimeout(armResolveTimerRef.current);
    };
  }, []);

  // The arm wrestling video rocks forward and back over its first two seconds until you slam.
  useEffect(() => {
    const video = armVideoRef.current;
    if (activeMinigame !== 'arm' || minigameResult || isArmWrestleResolving || !video) return;
    let rafId = 0;
    let active = true;
    if (playDirection === 'forward') {
      const checkTime = () => {
        if (!active) return;
        if (video.currentTime >= 1.95) {
          video.pause();
          video.currentTime = 1.95;
          setPlayDirection('reverse');
          return;
        }
        rafId = requestAnimationFrame(checkTime);
      };
      video.play().catch(() => {});
      rafId = requestAnimationFrame(checkTime);
    } else {
      video.pause();
      let lastTick = performance.now();
      const runReverse = () => {
        if (!active) return;
        const now = performance.now();
        const nextTime = video.currentTime - (now - lastTick) / 1000;
        lastTick = now;
        if (nextTime <= 0.05) {
          video.currentTime = 0;
          setPlayDirection('forward');
        } else {
          video.currentTime = nextTime;
          rafId = requestAnimationFrame(runReverse);
        }
      };
      rafId = requestAnimationFrame(runReverse);
    }
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [activeMinigame, minigameResult, isArmWrestleResolving, playDirection]);

  const startMinigame = () => {
    if (player.gold < minigameBet) return;
    audioManager.playSfx('coin');
    setG(prev => ({ ...prev, player: { ...prev.player, gold: prev.player.gold - minigameBet } }));
    setMinigameResult(null);
    armDirRef.current = 1;
    armResolvedRef.current = false;
    if (armResolveTimerRef.current) {
      clearTimeout(armResolveTimerRef.current);
      armResolveTimerRef.current = null;
    }
    setArmWrestlePos(50);
    setIsArmWrestleResolving(false);
    setArmWrestleOutcome(null);
    setPlayDirection('forward');
    setActiveMinigame(currentMinigameType);
  };

  const finishMinigame = (win: boolean, result: Omit<MinigameResult, 'win'>) => {
    audioManager.playSfx(win ? 'victory' : 'defeat');
    setMinigameResult({ ...result, win });
    if (!win) return;
    if (minigameMode === 'gold') {
      setG(prev => ({ ...prev, player: { ...prev.player, gold: prev.player.gold + minigameBet * 2 } }));
    } else {
      // Playing for gossip: your stake comes back and the loser talks.
      setG(prev => learnRumor({ ...prev, player: { ...prev.player, gold: prev.player.gold + minigameBet } }));
    }
  };

  const handleDiceRoll = () => {
    const roll = () => Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    const playerRoll = roll();
    const barkeepRoll = roll();
    finishMinigame(playerRoll > barkeepRoll, { playerRoll, barkeepRoll });
  };

  const handleCoinFlip = (choice: string) => {
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    finishMinigame(choice === flip, { flip, choice });
  };

  const resolveArmWrestle = (win: boolean) => {
    if (armResolvedRef.current) return;
    armResolvedRef.current = true;
    if (armResolveTimerRef.current) {
      clearTimeout(armResolveTimerRef.current);
      armResolveTimerRef.current = null;
    }
    finishMinigame(win, {});
    setIsArmWrestleResolving(false);
    setArmWrestleOutcome(null);
  };

  const handleArmWrestle = () => {
    const win = armWrestlePos >= 40 && armWrestlePos <= 60;
    armResolvedRef.current = false;
    setIsArmWrestleResolving(true);
    setArmWrestleOutcome(win);
    if (armResolveTimerRef.current) clearTimeout(armResolveTimerRef.current);
    armResolveTimerRef.current = setTimeout(() => resolveArmWrestle(win), 5000);
    const video = armVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => resolveArmWrestle(win));
    } else {
      resolveArmWrestle(win);
    }
  };

  const minigameWinText = minigameMode === 'gold' ? `You win ${minigameBet} gold!` : 'You win! He tells you what he knows.';
  const leaveMinigame = () => {
    if (armResolveTimerRef.current) {
      clearTimeout(armResolveTimerRef.current);
      armResolveTimerRef.current = null;
    }
    audioManager.playSfx('click');
    setActiveMinigame(null);
    setMinigameResult(null);
  };

  // --- RENDER HELPERS ---

  const endPort = ports.find(p => p.id === targetPortId);
  const selectedPort = ports.find(p => p.id === selectedPortId);
  const selectedTrade = selectedPort ? PORT_TRADE[selectedPort.id] : undefined;
  const selectedDays = selectedPort ? voyageDays(currentPort, selectedPort) : 0;
  const selectedWanted = selectedTrade ? selectedTrade.wants.filter(w => player.cargo[w] > 0) : [];
  const knownEventsAt = (portId: string) => events.filter(e => e.known && e.portId === portId);

  // Goods you hold come first, then what this port makes, then what it wants, then the rest by price.
  const marketOrder = [...COMMODITIES].sort((a, b) => {
    const score = (t: CommodityType) => (player.cargo[t] > 0 ? 0 : tradeRole(currentPort.id, t) === 'makes' ? 1 : tradeRole(currentPort.id, t) === 'wants' ? 2 : 3);
    return score(a) - score(b) || BASE_PRICES[a] - BASE_PRICES[b];
  });

  const upgrades = getUpgradesForTier(flagship.tier);
  const nextClass = flagship.tier < 4 ? SHIP_CLASSES[flagship.tier] : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 font-sans max-w-md mx-auto overflow-hidden border-x border-slate-800 shadow-2xl relative select-none">
      {/* TOP BAR */}
      <div className="bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-3 border-b border-slate-800 shadow-lg z-40 relative shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-2xl font-black text-yellow-500 tracking-tight leading-none">
              <Gold n={player.gold} />
              <span className="text-slate-500 text-xs font-bold ml-1.5">/ {GOAL.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{rank} · Day {player.gameDay}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end text-[11px] font-bold uppercase tracking-wider leading-tight">
              <span className={freeSpace === 0 ? 'text-amber-400' : 'text-emerald-400'}>Hold {currentCargo}/{flagship.cargoCapacity}</span>
              <span className={hullLow ? 'text-rose-500 animate-pulse' : 'text-sky-400'}>Hull {hullPct}%</span>
            </div>
            <button onClick={() => { audioManager.playSfx('click'); setMenuOpen(true); }} aria-label="Menu" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-lg flex items-center justify-center active:scale-95">☰</button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-800">
          <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 shadow-[0_0_8px_#fbbf24]" style={{ width: `${Math.min(100, (player.gold / GOAL) * 100)}%` }} />
        </div>
      </div>

      <div className="flex-1 relative min-h-0 flex flex-col">
        {/* PORT */}
        {tab === 'port' && (
          <div className="flex-1 relative overflow-hidden anim-fade">
            <div
              ref={portScrollRef}
              className="relative h-full overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab"
              onMouseDown={handlePanMouseDown}
              onMouseMove={(e) => handlePanMouseMove(e, true)}
              onTouchMove={handleDragMove}
              onMouseUp={handlePanMouseUpOrLeave}
              onTouchEnd={handleDragEnd}
              onMouseLeave={(e) => { handlePanMouseUpOrLeave(e); setMousePos({ x: 0, y: 0 }); }}
            >
              <div className={`relative h-full overflow-hidden ${isEditMode ? '' : 'animate-ken-burns'}`} style={{ width: '200%' }}>
                <div
                  className="absolute inset-0"
                  style={isEditMode ? undefined : {
                    transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 16}px) rotateX(${mousePos.y * -3}deg) rotateY(${mousePos.x * 3}deg) scale(1.04)`,
                    transition: 'transform 0.25s ease-out',
                  }}
                >
                  <div className="absolute inset-0 bg-slate-900 pointer-events-none">
                    <img src={currentPort.image} className="w-full h-full object-fill brightness-95" alt="" draggable="false" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40" />
                  </div>
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
                        <div className="relative">
                          {b.id === 'sail' ? (
                            <div className="animate-ship-float">
                              <img
                                src={flagshipImage}
                                className={`${flagship.tier === 1 ? 'w-24 h-24' : flagship.tier === 2 ? 'w-28 h-28' : flagship.tier === 3 ? 'w-32 h-32' : 'w-36 h-36'} object-contain relative z-10 drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]`}
                                alt=""
                                draggable="false"
                              />
                            </div>
                          ) : (
                            <AnimatedMarker type={b.id} />
                          )}
                          {isEditMode && (
                            <div
                              onMouseDown={(e) => { e.stopPropagation(); setResizingBuildingId(b.id); }}
                              onTouchStart={(e) => { e.stopPropagation(); setResizingBuildingId(b.id); }}
                              className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-lg cursor-nwse-resize z-50 flex items-center justify-center"
                            >
                              <div className="w-2 h-2 bg-slate-900 rounded-full" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-[0.18em] bg-slate-950/90 text-amber-100 px-3 py-1.5 rounded-full border border-amber-500/40 shadow-xl whitespace-nowrap ${b.id === 'sail' ? '-mt-3' : 'mt-3'}`}>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-3 left-0 right-0 flex flex-col items-center pointer-events-none z-30 px-4">
              <h1 className="text-3xl font-black italic uppercase tracking-tight text-white drop-shadow-[0_3px_8px_rgba(0,0,0,1)]">{currentPort.name}</h1>
              {isEditMode && <span className="mt-1 text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1 rounded-full">Layout editor: drag to move</span>}
            </div>
            {!isEditMode && (
              <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none">
                <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/30 rounded-2xl px-4 py-3 shadow-xl">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 block">Harbor master</span>
                  <p className="text-sm text-slate-100 leading-snug mt-0.5">
                    {hullLow ? 'Your hull is in bad shape. Repair it at the Shipyard before you sail.' : routeTip(currentPort, ports, events)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAP */}
        {tab === 'map' && (
          <div className="flex-1 relative bg-[#1a2b3c] flex flex-col min-h-0 anim-fade">
            <div
              ref={mapScrollRef}
              className="flex-1 relative overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab"
              onMouseDown={handlePanMouseDown}
              onMouseMove={(e) => handlePanMouseMove(e, false)}
              onTouchMove={handleDragMove}
              onMouseUp={handlePanMouseUpOrLeave}
              onTouchEnd={handleDragEnd}
              onMouseLeave={handlePanMouseUpOrLeave}
            >
              <div className="relative h-full" style={{ width: '200%' }}>
                <img src="/assets/World Map.webp" className="absolute inset-0 w-full h-full object-fill pointer-events-none" alt="" draggable="false" />
                {ports.map((p: Port) => {
                  const isCurrent = p.id === player.currentPortId;
                  const isSelected = p.id === selectedPortId;
                  return (
                    <div key={p.id} className="absolute z-10" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                      <button
                        onMouseDown={(e) => { if (isEditMode) { e.preventDefault(); setDraggingPortId(p.id); } }}
                        onTouchStart={() => { if (isEditMode) setDraggingPortId(p.id); }}
                        disabled={!isEditMode && isTraveling}
                        onClick={() => {
                          if (dragMovedRef.current) { dragMovedRef.current = false; return; }
                          if (!isEditMode) { audioManager.playSfx('click'); setSelectedPortId(p.id); }
                        }}
                        className={`px-2 py-1 flex flex-col items-center transition-transform ${isCurrent || isSelected ? 'scale-125' : 'hover:scale-110'}`}
                      >
                        <img src="/assets/map pin.webp" className={`w-9 h-9 object-contain ${isCurrent ? 'drop-shadow-[0_0_10px_rgba(234,179,8,1)] brightness-125' : isSelected ? 'drop-shadow-[0_0_10px_rgba(255,255,255,1)] brightness-125' : 'drop-shadow-lg'}`} alt="" draggable="false" />
                        <span className={`text-[10px] font-black uppercase tracking-tight mt-0.5 px-1.5 py-0.5 rounded bg-slate-950/70 ${isCurrent ? 'text-yellow-400' : 'text-slate-100'}`}>{p.name}</span>
                      </button>
                    </div>
                  );
                })}
                {isTraveling && wakeParticles.map(p => (
                  <div key={p.id} className="absolute w-4 h-4 rounded-full bg-white/45 blur-[1px] pointer-events-none animate-wake-fade z-20" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) scale(${p.scale})` }} />
                ))}
                {isTraveling && sailingShipPos && endPort && (
                  <div
                    id="sailing-ship"
                    className="absolute w-24 h-24 z-30 pointer-events-none flex flex-col items-center justify-center"
                    style={{ left: `${sailingShipPos.x}%`, top: `${sailingShipPos.y}%`, transform: 'translate(-50%, -50%)', transition: 'left 3s ease-out, top 3s ease-out' }}
                  >
                    <div className={`w-full h-full flex items-center justify-center ${shake === 'player' ? 'animate-shake' : ''}`} style={{ transform: `scaleX(${endPort.x < currentPort.x ? 1 : -1})` }}>
                      <img src={flagshipImage} className="w-full h-full object-contain animate-ship-wobble" alt="" />
                    </div>
                    <div className="absolute -top-5 bg-slate-900/90 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-amber-400 shadow-lg whitespace-nowrap">Sailing to {endPort.name}</div>
                  </div>
                )}
                {isTraveling && enemySailingShipPos && endPort && (
                  <div
                    className="absolute w-24 h-24 z-30 pointer-events-none flex flex-col items-center justify-center"
                    style={{ left: `${enemySailingShipPos.x}%`, top: `${enemySailingShipPos.y}%`, transform: 'translate(-50%, -50%)', transition: 'left 1.9s ease-in-out, top 1.9s ease-in-out' }}
                  >
                    <div className="w-full h-full flex items-center justify-center" style={{ transform: `scaleX(${endPort.x < currentPort.x ? -1 : 1})` }}>
                      <img src={getShipImageByClass(flagship.shipClass)} className="w-full h-full object-contain animate-ship-wobble brightness-75 sepia-[0.3] hue-rotate-[320deg]" alt="" />
                    </div>
                    <div className="absolute -top-5 bg-red-950/90 border border-red-500/50 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-red-400 shadow-lg animate-pulse whitespace-nowrap">Pirates!</div>
                  </div>
                )}
              </div>
            </div>
            {/* Destination card */}
            {!isTraveling && !isEditMode && (
              <div className="shrink-0 bg-slate-950/95 border-t border-amber-500/30 px-4 py-3 z-30 shadow-2xl">
                {!selectedPort ? (
                  <p className="text-sm text-slate-200 text-center py-1">Tap a port to see what it buys and sells. Slide the map to see more.</p>
                ) : selectedPort.id === currentPort.id ? (
                  <p className="text-sm text-slate-200 text-center py-1">You are docked in <strong className="text-yellow-400">{currentPort.name}</strong>. Tap another port.</p>
                ) : (
                  <div className="anim-rise" key={selectedPort.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-xl font-black italic uppercase tracking-tight text-white">{selectedPort.name}</h2>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedPort.dangerLevel >= 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedDays} day{selectedDays === 1 ? '' : 's'} · {DANGER_TEXT[Math.min(3, selectedPort.dangerLevel)]}
                      </span>
                    </div>
                    {selectedTrade && (
                      <div className="text-[13px] leading-snug mt-1.5 space-y-0.5">
                        <p><span className="text-amber-400 font-bold">Pays well for:</span> <span className="text-slate-100">{selectedTrade.wants.join(', ')}</span></p>
                        <p><span className="text-emerald-400 font-bold">Sells cheap:</span> <span className="text-slate-100">{selectedTrade.makes.join(', ')}</span></p>
                        {selectedWanted.length > 0 && <p className="text-yellow-300 font-bold">They want the {selectedWanted.join(' and ')} in your hold.</p>}
                        {knownEventsAt(selectedPort.id).map(e => (
                          <p key={e.id} className="text-sky-300 italic">Rumor: {e.mult > 1 ? `short of ${e.good}, paying extra` : `flooded with cheap ${e.good}`} ({e.daysLeft}d left).</p>
                        ))}
                      </div>
                    )}
                    {hullLow && <p className="text-[12px] text-rose-400 font-bold mt-1.5">Your hull is at {hullPct}%. A fight could sink you.</p>}
                    <button onClick={() => handleTravel(selectedPort.id)} className="mt-3 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-sm shadow-lg active:scale-95 transition-transform">
                      Sail to {selectedPort.name}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MARKET */}
        {tab === 'market' && (
          <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 anim-fade">
            <BackdropImage src={currentPort.image} />
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/60 border-b border-slate-800/60 shrink-0">
                <img src="/assets/Market Transparent.webp" className="w-16 h-16 object-contain shrink-0" alt="" draggable="false" />
                <div className="min-w-0">
                  <h2 className="text-lg font-black italic uppercase tracking-tight text-white leading-tight">{currentPort.name} Market</h2>
                  {trade && (
                    <p className="text-[12px] leading-snug text-slate-300 mt-0.5">
                      <span className="text-emerald-400 font-bold">Cheap here:</span> {trade.makes.join(', ')}<br />
                      <span className="text-amber-400 font-bold">Pays well for:</span> {trade.wants.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0">
                {marketOrder.map(t => {
                  const bp = buyPrice(currentPort, t, events);
                  const sp = sellPrice(currentPort, t, events);
                  const held = player.cargo[t];
                  const avgPaid = held > 0 && player.paid[t] > 0 ? Math.round(player.paid[t] / held) : null;
                  const role = tradeRole(currentPort.id, t);
                  const vsUsual = Math.round((bp / BASE_PRICES[t] - 1) * 100);
                  const canBuy = player.gold >= bp && freeSpace > 0;
                  const profit = avgPaid !== null ? sp - avgPaid : null;
                  return (
                    <div key={t} className={`bg-slate-900/70 backdrop-blur-md px-3 py-2.5 rounded-2xl border shadow-lg ${held > 0 ? 'border-yellow-500/40' : 'border-white/5'}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <h3 className="font-black text-base italic tracking-tight uppercase text-slate-100">{t}</h3>
                          {role === 'makes' && <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Cheap here</span>}
                          {role === 'wants' && <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">In demand</span>}
                        </div>
                        <span className={`text-[11px] font-bold whitespace-nowrap ${vsUsual <= -10 ? 'text-emerald-400' : vsUsual >= 10 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {vsUsual <= -3 ? `${-vsUsual}% under usual` : vsUsual >= 3 ? `${vsUsual}% over usual` : 'usual price'}
                        </span>
                      </div>
                      {held > 0 && (
                        <p className="text-[11px] font-bold text-yellow-300 mt-0.5">
                          {held} in hold{avgPaid !== null ? `, paid ${avgPaid} each` : ''}
                          {profit !== null && (
                            <span className={profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-rose-400' : 'text-slate-400'}>
                              {' · '}{profit > 0 ? `+${profit} each if sold here` : profit < 0 ? `${profit} each if sold here` : 'break even here'}
                            </span>
                          )}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex gap-1">
                          <HoldButton onTrigger={() => buy(t, 1)} disabled={!canBuy} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-25 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wide active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                            Buy <Gold n={bp} />
                          </HoldButton>
                          <button onClick={() => buy(t, 999)} disabled={!canBuy} className="px-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-25 rounded-xl text-[10px] font-black uppercase tracking-wide active:scale-95">Max</button>
                        </div>
                        <div className="flex gap-1">
                          <HoldButton onTrigger={() => sell(t, 1)} disabled={held <= 0} className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-25 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wide active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                            Sell <Gold n={sp} />
                          </HoldButton>
                          <button onClick={() => sell(t, 999)} disabled={held <= 0} className="px-2.5 bg-rose-800 hover:bg-rose-700 disabled:opacity-25 rounded-xl text-[10px] font-black uppercase tracking-wide active:scale-95">All</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-slate-500 text-center px-6 py-2">Buying pushes a price up and selling pushes it down. Prices settle again after a few days.</p>
              </div>
            </div>
          </div>
        )}

        {/* CANTINA */}
        {tab === 'cantina' && (
          <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 anim-fade">
            <BackdropImage src={currentPort.image} />
            <div className="relative z-10 flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0">
              <div className="bg-slate-900/70 backdrop-blur-xl p-5 rounded-3xl border border-white/5 text-center shadow-2xl">
                {activeMinigame ? (
                  <div className="space-y-6 py-4">
                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-sky-400">{MINIGAME_NAMES[activeMinigame]}</h2>
                    {activeMinigame === 'dice' && (!minigameResult ? (
                      <div className="flex flex-col items-center gap-6">
                        <div className="text-6xl animate-bounce">🎲</div>
                        <p className="text-sm text-slate-300">Roll two dice. Beat the barkeep's roll to win.</p>
                        <button onClick={handleDiceRoll} className="bg-sky-600 hover:bg-sky-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95">Roll Dice</button>
                      </div>
                    ) : (
                      <div className="flex justify-around text-4xl font-black italic">
                        <div className="flex flex-col gap-2"><span className="text-[11px] text-slate-400 uppercase not-italic">You</span><span className="text-sky-400">{minigameResult.playerRoll}</span></div>
                        <div className="text-slate-600">vs</div>
                        <div className="flex flex-col gap-2"><span className="text-[11px] text-slate-400 uppercase not-italic">Barkeep</span><span className="text-rose-400">{minigameResult.barkeepRoll}</span></div>
                      </div>
                    ))}
                    {activeMinigame === 'coin' && (!minigameResult ? (
                      <div className="flex flex-col items-center gap-6">
                        <div className="text-6xl animate-bounce">🪙</div>
                        <div className="flex gap-4">
                          <button onClick={() => handleCoinFlip('heads')} className="bg-yellow-600 hover:bg-yellow-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95">Heads</button>
                          <button onClick={() => handleCoinFlip('tails')} className="bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95">Tails</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-300 uppercase font-bold tracking-widest">It lands on {minigameResult.flip}</p>
                    ))}
                    {activeMinigame === 'arm' && (
                      <div className="flex flex-col items-center gap-5 w-full">
                        <div className="w-full relative overflow-hidden rounded-2xl border border-white/10 shadow-lg bg-slate-950">
                          <video
                            ref={armVideoRef}
                            src="/assets/Awrestle.mp4"
                            muted
                            playsInline
                            onEnded={() => { if (isArmWrestleResolving) resolveArmWrestle(armWrestleOutcome === true); }}
                            onError={() => { if (isArmWrestleResolving) resolveArmWrestle(armWrestleOutcome === true); }}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                        {!minigameResult && !isArmWrestleResolving && (
                          <>
                            <p className="text-sm text-slate-300">Hit SLAM while the marker is in the green.</p>
                            <div className="w-full h-8 bg-slate-950 rounded-full border border-white/5 relative overflow-hidden shadow-inner">
                              <div className="absolute inset-y-0 left-[40%] right-[40%] bg-emerald-500/30 border-x border-emerald-500/60" />
                              <div className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_15px_white]" style={{ left: `${armWrestlePos}%` }} />
                            </div>
                            <button onClick={handleArmWrestle} className="w-full bg-sky-600 hover:bg-sky-500 py-6 rounded-2xl font-black uppercase tracking-[0.3em] shadow-xl active:scale-95">SLAM!</button>
                          </>
                        )}
                      </div>
                    )}
                    {minigameResult && (
                      <div className="space-y-4">
                        <p className={`text-lg font-black uppercase tracking-wide ${minigameResult.win ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {minigameResult.win ? minigameWinText : `You lose your ${minigameBet} gold.`}
                        </p>
                        <button onClick={leaveMinigame} className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95">Back to the bar</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-yellow-500"><span className="not-italic mr-2">🍺</span>The Salty Spitter</h2>
                    <p className="text-sm text-slate-300 mt-1 mb-4 italic">"Gold buys the truth, lad. Luck buys it cheaper."</p>
                    <button onClick={bribe} disabled={player.gold < 50} className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-30 text-slate-950 py-4 rounded-2xl font-black uppercase tracking-wider shadow-xl active:scale-95 flex items-center justify-center gap-2">
                      Buy a trade tip <Gold n={50} />
                    </button>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 mt-3 text-left">
                      <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-300">
                        <span>Or gamble for</span>
                        <div className="flex gap-2">
                          <button onClick={() => { audioManager.playSfx('click'); setMinigameMode('gossip'); setMinigameBet(10); }} className={`px-3 py-1.5 rounded-lg ${minigameMode === 'gossip' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>A tip</button>
                          <button onClick={() => { audioManager.playSfx('click'); setMinigameMode('gold'); }} className={`px-3 py-1.5 rounded-lg ${minigameMode === 'gold' ? 'bg-yellow-600 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>Gold</button>
                        </div>
                      </div>
                      {minigameMode === 'gold' && (
                        <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-300 border-t border-white/5 pt-3 mt-3">
                          <span>Your bet</span>
                          <div className="flex gap-1">
                            {[10, 50, 100, 500].map(amount => (
                              <button key={amount} onClick={() => { audioManager.playSfx('click'); setMinigameBet(amount); }} className={`px-2.5 py-1.5 rounded-lg ${minigameBet === amount ? 'bg-yellow-600 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{amount}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={startMinigame} disabled={player.gold < minigameBet} className="mt-3 w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 py-4 rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl active:scale-95 border border-white/5 flex items-center justify-center gap-2">
                        Play {MINIGAME_NAMES[currentMinigameType]} <Gold n={minigameBet} />
                      </button>
                      <p className="text-[11px] text-slate-500 mt-2 text-center">{minigameMode === 'gold' ? 'Win and you double your bet.' : 'Win and you keep your stake and get a tip.'}</p>
                    </div>
                    <div className="mt-5 text-left">
                      <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-white/5 pb-2 mb-3">What you have heard</h3>
                      {rumors.length === 0 ? (
                        <p className="text-sm italic text-slate-500">Nothing yet. Tips tell you where a shortage is paying extra.</p>
                      ) : (
                        <div className="space-y-2">
                          {rumors.map(r => (
                            <div key={r.id} className="bg-slate-950/60 px-4 py-3 rounded-2xl border border-white/5 text-sm italic text-sky-300 leading-snug anim-rise">
                              "{r.text}" <span className="not-italic text-[10px] text-slate-500 font-bold uppercase">Day {r.day}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SHIPYARD */}
        {tab === 'ship' && (
          <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 anim-fade">
            <BackdropImage src={currentPort.image} />
            <div className="relative z-10 flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
              <div className="bg-slate-900/70 backdrop-blur-xl p-4 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3">
                  <img src={flagshipImage} className="w-20 h-20 object-contain shrink-0" alt="" />
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-sky-400 leading-tight">{flagship.name}</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{flagship.shipClass}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  {[['Hull', `${flagship.hullHealth.current}/${flagship.hullHealth.max}`], ['Hold', flagship.cargoCapacity], ['Cannons', flagship.firepower], ['Speed', flagship.speed]].map(([label, value]) => (
                    <div key={label} className="bg-slate-950/60 rounded-xl py-2 border border-white/5">
                      <div className="text-base font-black text-slate-100">{value}</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-slate-950/60 h-3 rounded-full border border-white/5 p-0.5 mt-3">
                  <div className={`h-full rounded-full transition-all duration-700 ${hullLow ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${hullPct}%` }} />
                </div>
                <button onClick={repair} disabled={repairPoints <= 0} className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-30 py-4 rounded-2xl font-black uppercase tracking-wider mt-3 shadow-lg active:scale-95 flex items-center justify-center gap-2">
                  {hullDamage <= 0 ? 'Hull is sound' : repairPoints <= 0 ? 'Not enough gold to repair' : (<>{repairPoints < hullDamage ? 'Patch what you can afford' : 'Repair hull'} <Gold n={repairCost} /></>)}
                </button>
              </div>
              <div className="px-2">
                <h3 className="text-[11px] font-black uppercase text-slate-300 tracking-[0.2em]">Upgrades · {flagship.upgrades.length} of 4 fitted</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {nextClass ? `Fit all four and the shipwrights rebuild her as a ${nextClass}: bigger, tougher and better armed.` : 'She is a Galleon, the finest class afloat.'}
                </p>
              </div>
              {upgrades.map(u => {
                const isOwned = flagship.upgrades.includes(u.id);
                const canAfford = player.gold >= u.cost;
                return (
                  <div key={u.id} className={`bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex justify-between items-center gap-3 ${isOwned ? 'opacity-50' : 'shadow-xl'}`}>
                    <div className="min-w-0">
                      <h4 className="font-black italic uppercase tracking-tight text-slate-100">{u.label}</h4>
                      <p className="text-[12px] text-slate-400 leading-snug">{u.description}</p>
                    </div>
                    <button onClick={() => buyUpgrade(u.id)} disabled={isOwned || !canAfford} className={`shrink-0 px-4 py-3 rounded-xl text-[12px] font-black uppercase tracking-wide ${isOwned ? 'bg-slate-800 text-emerald-400' : canAfford ? 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95' : 'bg-slate-800 text-slate-500'}`}>
                      {isOwned ? 'Fitted ✓' : <Gold n={u.cost} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BATTLE */}
        {tab === 'battle' && battle && (
          <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950 anim-fade">
            <div className="absolute inset-0 z-0 opacity-30">
              <div className="absolute inset-0 bg-[url('/assets/World%20Map.webp')] bg-cover blur-xl grayscale" />
              <div className="absolute inset-0 bg-gradient-to-b from-rose-900/20 via-slate-950 to-slate-950" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col p-4 min-h-0">
              <div className="flex justify-between items-center mb-4 h-48 relative overflow-hidden shrink-0">
                <div className="absolute inset-x-0 bottom-0 h-16 overflow-hidden pointer-events-none z-0">
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-blue-950/90 via-blue-900/50 to-transparent opacity-60 animate-wave-slow" style={{ borderRadius: '45% 45% 0 0' }} />
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-blue-900/90 via-blue-800/40 to-transparent opacity-80 animate-wave-medium" style={{ borderRadius: '50% 40% 0 0', animationDelay: '-2s' }} />
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-blue-800 via-cyan-900/30 to-transparent opacity-95 animate-wave-fast" style={{ borderRadius: '40% 50% 0 0', animationDelay: '-4s' }} />
                </div>
                {([['player', flagship, 'text-sky-400', 'bg-sky-500'], ['enemy', battle.enemy, 'text-rose-400', 'bg-rose-600']] as const).map(([side, ship, textColor, barColor], i) => (
                  <React.Fragment key={side}>
                    {i === 1 && <div className="text-2xl font-black italic text-rose-600 px-3 relative z-10">VS</div>}
                    <div className="flex flex-col items-center gap-2 flex-1 relative z-10 min-w-0">
                      <div className={`w-32 h-32 flex items-end justify-center animate-ship-float relative ${shake === side ? 'animate-shake' : ''}`}>
                        <img
                          src={getShipImageByClass(ship.shipClass)}
                          className={`object-contain mb-2 ${side === 'player' ? 'scale-x-[-1]' : 'brightness-75 sepia-[0.3] hue-rotate-[320deg]'} ${ship.hullHealth.current <= 0 ? 'opacity-30 rotate-12' : ''}`}
                          style={getShipSizeStyle(ship.shipClass)}
                          alt=""
                        />
                        {hitEffect === side && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                            <div className="absolute w-12 h-12 rounded-full bg-orange-600/85 animate-explosion" />
                            <div className="absolute w-8 h-8 rounded-full bg-yellow-400/90 animate-explosion" style={{ animationDelay: '0.06s' }} />
                            <div className="absolute w-4 h-4 rounded-full bg-white animate-explosion" style={{ animationDelay: '0.12s' }} />
                            <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 animate-spark" style={{ '--tx': '16px', '--ty': '-12px' } as React.CSSProperties} />
                            <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 animate-spark" style={{ '--tx': '-20px', '--ty': '10px' } as React.CSSProperties} />
                            <div className="absolute w-2 h-2 rounded-full bg-orange-400 animate-spark" style={{ '--tx': '8px', '--ty': '22px' } as React.CSSProperties} />
                          </div>
                        )}
                      </div>
                      <div className="w-full space-y-1">
                        <div className={`flex justify-between gap-2 text-[10px] font-black uppercase tracking-wide ${textColor}`}>
                          <span className="truncate">{ship.name}</span>
                          <span className="whitespace-nowrap">{ship.hullHealth.current} HP</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full border border-white/5 overflow-hidden"><div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${(ship.hullHealth.current / ship.hullHealth.max) * 100}%` }} /></div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 text-center">{ship.shipClass} · {ship.firepower} cannons</div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                {cannonball && (
                  <div className={`absolute w-5 h-5 rounded-full bg-slate-800 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.75)] z-40 flex items-center justify-center ${cannonball.from === 'player' ? 'animate-cannonball-right' : 'animate-cannonball-left'}`}>
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="min-h-[7rem] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl px-5 py-4 mb-4 text-center shrink-0">
                {showEnemyCargo ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 block">Through the spyglass: their hold</span>
                    <div className="text-xl font-black text-yellow-500"><Gold n={battle.loot.gold} /></div>
                    <div className="text-sm font-black uppercase text-slate-200">{battle.loot.amount} × <span className="text-amber-400">{battle.loot.good}</span></div>
                  </div>
                ) : (
                  <p key={battle.log} className={`text-base font-bold leading-snug anim-rise ${battle.tone === 'bad' ? 'text-rose-300' : battle.tone === 'good' ? 'text-emerald-300' : 'text-amber-200'}`}>{battle.log}</p>
                )}
              </div>
              {battle.phase === 'won' ? (
                <button onClick={() => arrive(battle.destId, battle.days)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-lg active:scale-95">
                  Sail on to {ports.find(p => p.id === battle.destId)?.name || 'port'}
                </button>
              ) : (
                <div className="space-y-2 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleFire} disabled={battle.phase !== 'player'} className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-lg active:scale-95">Fire cannons</button>
                    <button onClick={handleFlee} disabled={battle.phase !== 'player'} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 py-5 rounded-2xl font-black uppercase tracking-[0.1em] shadow-lg active:scale-95 flex flex-col items-center leading-tight">
                      Flee
                      <span className="text-[10px] font-bold text-slate-300 normal-case tracking-normal">{Math.round(fleeChance(flagship, battle.enemy) * 100)}% chance</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleTribute} disabled={battle.phase !== 'player' || player.gold < tributeCost(player.gold, battle.enemy)} className="bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 py-3 rounded-2xl font-black uppercase tracking-wide text-[12px] shadow-lg active:scale-95 flex items-center justify-center gap-1.5">
                      Pay them off <Gold n={tributeCost(player.gold, battle.enemy)} />
                    </button>
                    <button onClick={() => { audioManager.playSfx('click'); setShowEnemyCargo(v => !v); }} className={`py-3 rounded-2xl font-black uppercase tracking-wide text-[12px] shadow-lg active:scale-95 flex items-center justify-center gap-2 ${showEnemyCargo ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>
                      <img src="/assets/telescope.webp?v=2" className="w-6 h-6 object-contain" alt="" /> Spyglass
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute top-3 left-4 right-4 z-40 flex justify-center pointer-events-none">
            <div className="bg-slate-950/95 border border-amber-500/40 text-amber-100 text-sm font-bold px-4 py-2.5 rounded-2xl shadow-2xl text-center anim-rise">{toast}</div>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="bg-slate-900 border-t border-slate-800 z-40 shrink-0 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV.map(item => {
          const active = tab === item.tab;
          return (
            <button key={item.tab} onClick={() => changeTab(item.tab)} disabled={locked} className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${active ? 'text-amber-400 bg-slate-800/70' : 'text-slate-400'} ${locked ? 'opacity-30' : 'active:bg-slate-800'}`}>
              <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MENU */}
      {menuOpen && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 anim-fade" onClick={() => setMenuOpen(false)}>
          <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl w-full max-w-xs shadow-2xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black italic uppercase tracking-tight text-amber-400 text-center mb-2">Captain's Menu</h2>
            <button onClick={() => { const muted = audioManager.toggleMute(); setIsMuted(muted); if (!muted) audioManager.playSfx('click'); }} className="menu-btn">{isMuted ? '🔇 Sound is off' : '🔊 Sound is on'}</button>
            <button onClick={() => { setMenuOpen(false); setShowGuide(true); }} className="menu-btn">📜 How to play</button>
            <button onClick={restartGame} className="menu-btn">↺ Start a new game</button>
            <details className="pt-2">
              <summary className="text-[11px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer text-center">Builder tools</summary>
              <div className="space-y-2 mt-2">
                <button onClick={() => { setIsEditMode(v => !v); setMenuOpen(false); if (tab !== 'port' && tab !== 'map') setTab('port'); }} className="menu-btn">{isEditMode ? 'Leave layout editor' : 'Move buildings and map pins'}</button>
                <button onClick={handleExport} className="menu-btn">Copy game to another device</button>
                <button onClick={handleImport} className="menu-btn">Paste game from another device</button>
              </div>
            </details>
            <button onClick={() => setMenuOpen(false)} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-black uppercase tracking-wider text-sm mt-2 active:scale-95">Close</button>
          </div>
        </div>
      )}

      {/* HOW TO PLAY */}
      {guideOpen && player.hasReadPrologue && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 anim-fade">
          <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-amber-400 text-center">Win back the family name</h2>
            <p className="text-sm text-slate-300 text-center mt-1">Turn 500 gold into {GOAL.toLocaleString()}.</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-100 leading-snug">
              <li className="flex gap-3"><span className="text-xl">⚖️</span><span><strong>Buy what is cheap.</strong> Every port makes three goods it sells cheap.</span></li>
              <li className="flex gap-3"><span className="text-xl">🧭</span><span><strong>Sail to a port that wants it.</strong> The map shows what each port pays well for.</span></li>
              <li className="flex gap-3"><span className="text-xl">🔨</span><span><strong>Grow your ship.</strong> Upgrades at the Shipyard mean more cargo and stronger cannons.</span></li>
              <li className="flex gap-3"><span className="text-xl">☠️</span><span><strong>Watch for pirates.</strong> Fight, run or pay them off. Keep your hull repaired.</span></li>
            </ol>
            <button onClick={closeGuide} className="mt-5 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm active:scale-95">Set to work</button>
          </div>
        </div>
      )}

      {/* NOTICE (after a lost battle) */}
      {notice && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 anim-fade">
          <div className="bg-slate-900 border border-rose-500/30 p-6 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-rose-400">{notice.title}</h2>
            <p className="text-sm text-slate-200 mt-3 leading-relaxed">{notice.body}</p>
            <button onClick={() => { audioManager.playSfx('click'); setNotice(null); }} className="mt-5 w-full bg-slate-700 hover:bg-slate-600 py-3.5 rounded-xl font-black uppercase tracking-wider text-sm active:scale-95">Carry on</button>
          </div>
        </div>
      )}

      {/* INTRO */}
      {!player.hasReadPrologue && (
        <PrologueStoryboard onComplete={() => setG(prev => ({ ...prev, player: { ...prev.player, hasReadPrologue: true } }))} />
      )}

      {/* VICTORY */}
      {player.gold >= GOAL && !player.hasWonGame && tab !== 'battle' && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-6 anim-fade">
          <div className="bg-yellow-950/20 border border-yellow-500/40 p-7 rounded-3xl max-w-sm w-full shadow-2xl text-center max-h-full overflow-y-auto">
            <span className="text-5xl animate-bounce block">🏆</span>
            <h2 className="text-3xl font-black uppercase tracking-wide italic text-yellow-400 mt-2">Merchant Prince!</h2>
            <p className="text-yellow-100/90 text-sm leading-relaxed italic mt-4">
              With <strong>{player.gold.toLocaleString()} gold</strong> you buy out the Syndicate and reclaim your family's flagship. From Venice to Alexandria, they know your name.
            </p>
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 mt-4 flex justify-between text-sm text-slate-300">
              <span>Days at sea</span>
              <span className="font-black text-yellow-400">{player.gameDay}</span>
            </div>
            <button onClick={() => setG(prev => ({ ...prev, player: { ...prev.player, hasWonGame: true } }))} className="mt-5 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95">Keep sailing</button>
            <button onClick={restartGame} className="mt-2 w-full bg-gradient-to-r from-yellow-600 to-amber-600 text-slate-950 py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs active:scale-95">Start a new voyage</button>
          </div>
        </div>
      )}

      {/* NEW SHIP CLASS */}
      {evolved && (
        <div className="absolute inset-0 bg-slate-950/95 z-[55] flex items-center justify-center p-6 anim-fade">
          <div className="bg-blue-950/30 border border-sky-500/30 p-7 rounded-3xl max-w-sm w-full shadow-2xl text-center max-h-full overflow-y-auto">
            <h2 className="text-3xl font-black uppercase tracking-wide italic text-sky-400">A new ship!</h2>
            <img src={getShipImageByClass(evolved.ship.shipClass)} className="w-44 h-44 mx-auto object-contain animate-ship-float mt-3" alt="" />
            <p className="text-lg font-black text-slate-200 mt-2">
              <span className="line-through text-slate-500 text-sm">{evolved.oldClass}</span>
              <span className="text-sky-400 mx-2">➔</span>
              <span className="text-sky-400 italic uppercase">{evolved.ship.shipClass}</span>
            </p>
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              {[['Hull', evolved.ship.hullHealth.max], ['Hold', evolved.ship.cargoCapacity], ['Cannons', evolved.ship.firepower], ['Speed', evolved.ship.speed]].map(([label, value]) => (
                <div key={label} className="bg-slate-900/70 rounded-xl py-2 border border-white/5">
                  <div className="text-base font-black text-sky-300">{value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setEvolved(null)} className="mt-5 w-full bg-sky-600 hover:bg-sky-500 text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs active:scale-95">Take the helm</button>
          </div>
        </div>
      )}

      {showAmbushIndicator && <div className="absolute inset-0 bg-red-600/40 z-[60] pointer-events-none animate-flash-shake" />}
    </div>
  );
};

export default App;
