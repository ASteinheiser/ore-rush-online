import type { EntityPosition } from '@repo/core-game';
import { ASSET, SOUND } from '../constants';
import { CustomText } from './CustomText';

interface MoveIntent extends EntityPosition {
  delta: number;
  isMoving: boolean;
  isMovingX: boolean;
  isMovingY: boolean;
  isGrounded: boolean;
}

export const PLAYER_ANIM = {
  IDLE: 'playerIdle',
  ROLL: 'playerRoll',
  FLY: 'playerFly',
  DRILL_LEFT: 'playerDrillLeft',
  DRILL_RIGHT: 'playerDrillRight',
  DRILL_DOWN: 'playerDrillDown',
};

export class Player {
  public entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public nameText: CustomText;
  public debugBox?: Phaser.GameObjects.Rectangle;
  private punchSfx: Phaser.Sound.BaseSound;
  /** Handles delaying the idle animation to prevent flickering on high FPS */
  private idleAccumulator = 0;
  private displayedMoving = false;
  private static readonly IDLE_BUFFER_MS = 50;

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

  public move({ x, y, delta, isMoving, isGrounded }: MoveIntent) {
    // Asymmetric buffer: switch to ROLL/FLY immediately, delay switching to IDLE
    if (isMoving) {
      this.idleAccumulator = 0;
      this.displayedMoving = true;
    } else {
      this.idleAccumulator += delta;
      if (this.idleAccumulator >= Player.IDLE_BUFFER_MS) {
        this.idleAccumulator = 0;
        this.displayedMoving = false;
      }
    }

    this.entity.x = x;
    this.entity.y = y;
    this.nameText.x = x;
    this.nameText.y = y;

    if (!this.displayedMoving && isGrounded && !this.isDrilling()) {
      this.entity.play(PLAYER_ANIM.IDLE);
    }
    if (this.displayedMoving && isGrounded && !(this.isRolling() || this.isDrilling())) {
      this.entity.play(PLAYER_ANIM.ROLL);
    }
    if (!isGrounded && !this.isFlying()) {
      this.entity.play(PLAYER_ANIM.FLY);
    }
  }

  public startDrilling(direction: 'left' | 'right' | 'down') {
    if (this.isDrilling()) return;

    switch (direction) {
      case 'left':
        this.entity.anims.play(PLAYER_ANIM.DRILL_LEFT);
        break;
      case 'right':
        this.entity.anims.play(PLAYER_ANIM.DRILL_RIGHT);
        break;
      case 'down':
        this.entity.anims.play(PLAYER_ANIM.DRILL_DOWN);
        break;
      default:
    }
  }

  public stopDrilling() {
    if (!this.isDrilling()) return;

    this.entity.anims.stop();
  }

  private isRolling() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.ROLL;
  }

  private isFlying() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.FLY;
  }

  private isDrilling() {
    return (
      this.entity.anims.isPlaying &&
      (this.entity.anims.currentAnim?.key === PLAYER_ANIM.DRILL_LEFT ||
        this.entity.anims.currentAnim?.key === PLAYER_ANIM.DRILL_RIGHT ||
        this.entity.anims.currentAnim?.key === PLAYER_ANIM.DRILL_DOWN)
    );
  }
}
