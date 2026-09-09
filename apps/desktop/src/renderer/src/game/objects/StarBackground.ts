import * as Phaser from 'phaser';

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

interface StarBackgroundConfig {
  /** When `false`, no stars are created and only the gradient fill is shown. Defaults to `true` */
  showStars?: boolean;
  /** Number of stars scattered across the background */
  starCount?: number;
  /** Gradient color at the top of the screen */
  gradientTop?: number;
  /** Gradient color at the bottom of the screen */
  gradientBottom?: number;
  /** When `true`, the backdrop stays fixed to the camera/screen instead of scrolling with the world. Defaults to `false` */
  fixedToCamera?: boolean;
}

const DEFAULT_GRADIENT_TOP = 0x000000;
const DEFAULT_GRADIENT_BOTTOM = 0x1a051a;
const DEFAULT_STAR_COUNT = 140;
/** Range of star sizes (px) */
const MIN_STAR_SIZE = 2;
const MAX_STAR_SIZE = 5;
/** Range of upward drift speed per star (px/s) */
const MIN_DRIFT_SPEED = 2;
const MAX_DRIFT_SPEED = 8;

/** A reusable "deep space" backdrop: a top-to-bottom gradient fill with a field of stars scattered across it. */
export class StarBackground {
  private initialized = false;
  private stars: Star[];
  private gradient: Phaser.GameObjects.Graphics;
  private gradientTop: number;
  private gradientBottom: number;
  private width = 0;
  private height = 0;
  private fixedToCamera: boolean;

  constructor(
    private scene: Phaser.Scene,
    {
      showStars = true,
      starCount = DEFAULT_STAR_COUNT,
      gradientTop = DEFAULT_GRADIENT_TOP,
      gradientBottom = DEFAULT_GRADIENT_BOTTOM,
      fixedToCamera = false,
    }: StarBackgroundConfig = {}
  ) {
    this.gradientTop = gradientTop;
    this.gradientBottom = gradientBottom;
    this.fixedToCamera = fixedToCamera;

    this.gradient = scene.add
      .graphics()
      .setDepth(-2)
      .setScrollFactor(fixedToCamera ? 0 : 1);

    this.stars = showStars ? Array.from({ length: starCount }, () => this.createStar()) : [];
  }

  public destroy() {
    this.gradient.destroy();
    this.stars.forEach((star) => star.shape.destroy());
    this.stars = [];
  }

  /** Redraws the gradient and repositions stars to fit the given dimensions */
  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.gradient.clear();
    this.gradient.fillGradientStyle(
      this.gradientTop,
      this.gradientTop,
      this.gradientBottom,
      this.gradientBottom,
      1
    );
    this.gradient.fillRect(0, 0, width, height);

    this.stars.forEach((star) => {
      if (!this.initialized) {
        star.y = Phaser.Math.Between(0, height);
      }
      star.shape.setPosition(width * star.xFrac, star.y);
    });

    this.initialized = true;
  }

  /** Drifts stars slowly upward, wrapping back to the bottom when they fully exit the top */
  public update(delta: number) {
    if (!this.initialized) return;

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

  /** Creates a single star, drawn as a small white diamond at a random size and "twinkle" rate */
  private createStar(): Star {
    const size = Phaser.Math.Between(MIN_STAR_SIZE, MAX_STAR_SIZE);
    const baseAlpha = Phaser.Math.FloatBetween(0.3, 0.9);

    const shape = this.scene.add
      .rectangle(0, 0, size, size, 0xffffff, baseAlpha)
      .setAlpha(baseAlpha)
      .setRotation(Math.PI / 4)
      .setDepth(-1)
      .setScrollFactor(this.fixedToCamera ? 0 : 1);

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
