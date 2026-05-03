import type * as Phaser from 'phaser';
import { type EntityPosition, MAP_SIZE, PLAYER_VIEW_RADIUS } from '@repo/core-game';

// FOG_RADIUS should be slightly smaller than the actual view radius to account for the server sending updated block state
// this isn't a silver bullet, players with bad ping will still experience laggy block rendering
const FOG_RADIUS = PLAYER_VIEW_RADIUS - 50;

export class FogOverlay {
  private fogOverlay: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.fogOverlay = scene.add.graphics().setDepth(102).setScrollFactor(1);
  }

  public destroy() {
    this.fogOverlay.destroy();
  }

  public update({ x, y }: EntityPosition): void {
    const innerX = x - FOG_RADIUS;
    const innerY = y - FOG_RADIUS;
    const holeSize = FOG_RADIUS * 2;

    this.fogOverlay.clear();
    this.fogOverlay.fillStyle(0x000000, 1);

    this.fogOverlay
      .fillRect(0, innerY, innerX, holeSize) // Left
      .fillRect(0, 0, MAP_SIZE.width, innerY) // Top
      .fillRect(innerX + holeSize, innerY, MAP_SIZE.width - innerX - holeSize, holeSize) // Right
      .fillRect(0, innerY + holeSize, MAP_SIZE.width, MAP_SIZE.height - innerY - holeSize); // Bottom
  }
}
