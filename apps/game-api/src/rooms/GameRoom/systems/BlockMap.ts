import type { Client } from 'colyseus';
import { MAP_SIZE, BLOCK_SIZE, BLOCK_TYPES, PLAYER_VIEW_RADIUS } from '@repo/core-game';
import { Block } from '../schemas/Block';
import type { Player } from '../schemas/Player';
import type { GameRoom } from '../index';

export class BlockMap {
  private cols: number;
  private rows: number;
  /** 2D grid initialized with each cell containing empty string (no blockId) */
  private blockGrid: string[][];
  /** the number of cells to search in each direction for visibility */
  private viewRadiusCells: number;
  public clientVisibleBlocks = new Map<string, Set<string>>();

  constructor(private room: GameRoom) {
    this.cols = Math.ceil(MAP_SIZE.width / BLOCK_SIZE.width);
    this.rows = Math.ceil(MAP_SIZE.height / BLOCK_SIZE.height);
    this.viewRadiusCells = Math.ceil(PLAYER_VIEW_RADIUS / BLOCK_SIZE.width);

    this.blockGrid = Array.from({ length: this.rows }, () => Array.from({ length: this.cols }, () => ''));
    this.generateBlockMap();
  }

  public deleteBlock(blockId: string) {
    const block = this.room.state.blocks.get(blockId);
    if (!block) return;

    const col = Math.floor(block.x / BLOCK_SIZE.width);
    const row = Math.floor(block.y / BLOCK_SIZE.height);
    this.blockGrid[row][col] = '';
    this.room.state.blocks.delete(blockId);
  }

  /** Returns blocks in the 3×3 grid around the player (blocks the player could be touching) */
  public getNearbyBlocks(player: Player): Block[] {
    const playerCol = Math.floor(player.x / BLOCK_SIZE.width);
    const playerRow = Math.floor(player.y / BLOCK_SIZE.height);

    const blocks: Block[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const row = playerRow + dr;
        const col = playerCol + dc;
        // skip blocks outside the map
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) continue;

        const blockId = this.blockGrid[row][col];
        if (blockId === '') continue; // ignore empty cells

        blocks.push(this.room.state.blocks.get(blockId));
      }
    }
    return blocks;
  }

  public updateVisibleBlocks(client: Client, player: Player) {
    const currentlyVisibleBlocks = this.clientVisibleBlocks.get(client.sessionId) ?? new Set();
    const nowVisible = new Set<string>();

    const playerCol = Math.floor(player.x / BLOCK_SIZE.width);
    const playerRow = Math.floor(player.y / BLOCK_SIZE.height);

    const colMin = Math.max(0, playerCol - this.viewRadiusCells);
    const colMax = Math.min(this.cols - 1, playerCol + this.viewRadiusCells);
    const rowMin = Math.max(0, playerRow - this.viewRadiusCells);
    const rowMax = Math.min(this.rows - 1, playerRow + this.viewRadiusCells);

    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        const blockId = this.blockGrid[row][col];
        if (blockId === '') continue; // ignore empty cells

        const block = this.room.state.blocks.get(blockId);
        nowVisible.add(block.id);

        if (!currentlyVisibleBlocks.has(block.id)) {
          client.view.add(block);
        }
      }
    }

    for (const blockId of currentlyVisibleBlocks) {
      if (!nowVisible.has(blockId)) {
        const block = this.room.state.blocks.get(blockId);
        if (block) client.view.remove(block);
      }
    }

    this.clientVisibleBlocks.set(client.sessionId, nowVisible);
  }

  private generateBlockMap() {
    const totalBlocks = this.cols * this.rows;

    for (let i = 0; i < totalBlocks; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);

      const block = new Block();
      block.id = `${i}`;
      block.x = col * BLOCK_SIZE.width + BLOCK_SIZE.width / 2;
      block.y = row * BLOCK_SIZE.height + BLOCK_SIZE.height / 2;

      const randomBlockTypeSeed = Math.random();
      if (randomBlockTypeSeed < 0.5) {
        block.type = BLOCK_TYPES.DIRT;
        block.maxHp = 1;
      } else if (randomBlockTypeSeed < 0.8) {
        block.type = BLOCK_TYPES.GOLD;
        block.maxHp = 4;
      } else {
        block.type = BLOCK_TYPES.IRON;
        block.maxHp = 2;
      }
      block.hp = block.maxHp;

      this.blockGrid[row][col] = block.id;
      this.room.state.blocks.set(block.id, block);
    }
  }
}
