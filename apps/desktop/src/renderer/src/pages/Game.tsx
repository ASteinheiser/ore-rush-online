import type * as Phaser from 'phaser';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from '@repo/client-auth/provider';
import { useSearchParamFlag } from '@repo/ui/hooks';
import { toast } from '@repo/ui';
import { PhaserGame, type PhaserGameRef } from '../game/PhaserGame';
import type { HomeBase } from '../game/scenes/HomeBase';
import type { Game as GameScene } from '../game/scenes/Game';
import { EventBus, EVENT_BUS } from '../game/EventBus';
import { SCENE } from '../game/constants';
import { ProfileModal } from '../modals/ProfileModal';
import { NewPasswordModal } from '../modals/NewPasswordModal';
import { SettingsModal } from '../modals/SettingsModal';
import { StashModal } from '../modals/StashModal';
import { MarketplaceModal } from '../modals/MarketplaceModal';
import { HomeBaseOverlay } from '../components/HomeBaseOverlay';
import { SEARCH_PARAMS } from '../router/constants';
import { useAudioSettings } from '../providers/AudioSettingsProvider';

export const Game = () => {
  const { session } = useSession();
  const { isMuted, volume } = useAudioSettings();

  const phaserRef = useRef<PhaserGameRef | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useSearchParamFlag(SEARCH_PARAMS.PROFILE);
  const [isNewPasswordModalOpen, setIsNewPasswordModalOpen] = useSearchParamFlag(SEARCH_PARAMS.NEW_PASSWORD);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useSearchParamFlag(SEARCH_PARAMS.SETTINGS);
  const [isStashModalOpen, setIsStashModalOpen] = useSearchParamFlag(SEARCH_PARAMS.STASH);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useSearchParamFlag(SEARCH_PARAMS.MARKETPLACE);
  const [isHomeBaseActive, setIsHomeBaseActive] = useState(false);

  const setPhaserInputEnabled = useCallback(() => {
    const disabled =
      isProfileModalOpen ||
      isNewPasswordModalOpen ||
      isSettingsModalOpen ||
      isStashModalOpen ||
      isMarketplaceModalOpen;

    if (phaserRef?.current?.game?.input) {
      phaserRef.current.game.input.enabled = !disabled;
    }
  }, [
    isProfileModalOpen,
    isNewPasswordModalOpen,
    isSettingsModalOpen,
    isStashModalOpen,
    isMarketplaceModalOpen,
    phaserRef?.current,
  ]);

  useEffect(() => {
    setPhaserInputEnabled();
  }, [setPhaserInputEnabled]);

  const onCurrentSceneChange = (scene: Phaser.Scene) => {
    // ensure that new scenes have the correct "input enabled" setting
    // for example, handles the case where the scene changes with a modal open
    setPhaserInputEnabled();

    // handle closing modals when leaving a scene
    setIsProfileModalOpen(false);
    setIsNewPasswordModalOpen(false);
    setIsSettingsModalOpen(false);
    setIsStashModalOpen(false);
    setIsMarketplaceModalOpen(false);

    setIsHomeBaseActive(scene.scene.key === SCENE.HOME_BASE);
  };

  // NOTE: the server will kick any clients with an expired token, however
  // supabase will automatically refresh the token before it expires (every hour)
  useEffect(() => {
    if (!session?.access_token) return;

    const scene = phaserRef?.current?.scene as GameScene;
    scene?.roomSystem?.refreshToken?.({ token: session.access_token });
  }, [session]);

  useEffect(() => {
    EventBus.on(EVENT_BUS.GAME_START, () => {
      if (!session?.access_token) return;
      const scene = phaserRef?.current?.scene as HomeBase;

      scene?.startGame?.({ token: session.access_token });
    });

    return () => {
      EventBus.off(EVENT_BUS.GAME_START);
    };
  }, [session]);

  useEffect(() => {
    EventBus.on(EVENT_BUS.PROFILE_OPEN, () => setIsProfileModalOpen(true));
    EventBus.on(EVENT_BUS.SETTINGS_OPEN, () => setIsSettingsModalOpen(true));
    EventBus.on(EVENT_BUS.STASH_OPEN, () => setIsStashModalOpen(true));
    EventBus.on(EVENT_BUS.MARKETPLACE_OPEN, () => setIsMarketplaceModalOpen(true));
    EventBus.on(EVENT_BUS.TOAST_INFO, (message: string) => toast.info(message));
    EventBus.on(EVENT_BUS.TOAST_SUCCESS, (message: string) => toast.success(message));
    EventBus.on(EVENT_BUS.TOAST_ERROR, (message: string) => toast.error(message));

    return () => {
      EventBus.off(EVENT_BUS.PROFILE_OPEN);
      EventBus.off(EVENT_BUS.SETTINGS_OPEN);
      EventBus.off(EVENT_BUS.STASH_OPEN);
      EventBus.off(EVENT_BUS.MARKETPLACE_OPEN);
      EventBus.off(EVENT_BUS.TOAST_INFO);
      EventBus.off(EVENT_BUS.TOAST_SUCCESS);
      EventBus.off(EVENT_BUS.TOAST_ERROR);
    };
  }, []);

  useEffect(() => {
    phaserRef?.current?.game?.sound.setMute(isMuted);
  }, [isMuted]);

  useEffect(() => {
    phaserRef?.current?.game?.sound.setVolume(volume / 100);
  }, [volume]);

  // handle removing clients that are connected to dead rooms
  useEffect(() => {
    const handleFocus = async () => {
      const scene = phaserRef?.current?.scene as GameScene;
      if (!scene?.roomSystem?.room) return;

      const isAlive = await scene.roomSystem.isConnectionAlive();

      if (!scene.roomSystem.room.connection.isOpen || !isAlive) {
        scene.sendToHomeBase('Connection lost. Please try again.');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <>
      <PhaserGame ref={phaserRef} currentActiveScene={onCurrentSceneChange} />

      <HomeBaseOverlay isVisible={isHomeBaseActive} />

      <SettingsModal isOpen={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
      <ProfileModal isOpen={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
      <NewPasswordModal isOpen={isNewPasswordModalOpen} onOpenChange={setIsNewPasswordModalOpen} />
      <StashModal isOpen={isStashModalOpen} onOpenChange={setIsStashModalOpen} />
      <MarketplaceModal isOpen={isMarketplaceModalOpen} onOpenChange={setIsMarketplaceModalOpen} />
    </>
  );
};
