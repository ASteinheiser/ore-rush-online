import { type EntityPosition, type DRILL_DIRECTION, DRILL_DIRECTIONS } from '@repo/core-game';
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
      .setOrigin(0.5, 3)
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

  public setDrillDirection(direction: DRILL_DIRECTION) {
    switch (direction) {
      case DRILL_DIRECTIONS.LEFT:
        if (this.isDrillingLeft()) return;
        this.entity.anims.play(PLAYER_ANIM.DRILL_LEFT);
        break;
      case DRILL_DIRECTIONS.RIGHT:
        if (this.isDrillingRight()) return;
        this.entity.anims.play(PLAYER_ANIM.DRILL_RIGHT);
        break;
      case DRILL_DIRECTIONS.DOWN:
        if (this.isDrillingDown()) return;
        this.entity.anims.play(PLAYER_ANIM.DRILL_DOWN);
        break;
      case DRILL_DIRECTIONS.IDLE:
      default:
        if (this.isDrilling()) this.entity.anims.stop();
    }
  }

  private isRolling() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.ROLL;
  }

  private isFlying() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.FLY;
  }

  private isDrilling() {
    return this.isDrillingLeft() || this.isDrillingRight() || this.isDrillingDown();
  }

  private isDrillingLeft() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.DRILL_LEFT;
  }

  private isDrillingRight() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.DRILL_RIGHT;
  }

  private isDrillingDown() {
    return this.entity.anims.isPlaying && this.entity.anims.currentAnim?.key === PLAYER_ANIM.DRILL_DOWN;
  }
}
