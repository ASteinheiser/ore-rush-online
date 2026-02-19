import { MAP_SIZE } from '@repo/core-game';
import { CustomText } from '../objects/CustomText';
import { FogOverlay } from '../objects/FogOverlay';
import { FpsDisplay } from '../objects/FpsDisplay';
import { PingDisplay } from '../objects/PingDisplay';
import { ASSET } from '../constants';
import type { Game } from '../scenes/Game';

export class UISystem {
  private leaveText: CustomText;
  public ironCountText: CustomText;
  public goldCountText: CustomText;
  public fogOverlay: FogOverlay;
  public fpsDisplay: FpsDisplay;
  public pingDisplay: PingDisplay;

  constructor(private scene: Game) {
    // set the camera bounds to the map size
    this.scene.cameras.main.setBackgroundColor(0x00ff00).setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);

    // draw a border around the map area
    this.scene.add
      .rectangle(0, 0, MAP_SIZE.width, MAP_SIZE.height)
      .setOrigin(0, 0)
      .setDepth(100)
      .setStrokeStyle(8, 0x990099);

    // set the background image to cover the entire map area
    this.scene.add
      .image(0, 0, ASSET.BACKGROUND)
      .setAlpha(0.5)
      .setOrigin(0.5)
      .setPosition(MAP_SIZE.width / 2, MAP_SIZE.height / 2)
      .setDisplaySize(MAP_SIZE.width, MAP_SIZE.height);

    this.leaveText = new CustomText(this.scene, 0, 0, 'Press Shift to leave the game', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.ironCountText = new CustomText(this.scene, 0, 0, 'Iron: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.goldCountText = new CustomText(this.scene, 0, 0, 'Gold: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    const layout = () => {
      const { width } = this.scene.scale;
      this.leaveText?.setPosition((width - this.leaveText.width) / 2, 20);
      this.ironCountText?.setPosition(20, 20);
      this.goldCountText?.setPosition(20, 40);
    };

    layout();
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });

    this.fogOverlay = new FogOverlay(this.scene);
    this.fpsDisplay = new FpsDisplay(this.scene);
    this.pingDisplay = new PingDisplay(this.scene);
  }

  public destroy() {
    this.fogOverlay.destroy();
    this.leaveText.destroy();
    this.ironCountText.destroy();
    this.goldCountText.destroy();
    this.fpsDisplay.destroy();
    this.pingDisplay.destroy();
  }
}
