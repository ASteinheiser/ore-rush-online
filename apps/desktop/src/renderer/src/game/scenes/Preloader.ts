import * as Phaser from 'phaser';
import { PLAYER_FRAME_RATE, PLAYER_SIZE } from '@repo/core-game';
import player from '../../assets/ship-sprite.png';
import { PLAYER_ANIM } from '../objects/Player';
import { StarBackground } from '../objects/StarBackground';
import { ASSET, SCENE } from '../constants';

export class Preloader extends Phaser.Scene {
  private starBackground!: StarBackground;

  constructor() {
    super(SCENE.PRELOADER);
  }

  init() {
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
  }

  preload() {
    this.load.spritesheet(ASSET.PLAYER, player, {
      frameWidth: PLAYER_SIZE.width,
      frameHeight: PLAYER_SIZE.height,
    });
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    this.anims.create({
      key: PLAYER_ANIM.IDLE,
      frames: this.anims.generateFrameNumbers(ASSET.PLAYER, { frames: [0] }),
      frameRate: PLAYER_FRAME_RATE,
      repeat: 0,
    });
    this.anims.create({
      key: PLAYER_ANIM.ROLL,
      frames: this.anims.generateFrameNumbers(ASSET.PLAYER, { frames: [0, 0, 5, 5] }),
      frameRate: PLAYER_FRAME_RATE,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.FLY,
      frames: this.anims.generateFrameNumbers(ASSET.PLAYER, { frames: [0, 1, 2, 3, 4, 3, 2, 1] }),
      frameRate: PLAYER_FRAME_RATE,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.DRILL_RIGHT,
      frames: this.anims.generateFrameNumbers(ASSET.PLAYER, { frames: [6, 7, 8] }),
      frameRate: PLAYER_FRAME_RATE,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.DRILL_LEFT,
      frames: this.anims.generateFrameNumbers(ASSET.PLAYER, { frames: [9, 10, 11] }),
      frameRate: PLAYER_FRAME_RATE,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.DRILL_DOWN,
      frames: this.anims.generateFrameNumbers(ASSET.PLAYER, { frames: [12, 13, 14] }),
      frameRate: PLAYER_FRAME_RATE,
      repeat: -1,
    });

    this.scene.start(SCENE.HOME_BASE);
  }
}
