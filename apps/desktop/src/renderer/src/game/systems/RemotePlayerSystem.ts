import type { Player as ServerPlayer } from 'game-api/types';
import { Player } from '../objects/Player';
import { PunchBox } from '../objects/PunchBox';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

export class RemotePlayerSystem {
  private playerEntities: Record<string, Player> = {};

  constructor(private scene: Game) {}

  public destroy() {
    Object.values(this.playerEntities).forEach((player) => player.destroy());
    this.playerEntities = {};
  }

  public handleRemotePlayerAdded: RoomEventCallbacks['onPlayerAdded'] = (player, sessionId, $) => {
    // skip the current player since we are handling via PlayerSystem
    if (sessionId === this.scene.roomSystem.room?.sessionId) return;

    const playerEntity = new Player(this.scene, player.username, player.x, player.y);
    this.playerEntities[sessionId] = playerEntity;

    $(player).onChange(() => {
      this.handleRemotePlayerUpdated(player, playerEntity);
    });
  };

  public handleRemotePlayerRemoved: RoomEventCallbacks['onPlayerRemoved'] = (sessionId) => {
    const foundPlayer = this.playerEntities[sessionId];
    if (foundPlayer) {
      foundPlayer.destroy();
      delete this.playerEntities[sessionId];
    }
  };

  private handleRemotePlayerUpdated(player: ServerPlayer, playerEntity: Player) {
    const inView = player.x !== undefined && player.y !== undefined;

    if (inView) {
      playerEntity.entity.setData('serverUsername', player.username);
      playerEntity.entity.setData('serverX', player.x);
      playerEntity.entity.setData('serverY', player.y);
      playerEntity.entity.setData('serverAttack', player.isAttacking);

      // if the player was not visible before, force move them (prevents weird interpolation)
      if (!playerEntity.entity.visible || !playerEntity.nameText.visible) {
        playerEntity.forceMove({ x: player.x, y: player.y });
      }

      // #region FOR DEBUGGING PURPOSES
      if (player.attackDamageFrameX !== undefined && player.attackDamageFrameY !== undefined) {
        new PunchBox(this.scene, player.attackDamageFrameX, player.attackDamageFrameY, 0xff0000);
      }
      // #endregion FOR DEBUGGING PURPOSES
    }

    playerEntity.entity.setVisible(inView);
    playerEntity.nameText.setVisible(inView);
  }

  public interpolateRemotePlayers(delta: number) {
    for (const sessionId in this.playerEntities) {
      // skip the current player since we are handling via CSP and Server Reconciliation
      if (sessionId === this.scene.roomSystem.room?.sessionId) continue;

      // interpolate all other player entities from the server
      const remotePlayer = this.playerEntities[sessionId];
      const { serverX, serverY, serverAttack, serverUsername } = remotePlayer.entity.data.values;
      if (!remotePlayer.entity.visible || serverX === undefined || serverY === undefined) {
        continue; // skip player if not visible
      }

      remotePlayer.nameText.setText(serverUsername);

      if (serverAttack) {
        remotePlayer.punch();
      } else {
        remotePlayer.stopPunch();
      }

      const LERP_SPEED = 15;
      const factor = Math.min(1, (LERP_SPEED * delta) / 1000);
      remotePlayer.move({
        x: Phaser.Math.Linear(remotePlayer.entity.x, serverX, factor),
        y: Phaser.Math.Linear(remotePlayer.entity.y, serverY, factor),
      });
    }
  }
}
