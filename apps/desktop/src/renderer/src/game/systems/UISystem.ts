import * as Phaser from 'phaser';
import {
  type Inventory,
  MAP_SIZE,
  calculatePercentage,
  calculateInventoryWeight,
  isInExtractionZone,
} from '@repo/core-game';
import { CustomText } from '../objects/CustomText';
import { FogOverlay } from '../objects/FogOverlay';
import { FpsDisplay } from '../objects/FpsDisplay';
import { PingDisplay } from '../objects/PingDisplay';
import { StarBackground } from '../objects/StarBackground';
import { DEPTH } from '../constants';
import type { Game } from '../scenes/Game';

export interface InventorySnapshot {
  coal: number;
  iron: number;
  copper: number;
}

export class UISystem {
  public fogOverlay: FogOverlay;
  public fpsDisplay: FpsDisplay;
  public pingDisplay: PingDisplay;
  public starBackground: StarBackground;
  private fuelText: CustomText;
  private capacityText: CustomText;
  private coalCountText: CustomText;
  private ironCountText: CustomText;
  private copperCountText: CustomText;
  private extractText: CustomText;
  private remotePlayerList: CustomText;
  private inventorySnapshot?: InventorySnapshot;

  constructor(private scene: Game) {
    // set the camera bounds to the map size
    this.scene.cameras.main.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);

    // space backdrop behind everything, fixed to the screen since the map is much bigger than the window
    this.starBackground = new StarBackground(this.scene, {
      gradientTop: 0x160a1e,
      gradientBottom: 0x000000,
      fixedToCamera: true,
    });

    this.fuelText = new CustomText(this.scene, 0, 0, 'Fuel: -%', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    this.capacityText = new CustomText(this.scene, 0, 0, 'Weight: -%', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    this.coalCountText = new CustomText(this.scene, 0, 0, 'Coal: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    this.ironCountText = new CustomText(this.scene, 0, 0, 'Iron: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    this.copperCountText = new CustomText(this.scene, 0, 0, 'Copper: 0', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    this.extractText = new CustomText(this.scene, 0, 0, 'Press <SHIFT> to extract', {
      fontFamily: 'Tiny5',
      fontSize: 20,
      color: '#007bff',
    })
      .setScrollFactor(0)
      .setAlpha(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    this.remotePlayerList = new CustomText(this.scene, 0, 0, 'no signals detected', {
      fontFamily: 'Tiny5',
      fontSize: 20,
      align: 'right',
    })
      .setScrollFactor(0)
      .setOrigin(1, 0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    const layout = () => {
      const { width, height } = this.scene.scale;
      this.starBackground?.resize(width, height);
      this.fuelText?.setPosition(20, 10);
      this.capacityText?.setPosition(20, 30);
      this.coalCountText?.setPosition(20, 60);
      this.ironCountText?.setPosition(20, 80);
      this.copperCountText?.setPosition(20, 100);
      this.extractText?.setPosition(20, 130);
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
    this.starBackground.destroy();
    this.fuelText.destroy();
    this.capacityText.destroy();
    this.coalCountText.destroy();
    this.ironCountText.destroy();
    this.copperCountText.destroy();
    this.extractText.destroy();
    this.remotePlayerList.destroy();
    this.inventorySnapshot = undefined;
  }

  public getInventorySnapshot() {
    return this.inventorySnapshot;
  }

  public updateInventory(inventory: Inventory) {
    this.inventorySnapshot = {
      coal: inventory.coal,
      iron: inventory.iron,
      copper: inventory.copper,
    };

    const usedCapacity = calculateInventoryWeight(inventory);
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

    const playerEntity = this.scene.playerSystem.currentPlayer?.entity;
    // show extract help text once player has items and is within extraction zone
    if (usedCapacity > 0 && playerEntity && isInExtractionZone(playerEntity)) {
      this.extractText.fadeIn(150);
    } else if (this.extractText.visible) {
      this.extractText.fadeOut(150);
    }
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
