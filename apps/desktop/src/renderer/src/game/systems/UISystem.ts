import * as Phaser from 'phaser';
import {
  type Inventory,
  MAP_SIZE,
  calculatePercentage,
  calculateInventoryWeight,
  isInExtractionZone,
} from '@repo/core-game';
import { CustomText } from '../objects/CustomText';
import { StarBackground } from '../objects/StarBackground';
import { FogOverlay } from '../objects/FogOverlay';
import { FpsDisplay } from '../objects/FpsDisplay';
import { PingDisplay } from '../objects/PingDisplay';
import { OrbDisplay } from '../objects/OrbDisplay';
import { DEPTH } from '../constants';
import type { Game } from '../scenes/Game';

const ORB_RADIUS = 100;
const ORB_MARGIN = 24;

export interface InventorySnapshot {
  coal: number;
  iron: number;
  copper: number;
}

export class UISystem {
  public starBackground: StarBackground;
  public fogOverlay: FogOverlay;
  public fpsDisplay: FpsDisplay;
  public pingDisplay: PingDisplay;
  private remotePlayerList: CustomText;
  private extractText: CustomText;
  private fuelOrb: OrbDisplay;
  private inventoryOrb: OrbDisplay;
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

    this.fuelOrb = new OrbDisplay(this.scene, {
      radius: ORB_RADIUS,
      fillColor: 0x3b82f6,
      label: 'FUEL',
    });

    this.inventoryOrb = new OrbDisplay(this.scene, {
      radius: ORB_RADIUS,
      fillColor: 0x22c55e,
      label: 'WEIGHT',
    });

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
      align: 'left',
    })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD_FOREGROUND);

    const layout = () => {
      const { width, height } = this.scene.scale;
      this.starBackground?.resize(width, height);
      this.fuelOrb?.setPosition(ORB_MARGIN + ORB_RADIUS, height - ORB_MARGIN - ORB_RADIUS);
      this.inventoryOrb?.setPosition(width - ORB_MARGIN - ORB_RADIUS, height - ORB_MARGIN - ORB_RADIUS);
      this.extractText?.setPosition(20, 16);
      this.remotePlayerList?.setPosition(20, 56);
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
    this.fuelOrb.destroy();
    this.inventoryOrb.destroy();
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
    const weightColor = capacityPercent > 75 ? 0xef4444 : capacityPercent > 40 ? 0xeab308 : 0x22c55e;

    this.inventoryOrb.setPercent(capacityPercent, weightColor);

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
    const fuelColor = fuelPercent > 60 ? 0x3b82f6 : fuelPercent > 30 ? 0xeab308 : 0xef4444;

    this.fuelOrb.setPercent(fuelPercent, fuelColor);
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
