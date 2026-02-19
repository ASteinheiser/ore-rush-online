import { FIXED_TIME_STEP, type AuthPayload } from '@repo/core-game';
import { EventBus, EVENT_BUS } from '../EventBus';
import { SCENE } from '../constants';
import { RoomSystem } from '../systems/RoomSystem';
import { InputSystem } from '../systems/InputSystem';
import { UISystem } from '../systems/UISystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { BlockSystem } from '../systems/BlockSystem';

export class Game extends Phaser.Scene {
  private elapsedTime = 0;
  public uiSystem?: UISystem;
  public roomSystem = new RoomSystem(this);
  public inputSystem = new InputSystem(this);
  public playerSystem = new PlayerSystem(this);
  private blockSystem = new BlockSystem(this);

  constructor() {
    super(SCENE.GAME);
  }

  preload() {
    this.inputSystem.setupInputSystem();
  }

  async create({ token }: AuthPayload) {
    await this.roomSystem.joinRoom(token);
    if (!this.roomSystem.room) {
      return this.sendToMainMenu(new Error('Failed to join room'));
    }

    this.setupStateListeners();

    EventBus.emit(EVENT_BUS.CURRENT_SCENE_READY, this);
  }

  /** Currently public to allow roomSystem to call when reconnection succeeds */
  public setupStateListeners() {
    if (!this.roomSystem.room) return;

    this.cleanupScene();
    this.uiSystem = new UISystem(this);

    this.roomSystem.setupRoomEventListeners({
      onPlayerAdded: this.playerSystem.handleServerPlayerAdded,
      onPlayerRemoved: this.playerSystem.handleServerPlayerRemoved,
      onBlockAdded: this.blockSystem.handleBlockAdded,
      onBlockRemoved: this.blockSystem.handleBlockRemoved,
    });
  }

  update(_: number, delta: number): void {
    // skip if not yet connected
    if (!this.roomSystem.room || !this.playerSystem.currentPlayer) return;

    this.uiSystem?.fpsDisplay.update(delta);
    this.uiSystem?.fogOverlay.update(this.playerSystem.currentPlayer.entity);

    // TODO: break this out into interpolateServerPlayers AND ServerReconciliationSystem
    this.playerSystem.interpolateServerPlayers(delta);

    this.elapsedTime += delta;
    while (this.elapsedTime >= FIXED_TIME_STEP) {
      this.elapsedTime -= FIXED_TIME_STEP;
      this.fixedTick();
    }
  }

  private fixedTick() {
    const input = this.inputSystem.processInput();
    this.playerSystem.clientSidePrediction(input);
  }

  private cleanupScene() {
    this.uiSystem?.destroy();
    this.playerSystem.destroy();
    this.blockSystem.destroy();
  }

  public sendToMainMenu(error: Error) {
    console.error(error);
    EventBus.emit(EVENT_BUS.JOIN_ERROR, error.message);

    this.roomSystem.cleanupRoom();
    this.cleanupScene();
    this.scene.start(SCENE.MAIN_MENU);
  }

  public sendToGameOver() {
    this.roomSystem.cleanupRoom();
    this.cleanupScene();
    this.scene.start(SCENE.GAME_OVER);
  }
}
