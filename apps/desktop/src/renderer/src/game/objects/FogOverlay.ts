import { MAP_SIZE, PLAYER_VIEW_RADIUS } from '@repo/core-game';
import type { Player } from './Player';

export class FogOverlay {
  fogOverlay?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.fogOverlay = scene.add.graphics().setDepth(100).setScrollFactor(1);
  }

  public update(playerToFollow?: Player): void {
    if (!playerToFollow || !this.fogOverlay) return;

    const { x, y } = playerToFollow.entity;
    const innerX = x - PLAYER_VIEW_RADIUS;
    const innerY = y - PLAYER_VIEW_RADIUS;
    const holeSize = PLAYER_VIEW_RADIUS * 2;

    this.fogOverlay.clear();
    this.fogOverlay.fillStyle(0x000000, 1);

    // Left
    this.fogOverlay.fillRect(0, innerY, innerX, holeSize);
    // Top
    this.fogOverlay.fillRect(0, 0, MAP_SIZE.width, innerY);
    // Right
    this.fogOverlay.fillRect(innerX + holeSize, innerY, MAP_SIZE.width - innerX - holeSize, holeSize);
    // Bottom
    this.fogOverlay.fillRect(0, innerY + holeSize, MAP_SIZE.width, MAP_SIZE.height - innerY - holeSize);
  }

  destroy() {
    this.fogOverlay?.destroy();
  }
}
