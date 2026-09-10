import * as Phaser from 'phaser';
import { CustomText } from './CustomText';
import { DEPTH } from '../constants';

const DEFAULT_RADIUS = 48;
const DEFAULT_FILL_COLOR = 0x22c55e;
const BACKGROUND_COLOR = 0x14141c;
const BORDER_COLOR = 0x14141c;
const BORDER_THICKNESS = 4;
const FILL_ANIMATION_DURATION = 300;

interface OrbDisplayOptions {
  radius?: number;
  fillColor?: number;
  label?: string;
}

/** A circular "liquid" gauge display */
export class OrbDisplay {
  private readonly radius: number;
  private x = 0;
  private y = 0;
  private fillColor: number;
  /** The target percent, set immediately via setPercent() */
  private percent = 0;
  /** The animated percent currently being rendered by drawFill(), chases `percent` via a tween */
  private displayPercent = 0;
  private lastRenderedPercent = -1;
  private background: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private percentText: CustomText;
  private labelText?: CustomText;

  constructor(
    private scene: Phaser.Scene,
    { radius = DEFAULT_RADIUS, fillColor = DEFAULT_FILL_COLOR, label }: OrbDisplayOptions = {}
  ) {
    this.radius = radius;
    this.fillColor = fillColor;

    this.background = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD_BACKGROUND);
    this.fill = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD_FOREGROUND);

    this.percentText = new CustomText(this.scene, 0, 0, '-%', {
      fontFamily: 'Tiny5',
      fontSize: 20,
      // fixedWidth keeps the text's width constant, preventing possible jitter
      fixedWidth: 70,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    if (label) {
      this.labelText = new CustomText(this.scene, 0, 0, label, {
        fontFamily: 'Tiny5',
        fontSize: 16,
        color: '#9ca3af',
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD_FOREGROUND);
    }

    this.drawBackground();
    this.drawFill();
  }

  public destroy() {
    this.scene.tweens.killTweensOf(this);
    this.background.destroy();
    this.fill.destroy();
    this.percentText.destroy();
    this.labelText?.destroy();
  }

  public setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;

    this.drawBackground();
    this.drawFill();
    this.percentText.setPosition(x, y);
    this.labelText?.setPosition(x, y - this.radius - 16);

    return this;
  }

  public setPercent(percent: number, fillColor?: number): this {
    this.percent = Phaser.Math.Clamp(percent, 0, 100);
    const rounded = Math.round(this.percent);

    if (rounded !== this.lastRenderedPercent) {
      if (fillColor !== undefined) {
        this.fillColor = fillColor;
      }
      this.lastRenderedPercent = rounded;
      this.percentText.setText(`${rounded}%`);
    }

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      displayPercent: this.percent,
      duration: FILL_ANIMATION_DURATION,
      ease: 'Sine.easeOut',
      onUpdate: () => this.drawFill(),
    });

    return this;
  }

  private drawBackground() {
    this.background.clear();
    this.background.fillStyle(BACKGROUND_COLOR, 1).fillCircle(this.x, this.y, this.radius);
    this.background.lineStyle(BORDER_THICKNESS, BORDER_COLOR, 1).strokeCircle(this.x, this.y, this.radius);
  }

  private drawFill() {
    this.fill.clear();
    if (this.displayPercent <= 0) return;

    const { x, y } = this;
    const r = this.radius;
    const fillHeight = Phaser.Math.Clamp((r * 2 * this.displayPercent) / 100, 0, r * 2);

    this.fill.fillStyle(this.fillColor, 0.9);

    // full orb, no need to compute a segment
    if (fillHeight >= r * 2) {
      this.fill.fillCircle(x, y, r);
      return;
    }

    // angle convention: 0 = +x axis, PI/2 = straight down (bottom of circle)
    const fillTop = y + r - fillHeight;
    const ratio = Phaser.Math.Clamp((fillTop - y) / r, -1, 1);
    const theta1 = Math.asin(ratio);
    const theta2 = Math.PI - theta1;

    const x1 = x + r * Math.cos(theta1);
    const x2 = x + r * Math.cos(theta2);

    this.fill.beginPath();
    this.fill.moveTo(x1, fillTop);
    this.fill.arc(x, y, r, theta1, theta2, false);
    this.fill.lineTo(x2, fillTop);
    this.fill.closePath();
    this.fill.fillPath();
  }
}
