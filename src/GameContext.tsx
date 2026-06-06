import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Player, Port, CommodityType, Rumor } from './types/game';
import { EconomyEngine, COMMODITIES } from './engine/economy';

interface GameContextType {
  player: Player;
  ports: Port[];
  rumors: Rumor[];
  buyCommodity: (type: CommodityType, amount: number) => void;
  sellCommodity: (type: CommodityType, amount: number) => void;
  travelToPort: (portId: string) => void;
  bribeForRumor: () => void;
  repairShip: () => void;
  upgradeShip: (upgrade: string, cost: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('GameProvider: Initializing state with lazy initializers...');

  // Use lazy initializers to prevent execution during module load
  const [player, setPlayer] = useState<Player>(() => ({
    gold: 500,
    rank: 'Cabin Boy',
    netWorth: 500,
    fleet: [{
      id: 'starter-sloop',
      name: 'The Salty Dog',
      shipClass: 'Schooner',
      tier: 1,
      hullHealth: { current: 15, max: 20 },
      cargoCapacity: 10,
      speed: 5,
      firepower: 2,
      upgrades: [],
    }],
    cargo: Object.fromEntries(COMMODITIES.map(t => [t, 0])) as Record<CommodityType, number>,
    currentPortId: 'port-royal',
    gameDay: 1,
    hasReadPrologue: false,
    hasWonGame: false,
  }));

  const [ports, setPorts] = useState<Port[]>(() => [
    { id: 'port-royal', name: 'Port Royal', dangerLevel: 1, market: EconomyEngine.generateInitialMarket() },
    { id: 'tortuga', name: 'Tortuga', dangerLevel: 2, market: EconomyEngine.generateInitialMarket() },
    { id: 'havana', name: 'Havana', dangerLevel: 2, market: EconomyEngine.generateInitialMarket() },
    { id: 'nassau', name: 'Nassau', dangerLevel: 3, market: EconomyEngine.generateInitialMarket() },
  ]);

  const [rumors, setRumors] = useState<Rumor[]>([]);

  const buyCommodity = (type: CommodityType, amount: number) => {
    setPorts(currentPorts => {
      const portIndex = currentPorts.findIndex(p => p.id === player.currentPortId);
      if (portIndex === -1) return currentPorts;

      const port = currentPorts[portIndex];
      const commodity = port.market[type];
      const price = EconomyEngine.calculatePrice(commodity);
      const totalCost = price * amount;

      const currentCargoTotal = Object.values(player.cargo).reduce((a, b) => a + b, 0);
      const maxCargo = player.fleet.reduce((a, b) => a + b.cargoCapacity, 0);

      if (player.gold >= totalCost && currentCargoTotal + amount <= maxCargo) {
        setPlayer(prev => ({
          ...prev,
          gold: prev.gold - totalCost,
          cargo: { ...prev.cargo, [type]: prev.cargo[type] + amount }
        }));

        const updatedMarket = {
          ...port.market,
          [type]: EconomyEngine.applyTradeEffect(commodity, amount, true)
        };
        const newPorts = [...currentPorts];
        newPorts[portIndex] = { ...port, market: updatedMarket };
        return newPorts;
      }
      return currentPorts;
    });
  };

  const sellCommodity = (type: CommodityType, amount: number) => {
    if (player.cargo[type] < amount) return;

    setPorts(currentPorts => {
      const portIndex = currentPorts.findIndex(p => p.id === player.currentPortId);
      if (portIndex === -1) return currentPorts;

      const port = currentPorts[portIndex];
      const commodity = port.market[type];
      const price = EconomyEngine.calculatePrice(commodity);
      const totalGain = price * amount;

      setPlayer(prev => ({
        ...prev,
        gold: prev.gold + totalGain,
        cargo: { ...prev.cargo, [type]: prev.cargo[type] - amount }
      }));

      const updatedMarket = {
        ...port.market,
        [type]: EconomyEngine.applyTradeEffect(commodity, amount, false)
      };
      const newPorts = [...currentPorts];
      newPorts[portIndex] = { ...port, market: updatedMarket };
      return newPorts;
    });
  };

  const travelToPort = (portId: string) => {
    setPlayer(prev => ({ ...prev, currentPortId: portId, gameDay: prev.gameDay + 1 }));
    
    setPorts(currentPorts => {
      const { updatedPorts, updatedRumors } = EconomyEngine.simulateDay(currentPorts, rumors);
      setRumors(updatedRumors);

      if (Math.random() > 0.7) {
        const randomPort = updatedPorts[Math.floor(Math.random() * updatedPorts.length)];
        const randomCommodity = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
        const newRumor: Rumor = {
          id: Math.random().toString(36).substr(2, 9),
          text: `Rumor: ${randomCommodity} is in high demand at ${randomPort.name}!`,
          portId: randomPort.id,
          commodityType: randomCommodity,
          type: 'shortage',
          duration: 5
        };
        setRumors(prev => [...prev, newRumor]);
      }
      return updatedPorts;
    });
  };

  const bribeForRumor = () => {
    if (player.gold >= 50) {
      setPlayer(prev => ({ ...prev, gold: prev.gold - 50 }));
      const randomPort = ports[Math.floor(Math.random() * ports.length)];
      const randomCommodity = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
      setRumors(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        text: `The barkeep whispers: I hear ${randomPort.name} is desperate for ${randomCommodity}.`,
        portId: randomPort.id,
        commodityType: randomCommodity,
        type: 'shortage',
        duration: 7
      }]);
    }
  };

  const repairShip = () => {
    const flagship = player.fleet[0];
    const damage = flagship.hullHealth.max - flagship.hullHealth.current;
    const cost = damage * 10;

    if (damage > 0 && player.gold >= cost) {
      setPlayer(prev => {
        const newFleet = [...prev.fleet];
        newFleet[0] = { 
          ...newFleet[0], 
          hullHealth: { ...newFleet[0].hullHealth, current: newFleet[0].hullHealth.max } 
        };
        return { ...prev, gold: prev.gold - cost, fleet: newFleet };
      });
    }
  };

  const upgradeShip = (upgrade: string, cost: number) => {
    if (player.gold >= cost) {
      setPlayer(prev => {
        const newFleet = [...prev.fleet];
        const ship = { ...newFleet[0] };
        
        if (upgrade === 'Reinforced Hull') {
          ship.hullHealth.max += 10;
          ship.hullHealth.current += 10;
        } else if (upgrade === 'Expanded Hold') {
          ship.cargoCapacity += 5;
        } else if (upgrade === 'Silk Sails') {
          ship.speed += 2;
        }

        ship.upgrades = [...ship.upgrades, upgrade];
        newFleet[0] = ship;
        return { ...prev, gold: prev.gold - cost, fleet: newFleet };
      });
    }
  };

  const contextValue = useMemo(() => ({
    player,
    ports,
    rumors,
    buyCommodity,
    sellCommodity,
    travelToPort,
    bribeForRumor,
    repairShip,
    upgradeShip
  }), [player, ports, rumors]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
