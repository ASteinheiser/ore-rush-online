import { ENEMY_SIZE } from '@repo/core-game';

const HP_BAR_HEIGHT = 10;
const HP_BAR_OFFSET_Y = 10;

export class Ore {
  totalHp: number;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFg: Phaser.GameObjects.Rectangle;
  hitbox: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: 'iron' | 'gold' | 'destroyed',
    currentHp: number
  ) {
    this.totalHp = type === 'destroyed' ? 0 : type === 'iron' ? 2 : 4;
    const barX = x - ENEMY_SIZE.width / 2;
    const barY = y - ENEMY_SIZE.height / 2 - HP_BAR_OFFSET_Y;
    this.hpBarBg = scene.add.rectangle(barX, barY, ENEMY_SIZE.width, HP_BAR_HEIGHT, 0x333333);
    this.hpBarBg.setOrigin(0, 0.5).setDepth(100);
    this.hpBarFg = scene.add.rectangle(
      barX,
      barY,
      ENEMY_SIZE.width * (currentHp / this.totalHp),
      HP_BAR_HEIGHT,
      0x00ff00
    );
    this.hpBarFg.setOrigin(0, 0.5).setDepth(100);

    if (type === 'destroyed') {
      this.hpBarBg.destroy();
      this.hpBarFg.destroy();
    }

    this.hitbox = scene.add.rectangle(x, y, ENEMY_SIZE.width, ENEMY_SIZE.height);
    const color = type === 'iron' ? 0xa19d94 : type === 'gold' ? 0xffd700 : 0x000000;
    this.hitbox.setStrokeStyle(1, color);
    this.hitbox.setFillStyle(color);
  }

  update(hp: number, type: 'iron' | 'gold' | 'destroyed') {
    this.hpBarFg.setSize(ENEMY_SIZE.width * (hp / this.totalHp), HP_BAR_HEIGHT);
    if (type === 'destroyed') {
      this.hpBarBg.destroy();
      this.hpBarFg.destroy();
    }
    const color = type === 'iron' ? 0xa19d94 : type === 'gold' ? 0xffd700 : 0x000000;
    this.hitbox.setStrokeStyle(1, color);
    this.hitbox.setFillStyle(color);
  }

  destroy() {
    this.hpBarBg.destroy();
    this.hpBarFg.destroy();
    this.hitbox.destroy();
  }
}
