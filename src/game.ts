// Game rules for Merchants of the Mediterranean: goods, ports, prices, ships, pirates.
// Everything here is plain data and pure functions; the screens live in App.tsx.

export type CommodityType =
  | 'Grain' | 'Salt' | 'Hemp' | 'Timber' | 'Wool' | 'Cotton' | 'Wine' | 'Paper'
  | 'Iron' | 'Oil' | 'Dye' | 'Spice' | 'Tobacco' | 'Tea' | 'Silk' | 'Tools'
  | 'Porcelain' | 'Weapons' | 'Silver' | 'Jewelry' | 'Gems' | 'Statues';

export interface Building {
  id: string;
  label: string;
  x: number; // left %
  y: number; // top %
  image: string;
  tab: string;
  scale?: number;
  flipped?: boolean;
}

export interface MarketCell {
  drift: number;    // slow random wander around 1
  pressure: number; // pushed up when you buy, down when you sell; fades each day
}

export interface Port {
  id: string;
  name: string;
  market: Record<CommodityType, MarketCell>;
  dangerLevel: number;
  x: number;
  y: number;
  image: string;
  buildings: Building[];
}

export interface Ship {
  id: string;
  name: string;
  shipClass: string;
  tier: number;
  hullHealth: { current: number; max: number };
  cargoCapacity: number;
  speed: number;
  firepower: number;
  upgrades: string[];
}

export interface Player {
  gold: number;
  fleet: Ship[];
  cargo: Record<CommodityType, number>;
  paid: Record<CommodityType, number>; // total gold spent on the units now in the hold
  currentPortId: string;
  gameDay: number;
  hasReadPrologue: boolean;
  hasWonGame: boolean;
  seenGuide: boolean;
  voyages: number;
}

// A temporary shortage or glut at one port.
export interface TradeEvent {
  id: string;
  portId: string;
  good: CommodityType;
  mult: number;
  daysLeft: number;
  known: boolean; // the player heard about it in a cantina
}

export interface Rumor {
  id: string;
  text: string;
  day: number;
}

export interface GameState {
  player: Player;
  ports: Port[];
  events: TradeEvent[];
  rumors: Rumor[];
}

export const GOAL = 50000;

export const COMMODITIES: CommodityType[] = [
  'Grain', 'Salt', 'Hemp', 'Timber', 'Wool', 'Cotton', 'Wine', 'Paper',
  'Iron', 'Oil', 'Dye', 'Spice', 'Tobacco', 'Tea', 'Silk', 'Tools',
  'Porcelain', 'Weapons', 'Silver', 'Jewelry', 'Gems', 'Statues',
];

export const BASE_PRICES: Record<CommodityType, number> = {
  Grain: 10, Salt: 15, Hemp: 20, Timber: 25, Wool: 30, Cotton: 35,
  Wine: 45, Paper: 50, Iron: 60, Oil: 80, Dye: 120, Spice: 150,
  Tobacco: 200, Tea: 250, Silk: 350, Tools: 400, Porcelain: 500,
  Weapons: 600, Silver: 750, Jewelry: 850, Gems: 1000, Statues: 1500,
};

// What each port produces (always cheap there) and craves (always dear there).
// Every good is made somewhere and wanted somewhere else, so routes can be learned.
export const PORT_TRADE: Record<string, { makes: CommodityType[]; wants: CommodityType[] }> = {
  sardinia:  { makes: ['Salt', 'Wool', 'Grain'],       wants: ['Paper', 'Wine', 'Tools'] },
  nice:      { makes: ['Timber', 'Paper', 'Oil'],      wants: ['Salt', 'Wool', 'Spice'] },
  rome:      { makes: ['Wine', 'Tools', 'Statues'],    wants: ['Grain', 'Oil', 'Gems'] },
  barcelona: { makes: ['Iron', 'Weapons', 'Silver'],   wants: ['Timber', 'Silk', 'Tea'] },
  venice:    { makes: ['Silk', 'Porcelain', 'Jewelry'], wants: ['Iron', 'Dye', 'Cotton'] },
  athens:    { makes: ['Hemp', 'Oil', 'Wine'],         wants: ['Silver', 'Porcelain', 'Tobacco'] },
  crete:     { makes: ['Dye', 'Tea', 'Salt'],          wants: ['Weapons', 'Tools', 'Statues'] },
  tunisia:   { makes: ['Cotton', 'Tobacco', 'Grain'],  wants: ['Paper', 'Iron', 'Silk'] },
  egypt:     { makes: ['Spice', 'Gems', 'Cotton'],     wants: ['Hemp', 'Wine', 'Jewelry'] },
};

