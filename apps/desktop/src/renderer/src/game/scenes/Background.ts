import * as Phaser from 'phaser';
import { StarBackground } from '../objects/StarBackground';
import { SCENE } from '../constants';

/** Persistent backdrop scene: launched once by Boot and never stopped, so objects can persist between scene transitions */
export class Background extends Phaser.Scene {
  private starBackground!: StarBackground;

  constructor() {
    super(SCENE.BACKGROUND);
  }

  create() {
    this.starBackground = new StarBackground(this);

    const layout = () => {
      const { width, height } = this.scale;
      this.starBackground.resize(width, height);
    };

    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
  }

  update(_time: number, delta: number) {
    this.starBackground.update(delta);
  }

  public setGradientColors(top: number, bottom: number, direction: 'up' | 'down' = 'up', duration = 0) {
    return this.starBackground.setGradientColors(top, bottom, direction, duration);
  }
}
