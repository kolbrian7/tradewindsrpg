// Core rules, economy, sea-lane routing, fleet, contracts, Syndicate rivals, and combat for Merchants of the Mediterranean.

export type CommodityType =
  | 'Grain' | 'Salt' | 'Hemp' | 'Timber' | 'Wool' | 'Cotton' | 'Wine' | 'Paper'
  | 'Iron' | 'Oil' | 'Dye' | 'Spice' | 'Tobacco' | 'Tea' | 'Silk' | 'Tools'
  | 'Porcelain' | 'Weapons' | 'Silver' | 'Jewelry' | 'Gems' | 'Statues';

export interface Building {
  id: string;
  label: string;
  x: number;
  y: number;
  image: string;
  tab: string;
  scale?: number;
}

export interface MarketCell {
  drift: number;
  pressure: number;
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

export type OfficerId = 'navigator' | 'gunner' | 'quartermaster';

export interface OfficerDef {
  id: OfficerId;
  name: string;
  role: string;
  cost: number;
  perk: string;
}

export type EscortId = 'cutter' | 'caravel';

export interface EscortDef {
  id: EscortId;
  name: string;
  shipClass: string;
  tier: number;
  cost: number;
  cargoBonus: number;
  firepowerBonus: number;
  description: string;
}

export interface EscortShip {
  id: string;
  defId: EscortId;
  name: string;
  shipClass: string;
  tier: number;
  cargoBonus: number;
  firepowerBonus: number;
}

export interface Contract {
  id: string;
  fromPortId: string;
  toPortId: string;
  good: CommodityType;
  amount: number;
  rewardGold: number;
  repGain: number;
  deadlineDay: number;
}

export interface RivalDef {
  id: string;
  name: string;
  shipName: string;
  shipClass: string;
  tier: number;
  hull: number;
  firepower: number;
  speed: number;
  minWorth: number;
  watersPortId: string;
  bounty: number;
  lootGood: CommodityType;
  lootAmount: number;
  taunt: string;
}

export interface Player {
  gold: number;
  fleet: Ship[];
  escorts: EscortShip[];
  officers: OfficerId[];
  contracts: Contract[];
  reputation: Record<string, number>;
  defeatedRivals: string[];
  cargo: Record<CommodityType, number>;
  paid: Record<CommodityType, number>;
  currentPortId: string;
  gameDay: number;
  hasReadPrologue: boolean;
  hasWonGame: boolean;
  /** Second chapter: harbours you have bought, each with the day its takings were last collected. */
  ownedPorts: Record<string, number>;
  hasWonEmpire: boolean;
  seenGuide: boolean;
  voyages: number;
}

export interface TradeEvent {
  id: string;
  portId: string;
  good: CommodityType;
  mult: number;
  daysLeft: number;
  known: boolean;
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
  portContracts: Record<string, Contract[]>;
  layoutVersion: number;
}

export const LAYOUT_VERSION = 2;
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

export const PORT_TRADE: Record<string, { makes: CommodityType[]; wants: CommodityType[] }> = {
  sardinia:  { makes: ['Salt', 'Wool', 'Grain'],        wants: ['Paper', 'Wine', 'Tools'] },
  nice:      { makes: ['Timber', 'Paper', 'Oil'],       wants: ['Salt', 'Wool', 'Spice'] },
  rome:      { makes: ['Wine', 'Tools', 'Statues'],     wants: ['Grain', 'Oil', 'Gems'] },
  barcelona: { makes: ['Iron', 'Weapons', 'Silver'],    wants: ['Timber', 'Silk', 'Tea'] },
  venice:    { makes: ['Silk', 'Porcelain', 'Jewelry'], wants: ['Iron', 'Dye', 'Cotton'] },
  athens:    { makes: ['Hemp', 'Oil', 'Wine'],          wants: ['Silver', 'Porcelain', 'Tobacco'] },
  crete:     { makes: ['Dye', 'Tea', 'Salt'],           wants: ['Weapons', 'Tools', 'Statues'] },
  tunisia:   { makes: ['Cotton', 'Tobacco', 'Grain'],   wants: ['Paper', 'Iron', 'Silk'] },
  egypt:     { makes: ['Spice', 'Gems', 'Cotton'],      wants: ['Hemp', 'Wine', 'Jewelry'] },
};

const MAKES_BIAS = 0.6;
const WANTS_BIAS = 1.5;
const SELL_CUT = 0.92;
const PRESSURE_STEP = 0.03;
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

// --- OFFICERS, ESCORTS, AND FLEET STATS ---

export const OFFICERS: OfficerDef[] = [
  { id: 'navigator', name: 'Sofia the Navigator', role: 'Master Navigator', cost: 900, perk: 'Cuts 2+ day voyages by 1 day and adds +2 speed.' },
  { id: 'gunner', name: 'Marco the Gunner', role: 'Master Gunner', cost: 1400, perk: '+2 cannon firepower and widens the critical aim zone.' },
  { id: 'quartermaster', name: 'Helena the Factor', role: 'Guild Factor', cost: 1800, perk: '+8% sell prices and -8% buy prices across all ports.' },
];

export const ESCORTS: EscortDef[] = [
  { id: 'cutter', name: 'Sea Swallow', shipClass: 'Merchant Cutter', tier: 1, cost: 2800, cargoBonus: 14, firepowerBonus: 1, description: 'Fast escort barge adding +14 Hold and +1 Cannon.' },
  { id: 'caravel', name: 'Golden Lion', shipClass: 'Armed Caravel', tier: 2, cost: 6500, cargoBonus: 20, firepowerBonus: 4, description: 'Sturdy convoy brig adding +20 Hold and +4 Cannons.' },
];

export const totalCargoCapacity = (p: Player): number =>
  (p.fleet[0]?.cargoCapacity || 10) + (p.escorts || []).reduce((s, e) => s + e.cargoBonus, 0);

export const totalFirepower = (p: Player): number =>
  (p.fleet[0]?.firepower || 3) +
  (p.escorts || []).reduce((s, e) => s + e.firepowerBonus, 0) +
  (p.officers?.includes('gunner') ? 2 : 0);

export const effectiveSpeed = (p: Player): number =>
  (p.fleet[0]?.speed || 5) + (p.officers?.includes('navigator') ? 2 : 0);

export const cargoCount = (p: Player) => Object.values(p.cargo).reduce((a, b) => a + b, 0);

export const netWorth = (p: Player) => {
  const cargoVal = COMMODITIES.reduce((sum, t) => sum + p.cargo[t] * BASE_PRICES[t], 0);
  const officerVal = (p.officers || []).reduce((sum, id) => sum + (OFFICERS.find(o => o.id === id)?.cost || 0), 0);
  const escortVal = (p.escorts || []).reduce((sum, e) => sum + (ESCORTS.find(d => d.id === e.defId)?.cost || 0), 0);
  return p.gold + cargoVal + Math.round((officerVal + escortVal) * 0.5);
};

// --- REPUTATION & PRICING ---

export const reputationTier = (rep = 0): { label: string; bonus: number } => {
  if (rep >= 80) return { label: 'Patron', bonus: 0.08 };
  if (rep >= 50) return { label: 'Trusted', bonus: 0.05 };
  if (rep >= 20) return { label: 'Known', bonus: 0.025 };
  return { label: 'Stranger', bonus: 0 };
};

const bias = (portId: string, good: CommodityType) => {
  const role = tradeRole(portId, good);
  return role === 'makes' ? MAKES_BIAS : role === 'wants' ? WANTS_BIAS : 1;
};

const eventMult = (events: TradeEvent[], portId: string, good: CommodityType) =>
  events.reduce((m, e) => (e.portId === portId && e.good === good ? m * e.mult : m), 1);

const rawPriceAt = (port: Port, good: CommodityType, events: TradeEvent[], pressure: number) =>
  Math.max(1, Math.round(BASE_PRICES[good] * bias(port.id, good) * port.market[good].drift * (1 + pressure) * eventMult(events, port.id, good)));

export const buyPrice = (port: Port, good: CommodityType, events: TradeEvent[], player?: Player) => {
  const base = rawPriceAt(port, good, events, port.market[good].pressure);
  if (!player) return base;
  const repDiscount = reputationTier(player.reputation?.[port.id] || 0).bonus;
  const factorDiscount = player.officers?.includes('quartermaster') ? 0.08 : 0;
  return Math.max(1, Math.round(base * (1 - repDiscount - factorDiscount)));
};

export const sellPrice = (port: Port, good: CommodityType, events: TradeEvent[], player?: Player) => {
  const base = rawPriceAt(port, good, events, port.market[good].pressure);
  const repBonus = player ? reputationTier(player.reputation?.[port.id] || 0).bonus : 0;
  const factorBonus = player?.officers?.includes('quartermaster') ? 0.08 : 0;
  return Math.max(1, Math.floor(base * SELL_CUT * (1 + repBonus + factorBonus)));
};

const RANKS: [number, string][] = [
  [0, 'Cabin Boy'], [1500, 'Deckhand'], [5000, 'Trader'], [12000, 'Merchant'], [25000, 'Captain'], [GOAL, 'Merchant Prince'],
];
export const rankFor = (worth: number) => RANKS.reduce((name, [min, n]) => (worth >= min ? n : name), RANKS[0][1]);

export const buyGoods = (g: GameState, good: CommodityType, want: number): GameState => {
  const port = g.ports.find(p => p.id === g.player.currentPortId);
  if (!port) return g;
  let gold = g.player.gold;
  let pressure = port.market[good].pressure;
  let space = totalCargoCapacity(g.player) - cargoCount(g.player);
  const repDiscount = reputationTier(g.player.reputation?.[port.id] || 0).bonus;
  const factorDiscount = g.player.officers?.includes('quartermaster') ? 0.08 : 0;
  let bought = 0;
  let spent = 0;
  while (bought < want && space > 0) {
    const raw = rawPriceAt(port, good, g.events, pressure);
    const price = Math.max(1, Math.round(raw * (1 - repDiscount - factorDiscount)));
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

/** Standing earned for selling a port something it is short of: 1 point for every 2 units. */
export const sellRepGain = (portId: string, good: CommodityType, count: number) =>
  tradeRole(portId, good) === 'wants' ? Math.ceil(count / 2) : 0;
/** Standing earned at the port you were bound for when you beat pirates on the way. */
export const PIRATE_REP = 6;
/** The four standings, the points each needs and what it gives. */
export const REP_STEPS: { label: string; at: number }[] = [
  { label: 'Stranger', at: 0 }, { label: 'Known', at: 20 }, { label: 'Trusted', at: 50 }, { label: 'Patron', at: 80 },
];

export const sellGoods = (g: GameState, good: CommodityType, want: number): GameState => {
  const port = g.ports.find(p => p.id === g.player.currentPortId);
  if (!port) return g;
  const held = g.player.cargo[good];
  const count = Math.min(want, held);
  if (count <= 0) return g;
  let pressure = port.market[good].pressure;
  const repBonus = reputationTier(g.player.reputation?.[port.id] || 0).bonus;
  const factorBonus = g.player.officers?.includes('quartermaster') ? 0.08 : 0;
  let earned = 0;
  for (let i = 0; i < count; i++) {
    const raw = rawPriceAt(port, good, g.events, pressure);
    earned += Math.max(1, Math.floor(raw * SELL_CUT * (1 + repBonus + factorBonus)));
    pressure = Math.max(PRESSURE_MIN, pressure - PRESSURE_STEP);
  }
  const paidBefore = g.player.paid[good] || 0;
  const repGain = sellRepGain(port.id, good, count);
  const curRep = g.player.reputation?.[port.id] || 0;
  return {
    ...g,
    player: {
      ...g.player,
      gold: g.player.gold + earned,
      reputation: repGain ? { ...g.player.reputation, [port.id]: clamp(curRep + repGain, 0, 100) } : g.player.reputation,
      cargo: { ...g.player.cargo, [good]: held - count },
      paid: { ...g.player.paid, [good]: Math.round(paidBefore * ((held - count) / held)) },
    },
    ports: g.ports.map(p => (p.id !== port.id ? p : { ...p, market: { ...p.market, [good]: { ...p.market[good], pressure } } })),
  };
};

// --- SEA-LANE WAYPOINT GRAPH (WATER ONLY, NEVER CROSSES LAND) ---

export interface Point {
  x: number;
  y: number;
}

export const SEA_NODES: Record<string, Point> = {
  // Open water just outside each harbour
  w_barcelona: { x: 19.5, y: 28 },
  w_nice:      { x: 29.5, y: 20 },
  w_sardinia:  { x: 33, y: 34 },
  w_rome:      { x: 44.3, y: 29.8 },
  w_venice:    { x: 51.5, y: 10.5 },
  w_tunisia:   { x: 24, y: 86 },
  w_athens:    { x: 66.5, y: 42.5 },
  w_crete:     { x: 80.5, y: 66 },
  w_egypt:     { x: 78.5, y: 88 },
  // Turning points, each placed in open water with room to round the nearest cape
  ligurian:    { x: 36, y: 18.3 },   // north-west of Corsica
  corsN:       { x: 40.8, y: 17.3 }, // round Corsica's northern cape
  tyrrN:       { x: 41.3, y: 24.5 }, // down the channel between Corsica and Italy
  tyrr:        { x: 43, y: 40 },     // middle of the Tyrrhenian
  sardSW:      { x: 33, y: 45.5 },   // off Sardinia's south-west corner
  sardS:       { x: 38, y: 47.5 },   // south of Sardinia
  balE:        { x: 24.5, y: 37 },   // east of the Balearics
  sicW:        { x: 44, y: 52 },     // west of Sicily
  sicS:        { x: 49, y: 61 },     // between Sicily and Malta
  sicSE:       { x: 58, y: 62.3 }, // off Sicily's south-east corner
  ionian:      { x: 62, y: 54 },
  libyan:      { x: 48, y: 78 },
  adrN:        { x: 53.5, y: 14 },
  adrMid:      { x: 58, y: 21 },
  adrS:        { x: 63, y: 28.5 },
  otranto:     { x: 66.3, y: 37 },   // strait between Italy's heel and Greece
  pelW:        { x: 69, y: 49 },     // west of the Peloponnese
  pelS:        { x: 72.5, y: 58.5 }, // south of the Peloponnese
  creteW:      { x: 76.5, y: 64 },   // off Crete's western end
};

const SEA_EDGES: [string, string][] = [
  ['w_barcelona', 'w_nice'], ['w_barcelona', 'ligurian'], ['w_barcelona', 'w_sardinia'], ['w_barcelona', 'balE'],
  ['w_nice', 'ligurian'], ['w_nice', 'w_sardinia'],
  ['ligurian', 'corsN'], ['ligurian', 'w_sardinia'], ['corsN', 'tyrrN'], ['tyrrN', 'w_rome'],
  ['w_rome', 'tyrr'], ['tyrr', 'sardS'], ['tyrr', 'sicW'],
  ['w_sardinia', 'sardSW'], ['sardSW', 'sardS'], ['sardSW', 'balE'], ['sardSW', 'w_tunisia'],
  ['sardS', 'sicW'], ['sardS', 'balE'], ['sardS', 'w_tunisia'], ['balE', 'w_tunisia'],
  ['sicW', 'sicS'], ['sicW', 'w_tunisia'], ['sicW', 'libyan'],
  ['sicS', 'sicSE'], ['sicS', 'libyan'],
  ['sicSE', 'ionian'], ['sicSE', 'creteW'], ['sicSE', 'w_egypt'],
  ['w_tunisia', 'libyan'], ['libyan', 'w_egypt'], ['w_tunisia', 'sicS'], ['libyan', 'sicSE'], ['libyan', 'creteW'],
  ['ionian', 'w_athens'], ['ionian', 'otranto'], ['ionian', 'creteW'],
  ['w_athens', 'otranto'], ['w_athens', 'pelW'], ['pelW', 'pelS'], ['pelS', 'creteW'],
  ['creteW', 'w_crete'], ['creteW', 'w_egypt'], ['w_crete', 'w_egypt'],
  ['w_venice', 'adrN'], ['adrN', 'adrMid'], ['adrMid', 'adrS'], ['adrS', 'otranto'],
];

const ADJ: Record<string, string[]> = {};
for (const [a, b] of SEA_EDGES) {
  (ADJ[a] ||= []).push(b);
  (ADJ[b] ||= []).push(a);
}

/** Returns an ordered array of % coordinates following Mediterranean sea lanes (never across land). */
export const computeSeaRoute = (fromPort: Port, toPort: Port): Point[] => {
  if (fromPort.id === toPort.id) return [{ x: fromPort.x, y: fromPort.y }];
  const startKey = `w_${fromPort.id}`;
  const endKey = `w_${toPort.id}`;
  if (!SEA_NODES[startKey] || !SEA_NODES[endKey]) {
    return [{ x: fromPort.x, y: fromPort.y }, { x: toPort.x, y: toPort.y }];
  }

  const dist: Record<string, number> = { [startKey]: 0 };
  const prev: Record<string, string | null> = { [startKey]: null };
  const unvisited = new Set(Object.keys(SEA_NODES));

  while (unvisited.size) {
    let cur: string | null = null;
    let best = Infinity;
    for (const k of unvisited) {
      const d = dist[k] ?? Infinity;
      if (d < best) { best = d; cur = k; }
    }
    if (!cur || best === Infinity || cur === endKey) break;
    unvisited.delete(cur);
    for (const nb of ADJ[cur] || []) {
      if (!unvisited.has(nb)) continue;
      const p1 = SEA_NODES[cur];
      const p2 = SEA_NODES[nb];
      const step = Math.hypot((p1.x - p2.x) * 1.8, p1.y - p2.y);
      const alt = best + step;
      if (alt < (dist[nb] ?? Infinity)) {
        dist[nb] = alt;
        prev[nb] = cur;
      }
    }
  }

  const chain: Point[] = [];
  let node: string | null = endKey;
  while (node) {
    chain.unshift(SEA_NODES[node]);
    node = prev[node] ?? null;
  }
  return [{ x: fromPort.x, y: fromPort.y }, ...chain, { x: toPort.x, y: toPort.y }];
};

export const routeLength = (pts: Point[]): number => {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += Math.hypot((pts[i].x - pts[i - 1].x) * 1.8, pts[i].y - pts[i - 1].y);
  }
  return sum;
};

export const pointAlongRoute = (pts: Point[], t: number): Point => {
  if (pts.length === 0) return { x: 50, y: 50 };
  if (pts.length === 1 || t <= 0) return pts[0];
  if (t >= 1) return pts[pts.length - 1];
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot((pts[i].x - pts[i - 1].x) * 1.8, pts[i].y - pts[i - 1].y);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const f = segs[i] > 0 ? target / segs[i] : 0;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
      };
    }
    target -= segs[i];
  }
  return pts[pts.length - 1];
};