const MAKES_BIAS = 0.6;
const WANTS_BIAS = 1.5;
const SELL_CUT = 0.92;       // merchants buy from you a little under their selling price
const PRESSURE_STEP = 0.03;  // each unit traded moves the price 3%
const PRESSURE_MIN = -0.5;
const PRESSURE_MAX = 0.6;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const newId = () => Math.random().toString(36).slice(2, 10);

export const emptyCargo = (): Record<CommodityType, number> =>
  Object.fromEntries(COMMODITIES.map(t => [t, 0])) as Record<CommodityType, number>;

export const generateMarket = (): Record<CommodityType, MarketCell> =>
  Object.fromEntries(COMMODITIES.map(t => [t, { drift: rand(0.85, 1.2), pressure: 0 }])) as Record<CommodityType, MarketCell>;

export const tradeRole = (portId: string, good: CommodityType): 'makes' | 'wants' | null => {
  const t = PORT_TRADE[portId];
  if (!t) return null;
  if (t.makes.includes(good)) return 'makes';
  if (t.wants.includes(good)) return 'wants';
  return null;
};

const bias = (portId: string, good: CommodityType) => {
  const role = tradeRole(portId, good);
  return role === 'makes' ? MAKES_BIAS : role === 'wants' ? WANTS_BIAS : 1;
};

const eventMult = (events: TradeEvent[], portId: string, good: CommodityType) =>
  events.reduce((m, e) => (e.portId === portId && e.good === good ? m * e.mult : m), 1);

const priceAt = (port: Port, good: CommodityType, events: TradeEvent[], pressure: number) =>
  Math.max(1, Math.round(BASE_PRICES[good] * bias(port.id, good) * port.market[good].drift * (1 + pressure) * eventMult(events, port.id, good)));

/** What one unit costs to buy here right now. */
export const buyPrice = (port: Port, good: CommodityType, events: TradeEvent[]) =>
  priceAt(port, good, events, port.market[good].pressure);

/** What one unit fetches if sold here right now. */
export const sellPrice = (port: Port, good: CommodityType, events: TradeEvent[]) =>
  Math.max(1, Math.floor(buyPrice(port, good, events) * SELL_CUT));

export const cargoCount = (p: Player) => Object.values(p.cargo).reduce((a, b) => a + b, 0);

export const netWorth = (p: Player) =>
  p.gold + COMMODITIES.reduce((sum, t) => sum + p.cargo[t] * BASE_PRICES[t], 0);

const RANKS: [number, string][] = [
  [0, 'Cabin Boy'], [1500, 'Deckhand'], [5000, 'Trader'], [12000, 'Merchant'], [25000, 'Captain'], [GOAL, 'Merchant Prince'],
];
export const rankFor = (worth: number) => RANKS.reduce((name, [min, n]) => (worth >= min ? n : name), RANKS[0][1]);

