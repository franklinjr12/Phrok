import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { CharacterCreationScene } from "../scenes/CharacterCreationScene";
import { DialogueScene } from "../scenes/DialogueScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { MainMenuScene } from "../scenes/mainMenu/MainMenuScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { SpriteGalleryScene } from "../scenes/SpriteGalleryScene";
import { UIScene } from "../scenes/UIScene";
import { WorldScene } from "../scenes/WorldScene";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    backgroundColor: "#101318",
    parent,
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scale: {
      autoCenter: Phaser.Scale.CENTER_BOTH,
      mode: Phaser.Scale.RESIZE,
    },
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      SpriteGalleryScene,
      CharacterCreationScene,
      WorldScene,
      UIScene,
      DialogueScene,
      GameOverScene,
    ],
    type: Phaser.AUTO,
  };
}
