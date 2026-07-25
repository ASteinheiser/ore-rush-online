import * as Phaser from 'phaser';
import {
  advanceDrill,
  calculateMovement,
  DRILL_DIRECTIONS,
  PLAYER_SIZE,
  FIXED_TIME_STEP,
  type DRILL_DIRECTION,
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
  /** Client-side tracking of drill fields (mimics server) so `advanceDrill` can run each tick */
  private drillDirection: DRILL_DIRECTION = DRILL_DIRECTIONS.IDLE;
  private drillTargetCol = -1;
  private drillTargetRow = -1;
  private drillCooldownRemainingTicks = 0;
  /** The last input sequence acknowledged by the server */
  private serverAckSeq = 0;
  /** The inputs being predicted by the client */
  private pendingInputs: Array<InputPayload> = [];
  /** Queued server state for deferred reconciliation (processed on next `fixedTick`) */
  private pendingReconciliation?: ServerPlayer;

  constructor(private scene: Game) {}

  public destroy() {
    this.currentPlayer?.destroy();
    this.currentPlayer = undefined;
    this.previousPosition = { x: 0, y: 0 };
    this.currentPosition = { x: 0, y: 0 };
    this.velocityY = 0;
    this.isGrounded = true;
    this.fuelRemaining = 0;
    this.drillDirection = DRILL_DIRECTIONS.IDLE;
    this.drillTargetCol = -1;
    this.drillTargetRow = -1;
    this.drillCooldownRemainingTicks = 0;
    this.serverAckSeq = 0;
    this.pendingInputs = [];
    this.pendingReconciliation = undefined;
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

    const drillResult = advanceDrill({
      input: { down, left, right },
      state: {
        x: this.currentPosition.x,
        y: this.currentPosition.y,
        isGrounded: this.isGrounded,
        isTouchingBlockLeft: result.isTouchingBlockLeft,
        isTouchingBlockRight: result.isTouchingBlockRight,
        drillDirection: this.drillDirection,
        drillTargetCol: this.drillTargetCol,
        drillTargetRow: this.drillTargetRow,
        drillCooldownRemainingTicks: this.drillCooldownRemainingTicks,
      },
      getBlockAt: this.scene.blockSystem.getBlockByCell.bind(this.scene.blockSystem),
    });

    this.drillCooldownRemainingTicks = drillResult.drillState.drillCooldownRemainingTicks;
    this.drillTargetCol = drillResult.drillState.drillTargetCol;
    this.drillTargetRow = drillResult.drillState.drillTargetRow;
    this.drillDirection = drillResult.drillState.drillDirection;
    this.currentPlayer.setDrillDirection(drillResult.drillState.drillDirection);
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
    this.serverAckSeq = 0;
    this.pendingInputs = [];
    this.pendingReconciliation = undefined;
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
