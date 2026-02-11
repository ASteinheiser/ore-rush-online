import { ENEMY_SIZE } from '@repo/core-game';

const CRACK_COLOR = 0x1a1a1a;
const MAX_CRACKS = 12;
const CRACK_STROKE = 1.5;

/** Deterministic pseudo-random in [0, 1) from a seed */
function seeded(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export class Ore {
  totalHp: number;
  hitbox: Phaser.GameObjects.Rectangle;
  cracks: Phaser.GameObjects.Graphics;
  x: number;
  y: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: 'iron' | 'gold' | 'destroyed',
    currentHp: number
  ) {
    this.x = x;
    this.y = y;
    this.totalHp = type === 'destroyed' ? 0 : type === 'iron' ? 2 : 4;

    this.hitbox = scene.add.rectangle(x, y, ENEMY_SIZE.width, ENEMY_SIZE.height);
    const color = type === 'iron' ? 0xa19d94 : type === 'gold' ? 0xffd700 : 0x000000;
    this.hitbox.setStrokeStyle(1, color);
    this.hitbox.setFillStyle(color);

    this.cracks = scene.add.graphics().setDepth(101);
    this.drawCracks(currentHp);
  }

  private drawCracks(hp: number) {
    this.cracks.clear();
    if (this.totalHp <= 0 || hp >= this.totalHp) return;

    const damageRatio = 1 - hp / this.totalHp;
    const count = Math.max(1, Math.floor(damageRatio * MAX_CRACKS));
    const w = ENEMY_SIZE.width;
    const h = ENEMY_SIZE.height;
    const left = this.x - w / 2;
    const top = this.y - h / 2;
    const seedBase = this.x * 7 + this.y * 13;

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

  update(hp: number, type: 'iron' | 'gold' | 'destroyed') {
    if (type === 'destroyed') {
      this.cracks.clear();
    } else {
      this.drawCracks(hp);
    }
    const color = type === 'iron' ? 0xa19d94 : type === 'gold' ? 0xffd700 : 0x000000;
    this.hitbox.setStrokeStyle(1, color);
    this.hitbox.setFillStyle(color);
  }

  destroy() {
    this.cracks.destroy();
    this.hitbox.destroy();
  }
}
