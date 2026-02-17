import {
  ATTACK_SIZE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  ATTACK_COOLDOWN,
  ATTACK_DAMAGE__DELAY,
  ATTACK_DAMAGE__FRAME_TIME,
  BLOCK_SIZE,
  type InputPayload,
} from '@repo/core-game';
import type { GameRoom } from '../index';
import type { Player } from '../schemas/Player';

export class PlayerMining {
  constructor(private room: GameRoom) {}

  public handleInput(player: Player, input: InputPayload) {
    // Check if enough time has passed since last attack
    const currentTime = Date.now();
    const timeSinceLastAttack = currentTime - player.lastAttackTime;
    const canAttack = timeSinceLastAttack >= ATTACK_COOLDOWN;

    // find the damage frames in the attack animation
    if (
      timeSinceLastAttack >= ATTACK_DAMAGE__DELAY &&
      timeSinceLastAttack < ATTACK_DAMAGE__FRAME_TIME + ATTACK_DAMAGE__DELAY
    ) {
      // calculate the damage frame
      player.attackDamageFrameX = player.isFacingRight
        ? player.x + ATTACK_OFFSET_X
        : player.x - ATTACK_OFFSET_X;
      player.attackDamageFrameY = player.y - ATTACK_OFFSET_Y;

      // check if the attack hit a block
      for (const block of this.room.state.blocks) {
        if (
          block.type !== 'empty' &&
          !player.blocksHit.includes(block.id) &&
          block.x - BLOCK_SIZE.width / 2 < player.attackDamageFrameX + ATTACK_SIZE.width / 2 &&
          block.x + BLOCK_SIZE.width / 2 > player.attackDamageFrameX - ATTACK_SIZE.width / 2 &&
          block.y - BLOCK_SIZE.height / 2 < player.attackDamageFrameY + ATTACK_SIZE.height / 2 &&
          block.y + BLOCK_SIZE.height / 2 > player.attackDamageFrameY - ATTACK_SIZE.height / 2
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
    } else {
      player.attackDamageFrameX = undefined;
      player.attackDamageFrameY = undefined;
      player.blocksHit = [];
    }

    // if the player is mid-attack, don't process any more inputs
    if (!canAttack) {
      return;
    } else if (input.attack) {
      player.isAttacking = true;
      player.attackCount++;
      player.lastAttackTime = currentTime;
    } else {
      player.isAttacking = false;
    }
  }
}
