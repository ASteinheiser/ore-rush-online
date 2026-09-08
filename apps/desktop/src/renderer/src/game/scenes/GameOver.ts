import * as Phaser from 'phaser';
import { EventBus, EVENT_BUS } from '../EventBus';
import { CustomText } from '../objects/CustomText';
import { ASSET, SCENE } from '../constants';
import { ORE } from '@repo/core-game';
import type { InventorySnapshot } from '../systems/UISystem';

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
    this.cameras.main.setBackgroundColor(success ? 0x00ff00 : 0xff0000);

    const bg = this.add.image(0, 0, ASSET.BACKGROUND).setAlpha(0.5).setOrigin(0.5);

    const continueText = new CustomText(this, 0, 0, 'Press <SHIFT> to continue', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).fadeIn(1500);

    const titleText = new CustomText(this, 0, 0, success ? 'Extraction Successful!' : 'Mission Failed', {
      fontFamily: 'Tiny5',
      fontSize: 64,
      strokeThickness: 8,
    })
      .setOrigin(0.5)
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
      .typeWriter(75);

    const itemTexts: CustomText[] = [];
    Object.keys(inventory ?? {}).forEach((oreType, index) => {
      const oreCount = inventory?.[oreType] ?? 0;
      const oreName = ORE[oreType].name;

      const text = new CustomText(this, 0, 0, `${oreName}: ${oreCount}`, { fontFamily: 'Iceberg' })
        .setOrigin(0.5)
        .fadeIn(500, 800 + 500 * (index + 1));

      itemTexts.push(text);
    });

    const layout = () => {
      const { width, height } = this.scale;
      bg.setPosition(width / 2, height / 2).setDisplaySize(width, height);

      continueText.setPosition((width - continueText.width) / 2, 20);

      titleText.setPosition(width / 2, height / 2 - 100);
      bodyText.setPosition(width / 2, height / 2 - 30);

      itemTexts.forEach((text, idx) => {
        text.setPosition(width / 2, height / 2 + 20 + idx * 40);
      });
    };

    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });

    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  update() {
    if (this.cursorKeys?.shift.isDown) {
      this.changeScene();
    }
  }

  public changeScene() {
    this.scene.start(SCENE.MAIN_MENU);
  }
}
