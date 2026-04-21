import * as Phaser from 'phaser';
import {
  calculateMovement,
  BLOCK_SIZE,
  PLAYER_SIZE,
  FIXED_TIME_STEP,
  type InputPayload,
  type Player as ServerPlayer,
} from '@repo/core-game';
import { Player } from '../objects/Player';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

export class PlayerSystem {
  public currentPlayer?: Player;
  /** Position at start of last fixed tick, used for interpolation */
  private previousPosition = { x: 0, y: 0 };
  private currentPosition = { x: 0, y: 0 };
  /** Used for client-side prediction of flight and drill animations */
  private velocityY = 0;
  private isGrounded = true;
  private fuelRemaining = 0;
  /** The last input sequence acknowledged by the server */
  private serverAckSeq = 0;
  /** The inputs being predicted by the client */
  private pendingInputs: Array<InputPayload> = [];
  /** Queued server state for deferred reconciliation (processed on next `fixedTick`) */
  private pendingReconciliation?: ServerPlayer;

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

    let { left, right, up, down } = inputPayload;
    // disable inputs if the player has no fuel
    if (this.fuelRemaining <= 0) {
      left = false;
      right = false;
      up = false;
      down = false;
    }

    // store inputs to be processed by the server reconciliation
    this.pendingInputs.push({ ...inputPayload, left, right, up, down });

    this.previousPosition.x = this.currentPosition.x;
    this.previousPosition.y = this.currentPosition.y;

    const playerRectangle = {
      x: this.currentPosition.x,
      y: this.currentPosition.y,
      width: PLAYER_SIZE.width,
      height: PLAYER_SIZE.height,
    };
    const nearbyBlocks = this.scene.blockSystem.getNearbyBlocks(playerRectangle);

    const result = calculateMovement({
      ...playerRectangle,
      velocityY: this.velocityY,
      blocks: nearbyBlocks,
      left,
      right,
      up,
    });
    this.currentPosition.x = result.x;
    this.currentPosition.y = result.y;
    this.velocityY = result.velocityY;
    this.isGrounded = result.isGrounded;

    // check if there is a drillable block below the player
    // since x is centered, must be at least half way over the block (different than isGrounded)
    const canDrillBlockBottom = this.scene.blockSystem.hasBlockAt(
      this.currentPosition.x,
      this.currentPosition.y + BLOCK_SIZE.height
    );

    if (!this.isGrounded) this.currentPlayer.setDrillDirection('idle');
    else if (down && canDrillBlockBottom) this.currentPlayer.setDrillDirection('down');
    else if (left && result.isTouchingBlockLeft) this.currentPlayer.setDrillDirection('left');
    else if (right && result.isTouchingBlockRight) this.currentPlayer.setDrillDirection('right');
    else this.currentPlayer.setDrillDirection('idle');
  }

  /** Interpolate local player between fixed ticks */
  public interpolateLocalPlayer(delta: number, elapsedTime: number) {
    if (!this.currentPlayer?.entity) return;

    const isMovingX = this.previousPosition.x !== this.currentPosition.x;
    const isMovingY = this.previousPosition.y !== this.currentPosition.y;
    const isMoving = isMovingX || isMovingY;

    /** This indicates when we are processing more than 1 tick per frame.
     * When this happens, set alpha to 1 to skip interpolation.
     * This is fine because the low frame rate will cause "stepping" regardless.
     * This will at least avoid additional lag due to interpolation. */
    const interpolationDeltaThreshold = delta >= FIXED_TIME_STEP * 2;
    /** Calculate the alpha for interpolation. A number between 0 and 1,
     * representing the percentage of the current tick that has elapsed. */
    const alpha = interpolationDeltaThreshold ? 1 : Math.min(1, elapsedTime / FIXED_TIME_STEP);

    this.currentPlayer.move({
      x: Phaser.Math.Linear(this.previousPosition.x, this.currentPosition.x, alpha),
      y: Phaser.Math.Linear(this.previousPosition.y, this.currentPosition.y, alpha),
      delta,
      isMoving,
      isMovingX,
      isMovingY,
      isGrounded: this.isGrounded,
    });
  }

  public handleCurrentPlayerAdded: RoomEventCallbacks['onPlayerAdded'] = (player, sessionId) => {
    // skip remote players, only handle the current player here
    if (sessionId !== this.scene.roomSystem.room?.sessionId) return;

    this.currentPlayer = new Player(this.scene, player.username, player.x, player.y);
    this.previousPosition = { x: player.x, y: player.y };
    this.currentPosition = { x: player.x, y: player.y };
    this.velocityY = player.velocityY;
    // ensure the camera is following the current player
    this.scene.cameras.main.startFollow(this.currentPlayer.entity, true, 0.1, 0.1);
    this.currentPlayer.createDebugBox();
  };

  public handleCurrentPlayerUpdated: RoomEventCallbacks['onPlayerUpdated'] = (player, sessionId) => {
    // skip remote players, only handle the current player here
    if (sessionId !== this.scene.roomSystem.room?.sessionId) return;

    this.handleDebugFieldsUpdated(player);
    this.fuelRemaining = player.fuelRemaining;
    this.pendingReconciliation = player;
  };

  private handleDebugFieldsUpdated(player: ServerPlayer) {
    if (!this.currentPlayer?.debugBox) return;

    this.currentPlayer.debugBox.x = player.x;
    this.currentPlayer.debugBox.y = player.y;
  }

  /** Process queued server reconciliation before predicting the next input */
  public processReconciliation() {
    if (this.pendingReconciliation) {
      this.handleServerReconciliation(this.pendingReconciliation);
      this.pendingReconciliation = undefined;
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
    let targetX = player.x;
    let targetY = player.y;
    let velocityY = player.velocityY;

    for (const { left, right, up } of this.pendingInputs) {
      const playerRectangle = {
        x: targetX,
        y: targetY,
        width: PLAYER_SIZE.width,
        height: PLAYER_SIZE.height,
      };
      const nearbyBlocks = this.scene.blockSystem.getNearbyBlocks(playerRectangle);

      const result = calculateMovement({
        ...playerRectangle,
        velocityY,
        blocks: nearbyBlocks,
        left,
        right,
        up,
      });
      targetX = result.x;
      targetY = result.y;
      velocityY = result.velocityY;
    }

    // if our CSP is out of sync with the server state, sync client state with server state
    if (
      this.currentPosition.x !== targetX ||
      this.currentPosition.y !== targetY ||
      this.velocityY !== velocityY
    ) {
      this.currentPosition.x = targetX;
      this.currentPosition.y = targetY;
      this.velocityY = velocityY;
      this.currentPlayer.forceMove({ x: targetX, y: targetY });
    }
  }
}
