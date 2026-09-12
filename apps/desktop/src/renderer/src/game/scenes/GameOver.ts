import * as Phaser from 'phaser';
import { ORE } from '@repo/core-game';
import { EventBus, EVENT_BUS } from '../EventBus';
import { CustomText } from '../objects/CustomText';
import { ORE_COLORS, DIRT_COLORS } from '../objects/Block';
import { ASSET, DEPTH, SCENE } from '../constants';
import { revealScene, transitionToScene } from '../transitions';
import type { InventorySnapshot } from '../systems/UISystem';

const ITEM_SLOT_WIDTH = 120;
const ITEM_NAME_TEXT_GAP = 8;
const ORE_ICON_SIZE = 64;

export interface GameOverSceneData {
  success: boolean;
  inventory?: InventorySnapshot;
}

export class GameOver extends Phaser.Scene {
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super(SCENE.GAME_OVER);
  }

  preload() {
    this.cursorKeys = this.input.keyboard?.createCursorKeys();
  }

  create({ success, inventory }: GameOverSceneData) {
    // filter out items that have no quantity for display purposes
    const heldItems = Object.entries(inventory ?? {}).filter(([, count]) => count > 0);

    const continueText = new CustomText(this, 0, 0, 'Press <SHIFT> to continue', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    })
      .setDepth(DEPTH.HUD_FOREGROUND)
      .fadeIn(1500);

    const titleText = new CustomText(this, 0, 0, success ? 'Extraction Successful!' : 'Mission Failed', {
      fontFamily: 'Tiny5',
      fontSize: 64,
      strokeThickness: 8,
      color: success ? '#00ff00' : '#ff0000',
    })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD_FOREGROUND)
      .typeWriter(150);

    const bodyText = new CustomText(
      this,
      0,
      0,
      success
        ? 'The following items have been added to your stash:'
        : 'You lost your haul, along with your ship...',
      {
        fontFamily: 'Tiny5',
        fontSize: 20,
      }
    )
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD_FOREGROUND)
      .setVisible(!success || heldItems.length > 0)
      .typeWriter(75);

    const itemRows: Phaser.GameObjects.Container[] = [];
    heldItems.forEach(([oreType, oreCount], index) => {
      const oreName = ORE[oreType].name;

      const oreBg = this.add
        .image(0, 0, ASSET.ORE_BG)
        .setDisplaySize(ORE_ICON_SIZE, ORE_ICON_SIZE)
        .setTint(DIRT_COLORS[2]);

      const oreFg = this.add
        .image(0, 0, ASSET.ORE_FG)
        .setDisplaySize(ORE_ICON_SIZE, ORE_ICON_SIZE)
        .setTint(ORE_COLORS[oreType]);

      // count sits near the bottom-right corner of the ore image
      const countText = new CustomText(this, ORE_ICON_SIZE / 2, ORE_ICON_SIZE / 2, oreCount, {
        fontFamily: 'Iceberg',
        fontSize: 18,
      }).setOrigin(1);

      // name sits below the ore image/count
      const nameText = new CustomText(this, 0, ORE_ICON_SIZE / 2 + ITEM_NAME_TEXT_GAP, oreName, {
        fontFamily: 'Iceberg',
        fontSize: 20,
      }).setOrigin(0.5, 0);

      const row = this.add
        .container(0, 0, [oreBg, oreFg, countText, nameText])
        .setDepth(DEPTH.HUD_FOREGROUND)
        .setAlpha(0);

      this.tweens.add({
        targets: row,
        alpha: 1,
        duration: 500,
        delay: 800 + 500 * (index + 1),
      });

      itemRows.push(row);
    });

    const layout = () => {
      const { width, height } = this.scale;

      continueText.setPosition((width - continueText.width) / 2, 20);

      titleText.setPosition(width / 2, height / 2 - 100);
      bodyText.setPosition(width / 2, height / 2 - 30);

      const totalWidth = itemRows.length * ITEM_SLOT_WIDTH;
      const startX = width / 2 - totalWidth / 2;
      itemRows.forEach((row, idx) => {
        const slotCenterX = startX + idx * ITEM_SLOT_WIDTH + ITEM_SLOT_WIDTH / 2;
        row.setPosition(slotCenterX, height / 2 + 40);
      });
    };

    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });

    revealScene(this, 'up');
    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  update() {
    if (this.cursorKeys?.shift.isDown) {
      this.changeScene();
    }
  }

  public changeScene() {
    transitionToScene(this, SCENE.HOME_BASE);
  }
}
