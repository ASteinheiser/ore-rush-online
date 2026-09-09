import * as Phaser from 'phaser';
import { StarBackground } from '../objects/StarBackground';
import { SCENE } from '../constants';

export class Boot extends Phaser.Scene {
  private starBackground!: StarBackground;

  constructor() {
    super(SCENE.BOOT);
  }

  preload() {
    //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
    //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.
  }

  create() {
    this.starBackground = new StarBackground(this, { fixedToCamera: true, showStars: false });

    const layout = () => {
      const { width, height } = this.scale;
      this.starBackground.resize(width, height);
    };

    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      this.starBackground.destroy();
    });

    this.scene.start(SCENE.PRELOADER);
  }
}
