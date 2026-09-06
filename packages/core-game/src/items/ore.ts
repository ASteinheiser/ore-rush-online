import { BLOCK_TYPES, type BLOCK_TYPE } from '../constants/block';
import type { Inventory } from '../schemas/Player';

type ORE_TYPE = Exclude<BLOCK_TYPE, 'dirt'>;

export const isOreType = (type: string): type is ORE_TYPE => Object.hasOwn(ORE, type);

export const calculateInventoryWeight = (inventory: Omit<Inventory, 'capacity'>) => {
  return Object.keys(ORE).reduce((sum, type) => {
    const oreType = type as ORE_TYPE;
    return sum + inventory[oreType] * ORE[oreType].weight;
  }, 0);
};

interface Ore {
  id: string;
  name: string;
  description: string;
  /** Determines how many drill actions it takes to mine a single ore */
  hardness: number;
  /** Determines how much weight capactity a single ore takes up */
  weight: number;
}

export const ORE: Record<ORE_TYPE, Ore> = {
  [BLOCK_TYPES.COAL]: {
    id: 'ore-coal',
    name: 'Coal',
    description: 'Used mainly as a fuel source.',
    hardness: 3,
    weight: 1,
  },
  [BLOCK_TYPES.IRON]: {
    id: 'ore-iron',
    name: 'Iron',
    description: 'Material used in many standard parts.',
    hardness: 4,
    weight: 5,
  },
  [BLOCK_TYPES.COPPER]: {
    id: 'ore-copper',
    name: 'Copper',
    description: 'Allows for advanced electronics.',
    hardness: 4,
    weight: 6,
  },
};
