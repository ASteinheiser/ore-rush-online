import { ATTACK_DAMAGE__DELAY, type EntityPosition } from '@repo/core-game';
import { SOUND } from '../constants';

/** Used to handle slight differences in player position due to interpolation of server values */
const MOVEMENT_THRESHOLD = 0.1;

export const PLAYER_ANIM = {
  IDLE: 'playerIdle',
  WALK: 'playerWalk',
  PUNCH: 'playerPunch',
};

export class Player {
  private punchSfx: Phaser.Sound.BaseSound;

  constructor(
    scene: Phaser.Scene,
    public entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    public nameText: Phaser.GameObjects.Text
  ) {
    this.punchSfx = scene.sound.add(SOUND.PUNCH);
  }

  public destroy() {
    this.entity.destroy();
    this.nameText.destroy();
    this.punchSfx.destroy();
  }

  /** Force the player to move to a specific position, skips animations, interpolation, etc. */
  public forceMove({ x, y }: EntityPosition) {
    this.entity.x = x;
    this.entity.y = y;
    this.nameText.x = x;
    this.nameText.y = y;
  }

  public move({ x, y }: EntityPosition) {
    const isMovingX = Math.abs(this.entity.x - x) > MOVEMENT_THRESHOLD;
    const isMovingY = Math.abs(this.entity.y - y) > MOVEMENT_THRESHOLD;
    const isMoving = isMovingX || isMovingY;

    if (isMovingX) {
      this.entity.setFlipX(this.entity.x > x);
    }

    this.entity.x = x;
    this.entity.y = y;
    this.nameText.x = x;
    this.nameText.y = y;

    if (!isMoving && !this.isPunching()) {
      this.entity.play(PLAYER_ANIM.IDLE);
    }
    if (isMoving && !(this.isPunching() || this.isWalking())) {
      this.entity.play(PLAYER_ANIM.WALK);
    }
  }

  public punch() {
    if (this.isPunching()) return;

    this.entity.anims.play(PLAYER_ANIM.PUNCH);
    this.punchSfx.play('', { delay: ATTACK_DAMAGE__DELAY / 1000 });
  }

  public stopPunch() {
    if (!this.isPunching()) return;
    this.entity.anims.stop();
  }

  private isPunching() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.PUNCH;
  }

  private isWalking() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.WALK;
  }
}
