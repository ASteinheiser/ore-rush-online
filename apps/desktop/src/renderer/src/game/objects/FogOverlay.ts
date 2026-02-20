import { type EntityPosition, MAP_SIZE, PLAYER_VIEW_RADIUS } from '@repo/core-game';

export class FogOverlay {
  private fogOverlay: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.fogOverlay = scene.add.graphics().setDepth(102).setScrollFactor(1);
  }

  public destroy() {
    this.fogOverlay.destroy();
  }

  public update({ x, y }: EntityPosition): void {
    const innerX = x - PLAYER_VIEW_RADIUS;
    const innerY = y - PLAYER_VIEW_RADIUS;
    const holeSize = PLAYER_VIEW_RADIUS * 2;

    this.fogOverlay.clear();
    this.fogOverlay.fillStyle(0x000000, 1);

    this.fogOverlay
      .fillRect(0, innerY, innerX, holeSize) // Left
      .fillRect(0, 0, MAP_SIZE.width, innerY) // Top
      .fillRect(innerX + holeSize, innerY, MAP_SIZE.width - innerX - holeSize, holeSize) // Right
      .fillRect(0, innerY + holeSize, MAP_SIZE.width, MAP_SIZE.height - innerY - holeSize); // Bottom
  }
}