/** Converts waypoint percentages into a smooth Catmull-Rom Cubic Bezier SVG path string. */
/**
 * Turns a waypoint chain into one flowing curve through the waypoints. Uses a centripetal spline,
 * which bends tightly at each turn and cannot loop or overshoot the way an ordinary spline does.
 */
export const smoothRoute = (pts: Point[]): Point[] => {
  if (pts.length < 3) return pts;
  const P = pts.map(p => ({ x: p.x * 1.8, y: p.y }));            // work in true proportions (the map is 1.8 wide per 1 tall)
  const first = P[0], last = P[P.length - 1];
  const ctl = [{ x: 2 * first.x - P[1].x, y: 2 * first.y - P[1].y }, ...P, { x: 2 * last.x - P[P.length - 2].x, y: 2 * last.y - P[P.length - 2].y }];
  const knot = (a: Point, b: Point) => Math.max(1e-4, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
  const mix = (a: Point, b: Point, ta: number, tb: number, t: number): Point => ({
    x: ((tb - t) * a.x + (t - ta) * b.x) / (tb - ta),
    y: ((tb - t) * a.y + (t - ta) * b.y) / (tb - ta),
  });
  const out: Point[] = [pts[0]];
  for (let i = 1; i < ctl.length - 2; i++) {
    const p0 = ctl[i - 1], p1 = ctl[i], p2 = ctl[i + 1], p3 = ctl[i + 2];
    const t0 = 0, t1 = t0 + knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
    for (let k = 1; k <= 16; k++) {
      const t = t1 + ((t2 - t1) * k) / 16;
      const a1 = mix(p0, p1, t0, t1, t), a2 = mix(p1, p2, t1, t2, t), a3 = mix(p2, p3, t2, t3, t);
      const b1 = mix(a1, a2, t0, t2, t), b2 = mix(a2, a3, t1, t3, t);
      const c = mix(b1, b2, t1, t2, t);
      out.push({ x: c.x / 1.8, y: c.y });
    }
  }
  return out;
};

export const routeToSmoothPath = (pts: Point[], width = 1000, height = 558): string =>
  smoothRoute(pts).map((p, i) => `${i ? 'L' : 'M'} ${((p.x / 100) * width).toFixed(1)} ${((p.y / 100) * height).toFixed(1)}`).join(' ');

export type WeatherType = 'Tailwind' | 'Fair Seas' | 'Crosswind' | 'Mistral Gale';

export const rollWeather = (): WeatherType => {
  const r = Math.random();
  if (r < 0.25) return 'Tailwind';
  if (r < 0.65) return 'Fair Seas';
  if (r < 0.85) return 'Crosswind';
  return 'Mistral Gale';
};

export const voyageDays = (a: Port, b: Port, hasNavigator = false) => {
  const len = routeLength(computeSeaRoute(a, b));
  const raw = clamp(Math.round(len / 28), 1, 6);
  return hasNavigator && raw >= 2 ? raw - 1 : raw;
};

export const ambushChance = (dest: Port, days: number, voyages: number, weather: WeatherType = 'Fair Seas') => {
  if (voyages < 1) return 0;
  const perDay = dest.dangerLevel <= 1 ? 0.11 : dest.dangerLevel === 2 ? 0.17 : 0.23;
  const weatherMod = weather === 'Tailwind' ? 0.75 : weather === 'Mistral Gale' ? 1.25 : 1;
  return clamp((1 - Math.pow(1 - perDay, days)) * weatherMod, 0, 0.8);
};

export const rollAmbush = (dest: Port, days: number, voyages: number, weather: WeatherType = 'Fair Seas') =>
  Math.random() < ambushChance(dest, days, voyages, weather);

// --- TRADE EVENTS & RUMORS ---

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
    const shortage = role === 'makes' ? false : role === 'wants' ? true : Math.random() < 0.65;
    return { id: newId(), portId: port.id, good, mult: shortage ? rand(1.5, 1.9) : rand(0.5, 0.65), daysLeft: 5 + Math.floor(Math.random() * 5), known: false };
  }
  return null;
};

