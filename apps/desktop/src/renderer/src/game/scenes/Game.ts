import { FIXED_TIME_STEP, type AuthPayload } from '@repo/core-game';
import { EventBus, EVENT_BUS } from '../EventBus';
import { SCENE } from '../constants';
import { RoomSystem } from '../systems/RoomSystem';
import { InputSystem } from '../systems/InputSystem';
import { UISystem } from '../systems/UISystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { RemotePlayerSystem } from '../systems/RemotePlayerSystem';
import { BlockSystem } from '../systems/BlockSystem';

export class Game extends Phaser.Scene {
  private elapsedTime = 0;
  public uiSystem?: UISystem;
  public roomSystem = new RoomSystem(this);
  public inputSystem = new InputSystem(this);
  public playerSystem = new PlayerSystem(this);
  public remotePlayerSystem = new RemotePlayerSystem(this);
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
      onPlayerAdded: (player, sessionId, $) => {
        this.playerSystem.handleCurrentPlayerAdded(player, sessionId, $);
        this.remotePlayerSystem.handleRemotePlayerAdded(player, sessionId, $);
      },
      onPlayerRemoved: this.remotePlayerSystem.handleRemotePlayerRemoved,
      onBlockAdded: this.blockSystem.handleBlockAdded,
      onBlockRemoved: this.blockSystem.handleBlockRemoved,
    });
  }

  // this is called by Phaser per frame (could be 30fps/60fps/120fps/etc)
  update(_: number, delta: number): void {
    // skip if not yet connected
    if (!this.roomSystem.room || !this.playerSystem.currentPlayer) return;

    this.elapsedTime += delta;
    while (this.elapsedTime >= FIXED_TIME_STEP) {
      this.elapsedTime -= FIXED_TIME_STEP;
      this.fixedTick();
    }

    /** This indicates when we are processing more than 1 tick per frame.
     * When this happens, set alpha to 1 to skip interpolation.
     * This is fine because the low frame rate will cause "stepping" regardless.
     * This will at least avoid additional lag due to interpolation. */
    const interpolationDeltaThreshold = delta >= FIXED_TIME_STEP * 2;
    /** Calculate the alpha for interpolation. A number between 0 and 1,
     * representing the percentage of the current tick that has elapsed. */
    const alpha = Math.min(1, this.elapsedTime / FIXED_TIME_STEP);

    this.playerSystem.interpolateLocalPlayer(interpolationDeltaThreshold ? 1 : alpha);

    this.remotePlayerSystem.interpolateRemotePlayers(delta);

    this.uiSystem?.fpsDisplay.update(delta);
    this.uiSystem?.fogOverlay.update(this.playerSystem.currentPlayer.entity);
  }

  private fixedTick() {
    const input = this.inputSystem.processInput();
    this.playerSystem.clientSidePrediction(input);
  }

  private cleanupScene() {
    this.uiSystem?.destroy();
    this.playerSystem.destroy();
    this.remotePlayerSystem.destroy();
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