/** Buy up to `want` units, one at a time, each a little dearer than the last. */
export const buyGoods = (g: GameState, good: CommodityType, want: number): GameState => {
  const port = g.ports.find(p => p.id === g.player.currentPortId);
  if (!port) return g;
  let gold = g.player.gold;
  let pressure = port.market[good].pressure;
  let space = g.player.fleet[0].cargoCapacity - cargoCount(g.player);
  let bought = 0;
  let spent = 0;
  while (bought < want && space > 0) {
    const price = priceAt(port, good, g.events, pressure);
    if (price > gold) break;
    gold -= price;
    spent += price;
    bought++;
    space--;
    pressure = Math.min(PRESSURE_MAX, pressure + PRESSURE_STEP);
  }
  if (!bought) return g;
  return {
    ...g,
    player: {
      ...g.player,
      gold,
      cargo: { ...g.player.cargo, [good]: g.player.cargo[good] + bought },
      paid: { ...g.player.paid, [good]: (g.player.paid[good] || 0) + spent },
    },
    ports: g.ports.map(p => (p.id !== port.id ? p : { ...p, market: { ...p.market, [good]: { ...p.market[good], pressure } } })),
  };
};

/** Sell up to `want` units, one at a time, each fetching a little less than the last. */
export const sellGoods = (g: GameState, good: CommodityType, want: number): GameState => {
  const port = g.ports.find(p => p.id === g.player.currentPortId);
  if (!port) return g;
  const held = g.player.cargo[good];
  const count = Math.min(want, held);
  if (count <= 0) return g;
  let pressure = port.market[good].pressure;
  let earned = 0;
  for (let i = 0; i < count; i++) {
    earned += Math.max(1, Math.floor(priceAt(port, good, g.events, pressure) * SELL_CUT));
    pressure = Math.max(PRESSURE_MIN, pressure - PRESSURE_STEP);
  }
  const paidBefore = g.player.paid[good] || 0;
  return {
    ...g,
    player: {
      ...g.player,
      gold: g.player.gold + earned,
      cargo: { ...g.player.cargo, [good]: held - count },
      paid: { ...g.player.paid, [good]: Math.round(paidBefore * ((held - count) / held)) },
    },
    ports: g.ports.map(p => (p.id !== port.id ? p : { ...p, market: { ...p.market, [good]: { ...p.market[good], pressure } } })),
  };
};

export const eventText = (e: TradeEvent, ports: Port[]) => {
  const name = ports.find(p => p.id === e.portId)?.name || 'a far port';
  const days = `${e.daysLeft} more day${e.daysLeft === 1 ? '' : 's'}`;
  return e.mult > 1
    ? `${name} has run short of ${e.good}. They will pay well over the odds for about ${days}.`
    : `${name} is drowning in ${e.good}. It is going for a song for about ${days}.`;
};

const makeEvent = (ports: Port[], events: TradeEvent[]): TradeEvent | null => {
  for (let tries = 0; tries < 12; tries++) {
    const port = pick(ports);
    const good = pick(COMMODITIES);
    if (events.some(e => e.portId === port.id && e.good === good)) continue;
    const role = tradeRole(port.id, good);
    // Shortages never hit a port's own produce; gluts never hit what it craves.
    const shortage = role === 'makes' ? false : role === 'wants' ? true : Math.random() < 0.65;
    return { id: newId(), portId: port.id, good, mult: shortage ? rand(1.5, 1.9) : rand(0.5, 0.65), daysLeft: 5 + Math.floor(Math.random() * 5), known: false };
  }
  return null;
};

/** Days pass: prices wander, your own buying and selling fades, shortages come and go. */
export const advanceDays = (g: GameState, days: number): GameState => {
  let ports = g.ports;
  let events = g.events;
  for (let d = 0; d < days; d++) {
    ports = ports.map(p => ({
      ...p,
      market: Object.fromEntries(COMMODITIES.map(t => {
        const c = p.market[t];
        return [t, { drift: clamp(c.drift + (1 - c.drift) * 0.15 + rand(-0.07, 0.07), 0.75, 1.3), pressure: Math.abs(c.pressure) < 0.01 ? 0 : c.pressure * 0.6 }];
      })) as Record<CommodityType, MarketCell>,
    }));
    events = events.map(e => ({ ...e, daysLeft: e.daysLeft - 1 })).filter(e => e.daysLeft > 0);
    if (events.length < 4 && Math.random() < 0.3) {
      const e = makeEvent(ports, events);
      if (e) events = [...events, e];
    }
  }
  return { ...g, ports, events };
};