// --- DELIVERY CONTRACTS ---

export const generateContractsForPort = (port: Port, ports: Port[], day: number): Contract[] => {
  const trade = PORT_TRADE[port.id];
  const others = ports.filter(p => p.id !== port.id);
  const out: Contract[] = [];
  for (let i = 0; i < 2; i++) {
    const dest = pick(others);
    const destWants = PORT_TRADE[dest.id]?.wants || [];
    const match = trade?.makes.find(g => destWants.includes(g));
    const good = match || pick(trade?.makes || COMMODITIES);
    const amount = good && BASE_PRICES[good] <= 45 ? 6 + Math.floor(Math.random() * 5) : 3 + Math.floor(Math.random() * 3);
    const distDays = voyageDays(port, dest, false);
    const rewardGold = Math.round(BASE_PRICES[good] * amount * (1.85 + distDays * 0.12));
    out.push({
      id: newId(),
      fromPortId: port.id,
      toPortId: dest.id,
      good,
      amount,
      rewardGold,
      repGain: 12 + distDays * 3,
      deadlineDay: day + distDays + 8,
    });
  }
  return out;
};

// --- SECOND CHAPTER: BUYING THE HARBOURS (opens once the main story is won) ---

export const PORT_PRICE: Record<string, number> = {
  sardinia: 25000, crete: 30000, tunisia: 30000, nice: 35000, barcelona: 40000, athens: 45000, egypt: 50000, rome: 60000, venice: 80000,
};
/** Standing a port must hold you in before its Harbor Master will sell (Patron). */
export const PORT_OWN_REP = 80;
/** A harbour's takings pile up for this many days at most, so you have to come back for them. */
export const PORT_INCOME_DAYS = 15;
export const portPrice = (id: string) => PORT_PRICE[id] || 40000;
export const portDailyIncome = (id: string) => Math.round(portPrice(id) * 0.03);
export const ownsPort = (p: Player, id: string) => p.ownedPorts?.[id] !== undefined;
export const portIncomeDue = (p: Player, id: string) =>
  ownsPort(p, id) ? clamp(p.gameDay - p.ownedPorts[id], 0, PORT_INCOME_DAYS) * portDailyIncome(id) : 0;

