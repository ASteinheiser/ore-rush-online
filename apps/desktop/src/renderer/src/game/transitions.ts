import type * as Phaser from 'phaser';
import { SCENE } from './constants';
import type { Background } from './scenes/Background';
import { GRADIENT_TOP, GRADIENT_BOTTOM } from './objects/StarBackground';

/** Duration (ms) of the fade used to mask a scene transition */
const TRANSITION_DURATION = 500;

const getBackground = (scene: Phaser.Scene) => scene.scene.get(SCENE.BACKGROUND) as Background;

/** Tracks scenes currently mid-transition, so e.g. holding a key down can't stack up duplicate transitions */
const transitioningScenes = new WeakSet<Phaser.Scene>();

/** Masks a scene swap with a fade out; call `revealScene` in the new scene's `create()` to fade back in */
export async function transitionToScene(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  fadeTargets: object[] = [scene.cameras.main]
) {
  if (transitioningScenes.has(scene)) return;
  transitioningScenes.add(scene);

  await new Promise<void>((resolve) => {
    scene.tweens.add({
      targets: fadeTargets,
      alpha: 0,
      duration: TRANSITION_DURATION,
      ease: 'Sine.easeInOut',
      onComplete: () => resolve(),
    });
  });

  // clear the guard before starting the next scene, since `scene` is a singleton instance that Phaser reuses
  transitioningScenes.delete(scene);
  scene.scene.start(key, data);
}

/** Which way the backdrop gradient slides in; 'up' uses the normal colors, 'down' reverses them, see `StarBackground.setGradientColors` */
type GradientDirection = 'up' | 'down';

export function fadeSceneIn(scene: Phaser.Scene, duration = TRANSITION_DURATION): Promise<void> {
  scene.cameras.main.alpha = 0;

  return new Promise((resolve) => {
    scene.tweens.add({
      targets: scene.cameras.main,
      alpha: 1,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => resolve(),
    });
  });
}

export function slideBackdrop(
  scene: Phaser.Scene,
  direction: GradientDirection,
  duration = TRANSITION_DURATION
) {
  const [top, bottom] =
    direction === 'up' ? [GRADIENT_TOP, GRADIENT_BOTTOM] : [GRADIENT_BOTTOM, GRADIENT_TOP];

  return getBackground(scene).setGradientColors(top, bottom, direction, duration);
}

/** Reveals a scene entered via `transitionToScene`, fading its camera back in and sliding the backdrop if `direction` is given */
export async function revealScene(scene: Phaser.Scene, direction?: GradientDirection): Promise<void> {
  await Promise.all([fadeSceneIn(scene), direction ? slideBackdrop(scene, direction) : Promise.resolve()]);
}
