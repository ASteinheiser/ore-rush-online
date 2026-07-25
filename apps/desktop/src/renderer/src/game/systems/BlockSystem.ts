import { BLOCK_SIZE, type Rectangle, type Block as ServerBlock } from '@repo/core-game';
import { Block } from '../objects/Block';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

export class BlockSystem {
  /** Map of blocks with their `col_row` as the key (used for CSP) */
  private blocks: Record<string, Block> = {};
  /** Map of blocks tracking the authoritative server state */
  private serverBlocks: Record<string, ServerBlock> = {};

  constructor(private scene: Game) {}

  public destroy() {
    Object.values(this.blocks).forEach((block) => block.destroy());
    this.blocks = {};
    this.serverBlocks = {};
  }

  public getSnapshotClientBlocks() {
    return { ...this.blocks };
  }

  public getSnapshotServerBlocks() {
    const snapshot: Record<string, Rectangle & { hp: number }> = {};

    for (const [blockId, block] of Object.entries(this.serverBlocks)) {
      snapshot[blockId] = { x: block.x, y: block.y, width: block.width, height: block.height, hp: block.hp };
    }
    return snapshot;
  }

  private getBlockIndex(x: number, y: number) {
    const col = Math.floor(x / BLOCK_SIZE.width);
    const row = Math.floor(y / BLOCK_SIZE.height);
    return `${col}_${row}`;
  }

  public getBlockByCell(col: number, row: number) {
    return this.blocks[`${col}_${row}`];
  }

  public hasBlockAt(x: number, y: number): boolean {
    return !!this.blocks[this.getBlockIndex(x, y)];
  }

  public handleBlockAdded: RoomEventCallbacks['onBlockAdded'] = (block) => {
    const blockId = this.getBlockIndex(block.x, block.y);

    this.serverBlocks[blockId] = block;

    const entity = new Block(this.scene, block.x, block.y, block.type, block.hp, block.maxHp);
    this.blocks[blockId] = entity;
  };

  public handleBlockUpdated: RoomEventCallbacks['onBlockUpdated'] = (block) => {
    const blockId = this.getBlockIndex(block.x, block.y);

    this.serverBlocks[blockId] = block;

    this.blocks[blockId]?.update(block.hp, block.maxHp, block.type);
  };

  public handleBlockRemoved: RoomEventCallbacks['onBlockRemoved'] = (block) => {
    const blockId = this.getBlockIndex(block.x, block.y);

    delete this.serverBlocks[blockId];

    this.blocks[blockId]?.destroy();
    delete this.blocks[blockId];
  };

  /** Optimistic CSP removal. Only modifies the client `blocks` state, leaving `serverBlocks` untouched */
  public deleteBlockByCell(col: number, row: number) {
    const blockId = `${col}_${row}`;

    this.blocks[blockId]?.destroy();
    delete this.blocks[blockId];
  }

  /** Blocks in the 3×3 grid of cells around `searchEntity`'s center (matches server `BlockMap.getNearbyBlocks`) */
  public getNearbyBlocks(searchEntity: Rectangle, blocksToSearch: Record<string, Rectangle>): Rectangle[] {
    const playerCol = Math.floor(searchEntity.x / BLOCK_SIZE.width);
    const playerRow = Math.floor(searchEntity.y / BLOCK_SIZE.height);

    const out: Rectangle[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const row = playerRow + dr;
        const col = playerCol + dc;

        const blockId = `${col}_${row}`;
        const block = blocksToSearch[blockId];
        if (!block) continue;

        out.push({
          x: block.x,
          y: block.y,
          width: BLOCK_SIZE.width,
          height: BLOCK_SIZE.height,
        });
      }
    }
    return out;
  }
}