export const canBuyPort = (g: GameState, id: string) =>
  g.player.hasWonGame && g.player.currentPortId === id && !ownsPort(g.player, id) &&
  (g.player.reputation?.[id] || 0) >= PORT_OWN_REP && g.player.gold >= portPrice(id);

export const buyPort = (g: GameState, id: string): GameState => {
  if (!canBuyPort(g, id)) return g;
  return { ...g, player: { ...g.player, gold: g.player.gold - portPrice(id), ownedPorts: { ...g.player.ownedPorts, [id]: g.player.gameDay } } };
};

/** Pays out the takings waiting in the port you are standing in. */
export const collectPortIncome = (g: GameState): GameState => {
  const id = g.player.currentPortId;
  const due = portIncomeDue(g.player, id);
  if (!ownsPort(g.player, id)) return g;
  return { ...g, player: { ...g.player, gold: g.player.gold + due, ownedPorts: { ...g.player.ownedPorts, [id]: g.player.gameDay } } };
};

export const acceptContract = (g: GameState, contractId: string): GameState => {
  if (g.player.contracts.length >= 2) return g;
  const list = g.portContracts[g.player.currentPortId] || [];
  const target = list.find(c => c.id === contractId);
  if (!target) return g;
  // The delivery clock starts when you sign, not when the offer was posted (an offer can sit in a port for weeks).
  const from = g.ports.find(p => p.id === target.fromPortId);
  const to = g.ports.find(p => p.id === target.toPortId);
  const signed = { ...target, deadlineDay: g.player.gameDay + (from && to ? voyageDays(from, to, false) : 6) + 8 };
  return {
    ...g,
    player: { ...g.player, contracts: [...g.player.contracts, signed] },
    portContracts: { ...g.portContracts, [g.player.currentPortId]: list.filter(c => c.id !== contractId) },
  };
};

