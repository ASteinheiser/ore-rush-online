import { calculateMovement, PLAYER_SIZE, type InputPayload } from '@repo/core-game';
import { ASSET } from '../constants';
import { CustomText } from '../objects/CustomText';
import { Player } from '../objects/Player';
import { PunchBox } from '../objects/PunchBox';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

export class PlayerSystem {
  public currentPlayer?: Player;
  private playerEntities: Record<string, Player> = {};
  /** This is used to track the player according to the server */
  private currentPlayerServer?: Phaser.GameObjects.Rectangle;
  /** This is used to track the inputs acknowledged by the server */
  private serverAckSeq = 0;
  /** This is used to track the inputs being predicted by the client */
  private pendingInputs: Array<InputPayload> = [];

  constructor(private scene: Game) {}

  public destroy() {
    this.currentPlayer?.destroy();
    delete this.currentPlayer;

    this.currentPlayerServer?.destroy();
    delete this.currentPlayerServer;

    Object.values(this.playerEntities).forEach((player) => player.destroy());
    this.playerEntities = {};
  }

  public handleServerPlayerAdded: RoomEventCallbacks['onPlayerAdded'] = (player, sessionId, $) => {
    const entity = this.scene.physics.add.sprite(player.x, player.y, ASSET.PLAYER).setDepth(101);

    const nameText = new CustomText(this.scene, player.x, player.y, player.username, {
      fontFamily: 'Tiny5',
      fontSize: 12,
    })
      .setOrigin(0.5, 2.75)
      .setDepth(101);

    const newPlayer = new Player(this.scene, entity, nameText);

    this.playerEntities[sessionId] = newPlayer;

    // keep track of the current player
    if (sessionId === this.scene.roomSystem.room?.sessionId) {
      this.currentPlayer = newPlayer;
      // ensure the camera is following the current player
      this.scene.cameras.main.startFollow(entity, true, 0.1, 0.1);

      // #region FOR DEBUGGING PURPOSES
      this.currentPlayerServer = this.scene.add.rectangle(0, 0, entity.width, entity.height).setDepth(101);
      this.currentPlayerServer.setStrokeStyle(1, 0xff0000);
      // #endregion FOR DEBUGGING PURPOSES

      $(player).onChange(() => {
        this.scene.uiSystem?.ironCountText.setText(`Iron: ${player.inventory.iron}`);
        this.scene.uiSystem?.goldCountText.setText(`Gold: ${player.inventory.gold}`);

        // #region FOR DEBUGGING PURPOSES
        if (this.currentPlayerServer) {
          this.currentPlayerServer.x = player.x;
          this.currentPlayerServer.y = player.y;

          if (player.attackDamageFrameX !== undefined && player.attackDamageFrameY !== undefined) {
            new PunchBox(this.scene, player.attackDamageFrameX, player.attackDamageFrameY, 0x0000ff);
          }
        }
        // #endregion FOR DEBUGGING PURPOSES

        if (this.currentPlayer) {
          // Server-side reconciliation (ensure CSP is in sync with server authority)
          const nextServerAckSeq = player.lastProcessedInputSeq ?? 0;
          // Ignore out-of-order acks
          if (nextServerAckSeq < this.serverAckSeq) return;

          // Update ack and drop acknowledged inputs
          this.serverAckSeq = nextServerAckSeq;
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
            this.currentPlayer.forceMove(targetPosition);
          }
        }
      });
    } else {
      // update the other players positions from the server
      $(player).onChange(() => {
        const inView = player.x !== undefined && player.y !== undefined;

        if (inView) {
          entity.setData('serverUsername', player.username);
          entity.setData('serverX', player.x);
          entity.setData('serverY', player.y);
          entity.setData('serverAttack', player.isAttacking);

          if (!entity.visible || !nameText.visible) {
            newPlayer.forceMove({ x: player.x, y: player.y });
          }

          // #region FOR DEBUGGING PURPOSES
          if (player.attackDamageFrameX !== undefined && player.attackDamageFrameY !== undefined) {
            new PunchBox(this.scene, player.attackDamageFrameX, player.attackDamageFrameY, 0xff0000);
          }
          // #endregion FOR DEBUGGING PURPOSES
        }

        entity.setVisible(inView);
        nameText.setVisible(inView);
      });
    }
  };

  public handleServerPlayerRemoved: RoomEventCallbacks['onPlayerRemoved'] = (sessionId) => {
    const foundPlayer = this.playerEntities[sessionId];
    if (foundPlayer) {
      foundPlayer.destroy();
      delete this.playerEntities[sessionId];
    }
  };

  public clientSidePrediction(inputPayload?: InputPayload) {
    // skip if no input payload or current player
    if (!inputPayload || !this.currentPlayer?.entity) return;

    // store inputs to be processed by the server reconciliation
    this.pendingInputs.push(inputPayload);

    const { attack, left, right, up, down } = inputPayload;

    if (attack) this.currentPlayer.punch();

    const { x, y } = this.currentPlayer.entity;
    const newPosition = calculateMovement({ x, y, ...PLAYER_SIZE, left, right, up, down });
    this.currentPlayer.move(newPosition);
  }

  public interpolateServerPlayers(delta: number) {
    for (const sessionId in this.playerEntities) {
      // skip the current player since we are handling via CSP and Server Reconciliation
      if (sessionId === this.scene.roomSystem.room?.sessionId) continue;

      // interpolate all other player entities from the server
      const serverPlayer = this.playerEntities[sessionId];
      const { serverX, serverY, serverAttack, serverUsername } = serverPlayer.entity.data.values;
      if (!serverPlayer.entity.visible || serverX === undefined || serverY === undefined) {
        continue; // skip player if not visible
      }

      serverPlayer.nameText.setText(serverUsername);

      if (serverAttack) {
        serverPlayer.punch();
      } else {
        serverPlayer.stopPunch();
      }

      const LERP_SPEED = 15;
      const factor = Math.min(1, (LERP_SPEED * delta) / 1000);
      serverPlayer.move({
        x: Phaser.Math.Linear(serverPlayer.entity.x, serverX, factor),
        y: Phaser.Math.Linear(serverPlayer.entity.y, serverY, factor),
      });
    }
  }
}