/** The barkeep shares one true piece of trade news. */
export const learnRumor = (g: GameState): GameState => {
  let events = g.events;
  let target = events.find(e => !e.known && e.daysLeft >= 3);
  if (!target) {
    const fresh = makeEvent(g.ports, events);
    if (fresh) {
      events = [...events, fresh];
      target = fresh;
    }
  }
  if (!target) {
    const port = pick(g.ports);
    const t = PORT_TRADE[port.id];
    const text = t ? `${port.name} always pays well for ${t.wants.join(', ')}.` : 'Trade is quiet this week.';
    return { ...g, rumors: [{ id: newId(), text, day: g.player.gameDay }, ...g.rumors].slice(0, 6) };
  }
  const id = target.id;
  events = events.map(e => (e.id === id ? { ...e, known: true } : e));
  return { ...g, events, rumors: [{ id: newId(), text: eventText(target, g.ports), day: g.player.gameDay }, ...g.rumors].slice(0, 6) };
};

/** Sailing days between two ports. The map is twice as wide as it is tall. */
export const voyageDays = (a: Port, b: Port) => clamp(Math.round(Math.hypot((a.x - b.x) * 1.6, a.y - b.y) / 22), 1, 5);

/** Chance of meeting pirates on the way to `dest`. */
export const ambushChance = (dest: Port, days: number, voyages: number) => {
  if (voyages < 1) return 0; // the first voyage is always safe
  const perDay = dest.dangerLevel <= 1 ? 0.06 : dest.dangerLevel === 2 ? 0.1 : 0.14;
  return 1 - Math.pow(1 - perDay, days);
};

export const rollAmbush = (dest: Port, days: number, voyages: number) =>
  Math.random() < ambushChance(dest, days, voyages);

/** The best thing to carry from one port to another, going by what each makes and wants. */
export const routeTip = (from: Port, ports: Port[], events: TradeEvent[]): string => {
  const here = PORT_TRADE[from.id];
  if (!here) return '';
  for (const good of here.makes) {
    const buyer = ports.find(p => p.id !== from.id && PORT_TRADE[p.id]?.wants.includes(good));
    if (buyer && buyPrice(from, good, events) < BASE_PRICES[good]) return `${good} is cheap here. ${buyer.name} pays well for it.`;
  }
  return `${here.makes.join(', ')} are cheap here.`;
};

export const pickMinigame = (): 'dice' | 'coin' | 'arm' => pick(['dice', 'coin', 'arm']);

// --- SHIPS ---

export interface Upgrade {
  id: string;
  label: string;
  description: string;
  cost: number;
  effect: (ship: Ship) => Ship;
}

export const SHIP_CLASSES = ['Schooner', 'Brigantine', 'Frigate', 'Galleon'];

const TIER_BASE: Record<number, { hull: number; cargo: number; speed: number; firepower: number }> = {
  1: { hull: 30, cargo: 10, speed: 5, firepower: 3 },
  2: { hull: 55, cargo: 22, speed: 7, firepower: 5 },
  3: { hull: 95, cargo: 38, speed: 9, firepower: 8 },
  4: { hull: 170, cargo: 60, speed: 12, firepower: 13 },
};
export const tierBase = (tier: number) => TIER_BASE[clamp(tier, 1, 4)];

export const getUpgradesForTier = (tier: number): Upgrade[] => {
  const m = tier || 1;
  const cost = (base: number) => Math.round(base * Math.pow(2.2, m - 1));
  return [
    { id: 'hull', label: 'Bigger Hold', description: `Carry ${5 * m} more cargo.`, cost: cost(1000),
      effect: s => ({ ...s, cargoCapacity: s.cargoCapacity + 5 * m }) },
    { id: 'cannons', label: 'Heavy Cannons', description: `+${2 * m} firepower in a fight.`, cost: cost(1500),
      effect: s => ({ ...s, firepower: s.firepower + 2 * m }) },
    { id: 'supports', label: 'Iron Supports', description: `+${10 * m} hull strength.`, cost: cost(800),
      effect: s => ({ ...s, hullHealth: { max: s.hullHealth.max + 10 * m, current: s.hullHealth.current + 10 * m } }) },
    { id: 'sails', label: 'Storm Sails', description: `+${3 * m} speed. Easier to outrun pirates.`, cost: cost(1200),
      effect: s => ({ ...s, speed: s.speed + 3 * m }) },
  ];
};