export const claimContract = (g: GameState, contractId: string): GameState => {
  const c = g.player.contracts.find(x => x.id === contractId);
  if (!c || c.toPortId !== g.player.currentPortId) return g;
  if ((g.player.cargo[c.good] || 0) < c.amount) return g;
  const held = g.player.cargo[c.good];
  const paidBefore = g.player.paid[c.good] || 0;
  const newHeld = held - c.amount;
  const curRep = g.player.reputation?.[c.toPortId] || 0;
  return {
    ...g,
    player: {
      ...g.player,
      gold: g.player.gold + c.rewardGold,
      cargo: { ...g.player.cargo, [c.good]: newHeld },
      paid: { ...g.player.paid, [c.good]: newHeld > 0 ? Math.round(paidBefore * (newHeld / held)) : 0 },
      reputation: { ...g.player.reputation, [c.toPortId]: clamp(curRep + c.repGain, 0, 100) },
      contracts: g.player.contracts.filter(x => x.id !== contractId),
    },
  };
};

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
  const destId = g.player.currentPortId;
  const destPort = ports.find(p => p.id === destId);
  const contracts = g.player.contracts.filter(c => c.deadlineDay >= g.player.gameDay);
  const portContracts = { ...g.portContracts };
  // Fresh offers are posted every time you make port
  if (destPort) {
    portContracts[destId] = generateContractsForPort(destPort, ports, g.player.gameDay);
  }
  return { ...g, ports, events, portContracts, player: { ...g.player, contracts } };
};

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

export const SHIP_CLASSES = ['Tartane', 'Brigantine', 'Frigate', 'Galleon'];

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
      hullHealth: { current: Math.max(base.hull, fitted.hullHealth.max), max: Math.max(base.hull, fitted.hullHealth.max) },
      cargoCapacity: Math.max(base.cargo, fitted.cargoCapacity),
      speed: Math.max(base.speed, fitted.speed),
      firepower: Math.max(base.firepower, fitted.firepower),
      upgrades: [],
    },
  };
};

export const REPAIR_COST_PER_POINT = 8;

// --- SYNDICATE RIVALS & PIRATE COMBAT ---

export const SYNDICATE_RIVALS: RivalDef[] = [
  {
    id: 'vane',
    name: 'Corsair Vane',
    shipName: 'The Black Cormorant',
    shipClass: 'Brigantine',
    tier: 2,
    hull: 48,
    firepower: 4,
    speed: 6,
    minWorth: 1800,
    watersPortId: 'nice',
    bounty: 1500,
    lootGood: 'Spice',
    lootAmount: 4,
    taunt: 'No Tartane crosses the Ligurian without paying Vane his tithe!',
  },
  {
    id: 'moretti',
    name: 'Captain Moretti',
    shipName: 'The Gilded Viper',
    shipClass: 'Frigate',
    tier: 3,
    hull: 82,
    firepower: 6,
    speed: 8,
    minWorth: 6500,
    watersPortId: 'rome',
    bounty: 5000,
    lootGood: 'Silk',
    lootAmount: 5,
    taunt: 'The Syndicate owns every dock from Rome to Venice, little captain.',
  },
  {
    id: 'iskander',
    name: 'Admiral Iskander',
    shipName: 'The Crimson Crescent',
    shipClass: 'Frigate',
    tier: 3,
    hull: 105,
    firepower: 8,
    speed: 9,
    minWorth: 16000,
    watersPortId: 'crete',
    bounty: 10000,
    lootGood: 'Gems',
    lootAmount: 4,
    taunt: 'Turn back toward Sardinia, or feed the fishes off Crete!',
  },
  {
    id: 'valerio',
    name: 'Lord Valerio',
    shipName: 'The Sovereign',
    shipClass: 'Galleon',
    tier: 4,
    hull: 165,
    firepower: 12,
    speed: 10,
    minWorth: 30000,
    watersPortId: 'venice',
    bounty: 20000,
    lootGood: 'Statues',
    lootAmount: 5,
    taunt: 'I stripped your family of their fleet. Come claim your ruin!',
  },
];

