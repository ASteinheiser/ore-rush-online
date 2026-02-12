/** The size of the block in pixels */
export const BLOCK_SIZE = {
  width: 64,
  height: 64,
};
/** List of blocks available (value map) */
export const BLOCK_TYPES = {
  EMPTY: 'empty',
  DIRT: 'dirt',
  IRON: 'iron',
  GOLD: 'gold',
} as const;
/** List of blocks available (type) */
export type BLOCK_TYPE = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];
