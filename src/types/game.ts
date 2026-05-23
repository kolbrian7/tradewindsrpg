export type CommodityType = 
  | 'Grain' | 'Timber' | 'Iron' | 'Spice' | 'Silk' | 'Gems' 
  | 'Salt' | 'Wine' | 'Oil' | 'Tobacco' | 'Tea' | 'Porcelain' | 'Silver'
  | 'Hemp' | 'Coffee' | 'Wool' | 'Cotton' | 'Paper' | 'Dye' | 'Tools' | 'Weapons' | 'Jewelry' | 'Statues';

export interface MarketCommodity {
  type: CommodityType;
  basePrice: number;
  supplyModifier: number; // > 1 means surplus (lower price), < 1 means shortage (higher price)
  demandModifier: number; // > 1 means high demand (higher price), < 1 means low demand (lower price)
}

export interface Port {
  id: string;
  name: string;
  market: Record<CommodityType, MarketCommodity>;
  dangerLevel: number; // 1-5
}

export interface Ship {
  id: string;
  name: string;
  shipClass: 'Sloop' | 'Brigantine' | 'Galleon' | 'Frigate' | 'Man-O-War';
  hullHealth: { current: number; max: number };
  cargoCapacity: number;
  speed: number;
  firepower: number;
  upgrades: string[];
}

export interface Player {
  gold: number;
  rank: string;
  netWorth: number;
  fleet: Ship[];
  cargo: Record<CommodityType, number>;
  currentPortId: string;
  gameDay: number;
}

export interface Rumor {
  id: string;
  text: string;
  portId: string;
  commodityType: CommodityType;
  type: 'shortage' | 'surplus';
  duration: number; // game days
}
