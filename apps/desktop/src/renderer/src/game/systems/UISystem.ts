import * as Phaser from 'phaser';
import { calculatePercentage, MAP_SIZE, type Inventory } from '@repo/core-game';
import { CustomText } from '../objects/CustomText';
import { FogOverlay } from '../objects/FogOverlay';
import { FpsDisplay } from '../objects/FpsDisplay';
import { PingDisplay } from '../objects/PingDisplay';
import { ASSET } from '../constants';
import type { Game } from '../scenes/Game';

export class UISystem {
  public fogOverlay: FogOverlay;
  public fpsDisplay: FpsDisplay;
  public pingDisplay: PingDisplay;
  private mapBorder: Phaser.GameObjects.Rectangle;
  private mapBackground: Phaser.GameObjects.Image;
  private leaveText: CustomText;
  private fuelText: CustomText;
  private capacityText: CustomText;
  private coalCountText: CustomText;
  private ironCountText: CustomText;
  private copperCountText: CustomText;
  private remotePlayerList: CustomText;

  constructor(private scene: Game) {
    // set the camera bounds to the map size
    this.scene.cameras.main.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);

    // draw a border around the map area
    this.mapBorder = this.scene.add
      .rectangle(0, 0, MAP_SIZE.width, MAP_SIZE.height)
      .setOrigin(0, 0)
      .setDepth(100)
      .setStrokeStyle(8, 0x990099);

    // set the background image to cover the entire map area
    this.mapBackground = this.scene.add
      .image(0, 0, ASSET.BACKGROUND)
      .setAlpha(0)
      .setOrigin(0.5)
      .setPosition(MAP_SIZE.width / 2, MAP_SIZE.height / 2)
      .setDisplaySize(MAP_SIZE.width, MAP_SIZE.height);

    this.leaveText = new CustomText(this.scene, 0, 0, 'Press Shift to leave the game', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.fuelText = new CustomText(this.scene, 0, 0, 'Fuel: -%', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.capacityText = new CustomText(this.scene, 0, 0, 'Weight: -%', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.coalCountText = new CustomText(this.scene, 0, 0, 'Coal: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.ironCountText = new CustomText(this.scene, 0, 0, 'Iron: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.copperCountText = new CustomText(this.scene, 0, 0, 'Copper: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).setScrollFactor(0);

    this.remotePlayerList = new CustomText(this.scene, 0, 0, 'no signals detected', {
      fontFamily: 'Tiny5',
      fontSize: 20,
      align: 'right',
    })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    const layout = () => {
      const { width } = this.scene.scale;
      this.leaveText?.setPosition((width - this.leaveText.width) / 2, 20);
      this.fuelText?.setPosition(20, 10);
      this.capacityText?.setPosition(20, 30);
      this.coalCountText?.setPosition(20, 60);
      this.ironCountText?.setPosition(20, 80);
      this.copperCountText?.setPosition(20, 100);
      this.remotePlayerList?.setPosition(width - 16, 100);
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
    this.fpsDisplay.destroy();
    this.pingDisplay.destroy();
    this.mapBorder.destroy();
    this.mapBackground.destroy();
    this.leaveText.destroy();
    this.fuelText.destroy();
    this.capacityText.destroy();
    this.coalCountText.destroy();
    this.ironCountText.destroy();
    this.copperCountText.destroy();
    this.remotePlayerList.destroy();
  }

  public updateInventory(inventory: Inventory) {
    const usedCapacity = inventory.coal + inventory.iron + inventory.copper;
    const capacityPercent = calculatePercentage(usedCapacity, inventory.capacity);
    if (capacityPercent > 70) {
      this.capacityText.setColor('#ef4444');
    } else if (capacityPercent > 30) {
      this.capacityText.setColor('#eab308');
    } else {
      this.capacityText.setColor('#22c55e');
    }

    this.capacityText.setText(`Weight: ${capacityPercent}%`);
    this.coalCountText.setText(`Coal: ${inventory.coal}`);
    this.ironCountText.setText(`Iron: ${inventory.iron}`);
    this.copperCountText.setText(`Copper: ${inventory.copper}`);
  }

  public updateFuel(current: number, total: number) {
    const fuelPercent = calculatePercentage(current, total);
    if (fuelPercent > 70) {
      this.fuelText.setColor('#22c55e');
    } else if (fuelPercent > 30) {
      this.fuelText.setColor('#eab308');
    } else {
      this.fuelText.setColor('#ef4444');
    }

    this.fuelText.setText(`Fuel: ${fuelPercent}%`);
  }

  public updateRemotePlayerList() {
    const room = this.scene.roomSystem.room;
    if (!room) return;

    const usernames: string[] = [];
    room.state.players.forEach((player, sessionId) => {
      if (sessionId === room.sessionId) return;
      usernames.push(player.username);
    });

    if (usernames.length === 0) {
      this.remotePlayerList.setText(['no signals detected', 'you are alone...']);
      return;
    }

    this.remotePlayerList.setText(['active signals:', ...usernames]);
  }
}
