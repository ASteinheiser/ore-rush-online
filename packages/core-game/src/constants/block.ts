/** The size of the block in pixels */
export const BLOCK_SIZE = {
  width: 64,
  height: 64,
} as const;
/** List of blocks available (value map) */
export const BLOCK_TYPES = {
  DIRT: 'dirt',
  COAL: 'coal',
  IRON: 'iron',
  COPPER: 'copper',
} as const;
/** List of blocks available (type) */
export type BLOCK_TYPE = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];
