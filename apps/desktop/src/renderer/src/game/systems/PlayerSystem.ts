import { calculateMovement, PLAYER_SIZE, type InputPayload } from '@repo/core-game';
import type { Player as ServerPlayer } from 'game-api/types';
import { Player } from '../objects/Player';
import { PunchBox } from '../objects/PunchBox';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

export class PlayerSystem {
  public currentPlayer?: Player;
  /** Position at start of last fixed tick, used for interpolation */
  private previousPosition = { x: 0, y: 0 };
  private currentPosition = { x: 0, y: 0 };
  /** The last input sequence acknowledged by the server */
  private serverAckSeq = 0;
  /** The inputs being predicted by the client */
  private pendingInputs: Array<InputPayload> = [];

  constructor(private scene: Game) {}

  public destroy() {
    this.pendingInputs = [];
    this.currentPlayer?.destroy();
    delete this.currentPlayer;
  }

  /** Predict and update local player state per fixed tick */
  public clientSidePrediction(inputPayload?: InputPayload) {
    // skip if no input payload or current player
    if (!inputPayload || !this.currentPlayer?.entity) return;

    // store inputs to be processed by the server reconciliation
    this.pendingInputs.push(inputPayload);

    const { attack, left, right, up, down } = inputPayload;

    if (attack) this.currentPlayer.punch();

    this.previousPosition.x = this.currentPosition.x;
    this.previousPosition.y = this.currentPosition.y;

    const newPosition = calculateMovement({ ...this.currentPosition, ...PLAYER_SIZE, left, right, up, down });
    this.currentPosition.x = newPosition.x;
    this.currentPosition.y = newPosition.y;
  }

  /** Interpolate local player between fixed ticks */
  public interpolateLocalPlayer(alpha: number) {
    if (!this.currentPlayer?.entity) return;

    this.currentPlayer.move({
      x: Phaser.Math.Linear(this.previousPosition.x, this.currentPosition.x, alpha),
      y: Phaser.Math.Linear(this.previousPosition.y, this.currentPosition.y, alpha),
    });
  }

  public handleCurrentPlayerAdded: RoomEventCallbacks['onPlayerAdded'] = (player, sessionId, $) => {
    // skip remote players, only handle the current player here
    if (sessionId !== this.scene.roomSystem.room?.sessionId) return;

    this.currentPlayer = new Player(this.scene, player.username, player.x, player.y);
    this.previousPosition = { x: player.x, y: player.y };
    this.currentPosition = { x: player.x, y: player.y };
    // ensure the camera is following the current player
    this.scene.cameras.main.startFollow(this.currentPlayer.entity, true, 0.1, 0.1);
    this.currentPlayer.createDebugBox();

    $(player).onChange(() => {
      this.handleInventoryUpdated(player);
      this.handleDebugFieldsUpdated(player);
      this.handleServerReconciliation(player);
    });
  };

  private handleInventoryUpdated(player: ServerPlayer) {
    this.scene.uiSystem?.ironCountText.setText(`Iron: ${player.inventory.iron}`);
    this.scene.uiSystem?.goldCountText.setText(`Gold: ${player.inventory.gold}`);
  }

  private handleDebugFieldsUpdated(player: ServerPlayer) {
    if (!this.currentPlayer?.debugBox) return;

    this.currentPlayer.debugBox.x = player.x;
    this.currentPlayer.debugBox.y = player.y;

    if (player.attackDamageFrameX !== undefined && player.attackDamageFrameY !== undefined) {
      new PunchBox(this.scene, player.attackDamageFrameX, player.attackDamageFrameY, 0x0000ff);
    }
  }

  /** Ensure Client Side Prediction is in sync with server state */
  private handleServerReconciliation(player: ServerPlayer) {
    if (!this.currentPlayer) return;

    const nextServerAckSeq = player.lastProcessedInputSeq ?? 0;
    // Ignore out-of-order acks
    if (nextServerAckSeq < this.serverAckSeq) return;

    // Update ack
    this.serverAckSeq = nextServerAckSeq;
    // drop acknowledged inputs
    while (this.pendingInputs.length && this.pendingInputs[0].seq <= nextServerAckSeq) {
      this.pendingInputs.shift();
    }

    // Determine the target position we expect given remaining inputs
    // Start from authoritative server position
    let targetPosition = { x: player.x, y: player.y };
    for (const { left, right, up, down } of this.pendingInputs) {
      targetPosition = calculateMovement({
        x: targetPosition.x,
        y: targetPosition.y,
        ...PLAYER_SIZE,
        left,
        right,
        up,
        down,
      });
    }

    // if our CSP is out of sync with the server state, sync client state with server state
    if (
      this.currentPlayer.entity.x !== targetPosition.x ||
      this.currentPlayer.entity.y !== targetPosition.y
    ) {
      this.previousPosition.x = targetPosition.x;
      this.previousPosition.y = targetPosition.y;
      this.currentPosition.x = targetPosition.x;
      this.currentPosition.y = targetPosition.y;
      this.currentPlayer.forceMove(targetPosition);
    }
  }
}
