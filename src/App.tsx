import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// --- TYPES ---
interface Building {
    id: string;
    label: string;
    x: number; // Left %
    y: number; // Top %
    image: string;
    tab: string;
    scale?: number;
    flipped?: boolean;
}

type CommodityType = 
  | 'Grain' | 'Salt' | 'Hemp' | 'Timber' | 'Wool' | 'Cotton' | 'Wine' | 'Paper' 
  | 'Iron' | 'Oil' | 'Dye' | 'Spice' | 'Tobacco' | 'Tea' | 'Silk' | 'Tools' 
  | 'Porcelain' | 'Weapons' | 'Silver' | 'Jewelry' | 'Gems' | 'Statues';

interface MarketCommodity {
  type: CommodityType;
  basePrice: number;
  supplyModifier: number;
  demandModifier: number;
}

interface Port {
  id: string;
  name: string;
  market: Record<CommodityType, MarketCommodity>;
  dangerLevel: number;
  x: number;
  y: number;
  image: string;
  buildings: Building[];
}

interface Ship {
  id: string;
  name: string;
  shipClass: string;
  hullHealth: { current: number; max: number };
  cargoCapacity: number;
  speed: number;
  firepower: number;
  upgrades: string[];
}

interface Player {
  gold: number;
  rank: string;
  fleet: Ship[];
  cargo: Record<CommodityType, number>;
  currentPortId: string;
  gameDay: number;
}

interface Rumor {
  id: string;
  text: string;
}

interface Upgrade {
    id: string;
    label: string;
    description: string;
    cost: number;
    effect: (ship: Ship) => Ship;
}

interface BattleState {
    enemyShip: Ship | null;
    battleLog: string[];
    isPlayerTurn: boolean;
    loot?: { gold: number; cargo: Record<string, number> };
}

// --- CONSTANTS & HELPERS ---
const UPGRADES: Upgrade[] = [
    { 
        id: 'hull', 
        label: 'Larger Hull', 
        description: 'Increases cargo capacity by 5 units.', 
        cost: 1000, 
        effect: (s) => ({ ...s, cargoCapacity: s.cargoCapacity + 5 }) 
    },
    { 
        id: 'cannons', 
        label: 'Better Cannons', 
        description: 'Increases firepower by 2.', 
        cost: 1500, 
        effect: (s) => ({ ...s, firepower: s.firepower + 2 }) 
    },
    { 
        id: 'supports', 
        label: 'Stronger Supports', 
        description: 'Increases maximum hull health by 10.', 
        cost: 800, 
        effect: (s) => ({ 
            ...s, 
            hullHealth: { ...s.hullHealth, max: s.hullHealth.max + 10, current: s.hullHealth.current + 10 } 
        }) 
    },
    { 
        id: 'sails', 
        label: 'Faster Sails', 
        description: 'Increases speed by 3.', 
        cost: 1200, 
        effect: (s) => ({ ...s, speed: s.speed + 3 }) 
    },
];

const COMMODITIES: CommodityType[] = [
  'Grain', 'Salt', 'Hemp', 'Timber', 'Wool', 'Cotton', 'Wine', 'Paper', 
  'Iron', 'Oil', 'Dye', 'Spice', 'Tobacco', 'Tea', 'Silk', 'Tools', 
  'Porcelain', 'Weapons', 'Silver', 'Jewelry', 'Gems', 'Statues'
];

const BASE_PRICES: Record<CommodityType, number> = {
  Grain: 10, Salt: 15, Hemp: 20, Timber: 25, Wool: 30, Cotton: 35, 
  Wine: 45, Paper: 50, Iron: 60, Oil: 80, Dye: 120, Spice: 150, 
  Tobacco: 200, Tea: 250, Silk: 350, Tools: 400, Porcelain: 500, 
  Weapons: 600, Silver: 750, Jewelry: 850, Gems: 1000, Statues: 1500
};

const calculatePrice = (c: MarketCommodity) => Math.max(1, Math.round(c.basePrice * (c.demandModifier / c.supplyModifier)));

const generateMarket = (): Record<CommodityType, MarketCommodity> => {
  const m: any = {};
  COMMODITIES.forEach(t => {
    m[t] = { 
      type: t, 
      basePrice: BASE_PRICES[t], 
      supplyModifier: 0.9 + Math.random() * 0.2, 
      demandModifier: 0.9 + Math.random() * 0.2 
    };
  });
  return m;
};

const generateEnemy = (dangerLevel: number): Ship => {
    const names = ["The Salty Scourge", "Blackbeard's Revenge", "Iron Barnacle", "Sea Vulture", "Crimson Wave"];
    const classes = ["Sloop", "Brigantine", "Frigate"];
    const name = names[Math.floor(Math.random() * names.length)];
    const shipClass = classes[Math.min(classes.length - 1, dangerLevel - 1)];
    
    return {
        id: Math.random().toString(),
        name,
        shipClass,
        hullHealth: { current: 10 + dangerLevel * 5, max: 10 + dangerLevel * 5 },
        cargoCapacity: 5 + dangerLevel * 5,
        speed: 3 + dangerLevel * 2,
        firepower: 1 + dangerLevel * 2,
        upgrades: []
    };
};

