import * as Phaser from 'phaser';
import { SCENE } from '../constants';

export class Boot extends Phaser.Scene {
  constructor() {
    super(SCENE.BOOT);
  }

  preload() {
    //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
    //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.
  }

  create() {
    // launch the persistent backdrop once here; it stays active behind every other scene for the rest of the game's lifetime
    this.scene.launch(SCENE.BACKGROUND);
    this.scene.sendToBack(SCENE.BACKGROUND);

    this.scene.start(SCENE.PRELOADER);
  }
}
