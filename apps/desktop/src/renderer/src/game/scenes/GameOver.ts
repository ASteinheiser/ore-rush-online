import * as Phaser from 'phaser';
import { ORE } from '@repo/core-game';
import { EventBus, EVENT_BUS } from '../EventBus';
import { CustomText } from '../objects/CustomText';
import { DEPTH, SCENE } from '../constants';
import { revealScene, transitionToScene } from '../transitions';
import type { InventorySnapshot } from '../systems/UISystem';

export interface GameOverSceneData {
  success: boolean;
  inventory?: InventorySnapshot;
}

export class GameOver extends Phaser.Scene {
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private texts: CustomText[] = [];

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

    const itemTexts: CustomText[] = [];
    heldItems.forEach(([oreType, oreCount], index) => {
      const oreName = ORE[oreType].name;

      const text = new CustomText(this, 0, 0, `${oreName}: ${oreCount}`, { fontFamily: 'Iceberg' })
        .setOrigin(0.5)
        .setDepth(DEPTH.HUD_FOREGROUND)
        .fadeIn(500, 800 + 500 * (index + 1));

      itemTexts.push(text);
    });

    // used for the fade transition back to HomeBase
    this.texts = [continueText, titleText, bodyText, ...itemTexts];

    const layout = () => {
      const { width, height } = this.scale;

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

    revealScene(this, 'up');
    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  update() {
    if (this.cursorKeys?.shift.isDown) {
      this.changeScene();
    }
  }

  public changeScene() {
    transitionToScene(this, SCENE.HOME_BASE, undefined, this.texts);
  }
}