// --- CONTEXT ---
const GameContext = createContext<any>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [player, setPlayer] = useState<Player>(() => {
    const saved = localStorage.getItem('tradewinds_player');
    if (saved) return JSON.parse(saved);
    return {
      gold: 500, rank: 'Cabin Boy', fleet: [{
        id: '1', name: 'The Salty Dog', shipClass: 'Sloop', hullHealth: { current: 20, max: 20 },
        cargoCapacity: 10, speed: 5, firepower: 2, upgrades: []
      }],
      cargo: Object.fromEntries(COMMODITIES.map(t => [t, 0])) as any,
      currentPortId: 'sardinia', gameDay: 1
    };
  });

  const [ports, setPorts] = useState<Port[]>(() => {
    const saved = localStorage.getItem('tradewinds_ports');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'athens', name: 'Athens', dangerLevel: 1, market: generateMarket(), x: 69, y: 40, image: '/assets/New Lands/Athens.png', buildings: [{ id: 'mkt', label: 'Market', x: 64, y: 38, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 87, y: 44, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 55, y: 54, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 52, y: 81, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'rome', name: 'Rome', dangerLevel: 1, market: generateMarket(), x: 47, y: 28, image: '/assets/New Lands/Rome.png', buildings: [{ id: 'mkt', label: 'Market', x: 51, y: 27, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 91, y: 33, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 16, y: 39, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 77, y: 81, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'venice', name: 'Venice', dangerLevel: 1, market: generateMarket(), x: 51, y: 6, image: '/assets/New Lands/Venice.png', buildings: [{ id: 'mkt', label: 'Market', x: 13, y: 19, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 87, y: 62, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 45, y: 76, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 18, y: 81, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'crete', name: 'Crete', dangerLevel: 2, market: generateMarket(), x: 81, y: 63, image: '/assets/New Lands/Crete.png', buildings: [{ id: 'mkt', label: 'Market', x: 31, y: 36, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 84, y: 53, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 79, y: 17, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 54, y: 81, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'barcelona', name: 'Barcelona', dangerLevel: 1, market: generateMarket(), x: 16, y: 23, image: '/assets/New Lands/Barcellona.png', buildings: [{ id: 'mkt', label: 'Market', x: 32, y: 46, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 21, y: 67, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 67, y: 31, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 52, y: 75, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'tunisia', name: 'Tunisia', dangerLevel: 2, market: generateMarket(), x: 19, y: 89, image: '/assets/New Lands/Tunisia.png', buildings: [{ id: 'mkt', label: 'Market', x: 55, y: 43, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 76, y: 40, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 23, y: 55, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 57, y: 77, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'egypt', name: 'Egypt', dangerLevel: 2, market: generateMarket(), x: 81, y: 92, image: '/assets/New Lands/Egypt.png', buildings: [{ id: 'mkt', label: 'Market', x: 75, y: 58, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 32, y: 19, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 92, y: 23, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 11, y: 63, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'nice', name: 'Nice', dangerLevel: 1, market: generateMarket(), x: 30, y: 15, image: '/assets/New Lands/Nice.png', buildings: [{ id: 'mkt', label: 'Market', x: 48, y: 21, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 67, y: 35, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 59, y: 74, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 82, y: 67, image: '/assets/easy remove boat.png', tab: 'map' }] },
      { id: 'sardinia', name: 'Sardinia', dangerLevel: 1, market: generateMarket(), x: 36, y: 33, image: '/assets/New Lands/Sardinia.png', buildings: [{ id: 'mkt', label: 'Market', x: 24, y: 53, image: '/assets/Market Transparent.png', tab: 'market' }, { id: 'ship', label: 'Shipyard', x: 92, y: 37, image: '/assets/Transparent Shipyard.png', tab: 'ship' }, { id: 'bar', label: 'Cantina', x: 87, y: 71, image: '/assets/proper cantina.png', tab: 'cantina' }, { id: 'sail', label: 'Set Sail', x: 55, y: 81, image: '/assets/easy remove boat.png', tab: 'map' }] },
    ];
  });

  const [rumors, setRumors] = useState<Rumor[]>([]);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<string | null>(null);
  const [minigameResult, setMinigameResult] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('tradewinds_ports', JSON.stringify(ports));
  }, [ports]);

  useEffect(() => {
    localStorage.setItem('tradewinds_player', JSON.stringify(player));
  }, [player]);

  const buy = (type: CommodityType) => {
    const port = ports.find(p => p.id === player.currentPortId)!;
    const price = calculatePrice(port.market[type]);
    const currentCargo = Object.values(player.cargo).reduce((a, b) => a + b, 0);

    if (player.gold >= price && currentCargo < player.fleet[0].cargoCapacity) {
      setPlayer(prev => ({
        ...prev, gold: prev.gold - price,
        cargo: { ...prev.cargo, [type]: prev.cargo[type] + 1 }
      }));
    }
  };

  const sell = (type: CommodityType) => {
    if (player.cargo[type] <= 0) return;
    const port = ports.find(p => p.id === player.currentPortId)!;
    const price = calculatePrice(port.market[type]);
    setPlayer(prev => ({
      ...prev, gold: prev.gold + price,
      cargo: { ...prev.cargo, [type]: prev.cargo[type] - 1 }
    }));
  };

  const travel = (id: string) => {
    setPlayer(prev => ({ ...prev, currentPortId: id, gameDay: prev.gameDay + 1 }));
    setPorts(prevPorts => prevPorts.map(p => ({
      ...p,
      market: Object.fromEntries(
        Object.entries(p.market).map(([type, comm]) => [
          type, 
          { ...comm, supplyModifier: (comm as MarketCommodity).supplyModifier + (Math.random() * 0.1 - 0.05) }
        ])
      ) as any
    })));
  };

  const addRumor = () => {
    const type = Math.floor(Math.random() * 3);
    let rumorText = "";

    if (type === 0) { // Market Intel
        const randomPort = ports[Math.floor(Math.random() * ports.length)];
        const randomComm = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
        const commData = randomPort.market[randomComm];
        const isHigh = commData.demandModifier > 1.1;
        const isLow = commData.supplyModifier > 1.1;
        
        if (isHigh) rumorText = `I heard ${randomComm} is fetching a king's ransom in ${randomPort.name} right now!`;
        else if (isLow) rumorText = `The markets in ${randomPort.name} are flooded with ${randomComm}. It's cheap as dirt!`;
        else rumorText = `A merchant from ${randomPort.name} says trade is steady, but ${randomComm} is always in demand.`;
    } else if (type === 1) { // Pirate Warning
        const randomPort = ports[Math.floor(Math.random() * ports.length)];
        if (randomPort.dangerLevel >= 2) rumorText = `Watch your back near ${randomPort.name}. The waters are crawling with pirate frigates.`;
        else rumorText = `The route to ${randomPort.name} is fairly safe these days. The navy has been patrolling well.`;
    } else { // Lore
        const lore = [
            "They say a ghost ship haunts the waters near Barcelona at night...",
            "The Ottoman Empire is tightening its grip on the eastern trade routes.",
            "A merchant from Venice claimed to have found a map to a hidden city in the Sahara.",
            "The rum here is watered down, but the gossip is pure gold.",
            "A great storm is brewing in the Atlantic, stay safe near the Pillars of Hercules."
        ];
        rumorText = lore[Math.floor(Math.random() * lore.length)];
    }

    setRumors((prev: Rumor[]) => [{ id: Math.random().toString(), text: rumorText }, ...prev.slice(0, 4)]);
  };

  const bribe = () => {
    if (player.gold >= 50) {
      setPlayer((prev: Player) => ({ ...prev, gold: prev.gold - 50 }));
      addRumor();
    }
  };

  const repair = () => {
    const flagship = player.fleet[0];
    const cost = (flagship.hullHealth.max - flagship.hullHealth.current) * 10;
    if (player.gold >= cost) {
      setPlayer(prev => {
        const newFleet = [...prev.fleet];
        newFleet[0] = { ...newFleet[0], hullHealth: { ...newFleet[0].hullHealth, current: newFleet[0].hullHealth.max } };
        return { ...prev, gold: prev.gold - cost, fleet: newFleet };
      });
    }
  };

  const buyUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;
    if (player.gold < upgrade.cost) return;
    if (player.fleet[0].upgrades.includes(upgradeId)) return;

    setPlayer(prev => {
        const newFleet = [...prev.fleet];
        newFleet[0] = { 
            ...upgrade.effect(newFleet[0]), 
            upgrades: [...newFleet[0].upgrades, upgradeId] 
        };
        return {
            ...prev,
            gold: prev.gold - upgrade.cost,
            fleet: newFleet
        };
    });
  };

  const updateBuilding = (portId: string, buildingId: string, updates: Partial<Building>) => {
    setPorts(prev => prev.map(p => {
        if (p.id !== portId) return p;
        return {
            ...p,
            buildings: p.buildings.map(b => b.id === buildingId ? { ...b, ...updates } : b)
        };
    }));
  };

  const updatePort = (id: string, x: number, y: number) => {
    setPorts(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  };

  return (
    <GameContext.Provider value={{ 
        player, setPlayer, ports, setPorts, rumors, battle, setBattle, 
        activeMinigame, setActiveMinigame, minigameResult, setMinigameResult,
        buy, sell, travel, bribe, addRumor, repair, buyUpgrade, updateBuilding, updatePort 
    }}>
      {children}
    </GameContext.Provider>
  );
};

// --- COMPONENTS ---
const AnimatedMarker: React.FC<{ type: string; label: string }> = ({ type }) => {
  const getIcon = () => {
    switch (type) {
      case 'mkt':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <defs>
              <linearGradient id="gold-mkt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="35%" stopColor="#FFA751" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gold-light-mkt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="64">
                <stop offset="0%" stopColor="#FFF2A3" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            {/* Scale Body */}
            {/* Base & Column */}
            <path d="M20 54h24M24 50h16M32 15v35" stroke="url(#gold-mkt)" strokeWidth="3" strokeLinecap="round" />
            {/* Top Ring/Cap */}
            <circle cx="32" cy="11" r="3" stroke="url(#gold-mkt)" strokeWidth="2.5" fill="none" />
            {/* Beam */}
            <path d="M12 21c10-3 30-3 40 0" stroke="url(#gold-mkt)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M32 21v-5" stroke="url(#gold-mkt)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left Plate and Chains */}
            <path d="M12 21L6 39M12 21L18 39" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 39h16c0 5-16 5-16 0Z" fill="url(#gold-light-mkt)" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Right Plate and Chains */}
            <path d="M52 21L46 39M52 21L58 39" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M44 39h16c0 5-16 5-16 0Z" fill="url(#gold-light-mkt)" stroke="url(#gold-mkt)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        );
      case 'ship':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <defs>
              <linearGradient id="gold-ship" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="35%" stopColor="#FFA751" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            {/* Shackle (Top Ring) - cleanly hollow, centered at Y=11 */}
            <circle cx="32" cy="11" r="5" stroke="url(#gold-ship)" strokeWidth="3.2" fill="none" />
            
            {/* Shank (Vertical Shaft) - starts at the bottom edge of the ring (Y=16) and runs down to the bottom arc (Y=48) */}
            <path d="M 32 16 L 32 48" stroke="url(#gold-ship)" strokeWidth="5.5" strokeLinecap="round" />
            
            {/* Stock (Horizontal Crossbar) - flat caps, positioned at Y=22 */}
            <path d="M 18 22 L 46 22" stroke="url(#gold-ship)" strokeWidth="4.5" strokeLinecap="square" />
            
            {/* Crown (Bottom Curved Arm) */}
            <path d="M 14 36 C 14 53, 50 53, 50 36" stroke="url(#gold-ship)" strokeWidth="5.2" strokeLinecap="round" fill="none" />
            
            {/* Left Fluke (Sharper and pointing straight up) */}
            <path d="M 14 37 L 7 34 L 16 28 Z" fill="url(#gold-ship)" stroke="url(#gold-ship)" strokeWidth="1" strokeLinejoin="round" />
            
            {/* Right Fluke (Sharper and pointing straight up) */}
            <path d="M 50 37 L 57 34 L 48 28 Z" fill="url(#gold-ship)" stroke="url(#gold-ship)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        );
      case 'bar':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <defs>
              <linearGradient id="gold-bar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="35%" stopColor="#FFA751" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gold-light-bar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="64">
                <stop offset="0%" stopColor="#FFF2A3" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            {/* Handle */}
            <path d="M42 24h6c4 0 6 3 6 7v10c0 4-2 7-6 7h-6" stroke="url(#gold-bar)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Mug Body */}
            <path d="M20 22h24l-3 28H23Z" fill="url(#gold-light-bar)" stroke="url(#gold-bar)" strokeWidth="3" strokeLinejoin="round" />
            {/* Vertical Panels inside the mug */}
            <path d="M26 22l-1.5 28M32 22v28M38 22l1.5 28" stroke="url(#gold-bar)" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
            {/* Bottom Base rim */}
            <path d="M21 50h22" stroke="url(#gold-bar)" strokeWidth="4" strokeLinecap="round" />
            {/* Overflowing Foam */}
            <path d="M 18 22 C 16 20, 16 16, 19 15 C 18 12, 22 10, 25 11 C 27 8, 33 8, 35 11 C 38 9, 42 11, 42 14 C 45 15, 46 19, 44 22 Z" fill="#FFF8E7" stroke="url(#gold-bar)" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Bubble details */}
            <circle cx="25" cy="12" r="1.5" fill="url(#gold-bar)" opacity="0.8" />
            <circle cx="34" cy="9" r="1" fill="url(#gold-bar)" opacity="0.6" />
            <circle cx="38" cy="14" r="1.5" fill="url(#gold-bar)" opacity="0.8" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="url(#gold-default)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
            <defs>
              <linearGradient id="gold-default" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#FFE259" />
                <stop offset="100%" stopColor="#FFA751" />
              </linearGradient>
            </defs>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        );
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center animate-marker-float group"
      style={{
        filter: `drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))`
      }}
    >
      {/* Medallion Badge (Gold coin look with beaded border and sweeping shine on hover) */}
      <div 
        className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 border border-amber-500/40 flex items-center justify-center transition-all duration-300 relative group-hover:scale-110 group-hover:border-amber-400 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer"
        style={{
          boxShadow: `0 4px 10px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(251,191,36,0.15)`
        }}
      >
        {/* Outer Embossed Ridge Rim */}
        <div className="absolute inset-[1.5px] rounded-full border-2 border-amber-600/50 pointer-events-none" />
        
        {/* Coin Beaded Inner Circle with slow rotational movement */}
        <div className="absolute inset-[5px] rounded-full border border-dashed border-amber-500/25 pointer-events-none animate-slow-spin" />
        
        {/* Sweeping Hover Shine Effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className="w-1/2 h-full bg-white/10 skew-x-[-20deg] translate-x-[-120%] group-hover:translate-x-[240%] transition-transform duration-1000 ease-out" />
        </div>

        {/* Central Gold Vector Icon */}
        <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          {getIcon()}
        </div>
      </div>
      
      {/* Pointer triangle to anchor the marker (Gold) */}
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500/80 -mt-[1px] transition-colors duration-300 group-hover:border-t-amber-400" />
      
      {/* Center glowing dot at the tip of the pointer for grounding */}
      <div className="w-2 h-2 rounded-full bg-amber-400 absolute -bottom-[12px] shadow-[0_0_10px_#f59e0b] opacity-80" />
    </div>
  );
};

const App: React.FC = () => {
  const [tab, setTab] = useState('port');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handlePortMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handlePortMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };
  
  
  // GLOBAL ANIMATIONS
  const globalStyles = (
    <style>{`
        @keyframes shipFloat { 
            0%, 100% { transform: translateY(0); } 
            33% { transform: translateY(-4px); } 
            66% { transform: translateY(2px); } 
        }
        .animate-ship-float { animation: shipFloat 4s ease-in-out infinite; }

        @keyframes markerFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        .animate-marker-float { animation: markerFloat 3s ease-in-out infinite; }

        @keyframes slowSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .animate-slow-spin { animation: slowSpin 120s linear infinite; }

        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }

        @keyframes kenBurns {
            0% { transform: scale(1.02) translate(0, 0); }
            50% { transform: scale(1.08) translate(-1.5%, -0.5%); }
            100% { transform: scale(1.02) translate(0, 0); }
        }
        .animate-ken-burns { 
            animation: kenBurns 40s ease-in-out infinite; 
            transform-origin: center center;
        }

        /* Cannonball flight path - 3D arc right */
        @keyframes cannonballRight {
            0% { left: 18%; top: 40%; transform: scale(0.9); opacity: 1; }
            50% { top: 10%; transform: scale(1.6); }
            100% { left: 78%; top: 40%; transform: scale(0.9); opacity: 0; }
        }
        .animate-cannonball-right {
            animation: cannonballRight 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        /* Cannonball flight path - 3D arc left */
        @keyframes cannonballLeft {
            0% { left: 78%; top: 40%; transform: scale(0.9); opacity: 1; }
            50% { top: 10%; transform: scale(1.6); }
            100% { left: 18%; top: 40%; transform: scale(0.9); opacity: 0; }
        }
        .animate-cannonball-left {
            animation: cannonballLeft 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        /* Ship impact shake */
        @keyframes shake {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            20%, 60% { transform: translate(-6px, 3px) rotate(-2deg); }
            40%, 80% { transform: translate(6px, -3px) rotate(2deg); }
        }
        .animate-shake {
            animation: shake 0.35s ease-in-out;
        }
    `}</style>
  );
  const [isTraveling, setIsTraveling] = useState(false);
  const [targetPortId, setTargetPortId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingBuildingId, setDraggingBuildingId] = useState<string | null>(null);
  const [resizingBuildingId, setResizingBuildingId] = useState<string | null>(null);
  const [draggingPortId, setDraggingPortId] = useState<string | null>(null);
  const [cannonball, setCannonball] = useState<{ from: 'player' | 'enemy' } | null>(null);
  const [shake, setShake] = useState<'player' | 'enemy' | null>(null);
  const portScrollRef = useRef<HTMLDivElement | null>(null);
  const mapScrollRef = useRef<HTMLDivElement | null>(null);

  const context = useContext(GameContext);
  if (!context) return null;


  const { 
    player, setPlayer, ports, setPorts, rumors, battle, setBattle, 
    activeMinigame, setActiveMinigame, minigameResult, setMinigameResult,
    buy, sell, travel, bribe, addRumor, repair, buyUpgrade, updateBuilding, updatePort 
  } = context;

  const [currentMinigameType, setCurrentMinigameType] = useState<string | null>(null);
  const [armWrestlePos, setArmWrestlePos] = useState(50);
  const [armWrestleDir, setArmWrestleDir] = useState(1);

  // Randomize game when entering Cantina
  useEffect(() => {
    if (tab === 'cantina') {
        const games = ['dice', 'coin', 'arm'];
        setCurrentMinigameType(games[Math.floor(Math.random() * games.length)]);
    } else {
        setActiveMinigame(null);
        setMinigameResult(null);
    }
  }, [tab]);

  const centerOnShip = (smooth = true) => {
    if (!portScrollRef.current) return;
    const currentPort = ports.find((p: Port) => p.id === player.currentPortId);
    const shipBuilding = currentPort?.buildings.find((b: any) => b.id === 'sail');
    if (!shipBuilding) return;
    const container = portScrollRef.current;
    const scrollWidth = container.scrollWidth;
    const viewportWidth = container.clientWidth;
    if (viewportWidth === 0) return;
    const shipPixelX = (shipBuilding.x / 100) * scrollWidth;
    const targetScroll = shipPixelX - (viewportWidth / 2);
    container.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  const centerOnCurrentPort = (smooth = true) => {
    if (!mapScrollRef.current) return;
    const currentPort = ports.find((p: Port) => p.id === player.currentPortId);
    if (!currentPort) return;
    const container = mapScrollRef.current;
    const scrollWidth = container.scrollWidth;
    const viewportWidth = container.clientWidth;
    if (viewportWidth === 0) return;
    const portPixelX = (currentPort.x / 100) * scrollWidth;
    const targetScroll = portPixelX - (viewportWidth / 2);
    container.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  // Center port view on the ship
  useEffect(() => {
    if (tab === 'port') {
      centerOnShip(false);
      const timer = setTimeout(() => centerOnShip(true), 200);
      const handleResize = () => centerOnShip(false);
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [tab, player.currentPortId, ports]);

  // Center map view on current port
  useEffect(() => {
    if (tab === 'map') {
      centerOnCurrentPort(false);
      const timer = setTimeout(() => centerOnCurrentPort(true), 200);
      const handleResize = () => centerOnCurrentPort(false);
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [tab, player.currentPortId, ports]);

  // Imperatively handle touchmove to prevent container scroll during active drag in Port Edit Mode
  useEffect(() => {
    const container = portScrollRef.current;
    if (!container) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (isEditMode && (draggingBuildingId || resizingBuildingId || draggingPortId)) {
        if (e.cancelable) e.preventDefault();
      }
    };
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isEditMode, draggingBuildingId, resizingBuildingId, draggingPortId]);

  // Imperatively handle touchmove to prevent container scroll during active drag in Map Edit Mode
  useEffect(() => {
    const container = mapScrollRef.current;
    if (!container) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (isEditMode && draggingPortId) {
        if (e.cancelable) e.preventDefault();
      }
    };
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isEditMode, draggingPortId]);

  // Arm Wrestling Loop
  useEffect(() => {
    let interval: any;
    if (activeMinigame === 'arm' && !minigameResult) {
        interval = setInterval(() => {
            setArmWrestlePos(prev => {
                let next = prev + (5 * armWrestleDir);
                if (next >= 90) { setArmWrestleDir(-1); return 90; }
                if (next <= 10) { setArmWrestleDir(1); return 10; }
                return next;
            });
        }, 30);
    }
    return () => clearInterval(interval);
  }, [activeMinigame, armWrestleDir, minigameResult]);

  const startMinigame = () => {
    if (player.gold < 10) return;
    setPlayer((prev: Player) => ({ ...prev, gold: prev.gold - 10 }));
    setMinigameResult(null);
    setActiveMinigame(currentMinigameType);
  };

  const handleDiceRoll = () => {
    const playerRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    const barkeepRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    const win = playerRoll > barkeepRoll;
    setMinigameResult({ playerRoll, barkeepRoll, win });
    if (win) addRumor();
  };

  const handleCoinFlip = (choice: string) => {
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = choice === flip;
    setMinigameResult({ flip, choice, win });
    if (win) addRumor();
  };

  const handleArmWrestle = () => {
    const win = armWrestlePos >= 40 && armWrestlePos <= 60;
    setMinigameResult({ win });
    if (win) addRumor();
  };
  const currentPort = ports.find((p: Port) => p.id === player.currentPortId);
  const currentCargo = Object.values(player.cargo).reduce((a: number, b: any) => a + b, 0);
  const flagship = player.fleet[0];

  const addBattleLog = (msg: string) => {
    setBattle((prev: any) => ({ ...prev, battleLog: [msg, ...prev.battleLog] }));
  };

  const handleVictory = () => {
    const goldLoot = 100 + Math.floor(Math.random() * 200);
    const lootCommodity = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
    const lootAmount = 1 + Math.floor(Math.random() * 2);
    
    setBattle((prev: any) => ({
        ...prev,
        loot: { gold: goldLoot, cargo: { [lootCommodity]: lootAmount } },
        battleLog: [`VICTORY! You plundered ${goldLoot} gold and ${lootAmount}x ${lootCommodity}!`, ...prev.battleLog]
    }));

    // Apply Loot
    setPlayer((prev: Player) => ({
        ...prev,
        gold: prev.gold + goldLoot,
        cargo: { ...prev.cargo, [lootCommodity]: prev.cargo[lootCommodity] + lootAmount }
    }));
  };

  const handleDefeat = () => {
    addBattleLog("DEFEAT! Your ship is left adrift. Pirates plundered your hold...");
    setTimeout(() => {
        setPlayer((prev: Player) => {
            const newFleet = [...prev.fleet];
            newFleet[0] = { ...newFleet[0], hullHealth: { ...newFleet[0].hullHealth, current: 1 } };
            return {
                ...prev,
                gold: Math.floor(prev.gold / 2),
                cargo: Object.fromEntries(COMMODITIES.map(t => [t, 0])) as any,
                fleet: newFleet
            };
        });
        setIsTraveling(false);
        setTargetPortId(null);
        setBattle(null);
        setTab('port');
    }, 3000);
  };

  const handleFire = () => {
    if (!battle || !battle.isPlayerTurn) return;

    // Trigger Player Cannonball
    setCannonball({ from: 'player' });

    setTimeout(() => {
        // Cannonball lands on enemy!
        setCannonball(null);
        setShake('enemy');
        setTimeout(() => setShake(null), 350);

        const playerDmg = flagship.firepower + Math.floor(Math.random() * 3);
        const newEnemyHull = Math.max(0, (battle.enemyShip?.hullHealth.current || 0) - playerDmg);
        
        setBattle((prev: any) => ({
            ...prev,
            enemyShip: { ...prev.enemyShip, hullHealth: { ...prev.enemyShip.hullHealth, current: newEnemyHull } },
            battleLog: [`You fired cannons, hitting ${battle.enemyShip?.name} for ${playerDmg} damage!`, ...prev.battleLog],
            isPlayerTurn: false
        }));

        if (newEnemyHull <= 0) {
            handleVictory();
            return;
        }

        // Trigger Enemy retaliatory fire after a short delay
        setTimeout(() => {
            if (!battle.enemyShip) return; // safety check
            
            // Trigger Enemy Cannonball
            setCannonball({ from: 'enemy' });

            setTimeout(() => {
                // Cannonball lands on player!
                setCannonball(null);
                setShake('player');
                setTimeout(() => setShake(null), 350);

                const enemyDmg = (battle.enemyShip?.firepower || 1) + Math.floor(Math.random() * 2);
                const newPlayerHull = Math.max(0, flagship.hullHealth.current - enemyDmg);
                
                setPlayer((prev: Player) => {
                    const newFleet = [...prev.fleet];
                    newFleet[0] = { ...newFleet[0], hullHealth: { ...newFleet[0].hullHealth, current: newPlayerHull } };
                    return { ...prev, fleet: newFleet };
                });

                addBattleLog(`${battle.enemyShip?.name} fired back, dealing ${enemyDmg} damage!`);
                
                if (newPlayerHull <= 0) {
                    handleDefeat();
                } else {
                    setBattle((prev: any) => ({ ...prev, isPlayerTurn: true }));
                }
            }, 600); // enemy flight time

        }, 1000); // delay before enemy fires

    }, 600); // player flight time
  };

  const handleFlee = () => {
    if (!battle || !battle.isPlayerTurn) return;

    const fleeChance = (flagship.speed / (battle.enemyShip?.speed || 1)) * 0.5;
    if (Math.random() < fleeChance) {
        addBattleLog("Success! You outran the pirates!");
        setTimeout(() => {
            const destId = targetPortId || player.currentPortId;
            travel(destId);
            setIsTraveling(false);
            setTargetPortId(null);
            setBattle(null);
            setTab('port');
        }, 1500);
    } else {
        addBattleLog("Failed to escape! The pirates are closing in!");
        setBattle((prev: any) => ({ ...prev, isPlayerTurn: false }));
        
        // Enemy gets free shot
        setTimeout(() => {
            // Trigger Enemy Cannonball
            setCannonball({ from: 'enemy' });

            setTimeout(() => {
                setCannonball(null);
                setShake('player');
                setTimeout(() => setShake(null), 350);

                const enemyDmg = (battle.enemyShip?.firepower || 1) + Math.floor(Math.random() * 2);
                const newPlayerHull = Math.max(0, flagship.hullHealth.current - enemyDmg);
                setPlayer((prev: Player) => {
                    const newFleet = [...prev.fleet];
                    newFleet[0] = { ...newFleet[0], hullHealth: { ...newFleet[0].hullHealth, current: newPlayerHull } };
                    return { ...prev, fleet: newFleet };
                });
                addBattleLog(`${battle.enemyShip?.name} hit you while you tried to flee, dealing ${enemyDmg} damage!`);
                if (newPlayerHull <= 0) {
                    handleDefeat();
                } else {
                    setBattle((prev: any) => ({ ...prev, isPlayerTurn: true }));
                }
            }, 600); // enemy flight time
        }, 1000);
    }
  };

  const handleTravel = (destId: string) => {
    if (isTraveling) return;
    const dest = ports.find((p: Port) => p.id === destId)!;
    
    // Random Ambush Chance
    if (Math.random() < (dest.dangerLevel * 0.2)) {
        setTargetPortId(destId);
        setIsTraveling(true);
        setTimeout(() => {
            const enemy = generateEnemy(dest.dangerLevel);
            setBattle({
                enemyShip: enemy,
                battleLog: [`AMBUSH! ${enemy.name} (${enemy.shipClass}) intercepts you!`],
                isPlayerTurn: true
            });
            setTab('battle');
        }, 1000);
    } else {
        setTargetPortId(destId);
        setIsTraveling(true);
        setTimeout(() => {
            travel(destId);
            setIsTraveling(false);
            setTargetPortId(null);
            setTab('port');
        }, 2000);
    }
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditMode) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // Calculate absolute pixel coordinates relative to the scrollable content
    const xPx = clientX - rect.left + container.scrollLeft;
    const yPx = clientY - rect.top + container.scrollTop;
    
    // Calculate percentage relative to the scrollable content's total size
    const x = Math.round((xPx / container.scrollWidth) * 100);
    const y = Math.round((yPx / container.scrollHeight) * 100);
    
    if (draggingBuildingId) {
        updateBuilding(player.currentPortId, draggingBuildingId, { x, y });
    } else if (resizingBuildingId) {
        const building = currentPort.buildings.find((b: Building) => b.id === resizingBuildingId);
        if (building) {
            const dx = Math.abs(x - building.x);
            const dy = Math.abs(y - building.y);
            const newScale = Math.max(0.2, Math.min(3, (dx + dy) / 10));
            updateBuilding(player.currentPortId, resizingBuildingId, { scale: newScale });
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
      alert("Layout & Progress copied to clipboard! Paste it into the 'Import' box on your other device.");
    }).catch(() => {
      prompt("Copy this Layout & Progress data:", data);
    });
  };

  const handleImport = () => {
    const data = prompt("Paste your exported Layout & Progress data here:");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.ports) {
        setPorts(parsed.ports);
        localStorage.setItem('tradewinds_ports', JSON.stringify(parsed.ports));
      }
      if (parsed.player) {
        setPlayer(parsed.player);
        localStorage.setItem('tradewinds_player', JSON.stringify(parsed.player));
      }
      alert("Data imported successfully! Reloading...");
      window.location.reload();
    } catch (e) {
      alert("Invalid format. Please make sure you copied the correct text.");
    }
  };

  const startPort = currentPort;
  const endPort = ports.find((p: Port) => p.id === targetPortId);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans max-w-md mx-auto overflow-hidden border-x border-slate-800 shadow-2xl relative">
      {globalStyles}
      {/* HUD */}
      <div className="bg-slate-900/95 backdrop-blur-md p-4 border-b border-slate-800 grid grid-cols-2 gap-4 shadow-lg z-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Doubloons</span>
          <span className="text-2xl font-black text-yellow-500 tracking-tighter">{player.gold.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-end relative gap-1">
          <div className="flex gap-1 mb-1">
            <button onClick={() => { if (window.confirm('Reset layouts and player progress?')) { localStorage.removeItem('tradewinds_ports'); localStorage.removeItem('tradewinds_player'); window.location.reload(); } }} className="px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700">Reset</button>
            <button onClick={handleImport} className="px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700">Import</button>
            <button onClick={handleExport} className="px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700">Export</button>
          </div>
          <button onClick={() => setIsEditMode(!isEditMode)} className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-colors ${isEditMode ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{isEditMode ? 'Exit Edit' : 'Edit Mode'}</button>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Log Day {player.gameDay}</span>
        </div>
      </div>

      <div className="flex-1 relative pb-24 min-h-0 flex flex-col">
        {tab === 'port' && (
          <div className="flex-1 relative animate-in fade-in duration-700 overflow-hidden">
            <div 
                ref={portScrollRef}
                className="relative h-full overflow-x-auto overflow-y-hidden custom-scrollbar" 
                onMouseMove={(e) => {
                    handleDragMove(e);
                    handlePortMouseMove(e);
                }} 
                onTouchMove={handleDragMove} 
                onMouseUp={handleDragEnd} 
                onTouchEnd={handleDragEnd}
                onMouseLeave={handlePortMouseLeave}
            >
                {/* Ken Burns Animated Outer Wrapper (keeps full sync with internal items) */}
                <div className="relative h-full overflow-hidden animate-ken-burns" style={{ width: '200%', transformStyle: 'preserve-3d' }}>
                    {/* Interactive Cursor-Driven 3D Tilt Inner Wrapper */}
                    <div 
                        className="absolute inset-0" 
                        style={{ 
                            transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 16}px) rotateX(${mousePos.y * -3}deg) rotateY(${mousePos.x * 3}deg) scale(1.04)`,
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.25s ease-out',
                        }}
                    >
                        {/* Background Layer */}
                        <div className="absolute inset-0 bg-slate-900 pointer-events-none">
                            <img 
                                src={currentPort.image} 
                                className="w-full h-full object-cover opacity-90 transition-opacity duration-1000 pointer-events-none" 
                                alt="Port" 
                                draggable="false" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40 pointer-events-none" />
                        </div>

                        {/* Buildings Overlay Layer */}
                        <div className="absolute inset-0 z-20">
                            {currentPort.buildings.map((b: Building) => (
                                <button 
                                    key={b.id} 
                                    onMouseDown={(e) => { if (isEditMode) { e.preventDefault(); setDraggingBuildingId(b.id); } }} 
                                    onTouchStart={(e) => { if (isEditMode) { setDraggingBuildingId(b.id); } }}
                                    onClick={() => !isEditMode && setTab(b.tab)} 
                                    className={`absolute group flex flex-col items-center ${isEditMode ? 'cursor-move' : ''}`} 
                                    style={{ left: `${b.x}%`, top: `${b.y}%`, transform: `translate(-50%, -50%) scale(${b.scale || 1})` }}
                                >
                                    <div className="relative">
                                        {b.id === 'sail' ? (
                                            <div className="animate-ship-float">
                                                <style>{`
                                                    @keyframes shipFloat { 0%, 100% { transform: translateY(0); } 33% { transform: translateY(-4px); } 66% { transform: translateY(2px); } }
                                                    .animate-ship-float { animation: shipFloat 4s ease-in-out infinite; }
                                                `}</style>
                                                <img src={b.image} className="w-36 h-36 object-contain relative z-10 transition-all duration-300 group-hover:brightness-110" alt={b.label} draggable="false" />
                                            </div>
                                        ) : (
                                            <AnimatedMarker type={b.id} label={b.label} />
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
                                    <span className={`text-[10px] font-black uppercase tracking-[0.25em] bg-slate-950/90 text-white px-4 py-1.5 rounded-full border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap backdrop-blur-md pointer-events-none z-50 ${b.id === 'sail' ? '-mt-8 ml-8' : 'mt-2'}`}>{b.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute top-8 left-0 right-0 text-center pointer-events-none sticky left-0 z-30 flex flex-col items-center">
                    <div className="bg-slate-950/20 backdrop-blur-[2px] px-8 py-2 rounded-3xl border border-white/5">
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_10px_rgba(0,0,0,1)]">{currentPort.name}</h1>
                    </div>
                </div>
            </div>
          </div>
        )}

        {tab === 'map' && (
          <div className="flex-1 relative bg-[#1a2b3c] flex flex-col animate-in fade-in duration-500">
            <div className="p-4 flex justify-between items-center z-20 bg-slate-900/80 backdrop-blur-md">
                <button onClick={() => setTab('port')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/80 px-4 py-2 rounded-full border border-slate-800 hover:text-white">← Back</button>
                <h2 className="text-sm font-black italic text-slate-300 uppercase tracking-[0.2em]">The Mediterranean</h2>
            </div>
            <div 
                ref={mapScrollRef}
                className="flex-1 relative overflow-x-auto overflow-y-hidden custom-scrollbar" 
                onMouseMove={handleDragMove} 
                onTouchMove={handleDragMove} 
                onMouseUp={handleDragEnd} 
                onTouchEnd={handleDragEnd}
            >
                <div className="relative h-full" style={{ width: '200%' }}>
                    <img src="/assets/World Map.png" className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="World Map" draggable="false" />
                    {ports.map((p: Port) => {
                        const isCurrent = p.id === player.currentPortId;
                        return (
                            <div key={p.id} className="absolute z-10" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                                <button 
                                    onMouseDown={(e) => { if (isEditMode) { e.preventDefault(); setDraggingPortId(p.id); } }} 
                                    onTouchStart={(e) => { if (isEditMode) { setDraggingPortId(p.id); } }}
                                    disabled={!isEditMode && (isTraveling || isCurrent)} 
                                    onClick={() => !isEditMode && handleTravel(p.id)} 
                                    className={`w-12 h-16 flex flex-col items-center transition-all ${isCurrent ? 'scale-125' : 'opacity-80 hover:opacity-100 hover:scale-110'}`}
                                >
                                    <img src="/assets/map pin.png" className={`w-8 h-8 object-contain drop-shadow-lg ${isCurrent ? 'drop-shadow-[0_0_10px_rgba(234,179,8,1)] brightness-125' : 'brightness-90'}`} alt={p.name} />
                                    <span className={`text-[9px] font-black uppercase tracking-tighter mt-0.5 block drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${isCurrent ? 'text-yellow-400' : 'text-slate-100'}`}>{p.name}</span>
                                </button>
                            </div>
                        );
                    })}
                    {isTraveling && startPort && endPort && (
                        <div className="absolute w-24 h-24 -ml-12 -mt-12 z-30 pointer-events-none" style={{ animation: `moveShip 2s ease-in-out forwards` }}>
                            <style>{` @keyframes moveShip { 0% { left: ${startPort.x}%; top: ${startPort.y}%; transform: scaleX(${endPort.x < startPort.x ? 1 : -1}); } 100% { left: ${endPort.x}%; top: ${endPort.y}%; transform: scaleX(${endPort.x < startPort.x ? 1 : -1}); } } `}</style>
                            <img src="/assets/easy remove boat.png" className="w-full h-full object-contain" alt="Traveling Ship" />
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {tab === 'market' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300 relative overflow-hidden min-h-0">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src={currentPort.image} className="w-full h-full object-cover blur-md" alt="" />
                <div className="absolute inset-0 bg-slate-950/60" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <div className="h-48 bg-slate-900/40 border-b border-slate-800/50 overflow-hidden backdrop-blur-sm shrink-0">
                    <img src="/assets/Market Transparent.png" className="w-full h-full object-contain pointer-events-none" alt="Market Stall" draggable="false" />
                    <button onClick={() => setTab('port')} className="absolute top-4 left-4 z-10 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/80 px-4 py-2 rounded-full border border-slate-800 hover:text-white">← Leave Pier</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 custom-scrollbar min-h-0">
                    {COMMODITIES.map(t => {
                      const price = calculatePrice(currentPort.market[t]);
                      return (
                        <div key={t} className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex justify-between items-center shadow-xl hover:bg-slate-800/60 transition-colors">
                          <div>
                            <h3 className="font-black text-lg italic tracking-tight uppercase text-slate-100">{t}</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Hold: {player.cargo[t]}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-black text-yellow-500 font-mono tracking-tighter">P{price}</span>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => buy(t)} disabled={player.gold < price || currentCargo >= flagship.cargoCapacity} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20">Buy</button>
                              <button onClick={() => sell(t)} disabled={player.cargo[t] <= 0} className="bg-rose-600 hover:bg-rose-500 disabled:opacity-20 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-900/20">Sell</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
            </div>
          </div>
        )}

        {tab === 'cantina' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-left duration-300 relative overflow-hidden min-h-0">
            {/* Background Aesthetic */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src={currentPort.image} className="w-full h-full object-cover blur-md" alt="" />
                <div className="absolute inset-0 bg-slate-950/60" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 pb-32 custom-scrollbar min-h-0">
                    <button onClick={() => setTab('port')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 block hover:text-white bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800/50 w-fit backdrop-blur-md">← Back to Port</button>
                    <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 text-center shadow-2xl overflow-hidden relative min-h-[400px] flex flex-col justify-center">
                        
                        {activeMinigame ? (
                            <div className="space-y-8 animate-in zoom-in duration-300">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400">
                                    {activeMinigame === 'dice' && "Captain's Dice"}
                                    {activeMinigame === 'coin' && "Heads or Tails"}
                                    {activeMinigame === 'arm' && "Arm Wrestling"}
                                </h2>

                                {activeMinigame === 'dice' && (
                                    <div className="space-y-6">
                                        {!minigameResult ? (
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="text-6xl animate-bounce">🎲</div>
                                                <button onClick={handleDiceRoll} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Roll Dice</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex justify-around text-4xl font-black italic">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] text-slate-500 uppercase not-italic">You</span>
                                                        <span className="text-blue-400">{minigameResult.playerRoll}</span>
                                                    </div>
                                                    <div className="text-slate-700">vs</div>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] text-slate-500 uppercase not-italic">Barkeep</span>
                                                        <span className="text-rose-400">{minigameResult.barkeepRoll}</span>
                                                    </div>
                                                </div>
                                                <p className={`text-lg font-black uppercase tracking-widest ${minigameResult.win ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`}>
                                                    {minigameResult.win ? "Victory! Information is yours." : "Defeat! Better luck next time."}
                                                </p>
                                                <button onClick={() => setActiveMinigame(null)} className="text-[10px] font-black uppercase text-slate-400 underline decoration-slate-800">Return to Bar</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeMinigame === 'coin' && (
                                    <div className="space-y-6">
                                        {!minigameResult ? (
                                            <div className="flex flex-col items-center gap-8">
                                                <div className="text-6xl animate-spin-slow">🪙</div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => handleCoinFlip('heads')} className="bg-yellow-600 hover:bg-yellow-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Heads</button>
                                                    <button onClick={() => handleCoinFlip('tails')} className="bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Tails</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="text-6xl mb-4">🪙</div>
                                                <p className="text-slate-400 uppercase font-bold tracking-widest">Result: {minigameResult.flip}</p>
                                                <p className={`text-lg font-black uppercase tracking-widest ${minigameResult.win ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`}>
                                                    {minigameResult.win ? "Victory! Information is yours." : "Defeat! The coin fell wrong."}
                                                </p>
                                                <button onClick={() => setActiveMinigame(null)} className="text-[10px] font-black uppercase text-slate-400 underline decoration-slate-800">Return to Bar</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeMinigame === 'arm' && (
                                    <div className="space-y-6">
                                        {!minigameResult ? (
                                            <div className="flex flex-col items-center gap-8 w-full">
                                                <div className="flex justify-between w-full px-4 text-xs font-black text-slate-500 uppercase">
                                                    <span>Weak</span>
                                                    <span className="text-emerald-500">SLAM!</span>
                                                    <span>Weak</span>
                                                </div>
                                                <div className="w-full h-8 bg-slate-950 rounded-full border border-white/5 relative overflow-hidden shadow-inner">
                                                    <div className="absolute inset-y-0 left-[40%] right-[40%] bg-emerald-500/20 border-x border-emerald-500/50" />
                                                    <div className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_15px_white] transition-all duration-30" style={{ left: `${armWrestlePos}%` }} />
                                                </div>
                                                <button onClick={handleArmWrestle} className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-2xl font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">SLAM!</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="text-6xl mb-4">{minigameResult.win ? '💪' : '😫'}</div>
                                                <p className={`text-lg font-black uppercase tracking-widest ${minigameResult.win ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`}>
                                                    {minigameResult.win ? "Victory! He pinned like a child." : "Defeat! Your arm snapped like a twig."}
                                                </p>
                                                <button onClick={() => setActiveMinigame(null)} className="text-[10px] font-black uppercase text-slate-400 underline decoration-slate-800">Return to Bar</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <span className="text-7xl mb-8 block animate-bounce">🍺</span>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 text-yellow-600">The Salty Spitter</h2>
                                <p className="text-sm text-slate-400 mb-10 italic px-4">"The Mediterranean is a dangerous sea, lad. Gold buys truth, and luck buys even more."</p>
                                
                                <div className="space-y-4">
                                    <button onClick={bribe} disabled={player.gold < 50} className="group relative w-full bg-yellow-600 hover:bg-yellow-500 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:translate-y-1 transition-all shadow-yellow-900/30 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                        Bribe Barkeep (P50)
                                    </button>
                                    <button onClick={startMinigame} disabled={player.gold < 10} className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:translate-y-1 transition-all border border-white/5">
                                        Play {currentMinigameType === 'dice' ? "Captain's Dice" : currentMinigameType === 'coin' ? "Heads or Tails" : "Arm Wrestling"} (P10)
                                    </button>
                                </div>

                                <div className="mt-12 text-left space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] border-b border-white/5 pb-2">Recent Intelligence</h3>
                                    <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                        {rumors.length === 0 ? (
                                            <p className="text-xs italic text-slate-700">The walls have ears, but no one is talking...</p>
                                        ) : (
                                            rumors.map((r: any) => (
                                                <div key={r.id} className="bg-slate-950/60 backdrop-blur-md p-5 rounded-2xl border border-white/5 text-xs italic text-blue-400 leading-relaxed shadow-inner animate-in fade-in slide-in-from-top duration-500">
                                                    "{r.text}"
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}

        {tab === 'ship' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-top duration-300 relative overflow-hidden min-h-0">
            {/* Background Aesthetic */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src={currentPort.image} className="w-full h-full object-cover blur-md" alt="" />
                <div className="absolute inset-0 bg-slate-950/60" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <div className="h-48 bg-slate-900/40 border-b border-slate-800/50 overflow-hidden backdrop-blur-sm shrink-0">
                    <img src="/assets/Transparent Shipyard.png" className="w-full h-full object-contain p-4" alt="Shipyard" />
                    <button onClick={() => setTab('port')} className="absolute top-4 left-4 z-10 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/80 px-4 py-2 rounded-full border border-slate-800 hover:text-white">← Leave Shipyard</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40 custom-scrollbar min-h-0">
                    <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-blue-400">{flagship.name}</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Class: {flagship.shipClass}</p>
                            </div>
                            <span className="text-4xl">🏗️</span>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-[11px] font-black uppercase mb-3 tracking-widest">
                                    <span>Hull Integrity</span>
                                    <span className={flagship.hullHealth.current < 5 ? 'text-rose-500 animate-pulse' : 'text-blue-400'}>{flagship.hullHealth.current} / {flagship.hullHealth.max} HP</span>
                                </div>
                                <div className="w-full bg-slate-950/60 h-4 rounded-full border border-white/5 p-1 shadow-inner">
                                    <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(flagship.hullHealth.current / flagship.hullHealth.max) * 100}%` }} />
                                </div>
                            </div>
                            <button onClick={repair} disabled={flagship.hullHealth.current >= flagship.hullHealth.max || player.gold < 10} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-lg shadow-blue-900/30 active:scale-95 transition-all">Repair Hull</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] pl-2 mb-2">Available Upgrades</h3>
                        {UPGRADES.map(u => {
                            const isOwned = flagship.upgrades.includes(u.id);
                            const canAfford = player.gold >= u.cost;
                            return (
                                <div key={u.id} className={`bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/5 flex justify-between items-center transition-all ${isOwned ? 'opacity-40 grayscale' : 'hover:border-blue-500/30 shadow-xl'}`}>
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-black italic uppercase tracking-tight text-slate-100">{u.label}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">{u.description}</p>
                                    </div>
                                    <button onClick={() => buyUpgrade(u.id)} disabled={isOwned || !canAfford} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isOwned ? 'bg-slate-800 text-slate-600' : (canAfford ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500')}`}>{isOwned ? 'Installed' : `P${u.cost.toLocaleString()}`}</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
          </div>
        )}

        {tab === 'battle' && battle && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-500 relative overflow-hidden bg-slate-950">
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute inset-0 bg-[url('/assets/World Map.png')] bg-cover blur-xl grayscale" />
                <div className="absolute inset-0 bg-gradient-to-b from-rose-900/20 via-slate-950 to-slate-950" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col p-4">
                <div className="flex justify-between items-center mb-8 h-48 relative">
                    <div className="flex flex-col items-center gap-2 flex-1">
                        <div className={`animate-ship-float ${shake === 'player' ? 'animate-shake' : ''}`}>
                             <img src="/assets/easy remove boat.png" className="w-32 h-32 object-contain" alt="Your Ship" />
                        </div>
                        <div className="w-full space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-blue-400"><span>{flagship.name}</span><span>{flagship.hullHealth.current} HP</span></div>
                            <div className="h-1.5 bg-slate-900 rounded-full border border-white/5 overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(flagship.hullHealth.current / flagship.hullHealth.max) * 100}%` }} /></div>
                        </div>
                    </div>
                    <div className="text-2xl font-black italic text-rose-600 px-4 animate-pulse">VS</div>
                    <div className="flex flex-col items-center gap-2 flex-1">
                        <div className={`animate-ship-float ${shake === 'enemy' ? 'animate-shake' : ''}`} style={{ animationDelay: '0.5s' }}>
                             <img src="/assets/easy remove boat.png" className="w-32 h-32 object-contain scale-x-[-1] brightness-75 sepia-[0.3] hue-rotate-[320deg]" alt="Enemy Ship" />
                        </div>
                        <div className="w-full space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-rose-500"><span>{battle.enemyShip?.name}</span><span>{battle.enemyShip?.hullHealth.current} HP</span></div>
                            <div className="h-1.5 bg-slate-900 rounded-full border border-white/5 overflow-hidden"><div className="h-full bg-rose-600 transition-all duration-500" style={{ width: `${((battle.enemyShip?.hullHealth.current || 0) / (battle.enemyShip?.hullHealth.max || 1)) * 100}%` }} /></div>
                        </div>
                    </div>

                    {/* Flying Cannonball */}
                    {cannonball && (
                        <div 
                            className={`absolute w-5 h-5 rounded-full bg-slate-800 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.75)] z-40 flex items-center justify-center ${
                                cannonball.from === 'player' ? 'animate-cannonball-right' : 'animate-cannonball-left'
                            }`}
                        >
                            {/* Inner fiery core */}
                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        </div>
                    )}
                </div>
                <div className="h-48 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-4 overflow-y-auto mb-4 custom-scrollbar text-xs font-bold italic space-y-2 shrink-0">
                    {battle.battleLog.map((log: string, i: number) => (
                        <div key={i} className={`${log.includes('firing') || log.includes('hit') ? 'text-rose-400' : 'text-slate-300'} animate-in fade-in slide-in-from-left duration-300`}>• {log}</div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
                    {battle.enemyShip && battle.enemyShip.hullHealth.current > 0 ? (
                        <>
                            <button 
                                onClick={handleFire} 
                                disabled={!battle.isPlayerTurn}
                                className={`bg-rose-600 hover:bg-rose-500 py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-900/40 active:scale-95 transition-all ${!battle.isPlayerTurn ? 'opacity-50 grayscale' : ''}`}
                            >
                                Fire Cannons
                            </button>
                            <button 
                                onClick={handleFlee} 
                                disabled={!battle.isPlayerTurn}
                                className={`bg-slate-800 hover:bg-slate-700 py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${!battle.isPlayerTurn ? 'opacity-50 grayscale' : ''}`}
                            >
                                Flee
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => {
                                const destId = targetPortId || player.currentPortId;
                                travel(destId);
                                setIsTraveling(false);
                                setTargetPortId(null);
                                setBattle(null);
                                setTab('port');
                            }}
                            className="col-span-2 bg-emerald-600 hover:bg-emerald-500 py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/40 animate-bounce active:scale-95 transition-all"
                        >
                            Continue to {ports.find((p: Port) => p.id === targetPortId)?.name || 'Port'}
                        </button>
                    )}
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900/98 backdrop-blur-xl h-24 border-t border-slate-800 z-50 fixed bottom-0 left-0 right-0 max-w-md mx-auto px-8 flex items-center justify-between shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
         <div className="flex flex-col">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Hold Capacity</span>
            <span className="text-xl font-black text-emerald-400 italic tracking-tighter">{currentCargo} <span className="text-slate-600 text-sm">/ {flagship.cargoCapacity}</span></span>
         </div>
         <div className="h-10 w-px bg-slate-800" />
         <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Condition</span>
            <span className={`text-xl font-black italic tracking-tighter ${flagship.hullHealth.current < 5 ? 'text-rose-600 animate-pulse' : 'text-blue-500'}`}>{Math.round((flagship.hullHealth.current / flagship.hullHealth.max) * 100)}% <span className="text-slate-600 text-sm uppercase not-italic ml-1">Hull</span></span>
         </div>
      </div>
    </div>
  );
};

export default function WrappedApp() {
  return (
    <GameProvider>
      <App />
    </GameProvider>
  );
}