/** Fit one upgrade. Fitting all four turns the ship into the next class. */
export const applyUpgrade = (ship: Ship, upgradeId: string): { ship: Ship; evolved: boolean } => {
  const upgrade = getUpgradesForTier(ship.tier).find(u => u.id === upgradeId);
  if (!upgrade || ship.upgrades.includes(upgradeId)) return { ship, evolved: false };
  const fitted = { ...upgrade.effect(ship), upgrades: [...ship.upgrades, upgradeId] };
  if (fitted.upgrades.length < 4 || ship.tier >= 4) return { ship: fitted, evolved: false };
  const tier = ship.tier + 1;
  const base = tierBase(tier);
  return {
    evolved: true,
    ship: {
      ...fitted,
      tier,
      shipClass: SHIP_CLASSES[tier - 1],
      // The new class never has less than the ship it replaces.
      hullHealth: { current: Math.max(base.hull, fitted.hullHealth.max), max: Math.max(base.hull, fitted.hullHealth.max) },
      cargoCapacity: Math.max(base.cargo, fitted.cargoCapacity),
      speed: Math.max(base.speed, fitted.speed),
      firepower: Math.max(base.firepower, fitted.firepower),
      upgrades: [],
    },
  };
};

export const REPAIR_COST_PER_POINT = 8;

export const getShipImageByClass = (shipClass: string): string => {
  if (shipClass === 'Brigantine') return '/assets/Boat/Boat 2.webp';
  if (shipClass === 'Frigate') return '/assets/Boat/Boat 3.webp';
  if (shipClass === 'Galleon') return '/assets/Boat/Boat 4.webp';
  return '/assets/Boat/Boat 1.webp';
};

// --- PIRATES ---

const PIRATE_NAMES = ['The Salty Scourge', "Blackbeard's Revenge", 'Iron Barnacle', 'Sea Vulture', 'Crimson Wave', 'The Leviathan', "Neptune's Wrath", "Kraken's Wake"];

/** Pirates are usually a match for your ship: sometimes smaller, sometimes one class bigger in rough waters. */
export const generateEnemy = (dangerLevel: number, playerTier: number): Ship => {
  const r = Math.random();
  const biggerChance = dangerLevel >= 3 ? 0.3 : dangerLevel === 2 ? 0.18 : 0.08;
  const shift = r < biggerChance ? 1 : r < biggerChance + 0.3 ? -1 : 0;
  const tier = clamp(playerTier + shift, 1, 4);
  const hullMax = [25, 50, 90, 160][tier - 1];
  return {
    id: newId(),
    name: pick(PIRATE_NAMES),
    shipClass: SHIP_CLASSES[tier - 1],
    tier,
    hullHealth: { current: hullMax, max: hullMax },
    cargoCapacity: [8, 15, 30, 50][tier - 1],
    speed: [4, 6, 8, 11][tier - 1],
    firepower: [2, 4, 7, 11][tier - 1],
    upgrades: [],
  };
};

export interface Loot { gold: number; good: CommodityType; amount: number }

export const generateLoot = (enemy: Ship): Loot => ({
  gold: (150 + Math.floor(Math.random() * 250)) * enemy.tier,
  good: pick(COMMODITIES.filter(t => BASE_PRICES[t] <= 150 * enemy.tier * enemy.tier)),
  amount: (1 + Math.floor(Math.random() * 3)) * enemy.tier,
});