const PIRATE_NAMES = ['The Salty Scourge', "Blackbeard's Revenge", 'Iron Barnacle', 'Sea Vulture', 'Crimson Wave', 'The Leviathan', "Neptune's Wrath", "Kraken's Wake"];

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

export const generateRivalEnemy = (rival: RivalDef): { enemy: Ship; loot: Loot } => ({
  enemy: {
    id: `rival_${rival.id}`,
    name: rival.shipName,
    shipClass: rival.shipClass,
    tier: rival.tier,
    hullHealth: { current: rival.hull, max: rival.hull },
    cargoCapacity: 30,
    speed: rival.speed,
    firepower: rival.firepower,
    upgrades: [],
  },
  loot: { gold: rival.bounty, good: rival.lootGood, amount: rival.lootAmount },
});

export interface Loot { gold: number; good: CommodityType; amount: number }

export const generateLoot = (enemy: Ship): Loot => ({
  gold: (160 + Math.floor(Math.random() * 240)) * enemy.tier,
  good: pick(COMMODITIES.filter(t => BASE_PRICES[t] <= 150 * enemy.tier * enemy.tier)),
  amount: (1 + Math.floor(Math.random() * 3)) * enemy.tier,
});

export type AimAccuracy = 'crit' | 'good' | 'graze';
export type ShotMode = 'heavy' | 'chain';
export type EnemyIntent = 'heavy' | 'volley' | 'maneuver';

export const pickEnemyIntent = (turn: number): EnemyIntent => {
  const r = (Math.random() + (turn % 2) * 0.15) % 1;
  if (r < 0.45) return 'heavy';
  if (r < 0.8) return 'volley';
  return 'maneuver';
};

export const rollAimedShot = (firepower: number, accuracy: AimAccuracy, mode: ShotMode): { damage: number; cripples: boolean } => {
  const accMult = accuracy === 'crit' ? 1.65 : accuracy === 'good' ? 1 : 0.55;
  const modeMult = mode === 'chain' ? 0.65 : 1;
  const base = firepower + Math.floor(Math.random() * 3);
  return {
    damage: Math.max(1, Math.round(base * accMult * modeMult)),
    cripples: mode === 'chain',
  };
};

export const rollShot = (firepower: number): { damage: number; kind: 'miss' | 'hit' | 'crit' } => {
  const r = Math.random();
  if (r < 0.12) return { damage: 0, kind: 'miss' };
  const base = Math.max(1, firepower + Math.floor(Math.random() * 3));
  if (r > 0.88) return { damage: Math.round(base * 1.7), kind: 'crit' };
  return { damage: base, kind: 'hit' };
};

export const fleeChance = (player: Player, enemy: Ship, enemyCrippled = false) => {
  const spd = effectiveSpeed(player);
  const effEnemySpd = enemyCrippled ? Math.max(1, enemy.speed * 0.6) : enemy.speed;
  return clamp((spd / effEnemySpd) * 0.52, 0.18, 0.92);
};

export const rollFlee = (player: Player, enemy: Ship, enemyCrippled = false) =>
  Math.random() < fleeChance(player, enemy, enemyCrippled);

export const boardChance = (player: Player, enemy: Ship, enemyCrippled = false) => {
  const fp = totalFirepower(player);
  const ratio = fp / Math.max(1, enemy.firepower);
  return clamp(0.45 + (ratio - 1) * 0.25 + (enemyCrippled ? 0.15 : 0), 0.25, 0.92);
};

export const rollBoard = (player: Player, enemy: Ship, enemyCrippled = false) =>
  Math.random() < boardChance(player, enemy, enemyCrippled);

export const tributeCost = (gold: number, enemy: Ship) => Math.max(40 * enemy.tier, Math.round(gold * 0.14));

// --- MID-VOYAGE SEA ENCOUNTERS ---

export interface SeaChoice {
  label: string;
  hint: string;
  resolve: (g: GameState, destId: string) => { state: GameState; outcome: string };
}

export interface SeaEventDef {
  id: string;
  title: string;
  story: string;
  choices: SeaChoice[];
}

const addCargoSafe = (p: Player, good: CommodityType, maxWanted: number): { player: Player; added: number } => {
  const space = Math.max(0, totalCargoCapacity(p) - cargoCount(p));
  const added = Math.min(space, maxWanted);
  if (added <= 0) return { player: p, added: 0 };
  return {
    added,
    player: { ...p, cargo: { ...p.cargo, [good]: (p.cargo[good] || 0) + added } },
  };
};

