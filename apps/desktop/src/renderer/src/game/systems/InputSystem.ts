import { WS_EVENT, PLAYER_SIZE, calculateMovement, type InputPayload } from '@repo/core-game';
import type { Game } from '../scenes/Game';
import { EventBus, EVENT_BUS } from '../EventBus';

export class InputSystem {
  private inputSeq = 0;
  public pendingInputs: Array<InputPayload> = [];
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor(private scene: Game) {}

  public setupInputSystem() {
    this.escapeKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cursorKeys = this.scene.input.keyboard?.createCursorKeys();
  }

  public processInput() {
    if (
      !this.scene.roomSystem.room?.connection.isOpen ||
      !this.scene.playerSystem.currentPlayer ||
      !this.cursorKeys ||
      !this.escapeKey
    ) {
      return;
    }

    // press escape to open the settings menu
    if (this.escapeKey.isDown) {
      EventBus.emit(EVENT_BUS.SETTINGS_OPEN);
    }

    // press shift to leave the game
    if (this.cursorKeys.shift.isDown) {
      this.scene.roomSystem.room?.send(WS_EVENT.LEAVE_ROOM);
      return;
    }

    const inputPayload: InputPayload = {
      seq: this.inputSeq++,
      left: this.cursorKeys.left.isDown,
      right: this.cursorKeys.right.isDown,
      up: this.cursorKeys.up.isDown,
      down: this.cursorKeys.down.isDown,
      attack: this.cursorKeys.space.isDown,
    };
    this.pendingInputs.push(inputPayload);
    this.scene.roomSystem.room?.send(WS_EVENT.PLAYER_INPUT, inputPayload);

    const { attack, left, right, up, down } = inputPayload;

    if (attack) this.scene.playerSystem.currentPlayer.punch();

    const { x, y } = this.scene.playerSystem.currentPlayer.entity;
    const newPosition = calculateMovement({ x, y, ...PLAYER_SIZE, left, right, up, down });
    this.scene.playerSystem.currentPlayer.move(newPosition);
  }
}