/** One broadside: usually lands, sometimes misses, sometimes hits the powder store. */
export const rollShot = (firepower: number): { damage: number; kind: 'miss' | 'hit' | 'crit' } => {
  const r = Math.random();
  if (r < 0.1) return { damage: 0, kind: 'miss' };
  const base = firepower + Math.floor(Math.random() * 3);
  if (r > 0.88) return { damage: base * 2, kind: 'crit' };
  return { damage: base, kind: 'hit' };
};

export const fleeChance = (ship: Ship, enemy: Ship) => clamp((ship.speed / enemy.speed) * 0.5, 0.15, 0.9);

export const rollFlee = (ship: Ship, enemy: Ship) => Math.random() < fleeChance(ship, enemy);

/** Gold the pirates accept to let you pass. */
export const tributeCost = (gold: number, enemy: Ship) => Math.max(40 * enemy.tier, Math.round(gold * 0.15));

// --- NEW GAME AND SAVES ---

const B = (mkt: [number, number], ship: [number, number], bar: [number, number], sail: [number, number]): Building[] => [
  { id: 'mkt', label: 'Market', x: mkt[0], y: mkt[1], image: '/assets/Market Transparent.webp', tab: 'market' },
  { id: 'ship', label: 'Shipyard', x: ship[0], y: ship[1], image: '/assets/Transparent Shipyard.webp', tab: 'ship' },
  { id: 'bar', label: 'Cantina', x: bar[0], y: bar[1], image: '/assets/proper cantina.webp', tab: 'cantina' },
  { id: 'sail', label: 'Set Sail', x: sail[0], y: sail[1], image: '/assets/easy remove boat.webp', tab: 'map' },
];

const PORT_LAYOUT: Omit<Port, 'market'>[] = [
  { id: 'athens', name: 'Athens', dangerLevel: 1, x: 69, y: 40, image: '/assets/New Lands/Athens.webp', buildings: B([64, 38], [87, 44], [55, 54], [52, 76]) },
  { id: 'rome', name: 'Rome', dangerLevel: 1, x: 47, y: 28, image: '/assets/New Lands/Rome.webp', buildings: B([51, 27], [91, 33], [16, 39], [77, 76]) },
  { id: 'venice', name: 'Venice', dangerLevel: 1, x: 51, y: 6, image: '/assets/New Lands/Venice.webp', buildings: B([13, 19], [87, 62], [45, 76], [18, 76]) },
  { id: 'crete', name: 'Crete', dangerLevel: 2, x: 81, y: 63, image: '/assets/New Lands/Crete.webp', buildings: B([31, 36], [84, 53], [79, 17], [54, 76]) },
  { id: 'barcelona', name: 'Barcelona', dangerLevel: 1, x: 16, y: 23, image: '/assets/New Lands/Barcellona.webp', buildings: B([32, 46], [21, 67], [67, 31], [52, 75]) },
  { id: 'tunisia', name: 'Tunisia', dangerLevel: 2, x: 19, y: 89, image: '/assets/New Lands/Tunisia.webp', buildings: B([55, 43], [76, 40], [23, 55], [57, 77]) },
  { id: 'egypt', name: 'Egypt', dangerLevel: 2, x: 81, y: 92, image: '/assets/New Lands/Egypt.webp', buildings: B([75, 58], [32, 19], [92, 23], [11, 63]) },
  { id: 'nice', name: 'Nice', dangerLevel: 1, x: 30, y: 15, image: '/assets/New Lands/Nice.webp', buildings: B([48, 21], [67, 35], [59, 74], [82, 67]) },
  { id: 'sardinia', name: 'Sardinia', dangerLevel: 1, x: 36, y: 33, image: '/assets/New Lands/Sardinia.webp', buildings: B([24, 53], [92, 37], [87, 71], [55, 76]) },
];

