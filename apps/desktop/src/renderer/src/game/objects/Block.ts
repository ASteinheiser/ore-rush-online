import { BLOCK_SIZE, BLOCK_TYPES, type BLOCK_TYPE } from '@repo/core-game';

const DIRT_COLOR = 0x8b4513;
const IRON_COLOR = 0xa19d94;
const GOLD_COLOR = 0xffd700;

const CRACK_COLOR = 0x1a1a1a;
const MAX_CRACKS = 12;
const CRACK_STROKE = 1.5;

/** Deterministic pseudo-random in [0, 1] from a seed */
const seeded = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

export class Block {
  private hitbox: Phaser.GameObjects.Rectangle;
  private ore: Phaser.GameObjects.Graphics;
  private cracks: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    public readonly x: number,
    public readonly y: number,
    type: BLOCK_TYPE,
    hp: number,
    maxHp: number
  ) {
    this.hitbox = scene.add.rectangle(this.x, this.y, BLOCK_SIZE.width, BLOCK_SIZE.height);
    this.ore = scene.add.graphics().setDepth(1);
    this.cracks = scene.add.graphics().setDepth(99);

    this.setColor(type);
    this.drawCracks(hp, maxHp);
  }

  public destroy() {
    this.cracks.destroy();
    this.ore.destroy();
    this.hitbox.destroy();
  }

  public update(hp: number, maxHp: number, type: BLOCK_TYPE) {
    this.setColor(type);
    this.drawCracks(hp, maxHp);
  }

  private setColor(type: BLOCK_TYPE) {
    this.hitbox.setStrokeStyle(1, DIRT_COLOR);
    this.hitbox.setFillStyle(DIRT_COLOR);
    this.ore.clear();

    switch (type) {
      case BLOCK_TYPES.IRON:
        this.drawOre(IRON_COLOR);
        break;
      case BLOCK_TYPES.GOLD:
        this.drawOre(GOLD_COLOR);
        break;
    }
  }

  private drawOre(color: number) {
    const w = BLOCK_SIZE.width;
    const h = BLOCK_SIZE.height;
    const left = this.x - w / 2;
    const top = this.y - h / 2;
    const seedBase = this.x * 11 + this.y * 17;

    const count = 4 + Math.floor(seeded(seedBase) * 4); // 4-7 ore pieces
    const pad = 4;

    for (let i = 0; i < count; i++) {
      const seed = seedBase + i * 37;
      const px = left + pad + seeded(seed + 1) * (w - pad * 2);
      const py = top + pad + seeded(seed + 2) * (h - pad * 2);
      const size = 3 + seeded(seed + 3) * 5; // 3-8px

      this.ore.fillStyle(color, 0.85);
      this.ore.fillRect(px - size / 2, py - size / 2, size, size);
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
