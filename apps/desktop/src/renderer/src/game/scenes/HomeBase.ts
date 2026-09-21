import * as Phaser from 'phaser';
import {
  type AuthPayload,
  type JoinRoomOptions,
  type EntityPosition,
  PLAYER_SIZE,
  PLAYER_VX_PER_TICK,
  TICKS_PER_SECOND,
} from '@repo/core-game';
import { EventBus, EVENT_BUS } from '../EventBus';
import { Player, PLAYER_ANIM } from '../objects/Player';
import { Interactable } from '../objects/Interactable';
import { ASSET, SCENE } from '../constants';
import { revealScene, transitionToScene } from '../transitions';

/** Constant movement speed (px/s) set equal to 1.5 times the standard x-axis velocity */
const PLAYER_SPEED = 1.5 * PLAYER_VX_PER_TICK * TICKS_PER_SECOND;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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
  private player!: Player;
  private inputKeys!: InputKeys;
  private interactables: Interactable[] = [];
  private activeInteractable?: Interactable;

  constructor() {
    super(SCENE.HOME_BASE);
  }

  create() {
    this.physics.world.gravity.set(0, 0);

    this.player = new Player(this, '', 0, 0);
    // lock the player in the "fly" animation
    this.player.playAnimation(PLAYER_ANIM.FLY);

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
      new Interactable(this, 'Hangar', 0.5, 0.25, () => EventBus.emit(EVENT_BUS.HANGAR_OPEN), {
        iconKey: ASSET.CRANE_ICON,
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
      this.movePlayer({ x: this.player.entity.x, y: this.player.entity.y });

      this.interactables.forEach((interactable) => interactable.resize(width, height));
    };

    layout();
    this.movePlayer({ x: this.scale.width / 2, y: this.scale.height / 2 });

    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      this.interactables.forEach((interactable) => interactable.destroy());
    });

    revealScene(this, 'up');
    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  update(_time: number, delta: number) {
    this.handleMovement(delta);
    this.handleInteraction();
  }

  public startGame({ token, shipId }: AuthPayload & JoinRoomOptions) {
    transitionToScene(this, SCENE.GAME, { token, shipId });
  }

  public updateActiveShip(shipId: string) {
    this.player.updateActiveShip(shipId);
  }

  /** Moves the player at a constant velocity in the direction(s) held down */
  private handleMovement(delta: number) {
    const direction = { x: 0, y: 0 };

    if (this.inputKeys.LEFT.isDown || this.inputKeys.A.isDown) direction.x -= 1;
    if (this.inputKeys.RIGHT.isDown || this.inputKeys.D.isDown) direction.x += 1;
    if (this.inputKeys.UP.isDown || this.inputKeys.W.isDown) direction.y -= 1;
    if (this.inputKeys.DOWN.isDown || this.inputKeys.S.isDown) direction.y += 1;

    if (direction.x === 0 && direction.y === 0) return;

    const distance = PLAYER_SPEED * (delta / 1000);

    this.movePlayer({
      x: this.player.entity.x + direction.x * distance,
      y: this.player.entity.y + direction.y * distance,
    });
  }

  /** Move the player, keeping their center position within the scene so the full sprite stays on-screen */
  private movePlayer({ x, y }: EntityPosition) {
    const halfWidth = PLAYER_SIZE.width / 2;
    const halfHeight = PLAYER_SIZE.height / 2;
    const { width, height } = this.scale;

    this.player.forceMove({
      x: clamp(x, halfWidth, width - halfWidth),
      y: clamp(y, halfHeight, height - halfHeight),
    });
  }

  /** Finds the nearest interactable within range, shows a prompt, and handles the interact key */
  private handleInteraction() {
    let nearest: Interactable | undefined;
    let nearestDistance = Infinity;

    for (const interactable of this.interactables) {
      const distance = interactable.distanceTo(this.player.entity.x, this.player.entity.y);
      if (
        interactable.isWithinRange(this.player.entity.x, this.player.entity.y) &&
        distance < nearestDistance
      ) {
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