const newPlayer = (): Player => {
  const base = tierBase(1);
  return {
    gold: 500,
    fleet: [{ id: '1', name: 'The Salty Dog', shipClass: 'Schooner', tier: 1, hullHealth: { current: base.hull, max: base.hull }, cargoCapacity: base.cargo, speed: base.speed, firepower: base.firepower, upgrades: [] }],
    cargo: emptyCargo(),
    paid: emptyCargo(),
    currentPortId: 'sardinia',
    gameDay: 1,
    hasReadPrologue: false,
    hasWonGame: false,
    seenGuide: false,
    voyages: 0,
  };
};

export const SAVE_KEYS = { player: 'med_merchants_player', ports: 'med_merchants_ports', world: 'med_merchants_world' };

const readJson = (key: string): Record<string, unknown> | unknown[] | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown> | unknown[]) : null;
  } catch {
    return null;
  }
};

/** Load the saved game, filling in anything an older version of the game did not store. */
export const loadGame = (): GameState => {
  const fresh = newPlayer();
  const savedPlayer = readJson(SAVE_KEYS.player) as Partial<Player> | null;
  let player: Player = fresh;
  if (savedPlayer && Array.isArray(savedPlayer.fleet) && savedPlayer.fleet[0]) {
    const ship = { ...fresh.fleet[0], ...savedPlayer.fleet[0] };
    if (!ship.tier) ship.tier = 1;
    if (ship.shipClass === 'Sloop') ship.shipClass = 'Schooner';
    if (!Array.isArray(ship.upgrades)) ship.upgrades = [];
    player = {
      ...fresh,
      ...savedPlayer,
      fleet: [ship],
      cargo: { ...emptyCargo(), ...(savedPlayer.cargo || {}) },
      paid: { ...emptyCargo(), ...(savedPlayer.paid || {}) },
      // Anyone with a save from before the guide existed already knows how to play.
      seenGuide: savedPlayer.seenGuide ?? ((savedPlayer.gameDay || 1) > 1),
      voyages: savedPlayer.voyages ?? Math.max(0, (savedPlayer.gameDay || 1) - 1),
    };
  }

  const savedPorts = readJson(SAVE_KEYS.ports) as Array<Partial<Port> & { buildings?: Partial<Building>[] }> | null;
  const ports: Port[] = PORT_LAYOUT.map(layout => {
    const saved = Array.isArray(savedPorts) ? savedPorts.find(p => p.id === layout.id) : null;
    if (!saved) return { ...layout, market: generateMarket() };
    const marketOk = saved.market && COMMODITIES.every(t => typeof saved.market![t]?.drift === 'number');
    return {
      ...layout,
      // Positions set with the layout editor are kept.
      x: typeof saved.x === 'number' ? saved.x : layout.x,
      y: typeof saved.y === 'number' ? saved.y : layout.y,
      buildings: layout.buildings.map(b => {
        const sb = Array.isArray(saved.buildings) ? saved.buildings.find(s => s.id === b.id) : null;
        return sb ? { ...b, x: sb.x ?? b.x, y: sb.y ?? b.y, scale: sb.scale } : b;
      }),
      market: marketOk ? saved.market! : generateMarket(),
    };
  });
  if (!ports.some(p => p.id === player.currentPortId)) player = { ...player, currentPortId: 'sardinia' };

  const world = (readJson(SAVE_KEYS.world) || {}) as { events?: TradeEvent[]; rumors?: Rumor[] };
  return {
    player,
    ports,
    events: Array.isArray(world.events) ? world.events : [],
    rumors: Array.isArray(world.rumors) ? world.rumors : [],
  };
};

export const saveGame = (g: GameState) => {
  try {
    localStorage.setItem(SAVE_KEYS.player, JSON.stringify(g.player));
    localStorage.setItem(SAVE_KEYS.ports, JSON.stringify(g.ports));
    localStorage.setItem(SAVE_KEYS.world, JSON.stringify({ events: g.events, rumors: g.rumors }));
  } catch {
    // Private browsing or a full disk: the game still plays, it just will not be saved.
  }
};

export const clearSave = () => Object.values(SAVE_KEYS).forEach(k => localStorage.removeItem(k));
