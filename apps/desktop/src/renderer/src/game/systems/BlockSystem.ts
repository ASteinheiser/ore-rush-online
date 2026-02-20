import { Block } from '../objects/Block';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

export class BlockSystem {
  private blocks: Record<string, Block> = {};

  constructor(private scene: Game) {}

  public destroy() {
    Object.values(this.blocks).forEach((block) => block.destroy());
    this.blocks = {};
  }

  public handleBlockAdded: RoomEventCallbacks['onBlockAdded'] = (block, $) => {
    const entity = new Block(this.scene, block.x, block.y, block.type, block.hp, block.maxHp);
    this.blocks[block.id] = entity;

    $(block).onChange(() => {
      entity.update(block.hp, block.maxHp, block.type);
    });
  };

  public handleBlockRemoved: RoomEventCallbacks['onBlockRemoved'] = (block) => {
    const foundBlock = this.blocks[block.id];
    if (foundBlock) {
      foundBlock.destroy();
      delete this.blocks[block.id];
    }
  };
}
