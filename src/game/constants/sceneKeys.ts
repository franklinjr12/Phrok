export const SceneKeys = {
  Boot: "BootScene",
  Preload: "PreloadScene",
  MainMenu: "MainMenuScene",
  CharacterCreation: "CharacterCreationScene",
  World: "WorldScene",
  UI: "UIScene",
  Dialogue: "DialogueScene",
  GameOver: "GameOverScene",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
