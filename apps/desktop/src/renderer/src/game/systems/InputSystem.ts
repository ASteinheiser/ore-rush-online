import type * as Phaser from 'phaser';
import { WS_EVENT, type InputPayload } from '@repo/core-game';
import type { Game } from '../scenes/Game';
import { EventBus, EVENT_BUS } from '../EventBus';

interface InputKeys {
  ESC: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  UP: Phaser.Input.Keyboard.Key;
  DOWN: Phaser.Input.Keyboard.Key;
  LEFT: Phaser.Input.Keyboard.Key;
  RIGHT: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
}

export class InputSystem {
  private inputSeq = 0;
  private inputKeys?: InputKeys;

  constructor(private scene: Game) {}

  public setupInputSystem() {
    this.inputSeq = 0;
    this.inputKeys = this.scene.input.keyboard?.addKeys('ESC,W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as InputKeys;
  }

  public processInput() {
    if (!this.scene.roomSystem.room?.connection.isOpen || !this.inputKeys) {
      return;
    }

    // press escape to open the settings menu
    if (this.inputKeys.ESC.isDown) {
      EventBus.emit(EVENT_BUS.SETTINGS_OPEN);
    }

    // press shift to extract with inventory + ship
    if (this.inputKeys.SHIFT.isDown) {
      this.scene.roomSystem.room?.send(WS_EVENT.PLAYER_EXTRACT);
      return;
    }

    const inputPayload: InputPayload = {
      seq: this.inputSeq++,
      left: this.inputKeys.LEFT.isDown || this.inputKeys.A.isDown,
      right: this.inputKeys.RIGHT.isDown || this.inputKeys.D.isDown,
      up: this.inputKeys.UP.isDown || this.inputKeys.W.isDown,
      down: this.inputKeys.DOWN.isDown || this.inputKeys.S.isDown,
    };
    // send the input to the server
    this.scene.roomSystem.room?.send(WS_EVENT.PLAYER_INPUT, inputPayload);

    return inputPayload;
  }
}
