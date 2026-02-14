import type { Client } from 'colyseus';
import { Quadtree, Rectangle } from '@timohausmann/quadtree-ts';
import { MAP_SIZE, BLOCK_SIZE, BLOCK_TYPES, PLAYER_VIEW_RADIUS } from '@repo/core-game';
import { Block } from '../schemas/Block';
import type { Player } from '../schemas/Player';
import type { GameRoom } from '../index';

export class BlockMap {
  blockQuadtree: Quadtree<Rectangle<Block>>;
  clientVisibleBlocks = new Map<string, Set<number>>();

  constructor(private room: GameRoom) {
    this.blockQuadtree = new Quadtree({
      width: MAP_SIZE.width,
      height: MAP_SIZE.height,
      maxObjects: 4,
      maxLevels: 6,
    });

    this.generateBlockMap();
  }

  public updateClientVisibleBlocks(client: Client, player: Player) {
    const currentlyVisibleBlocks = this.clientVisibleBlocks.get(client.sessionId);
    const nowVisible = new Set<number>();

    const searchArea = new Rectangle({
      x: player.x - PLAYER_VIEW_RADIUS,
      y: player.y - PLAYER_VIEW_RADIUS,
      width: PLAYER_VIEW_RADIUS * 2,
      height: PLAYER_VIEW_RADIUS * 2,
    });

    const nearbyBlocks = this.blockQuadtree.retrieve(searchArea);

    for (const nearbyBlock of nearbyBlocks) {
      const block = nearbyBlock.data;
      nowVisible.add(block.id);

      if (!currentlyVisibleBlocks.has(block.id)) {
        client.view.add(block);
      }
    }

    for (const blockId of currentlyVisibleBlocks) {
      if (!nowVisible.has(blockId)) {
        client.view.remove(this.room.state.blocks[blockId]);
      }
    }

    this.clientVisibleBlocks.set(client.sessionId, nowVisible);
  }

  public generateBlockMap() {
    const cols = Math.ceil(MAP_SIZE.width / BLOCK_SIZE.width);
    const rows = Math.ceil(MAP_SIZE.height / BLOCK_SIZE.height);
    const totalBlocks = cols * rows;

    for (let i = 0; i < totalBlocks; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const block = new Block();
      block.id = i;
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

      this.room.state.blocks.push(block);

      this.blockQuadtree.insert(
        new Rectangle({
          x: block.x - BLOCK_SIZE.width / 2,
          y: block.y - BLOCK_SIZE.height / 2,
          width: BLOCK_SIZE.width,
          height: BLOCK_SIZE.height,
          data: block,
        })
      );
    }
  }
}
