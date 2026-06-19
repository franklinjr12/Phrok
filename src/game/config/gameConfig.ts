import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { CharacterCreationScene } from "../scenes/CharacterCreationScene";
import { DialogueScene } from "../scenes/DialogueScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { MainMenuScene } from "../scenes/mainMenu/MainMenuScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { UIScene } from "../scenes/UIScene";
import { WorldScene } from "../scenes/WorldScene";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    backgroundColor: "#101318",
    parent,
    scale: {
      autoCenter: Phaser.Scale.CENTER_BOTH,
      mode: Phaser.Scale.RESIZE,
    },
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      CharacterCreationScene,
      WorldScene,
      UIScene,
      DialogueScene,
      GameOverScene,
    ],
    type: Phaser.AUTO,
  };
}
