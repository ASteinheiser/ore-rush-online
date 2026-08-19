import type { BLOCK_TYPE } from '../constants/block';

type ORE_TYPE = Exclude<BLOCK_TYPE, 'dirt'>;

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
  coal: {
    id: 'ore-coal',
    name: 'Coal',
    description: 'Used mainly as a fuel source.',
    hardness: 3,
    weight: 1,
  },
  iron: {
    id: 'ore-iron',
    name: 'Iron',
    description: 'Material used in many standard parts.',
    hardness: 4,
    weight: 5,
  },
  copper: {
    id: 'ore-copper',
    name: 'Copper',
    description: 'Allows for advanced electronics.',
    hardness: 4,
    weight: 6,
  },
};
