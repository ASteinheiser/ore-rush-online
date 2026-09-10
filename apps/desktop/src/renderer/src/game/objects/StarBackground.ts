import * as Phaser from 'phaser';
import { DEPTH } from '../constants';

/** A twinkling background star, drawn as a small white diamond that slowly drifts upward */
interface Star {
  shape: Phaser.GameObjects.Rectangle;
  /** relative horizontal anchor (0-1) */
  xFrac: number;
  /** current absolute y position (px) */
  y: number;
  /** width/height of the diamond (px) */
  size: number;
  /** how fast this star drifts upward (px/s) */
  speed: number;
}

export const GRADIENT_TOP = 0x000000;
export const GRADIENT_BOTTOM = 0x1a051a;
const STAR_COUNT = 140;
/** Range of star sizes (px) */
const MIN_STAR_SIZE = 2;
const MAX_STAR_SIZE = 5;
/** Range of upward drift speed per star (px/s) */
const MIN_DRIFT_SPEED = 2;
const MAX_DRIFT_SPEED = 8;

/** A reusable "deep space" backdrop: a top-to-bottom gradient fill with a field of stars scattered across it. */
export class StarBackground {
  private initialized = false;
  private transitioning = false;
  private stars: Star[];
  private gradient: Phaser.GameObjects.Graphics;
  private gradientTop: number;
  private gradientBottom: number;
  private width = 0;
  private height = 0;

  constructor(private scene: Phaser.Scene) {
    this.gradientTop = GRADIENT_TOP;
    this.gradientBottom = GRADIENT_BOTTOM;
    this.gradient = scene.add.graphics().setDepth(DEPTH.BACKGROUND).setScrollFactor(0);

    this.stars = Array.from({ length: STAR_COUNT }, () => this.createStar());
  }

  public destroy() {
    this.gradient.destroy();
    this.stars.forEach((star) => star.shape.destroy());
    this.stars = [];
  }

  /** Redraws the gradient and repositions stars to fit the given dimensions */
  public resize(width: number, height: number) {
    const previousHeight = this.height;
    this.width = width;
    this.height = height;

    this.redrawGradient();

    this.stars.forEach((star) => {
      if (!this.initialized) {
        star.y = Phaser.Math.Between(0, height);
      } else if (previousHeight > 0 && previousHeight !== height) {
        // handle screen resize by redrawing the star at the new height
        star.y = (star.y / previousHeight) * height;
      }
      star.shape.setPosition(width * star.xFrac, star.y);
    });

    this.initialized = true;
  }

  /** Drifts stars slowly upward, wrapping back to the bottom when they fully exit the top */
  public update(delta: number) {
    if (!this.initialized || this.transitioning) return;

    this.stars.forEach((star) => {
      star.y -= star.speed * (delta / 1000);

      if (star.y + star.size < 0) {
        star.y = this.height + star.size;
        star.xFrac = Math.random();
        star.shape.x = this.width * star.xFrac;
      }

      star.shape.y = star.y;
    });
  }

  /** Recolors the gradient to `top`/`bottom`, sliding a second gradient+star sheet in from `direction` when `duration` is given. Instant when `duration` is 0 */
  public async setGradientColors(top: number, bottom: number, direction: 'up' | 'down' = 'up', duration = 0) {
    const unchanged = top === this.gradientTop && bottom === this.gradientBottom;

    if (duration <= 0 || unchanged) {
      this.gradientTop = top;
      this.gradientBottom = bottom;
      this.redrawGradient();
      return;
    }

    // the incoming sheet starts a full screen-height off-screen, in the opposite direction it'll travel
    const delta = direction === 'up' ? -this.height : this.height;
    const incomingGradient = this.createGradientGraphic(top, bottom);
    const incomingStars = this.createStarField();
    [incomingGradient, ...incomingStars.map((star) => star.shape)].forEach((object) => {
      object.y -= delta;
    });

    const outgoingGradient = this.gradient;
    const outgoingStars = this.stars;

    this.transitioning = true;

    await new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: [
          outgoingGradient,
          incomingGradient,
          ...outgoingStars.map((star) => star.shape),
          ...incomingStars.map((star) => star.shape),
        ],
        y: (_target: unknown, _key: string, value: number) => value + delta,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => resolve(),
      });
    });

    this.transitioning = false;
    outgoingGradient.destroy();
    outgoingStars.forEach((star) => star.shape.destroy());

    this.gradient = incomingGradient;
    this.gradientTop = top;
    this.gradientBottom = bottom;
    this.stars = incomingStars;
  }

  /** Fills the background gradient using the current gradient colors */
  private redrawGradient() {
    this.fillGradientRect(this.gradient, this.gradientTop, this.gradientBottom);
  }

  /** Creates a standalone gradient rect the size of the screen, used to animate `setGradientColors` */
  private createGradientGraphic(top: number, bottom: number) {
    const graphic = this.scene.add.graphics().setDepth(DEPTH.BACKGROUND).setScrollFactor(0);
    this.fillGradientRect(graphic, top, bottom);
    return graphic;
  }

  /** Creates a full field of stars scattered across the current screen dimensions */
  private createStarField(): Star[] {
    return Array.from({ length: STAR_COUNT }, () => {
      const star = this.createStar();
      star.y = Phaser.Math.Between(0, this.height);
      star.shape.setPosition(this.width * star.xFrac, star.y);
      return star;
    });
  }

  private fillGradientRect(graphic: Phaser.GameObjects.Graphics, top: number, bottom: number) {
    graphic.clear();
    graphic.fillGradientStyle(top, top, bottom, bottom, 1);
    graphic.fillRect(0, 0, this.width, this.height);
  }

  /** Creates a single star, drawn as a small white diamond at a random size and "twinkle" rate */
  private createStar(): Star {
    const size = Phaser.Math.Between(MIN_STAR_SIZE, MAX_STAR_SIZE);
    const baseAlpha = Phaser.Math.FloatBetween(0.3, 0.9);

    const shape = this.scene.add
      .rectangle(0, 0, size, size, 0xffffff, baseAlpha)
      .setAlpha(baseAlpha)
      .setRotation(Math.PI / 4)
      .setDepth(DEPTH.BACKGROUND_STARS)
      .setScrollFactor(1);

    this.scene.tweens.add({
      targets: shape,
      alpha: { from: baseAlpha, to: Phaser.Math.FloatBetween(0.1, 0.3) },
      duration: Phaser.Math.Between(1000, 3000),
      delay: Phaser.Math.Between(0, 2000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return {
      shape,
      xFrac: Math.random(),
      y: 0,
      size,
      speed: Phaser.Math.FloatBetween(MIN_DRIFT_SPEED, MAX_DRIFT_SPEED),
    };
  }
}
