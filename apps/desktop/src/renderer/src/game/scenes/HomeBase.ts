import * as Phaser from 'phaser';
import { type AuthPayload, PLAYER_VX_PER_TICK, TICKS_PER_SECOND } from '@repo/core-game';
import { EventBus, EVENT_BUS } from '../EventBus';
import { PLAYER_ANIM } from '../objects/Player';
import { Interactable } from '../objects/Interactable';
import { ASSET, DEPTH, SCENE } from '../constants';
import { revealScene, transitionToScene } from '../transitions';

/** Constant movement speed (px/s), derived from the player's VX tick constant */
const PLAYER_SPEED = 1.5 * PLAYER_VX_PER_TICK * TICKS_PER_SECOND;

interface InputKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  UP: Phaser.Input.Keyboard.Key;
  DOWN: Phaser.Input.Keyboard.Key;
  LEFT: Phaser.Input.Keyboard.Key;
  RIGHT: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
}

/** Single-player hub scene: a zero-gravity room the player can float around in and interact with menu objects (inventory, ship bay, etc) */
export class HomeBase extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private inputKeys!: InputKeys;
  private interactables: Interactable[] = [];
  private activeInteractable?: Interactable;

  constructor() {
    super(SCENE.HOME_BASE);
  }

  create() {
    this.physics.world.gravity.set(0, 0);

    this.player = this.physics.add
      .sprite(0, 0, ASSET.PLAYER)
      .setCollideWorldBounds(true)
      .setDepth(DEPTH.PLAYER)
      .play(PLAYER_ANIM.FLY);

    this.inputKeys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE') as InputKeys;

    this.input.keyboard?.addListener('keydown-ESC', () => {
      EventBus.emit(EVENT_BUS.SETTINGS_OPEN);
    });

    this.interactables = [
      new Interactable(this, 'Settings', 0.3, 0.625, () => EventBus.emit(EVENT_BUS.SETTINGS_OPEN), {
        iconKey: ASSET.COG_ICON,
      }),
      new Interactable(this, 'Profile', 0.3, 0.375, () => EventBus.emit(EVENT_BUS.PROFILE_OPEN), {
        iconKey: ASSET.PROFILE_ICON,
      }),
      new Interactable(this, 'Hangar', 0.5, 0.25, () => {
        EventBus.emit(EVENT_BUS.TOAST_INFO, 'Ship upgrades coming soon...');
      }),
      new Interactable(this, 'Stash', 0.7, 0.375, () => EventBus.emit(EVENT_BUS.STASH_OPEN), {
        iconKey: ASSET.CHEST_ICON,
      }),
      new Interactable(this, 'Marketplace', 0.7, 0.625, () => EventBus.emit(EVENT_BUS.MARKETPLACE_OPEN), {
        iconKey: ASSET.STOCKS_ICON,
      }),
      new Interactable(this, 'Start', 0.5, 0.75, () => EventBus.emit(EVENT_BUS.GAME_START), {
        iconKey: ASSET.DRILL_ICON,
      }),
    ];

    const layout = () => {
      const { width, height } = this.scale;

      this.physics.world.setBounds(0, 0, width, height);

      this.interactables.forEach((interactable) => interactable.resize(width, height));
    };

    layout();
    this.player.setPosition(this.scale.width / 2, this.scale.height / 2);

    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      this.interactables.forEach((interactable) => interactable.destroy());
    });

    revealScene(this, 'up');
    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  update() {
    this.handleMovement();
    this.handleInteraction();
  }

  public startGame({ token }: AuthPayload) {
    transitionToScene(this, SCENE.GAME, { token });
  }

  /** Moves the player at a constant velocity in the direction(s) held down */
  private handleMovement() {
    const direction = new Phaser.Math.Vector2(0, 0);

    if (this.inputKeys.LEFT.isDown || this.inputKeys.A.isDown) direction.x -= 1;
    if (this.inputKeys.RIGHT.isDown || this.inputKeys.D.isDown) direction.x += 1;
    if (this.inputKeys.UP.isDown || this.inputKeys.W.isDown) direction.y -= 1;
    if (this.inputKeys.DOWN.isDown || this.inputKeys.S.isDown) direction.y += 1;

    if (direction.lengthSq() > 0) {
      direction.normalize().scale(PLAYER_SPEED);
    }
    this.player.setVelocity(direction.x, direction.y);
  }

  /** Finds the nearest interactable within range, shows a prompt, and handles the interact key */
  private handleInteraction() {
    let nearest: Interactable | undefined;
    let nearestDistance = Infinity;

    for (const interactable of this.interactables) {
      const distance = interactable.distanceTo(this.player.x, this.player.y);
      if (interactable.isWithinRange(this.player.x, this.player.y) && distance < nearestDistance) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }

    if (nearest !== this.activeInteractable) {
      this.activeInteractable?.setPromptVisible(false);
      nearest?.setPromptVisible(true);
      this.activeInteractable = nearest;
    }

    if (nearest && Phaser.Input.Keyboard.JustDown(this.inputKeys.SPACE)) {
      nearest.interact();
    }
  }
}
