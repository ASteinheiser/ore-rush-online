import type { Player as ServerPlayer } from '@repo/core-game';
import { Player } from '../objects/Player';
import { PunchBox } from '../objects/PunchBox';
import type { Game } from '../scenes/Game';
import type { RoomEventCallbacks } from './RoomSystem';

interface RemotePlayer extends Player {
  serverX?: number;
  serverY?: number;
  serverAttack?: boolean;
  serverUsername?: string;
}

export class RemotePlayerSystem {
  private playerEntities: Record<string, RemotePlayer> = {};

  constructor(private scene: Game) {}

  public destroy() {
    Object.values(this.playerEntities).forEach((player) => player.destroy());
    this.playerEntities = {};
  }

  public handleRemotePlayerAdded: RoomEventCallbacks['onPlayerAdded'] = (player, sessionId, $) => {
    // skip the current player since we are handling via PlayerSystem
    if (sessionId === this.scene.roomSystem.room?.sessionId) return;

    this.playerEntities[sessionId] = new Player(this.scene, player.username, player.x, player.y);

    $(player).onChange(() => {
      this.handleRemotePlayerUpdated(player, sessionId);
    });
  };

  public handleRemotePlayerRemoved: RoomEventCallbacks['onPlayerRemoved'] = (sessionId) => {
    const foundPlayer = this.playerEntities[sessionId];
    if (foundPlayer) {
      foundPlayer.destroy();
      delete this.playerEntities[sessionId];
    }
  };

  private handleRemotePlayerUpdated(player: ServerPlayer, sessionId: string) {
    const remotePlayer = this.playerEntities[sessionId];
    if (!remotePlayer) return;

    const inView = player.x !== undefined && player.y !== undefined;
    if (inView) {
      remotePlayer.serverUsername = player.username;
      remotePlayer.serverX = player.x;
      remotePlayer.serverY = player.y;
      remotePlayer.serverAttack = player.isAttacking;

      // if the player was not visible before, force move them (prevents weird interpolation)
      if (!remotePlayer.entity.visible || !remotePlayer.nameText.visible) {
        remotePlayer.forceMove({ x: player.x, y: player.y });
      }

      // #region FOR DEBUGGING PURPOSES
      if (player.attackDamageFrameX !== undefined && player.attackDamageFrameY !== undefined) {
        new PunchBox(this.scene, player.attackDamageFrameX, player.attackDamageFrameY, 0xff0000);
      }
      // #endregion FOR DEBUGGING PURPOSES
    }

    remotePlayer.entity.setVisible(inView);
    remotePlayer.nameText.setVisible(inView);
  }

  public interpolateRemotePlayers(delta: number) {
    for (const sessionId in this.playerEntities) {
      // skip the current player since we are handling via CSP and Server Reconciliation
      if (sessionId === this.scene.roomSystem.room?.sessionId) continue;

      // interpolate all other player entities from the server
      const remotePlayer = this.playerEntities[sessionId];
      const { serverX, serverY, serverAttack, serverUsername } = remotePlayer;
      if (!remotePlayer.entity.visible || !serverUsername || serverX === undefined || serverY === undefined) {
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
