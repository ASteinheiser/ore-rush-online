import { Scene, Scenes } from 'phaser';
import { EventBus, EVENT_BUS } from '../EventBus';
import { CustomText } from '../objects/CustomText';
import { ASSET, SCENE } from '../constants';

export class GameOver extends Scene {
  cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super(SCENE.GAME_OVER);
  }

  preload() {
    this.cursorKeys = this.input.keyboard?.createCursorKeys();
  }

  create() {
    this.cameras.main.setBackgroundColor(0xff0000);

    const bg = this.add.image(0, 0, ASSET.BACKGROUND).setAlpha(0.5).setOrigin(0.5);

    const titleText = new CustomText(this, 0, 0, 'Game Over', {
      fontFamily: 'Tiny5',
      fontSize: 64,
      strokeThickness: 8,
    })
      .setOrigin(0.5)
      .typeWriter(150);

    const continueText = new CustomText(this, 0, 0, 'Press Shift to continue', {
      fontFamily: 'Tiny5',
      fontSize: 20,
    }).fadeIn(1500);

    const layout = () => {
      const { width, height } = this.scale;
      bg.setPosition(width / 2, height / 2).setDisplaySize(width, height);

      continueText.setPosition((width - continueText.width) / 2, 20);

      titleText.setPosition(width / 2, height / 2 - 100);
    };

    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });

    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  update() {
    if (this.cursorKeys?.shift.isDown) {
      this.changeScene();
    }
  }

  changeScene() {
    this.scene.start(SCENE.MAIN_MENU);
  }
}
