import * as Phaser from 'phaser';
import { PLAYER_FRAME_RATE, PLAYER_SIZE } from '@repo/core-game';
import player from '../../assets/ship-sprite.png';
import { PLAYER_ANIM } from '../objects/Player';
import { StarBackground } from '../objects/StarBackground';
import { ASSET, SCENE } from '../constants';

const PROGRESS_BAR_WIDTH = 468;
const PROGRESS_BAR_HEIGHT = 32;
const PROGRESS_BAR_PADDING = 4;

export class Preloader extends Phaser.Scene {
  private starBackground!: StarBackground;

  constructor() {
    super(SCENE.PRELOADER);
  }

  init() {
    this.starBackground = new StarBackground(this, { fixedToCamera: true, showStars: false });

    // create a progress bar container with two rectangle components
    const progressFill = this.add.rectangle(0, 0, 0, PROGRESS_BAR_HEIGHT - PROGRESS_BAR_PADDING, 0xffffff);
    const progressOutline = this.add
      .rectangle((PROGRESS_BAR_WIDTH - PROGRESS_BAR_PADDING) / 2, 0, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT)
      .setStrokeStyle(1, 0xffffff);
    const progress = this.add.container(0, 0, [progressOutline, progressFill]);

    const layout = () => {
      const { width, height } = this.scale;
      this.starBackground.resize(width, height);
      progress.setPosition(width / 2 - PROGRESS_BAR_WIDTH / 2, height / 2 - PROGRESS_BAR_HEIGHT / 2);
    };

    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      this.starBackground.destroy();
    });

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      progressFill.width = (PROGRESS_BAR_WIDTH - PROGRESS_BAR_PADDING) * progress;
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