export const SEA_EVENTS: SeaEventDef[] = [
  {
    id: 'shipwreck',
    title: 'Drifting Merchant Wreck',
    story: 'Splintered timber bobs on the swell beside sealed oak crates stamped with Venetian wax.',
    choices: [
      {
        label: 'Salvage the cargo',
        hint: 'Claim floating Wine or Silk (if hold allows)',
        resolve: (g) => {
          const good: CommodityType = Math.random() < 0.5 ? 'Wine' : 'Silk';
          const { player, added } = addCargoSafe(g.player, good, 3);
          return added > 0
            ? { state: { ...g, player }, outcome: `Your crew hauls aboard ${added} crates of dry ${good}.` }
            : { state: { ...g, player: { ...g.player, gold: g.player.gold + 90 } }, outcome: 'The hold is full, but you pry 90 gold coins from the captain’s chest.' };
        },
      },
      {
        label: 'Search for survivors',
        hint: 'Gain port reputation & a trade rumor',
        resolve: (g, destId) => {
          const rep = (g.player.reputation?.[destId] || 0) + 10;
          const next = learnRumor({ ...g, player: { ...g.player, reputation: { ...g.player.reputation, [destId]: clamp(rep, 0, 100) } } });
          return { state: next, outcome: 'You rescue a stranded merchant who shares market news and praises your name ashore (+10 rep).' };
        },
      },
    ],
  },
  {
    id: 'smuggler',
    title: 'Midnight Smuggler Skiff',
    story: 'A lantern-darkened skiff hails you in hushed tones, offering contraband spice at half the harbor price.',
    choices: [
      {
        label: 'Buy 2 Spice for 140 gold',
        hint: 'Requires 140 gold & hold space',
        resolve: (g) => {
          if (g.player.gold < 140 || totalCargoCapacity(g.player) - cargoCount(g.player) < 1) {
            return { state: g, outcome: 'You lack the gold or hold space, so the skiff slips back into the mist.' };
          }
          const { player, added } = addCargoSafe({ ...g.player, gold: g.player.gold - 140 }, 'Spice', 2);
          return { state: { ...g, player }, outcome: `Quietly stowed ${added} Spice beneath the floorboards.` };
        },
      },
      {
        label: 'Wave them off',
        hint: 'Safe passage & +6 reputation ahead',
        resolve: (g, destId) => ({
          state: { ...g, player: { ...g.player, reputation: { ...g.player.reputation, [destId]: clamp((g.player.reputation?.[destId] || 0) + 6, 0, 100) } } },
          outcome: 'You keep your papers clean. Customs waves you into harbor with respect (+6 rep).',
        }),
      },
    ],
  },
  {
    id: 'squall',
    title: 'Sudden Mediterranean Squall',
    story: 'Black thunderheads sweep off the headland, whipping green water across the bow.',
    choices: [
      {
        label: 'Ride the gale',
        hint: 'Save time, risk slight hull strain',
        resolve: (g) => {
          const ship = g.player.fleet[0];
          const dmg = Math.max(2, Math.round(ship.hullHealth.max * 0.1));
          const hp = Math.max(1, ship.hullHealth.current - dmg);
          return {
            state: { ...g, player: { ...g.player, gold: g.player.gold + 60, fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: hp } }] } },
            outcome: `You outrun a slower brig in the spray (-${dmg} hull, +60 gold saved on port dues).`,
          };
        },
      },
      {
        label: 'Reef the sails & wait',
        hint: 'No hull damage, +1 day at sea',
        resolve: (g) => ({
          state: { ...g, player: { ...g.player, gameDay: g.player.gameDay + 1 } },
          outcome: 'Your ship rides the swell safely without losing a plank (+1 day).',
        }),
      },
    ],
  },
  {
    id: 'convoy',
    title: 'Becalmed Guild Convoy',
    story: 'A Venetian merchant cog sits with slack canvas and offers water and trade gossip for a tow out of the doldrums.',
    choices: [
      {
        label: 'Lend a tow line',
        hint: '+160 gold & learn a trade tip',
        resolve: (g) => {
          const next = learnRumor({ ...g, player: { ...g.player, gold: g.player.gold + 160 } });
          return { state: next, outcome: 'Their captain pays 160 gold and shares a fresh market tip.' };
        },
      },
      {
        label: 'Patch rigging together',
        hint: 'Restore +6 hull at sea',
        resolve: (g) => {
          const ship = g.player.fleet[0];
          const hp = Math.min(ship.hullHealth.max, ship.hullHealth.current + 6);
          return {
            state: { ...g, player: { ...g.player, fleet: [{ ...ship, hullHealth: { ...ship.hullHealth, current: hp } }] } },
            outcome: 'Their shipwrights lend spare oak planks (+6 hull repaired).' ,
          };
        },
      },
    ],
  },
];

export const rollSeaEvent = (voyages: number): SeaEventDef | null => {
  if (voyages < 1) return null;
  if (Math.random() > 0.42) return null;
  return pick(SEA_EVENTS);
};

// --- PORT LAYOUT & SAVES ---

const B = (mkt: [number, number], ship: [number, number], bar: [number, number], sail: [number, number]): Building[] => [
  { id: 'mkt', label: 'Market', x: mkt[0], y: mkt[1], image: '/assets/Market Transparent.webp', tab: 'market' },
  { id: 'ship', label: 'Shipyard', x: ship[0], y: ship[1], image: '/assets/Transparent Shipyard.webp', tab: 'ship' },
  { id: 'bar', label: 'Cantina', x: bar[0], y: bar[1], image: '/assets/proper cantina.webp', tab: 'cantina' },
  { id: 'sail', label: 'Set Sail', x: sail[0], y: sail[1], image: '/assets/easy remove boat.webp', tab: 'map' },
];

const PORT_LAYOUT: Omit<Port, 'market'>[] = [
  { id: 'athens',    name: 'Athens',    dangerLevel: 1, x: 69, y: 40, image: '/assets/New Lands/Athens.webp',    buildings: B([50, 49], [86, 49], [56, 63], [69, 82]) },
  { id: 'rome',      name: 'Rome',      dangerLevel: 1, x: 47, y: 28, image: '/assets/New Lands/Rome.webp',      buildings: B([52, 30], [88, 36], [20, 45], [78, 78]) },
  { id: 'venice',    name: 'Venice',    dangerLevel: 1, x: 51, y: 6,  image: '/assets/New Lands/Venice.webp',    buildings: B([24, 18], [88, 66], [46, 81], [24, 84]) },
  { id: 'crete',     name: 'Crete',     dangerLevel: 2, x: 81, y: 63, image: '/assets/New Lands/Crete.webp',     buildings: B([36, 44], [82, 63], [71, 20], [56, 76]) },
  { id: 'barcelona', name: 'Barcelona', dangerLevel: 1, x: 16, y: 23, image: '/assets/New Lands/Barcellona.webp', buildings: B([34, 50], [23, 72], [63, 38], [57, 78]) },
  { id: 'tunisia',   name: 'Tunisia',   dangerLevel: 2, x: 19, y: 89, image: '/assets/New Lands/Tunisia.webp',   buildings: B([51, 45], [72, 53], [26, 65], [65, 84]) },
  { id: 'egypt',     name: 'Egypt',     dangerLevel: 2, x: 81, y: 92, image: '/assets/New Lands/Egypt.webp',     buildings: B([68, 66], [38, 24], [91, 31], [19, 68]) },
  { id: 'nice',      name: 'Nice',      dangerLevel: 1, x: 30, y: 15, image: '/assets/New Lands/Nice.webp',      buildings: B([47, 26], [66, 41], [60, 77], [83, 61]) },
  { id: 'sardinia',  name: 'Sardinia',  dangerLevel: 1, x: 36, y: 33, image: '/assets/New Lands/Sardinia.webp',  buildings: B([27, 57], [88, 42], [85, 78], [66, 82]) },
];

