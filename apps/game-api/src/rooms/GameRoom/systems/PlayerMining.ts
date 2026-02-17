import {
  ATTACK_SIZE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  ATTACK_COOLDOWN,
  ATTACK_DAMAGE__DELAY,
  ATTACK_DAMAGE__FRAME_TIME,
  BLOCK_SIZE,
  type InputPayload,
  checkAABBCollision,
} from '@repo/core-game';
import type { GameRoom } from '../index';
import type { Player } from '../schemas/Player';

export class PlayerMining {
  constructor(private room: GameRoom) {}

  public handleInput(player: Player, input: InputPayload, sessionId: string) {
    const currentTime = Date.now();
    const timeSinceLastAttack = currentTime - player.lastAttackTime;

    if (this.isInDamageFrame(timeSinceLastAttack)) {
      this.setDamageFrame(player);
      this.checkForBlockHits(player, sessionId);
    } else {
      player.attackDamageFrameX = undefined;
      player.attackDamageFrameY = undefined;
      player.blocksHit = [];
    }

    const isInAttackFrame = timeSinceLastAttack < ATTACK_COOLDOWN;
    // if the player is mid-attack, don't process any more inputs
    if (isInAttackFrame) {
      return;
    } else if (input.attack) {
      player.isAttacking = true;
      player.attackCount++;
      player.lastAttackTime = currentTime;
    } else {
      player.isAttacking = false;
    }
  }

  /** Check if the player is in the damage frame of the attack animation */
  private isInDamageFrame(timeSinceLastAttack: number) {
    return (
      timeSinceLastAttack >= ATTACK_DAMAGE__DELAY &&
      timeSinceLastAttack < ATTACK_DAMAGE__DELAY + ATTACK_DAMAGE__FRAME_TIME
    );
  }

  /** Calculate and set the damage frame */
  private setDamageFrame(player: Player) {
    player.attackDamageFrameX = player.isFacingRight
      ? player.x + ATTACK_OFFSET_X
      : player.x - ATTACK_OFFSET_X;
    player.attackDamageFrameY = player.y - ATTACK_OFFSET_Y;
  }

  /** Check if the damage frame hit a block and, if needed, update the state for blocks and player inventory */
  private checkForBlockHits(player: Player, sessionId: string) {
    const visibleBlocks = this.room.blockMap.clientVisibleBlocks.get(sessionId);
    if (!visibleBlocks) return;

    for (const blockId of visibleBlocks) {
      const block = this.room.state.blocks[blockId];
      if (
        block.type !== 'empty' &&
        !player.blocksHit.includes(block.id) &&
        checkAABBCollision(
          {
            x: block.x,
            y: block.y,
            ...BLOCK_SIZE,
          },
          {
            x: player.attackDamageFrameX,
            y: player.attackDamageFrameY,
            ...ATTACK_SIZE,
          }
        )
      ) {
        player.blocksHit.push(block.id);

        block.hp--;
        if (block.hp <= 0) {
          if (block.type === 'iron' || block.type === 'gold') {
            player.inventory[block.type]++;
          }
          block.hp = 0;
          block.maxHp = 0;
          block.type = 'empty';
        }
      }
    }
  }
}
