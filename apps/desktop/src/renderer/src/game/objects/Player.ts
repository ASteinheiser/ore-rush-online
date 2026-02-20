import { ATTACK_DAMAGE__DELAY, type EntityPosition } from '@repo/core-game';
import { ASSET, SOUND } from '../constants';
import { CustomText } from './CustomText';

/** Used to handle slight differences in player position due to interpolation of server values */
const MOVEMENT_THRESHOLD = 0.1;

export const PLAYER_ANIM = {
  IDLE: 'playerIdle',
  WALK: 'playerWalk',
  PUNCH: 'playerPunch',
};

export class Player {
  public entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public nameText: CustomText;
  public debugBox?: Phaser.GameObjects.Rectangle;
  private punchSfx: Phaser.Sound.BaseSound;

  constructor(
    private scene: Phaser.Scene,
    username: string,
    x: number,
    y: number
  ) {
    this.entity = scene.physics.add.sprite(x, y, ASSET.PLAYER).setDepth(101);

    this.nameText = new CustomText(scene, x, y, username, {
      fontFamily: 'Tiny5',
      fontSize: 12,
    })
      .setOrigin(0.5, 2.75)
      .setDepth(101);

    this.punchSfx = scene.sound.add(SOUND.PUNCH);
  }

  public createDebugBox() {
    this.debugBox = this.scene.add
      .rectangle(this.entity.x, this.entity.y, this.entity.width, this.entity.height)
      .setDepth(101)
      .setStrokeStyle(1, 0xff0000);
  }

  public destroy() {
    this.entity.destroy();
    this.nameText.destroy();
    this.punchSfx.destroy();
    this.debugBox?.destroy();
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