const newPlayer = (): Player => {
  const base = tierBase(1);
  return {
    gold: 500,
    fleet: [{ id: '1', name: 'The Salty Dog', shipClass: 'Tartane', tier: 1, hullHealth: { current: base.hull, max: base.hull }, cargoCapacity: base.cargo, speed: base.speed, firepower: base.firepower, upgrades: [] }],
    escorts: [],
    officers: [],
    contracts: [],
    reputation: {},
    defeatedRivals: [],
    cargo: emptyCargo(),
    paid: emptyCargo(),
    currentPortId: 'sardinia',
    gameDay: 1,
    hasReadPrologue: false,
    hasWonGame: false,
    ownedPorts: {},
    hasWonEmpire: false,
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

export const loadGame = (): GameState => {
  const fresh = newPlayer();
  const savedPlayer = readJson(SAVE_KEYS.player) as Partial<Player> | null;
  let player: Player = fresh;
  if (savedPlayer && Array.isArray(savedPlayer.fleet) && savedPlayer.fleet[0]) {
    const ship = { ...fresh.fleet[0], ...savedPlayer.fleet[0] };
    if (!ship.tier) ship.tier = 1;
    if (ship.shipClass === 'Sloop' || ship.shipClass === 'Schooner') ship.shipClass = 'Tartane';
    if (!Array.isArray(ship.upgrades)) ship.upgrades = [];
    player = {
      ...fresh,
      ...savedPlayer,
      fleet: [ship],
      escorts: Array.isArray(savedPlayer.escorts) ? savedPlayer.escorts : [],
      officers: Array.isArray(savedPlayer.officers) ? savedPlayer.officers : [],
      contracts: Array.isArray(savedPlayer.contracts) ? savedPlayer.contracts : [],
      ownedPorts: savedPlayer.ownedPorts && typeof savedPlayer.ownedPorts === 'object' ? savedPlayer.ownedPorts : {},
      reputation: savedPlayer.reputation && typeof savedPlayer.reputation === 'object' ? savedPlayer.reputation : {},
      defeatedRivals: Array.isArray(savedPlayer.defeatedRivals) ? savedPlayer.defeatedRivals : [],
      cargo: { ...emptyCargo(), ...(savedPlayer.cargo || {}) },
      paid: { ...emptyCargo(), ...(savedPlayer.paid || {}) },
      seenGuide: savedPlayer.seenGuide ?? ((savedPlayer.gameDay || 1) > 1),
      voyages: savedPlayer.voyages ?? Math.max(0, (savedPlayer.gameDay || 1) - 1),
    };
  }

  const world = (readJson(SAVE_KEYS.world) || {}) as {
    events?: TradeEvent[];
    rumors?: Rumor[];
    portContracts?: Record<string, Contract[]>;
    layoutVersion?: number;
  };

  const keepSavedLayout = world.layoutVersion === LAYOUT_VERSION;
  const savedPorts = readJson(SAVE_KEYS.ports) as Array<Partial<Port> & { buildings?: Partial<Building>[] }> | null;
  const ports: Port[] = PORT_LAYOUT.map(layout => {
    const saved = Array.isArray(savedPorts) ? savedPorts.find(p => p.id === layout.id) : null;
    if (!saved) return { ...layout, market: generateMarket() };
    const marketOk = saved.market && COMMODITIES.every(t => typeof saved.market![t]?.drift === 'number');
    return {
      ...layout,
      x: keepSavedLayout && typeof saved.x === 'number' ? saved.x : layout.x,
      y: keepSavedLayout && typeof saved.y === 'number' ? saved.y : layout.y,
      buildings: keepSavedLayout
        ? layout.buildings.map(b => {
            const sb = Array.isArray(saved.buildings) ? saved.buildings.find(s => s.id === b.id) : null;
            return sb ? { ...b, x: sb.x ?? b.x, y: sb.y ?? b.y, scale: sb.scale } : b;
          })
        : layout.buildings,
      market: marketOk ? saved.market! : generateMarket(),
    };
  });
  if (!ports.some(p => p.id === player.currentPortId)) player = { ...player, currentPortId: 'sardinia' };

  const portContracts: Record<string, Contract[]> = world.portContracts && typeof world.portContracts === 'object'
    ? { ...world.portContracts }
    : {};
  for (const p of ports) {
    if (!Array.isArray(portContracts[p.id]) || portContracts[p.id].length === 0) {
      portContracts[p.id] = generateContractsForPort(p, ports, player.gameDay);
    }
  }

  return {
    player,
    ports,
    events: Array.isArray(world.events) ? world.events : [],
    rumors: Array.isArray(world.rumors) ? world.rumors : [],
    portContracts,
    layoutVersion: LAYOUT_VERSION,
  };
};

export const saveGame = (g: GameState) => {
  try {
    localStorage.setItem(SAVE_KEYS.player, JSON.stringify(g.player));
    localStorage.setItem(SAVE_KEYS.ports, JSON.stringify(g.ports));
    localStorage.setItem(SAVE_KEYS.world, JSON.stringify({
      events: g.events,
      rumors: g.rumors,
      portContracts: g.portContracts,
      layoutVersion: g.layoutVersion,
    }));
  } catch {
    // Private browsing or full storage.
  }
};

export const clearSave = () => Object.values(SAVE_KEYS).forEach(k => localStorage.removeItem(k));
