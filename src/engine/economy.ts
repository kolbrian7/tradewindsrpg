import type { CommodityType, MarketCommodity, Port, Rumor } from '../types/game';

export const COMMODITIES: CommodityType[] = [
  'Grain', 'Salt', 'Hemp', 'Timber', 'Coffee', 'Wool', 'Cotton', 'Wine', 'Paper', 
  'Iron', 'Oil', 'Dye', 'Spice', 'Tobacco', 'Tea', 'Silk', 'Tools', 
  'Porcelain', 'Weapons', 'Silver', 'Jewelry', 'Gems', 'Statues'
];

export const BASE_PRICES: Record<CommodityType, number> = {
  Grain: 10, Salt: 15, Hemp: 20, Timber: 25, Coffee: 28, Wool: 30, Cotton: 35, 
  Wine: 45, Paper: 50, Iron: 60, Oil: 80, Dye: 120, Spice: 150, 
  Tobacco: 200, Tea: 250, Silk: 350, Tools: 400, Porcelain: 500, 
  Weapons: 600, Silver: 750, Jewelry: 850, Gems: 1000, Statues: 1500
};

export class EconomyEngine {
  static calculatePrice(commodity: MarketCommodity): number {
    const { basePrice, supplyModifier, demandModifier } = commodity;
    // Price = Base * (Demand / Supply)
    const price = basePrice * (demandModifier / supplyModifier);
    return Math.max(1, Math.round(price));
  }

  static generateInitialMarket(): Record<CommodityType, MarketCommodity> {
    const market: any = {};
    COMMODITIES.forEach((type) => {
      market[type] = {
        type,
        basePrice: BASE_PRICES[type],
        supplyModifier: 1 + (Math.random() * 0.4 - 0.2), // 0.8 to 1.2
        demandModifier: 1 + (Math.random() * 0.4 - 0.2), // 0.8 to 1.2
      };
    });
    return market;
  }

  static simulateDay(ports: Port[], rumors: Rumor[]): { updatedPorts: Port[]; updatedRumors: Rumor[] } {
    // 1. Progress Rumors
    const activeRumors = rumors.map(r => ({ ...r, duration: r.duration - 1 })).filter(r => r.duration > 0);

    // 2. Update Port Markets
    const updatedPorts = ports.map((port) => {
      const newMarket = { ...port.market };

      COMMODITIES.forEach((type) => {
        const commodity = newMarket[type];
        
        // Regression to mean: Modifiers slowly move back to 1.0
        commodity.supplyModifier += (1.0 - commodity.supplyModifier) * 0.1;
        commodity.demandModifier += (1.0 - commodity.demandModifier) * 0.1;

        // Random small fluctuations
        commodity.supplyModifier += (Math.random() * 0.04 - 0.02);
        commodity.demandModifier += (Math.random() * 0.04 - 0.02);

        // Apply Rumor effects
        const portRumors = activeRumors.filter(r => r.portId === port.id && r.commodityType === type);
        portRumors.forEach((rumor) => {
          if (rumor.type === 'shortage') {
            commodity.demandModifier += 0.5; // Shortage spikes demand
            commodity.supplyModifier -= 0.2; // And drops supply
          } else {
            commodity.supplyModifier += 0.5; // Surplus spikes supply
            commodity.demandModifier -= 0.2; // And drops demand
          }
        });

        // Clamp modifiers to prevent extreme values
        commodity.supplyModifier = Math.max(0.2, Math.min(5, commodity.supplyModifier));
        commodity.demandModifier = Math.max(0.2, Math.min(5, commodity.demandModifier));
      });

      return { ...port, market: newMarket };
    });

    return { updatedPorts, updatedRumors: activeRumors };
  }

  static applyTradeEffect(commodity: MarketCommodity, amount: number, isBuying: boolean): MarketCommodity {
    const newCommodity = { ...commodity };
    const impact = Math.abs(amount) * 0.01; // 1% impact per unit traded (adjustable)

    if (isBuying) {
      // Buying reduces supply, increasing price
      newCommodity.supplyModifier = Math.max(0.2, newCommodity.supplyModifier - impact);
    } else {
      // Selling increases supply, decreasing price
      newCommodity.supplyModifier = Math.min(5, newCommodity.supplyModifier + impact);
    }

    return newCommodity;
  }
}
