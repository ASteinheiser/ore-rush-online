import { BLOCK_SIZE, BLOCK_TYPES, type BLOCK_TYPE } from '@repo/core-game';

const DIRT_COLOR = 0x8b4513;
const IRON_COLOR = 0xa19d94;
const GOLD_COLOR = 0xffd700;

const CRACK_COLOR = 0x1a1a1a;
const MAX_CRACKS = 12;
const CRACK_STROKE = 1.5;

export class Ore {
  hitbox: Phaser.GameObjects.Rectangle;
  cracks: Phaser.GameObjects.Graphics;
  x: number;
  y: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: BLOCK_TYPE, hp: number, maxHp: number) {
    this.x = x;
    this.y = y;

    this.hitbox = scene.add.rectangle(x, y, BLOCK_SIZE.width, BLOCK_SIZE.height);
    this.cracks = scene.add.graphics().setDepth(99);

    this.setColor(type);
    this.drawCracks(hp, maxHp);
  }

  destroy() {
    this.cracks.destroy();
    this.hitbox.destroy();
  }

  update(hp: number, maxHp: number, type: BLOCK_TYPE) {
    if (type === BLOCK_TYPES.EMPTY) {
      this.cracks.clear();
    } else {
      this.drawCracks(hp, maxHp);
    }
    this.setColor(type);
  }

  private setColor(type: BLOCK_TYPE) {
    switch (type) {
      case BLOCK_TYPES.DIRT:
        this.hitbox.setStrokeStyle(1, DIRT_COLOR);
        this.hitbox.setFillStyle(DIRT_COLOR);
        break;
      case BLOCK_TYPES.IRON:
        this.hitbox.setStrokeStyle(1, IRON_COLOR);
        this.hitbox.setFillStyle(IRON_COLOR);
        break;
      case BLOCK_TYPES.GOLD:
        this.hitbox.setStrokeStyle(1, GOLD_COLOR);
        this.hitbox.setFillStyle(GOLD_COLOR);
        break;
      case BLOCK_TYPES.EMPTY:
      default:
        this.hitbox.setStrokeStyle(1, 0x000000, 0);
        this.hitbox.setFillStyle(0x000000, 0);
        break;
    }
  }

  private drawCracks(hp: number, maxHp: number) {
    this.cracks.clear();
    if (maxHp <= 0 || hp >= maxHp) return;

    const damageRatio = 1 - hp / maxHp;
    const count = Math.max(1, Math.floor(damageRatio * MAX_CRACKS));
    const w = BLOCK_SIZE.width;
    const h = BLOCK_SIZE.height;
    const left = this.x - w / 2;
    const top = this.y - h / 2;
    const seedBase = this.x * 7 + this.y * 13;

    /** Deterministic pseudo-random in [0, 1] from a seed */
    const seeded = (seed: number): number => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const seed = seedBase + i * 31;
      const edge = Math.floor(seeded(seed) * 4);
      let px: number, py: number;
      if (edge === 0) {
        px = left + seeded(seed + 1) * w;
        py = top;
      } else if (edge === 1) {
        px = left + w;
        py = top + seeded(seed + 1) * h;
      } else if (edge === 2) {
        px = left + seeded(seed + 1) * w;
        py = top + h;
      } else {
        px = left;
        py = top + seeded(seed + 1) * h;
      }

      const segments = 2 + Math.floor(seeded(seed + 2) * 3);
      const lengthScale = 0.2 + damageRatio * 0.5;

      this.cracks.lineStyle(CRACK_STROKE, CRACK_COLOR, 0.9);
      this.cracks.beginPath();
      this.cracks.moveTo(px, py);

      let cx = px;
      let cy = py;
      for (let s = 0; s < segments; s++) {
        const angle = seeded(seed + 3 + s) * Math.PI * 0.8 - Math.PI * 0.4;
        const len = (w + h) * 0.15 * lengthScale * (0.7 + seeded(seed + 10 + s) * 0.6);
        cx += Math.cos(angle) * len;
        cy += Math.sin(angle) * len;
        cx = Phaser.Math.Clamp(cx, left + 2, left + w - 2);
        cy = Phaser.Math.Clamp(cy, top + 2, top + h - 2);
        this.cracks.lineTo(cx, cy);
      }
      this.cracks.strokePath();
    }
  }
}
