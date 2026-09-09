export const GAME_CONTAINER_ID = 'game-container';

export const SCENE = {
  BOOT: 'boot',
  PRELOADER: 'preloader',
  HOME_BASE: 'home_base',
  GAME: 'game',
  GAME_OVER: 'game_over',
} as const;

export const ASSET = {
  PLAYER: 'player',
} as const;

export const SOUND = {
  // TODO: add sounds keys here
} as const;

export const DEPTH = {
  BACKGROUND: -2,
  BACKGROUND_STARS: -1,
  INTERACTABLE: 24,
  BLOCK: 25,
  BLOCK_CRACKS: 26,
  PLAYER: 50,
  FOG_OVERLAY: 75,
  HUD_BACKGROUND: 100,
  HUD_FOREGROUND: 101,
} as const;
